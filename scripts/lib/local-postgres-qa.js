import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { newDb, DataType } from "pg-mem";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const migrationFiles = ["001_core.sql", "002_member_activity.sql", "003_commercial_operations.sql", "004_production_operations.sql", "005_agent_product_foundations.sql", "006_listing_tours_and_attribution.sql", "007_hotel_listing_inventory.sql", "008_durable_actor_deletion.sql", "009_professional_membership.sql"];
export const skippedInMemoryMigrations = new Set(["007_hotel_listing_inventory.sql"]);

export async function createLocalQaDatabase(root = path.resolve(__dirname, "..", "..")) {
  const database = newDb({ autoCreateForeignKeyIndices: true });
  database.public.registerFunction({ name: "gen_random_uuid", returns: DataType.uuid, implementation: randomUUID, impure: true });
  database.public.registerFunction({ name: "char_length", args: [DataType.text], returns: DataType.integer, implementation: (value) => value.length });

  for (const file of migrationFiles) {
    if (skippedInMemoryMigrations.has(file)) continue;
    const source = await fs.readFile(path.join(root, "db", "migrations", file), "utf8");
    database.public.none(sanitizeMigration(source));
  }

  const adapter = database.adapters.createPg();
  const client = new adapter.Client();
  await client.connect();
  return { database, client };
}

export function sanitizeMigration(source) {
  return source
    .replace(/^CREATE EXTENSION[^;]+;\s*/gim, "")
    .replace(/DO \$\$[\s\S]*?END \$\$;\s*/gim, "")
    .replace(/COMMIT;[\s\S]*?;/gim, "COMMIT;")
    .replace(/ALTER TABLE hotel_room_types[\s\S]*?ON DELETE cascade;\s*/gim, "");
}
