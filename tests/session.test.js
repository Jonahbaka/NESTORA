import test from "node:test";
import assert from "node:assert/strict";
import { createSessionToken, verifySessionToken } from "../lib/server/session.js";

test("signed sessions round-trip only their intended account claims", () => {
  const token = createSessionToken({ id: "user-1", name: "Adaeze Nwosu", email: "adaeze@example.com", role: "member" });
  const session = verifySessionToken(token);
  assert.equal(session.sub, "user-1");
  assert.equal(session.role, "member");
  assert.equal(session.email, "adaeze@example.com");
});

test("tampered sessions are rejected", () => {
  const token = createSessionToken({ id: "user-1", name: "Adaeze Nwosu", email: "adaeze@example.com", role: "member" });
  const [payload, signature] = token.split(".");
  const tampered = `${payload.slice(0, -1)}A.${signature}`;
  assert.equal(verifySessionToken(tampered), null);
});

test("malformed session cookies fail closed without throwing", () => {
  for (const token of ["", "invalid", ".", "not-json.signature", "e30.invalid-signature", "a.b.c"]) {
    assert.doesNotThrow(() => verifySessionToken(token));
    assert.equal(verifySessionToken(token), null);
  }
});
