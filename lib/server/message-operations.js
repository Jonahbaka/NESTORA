import crypto from "node:crypto";
import { AccessError } from "@/lib/server/authorization";
import { recordAuditEvent } from "@/lib/server/audit";
import { getPool, query } from "@/lib/server/db";
import { resolveLeadOwner } from "@/lib/server/lead-routing";
import { allowDemoContent } from "@/lib/server/demo-environment";

export async function listConversations(userId) {
  const result = await query(
    `SELECT c.id, c.subject_type, c.subject_id, c.updated_at, subject_listing.title AS subject_title, subject_listing.location AS subject_location,
            other_user.id AS other_user_id, other_user.name AS other_name, other_user.role AS other_role,
            latest.body AS preview, latest.created_at AS last_message_at,
            COALESCE(unread.count, 0)::int AS unread_count
     FROM conversation_participants mine
     JOIN conversations c ON c.id = mine.conversation_id
     LEFT JOIN listings subject_listing ON c.subject_type = 'listing' AND subject_listing.id = c.subject_id
     JOIN LATERAL (
       SELECT u.id, u.name, u.role FROM conversation_participants cp JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = c.id AND cp.user_id <> $1 ORDER BY u.id LIMIT 1
     ) other_user ON TRUE
     LEFT JOIN LATERAL (
       SELECT body, created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
     ) latest ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS count FROM messages m
       WHERE m.conversation_id = c.id AND m.sender_id <> $1 AND (mine.last_read_at IS NULL OR m.created_at > mine.last_read_at)
     ) unread ON TRUE
     WHERE mine.user_id = $1 AND mine.archived_at IS NULL
     ORDER BY COALESCE(latest.created_at, c.updated_at) DESC
     LIMIT 200`,
    [userId],
  );
  return result.rows;
}

export async function getConversation({ userId, conversationId }) {
  await requireParticipant(userId, conversationId);
  const [conversation, messages] = await Promise.all([
    query(
      `SELECT c.id, c.subject_type, c.subject_id, c.organization_id, c.created_at,
              subject_listing.title AS subject_title, subject_listing.location AS subject_location,
              other_user.id AS other_user_id, other_user.name AS other_name, other_user.role AS other_role
       FROM conversations c
       LEFT JOIN listings subject_listing ON c.subject_type = 'listing' AND subject_listing.id = c.subject_id
       JOIN LATERAL (
         SELECT u.id, u.name, u.role FROM conversation_participants cp JOIN users u ON u.id = cp.user_id
         WHERE cp.conversation_id = c.id AND cp.user_id <> $1 LIMIT 1
       ) other_user ON TRUE
       WHERE c.id = $2`,
      [userId, conversationId],
    ),
    query(
      `SELECT m.id, m.sender_id, m.body, m.attachment_key, m.created_at, u.name AS sender_name
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1 ORDER BY m.created_at ASC LIMIT 1000`,
      [conversationId],
    ),
  ]);
  await query("UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2", [conversationId, userId]);
  return { conversation: conversation.rows[0], messages: messages.rows };
}

export async function sendMessage({ user, conversationId, body, clientNonce }) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { message } = await persistMessage({ user, conversationId, body, clientNonce, runQuery: client.query.bind(client) });
    await client.query("COMMIT");
    return message;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

