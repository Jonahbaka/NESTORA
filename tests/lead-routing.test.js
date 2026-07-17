import assert from "node:assert/strict";
import test from "node:test";
import { resolveLeadOwner } from "../lib/server/lead-routing.js";

test("lead routing keeps the listing owner when no organization is present", async () => {
  assert.equal(await resolveLeadOwner({ organizationId: null, defaultOwnerId: "owner" }), "owner");
});

test("fixed routing validates active membership", async () => {
  const responses = [{ rows: [{ id: "rule", assignee_user_id: "agent-2", strategy: "fixed" }], rowCount: 1 }, { rows: [{ ok: 1 }], rowCount: 1 }];
  const calls = [];
  const owner = await resolveLeadOwner({ organizationId: "org", source: "listing", listingCategory: "rent", defaultOwnerId: "agent-1", runQuery: async (sql, values) => { calls.push({ sql, values }); return responses.shift(); } });
  assert.equal(owner, "agent-2");
  assert.equal(calls.length, 2);
});

test("least-active routing falls back to the listing owner when no member qualifies", async () => {
  const responses = [{ rows: [{ id: "rule", assignee_user_id: null, strategy: "least_active" }], rowCount: 1 }, { rows: [], rowCount: 0 }];
  const owner = await resolveLeadOwner({ organizationId: "org", source: "listing", listingCategory: "sale", defaultOwnerId: "agent-1", runQuery: async () => responses.shift() });
  assert.equal(owner, "agent-1");
});
