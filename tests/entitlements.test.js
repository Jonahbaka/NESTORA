import assert from "node:assert/strict";
import test from "node:test";
import { getPlanPolicy } from "../lib/entitlement-policy.js";

test("unknown plans fail closed to basic limits", () => {
  assert.deepEqual(getPlanPolicy("not-a-plan"), { activeListings: 5, users: 1, features: ["media_upload"] });
});

test("specialist plans expose only their intended operational capability", () => {
  const hotel = getPlanPolicy("hotel-operations");
  const developer = getPlanPolicy("developer-studio");
  assert.equal(hotel.features.includes("hotel_inventory"), true);
  assert.equal(hotel.features.includes("developer_inventory"), false);
  assert.equal(developer.features.includes("developer_inventory"), true);
  assert.equal(developer.features.includes("hotel_inventory"), false);
});

test("policy callers cannot mutate shared plan definitions", () => {
  const policy = getPlanPolicy("agency");
  policy.features.length = 0;
  assert.equal(getPlanPolicy("agency").features.includes("lead_routing"), true);
});
