import test from "node:test";
import assert from "node:assert/strict";
import {
  ANNUAL_DISCOUNT_PERCENT,
  addOnGroups,
  calculateAnnualPrice,
  professionalPlans,
  specialistPlans,
} from "../lib/pricing.js";

test("professional plan identifiers are unique and paid prices increase with capacity", () => {
  const ids = professionalPlans.map((plan) => plan.id);
  assert.equal(new Set(ids).size, ids.length);

  const paidPrices = professionalPlans.filter((plan) => plan.monthlyPrice > 0).map((plan) => plan.monthlyPrice);
  assert.deepEqual(paidPrices, [...paidPrices].sort((left, right) => left - right));
});

test("annual pricing applies the published discount exactly", () => {
  const pro = professionalPlans.find((plan) => plan.id === "pro");
  const expected = pro.monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT_PERCENT / 100);
  assert.equal(calculateAnnualPrice(pro.monthlyPrice), expected);
  assert.equal(calculateAnnualPrice(0), 0);
});

test("each plan publishes usable capacity limits", () => {
  for (const plan of professionalPlans) {
    assert.ok(plan.limits.users >= 1);
    assert.ok(plan.limits.activeListings >= 1);
    assert.ok(plan.features.length >= 5);
  }

  for (const plan of specialistPlans) {
    assert.ok(plan.monthlyPrice > 0);
    assert.ok(plan.scope.length > 0);
  }
});

test("published add-ons have positive prices and unambiguous billing units", () => {
  const items = addOnGroups.flatMap((group) => group.items);
  assert.ok(items.length >= 12);
  for (const item of items) {
    assert.ok(item.price > 0, `${item.name} must have a positive price`);
    assert.ok(item.unit.length > 0, `${item.name} must include a billing unit`);
  }
});
