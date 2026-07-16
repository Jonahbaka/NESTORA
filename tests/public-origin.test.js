import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicUrl } from "../lib/public-origin.js";

test("configured public origin replaces an internal reverse-proxy origin", () => {
  const result = buildPublicUrl("/my-nestora", "https://localhost:3003/workspace/agency", "https://nestora.doctarx.com");
  assert.equal(result.href, "https://nestora.doctarx.com/my-nestora");
});

test("request origin is retained when no public origin is configured", () => {
  const result = buildPublicUrl("/login", "http://localhost:3030/workspace/agent", "");
  assert.equal(result.href, "http://localhost:3030/login");
});

test("non-http configured origins are ignored", () => {
  const result = buildPublicUrl("/login", "https://nestora.doctarx.com/admin", "javascript:alert(1)");
  assert.equal(result.href, "https://nestora.doctarx.com/login");
});
