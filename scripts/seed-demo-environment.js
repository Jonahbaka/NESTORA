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

  await profile(users.agent, organizations.agency, "amina-demo-agent", "Independent Abuja property advisor", "Fictional QA profile for rental and buyer demonstrations.", ["Wuye", "Maitama", "Guzape"], ["English", "Hausa"], ["Residential rentals", "Buyer representation"]);
  await profile(users.developer, organizations.developer, "chinedu-demo-developer", "Developer sales administrator", "Fictional QA profile for development inventory and buyer enquiries.", ["Katampe"], ["English", "Igbo"], ["New developments", "Payment plans"]);
  await profile(users.hotel, organizations.hotel, "zainab-demo-host", "Hotel operations administrator", "Fictional QA profile for room inventory and guest reservations.", ["Jabi"], ["English", "Hausa"], ["Serviced stays", "Guest operations"]);
  await profile(users.agency, organizations.agency, "kemi-demo-agency", "Agency administrator", "Fictional QA profile for team, lead assignment, and performance workflows.", ["Abuja"], ["English"], ["Agency operations", "Lead routing"]);

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
    `INSERT INTO hotel_room_types (organization_id, listing_id, code, name, capacity, nightly_rate)
     VALUES ($1, 'jabi-lake-serviced-suite', 'LAKE-SUITE', 'Lake Suite', 2, 185000)
     ON CONFLICT (organization_id, code) DO UPDATE SET listing_id = EXCLUDED.listing_id, nightly_rate = EXCLUDED.nightly_rate RETURNING id`,
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
    ["demo-agent-pilot", users.agent, null, "pro"],
    ["demo-agency-plan", null, organizations.agency, "agency"],
    ["demo-developer-plan", null, organizations.developer, "developer-studio"],
    ["demo-hotel-plan", null, organizations.hotel, "host-centre"],
  ]) {
    await client.query(
      `INSERT INTO subscriptions (external_key, user_id, organization_id, plan_id, status, starts_at, ends_at, assigned_by, is_demo)
       VALUES ($1, $2, $3, $4, 'active', NOW(), NOW() + INTERVAL '90 days', $5, TRUE)
       ON CONFLICT (external_key) DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active', starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, assigned_by = EXCLUDED.assigned_by, is_demo = TRUE`,
      [subscription[0], subscription[1], subscription[2], subscription[3], users.admin],
    );
  }

  const brandKits = {};
  for (const kit of [
    { key: "agent", externalKey: "demo-brand-amina-bello", owner: users.agent, org: organizations.agency, name: "Amina Bello Property Advisory", colors: { primary: "#123B33", secondary: "#F2C572", accent: "#E76F51" }, fonts: { heading: "Georgia", body: "Inter" }, footer: "Amina Bello · Abuja Property Advisor · +234 800 555 0101", website: "https://amina-bello.example", social: { instagram: "@aminabelloproperty", linkedin: "amina-bello-advisory", whatsapp: "+2348005550101" }, disclaimer: "Fictional demonstration. Verify price, title and availability before commitment.", qr: "rounded-coral", logos: [{ role: "primary", url: "/images/brands/amina-bello.svg" }, { role: "alternate", url: "/images/brands/amina-bello-mark.svg" }] },
    { key: "agency", externalKey: "demo-brand-northstar-realty", owner: users.agency, org: organizations.agency, name: "Northstar Realty Abuja", colors: { primary: "#102A43", secondary: "#D9EAF3", accent: "#D4A72C" }, fonts: { heading: "Times New Roman", body: "Inter" }, footer: "Northstar Realty Abuja · Wuse II · +234 800 555 0142", website: "https://northstar-realty.example", social: { instagram: "@northstarrealtyabuja", linkedin: "northstar-realty-abuja", whatsapp: "+2348005550142" }, disclaimer: "Illustrative agency marketing. Terms are subject to documented confirmation.", qr: "navy-gold", logos: [{ role: "primary", url: "/images/brands/northstar.svg" }, { role: "alternate", url: "/images/brands/northstar-mark.svg" }] },
    { key: "developer", externalKey: "demo-brand-katampe-court", owner: users.developer, org: organizations.developer, name: "Katampe Court Developments", colors: { primary: "#20231F", secondary: "#E8E0D2", accent: "#B78A52" }, fonts: { heading: "Georgia", body: "Helvetica" }, footer: "Katampe Court Developments · Katampe, Abuja · +234 800 555 0188", website: "https://katampe-court.example", social: { instagram: "@katampecourt", linkedin: "katampe-court-developments", whatsapp: "+2348005550188" }, disclaimer: "Renderings and delivery dates are illustrative and subject to signed contract.", qr: "architectural-bronze", logos: [{ role: "primary", url: "/images/brands/katampe-court.svg" }, { role: "alternate", url: "/images/brands/katampe-court-mark.svg" }] },
    { key: "hospitality", externalKey: "demo-brand-jabi-house", owner: users.hotel, org: organizations.hotel, name: "Jabi House Collection", colors: { primary: "#4A3028", secondary: "#F6E8D5", accent: "#D97B59" }, fonts: { heading: "Georgia", body: "Inter" }, footer: "Jabi House Collection · Jabi Lake, Abuja · +234 800 555 0199", website: "https://jabi-house.example", social: { instagram: "@jabihousecollection", linkedin: "jabi-house-collection", whatsapp: "+2348005550199" }, disclaimer: "Fictional hospitality offer. Rates and availability require booking confirmation.", qr: "warm-terracotta", logos: [{ role: "primary", url: "/images/brands/jabi-house.svg" }, { role: "alternate", url: "/images/brands/jabi-house-mark.svg" }] },
  ]) brandKits[kit.key] = await upsertBrandKit(kit);

  const templateSpecs = [
    ["premium-property-flyer", "Premium property flyer", "sale_brochure", 595, 842, "#173B31", "#E98D7E", "/images/nestora/katampe-residences.webp", "PROPERTY MARKETING"],
    ["open-house-poster", "Open-house poster", "open_house_poster", 595, 842, "#412D3A", "#F2C572", "/images/nestora/maitama-villa.webp", "OPEN HOUSE"],
    ["luxury-listing-brochure", "Luxury listing brochure", "sale_brochure", 800, 500, "#1B1D1C", "#C6A15B", "/images/nestora/maitama-villa.webp", "PRIVATE COLLECTION"],
    ["rental-availability", "Rental availability sheet", "rental_flyer", 595, 842, "#16324F", "#60A5A8", "/images/nestora/wuye-apartment.webp", "NOW AVAILABLE"],
    ["property-comparison", "Property comparison sheet", "comparison_sheet", 800, 500, "#233D4D", "#FE7F2D", "/images/nestora/guzape-duplex.webp", "COMPARE SHORTLIST"],
    ["agent-profile-card", "Agent profile card", "agent_profile_sheet", 500, 500, "#123B33", "#E76F51", "/images/nestora/amina-bello-agent.webp", "TRUSTED ADVISOR"],
    ["agent-introduction", "Agent introduction flyer", "agent_profile_sheet", 400, 600, "#253237", "#F0A868", "/images/nestora/amina-bello-agent.webp", "MEET YOUR ADVISOR"],
    ["sold-announcement", "Sold-property announcement", "social_square", 500, 500, "#5B2333", "#F7C59F", "/images/nestora/asokoro-rooftop.webp", "SOLD"],
    ["testimonial-card", "Client testimonial card", "social_square", 500, 500, "#102A43", "#D4A72C", "/images/nestora/hero-abuja-residence.webp", "CLIENT STORY"],
    ["contact-qr-poster", "Contact and QR poster", "qr_poster", 400, 600, "#173B31", "#E98D7E", "/images/nestora/amina-bello-agent.webp", "LET'S FIND HOME"],
    ["agency-brochure", "Agency brochure", "agency_brochure", 595, 842, "#102A43", "#D4A72C", "/images/nestora/hero-abuja-residence.webp", "ABUJA PROPERTY EXPERTS"],
    ["team-showcase", "Team showcase", "agency_brochure", 800, 500, "#263238", "#80CBC4", "/images/nestora/amina-bello-agent.webp", "PEOPLE BEHIND THE MOVE"],
    ["multi-listing-catalogue", "Multi-listing catalogue", "agency_brochure", 800, 500, "#2F3E46", "#CAD2C5", "/images/nestora/guzape-duplex.webp", "CURATED LISTINGS"],
    ["market-update", "Monthly market update", "social_portrait", 400, 600, "#1D3557", "#E63946", "/images/nestora/maitama-villa.webp", "ABUJA MARKET PULSE"],
    ["neighbourhood-guide", "Neighbourhood guide", "agency_brochure", 595, 842, "#4F5D2F", "#DDE5B6", "/images/nestora/jabi-community.webp", "LIVE JABI"],
    ["development-brochure", "Development brochure", "development_brochure", 595, 842, "#20231F", "#B78A52", "/images/nestora/katampe-residences.webp", "KATAMPE COURT"],
    ["unit-availability", "Unit availability sheet", "payment_plan_sheet", 800, 500, "#232323", "#D6B47A", "/images/nestora/katampe-residences.webp", "LIVE INVENTORY"],
    ["payment-plan", "Payment-plan sheet", "payment_plan_sheet", 595, 842, "#20231F", "#B78A52", "/images/nestora/katampe-residences.webp", "OWN IN MILESTONES"],
    ["construction-update", "Construction update", "construction_update", 500, 500, "#37474F", "#FFB300", "/images/nestora/katampe-residences.webp", "78% COMPLETE"],
    ["investor-summary", "Investor summary", "development_brochure", 800, 500, "#111827", "#C99B43", "/images/nestora/asokoro-rooftop.webp", "INVESTMENT BRIEF"],
    ["hotel-flyer", "Hotel flyer", "hotel_flyer", 595, 842, "#4A3028", "#D97B59", "/images/nestora/jabi-serviced-suite.webp", "STAY BY THE LAKE"],
    ["room-promotion", "Room promotion", "room_promotion", 500, 500, "#3D405B", "#F2CC8F", "/images/nestora/jabi-serviced-suite.webp", "LAKE SUITE"],
    ["weekend-package", "Weekend package", "weekend_offer", 400, 600, "#4A3028", "#E07A5F", "/images/nestora/abuja-weekend-retreat.webp", "WEEKEND, SLOWER"],
    ["amenities-card", "Amenities card", "social_square", 500, 500, "#335C67", "#FFF3B0", "/images/nestora/jabi-serviced-suite.webp", "EVERY COMFORT"],
    ["short-stay-promotion", "Short-stay promotion", "short_stay_flyer", 400, 600, "#50372F", "#F2B880", "/images/nestora/abuja-weekend-retreat.webp", "STAY A LITTLE LONGER"],
    ["social-square", "Listing social square", "social_square", 500, 500, "#173B31", "#E98D7E", "/images/nestora/guzape-duplex.webp", "NEW TO MARKET"],
    ["social-portrait", "Listing social portrait", "social_portrait", 400, 600, "#102A43", "#D4A72C", "/images/nestora/maitama-villa.webp", "AN ADDRESS OF NOTE"],
    ["social-story", "Listing story", "social_story", 360, 640, "#173B31", "#E98D7E", "/images/nestora/maitama-villa.webp", "DISCOVER MAITAMA"],
    ["whatsapp-status", "WhatsApp listing status", "whatsapp_status", 360, 640, "#153E35", "#70C1A3", "/images/nestora/wuye-apartment.webp", "AVAILABLE THIS WEEK"],
    ["carousel-cover", "Listing carousel cover", "social_square", 500, 500, "#232323", "#E4BA69", "/images/nestora/asokoro-rooftop.webp", "5 REASONS TO LOOK CLOSER"],
  ];
  for (const spec of templateSpecs) await upsertDesign({ externalKey: `demo-template-${spec[0]}`, owner: users.admin, org: null, brandKitId: null, name: spec[1], kind: spec[2], width: spec[3], height: spec[4], elements: demoDesignElements(spec[3], spec[4], spec[5], spec[6], spec[7], spec[8]), bindings: { listingTitle: "listing.title", price: "listing.price", address: "listing.location", qrTarget: "listing.url" }, isTemplate: true, approved: true, status: "completed" });

  await upsertDesign({ externalKey: "demo-design-agent-katampe", owner: users.agent, org: organizations.agency, brandKitId: brandKits.agent, name: "Katampe Court Residences — Premium Listing Flyer", kind: "sale_brochure", width: 595, height: 842, elements: demoDesignElements(595, 842, "#123B33", "#E76F51", "/images/nestora/katampe-residences.webp", "₦245,000,000 · KATAMPE"), bindings: { listingId: "katampe-court-residences", agent: "Amina Bello", qrTarget: "/properties/katampe-court-residences" }, status: "draft" });
  await upsertDesign({ externalKey: "demo-design-developer-payment", owner: users.developer, org: organizations.developer, brandKitId: brandKits.developer, name: "Katampe Court Residences — Payment Plan", kind: "payment_plan_sheet", width: 595, height: 842, elements: demoDesignElements(595, 842, "#20231F", "#B78A52", "/images/nestora/katampe-residences.webp", "30% DEPOSIT · 50% BUILD · 20% HANDOVER"), bindings: { developmentId: String(development), unitType: "Three-bedroom residence", completion: "June 2027" }, status: "draft" });
  await upsertDesign({ externalKey: "demo-design-hotel-weekend", owner: users.hotel, org: organizations.hotel, brandKitId: brandKits.hospitality, name: "Jabi House Collection — Weekend Offer", kind: "weekend_offer", width: 400, height: 600, elements: demoDesignElements(400, 600, "#4A3028", "#D97B59", "/images/nestora/abuja-weekend-retreat.webp", "₦185,000 / NIGHT · BREAKFAST INCLUDED"), bindings: { listingId: "jabi-lake-serviced-suite", qrTarget: "/properties/jabi-lake-serviced-suite" }, status: "draft" });

  for (const site of [
    { externalKey: "demo-site-amina-bello", owner: users.agent, org: organizations.agency, kind: "agent", template: "professional", brandKitId: brandKits.agent, name: "Amina Bello Property Advisory", slug: "amina-bello-advisory", sections: ["hero", "about", "featured", "testimonials", "contact", "social"], theme: { primaryColor: "#123B33", secondaryColor: "#F2C572", accentColor: "#E76F51", heroImage: "/images/nestora/maitama-villa.webp", portrait: "/images/nestora/amina-bello-agent.webp", tagline: "Abuja homes, advised with clarity." }, contact: { email: "amina@demo.nestora.local", phone: "+234 800 555 0101", whatsapp: "+2348005550101", address: "Wuse II, Abuja" } },
    { externalKey: "demo-site-northstar", owner: users.agency, org: organizations.agency, kind: "agency", template: "agency", brandKitId: brandKits.agency, name: "Northstar Realty Abuja", slug: "northstar-realty-abuja", sections: ["hero", "about", "team", "featured", "areas_served", "contact", "social"], theme: { primaryColor: "#102A43", secondaryColor: "#D9EAF3", accentColor: "#D4A72C", heroImage: "/images/nestora/hero-abuja-residence.webp", tagline: "Local intelligence. Exceptional moves." }, contact: { email: "hello@northstar.demo", phone: "+234 800 555 0142", whatsapp: "+2348005550142", address: "Wuse II, Abuja" } },
    { externalKey: "demo-site-katampe-court", owner: users.developer, org: organizations.developer, kind: "developer", template: "developer", brandKitId: brandKits.developer, name: "Katampe Court Residences", slug: "katampe-court-residences", sections: ["hero", "developments", "available_units", "gallery", "construction_updates", "contact", "social"], theme: { primaryColor: "#20231F", secondaryColor: "#E8E0D2", accentColor: "#B78A52", heroImage: "/images/nestora/katampe-residences.webp", tagline: "Considered residences above the city." }, contact: { email: "sales@katampecourt.demo", phone: "+234 800 555 0188", whatsapp: "+2348005550188", address: "Katampe, Abuja" } },
    { externalKey: "demo-site-jabi-house", owner: users.hotel, org: organizations.hotel, kind: "hospitality", template: "hospitality", brandKitId: brandKits.hospitality, name: "Jabi House Collection", slug: "jabi-house-collection", sections: ["hero", "rooms_stays", "amenities", "gallery", "testimonials", "contact", "social"], theme: { primaryColor: "#4A3028", secondaryColor: "#F6E8D5", accentColor: "#D97B59", heroImage: "/images/nestora/jabi-serviced-suite.webp", tagline: "Warm stays beside Jabi Lake." }, contact: { email: "stay@jabihouse.demo", phone: "+234 800 555 0199", whatsapp: "+2348005550199", address: "Jabi Lake, Abuja" } },
  ]) await upsertWebsite(site);

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

