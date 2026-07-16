import { query } from "./db.js";

export class AccessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AccessError";
    this.code = code;
  }
}

export async function requireActiveSessionUser(session, runQuery = query) {
  if (!session?.sub) throw new AccessError("AUTH_REQUIRED", "Sign in to continue.");
  const result = await runQuery("SELECT id, name, email, role, status FROM users WHERE id = $1 LIMIT 1", [session.sub]);
  const user = result.rows[0];
  if (!user || user.status !== "active") throw new AccessError("ACCOUNT_INACTIVE", "This account is not active.");
  return user;
}

export async function requireOrganizationMembership({ userId, organizationId, allowedRoles, runQuery = query }) {
  const result = await runQuery(
    `SELECT role FROM organization_members
     WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
     LIMIT 1`,
    [organizationId, userId],
  );
  const membership = result.rows[0];
  if (!membership || (allowedRoles?.length && !allowedRoles.includes(membership.role))) {
    throw new AccessError("FORBIDDEN", "You do not have access to this organization record.");
  }
  return membership;
}

export async function requireLeadAccess({ user, leadId, runQuery = query }) {
  const result = await runQuery(
    `SELECT l.customer_id, l.owner_user_id, l.organization_id,
            om.role AS membership_role, om.status AS membership_status
     FROM leads l
     LEFT JOIN organization_members om
       ON om.organization_id = l.organization_id AND om.user_id = $1
     WHERE l.id = $2
     LIMIT 1`,
    [user.id, leadId],
  );
  const lead = result.rows[0];
  if (!lead) throw new AccessError("NOT_FOUND", "Lead not found.");
  const directAccess = lead.customer_id === user.id || lead.owner_user_id === user.id;
  const organizationAccess = lead.membership_status === "active" && ["owner", "admin", "manager", "agent", "sales"].includes(lead.membership_role);
  if (user.role !== "admin" && !directAccess && !organizationAccess) {
    throw new AccessError("FORBIDDEN", "You do not have access to this lead.");
  }
  return lead;
}

export function accessErrorResponse(error) {
  if (!(error instanceof AccessError)) return null;
  if (error.code === "AUTH_REQUIRED" || error.code === "ACCOUNT_INACTIVE") return { status: 401, message: "Sign in to continue." };
  if (error.code === "FORBIDDEN") return { status: 403, message: error.message };
  if (error.code === "NOT_FOUND") return { status: 404, message: error.message };
  return null;
}
