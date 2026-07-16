import test from "node:test";
import assert from "node:assert/strict";
import { canAccessPath, requiredRolesForPath } from "../lib/access-control.js";

test("professional workspaces enforce their exact role boundary", () => {
  assert.equal(canAccessPath("/workspace/agent", "agent"), true);
  assert.equal(canAccessPath("/workspace/developer", "agent"), false);
  assert.equal(canAccessPath("/workspace/host", "developer"), false);
  assert.equal(canAccessPath("/workspace/agency", "host"), false);
});

test("agency administrators can manage agent work without entering other specialist workspaces", () => {
  assert.equal(canAccessPath("/workspace/agent", "agency_admin"), true);
  assert.equal(canAccessPath("/workspace/agency", "agency_admin"), true);
  assert.equal(canAccessPath("/workspace/developer", "agency_admin"), false);
  assert.equal(canAccessPath("/workspace/host", "agency_admin"), false);
});

test("admin and public routes retain intended access", () => {
  assert.equal(canAccessPath("/admin", "admin"), true);
  assert.equal(canAccessPath("/admin/reports", "moderator"), true);
  assert.equal(canAccessPath("/admin", "agent"), false);
  assert.equal(requiredRolesForPath("/workspace"), null);
  assert.equal(canAccessPath("/workspace", "member"), true);
  assert.equal(canAccessPath("/search", "member"), true);
});
