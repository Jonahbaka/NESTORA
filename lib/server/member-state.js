import { getPool, query } from "@/lib/server/db";
import { resolveLeadOwner } from "@/lib/server/lead-routing";

const markKinds = {
  saved: "saved_property",
  following: "profile_follow",
  joinedCommunities: "community_membership",
  reactions: "social_reaction",
};

const statusLabels = {
  pending_confirmation: "Pending confirmation",
  awaiting_confirmation: "Awaiting host confirmation",
  confirmed: "Confirmed",
  declined: "Declined",
  reschedule_requested: "Reschedule requested",
  cancelled: "Cancelled",
  completed: "Completed",
};

export async function getMemberState(userId) {
  const [marks, bookings, inspections] = await Promise.all([
    query("SELECT kind, target_id FROM member_marks WHERE user_id = $1 ORDER BY created_at ASC", [userId]),
    query("SELECT id, property_id, property_title, check_in, guests, nights, total_amount, status, created_at FROM booking_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100", [userId]),
    query("SELECT id, property_id, property_title, preferred_date, status, created_at FROM inspection_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100", [userId]),
  ]);

  const state = { saved: [], following: [], joinedCommunities: [], reactions: [] };
  const keyByKind = Object.fromEntries(Object.entries(markKinds).map(([key, kind]) => [kind, key]));
  for (const mark of marks.rows) {
    const key = keyByKind[mark.kind];
    if (key) state[key].push(mark.target_id);
  }

  return {
    ...state,
    bookings: bookings.rows.map((row) => ({
      id: row.id,
      propertyId: row.property_id,
      title: row.property_title,
      date: toDateValue(row.check_in),
      guests: row.guests,
      nights: row.nights,
      total: Number(row.total_amount),
      status: statusLabels[row.status] || row.status,
      createdAt: row.created_at,
    })),
    inspections: inspections.rows.map((row) => ({
      id: row.id,
      propertyId: row.property_id,
      title: row.property_title,
      date: toDateValue(row.preferred_date),
      status: statusLabels[row.status] || row.status,
      createdAt: row.created_at,
    })),
  };
}

