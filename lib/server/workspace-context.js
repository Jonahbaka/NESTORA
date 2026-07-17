import { cookies } from "next/headers";
import { canAccessPath } from "@/lib/access-control";
import { AccessError, requireActiveSessionUser } from "@/lib/server/authorization";
import { query } from "@/lib/server/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";

const workspaceByRole = {
  agent: "agent",
  host: "host",
  developer: "developer",
  agency_admin: "agency",
};

const organizationKindByRole = {
  agent: "agency",
  host: "hotel",
  developer: "developer",
  agency_admin: "agency",
};

export async function getWorkspaceContext({ workspace } = {}) {
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  const user = await requireActiveSessionUser(session);

  if (workspace && !canAccessPath(`/workspace/${workspace}`, user.role)) {
    throw new AccessError("FORBIDDEN", "You do not have access to this workspace.");
  }

  const expectedKind = organizationKindByRole[user.role];
  let organization = null;
  let membership = null;
  if (expectedKind) {
    const result = await query(
      `SELECT o.id, o.slug, o.name, o.kind, o.status, o.settings, om.role AS membership_role
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.status = 'active' AND o.status = 'active' AND o.kind = $2
       ORDER BY om.created_at ASC
       LIMIT 1`,
      [user.id, expectedKind],
    );
    organization = result.rows[0] || null;
    membership = organization ? { role: organization.membership_role } : null;
  }

  return {
    user,
    organization,
    membership,
    workspace: workspaceByRole[user.role] || (user.role === "admin" || user.role === "moderator" ? "admin" : "member"),
    isAdmin: user.role === "admin",
    canModerate: user.role === "admin" || user.role === "moderator",
  };
}

export function requireOrganization(context) {
  if (!context.organization) throw new AccessError("FORBIDDEN", "An active organization membership is required for this operation.");
  return context.organization;
}

export function tenantScope(context, { alias = "", owner = "owner_user_id", organization = "organization_id", start = 1 } = {}) {
  const prefix = alias ? `${alias}.` : "";
  if (context.isAdmin) return { clause: "TRUE", values: [], next: start };
  if (context.organization) return { clause: `${prefix}${organization} = $${start}`, values: [context.organization.id], next: start + 1 };
  return { clause: `${prefix}${owner} = $${start}`, values: [context.user.id], next: start + 1 };
}