export async function startListingConversation({ user, listingId, body, clientNonce }) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const runQuery = client.query.bind(client);
    const listingResult = await runQuery("SELECT id, title, category, owner_user_id, organization_id, status, is_demo FROM listings WHERE id = $1 AND status = 'active' AND verification_status = 'verified' AND (is_demo = FALSE OR $2::boolean) LIMIT 1", [listingId, allowDemoContent()]);
    const listing = listingResult.rows[0];
    if (!listing) throw new AccessError("NOT_FOUND", "Listing not found.");
    const routedOwnerId = await resolveLeadOwner({ organizationId: listing.organization_id, source: "listing", listingCategory: listing.category, defaultOwnerId: listing.owner_user_id, runQuery });
    if (routedOwnerId === user.id) throw new AccessError("FORBIDDEN", "You cannot open an enquiry with your own listing.");

    const digest = crypto.createHash("sha256").update(["listing", listing.id, user.id, routedOwnerId].sort().join(":"), "utf8").digest("hex").slice(0, 36);
    const externalKey = `listing-${digest}`;
    const conversationResult = await runQuery(
      `INSERT INTO conversations (external_key, subject_type, subject_id, organization_id, is_demo)
       VALUES ($1, 'listing', $2, $3, $4)
       ON CONFLICT (external_key) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [externalKey, listing.id, listing.organization_id, listing.is_demo],
    );
    const conversationId = conversationResult.rows[0].id;
    await runQuery(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [conversationId, user.id, routedOwnerId],
    );
    await runQuery(
      `INSERT INTO leads (external_key, customer_id, owner_user_id, organization_id, listing_id, source, stage, enquiry_text, is_demo)
       VALUES ($1, $2, $3, $4, $5, 'listing', 'new', $6, $7)
       ON CONFLICT (external_key) DO UPDATE SET enquiry_text = COALESCE(leads.enquiry_text, EXCLUDED.enquiry_text), updated_at = NOW()`,
      [`lead-${digest}`, user.id, routedOwnerId, listing.organization_id, listing.id, body, listing.is_demo],
    );
    const { message, inserted } = await persistMessage({ user, conversationId, body, clientNonce, runQuery });
    if (inserted) await recordAuditEvent({ actorId: user.id, action: "enquiry.created", targetType: "listing", targetId: listing.id, metadata: { conversationId }, runQuery });
    await client.query("COMMIT");
    return { conversationId, message };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

export async function reportConversation({ userId, conversationId, reason }) {
  await requireParticipant(userId, conversationId);
  const result = await query(
    "INSERT INTO conversation_reports (conversation_id, reporter_id, reason) VALUES ($1, $2, $3) RETURNING id, status, created_at",
    [conversationId, userId, reason],
  );
  await recordAuditEvent({ actorId: userId, action: "conversation.reported", targetType: "conversation", targetId: conversationId, metadata: { reportId: result.rows[0].id } });
  return result.rows[0];
}

export async function blockConversationParticipant({ userId, conversationId, reason }) {
  await requireParticipant(userId, conversationId);
  const other = await query("SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id <> $2 LIMIT 1", [conversationId, userId]);
  if (!other.rowCount) throw new AccessError("NOT_FOUND", "Conversation participant not found.");
  await query(
    `INSERT INTO user_blocks (blocker_id, blocked_id, reason) VALUES ($1, $2, $3)
     ON CONFLICT (blocker_id, blocked_id) DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()`,
    [userId, other.rows[0].user_id, reason || null],
  );
  await recordAuditEvent({ actorId: userId, action: "user.blocked", targetType: "user", targetId: other.rows[0].user_id, metadata: { conversationId } });
  return { blocked: true };
}

async function persistMessage({ user, conversationId, body, clientNonce, runQuery }) {
  await requireParticipant(user.id, conversationId, runQuery);
  const blocked = await runQuery(
    `SELECT 1 FROM conversation_participants cp
     JOIN user_blocks b ON (b.blocker_id = cp.user_id AND b.blocked_id = $1) OR (b.blocker_id = $1 AND b.blocked_id = cp.user_id)
     WHERE cp.conversation_id = $2 AND cp.user_id <> $1 LIMIT 1`,
    [user.id, conversationId],
  );
  if (blocked.rowCount) throw new AccessError("FORBIDDEN", "Messaging is unavailable for this conversation.");

  const inserted = await runQuery(
    `INSERT INTO messages (conversation_id, sender_id, body, client_nonce)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (sender_id, client_nonce) WHERE client_nonce IS NOT NULL DO NOTHING
     RETURNING id, conversation_id, sender_id, body, attachment_key, created_at`,
    [conversationId, user.id, body, clientNonce],
  );
  if (!inserted.rowCount) {
    const existing = await runQuery(
      "SELECT id, conversation_id, sender_id, body, attachment_key, created_at FROM messages WHERE sender_id = $1 AND client_nonce = $2 LIMIT 1",
      [user.id, clientNonce],
    );
    const message = existing.rows[0];
    if (!message || message.conversation_id !== conversationId || message.body !== body) throw new AccessError("CONFLICT", "This message request identifier has already been used.");
    return { message, inserted: false };
  }

  const message = inserted.rows[0];
  await runQuery("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [conversationId]);
  await runQuery("UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2", [conversationId, user.id]);
  await queueMessageNotifications({ conversationId, sender: user, body, runQuery });
  await recordAuditEvent({ actorId: user.id, action: "message.sent", targetType: "conversation", targetId: conversationId, metadata: { messageId: message.id }, runQuery });
  return { message, inserted: true };
}

async function requireParticipant(userId, conversationId, runQuery = query) {
  const result = await runQuery("SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 LIMIT 1", [conversationId, userId]);
  if (!result.rowCount) throw new AccessError("NOT_FOUND", "Conversation not found.");
}

async function queueMessageNotifications({ conversationId, sender, body, runQuery = query }) {
  const recipients = await runQuery(
    `SELECT u.id, u.email FROM conversation_participants cp JOIN users u ON u.id = cp.user_id
     WHERE cp.conversation_id = $1 AND cp.user_id <> $2 AND u.status = 'active'`,
    [conversationId, sender.id],
  );
  for (const recipient of recipients.rows) {
    const notification = await runQuery(
      `INSERT INTO notifications (user_id, kind, title, body, deep_link, delivery_status)
       VALUES ($1, 'new_message', $2, $3, $4, 'queued') RETURNING id`,
      [recipient.id, `New message from ${sender.name}`, body.slice(0, 240), `/messages?conversation=${conversationId}`],
    );
    await runQuery(
      `INSERT INTO delivery_jobs (user_id, channel, destination, template_key, payload)
       VALUES ($1, 'email', $2, 'new_message', $3::jsonb)`,
      [recipient.id, recipient.email, JSON.stringify({ senderName: sender.name, preview: body.slice(0, 240), conversationId, notificationId: notification.rows[0].id })],
    );
  }
}
