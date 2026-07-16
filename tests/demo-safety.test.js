import test from "node:test";
import assert from "node:assert/strict";
import { demoAccounts } from "../lib/demo-accounts.js";
import { assertDemoPassword, assertSafeDemoTarget } from "../scripts/lib/demo-safety.js";

const safeEnvironment = {
  NESTORA_DEMO_MODE: "true",
  NESTORA_ENVIRONMENT: "staging",
  NEXT_PUBLIC_APP_ORIGIN: "https://nestora-staging.example.com",
  DATABASE_URL: "postgresql://example.invalid/nestora_demo",
};

test("demo data operations require an explicitly isolated target", () => {
  assert.doesNotThrow(() => assertSafeDemoTarget(safeEnvironment));
  assert.throws(() => assertSafeDemoTarget({ ...safeEnvironment, NESTORA_DEMO_MODE: "false" }), /NESTORA_DEMO_MODE/);
  assert.throws(() => assertSafeDemoTarget({ ...safeEnvironment, NESTORA_ENVIRONMENT: "production" }), /NESTORA_ENVIRONMENT/);
  assert.throws(() => assertSafeDemoTarget({ ...safeEnvironment, NEXT_PUBLIC_APP_ORIGIN: "https://nestora.doctarx.com" }), /production origin/);
  assert.throws(() => assertSafeDemoTarget({ ...safeEnvironment, DATABASE_URL: "" }), /DATABASE_URL/);
});

test("demo password policy rejects weak shared credentials", () => {
  assert.doesNotThrow(() => assertDemoPassword("River!Glass7Harbor"));
  assert.throws(() => assertDemoPassword("simplepassword"), /16 characters|upper/);
});

test("required demo roles are unique and visibly use the demo domain", () => {
  const expectedRoles = new Set(["member", "agent", "developer", "host", "agency_admin", "admin"]);
  assert.deepEqual(new Set(demoAccounts.map((account) => account.role)), expectedRoles);
  assert.equal(new Set(demoAccounts.map((account) => account.email)).size, demoAccounts.length);
  assert.ok(demoAccounts.every((account) => account.email.endsWith("@demo.nestora.local")));
});
