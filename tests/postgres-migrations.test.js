import test from "node:test";
import assert from "node:assert/strict";
import { createLocalQaDatabase, migrationFiles } from "../scripts/lib/local-postgres-qa.js";

test("all PostgreSQL migrations load in order", async () => {
  const { database, client } = await createLocalQaDatabase();
  try {
    const tables = database.public.many(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    assert.equal(migrationFiles.length, 3);
    assert.equal(tables.length, 27);
    assert.ok(tables.some((row) => row.table_name === "organizations"));
    assert.ok(tables.some((row) => row.table_name === "reservations"));
    assert.ok(tables.some((row) => row.table_name === "marketing_materials"));
  } finally {
    await client.end();
  }
});