async function profile(userId, organizationId, slug, headline, biography, serviceAreas, languages, specialisations) {
  await client.query(
    `INSERT INTO professional_profiles (user_id, organization_id, slug, headline, biography, service_areas, languages, specialisations, verification_status, is_public, is_demo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', TRUE, TRUE)
     ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id, slug = EXCLUDED.slug, headline = EXCLUDED.headline, biography = EXCLUDED.biography, service_areas = EXCLUDED.service_areas, languages = EXCLUDED.languages, specialisations = EXCLUDED.specialisations, verification_status = 'pending', is_public = TRUE, is_demo = TRUE, updated_at = NOW()`,
    [userId, organizationId, slug, headline, biography, serviceAreas, languages, specialisations],
  );
}

async function upsertBrandKit(kit) {
  return upsertOne(
    `INSERT INTO brand_kits (external_key, owner_user_id, organization_id, name, is_organization_kit, brand_colors, fonts, contact_footer, website_url, social_handles, disclaimer, default_qr_style, approved_images)
     VALUES ($1, $2, $3, $4, TRUE, $5::jsonb, $6::jsonb, $7, $8, $9::jsonb, $10, $11, $12::jsonb)
     ON CONFLICT (external_key) DO UPDATE SET owner_user_id = EXCLUDED.owner_user_id, organization_id = EXCLUDED.organization_id, name = EXCLUDED.name, brand_colors = EXCLUDED.brand_colors, fonts = EXCLUDED.fonts, contact_footer = EXCLUDED.contact_footer, website_url = EXCLUDED.website_url, social_handles = EXCLUDED.social_handles, disclaimer = EXCLUDED.disclaimer, default_qr_style = EXCLUDED.default_qr_style, approved_images = EXCLUDED.approved_images, updated_at = NOW()
     RETURNING id`,
    [kit.externalKey, kit.owner, kit.org, kit.name, JSON.stringify(kit.colors), JSON.stringify(kit.fonts), kit.footer, kit.website, JSON.stringify(kit.social), kit.disclaimer, kit.qr, JSON.stringify(kit.logos || [])],
  );
}

