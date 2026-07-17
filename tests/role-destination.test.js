import assert from "node:assert/strict";
import test from "node:test";
import { loginDestination, roleDestination, safeInternalPath } from "../lib/role-destination.js";

test("each account role lands in its owned workspace", () => {
  assert.equal(roleDestination("member"), "/my-nestora");
  assert.equal(roleDestination("agent"), "/workspace/agent");
  assert.equal(roleDestination("host"), "/workspace/host");
  assert.equal(roleDestination("developer"), "/workspace/developer");
  assert.equal(roleDestination("agency_admin"), "/workspace/agency");
  assert.equal(roleDestination("moderator"), "/admin");
  assert.equal(roleDestination("admin"), "/admin");
});

test("login destinations honor only safe authorized internal paths", () => {
  assert.equal(loginDestination("agent", "/workspace/agent?view=listings"), "/workspace/agent?view=listings");
  assert.equal(loginDestination("member", "/workspace/agent"), "/my-nestora");
  assert.equal(loginDestination("agent", "https://example.com"), "/workspace/agent");
  assert.equal(loginDestination("agent", "//example.com"), "/workspace/agent");
  assert.equal(loginDestination("agent", "/\\example.com"), "/workspace/agent");
});

test("safe internal path rejects open redirects", () => {
  assert.equal(safeInternalPath("/messages?lead=123"), "/messages?lead=123");
  assert.equal(safeInternalPath("https://example.com"), null);
  assert.equal(safeInternalPath("//example.com"), null);
});
