import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";
import { demoAccountByKey, demoAccounts } from "../lib/demo-accounts.js";
import { assertDemoPassword, assertSafeDemoTarget } from "./lib/demo-safety.js";

assertSafeDemoTarget();
assertDemoPassword(process.env.NESTORA_DEMO_PASSWORD);

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
});

const passwordHash = await bcrypt.hash(process.env.NESTORA_DEMO_PASSWORD, 12);

try {
  await client.connect();
  await client.query("BEGIN");

  const users = {};
  for (const account of demoAccounts) {
    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, role, status, email_verified_at, is_demo)
       VALUES ($1, $2, $3, $4, 'active', NOW(), TRUE)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         status = 'active',
         email_verified_at = NOW(),
         is_demo = TRUE,
         updated_at = NOW()
       RETURNING id`,
      [account.name, account.email, passwordHash, account.role],
    );
    users[account.key] = result.rows[0].id;
  }

  const organizations = {};
  for (const organization of [
    { key: "agency", slug: "demo-bello-living", name: "Bello Living Demonstration Agency", kind: "agency" },
    { key: "developer", slug: "demo-northline", name: "Northline Demonstration Developments", kind: "developer" },
    { key: "hotel", slug: "demo-nook-jabi", name: "The Nook Jabi Demonstration Hotel", kind: "hotel" },
  ]) {
    const result = await client.query(
      `INSERT INTO organizations (slug, name, kind, status, is_demo)
       VALUES ($1, $2, $3, 'active', TRUE)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, status = 'active', is_demo = TRUE, updated_at = NOW()
       RETURNING id`,
      [organization.slug, organization.name, organization.kind],
    );
    organizations[organization.key] = result.rows[0].id;
  }

  await membership(organizations.agency, users.agency, "owner");
  await membership(organizations.agency, users.agent, "agent");
  await membership(organizations.developer, users.developer, "owner");
  await membership(organizations.hotel, users.hotel, "owner");

  await profile(users.agent, organizations.agency, "Independent Abuja property advisor", "Fictional QA profile for rental and buyer demonstrations.", ["Wuye", "Maitama", "Guzape"]);
  await profile(users.developer, organizations.developer, "Developer sales administrator", "Fictional QA profile for development inventory and buyer enquiries.", ["Katampe"]);
  await profile(users.hotel, organizations.hotel, "Hotel operations administrator", "Fictional QA profile for room inventory and guest reservations.", ["Jabi"]);
  await profile(users.agency, organizations.agency, "Agency administrator", "Fictional QA profile for team, lead assignment, and performance workflows.", ["Abuja"]);

  await listing("wuye-courtyard-residence", users.agent, organizations.agency, "The Courtyard Residence - Demonstration", "rent", "Wuye, Abuja", 8500000, "active");
  await listing("guzape-garden-duplex", users.agent, organizations.agency, "Guzape Garden Duplex - Demonstration", "rent", "Guzape, Abuja", 15000000, "expired");
  await listing("maitama-ridge-villa", users.agent, organizations.agency, "Maitama Ridge Villa - Demonstration", "sale", "Maitama, Abuja", 685000000, "active");
  await listing("katampe-court-residences", users.developer, organizations.developer, "Katampe Court Residences - Demonstration", "development", "Katampe, Abuja", 245000000, "active");
  await listing("jabi-lake-serviced-suite", users.hotel, organizations.hotel, "Jabi Lake Serviced Suite - Demonstration", "stay", "Jabi, Abuja", 185000, "active");

  const development = await upsertOne(
    `INSERT INTO developments (external_key, organization_id, name, location, status, completion_date, construction_progress, payment_plan_summary, is_demo)
     VALUES ('demo-katampe-court', $1, 'Katampe Court Demonstration Development', 'Katampe, Abuja', 'active', '2027-06-30', 78, '30% deposit, 50% during construction, 20% at handover.', TRUE)
     ON CONFLICT (external_key) DO UPDATE SET construction_progress = 78, payment_plan_summary = EXCLUDED.payment_plan_summary, is_demo = TRUE, updated_at = NOW()
     RETURNING id`,
    [organizations.developer],
  );
  const blockA = await upsertOne(
    `INSERT INTO development_blocks (development_id, code, name, floors) VALUES ($1, 'A', 'Block A', 4)
     ON CONFLICT (development_id, code) DO UPDATE SET name = EXCLUDED.name, floors = EXCLUDED.floors RETURNING id`,
    [development],
  );
  const blockB = await upsertOne(
    `INSERT INTO development_blocks (development_id, code, name, floors) VALUES ($1, 'B', 'Block B', 5)
     ON CONFLICT (development_id, code) DO UPDATE SET name = EXCLUDED.name, floors = EXCLUDED.floors RETURNING id`,
    [development],
  );
  const threeBed = await upsertOne(
    `INSERT INTO unit_types (development_id, code, name, bedrooms, bathrooms, area_sqm, price_amount)
     VALUES ($1, '3B', 'Three-bedroom residence', 3, 4, 242, 245000000)
     ON CONFLICT (development_id, code) DO UPDATE SET price_amount = EXCLUDED.price_amount RETURNING id`,
    [development],
  );
  for (const [block, code, floor, status] of [[blockA, "A-101", 1, "available"], [blockA, "A-201", 2, "reserved"], [blockB, "B-301", 3, "sold"]]) {
    await client.query(
      `INSERT INTO units (development_id, block_id, unit_type_id, code, floor, status, price_amount)
       VALUES ($1, $2, $3, $4, $5, $6, 245000000)
       ON CONFLICT (development_id, code) DO UPDATE SET block_id = EXCLUDED.block_id, unit_type_id = EXCLUDED.unit_type_id, floor = EXCLUDED.floor, status = EXCLUDED.status, price_amount = EXCLUDED.price_amount, updated_at = NOW()`,
      [development, block, threeBed, code, floor, status],
    );
  }

  const suiteType = await upsertOne(
    `INSERT INTO hotel_room_types (organization_id, code, name, capacity, nightly_rate)
     VALUES ($1, 'LAKE-SUITE', 'Lake Suite', 2, 185000)
     ON CONFLICT (organization_id, code) DO UPDATE SET nightly_rate = EXCLUDED.nightly_rate RETURNING id`,
    [organizations.hotel],
  );
  const room = await upsertOne(
    `INSERT INTO hotel_rooms (organization_id, room_type_id, code, status)
     VALUES ($1, $2, 'LS-201', 'available')
     ON CONFLICT (organization_id, code) DO UPDATE SET room_type_id = EXCLUDED.room_type_id, status = 'available' RETURNING id`,
    [organizations.hotel, suiteType],
  );

  const rentalLead = await upsertLead("demo-renter-agent", users.renter, users.agent, organizations.agency, "wuye-courtyard-residence", "listing", "inspection", "Confirm Thursday inspection");
  const developerLead = await upsertLead("demo-buyer-developer", users.renter, users.developer, organizations.developer, "katampe-court-residences", "development", "qualified", "Share payment plan");
  await upsertLead("demo-qr-attribution", users.renter, users.agent, organizations.agency, "maitama-ridge-villa", "qr", "new", "Respond to QR enquiry");

  await seedConversation("demo-renter-agent-thread", "listing", "wuye-courtyard-residence", organizations.agency, [users.renter, users.agent], [
    [users.renter, "Is this demonstration property still available for a Thursday viewing?"],
    [users.agent, "Yes. The fictional QA listing is available, and the demonstration service charge is NGN 620,000."],
    [users.renter, "Please confirm power arrangements and a time after work."],
    [users.agent, "The demonstration notes show inverter and generator backup. I can hold 4:30 pm Thursday."],
  ]);
  await seedConversation("demo-buyer-developer-thread", "development", String(development), organizations.developer, [users.renter, users.developer], [
    [users.renter, "Please share the demonstration three-bedroom payment plan and completion target."],
    [users.developer, "The fictional QA plan is 30%, 50%, and 20%, with a June 2027 demonstration target."],
  ]);
  await seedConversation("demo-guest-hotel-thread", "reservation", "demo-hotel-reservation", organizations.hotel, [users.renter, users.hotel], [
    [users.renter, "Does the demonstration stay include airport pickup and early check-in?"],
    [users.hotel, "Airport pickup can be added. Early check-in depends on the prior room departure."],
  ]);

  await client.query(
    `INSERT INTO inspections (external_key, lead_id, customer_id, professional_id, listing_id, scheduled_at, status, is_demo)
     VALUES ('demo-renter-inspection', $1, $2, $3, 'wuye-courtyard-residence', NOW() + INTERVAL '3 days', 'confirmed', TRUE)
     ON CONFLICT (external_key) DO UPDATE SET scheduled_at = EXCLUDED.scheduled_at, status = 'confirmed', accuracy_score = NULL, feedback = NULL, is_demo = TRUE, updated_at = NOW()`,
    [rentalLead, users.renter, users.agent],
  );

  await client.query(
    `INSERT INTO reservations (external_key, guest_id, organization_id, room_id, check_in, check_out, guests, total_amount, status, special_request, is_demo)
     VALUES ('demo-hotel-reservation', $1, $2, $3, CURRENT_DATE + 14, CURRENT_DATE + 17, 2, 638375, 'requested', 'Airport pickup requested; early check-in if available.', TRUE)
     ON CONFLICT (external_key) DO UPDATE SET status = 'requested', special_request = EXCLUDED.special_request, is_demo = TRUE, updated_at = NOW()`,
    [users.renter, organizations.hotel, room],
  );

  const inviteTokenHash = crypto.createHash("sha256").update("demo-agency-invite-token").digest("hex");
  await client.query(
    `INSERT INTO team_invitations (external_key, organization_id, invited_by, email, role, token_hash, status, expires_at)
     VALUES ('demo-agency-invite', $1, $2, $3, 'agent', $4, 'pending', NOW() + INTERVAL '7 days')
     ON CONFLICT (external_key) DO UPDATE SET invited_by = EXCLUDED.invited_by, email = EXCLUDED.email, role = EXCLUDED.role, token_hash = EXCLUDED.token_hash, status = 'pending', expires_at = EXCLUDED.expires_at`,
    [organizations.agency, users.agency, demoAccountByKey.agent.email, inviteTokenHash],
  );

  for (const subscription of [
    ["demo-agent-pilot", users.agent, null, "pilot"],
    ["demo-agency-plan", null, organizations.agency, "agency"],
    ["demo-developer-plan", null, organizations.developer, "developer-studio"],
    ["demo-hotel-plan", null, organizations.hotel, "hotel-operations"],
  ]) {
    await client.query(
      `INSERT INTO subscriptions (external_key, user_id, organization_id, plan_id, status, starts_at, ends_at, assigned_by, is_demo)
       VALUES ($1, $2, $3, $4, 'active', NOW(), NOW() + INTERVAL '90 days', $5, TRUE)
       ON CONFLICT (external_key) DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active', starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, assigned_by = EXCLUDED.assigned_by, is_demo = TRUE`,
      [subscription[0], subscription[1], subscription[2], subscription[3], users.admin],
    );
  }

  await client.query(
    `INSERT INTO verification_cases (external_key, subject_user_id, kind, status, is_demo)
     VALUES ('demo-agent-verification', $1, 'agent', 'submitted', TRUE)
     ON CONFLICT (external_key) DO UPDATE SET status = 'submitted', reviewer_id = NULL, reviewer_note = NULL, is_demo = TRUE, updated_at = NOW()`,
    [users.agent],
  );
  await client.query(
    `INSERT INTO verification_cases (external_key, organization_id, kind, status, is_demo)
     VALUES ('demo-developer-verification', $1, 'developer', 'submitted', TRUE), ('demo-hotel-verification', $2, 'hotel', 'submitted', TRUE)
     ON CONFLICT (external_key) DO UPDATE SET status = 'submitted', reviewer_id = NULL, reviewer_note = NULL, is_demo = TRUE, updated_at = NOW()`,
    [organizations.developer, organizations.hotel],
  );
  await client.query(
    `INSERT INTO listing_reports (external_key, listing_id, reporter_id, reason, status, assigned_to, is_demo)
     VALUES ('demo-listing-report', 'wuye-courtyard-residence', $1, 'Demonstration service charge mismatch report', 'open', $2, TRUE)
     ON CONFLICT (external_key) DO UPDATE SET status = 'open', resolution = NULL, assigned_to = EXCLUDED.assigned_to, is_demo = TRUE, updated_at = NOW()`,
    [users.renter, users.admin],
  );

  for (const [key, userId, kind, title, link] of [
    ["demo-notification-enquiry", users.agent, "new_enquiry", "New demonstration enquiry", "/workspace/agent"],
    ["demo-notification-inspection", users.renter, "inspection_confirmed", "Demonstration inspection confirmed", "/my-nestora"],
    ["demo-notification-reservation", users.hotel, "reservation_requested", "New demonstration reservation", "/workspace/host"],
    ["demo-notification-invite", users.agent, "team_invitation", "Demonstration agency invitation", "/workspace/agency"],
  ]) {
    await client.query(
      `INSERT INTO notifications (external_key, user_id, kind, title, body, deep_link, delivery_status, is_demo)
       VALUES ($1, $2, $3, $4, 'Captured by the isolated QA notification transport.', $5, 'captured', TRUE)
       ON CONFLICT (external_key) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, deep_link = EXCLUDED.deep_link, delivery_status = 'captured', is_demo = TRUE`,
      [key, userId, kind, title, link],
    );
  }

  for (const [externalKey, owner, org, listingId, developmentId, kind, qrTarget] of [
    ["demo-agent-profile-sheet", users.agent, organizations.agency, null, null, "agent_profile", "/profile/amina-bello"],
    ["demo-rental-flyer", users.agent, organizations.agency, "wuye-courtyard-residence", null, "rental_flyer", "/properties/wuye-courtyard-residence?source=qr"],
    ["demo-sale-brochure", users.agent, organizations.agency, "maitama-ridge-villa", null, "sale_brochure", "/properties/maitama-ridge-villa?source=qr"],
    ["demo-development-brochure", users.developer, organizations.developer, "katampe-court-residences", development, "development_brochure", "/properties/katampe-court-residences?source=qr"],
    ["demo-hotel-flyer", users.hotel, organizations.hotel, "jabi-lake-serviced-suite", null, "hotel_flyer", "/properties/jabi-lake-serviced-suite?source=qr"],
    ["demo-payment-plan", users.developer, organizations.developer, null, development, "payment_plan", "/properties/katampe-court-residences?source=payment-plan"],
    ["demo-qr-poster", users.agent, organizations.agency, "wuye-courtyard-residence", null, "qr_poster", "/properties/wuye-courtyard-residence?source=qr-poster"],
    ["demo-comparison-sheet", users.agent, organizations.agency, null, null, "comparison_sheet", "/search?mode=rent&source=comparison"],
  ]) {
    await client.query(
      `INSERT INTO marketing_materials (external_key, owner_user_id, organization_id, listing_id, development_id, kind, status, qr_target, is_demo)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, TRUE)
       ON CONFLICT (external_key) DO UPDATE SET owner_user_id = EXCLUDED.owner_user_id, organization_id = EXCLUDED.organization_id, listing_id = EXCLUDED.listing_id, development_id = EXCLUDED.development_id, kind = EXCLUDED.kind, status = 'draft', qr_target = EXCLUDED.qr_target, is_demo = TRUE`,
      [externalKey, owner, org, listingId, developmentId, kind, qrTarget],
    );
  }

  await client.query(
    `INSERT INTO member_marks (user_id, kind, target_id) VALUES
      ($1, 'saved_property', 'wuye-courtyard-residence'),
      ($1, 'saved_property', 'maitama-ridge-villa')
     ON CONFLICT DO NOTHING`,
    [users.renter],
  );

  await client.query(
    `INSERT INTO audit_events (actor_id, action, target_type, target_id, metadata)
     VALUES ($1, 'demo.seeded', 'demo_environment', 'nestora-commercial-qa', '{"fictional":true,"scope":"commercial-readiness"}'::jsonb)`,
    [users.admin],
  );

  await client.query("COMMIT");
  console.log(`Seeded ${demoAccounts.length} clearly fictional Nestora QA accounts.`);
  console.log("The password came from NESTORA_DEMO_PASSWORD and was not written to source control.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => null);
  console.error("Demo seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

async function upsertOne(sql, values) {
  const result = await client.query(sql, values);
  return result.rows[0].id;
}

async function membership(organizationId, userId, role) {
  await client.query(
    `INSERT INTO organization_members (organization_id, user_id, role, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active'`,
    [organizationId, userId, role],
  );
}

async function profile(userId, organizationId, headline, biography, serviceAreas) {
  await client.query(
    `INSERT INTO professional_profiles (user_id, organization_id, headline, biography, service_areas, verification_status, is_demo)
     VALUES ($1, $2, $3, $4, $5, 'pending', TRUE)
     ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id, headline = EXCLUDED.headline, biography = EXCLUDED.biography, service_areas = EXCLUDED.service_areas, verification_status = 'pending', is_demo = TRUE, updated_at = NOW()`,
    [userId, organizationId, headline, biography, serviceAreas],
  );
}

async function listing(id, ownerUserId, organizationId, title, category, location, priceAmount, status) {
  await client.query(
    `INSERT INTO listings (id, owner_user_id, organization_id, title, category, location, price_amount, status, verification_status, is_demo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'illustrative', TRUE)
     ON CONFLICT (id) DO UPDATE SET owner_user_id = EXCLUDED.owner_user_id, organization_id = EXCLUDED.organization_id, title = EXCLUDED.title, category = EXCLUDED.category, location = EXCLUDED.location, price_amount = EXCLUDED.price_amount, status = EXCLUDED.status, verification_status = 'illustrative', is_demo = TRUE, updated_at = NOW()`,
    [id, ownerUserId, organizationId, title, category, location, priceAmount, status],
  );
}

async function upsertLead(externalKey, customerId, ownerUserId, organizationId, listingId, source, stage, nextAction) {
  return upsertOne(
    `INSERT INTO leads (external_key, customer_id, owner_user_id, organization_id, listing_id, source, stage, next_action, is_demo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
     ON CONFLICT (external_key) DO UPDATE SET owner_user_id = EXCLUDED.owner_user_id, organization_id = EXCLUDED.organization_id, listing_id = EXCLUDED.listing_id, source = EXCLUDED.source, stage = EXCLUDED.stage, next_action = EXCLUDED.next_action, is_demo = TRUE, updated_at = NOW()
     RETURNING id`,
    [externalKey, customerId, ownerUserId, organizationId, listingId, source, stage, nextAction],
  );
}

async function seedConversation(externalKey, subjectType, subjectId, organizationId, participantIds, messageRows) {
  const conversationId = await upsertOne(
    `INSERT INTO conversations (external_key, subject_type, subject_id, organization_id, is_demo)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (external_key) DO UPDATE SET subject_type = EXCLUDED.subject_type, subject_id = EXCLUDED.subject_id, organization_id = EXCLUDED.organization_id, is_demo = TRUE, updated_at = NOW()
     RETURNING id`,
    [externalKey, subjectType, subjectId, organizationId],
  );
  for (const participantId of participantIds) {
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [conversationId, participantId],
    );
  }
  for (const [index, row] of messageRows.entries()) {
    await client.query(
      `INSERT INTO messages (external_key, conversation_id, sender_id, body, created_at)
       VALUES ($1, $2, $3, $4, NOW() + ($5 * INTERVAL '1 minute'))
       ON CONFLICT (external_key) DO UPDATE SET sender_id = EXCLUDED.sender_id, body = EXCLUDED.body`,
      [`${externalKey}-message-${index + 1}`, conversationId, row[0], row[1], index],
    );
  }
}
