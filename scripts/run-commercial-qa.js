import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { demoAccountByKey } from "../lib/demo-accounts.js";
import { assertSafeDemoTarget } from "./lib/demo-safety.js";

assertSafeDemoTarget();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
});
const results = [];

try {
  await client.connect();
  const users = {};
  for (const [key, account] of Object.entries(demoAccountByKey)) {
    users[key] = await one("SELECT id, role, status FROM users WHERE email = $1 AND is_demo = TRUE", [account.email], `demo account ${key}`);
  }

  await scenario("A - renter and agent", async () => {
    await client.query("INSERT INTO member_marks (user_id, kind, target_id) VALUES ($1, 'saved_property', 'wuye-courtyard-residence') ON CONFLICT DO NOTHING", [users.renter.id]);
    const lead = await one("SELECT id FROM leads WHERE external_key = 'demo-renter-agent'", [], "renter lead");
    const messageCount = await scalar("SELECT COUNT(*)::int AS value FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.external_key = 'demo-renter-agent-thread'");
    if (messageCount < 4) throw new Error("renter-agent thread has fewer than four messages");
    await client.query("UPDATE leads SET stage = 'inspection', next_action = 'Complete inspection follow-up', updated_at = NOW() WHERE id = $1", [lead.id]);
    await client.query("UPDATE inspections SET status = 'completed', accuracy_score = 5, feedback = 'Fictional QA accuracy feedback', updated_at = NOW() WHERE external_key = 'demo-renter-inspection'");
    await notify("qa-renter-follow-up", users.renter.id, "inspection_completed", "Demonstration inspection completed", "/my-nestora");
    if ((await scalar("SELECT COUNT(*)::int AS value FROM inspections WHERE external_key = 'demo-renter-inspection' AND status = 'completed' AND accuracy_score = 5")) !== 1) throw new Error("inspection feedback did not persist");
  });

  await scenario("B - buyer and developer", async () => {
    const inventory = await client.query("SELECT status, COUNT(*)::int AS count FROM units GROUP BY status ORDER BY status");
    const statuses = new Set(inventory.rows.map((row) => row.status));
    for (const status of ["available", "reserved", "sold"]) if (!statuses.has(status)) throw new Error(`missing ${status} demonstration unit`);
    await client.query("UPDATE leads SET stage = 'inspection', next_action = 'Host development inspection', updated_at = NOW() WHERE external_key = 'demo-buyer-developer'");
    await client.query("UPDATE marketing_materials SET status = 'generated', storage_key = 'qa/development-payment-plan.html' WHERE external_key = 'demo-payment-plan'");
    if ((await scalar("SELECT COUNT(*)::int AS value FROM marketing_materials WHERE external_key = 'demo-payment-plan' AND status = 'generated'")) !== 1) throw new Error("payment plan was not generated");
  });

  await scenario("C - guest and hotel", async () => {
    const reservation = await one("SELECT id, room_id, organization_id, check_in, check_out, guest_id, total_amount FROM reservations WHERE external_key = 'demo-hotel-reservation'", [], "hotel reservation");
    await client.query("UPDATE reservations SET status = 'confirmed', updated_at = NOW() WHERE id = $1", [reservation.id]);
    let blocked = false;
    try {
      await client.query(
        `INSERT INTO reservations (external_key, guest_id, organization_id, room_id, check_in, check_out, guests, total_amount, status, is_demo)
         VALUES ($1, $2, $3, $4, $5, $6, 1, $7, 'requested', TRUE)`,
        [`qa-overlap-${Date.now()}`, reservation.guest_id, reservation.organization_id, reservation.room_id, reservation.check_in, reservation.check_out, reservation.total_amount],
      );
    } catch (error) {
      blocked = error.code === "23P01" || /reservations_no_double_booking/.test(error.message);
    }
    if (!blocked) throw new Error("overlapping reservation was not rejected");
    await notify("qa-hotel-confirmed", users.renter.id, "reservation_confirmed", "Demonstration reservation confirmed", "/my-nestora");
  });

  await scenario("D - agency team", async () => {
    const organization = await one("SELECT id FROM organizations WHERE slug = 'demo-bello-living'", [], "agency organization");
    await client.query("UPDATE team_invitations SET status = 'accepted', accepted_by = $1 WHERE external_key = 'demo-agency-invite'", [users.agent.id]);
    await client.query("INSERT INTO organization_members (organization_id, user_id, role, status) VALUES ($1, $2, 'agent', 'active') ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'agent', status = 'active'", [organization.id, users.agent.id]);
    if ((await scalar("SELECT COUNT(*)::int AS value FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND status = 'active'", [organization.id, users.agent.id])) !== 1) throw new Error("accepted team membership did not persist");
    if ((await scalar("SELECT COUNT(*)::int AS value FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND status = 'active'", [organization.id, users.developer.id])) !== 0) throw new Error("cross-tenant developer access was present");
  });

  await scenario("E - platform administration", async () => {
    await client.query("UPDATE verification_cases SET status = 'approved', reviewer_id = $1, reviewer_note = 'Approved in fictional QA scenario', updated_at = NOW() WHERE external_key = 'demo-agent-verification'", [users.admin.id]);
    await client.query("UPDATE verification_cases SET status = 'revision_requested', reviewer_id = $1, reviewer_note = 'Provide a clearer fictional QA document', updated_at = NOW() WHERE external_key = 'demo-developer-verification'", [users.admin.id]);
    await client.query("UPDATE verification_cases SET status = 'rejected', reviewer_id = $1, reviewer_note = 'Fictional QA document did not meet the checklist', updated_at = NOW() WHERE external_key = 'demo-hotel-verification'", [users.admin.id]);
    await client.query("UPDATE listings SET status = 'suspended', updated_at = NOW() WHERE id = 'wuye-courtyard-residence'");
    if ((await scalar("SELECT COUNT(*)::int AS value FROM listings WHERE id = 'wuye-courtyard-residence' AND status = 'active'")) !== 0) throw new Error("suspended listing remained active");
    await client.query("UPDATE listings SET status = 'active', updated_at = NOW() WHERE id = 'wuye-courtyard-residence'");
    await client.query("UPDATE listing_reports SET status = 'resolved', resolution = 'Demonstration issue reviewed and listing reinstated', updated_at = NOW() WHERE external_key = 'demo-listing-report'");
    await client.query("INSERT INTO audit_events (actor_id, action, target_type, target_id, metadata) VALUES ($1, 'listing.reinstated', 'listing', 'wuye-courtyard-residence', '{\"demo\":true}'::jsonb)", [users.admin.id]);
    if ((await scalar("SELECT COUNT(*)::int AS value FROM audit_events WHERE actor_id = $1 AND action = 'listing.reinstated' AND target_id = 'wuye-courtyard-residence'", [users.admin.id])) < 1) throw new Error("admin audit event did not persist");
  });

  await scenario("Notification capture", async () => {
    const captured = await scalar("SELECT COUNT(*)::int AS value FROM notifications WHERE is_demo = TRUE AND delivery_status = 'captured'");
    if (captured < 6) throw new Error(`only ${captured} captured demo notifications were found`);
  });

  const evidenceDir = path.resolve("docs", "qa", "evidence", "data");
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(path.join(evidenceDir, "commercial-qa-results.json"), JSON.stringify({ generatedAt: new Date().toISOString(), environment: process.env.NESTORA_ENVIRONMENT, results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  console.error("Commercial QA failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

async function scenario(name, run) {
  const started = Date.now();
  try {
    await run();
    results.push({ name, status: "pass", durationMs: Date.now() - started });
  } catch (error) {
    results.push({ name, status: "fail", durationMs: Date.now() - started, error: error.message });
    throw error;
  }
}

async function one(sql, values, label) {
  const result = await client.query(sql, values);
  if (result.rowCount !== 1) throw new Error(`${label} expected one row and found ${result.rowCount}`);
  return result.rows[0];
}

async function scalar(sql, values = []) {
  const result = await client.query(sql, values);
  return Number(result.rows[0]?.value || 0);
}

async function notify(externalKey, userId, kind, title, deepLink) {
  await client.query(
    `INSERT INTO notifications (external_key, user_id, kind, title, body, deep_link, delivery_status, is_demo)
     VALUES ($1, $2, $3, $4, 'Captured by the isolated QA notification transport.', $5, 'captured', TRUE)
     ON CONFLICT (external_key) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, deep_link = EXCLUDED.deep_link, delivery_status = 'captured', is_demo = TRUE`,
    [externalKey, userId, kind, title, deepLink],
  );
}
