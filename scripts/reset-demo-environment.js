import pg from "pg";
import { assertSafeDemoTarget } from "./lib/demo-safety.js";

assertSafeDemoTarget();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
});

try {
  await client.connect();
  await client.query("BEGIN");
  const users = await client.query("DELETE FROM users WHERE is_demo = TRUE RETURNING id");
  const organizations = await client.query("DELETE FROM organizations WHERE is_demo = TRUE RETURNING id");
  await client.query("COMMIT");
  console.log(`Removed ${users.rowCount} demo users and ${organizations.rowCount} demo organizations.`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => null);
  console.error("Demo reset failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
