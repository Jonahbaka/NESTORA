import assert from "node:assert/strict";
import test from "node:test";
import { calculatePropertyMediaEstimate, PROPERTY_MEDIA_PRICING } from "../lib/property-media-pricing.js";

test("property media pricing contains every published launch package and cost policy", () => {
  assert.equal(PROPERTY_MEDIA_PRICING.packages.length, 8);
  assert.equal(PROPERTY_MEDIA_PRICING.packages.find((item) => item.id === "essential-photography").priceNgn, 75000);
  assert.equal(PROPERTY_MEDIA_PRICING.packages.find((item) => item.id === "complete-property-media").priceNgn, 450000);
  assert.equal(PROPERTY_MEDIA_PRICING.hostingRenewalNgn, 60000);
  assert.equal(PROPERTY_MEDIA_PRICING.additionalKmRateNgn, 1500);
  assert.equal(PROPERTY_MEDIA_PRICING.depositPercent, 50);
});

test("server estimate calculates extras, round-trip travel, weekend, express, tax and deposit", () => {
  const estimate = calculatePropertyMediaEstimate({
    packageId: "essential-photography",
    preferredDate: "2026-07-25",
    distanceKm: 30,
    permitAllowanceNgn: 10000,
    extras: { "additional-photo": 2, express: true },
  });
  assert.equal(estimate.package.amountNgn, 75000);
  assert.equal(estimate.extrasTotalNgn, 15000);
  assert.equal(estimate.travel.amountNgn, 15000);
  assert.equal(estimate.weekend.amountNgn, 15000);
  assert.equal(estimate.express.amountNgn, 22500);
  assert.equal(estimate.totalNgn, 152500);
  assert.equal(estimate.deposit.amountNgn, 76250);
  assert.equal(estimate.remainingBalanceNgn, 76250);
});

test("browser-supplied totals are ignored and invalid packages are rejected", () => {
  const estimate = calculatePropertyMediaEstimate({
    packageId: "professional-listing",
    preferredDate: "2026-07-27",
    distanceKm: 0,
    totalNgn: 1,
    depositNgn: 1,
    extras: {},
  });
  assert.equal(estimate.totalNgn, 150000);
  assert.throws(() => calculatePropertyMediaEstimate({ packageId: "forged", preferredDate: "2026-07-27", extras: {} }), /INVALID_PACKAGE/);
});
