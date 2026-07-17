import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AccessError, accessErrorResponse, requireActiveSessionUser } from "@/lib/server/authorization";
import { recordAuditEvent } from "@/lib/server/audit";
import { getPool, hasDatabase, query } from "@/lib/server/db";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifySessionToken } from "@/lib/server/session";
import { roleDestination } from "@/lib/role-destination";

export const dynamic = "force-dynamic";

const tokenSchema = z.string().trim().min(32).max(128).regex(/^[A-Za-z0-9_-]+$/);
const writeSchema = z.object({ token: tokenSchema, action: z.enum(["accept", "decline"]) });

export async function GET(request) {
  if (!hasDatabase()) return unavailable();
  try {
    const user = await activeUser();
    const parsed = tokenSchema.safeParse(new URL(request.url).searchParams.get("token"));
    if (!parsed.success) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    const invitation = await findInvitation(parsed.data);
    verifyRecipient(invitation, user);
    return NextResponse.json({ invitation: publicInvitation(invitation) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request) {
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, "team-invitation-response", { limit: 12, windowMs: 60 * 60_000 });
    const parsed = writeSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    const user = await activeUser();
    const result = await respondToInvitation({ user, ...parsed.data });
    const response = NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
    if (result.user) response.cookies.set(SESSION_COOKIE, createSessionToken(result.user), sessionCookieOptions);
    return response;
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return routeError(error);
  }
}

async function respondToInvitation({ user, token, action }) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const runQuery = client.query.bind(client);
    const invitation = await findInvitation(token, runQuery, true);
    verifyRecipient(invitation, user);
    if (action === "decline") {
      await runQuery("UPDATE team_invitations SET status = 'declined' WHERE id = $1", [invitation.id]);
      await recordAuditEvent({ actorId: user.id, action: "team.invitation_declined", targetType: "team_invitation", targetId: invitation.id, metadata: { organizationId: invitation.organization_id }, runQuery });
      await client.query("COMMIT");
      return { accepted: false, destination: roleDestination(user.role) };
    }
    if (!["member", "agent", "agency_admin"].includes(user.role)) throw new AccessError("FORBIDDEN", "This account already belongs to a different professional workspace.");
    const elevatedRole = ["admin", "manager"].includes(invitation.role) ? "agency_admin" : "agent";
    const nextRole = user.role === "agency_admin" ? "agency_admin" : elevatedRole;
    await runQuery(
      `INSERT INTO organization_members (organization_id, user_id, role, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active'`,
      [invitation.organization_id, user.id, invitation.role],
    );
    const updatedUser = await runQuery("UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role, status", [nextRole, user.id]);
    await runQuery("UPDATE team_invitations SET status = 'accepted', accepted_by = $1 WHERE id = $2", [user.id, invitation.id]);
    await runQuery(
      `INSERT INTO notifications (user_id, kind, title, body, deep_link, delivery_status)
       VALUES ($1, 'team_invitation_accepted', 'Team invitation accepted', $2, '/workspace/agency', 'captured')`,
      [invitation.invited_by, `${user.name} joined ${invitation.organization_name}.`],
    );
    await recordAuditEvent({ actorId: user.id, action: "team.invitation_accepted", targetType: "team_invitation", targetId: invitation.id, metadata: { organizationId: invitation.organization_id, role: invitation.role }, runQuery });
    await client.query("COMMIT");
    return { accepted: true, user: updatedUser.rows[0], destination: roleDestination(nextRole) };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

async function activeUser() {
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  return requireActiveSessionUser(session);
}

async function findInvitation(token, runQuery = query, lock = false) {
  const result = await runQuery(
    `SELECT i.id, i.organization_id, i.invited_by, i.email, i.role, i.status, i.expires_at, o.name AS organization_name
     FROM team_invitations i JOIN organizations o ON o.id = i.organization_id AND o.status = 'active'
     WHERE i.token_hash = $1 LIMIT 1${lock ? " FOR UPDATE OF i" : ""}`,
    [crypto.createHash("sha256").update(token).digest("hex")],
  );
  const invitation = result.rows[0];
  if (!invitation || invitation.status !== "pending" || new Date(invitation.expires_at).getTime() <= Date.now()) throw new AccessError("NOT_FOUND", "This invitation is invalid, expired or already answered.");
  return invitation;
}

function verifyRecipient(invitation, user) {
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) throw new AccessError("FORBIDDEN", "Sign in with the email address that received this invitation.");
}

function publicInvitation(invitation) {
  return { id: invitation.id, organizationName: invitation.organization_name, email: invitation.email, role: invitation.role, expiresAt: invitation.expires_at };
}

function routeError(error) {
  const access = accessErrorResponse(error);
  if (access) return NextResponse.json({ error: access.message }, { status: access.status, headers: { "Cache-Control": "private, no-store" } });
  console.error("Team invitation response failed", error);
  return unavailable();
}

function unavailable() {
  return NextResponse.json({ error: "Team invitations are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
}