async function upsertDesign(design) {
  return upsertOne(
    `INSERT INTO marketing_designs (external_key, owner_user_id, organization_id, brand_kit_id, name, kind, is_template, is_approved_template, canvas_width, canvas_height, elements, dynamic_bindings, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13)
     ON CONFLICT (external_key) DO UPDATE SET owner_user_id = EXCLUDED.owner_user_id, organization_id = EXCLUDED.organization_id, brand_kit_id = EXCLUDED.brand_kit_id, name = EXCLUDED.name, kind = EXCLUDED.kind, is_template = EXCLUDED.is_template, is_approved_template = EXCLUDED.is_approved_template, canvas_width = EXCLUDED.canvas_width, canvas_height = EXCLUDED.canvas_height, elements = EXCLUDED.elements, dynamic_bindings = EXCLUDED.dynamic_bindings, status = EXCLUDED.status, updated_at = NOW()
     RETURNING id`,
    [design.externalKey, design.owner, design.org, design.brandKitId, design.name, design.kind, Boolean(design.isTemplate), Boolean(design.approved), design.width, design.height, JSON.stringify(design.elements), JSON.stringify(design.bindings || {}), design.status || "draft"],
  );
}

async function upsertWebsite(site) {
  return upsertOne(
    `INSERT INTO partner_websites (external_key, owner_user_id, organization_id, kind, template_id, brand_kit_id, name, slug, subdomain, status, sections, theme, contact, seo, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, 'published', $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, NOW())
     ON CONFLICT (external_key) DO UPDATE SET owner_user_id = EXCLUDED.owner_user_id, organization_id = EXCLUDED.organization_id, kind = EXCLUDED.kind, template_id = EXCLUDED.template_id, brand_kit_id = EXCLUDED.brand_kit_id, name = EXCLUDED.name, slug = EXCLUDED.slug, subdomain = EXCLUDED.subdomain, status = 'published', sections = EXCLUDED.sections, theme = EXCLUDED.theme, contact = EXCLUDED.contact, seo = EXCLUDED.seo, published_at = COALESCE(partner_websites.published_at, NOW()), updated_at = NOW()
     RETURNING id`,
    [site.externalKey, site.owner, site.org, site.kind, site.template, site.brandKitId, site.name, site.slug, JSON.stringify(site.sections), JSON.stringify(site.theme), JSON.stringify(site.contact), JSON.stringify({ title: site.name, description: site.theme.tagline })],
  );
}

