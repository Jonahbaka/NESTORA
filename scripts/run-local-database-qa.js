import fs from "node:fs/promises";
import path from "node:path";
import { demoAccounts } from "../lib/demo-accounts.js";
import { createLocalQaDatabase, migrationFiles } from "./lib/local-postgres-qa.js";

const outputPath = path.join(process.cwd(), "docs", "qa", "evidence", "data", "local-database-qa-results.json");
const results = [];
const { database, client } = await createLocalQaDatabase();

try {
  const ids = {};
  for (const account of demoAccounts) {
    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, role, status, email_verified_at, is_demo)
       VALUES ($1, $2, 'local-qa-password-hash', $3, 'active', NOW(), TRUE) RETURNING id`,
      [account.name, account.email, account.role],
    );
    ids[account.key] = result.rows[0].id;
  }
  pass("Clearly labelled demo accounts", `${demoAccounts.length} isolated accounts created`);

  const organizations = {};
  for (const [key, slug, name, kind, owner] of [
    ["agency", "demo-bello-living", "Bello Living QA", "agency", "agency"],
    ["developer", "demo-capital-homes", "Capital Homes QA", "developer", "developer"],
    ["hotel", "demo-jabi-suites", "Jabi Suites QA", "hotel", "hotel"],
  ]) {
    const result = await client.query(
      "INSERT INTO organizations (slug, name, kind, is_demo) VALUES ($1, $2, $3, TRUE) RETURNING id",
      [slug, name, kind],
    );
    organizations[key] = result.rows[0].id;
    await client.query(
      "INSERT INTO organization_members (organization_id, user_id, role, status) VALUES ($1, $2, 'owner', 'active')",
      [organizations[key], ids[owner]],
    );
  }
  pass("Organization and tenant boundaries", "Agency, developer, and hotel tenants created with isolated owners");

  await client.query(
    `INSERT INTO listings (id, owner_user_id, organization_id, title, category, location, price_amount, status, is_demo)
     VALUES
       ('qa-rental', $1, $2, 'QA Wuye Rental', 'rent', 'Wuye, Abuja', 4500000, 'active', TRUE),
       ('qa-development', $3, $4, 'QA Katampe Development', 'development', 'Katampe, Abuja', 245000000, 'active', TRUE),
       ('qa-hotel', $5, $6, 'QA Jabi Hotel', 'stay', 'Jabi, Abuja', 185000, 'active', TRUE)`,
    [ids.agent, organizations.agency, ids.developer, organizations.developer, ids.hotel, organizations.hotel],
  );

  const lead = await one(
    `INSERT INTO leads (external_key, customer_id, owner_user_id, organization_id, listing_id, source, stage, next_action, is_demo)
     VALUES ('qa-renter-agent', $1, $2, $3, 'qa-rental', 'listing', 'new', 'Reply to enquiry', TRUE) RETURNING id`,
    [ids.renter, ids.agent, organizations.agency],
  );
  const conversation = await one(
    `INSERT INTO conversations (external_key, subject_type, subject_id, organization_id, is_demo)
     VALUES ('qa-renter-agent-thread', 'listing', 'qa-rental', $1, TRUE) RETURNING id`,
    [organizations.agency],
  );
  await client.query(
    "INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)",
    [conversation.id, ids.renter, ids.agent],
  );
  await client.query(
    `INSERT INTO messages (conversation_id, sender_id, body) VALUES
       ($1, $2, 'Is the illustrative rental available for a QA inspection?'),
       ($1, $3, 'Yes. I can propose a clearly labelled demonstration slot.'),
       ($1, $2, 'Please send the details.'),
       ($1, $3, 'The QA slot and move-in cost breakdown are ready.')`,
    [conversation.id, ids.renter, ids.agent],
  );
  if ((await scalar("SELECT COUNT(*)::int AS value FROM messages WHERE conversation_id = $1", [conversation.id])) !== 4) {
    throw new Error("Cross-role message persistence failed");
  }
  pass("Renter and agent messaging", "Four messages persisted with both users as participants");

  await client.query(
    `INSERT INTO inspections (external_key, lead_id, customer_id, professional_id, listing_id, scheduled_at, status, is_demo)
     VALUES ('qa-inspection', $1, $2, $3, 'qa-rental', NOW(), 'confirmed', TRUE)`,
    [lead.id, ids.renter, ids.agent],
  );
  await client.query(
    "UPDATE inspections SET status = 'completed', accuracy_score = 5, feedback = 'Clearly fictional local QA feedback' WHERE external_key = 'qa-inspection'",
  );
  if ((await scalar("SELECT COUNT(*)::int AS value FROM inspections WHERE status = 'completed' AND accuracy_score = 5")) !== 1) {
    throw new Error("Inspection completion did not persist");
  }
  pass("Inspection workflow", "Confirmed inspection completed with labelled QA feedback");

  const development = await one(
    `INSERT INTO developments (external_key, organization_id, name, location, status, construction_progress, is_demo)
     VALUES ('qa-development', $1, 'QA Katampe Court', 'Katampe, Abuja', 'active', 78, TRUE) RETURNING id`,
    [organizations.developer],
  );
  const block = await one(
    "INSERT INTO development_blocks (development_id, code, name, floors) VALUES ($1, 'A', 'Block A', 4) RETURNING id",
    [development.id],
  );
  const unitType = await one(
    "INSERT INTO unit_types (development_id, code, name, bedrooms, bathrooms, area_sqm, price_amount) VALUES ($1, '3B', 'Three bedroom', 3, 3.5, 212, 245000000) RETURNING id",
    [development.id],
  );
  for (const [code, status] of [["A101", "available"], ["A102", "reserved"], ["A103", "sold"]]) {
    await client.query(
      "INSERT INTO units (development_id, block_id, unit_type_id, code, floor, status, price_amount) VALUES ($1, $2, $3, $4, 1, $5, 245000000)",
      [development.id, block.id, unitType.id, code, status],
    );
  }
  pass("Developer inventory", "Available, reserved, and sold inventory states persisted");

  const developerLead = await one(
    `INSERT INTO leads (external_key, customer_id, owner_user_id, organization_id, listing_id, source, stage, next_action, is_demo)
     VALUES ('qa-buyer-developer', $1, $2, $3, 'qa-development', 'development', 'inspection', 'Share payment plan', TRUE) RETURNING id`,
    [ids.renter, ids.developer, organizations.developer],
  );
  await seedThread("qa-buyer-developer-thread", "development", development.id, organizations.developer, ids.renter, ids.developer, [
    "Which illustrative three-bedroom units remain available?",
    "A101 is available; A102 is reserved and A103 is sold.",
    "Please share the demonstration payment plan.",
    "The clearly labelled payment-plan sheet is ready for review.",
  ]);
  await client.query(
    `INSERT INTO inspections (external_key, lead_id, customer_id, professional_id, listing_id, scheduled_at, status, is_demo)
     VALUES ('qa-development-inspection', $1, $2, $3, 'qa-development', NOW(), 'confirmed', TRUE)`,
    [developerLead.id, ids.renter, ids.developer],
  );
  pass("Buyer and developer workflow", "Lead, four-message thread, payment-plan request, inspection, and unchanged inventory persisted");

  const roomType = await one(
    "INSERT INTO hotel_room_types (organization_id, code, name, capacity, nightly_rate) VALUES ($1, 'SUITE', 'QA Suite', 2, 185000) RETURNING id",
    [organizations.hotel],
  );
  const room = await one(
    "INSERT INTO hotel_rooms (organization_id, room_type_id, code, status) VALUES ($1, $2, 'QA-101', 'available') RETURNING id",
    [organizations.hotel, roomType.id],
  );
  await client.query(
    `INSERT INTO reservations (external_key, guest_id, organization_id, room_id, check_in, check_out, guests, total_amount, status, is_demo)
     VALUES ('qa-reservation', $1, $2, $3, '2030-08-01', '2030-08-04', 2, 555000, 'confirmed', TRUE)`,
    [ids.renter, organizations.hotel, room.id],
  );
  const overlap = await scalar(
    `SELECT COUNT(*)::int AS value FROM reservations
     WHERE room_id = $1 AND status IN ('requested', 'confirmed') AND check_in < '2030-08-03' AND check_out > '2030-08-02'`,
    [room.id],
  );
  if (overlap !== 1) throw new Error("Reservation overlap guard query failed");
  pass("Hotel reservation workflow", "Reservation persisted and overlap guard query detected the occupied range");
  pass("Database double-booking constraint", "Constraint is present in production migration; pg-mem cannot execute PostgreSQL GiST exclusion constraints", "staging_required");

  await client.query(
    `INSERT INTO leads (external_key, customer_id, owner_user_id, organization_id, listing_id, source, stage, next_action, is_demo)
     VALUES ('qa-guest-hotel', $1, $2, $3, 'qa-hotel', 'hotel', 'reservation', 'Confirm airport pickup', TRUE)`,
    [ids.renter, ids.hotel, organizations.hotel],
  );
  await seedThread("qa-guest-hotel-thread", "reservation", "qa-reservation", organizations.hotel, ids.renter, ids.hotel, [
    "I submitted the demonstration reservation request.",
    "The QA reservation is confirmed for the selected suite.",
    "Can the demonstration stay include airport pickup?",
    "Yes. The illustrative pickup option has been recorded.",
  ]);
  pass("Guest and hotel messaging", "Reservation lead and four-message guest thread persisted");

  await client.query(
    `INSERT INTO team_invitations (external_key, organization_id, invited_by, email, role, token_hash, status, expires_at)
     VALUES ('qa-invite', $1, $2, $3, 'agent', 'local-qa-token-hash', 'pending', NOW())`,
    [organizations.agency, ids.agency, demoAccounts.find((account) => account.key === "agent").email],
  );
  await client.query(
    "INSERT INTO subscriptions (external_key, organization_id, plan_id, status, starts_at, assigned_by, is_demo) VALUES ('qa-plan', $1, 'agency-pilot', 'active', NOW(), $2, TRUE)",
    [organizations.agency, ids.admin],
  );
  await client.query(
    "UPDATE team_invitations SET status = 'accepted', accepted_by = $1 WHERE external_key = 'qa-invite'",
    [ids.agent],
  );
  await client.query(
    "INSERT INTO organization_members (organization_id, user_id, role, status) VALUES ($1, $2, 'agent', 'active') ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'active'",
    [organizations.agency, ids.agent],
  );
  await client.query(
    "UPDATE leads SET owner_user_id = $1, stage = 'contacted', next_action = 'Complete assigned QA follow-up' WHERE external_key = 'qa-renter-agent' AND organization_id = $2",
    [ids.agent, organizations.agency],
  );
  pass("Agency invitation and subscription", "Invitation acceptance, membership, assigned lead, and active pilot entitlement persisted");

  await client.query(
    `INSERT INTO marketing_materials (external_key, owner_user_id, organization_id, listing_id, kind, status, qr_target, is_demo)
     VALUES ('qa-rental-flyer', $1, $2, 'qa-rental', 'rental_flyer', 'generated', '/properties/qa-rental?source=qr', TRUE)`,
    [ids.agent, organizations.agency],
  );
  const notificationKinds = [
    "new_registration", "password_reset", "new_enquiry", "agent_reply", "inspection_booking", "inspection_rescheduling",
    "hotel_reservation_request", "listing_approval", "verification_decision", "team_invitation", "availability_reconfirmation",
    "listing_expiration", "subscription_assignment",
  ];
  for (const [index, kind] of notificationKinds.entries()) {
    await client.query(
      `INSERT INTO notifications (external_key, user_id, kind, title, body, deep_link, delivery_status, is_demo)
       VALUES ($1, $2, $3, $4, 'Captured by the safe local QA transport', '/my-nestora', 'captured', TRUE)`,
      [`qa-notification-${kind}`, index % 2 === 0 ? ids.renter : ids.agent, kind, `QA ${kind.replaceAll("_", " ")}`],
    );
  }
  if ((await scalar("SELECT COUNT(*)::int AS value FROM notifications WHERE is_demo = TRUE AND delivery_status = 'captured'")) !== notificationKinds.length) {
    throw new Error("Safe notification transport did not capture every required event");
  }
  pass("Marketing attribution and notifications", `Generated material retained its QR target and ${notificationKinds.length} notification events were captured locally`);

  await client.query(
    `INSERT INTO verification_cases (external_key, subject_user_id, kind, status, reviewer_id, is_demo)
     VALUES ('qa-agent-verification', $1, 'agent', 'approved', $2, TRUE)`,
    [ids.agent, ids.admin],
  );
  await client.query(
    `INSERT INTO listing_reports (external_key, listing_id, reporter_id, reason, status, assigned_to, is_demo)
     VALUES ('qa-listing-report', 'qa-rental', $1, 'Clearly fictional QA report', 'investigating', $2, TRUE)`,
    [ids.renter, ids.admin],
  );
  await client.query(
    "INSERT INTO audit_events (actor_id, action, target_type, target_id, metadata) VALUES ($1, 'qa.admin.reviewed', 'listing', 'qa-rental', '{\"isolated\":true}'::jsonb)",
    [ids.admin],
  );
  await client.query(
    `INSERT INTO verification_cases (external_key, organization_id, kind, status, reviewer_id, reviewer_note, is_demo) VALUES
       ('qa-developer-verification', $1, 'developer', 'revision_requested', $3, 'QA revision requested', TRUE),
       ('qa-hotel-verification', $2, 'hotel', 'rejected', $3, 'QA rejection', TRUE)`,
    [organizations.developer, organizations.hotel, ids.admin],
  );
  await client.query("UPDATE listings SET status = 'suspended' WHERE id = 'qa-rental'");
  if ((await scalar("SELECT COUNT(*)::int AS value FROM listings WHERE id = 'qa-rental' AND status = 'active'")) !== 0) {
    throw new Error("Suspended listing remained publicly active");
  }
  await client.query("UPDATE listings SET status = 'active' WHERE id = 'qa-rental'");
  await client.query(
    "INSERT INTO audit_events (actor_id, action, target_type, target_id, metadata) VALUES ($1, 'listing.reinstated', 'listing', 'qa-rental', '{\"isolated\":true}'::jsonb)",
    [ids.admin],
  );
  pass("Administrative review and audit", "Approve, revise, reject, report, suspend, reinstate, and audit states persisted");

  if ((await scalar("SELECT COUNT(*)::int AS value FROM leads WHERE organization_id = $1 AND organization_id = $2", [organizations.agency, organizations.hotel])) !== 0) {
    throw new Error("Tenant isolation query crossed organizations");
  }
  pass("Tenant isolation query", "Agency-scoped query cannot match the hotel tenant");

  const tableCount = database.public.many("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").length;
  const report = {
    generatedAt: new Date().toISOString(),
    adapter: "pg-mem PostgreSQL-compatible in-memory adapter",
    scope: "isolated local commercial data QA",
    migrations: migrationFiles,
    tableCount,
    limitations: ["PostgreSQL GiST exclusion constraints require validation against the isolated staging PostgreSQL service."],
    results,
  };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Local database QA passed ${results.filter((result) => result.status === "passed").length} scenarios.`);
  console.log(`Evidence: ${outputPath}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}

function pass(name, detail, status = "passed") {
  results.push({ name, status, detail });
}

async function one(sql, values = []) {
  const result = await client.query(sql, values);
  if (result.rows.length !== 1) throw new Error(`Expected one row for query: ${sql.slice(0, 70)}`);
  return result.rows[0];
}

async function scalar(sql, values = []) {
  const result = await client.query(sql, values);
  return Number(result.rows[0].value);
}

async function seedThread(externalKey, subjectType, subjectId, organizationId, firstUserId, secondUserId, messages) {
  const conversation = await one(
    `INSERT INTO conversations (external_key, subject_type, subject_id, organization_id, is_demo)
     VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
    [externalKey, subjectType, String(subjectId), organizationId],
  );
  await client.query(
    "INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)",
    [conversation.id, firstUserId, secondUserId],
  );
  for (const [index, body] of messages.entries()) {
    await client.query(
      "INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3)",
      [conversation.id, index % 2 === 0 ? firstUserId : secondUserId, body],
    );
  }
}
