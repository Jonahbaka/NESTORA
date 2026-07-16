import test from "node:test";
import assert from "node:assert/strict";
import { AccessError, requireActiveSessionUser, requireLeadAccess, requireOrganizationMembership } from "../lib/server/authorization.js";

test("authenticated APIs revalidate account status and current database role", async () => {
  const active = async () => ({ rows: [{ id: "user-1", role: "agent", status: "active" }] });
  const suspended = async () => ({ rows: [{ id: "user-1", role: "agent", status: "suspended" }] });
  assert.deepEqual(await requireActiveSessionUser({ sub: "user-1", role: "member" }, active), { id: "user-1", role: "agent", status: "active" });
  await assert.rejects(() => requireActiveSessionUser({ sub: "user-1" }, suspended), (error) => error instanceof AccessError && error.code === "ACCOUNT_INACTIVE");
});

test("organization access requires an active membership with an allowed role", async () => {
  const manager = async () => ({ rows: [{ role: "manager" }] });
  const outsider = async () => ({ rows: [] });
  assert.equal((await requireOrganizationMembership({ userId: "u1", organizationId: "o1", allowedRoles: ["owner", "manager"], runQuery: manager })).role, "manager");
  await assert.rejects(() => requireOrganizationMembership({ userId: "u2", organizationId: "o1", allowedRoles: ["owner", "manager"], runQuery: outsider }), /do not have access/);
});

test("lead access is limited to the customer, assigned owner, active tenant members, or platform admin", async () => {
  const ownedLead = async () => ({ rows: [{ customer_id: "customer", owner_user_id: "agent", organization_id: "org", membership_role: null, membership_status: null }] });
  const tenantLead = async () => ({ rows: [{ customer_id: "customer", owner_user_id: "agent", organization_id: "org", membership_role: "sales", membership_status: "active" }] });
  const outsiderLead = async () => ({ rows: [{ customer_id: "customer", owner_user_id: "agent", organization_id: "org", membership_role: null, membership_status: null }] });
  assert.equal((await requireLeadAccess({ user: { id: "agent", role: "agent" }, leadId: "lead", runQuery: ownedLead })).owner_user_id, "agent");
  assert.equal((await requireLeadAccess({ user: { id: "team", role: "agency_admin" }, leadId: "lead", runQuery: tenantLead })).organization_id, "org");
  await assert.rejects(() => requireLeadAccess({ user: { id: "outsider", role: "agent" }, leadId: "lead", runQuery: outsiderLead }), (error) => error instanceof AccessError && error.code === "FORBIDDEN");
});