function demoDesignElements(width, height, primary, accent, image, eyebrow) {
  const imageHeight = Math.round(height * 0.52);
  return [
    { id: "background", type: "shape", x: 0, y: 0, width, height, rotation: 0, locked: true, zIndex: 0, content: "", style: { fillColor: "#FFFDF8", shapeType: "rectangle" }, mediaId: null, listingId: null, payload: {} },
    { id: "hero", type: "image", x: 0, y: 0, width, height: imageHeight, rotation: 0, locked: false, zIndex: 1, content: image, style: { objectFit: "cover" }, mediaId: null, listingId: null, payload: { src: image } },
    { id: "accent", type: "shape", x: 0, y: imageHeight - 12, width, height: 18, rotation: 0, locked: true, zIndex: 2, content: "", style: { fillColor: accent, shapeType: "rectangle" }, mediaId: null, listingId: null, payload: {} },
    { id: "eyebrow", type: "text", x: 34, y: imageHeight + 34, width: width - 68, height: 32, rotation: 0, locked: false, zIndex: 3, content: eyebrow, style: { fontFamily: "Inter", fontSize: Math.max(13, Math.round(width / 38)), fontWeight: "bold", color: accent, letterSpacing: 1.4 }, mediaId: null, listingId: null, payload: {} },
    { id: "title", type: "text", x: 34, y: imageHeight + 74, width: width - 68, height: Math.round(height * 0.14), rotation: 0, locked: false, zIndex: 3, content: "Katampe Court Residences", style: { fontFamily: "Georgia", fontSize: Math.max(26, Math.round(width / 14)), fontWeight: "bold", color: primary, lineHeight: 1.05 }, mediaId: null, listingId: null, payload: { binding: "listing.title" } },
    { id: "details", type: "text", x: 34, y: height - 128, width: width - 180, height: 74, rotation: 0, locked: false, zIndex: 3, content: "3 bedrooms  ·  4 bathrooms  ·  242 sqm\nPrivate terraces · Smart energy · Concierge", style: { fontFamily: "Inter", fontSize: Math.max(12, Math.round(width / 42)), color: "#4B5652", lineHeight: 1.5 }, mediaId: null, listingId: null, payload: { binding: "listing.features" } },
    { id: "qr", type: "qr_code", x: width - 118, y: height - 128, width: 84, height: 84, rotation: 0, locked: false, zIndex: 4, content: "/properties/katampe-court-residences", style: { foreground: primary, background: "#FFFFFF" }, mediaId: null, listingId: null, payload: { destination: "/properties/katampe-court-residences" } },
  ];
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
