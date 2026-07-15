import test from "node:test";
import assert from "node:assert/strict";
import { calculateStayTotal, filterProperties, formatNaira, makeReference } from "../lib/platform.js";
import { properties } from "../lib/data.js";

test("property filters combine category, area and bedroom criteria", () => {
  const matches = filterProperties(properties, { mode: "rent", area: "Wuye", beds: 3 });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "wuye-courtyard-residence");
});

test("property search is case-insensitive and includes descriptions", () => {
  const matches = filterProperties(properties, { query: "LAKE-facing" });
  assert.equal(matches[0].id, "jabi-lake-serviced-suite");
});

test("stay totals multiply nights and add each disclosed fee once", () => {
  const property = properties.find((item) => item.id === "jabi-lake-serviced-suite");
  const total = calculateStayTotal(property, 3);
  assert.equal(total.subtotal, 555000);
  assert.equal(total.extras, 60375);
  assert.equal(total.total, 615375);
});

test("display helpers produce Nigerian currency and traceable references", () => {
  assert.match(formatNaira(1250000), /1,250,000/);
  assert.match(makeReference("VIEW"), /^VIEW-[A-Z0-9]+-[A-Z0-9]{4}$/);
});
