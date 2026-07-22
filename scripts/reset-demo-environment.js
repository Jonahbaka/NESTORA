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
  const demoUsers = "SELECT id FROM users WHERE is_demo = TRUE";
  const demoOrganizations = "SELECT id FROM organizations WHERE is_demo = TRUE";
  await client.query(`DELETE FROM analytics_daily WHERE user_id IN (${demoUsers}) OR organization_id IN (${demoOrganizations})`);
  await client.query(`DELETE FROM analytics_events WHERE user_id IN (${demoUsers}) OR organization_id IN (${demoOrganizations})`);
  await client.query(`DELETE FROM entitlement_history WHERE actor_id IN (${demoUsers}) OR subscription_id IN (SELECT id FROM subscriptions WHERE user_id IN (${demoUsers}) OR organization_id IN (${demoOrganizations}))`);
  await client.query(`DELETE FROM marketing_designs WHERE owner_user_id IN (${demoUsers}) OR organization_id IN (${demoOrganizations})`);
  await client.query(`DELETE FROM partner_websites WHERE owner_user_id IN (${demoUsers}) OR organization_id IN (${demoOrganizations})`);
  await client.query(`DELETE FROM brand_kits WHERE owner_user_id IN (${demoUsers}) OR organization_id IN (${demoOrganizations})`);
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