export async function setMemberMark({ userId, key, value, enabled }) {
  const kind = markKinds[key];
  if (!kind) throw new Error("Unsupported member mark");
  if (enabled) {
    await query("INSERT INTO member_marks (user_id, kind, target_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [userId, kind, value]);
  } else {
    await query("DELETE FROM member_marks WHERE user_id = $1 AND kind = $2 AND target_id = $3", [userId, kind, value]);
  }
  return { key, value, enabled };
}

export async function createBookingRequest({ userId, propertyId, date, guests, nights }) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const listingResult = await client.query("SELECT organization_id, title FROM listings WHERE id = $1 AND category = 'stay' AND status = 'active' AND verification_status = 'verified' AND is_demo = FALSE LIMIT 1", [propertyId]);
    const listing = listingResult.rows[0];
    if (!listing?.organization_id) throw operationError("LISTING_UNAVAILABLE", "This stay is not currently available for booking.");
    const checkout = addDays(date, nights);
    const roomResult = await client.query(
      `SELECT r.id, t.nightly_rate FROM hotel_rooms r JOIN hotel_room_types t ON t.id = r.room_type_id
       WHERE r.organization_id = $1 AND r.status = 'available' AND t.capacity >= $2
         AND NOT EXISTS (SELECT 1 FROM reservations x WHERE x.room_id = r.id AND x.status IN ('requested', 'confirmed') AND daterange(x.check_in, x.check_out, '[)') && daterange($3::date, $4::date, '[)'))
       ORDER BY t.nightly_rate, r.code
       FOR UPDATE OF r SKIP LOCKED
       LIMIT 1`,
      [listing.organization_id, guests, date, checkout],
    );
    if (!roomResult.rowCount) throw operationError("NO_AVAILABILITY", "No room is available for those dates and guest count.");
    const total = Number(roomResult.rows[0].nightly_rate) * nights;
    const result = await client.query(
      "INSERT INTO booking_requests (user_id, property_id, property_title, check_in, guests, nights, total_amount) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, property_id, property_title, check_in, guests, nights, total_amount, status, created_at",
      [userId, propertyId, listing.title, date, guests, nights, Math.round(total)],
    );
    const row = result.rows[0];
    await client.query(
      `INSERT INTO reservations (external_key, guest_id, organization_id, room_id, check_in, check_out, guests, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'requested')`,
      [`member-booking-${row.id}`, userId, listing.organization_id, roomResult.rows[0].id, date, checkout, guests, Math.round(total)],
    );
    const hotelRecipient = await client.query(
      `SELECT u.id, u.email FROM organization_members om JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.status = 'active' AND om.role IN ('owner', 'admin', 'manager', 'front_desk') ORDER BY om.created_at LIMIT 1`,
      [listing.organization_id],
    );
    if (hotelRecipient.rowCount) {
      await client.query(
        `INSERT INTO notifications (user_id, kind, title, body, deep_link, delivery_status)
         VALUES ($1, 'reservation_requested', 'New reservation request', $2, '/workspace/host', 'queued')`,
        [hotelRecipient.rows[0].id, `${listing.title} has a new reservation request for ${date}.`],
      );
      await client.query(
        `INSERT INTO delivery_jobs (user_id, organization_id, channel, destination, template_key, payload)
         VALUES ($1, $2, 'email', $3, 'reservation_requested', $4::jsonb)`,
        [hotelRecipient.rows[0].id, listing.organization_id, hotelRecipient.rows[0].email, JSON.stringify({ propertyTitle: listing.title, checkIn: date, checkOut: checkout, guests })],
      );
    }
    await recordAudit(userId, "booking.requested", "booking_request", row.id, { propertyId }, client.query.bind(client));
    await client.query("COMMIT");
    return { id: row.id, propertyId: row.property_id, title: row.property_title, date: toDateValue(row.check_in), guests: row.guests, nights: row.nights, total: Number(row.total_amount), status: statusLabels[row.status], createdAt: row.created_at };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

export async function createInspectionRequest({ userId, propertyId, date }) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const listingResult = await client.query("SELECT owner_user_id, organization_id, category, title FROM listings WHERE id = $1 AND category <> 'stay' AND status = 'active' AND verification_status = 'verified' AND is_demo = FALSE LIMIT 1", [propertyId]);
    const listing = listingResult.rows[0];
    if (!listing) throw operationError("LISTING_UNAVAILABLE", "This listing is not currently accepting inspections.");
    const professionalId = await resolveLeadOwner({ organizationId: listing.organization_id, source: "listing", listingCategory: listing.category, defaultOwnerId: listing.owner_user_id, runQuery: client.query.bind(client) });
    const result = await client.query(
      "INSERT INTO inspection_requests (user_id, property_id, property_title, preferred_date) VALUES ($1, $2, $3, $4) RETURNING id, property_id, property_title, preferred_date, status, created_at",
      [userId, propertyId, listing.title, date],
    );
    const row = result.rows[0];
    const leadResult = await client.query(
      `INSERT INTO leads (external_key, customer_id, owner_user_id, organization_id, listing_id, source, stage, next_action, enquiry_text)
       VALUES ($1, $2, $3, $4, $5, 'listing', 'inspection', 'Confirm requested inspection time', 'Inspection requested from the listing page.')
       ON CONFLICT (external_key) DO UPDATE SET stage = 'inspection', next_action = EXCLUDED.next_action, updated_at = NOW()
       RETURNING id`,
      [`member-inspection-${row.id}`, userId, professionalId, listing.organization_id, propertyId],
    );
    await client.query(
      `INSERT INTO inspections (external_key, lead_id, customer_id, professional_id, listing_id, scheduled_at, status)
       VALUES ($1, $2, $3, $4, $5, ($6::date + TIME '10:00'), 'proposed')`,
      [`member-inspection-${row.id}`, leadResult.rows[0].id, userId, professionalId, propertyId, date],
    );
    await client.query(
      `INSERT INTO notifications (user_id, kind, title, body, deep_link, delivery_status)
       VALUES ($1, 'inspection_requested', 'New inspection request', $2, '/workspace/agent', 'queued')`,
      [professionalId, `${listing.title} has a new inspection request for ${date}.`],
    );
    await client.query(
      `INSERT INTO delivery_jobs (user_id, organization_id, channel, destination, template_key, payload)
       SELECT u.id, $2, 'email', u.email, 'inspection_requested', $3::jsonb FROM users u WHERE u.id = $1`,
      [professionalId, listing.organization_id, JSON.stringify({ propertyTitle: listing.title, requestedDate: date })],
    );
    await recordAudit(userId, "inspection.requested", "inspection_request", row.id, { propertyId }, client.query.bind(client));
    await client.query("COMMIT");
    return { id: row.id, propertyId: row.property_id, title: row.property_title, date: toDateValue(row.preferred_date), status: statusLabels[row.status], createdAt: row.created_at };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

function toDateValue(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

async function recordAudit(actorId, action, targetType, targetId, metadata, runQuery = query) {
  try {
    await runQuery("INSERT INTO audit_events (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5::jsonb)", [actorId, action, targetType, targetId, JSON.stringify(metadata)]);
  } catch (error) {
    console.error("Activity audit recording failed", { action, targetType, message: error.message });
  }
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function operationError(code, message) { const error = new Error(message); error.code = code; return error; }
