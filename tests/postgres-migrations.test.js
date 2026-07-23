import test from "node:test";
import assert from "node:assert/strict";
import { createLocalQaDatabase, migrationFiles } from "../scripts/lib/local-postgres-qa.js";

test("all PostgreSQL migrations load in order", async () => {
  let database;
  let client;
  try {
    ({ database, client } = await createLocalQaDatabase());
    const tables = database.public.many(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    assert.equal(migrationFiles.length, 11);
    assert.ok(tables.length >= 30);
    assert.ok(tables.some((row) => row.table_name === "organizations"));
    assert.ok(tables.some((row) => row.table_name === "reservations"));
    assert.ok(tables.some((row) => row.table_name === "marketing_materials"));
    assert.ok(tables.some((row) => row.table_name === "listing_media"));
    assert.ok(tables.some((row) => row.table_name === "delivery_jobs"));
    assert.ok(tables.some((row) => row.table_name === "monitoring_events"));
    assert.ok(tables.some((row) => row.table_name === "professional_profile_media"));
    assert.ok(tables.some((row) => row.table_name === "marketing_attribution_links"));
    assert.ok(tables.some((row) => row.table_name === "marketing_attribution_events"));
  } finally {
    try {
      await client.end();
    } catch {}
  }
});
