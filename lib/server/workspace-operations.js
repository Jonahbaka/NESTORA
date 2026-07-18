import crypto from "node:crypto";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import sharp from "sharp";
import { AccessError } from "@/lib/server/authorization";
import { recordAuditEvent } from "@/lib/server/audit";
import { getPool, query } from "@/lib/server/db";
import { isLocalRuntime } from "@/lib/server/demo-environment";
import { requireFeature, requireListingCapacity, requireTeamCapacity } from "@/lib/server/entitlements";
import { readProfessionalProfile, updateProfessionalProfile } from "@/lib/server/profile-operations";
import { requireOrganization, tenantScope } from "@/lib/server/workspace-context";
import { getPrivateObject, putPrivateObject } from "@/lib/server/object-storage";

const professionalResources = new Set(["overview", "profile", "listings", "leads", "inspections", "entitlements", "marketing"]);

export async function readWorkspaceResource(resource, context) {
  if (professionalResources.has(resource) && context.workspace === "member") throw new AccessError("FORBIDDEN", "A professional account is required.");
  if (resource === "overview") return readOverview(context);
  if (resource === "profile") return readProfessionalProfile(context);
  if (resource === "listings") return readListings(context);
  if (resource === "leads") return readLeads(context);
  if (resource === "inspections") return readInspections(context);
  if (resource === "hotel") return readHotel(context);
  if (resource === "developer") return readDeveloper(context);
  if (resource === "team") return readTeam(context);
  if (resource === "admin") return readAdministration(context);
  if (resource === "entitlements") return readEntitlements(context);
  if (resource === "marketing") return readMarketing(context);
  throw new AccessError("NOT_FOUND", "Workspace resource not found.");
}

export async function writeWorkspaceResource(resource, input, context) {
  if (resource === "profile") return updateProfessionalProfile(input, context);
  if (resource === "listings") return writeListing(input, context);
  if (resource === "leads") return writeLead(input, context);
  if (resource === "inspections") return writeInspection(input, context);
  if (resource === "hotel") return writeHotel(input, context);
  if (resource === "developer") return writeDeveloper(input, context);
  if (resource === "team") return writeTeam(input, context);
  if (resource === "admin") return writeAdministration(input, context);
  if (resource === "marketing") return writeMarketing(input, context);
  throw new AccessError("NOT_FOUND", "Workspace resource not found.");
}

function scoped(context, options = {}) {
  if (context.user.role === "agent" && !context.isAdmin) {
    const alias = options.alias ? `${options.alias}.` : "";
    const start = options.start || 1;
    return { clause: `${alias}${options.owner || "owner_user_id"} = $${start}`, values: [context.user.id], next: start + 1 };
  }
  return tenantScope(context, options);
}

async function readOverview(context) {
  if (context.canModerate) {
    const [users, listings, reports, monitoring] = await Promise.all([
      query("SELECT COUNT(*)::int AS count FROM users WHERE status = 'active'"),
      query("SELECT COUNT(*)::int AS count FROM listings WHERE status = 'active'"),
      query("SELECT COUNT(*)::int AS count FROM listing_reports WHERE status IN ('open', 'investigating')"),
      query("SELECT COUNT(*)::int AS count FROM monitoring_events WHERE resolved_at IS NULL AND level IN ('error', 'critical')"),
    ]);
    return { metrics: { activeUsers: users.rows[0].count, activeListings: listings.rows[0].count, openReports: reports.rows[0].count, openIncidents: monitoring.rows[0].count } };
  }

  if (context.user.role === "host") {
    const organization = requireOrganization(context);
    const [rooms, reservations, revenue, messages] = await Promise.all([
      query("SELECT COUNT(*)::int AS count FROM hotel_rooms WHERE organization_id = $1 AND status = 'available'", [organization.id]),
      query("SELECT COUNT(*)::int AS count FROM reservations WHERE organization_id = $1 AND status IN ('requested', 'confirmed')", [organization.id]),
      query("SELECT COALESCE(SUM(total_amount), 0)::bigint AS total FROM reservations WHERE organization_id = $1 AND status IN ('confirmed', 'completed')", [organization.id]),
      unreadConversationCount(context.user.id),
    ]);
    return { metrics: { availableRooms: rooms.rows[0].count, reservations: reservations.rows[0].count, revenue: Number(revenue.rows[0].total), unreadConversations: messages } };
  }

  const listingScope = scoped(context, { alias: "l" });
  const leadScope = scoped(context, { alias: "l" });
  const inspectionClause = context.user.role === "agent" ? "i.professional_id = $1" : leadScope.clause;
  const inspectionValues = context.user.role === "agent" ? [context.user.id] : leadScope.values;
  const [listings, leads, inspections, messages] = await Promise.all([
    query(`SELECT COUNT(*)::int AS count FROM listings l WHERE ${listingScope.clause} AND l.status IN ('active', 'stale', 'expired')`, listingScope.values),
    query(`SELECT COUNT(*)::int AS count FROM leads l WHERE ${leadScope.clause} AND l.stage NOT IN ('won', 'lost')`, leadScope.values),
    query(`SELECT COUNT(*)::int AS count FROM inspections i JOIN leads l ON l.id = i.lead_id WHERE ${inspectionClause} AND i.status IN ('proposed', 'confirmed')`, inspectionValues),
    unreadConversationCount(context.user.id),
  ]);
  return { metrics: { activeListings: listings.rows[0].count, openLeads: leads.rows[0].count, inspections: inspections.rows[0].count, unreadConversations: messages } };
}

async function readListings(context) {
  const scope = scoped(context, { alias: "l" });
  const result = await query(
    `SELECT l.id, l.title, l.category, l.location, l.price_amount, l.currency, l.status, l.verification_status,
            l.description, l.bedrooms, l.bathrooms, l.address_line1, l.address_line2, l.city, l.state_region,
            l.postal_code, l.property_type, l.area_sqm, l.features, l.fees, l.availability_status, l.available_from,
            l.tour_enabled, l.submitted_at, l.review_note, l.updated_at,
            COUNT(lm.id)::int AS media_count,
            COUNT(lm.id) FILTER (WHERE lm.kind = 'video')::int AS video_count,
            COUNT(lm.id) FILTER (WHERE lm.media_role = 'panorama')::int AS panorama_count,
            COUNT(lm.id) FILTER (WHERE lm.media_role = 'floor_plan')::int AS floor_plan_count,
            MAX(lm.id::text) FILTER (WHERE lm.is_cover = TRUE) AS cover_media_id
     FROM listings l
     LEFT JOIN listing_media lm ON lm.listing_id = l.id AND lm.status = 'ready'
     WHERE ${scope.clause}
     GROUP BY l.id
     ORDER BY l.updated_at DESC
     LIMIT 200`,
    scope.values,
  );
  return { listings: result.rows.map((row) => ({ ...row, price_amount: Number(row.price_amount), bathrooms: row.bathrooms == null ? null : Number(row.bathrooms), area_sqm: row.area_sqm == null ? null : Number(row.area_sqm) })) };
}

async function readLeads(context) {
  if (!["agent", "agency_admin", "developer", "admin"].includes(context.user.role)) throw new AccessError("FORBIDDEN", "Lead access is not available for this account.");
  const scope = scoped(context, { alias: "l" });
  const result = await query(
    `SELECT l.id, l.external_key, l.listing_id, l.source, l.stage, l.priority, l.next_action, l.enquiry_text, l.created_at, l.updated_at,
            l.owner_user_id, customer.name AS customer_name, customer.email AS customer_email, owner.name AS owner_name,
            p.title AS listing_title, p.location AS listing_location
     FROM leads l
     JOIN users customer ON customer.id = l.customer_id
     LEFT JOIN users owner ON owner.id = l.owner_user_id
     LEFT JOIN listings p ON p.id = l.listing_id
     WHERE ${scope.clause}
     ORDER BY CASE l.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, l.updated_at DESC
     LIMIT 250`,
    scope.values,
  );
  let teamMembers = [];
  if (context.user.role === "agency_admin") {
    const organization = requireOrganization(context);
    const members = await query(
      `SELECT om.user_id, om.role, u.name
       FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.status = 'active'
       ORDER BY u.name`,
      [organization.id],
    );
    teamMembers = members.rows;
  }
  return { leads: result.rows, teamMembers };
}

async function readInspections(context) {
  if (!["agent", "agency_admin", "developer", "admin"].includes(context.user.role)) throw new AccessError("FORBIDDEN", "Inspection access is not available for this account.");
  const scope = scoped(context, { alias: "l" });
  const clause = context.user.role === "agent" ? "i.professional_id = $1" : scope.clause;
  const values = context.user.role === "agent" ? [context.user.id] : scope.values;
  const result = await query(
    `SELECT i.id, i.status, i.scheduled_at, i.notes, i.accuracy_score, i.feedback, i.updated_at,
            customer.name AS customer_name, professional.name AS professional_name, p.title AS listing_title, p.location
     FROM inspections i
     JOIN leads l ON l.id = i.lead_id
     JOIN users customer ON customer.id = i.customer_id
     JOIN users professional ON professional.id = i.professional_id
     JOIN listings p ON p.id = i.listing_id
     WHERE ${clause}
     ORDER BY i.scheduled_at ASC
     LIMIT 250`,
    values,
  );
  return { inspections: result.rows };
}

async function readHotel(context) {
  if (context.user.role !== "host" && !context.isAdmin) throw new AccessError("FORBIDDEN", "Hotel operations are not available for this account.");
  const organization = requireOrganization(context);
  const [stayListings, roomTypes, rooms, reservations] = await Promise.all([
    query("SELECT id, title, status, verification_status FROM listings WHERE organization_id = $1 AND category = 'stay' AND status <> 'archived' ORDER BY updated_at DESC", [organization.id]),
    query(`SELECT rt.id, rt.listing_id, rt.code, rt.name, rt.capacity, rt.nightly_rate, l.title AS listing_title
           FROM hotel_room_types rt JOIN listings l ON l.id = rt.listing_id
           WHERE rt.organization_id = $1 ORDER BY l.title, rt.name`, [organization.id]),
    query(`SELECT r.id, r.code, r.status, rt.name AS room_type, rt.capacity, rt.nightly_rate, rt.listing_id, l.title AS listing_title
           FROM hotel_rooms r JOIN hotel_room_types rt ON rt.id = r.room_type_id
           JOIN listings l ON l.id = rt.listing_id
           WHERE r.organization_id = $1 ORDER BY r.code`, [organization.id]),
    query(`SELECT r.id, r.external_key, r.check_in, r.check_out, r.guests, r.total_amount, r.status, r.payment_status, r.special_request,
                  u.name AS guest_name, u.email AS guest_email, hr.code AS room_code, rt.name AS room_type
           FROM reservations r JOIN users u ON u.id = r.guest_id JOIN hotel_rooms hr ON hr.id = r.room_id JOIN hotel_room_types rt ON rt.id = hr.room_type_id
           WHERE r.organization_id = $1 ORDER BY r.check_in ASC LIMIT 300`, [organization.id]),
  ]);
  return {
    stayListings: stayListings.rows,
    roomTypes: roomTypes.rows.map((row) => ({ ...row, nightly_rate: Number(row.nightly_rate) })),
    rooms: rooms.rows.map((row) => ({ ...row, nightly_rate: Number(row.nightly_rate) })),
    reservations: reservations.rows.map((row) => ({ ...row, total_amount: Number(row.total_amount) })),
  };
}

async function readDeveloper(context) {
  if (context.user.role !== "developer" && !context.isAdmin) throw new AccessError("FORBIDDEN", "Developer operations are not available for this account.");
  const organization = requireOrganization(context);
  const [developments, blocks, unitTypes, units] = await Promise.all([
    query("SELECT id, external_key, name, location, status, completion_date, construction_progress, payment_plan_summary, updated_at FROM developments WHERE organization_id = $1 ORDER BY updated_at DESC", [organization.id]),
    query(`SELECT b.id, b.development_id, b.code, b.name, b.floors, d.name AS development_name
           FROM development_blocks b JOIN developments d ON d.id = b.development_id WHERE d.organization_id = $1 ORDER BY d.name, b.code`, [organization.id]),
    query(`SELECT t.id, t.development_id, t.code, t.name, t.bedrooms, t.bathrooms, t.area_sqm, t.price_amount, d.name AS development_name
           FROM unit_types t JOIN developments d ON d.id = t.development_id WHERE d.organization_id = $1 ORDER BY d.name, t.name`, [organization.id]),
    query(`SELECT u.id, u.code, u.floor, u.status, u.price_amount, u.updated_at, d.name AS development_name, b.name AS block_name,
                  t.name AS unit_type, t.bedrooms, t.bathrooms, t.area_sqm
           FROM units u JOIN developments d ON d.id = u.development_id JOIN development_blocks b ON b.id = u.block_id JOIN unit_types t ON t.id = u.unit_type_id
           WHERE d.organization_id = $1 ORDER BY d.name, u.code`, [organization.id]),
  ]);
  return { developments: developments.rows, blocks: blocks.rows, unitTypes: unitTypes.rows.map((row) => ({ ...row, price_amount: Number(row.price_amount), bathrooms: Number(row.bathrooms), area_sqm: Number(row.area_sqm) })), units: units.rows.map((row) => ({ ...row, price_amount: Number(row.price_amount), bathrooms: Number(row.bathrooms), area_sqm: Number(row.area_sqm) })) };
}

async function readTeam(context) {
  if (context.user.role !== "agency_admin" && !context.isAdmin) throw new AccessError("FORBIDDEN", "Agency team operations are not available for this account.");
  const organization = requireOrganization(context);
  const [members, invitations, rules] = await Promise.all([
    query(`SELECT om.user_id, om.role, om.status, om.created_at, u.name, u.email,
                  COUNT(l.id) FILTER (WHERE l.stage NOT IN ('won', 'lost'))::int AS open_leads
           FROM organization_members om JOIN users u ON u.id = om.user_id LEFT JOIN leads l ON l.owner_user_id = om.user_id AND l.organization_id = om.organization_id
           WHERE om.organization_id = $1 GROUP BY om.user_id, om.role, om.status, om.created_at, u.name, u.email ORDER BY u.name`, [organization.id]),
    query("SELECT id, email, role, status, expires_at, created_at FROM team_invitations WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 100", [organization.id]),
    query(`SELECT r.id, r.name, r.source, r.listing_category, r.strategy, r.priority, r.active, u.name AS assignee_name
           FROM lead_routing_rules r LEFT JOIN users u ON u.id = r.assignee_user_id WHERE r.organization_id = $1 ORDER BY r.priority, r.created_at`, [organization.id]),
  ]);
  return { members: members.rows, invitations: invitations.rows, routingRules: rules.rows };
}

async function readAdministration(context) {
  if (!context.canModerate) throw new AccessError("FORBIDDEN", "Administrative access is required.");
  const [reports, verifications, conversationReports, pendingListings, users, organizations, subscriptions, audit, incidents] = await Promise.all([
    query(`SELECT r.id, r.external_key, r.reason, r.status, r.resolution, r.created_at, r.updated_at, l.title AS listing_title,
                  reporter.name AS reporter_name, assignee.name AS assignee_name
           FROM listing_reports r JOIN listings l ON l.id = r.listing_id JOIN users reporter ON reporter.id = r.reporter_id LEFT JOIN users assignee ON assignee.id = r.assigned_to
           ORDER BY CASE r.status WHEN 'open' THEN 1 WHEN 'investigating' THEN 2 ELSE 3 END, r.updated_at DESC LIMIT 250`),
    query(`SELECT v.id, v.external_key, v.kind, v.status, v.reviewer_note, v.created_at, v.updated_at,
                  u.name AS subject_name, o.name AS organization_name, reviewer.name AS reviewer_name
           FROM verification_cases v LEFT JOIN users u ON u.id = v.subject_user_id LEFT JOIN organizations o ON o.id = v.organization_id LEFT JOIN users reviewer ON reviewer.id = v.reviewer_id
           ORDER BY CASE v.status WHEN 'submitted' THEN 1 ELSE 2 END, v.updated_at DESC LIMIT 250`),
    query(`SELECT r.id, r.reason, r.status, r.resolution, r.created_at, r.updated_at, c.subject_type, c.subject_id,
                  reporter.name AS reporter_name, assignee.name AS assignee_name
           FROM conversation_reports r JOIN conversations c ON c.id = r.conversation_id JOIN users reporter ON reporter.id = r.reporter_id LEFT JOIN users assignee ON assignee.id = r.assigned_to
           ORDER BY CASE r.status WHEN 'open' THEN 1 WHEN 'investigating' THEN 2 ELSE 3 END, r.updated_at DESC LIMIT 250`),
    query(`SELECT l.id, l.title, l.location, l.status, l.verification_status, l.created_at, l.updated_at, u.name AS owner_name, u.email AS owner_email,
                  COUNT(lm.id) FILTER (WHERE lm.status = 'ready')::int AS media_count
           FROM listings l JOIN users u ON u.id = l.owner_user_id LEFT JOIN listing_media lm ON lm.listing_id = l.id
           WHERE l.verification_status = 'pending' OR l.status IN ('suspended', 'rejected')
           GROUP BY l.id, u.name, u.email ORDER BY CASE l.verification_status WHEN 'pending' THEN 1 ELSE 2 END, l.updated_at DESC LIMIT 250`),
    query("SELECT id, name, email, role, status, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT 300"),
    query("SELECT id, name, kind, status, created_at FROM organizations ORDER BY created_at DESC LIMIT 300"),
    query(`SELECT s.id, s.external_key, s.plan_id, s.status, s.starts_at, s.ends_at, s.user_id, s.organization_id,
                  u.name AS user_name, u.email AS user_email, o.name AS organization_name
           FROM subscriptions s LEFT JOIN users u ON u.id = s.user_id LEFT JOIN organizations o ON o.id = s.organization_id
           ORDER BY s.starts_at DESC LIMIT 300`),
    query(`SELECT a.id, a.action, a.target_type, a.target_id, a.metadata, a.created_at, u.name AS actor_name
           FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.created_at DESC LIMIT 200`),
    query("SELECT id, level, source, event_key, message, metadata, resolved_at, created_at FROM monitoring_events ORDER BY created_at DESC LIMIT 100"),
  ]);
  return { reports: reports.rows, conversationReports: conversationReports.rows, verifications: verifications.rows, pendingListings: pendingListings.rows, users: context.isAdmin ? users.rows : [], organizations: context.isAdmin ? organizations.rows : [], subscriptions: context.isAdmin ? subscriptions.rows : [], auditEvents: audit.rows, incidents: incidents.rows };
}

async function readEntitlements(context) {
  const organizationId = context.organization?.id || null;
  const result = await query(
    `SELECT s.id, s.plan_id, s.status, s.starts_at, s.ends_at, f.feature_key, f.enabled, f.limit_value
     FROM subscriptions s LEFT JOIN feature_entitlements f ON f.subscription_id = s.id
     WHERE (s.user_id = $1 OR ($2::uuid IS NOT NULL AND s.organization_id = $2)) AND s.status IN ('active', 'trial', 'grace')
     ORDER BY s.starts_at DESC`,
    [context.user.id, organizationId],
  );
  const subscription = result.rows[0] ? { id: result.rows[0].id, planId: result.rows[0].plan_id, status: result.rows[0].status, startsAt: result.rows[0].starts_at, endsAt: result.rows[0].ends_at } : null;
  return { subscription, entitlements: result.rows.filter((row) => row.feature_key).map((row) => ({ key: row.feature_key, enabled: row.enabled, limit: row.limit_value })) };
}

async function readMarketing(context) {
  const scope = scoped(context, { alias: "m" });
  const [result, listingData] = await Promise.all([query(
    `SELECT m.id, m.external_key, m.kind, m.status, m.storage_key, m.qr_target, m.created_at, l.title AS listing_title, d.name AS development_name,
            al.destination_path, (SELECT COUNT(*)::int FROM marketing_attribution_events ae WHERE ae.link_id = al.id) AS qr_opens
     FROM marketing_materials m LEFT JOIN listings l ON l.id = m.listing_id LEFT JOIN developments d ON d.id = m.development_id
     LEFT JOIN marketing_attribution_links al ON al.material_id = m.id
     WHERE ${scope.clause} ORDER BY m.created_at DESC LIMIT 200`,
    scope.values,
  ), readListings(context)]);
  return { materials: result.rows.map((item) => ({ ...item, previewPath: item.storage_key ? `/api/marketing/${item.id}` : null })), listings: listingData.listings.map(({ id, title }) => ({ id, title })) };
}

async function writeListing(input, context) {
  if (!["agent", "agency_admin", "developer", "host", "admin"].includes(context.user.role)) throw new AccessError("FORBIDDEN", "Listing management is not available for this account.");
  if (input.action === "create") {
    const id = `${slugify(input.title)}-${crypto.randomBytes(3).toString("hex")}`;
    const organizationId = context.organization?.id || null;
    const result = await query(
      `INSERT INTO listings
         (id, owner_user_id, organization_id, title, category, location, price_amount, status, description,
          bedrooms, bathrooms, verification_status, address_line1, address_line2, city, state_region, postal_code,
          property_type, area_sqm, features, fees, availability_status, available_from, tour_enabled, is_demo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10, 'illustrative', $11, $12, $13, $14, $15,
               $16, $17, $18, $19::jsonb, $20, $21, $22, $23)
       RETURNING id, title, category, location, price_amount, status, verification_status, description, bedrooms, bathrooms, updated_at`,
      [id, context.user.id, organizationId, input.title, input.category, listingLocation(input), input.priceAmount,
       input.description, input.bedrooms, input.bathrooms, input.addressLine1, input.addressLine2 || null, input.city,
       input.stateRegion, input.postalCode || null, input.propertyType, input.areaSqm, input.features,
       JSON.stringify(input.fees), input.availabilityStatus, input.availableFrom, input.tourEnabled, Boolean(context.user.is_demo)],
    );
    await recordAuditEvent({ actorId: context.user.id, action: "listing.created", targetType: "listing", targetId: id, metadata: { organizationId } });
    return { listing: result.rows[0] };
  }
  if (input.action === "update") {
    const scope = scoped(context, { alias: "listings" });
    const owned = await query(`SELECT id FROM listings WHERE id = $1 AND ${shiftPlaceholders(scope.clause, 1)} LIMIT 1`, [input.id, ...scope.values]);
    if (!owned.rowCount) throw new AccessError("NOT_FOUND", "Listing not found.");
    const values = [input.title, listingLocation(input), input.priceAmount, input.description, input.bedrooms, input.bathrooms,
      input.addressLine1, input.addressLine2 || null, input.city, input.stateRegion, input.postalCode || null, input.propertyType,
      input.areaSqm, input.features, JSON.stringify(input.fees), input.availabilityStatus, input.availableFrom, input.tourEnabled,
      input.id, ...scope.values];
    const result = await query(
      `UPDATE listings SET title = $1, location = $2, price_amount = $3, description = $4, bedrooms = $5, bathrooms = $6,
                           address_line1 = $7, address_line2 = $8, city = $9, state_region = $10, postal_code = $11,
                           property_type = $12, area_sqm = $13, features = $14, fees = $15::jsonb,
                           availability_status = $16, available_from = $17, tour_enabled = $18,
                           status = 'draft', verification_status = 'illustrative', submitted_at = NULL, review_note = NULL,
                           published_at = NULL, updated_at = NOW()
       WHERE id = $19 AND ${shiftPlaceholders(scope.clause, 19)}
       RETURNING id, title, category, location, price_amount, status, verification_status, description, bedrooms, bathrooms, updated_at`,
      values,
    );
    const listing = requireRow(result, "Listing not found.");
    await recordAuditEvent({ actorId: context.user.id, action: "listing.updated", targetType: "listing", targetId: input.id, metadata: { reviewReset: true } });
    return { listing };
  }
  if (input.action === "submit") {
    const scope = scoped(context, { alias: "listings" });
    await requireListingCapacity(context, { excludingId: input.id });
    const listingResult = await query(
      `SELECT listings.*, EXISTS (
         SELECT 1 FROM listing_media lm WHERE lm.listing_id = listings.id AND lm.kind = 'image' AND lm.status = 'ready'
       ) AS has_image
       FROM listings WHERE id = $1 AND ${shiftPlaceholders(scope.clause, 1)} LIMIT 1`,
      [input.id, ...scope.values],
    );
    const candidate = requireRow(listingResult, "Listing not found.");
    await assertListingReady(candidate);
    const result = await query(
      `UPDATE listings SET status = 'draft', verification_status = 'pending', submitted_at = NOW(), review_note = NULL, updated_at = NOW()
       WHERE id = $1 AND ${shiftPlaceholders(scope.clause, 1)}
       RETURNING id, title, status, verification_status, submitted_at, updated_at`,
      [input.id, ...scope.values],
    );
    const listing = requireRow(result, "Listing not found.");
    await recordAuditEvent({ actorId: context.user.id, action: "listing.submitted", targetType: "listing", targetId: input.id, metadata: { organizationId: context.organization?.id || null } });
    return { listing };
  }
  if (input.action === "archive") {
    const scope = scoped(context, { alias: "listings" });
    const result = await query(
      `UPDATE listings SET status = 'archived', published_at = NULL, updated_at = NOW()
       WHERE id = $1 AND ${shiftPlaceholders(scope.clause, 1)} RETURNING id, title, status, verification_status, updated_at`,
      [input.id, ...scope.values],
    );
    const listing = requireRow(result, "Listing not found.");
    await recordAuditEvent({ actorId: context.user.id, action: "listing.archived", targetType: "listing", targetId: input.id });
    return { listing };
  }
  throw new AccessError("NOT_FOUND", "Listing action not found.");
}

async function writeLead(input, context) {
  if (!["agent", "agency_admin", "developer", "admin"].includes(context.user.role)) throw new AccessError("FORBIDDEN", "Lead management is not available for this account.");
  const scope = scoped(context, { alias: "leads" });
  let ownerUserId = input.ownerUserId || null;
  if (ownerUserId) {
    const organization = requireOrganization(context);
    const membership = await query("SELECT 1 FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND status = 'active'", [organization.id, ownerUserId]);
    if (!membership.rowCount) throw new AccessError("FORBIDDEN", "The selected owner is not an active team member.");
  }
  const values = [input.stage, input.nextAction || null, input.priority, ownerUserId, input.id, ...scope.values];
  const result = await query(
    `UPDATE leads SET stage = $1, next_action = $2, priority = $3, owner_user_id = COALESCE($4, owner_user_id), updated_at = NOW()
     WHERE id = $5 AND ${shiftPlaceholders(scope.clause, 5)} RETURNING id, stage, next_action, priority, owner_user_id, updated_at`,
    values,
  );
  const lead = requireRow(result, "Lead not found.");
  await recordAuditEvent({ actorId: context.user.id, action: "lead.updated", targetType: "lead", targetId: input.id, metadata: { stage: input.stage, ownerUserId } });
  return { lead };
}

async function writeInspection(input, context) {
  if (!["agent", "agency_admin", "developer", "admin"].includes(context.user.role)) throw new AccessError("FORBIDDEN", "Inspection management is not available for this account.");
  const scope = scoped(context, { alias: "l", start: 5 });
  const clause = context.user.role === "agent" ? "i.professional_id = $5" : scope.clause;
  const values = [input.status, input.scheduledAt, input.notes || null, input.id, ...(context.user.role === "agent" ? [context.user.id] : scope.values)];
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const runQuery = client.query.bind(client);
    const result = await runQuery(
      `UPDATE inspections i SET status = $1, scheduled_at = $2, notes = $3, updated_at = NOW()
       FROM leads l WHERE i.lead_id = l.id AND i.id = $4 AND ${clause}
       RETURNING i.id, i.external_key, i.customer_id, i.listing_id, i.status, i.scheduled_at, i.notes, i.updated_at`,
      values,
    );
    const inspection = requireRow(result, "Inspection not found.");
    await runQuery(
      `UPDATE inspection_requests SET status = $1, preferred_date = $2::date, updated_at = NOW()
       WHERE $3 = 'member-inspection-' || id::text AND user_id = $4`,
      [input.status === "proposed" ? "awaiting_confirmation" : input.status, input.scheduledAt, inspection.external_key, inspection.customer_id],
    );
    const recipient = await runQuery(
      "SELECT u.email, l.title FROM users u JOIN listings l ON l.id = $2 WHERE u.id = $1 LIMIT 1",
      [inspection.customer_id, inspection.listing_id],
    );
    if (recipient.rowCount) {
      const title = recipient.rows[0].title;
      await runQuery(
        `INSERT INTO notifications (user_id, kind, title, body, deep_link, delivery_status)
         VALUES ($1, 'inspection_updated', 'Inspection update', $2, '/my-nestora', 'queued')`,
        [inspection.customer_id, `${title} inspection is now ${humanize(input.status)}.`],
      );
      await runQuery(
        `INSERT INTO delivery_jobs (user_id, organization_id, channel, destination, template_key, payload)
         VALUES ($1, $2, 'email', $3, 'inspection_updated', $4::jsonb)`,
        [inspection.customer_id, context.organization?.id || null, recipient.rows[0].email, JSON.stringify({ listingTitle: title, status: input.status, scheduledAt: input.scheduledAt })],
      );
    }
    await recordAuditEvent({ actorId: context.user.id, action: "inspection.updated", targetType: "inspection", targetId: input.id, metadata: { status: input.status }, runQuery });
    await client.query("COMMIT");
    return { inspection };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

async function writeHotel(input, context) {
  if (context.user.role !== "host" && !context.isAdmin) throw new AccessError("FORBIDDEN", "Hotel operations are not available for this account.");
  const organization = requireOrganization(context);
  if (input.action === "reservation") {
    await requireFeature(context, "hotel_inventory");
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const runQuery = client.query.bind(client);
      const result = await runQuery(
        `UPDATE reservations SET status = $1, payment_status = $2, updated_at = NOW()
         WHERE id = $3 AND organization_id = $4
         RETURNING id, external_key, guest_id, room_id, status, payment_status, check_in, check_out, updated_at`,
        [input.status, input.paymentStatus, input.id, organization.id],
      );
      const reservation = requireRow(result, "Reservation not found.");
      await runQuery(
        `UPDATE booking_requests SET status = $1, updated_at = NOW()
         WHERE $2 = 'member-booking-' || id::text AND user_id = $3`,
        [input.status === "requested" ? "pending_confirmation" : input.status, reservation.external_key, reservation.guest_id],
      );
      const recipient = await runQuery(
        "SELECT u.email, r.code AS room_code FROM users u JOIN hotel_rooms r ON r.id = $2 WHERE u.id = $1 LIMIT 1",
        [reservation.guest_id, reservation.room_id],
      );
      if (recipient.rowCount) {
        await runQuery(
          `INSERT INTO notifications (user_id, kind, title, body, deep_link, delivery_status)
           VALUES ($1, 'reservation_updated', 'Reservation update', $2, '/my-nestora', 'queued')`,
          [reservation.guest_id, `Your reservation with ${organization.name} is now ${humanize(input.status)}.`],
        );
        await runQuery(
          `INSERT INTO delivery_jobs (user_id, organization_id, channel, destination, template_key, payload)
           VALUES ($1, $2, 'email', $3, 'reservation_updated', $4::jsonb)`,
          [reservation.guest_id, organization.id, recipient.rows[0].email, JSON.stringify({ organizationName: organization.name, roomCode: recipient.rows[0].room_code, status: input.status, paymentStatus: input.paymentStatus, checkIn: reservation.check_in, checkOut: reservation.check_out })],
        );
      }
      await recordAuditEvent({ actorId: context.user.id, action: "reservation.updated", targetType: "reservation", targetId: input.id, metadata: { status: input.status, paymentStatus: input.paymentStatus }, runQuery });
      await client.query("COMMIT");
      return { reservation };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => null);
      throw error;
    } finally {
      client.release();
    }
  }
  if (input.action === "room") {
    await requireFeature(context, "hotel_inventory");
    const result = await query("UPDATE hotel_rooms SET status = $1 WHERE id = $2 AND organization_id = $3 RETURNING id, code, status", [input.status, input.id, organization.id]);
    const room = requireRow(result, "Room not found.");
    await recordAuditEvent({ actorId: context.user.id, action: "hotel_room.updated", targetType: "hotel_room", targetId: input.id, metadata: { status: input.status } });
    return { room };
  }
  if (input.action === "roomType") {
    await requireFeature(context, "hotel_inventory");
    const result = await query(
      `INSERT INTO hotel_room_types (organization_id, listing_id, code, name, capacity, nightly_rate)
       SELECT $1, l.id, $3, $4, $5, $6 FROM listings l
       WHERE l.id = $2 AND l.organization_id = $1 AND l.category = 'stay' AND l.status <> 'archived'
       RETURNING id, listing_id, code, name, capacity, nightly_rate`,
      [organization.id, input.listingId, input.code, input.name, input.capacity, input.nightlyRate],
    );
    const roomType = requireRow(result, "Select an active stay listing from this organization.");
    await recordAuditEvent({ actorId: context.user.id, action: "hotel_room_type.created", targetType: "hotel_room_type", targetId: roomType.id, metadata: { organizationId: organization.id, listingId: input.listingId } });
    return { roomType };
  }
  if (input.action === "roomCreate") {
    await requireFeature(context, "hotel_inventory");
    const result = await query(
      `INSERT INTO hotel_rooms (organization_id, room_type_id, code, status)
       SELECT $1, rt.id, $3, 'available' FROM hotel_room_types rt WHERE rt.id = $2 AND rt.organization_id = $1
       RETURNING id, room_type_id, code, status`,
      [organization.id, input.roomTypeId, input.code],
    );
    const room = requireRow(result, "Room type not found.");
    await recordAuditEvent({ actorId: context.user.id, action: "hotel_room.created", targetType: "hotel_room", targetId: room.id, metadata: { organizationId: organization.id } });
    return { room };
  }
  throw new AccessError("NOT_FOUND", "Hotel action not found.");
}

async function writeDeveloper(input, context) {
  if (context.user.role !== "developer" && !context.isAdmin) throw new AccessError("FORBIDDEN", "Developer operations are not available for this account.");
  const organization = requireOrganization(context);
  if (input.action === "unit") {
    await requireFeature(context, "developer_inventory");
    const result = await query(
      `UPDATE units u SET status = $1, price_amount = $2, updated_at = NOW() FROM developments d
       WHERE u.development_id = d.id AND u.id = $3 AND d.organization_id = $4 RETURNING u.id, u.code, u.status, u.price_amount, u.updated_at`,
      [input.status, input.priceAmount, input.id, organization.id],
    );
    const unit = requireRow(result, "Unit not found.");
    await recordAuditEvent({ actorId: context.user.id, action: "development_unit.updated", targetType: "unit", targetId: input.id, metadata: { status: input.status } });
    return { unit };
  }
  if (input.action === "development") {
    await requireFeature(context, "developer_inventory");
    const result = await query(
      `UPDATE developments SET construction_progress = $1, payment_plan_summary = $2, completion_date = $3, updated_at = NOW()
       WHERE id = $4 AND organization_id = $5 RETURNING id, name, construction_progress, payment_plan_summary, completion_date, updated_at`,
      [input.progress, input.paymentPlan, input.completionDate || null, input.id, organization.id],
    );
    const development = requireRow(result, "Development not found.");
    await recordAuditEvent({ actorId: context.user.id, action: "development.updated", targetType: "development", targetId: input.id, metadata: { progress: input.progress } });
    return { development };
  }
  if (input.action === "developmentCreate") {
    await requireFeature(context, "developer_inventory");
    const externalKey = `development-${crypto.randomUUID()}`;
    const result = await query(
      `INSERT INTO developments (external_key, organization_id, name, location, status, completion_date, payment_plan_summary)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6)
       RETURNING id, external_key, name, location, status, completion_date, construction_progress, payment_plan_summary, updated_at`,
      [externalKey, organization.id, input.name, input.location, input.completionDate || null, input.paymentPlan],
    );
    await recordAuditEvent({ actorId: context.user.id, action: "development.created", targetType: "development", targetId: result.rows[0].id, metadata: { organizationId: organization.id } });
    return { development: result.rows[0] };
  }
  if (input.action === "blockCreate") {
    await requireFeature(context, "developer_inventory");
    const result = await query(
      `INSERT INTO development_blocks (development_id, code, name, floors)
       SELECT d.id, $3, $4, $5 FROM developments d WHERE d.id = $1 AND d.organization_id = $2
       RETURNING id, development_id, code, name, floors`,
      [input.developmentId, organization.id, input.code, input.name, input.floors],
    );
    const block = requireRow(result, "Development not found.");
    await recordAuditEvent({ actorId: context.user.id, action: "development_block.created", targetType: "development_block", targetId: block.id, metadata: { developmentId: input.developmentId } });
    return { block };
  }
  if (input.action === "unitTypeCreate") {
    await requireFeature(context, "developer_inventory");
    const result = await query(
      `INSERT INTO unit_types (development_id, code, name, bedrooms, bathrooms, area_sqm, price_amount)
       SELECT d.id, $3, $4, $5, $6, $7, $8 FROM developments d WHERE d.id = $1 AND d.organization_id = $2
       RETURNING id, development_id, code, name, bedrooms, bathrooms, area_sqm, price_amount`,
      [input.developmentId, organization.id, input.code, input.name, input.bedrooms, input.bathrooms, input.areaSqm, input.priceAmount],
    );
    const unitType = requireRow(result, "Development not found.");
    await recordAuditEvent({ actorId: context.user.id, action: "unit_type.created", targetType: "unit_type", targetId: unitType.id, metadata: { developmentId: input.developmentId } });
    return { unitType };
  }
  if (input.action === "unitCreate") {
    await requireFeature(context, "developer_inventory");
    const result = await query(
      `INSERT INTO units (development_id, block_id, unit_type_id, code, floor, status, price_amount)
       SELECT d.id, b.id, t.id, $5, $6, 'available', $7
       FROM developments d JOIN development_blocks b ON b.development_id = d.id AND b.id = $3
       JOIN unit_types t ON t.development_id = d.id AND t.id = $4
       WHERE d.id = $1 AND d.organization_id = $2
       RETURNING id, development_id, block_id, unit_type_id, code, floor, status, price_amount`,
      [input.developmentId, organization.id, input.blockId, input.unitTypeId, input.code, input.floor, input.priceAmount],
    );
    const unit = requireRow(result, "Select a block and unit type from the same development.");
    await recordAuditEvent({ actorId: context.user.id, action: "development_unit.created", targetType: "unit", targetId: unit.id, metadata: { developmentId: input.developmentId } });
    return { unit };
  }
  throw new AccessError("NOT_FOUND", "Developer action not found.");
}

async function writeTeam(input, context) {
  if (context.user.role !== "agency_admin" && !context.isAdmin) throw new AccessError("FORBIDDEN", "Agency team operations are not available for this account.");
  const organization = requireOrganization(context);
  if (input.action === "invite") {
    await requireTeamCapacity(context);
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const externalKey = `invite-${crypto.randomUUID()}`;
    const acceptUrl = absoluteApplicationPath(`/team/invitations?token=${encodeURIComponent(token)}`);
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const runQuery = client.query.bind(client);
      await runQuery("UPDATE team_invitations SET status = 'revoked' WHERE organization_id = $1 AND LOWER(email) = LOWER($2) AND status = 'pending'", [organization.id, input.email]);
      const result = await runQuery(
        `INSERT INTO team_invitations (external_key, organization_id, invited_by, email, role, token_hash, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW() + INTERVAL '7 days') RETURNING id, email, role, status, expires_at`,
        [externalKey, organization.id, context.user.id, input.email, input.role, tokenHash],
      );
      await runQuery(
        `INSERT INTO delivery_jobs (user_id, organization_id, channel, destination, template_key, payload)
         VALUES ($1, $2, 'email', $3, 'team_invitation', $4::jsonb)`,
        [context.user.id, organization.id, input.email, JSON.stringify({ organizationName: organization.name, invitationUrl: acceptUrl })],
      );
      await recordAuditEvent({ actorId: context.user.id, action: "team.invited", targetType: "team_invitation", targetId: result.rows[0].id, metadata: { email: input.email, role: input.role }, runQuery });
      await client.query("COMMIT");
      return { invitation: result.rows[0], deliveryQueued: true };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => null);
      throw error;
    } finally {
      client.release();
    }
  }
  if (input.action === "routingRule") {
    await requireFeature(context, "lead_routing");
    if (input.assigneeUserId) {
      const member = await query("SELECT 1 FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND status = 'active'", [organization.id, input.assigneeUserId]);
      if (!member.rowCount) throw new AccessError("FORBIDDEN", "The selected assignee is not an active team member.");
    }
    const result = await query(
      `INSERT INTO lead_routing_rules (organization_id, name, source, listing_category, assignee_user_id, strategy, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, source, listing_category, strategy, priority, active`,
      [organization.id, input.name, input.source || null, input.listingCategory || null, input.assigneeUserId || null, input.strategy, input.priority, context.user.id],
    );
    await recordAuditEvent({ actorId: context.user.id, action: "lead_routing_rule.created", targetType: "lead_routing_rule", targetId: result.rows[0].id, metadata: { organizationId: organization.id } });
    return { routingRule: result.rows[0] };
  }
  if (input.action === "member") {
    const current = await query("SELECT role, status FROM organization_members WHERE organization_id = $1 AND user_id = $2 LIMIT 1", [organization.id, input.userId]);
    const member = current.rows[0];
    if (!member) throw new AccessError("NOT_FOUND", "Team member not found.");
    if (member.role === "owner" && (input.role !== "owner" || input.status !== "active")) throw new AccessError("FORBIDDEN", "Transfer organization ownership before changing the owner's access.");
    if (input.userId === context.user.id && input.status !== "active") throw new AccessError("FORBIDDEN", "You cannot remove your own active access.");
    const result = await query(
      "UPDATE organization_members SET role = $1, status = $2 WHERE organization_id = $3 AND user_id = $4 RETURNING user_id, role, status",
      [input.role, input.status, organization.id, input.userId],
    );
    await recordAuditEvent({ actorId: context.user.id, action: "team.member_updated", targetType: "organization_member", targetId: input.userId, metadata: { organizationId: organization.id, role: input.role, status: input.status } });
    return { member: result.rows[0] };
  }
  throw new AccessError("NOT_FOUND", "Team action not found.");
}

async function writeAdministration(input, context) {
  if (!context.canModerate) throw new AccessError("FORBIDDEN", "Administrative access is required.");
  if (input.action === "report") {
    const result = await query(
      `UPDATE listing_reports SET status = $1, resolution = $2, assigned_to = $3, updated_at = NOW()
       WHERE id = $4 RETURNING id, listing_id, status, resolution, updated_at`,
      [input.status, input.reason, context.user.id, input.id],
    );
    const report = requireRow(result, "Report not found.");
    await query("INSERT INTO moderation_actions (actor_id, target_type, target_id, action, reason) VALUES ($1, 'listing_report', $2, $3, $4)", [context.user.id, input.id, input.status, input.reason]);
    await recordAuditEvent({ actorId: context.user.id, action: "moderation.report_reviewed", targetType: "listing_report", targetId: input.id, metadata: { status: input.status } });
    return { report };
  }
  if (input.action === "verification") {
    const result = await query(
      `UPDATE verification_cases SET status = $1, reviewer_note = $2, reviewer_id = $3, updated_at = NOW()
       WHERE id = $4 RETURNING id, status, reviewer_note, updated_at`,
      [input.status, input.reason, context.user.id, input.id],
    );
    const verification = requireRow(result, "Verification case not found.");
    await query("INSERT INTO moderation_actions (actor_id, target_type, target_id, action, reason) VALUES ($1, 'verification_case', $2, $3, $4)", [context.user.id, input.id, input.status, input.reason]);
    await recordAuditEvent({ actorId: context.user.id, action: "moderation.verification_reviewed", targetType: "verification_case", targetId: input.id, metadata: { status: input.status } });
    return { verification };
  }
  if (input.action === "conversationReport") {
    const result = await query(
      `UPDATE conversation_reports SET status = $1, resolution = $2, assigned_to = $3, updated_at = NOW()
       WHERE id = $4 RETURNING id, conversation_id, status, resolution, updated_at`,
      [input.status, input.reason, context.user.id, input.id],
    );
    const report = requireRow(result, "Conversation report not found.");
    await query("INSERT INTO moderation_actions (actor_id, target_type, target_id, action, reason) VALUES ($1, 'conversation', $2, $3, $4)", [context.user.id, report.conversation_id, input.status, input.reason]);
    await recordAuditEvent({ actorId: context.user.id, action: "moderation.conversation_reviewed", targetType: "conversation_report", targetId: input.id, metadata: { status: input.status } });
    return { report };
  }
  if (input.action === "incident") {
    const result = await query("UPDATE monitoring_events SET resolved_at = NOW() WHERE id = $1 AND resolved_at IS NULL RETURNING id, resolved_at", [input.id]);
    const incident = requireRow(result, "Incident not found.");
    await recordAuditEvent({ actorId: context.user.id, action: "monitoring.incident_resolved", targetType: "monitoring_event", targetId: input.id });
    return { incident };
  }
  if (input.action === "listingDecision") {
    if (input.status === "approved") {
      const candidateResult = await query(
        `SELECT l.*, EXISTS (SELECT 1 FROM listing_media lm WHERE lm.listing_id = l.id AND lm.kind = 'image' AND lm.status = 'ready') AS has_image
         FROM listings l WHERE l.id = $1 AND l.verification_status = 'pending' LIMIT 1`,
        [input.id],
      );
      await assertListingReady(requireRow(candidateResult, "Only submitted listings can be approved."));
    }
    const result = await query(
      `UPDATE listings SET verification_status = $1,
                           status = CASE WHEN $2 = 'approved' THEN 'active' WHEN $2 = 'rejected' THEN 'rejected' ELSE 'suspended' END,
                           published_at = CASE WHEN $2 = 'approved' AND published_at IS NULL THEN NOW() ELSE published_at END,
                           review_note = $4,
                           updated_at = NOW()
       WHERE id = $3 RETURNING id, title, status, verification_status, review_note, updated_at`,
      [input.status === "approved" ? "verified" : input.status === "rejected" ? "rejected" : "verified", input.status, input.id, input.reason],
    );
    const listing = requireRow(result, "Listing not found.");
    await query("INSERT INTO moderation_actions (actor_id, target_type, target_id, action, reason) VALUES ($1, 'listing', $2, $3, $4)", [context.user.id, input.id, input.status, input.reason]);
    await recordAuditEvent({ actorId: context.user.id, action: "moderation.listing_decided", targetType: "listing", targetId: input.id, metadata: { status: input.status, reason: input.reason } });
    return { listing };
  }
  if (input.action === "userStatus") {
    if (!context.isAdmin) throw new AccessError("FORBIDDEN", "Platform administrator access is required.");
    if (input.id === context.user.id) throw new AccessError("FORBIDDEN", "You cannot change your own administrative access.");
    const result = await query("UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role, status, updated_at", [input.status, input.id]);
    const user = requireRow(result, "User not found.");
    await query("INSERT INTO moderation_actions (actor_id, target_type, target_id, action, reason) VALUES ($1, 'user', $2, $3, $4)", [context.user.id, input.id, input.status, input.reason]);
    await recordAuditEvent({ actorId: context.user.id, action: "moderation.user_status_changed", targetType: "user", targetId: input.id, metadata: { status: input.status, reason: input.reason } });
    return { user };
  }
  if (input.action === "subscription") {
    if (!context.isAdmin) throw new AccessError("FORBIDDEN", "Platform administrator access is required.");
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const subjectColumn = input.subjectType === "user" ? "user_id" : "organization_id";
      const exists = await client.query(`SELECT id FROM ${input.subjectType === "user" ? "users" : "organizations"} WHERE id = $1 LIMIT 1`, [input.subjectId]);
      if (!exists.rowCount) throw new AccessError("NOT_FOUND", "Subscription subject not found.");
      await client.query(`UPDATE subscriptions SET status = 'cancelled' WHERE ${subjectColumn} = $1 AND status IN ('active', 'trial', 'grace')`, [input.subjectId]);
      const externalKey = `subscription-${crypto.randomUUID()}`;
      const values = input.subjectType === "user" ? [externalKey, input.subjectId, null, input.planId, input.status, input.endsAt || null, context.user.id] : [externalKey, null, input.subjectId, input.planId, input.status, input.endsAt || null, context.user.id];
      const result = await client.query(
        `INSERT INTO subscriptions (external_key, user_id, organization_id, plan_id, status, starts_at, ends_at, assigned_by)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7) RETURNING id, external_key, user_id, organization_id, plan_id, status, starts_at, ends_at`,
        values,
      );
      await client.query("COMMIT");
      await recordAuditEvent({ actorId: context.user.id, action: "subscription.assigned", targetType: input.subjectType, targetId: input.subjectId, metadata: { planId: input.planId, status: input.status, reason: input.reason } });
      return { subscription: result.rows[0] };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => null);
      throw error;
    } finally {
      client.release();
    }
  }
  throw new AccessError("NOT_FOUND", "Administrative action not found.");
}

async function writeMarketing(input, context) {
  if (!["agent", "agency_admin", "developer", "host", "admin"].includes(context.user.role)) throw new AccessError("FORBIDDEN", "Marketing generation is not available for this account.");
  await requireFeature(context, "marketing_generation");
  const organizationId = context.organization?.id || null;
  let listing = null;
  if (input.listingId) {
    const scope = scoped(context, { alias: "listings", start: 2 });
    const listingResult = await query(
      `SELECT listings.id, listings.title, listings.location, listings.price_amount, listings.currency, listings.description,
              listings.bedrooms, listings.bathrooms,
              (SELECT lm.id FROM listing_media lm WHERE lm.listing_id = listings.id AND lm.kind = 'image' AND lm.status = 'ready' ORDER BY lm.sort_order, lm.created_at LIMIT 1) AS image_id,
              (SELECT lm.storage_key FROM listing_media lm WHERE lm.listing_id = listings.id AND lm.kind = 'image' AND lm.status = 'ready' ORDER BY lm.sort_order, lm.created_at LIMIT 1) AS image_storage_key
       FROM listings WHERE listings.id = $1 AND ${scope.clause}`,
      [input.listingId, ...scope.values],
    );
    listing = listingResult.rows[0];
    if (!listing) throw new AccessError("NOT_FOUND", "Listing not found.");
  }
  const externalKey = `material-${crypto.randomUUID()}`;
  const destinationPath = input.qrTarget || (listing ? `/properties/${listing.id}` : "/workspace");
  absoluteApplicationPath(destinationPath);
  const result = await query(
    `INSERT INTO marketing_materials (external_key, owner_user_id, organization_id, listing_id, development_id, kind, status, qr_target, is_demo)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft', NULL, $7) RETURNING id, external_key, kind, status, qr_target, created_at`,
    [externalKey, context.user.id, organizationId, input.listingId || null, input.developmentId || null, input.kind, Boolean(context.user.is_demo)],
  );
  const material = result.rows[0];
  const token = crypto.randomBytes(18).toString("base64url");
  await query(
    `INSERT INTO marketing_attribution_links (material_id, token, destination_path, listing_id, is_demo)
     VALUES ($1, $2, $3, $4, $5)`,
    [material.id, token, destinationPath, input.listingId || null, Boolean(context.user.is_demo)],
  );
  const qrTarget = absoluteApplicationPath(`/r/${token}`);
  const qrBuffer = await QRCode.toBuffer(qrTarget, { margin: 1, width: 320, errorCorrectionLevel: "M" });
  const rawImage = listing?.image_storage_key ? await getPrivateObject(listing.image_storage_key).catch(() => null) : null;
  const imageBuffer = rawImage ? await sharp(rawImage).jpeg({ quality: 88 }).toBuffer() : null;
  const storageKey = `marketing-materials/${organizationId || context.user.id}/${material.id}.pdf`;
  const pdf = await renderMarketingPdf({ material, listing, owner: context.user, organization: context.organization, qrTarget, qrBuffer, imageBuffer });
  try {
    await putPrivateObject({ key: storageKey, body: pdf, contentType: "application/pdf" });
    await query("UPDATE marketing_materials SET status = 'generated', storage_key = $1, qr_target = $2 WHERE id = $3", [storageKey, qrTarget, material.id]);
  } catch (error) {
    await query("UPDATE marketing_materials SET status = 'archived' WHERE id = $1", [material.id]).catch(() => null);
    throw error;
  }
  await recordAuditEvent({ actorId: context.user.id, action: "marketing.generated", targetType: "marketing_material", targetId: material.id, metadata: { kind: input.kind } });
  return { material: { ...material, status: "generated", storage_key: storageKey, qr_target: qrTarget }, previewPath: `/api/marketing/${material.id}` };
}

async function renderMarketingPdf({ material, listing, owner, organization, qrTarget, qrBuffer, imageBuffer }) {
  const title = listing?.title || organization?.name || owner.name;
  const subtitle = listing?.location || organization?.name || "Nestora professional portfolio";
  const price = listing ? new Intl.NumberFormat("en-NG", { style: "currency", currency: listing.currency || "NGN", maximumFractionDigits: 0 }).format(Number(listing.price_amount)) : null;
  const facts = [listing?.bedrooms != null ? `${listing.bedrooms} bedrooms` : null, listing?.bathrooms != null ? `${Number(listing.bathrooms)} bathrooms` : null].filter(Boolean).join(" | ");
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 0, info: { Title: title, Author: owner.name, Subject: humanize(material.kind) } });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.rect(0, 0, 595, 842).fill("#fffdf9");
    document.rect(0, 0, 595, 8).fill("#e98d7e");
    document.fillColor("#173b31").font("Helvetica-Bold").fontSize(25).text("Nestora", 38, 28);
    document.fillColor("#9b4d42").fontSize(9).text(humanize(material.kind).toUpperCase(), 350, 35, { width: 205, align: "right" });
    if (imageBuffer) document.image(imageBuffer, 0, 78, { width: 595, height: 315, cover: [595, 315], align: "center", valign: "center" });
    else document.rect(0, 78, 595, 180).fill("#173b31");
    const top = imageBuffer ? 424 : 290;
    document.fillColor("#9b4d42").font("Helvetica-Bold").fontSize(9).text("VERIFIED PROPERTY MATERIAL", 38, top);
    document.fillColor("#17231f").font("Times-Bold").fontSize(34).text(title, 38, top + 22, { width: 510, lineGap: 1 });
    const afterTitle = document.y + 8;
    document.fillColor("#5f6965").font("Helvetica").fontSize(11).text(subtitle, 38, afterTitle, { width: 510 });
    if (price) document.fillColor("#173b31").font("Helvetica-Bold").fontSize(21).text(price, 38, document.y + 15);
    if (facts) document.fillColor("#46534e").fontSize(10).text(facts, 38, document.y + 8);
    if (listing?.description) document.fillColor("#5f6965").font("Helvetica").fontSize(10).text(listing.description, 38, document.y + 14, { width: 340, lineGap: 3, height: 90, ellipsis: true });
    const qrY = Math.min(650, Math.max(top + 150, document.y + 15));
    document.image(qrBuffer, 410, qrY, { width: 120, height: 120 });
    document.fillColor("#173b31").font("Helvetica-Bold").fontSize(10).text("Open on Nestora", 395, qrY + 126, { width: 150, align: "center" });
    document.fillColor("#6c7773").font("Helvetica").fontSize(7).text(qrTarget, 390, qrY + 142, { width: 160, align: "center" });
    document.rect(0, 760, 595, 82).fill("#173b31");
    document.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9).text(`Prepared by ${owner.name}`, 38, 780, { width: 260 });
    document.text(`Reference ${material.external_key}`, 320, 780, { width: 237, align: "right" });
    document.fillColor("#bed0c9").font("Helvetica").fontSize(8).text("Verify current availability and all costs in your documented Nestora conversation.", 38, 805, { width: 519 });
    document.end();
  });
}

function absoluteApplicationPath(value) {
  if (!value.startsWith("/") || value.startsWith("//")) throw new AccessError("VALIDATION_ERROR", "Marketing links must stay within Nestora.");
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  let origin;
  try {
    origin = new URL(configuredOrigin);
  } catch {
    throw new AccessError("SERVICE_UNAVAILABLE", "The public application origin is not configured.");
  }
  if (process.env.NODE_ENV === "production" && !isLocalRuntime() && origin.protocol !== "https:") throw new AccessError("SERVICE_UNAVAILABLE", "The public application origin must use HTTPS.");
  return new URL(value, origin).toString();
}

function humanize(value) {
  return String(value || "").replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

async function unreadConversationCount(userId) {
  const result = await query(
    `SELECT COUNT(DISTINCT c.id)::int AS count FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
     JOIN messages m ON m.conversation_id = c.id
     WHERE cp.archived_at IS NULL AND m.sender_id <> $1 AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)`,
    [userId],
  );
  return result.rows[0].count;
}

function requireRow(result, message) {
  if (!result.rowCount) throw new AccessError("NOT_FOUND", message);
  return result.rows[0];
}

function shiftPlaceholders(clause, offset) {
  return clause.replace(/\$(\d+)/g, (_, value) => `$${Number(value) + offset}`);
}

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "listing";
}

function listingLocation(input) {
  return [input.city, input.stateRegion].filter(Boolean).join(", ");
}

async function assertListingReady(listing) {
  const required = [listing.title, listing.description, listing.address_line1, listing.city, listing.state_region, listing.property_type];
  if (required.some((value) => !String(value || "").trim())) {
    throw new AccessError("FORBIDDEN", "Complete the property details before submitting this listing.");
  }
  if (!listing.has_image) throw new AccessError("FORBIDDEN", "Upload at least one valid property image before submitting this listing.");
  if (listing.tour_enabled) {
    await throwIfTourIsEmpty(listing.id);
  }
}

async function throwIfTourIsEmpty(listingId) {
  const media = await query(
    "SELECT 1 FROM listing_media WHERE listing_id = $1 AND status = 'ready' AND media_role IN ('walkthrough', 'panorama') LIMIT 1",
    [listingId],
  );
  if (!media.rowCount) throw new AccessError("FORBIDDEN", "Upload a walkthrough video or 360 scene before enabling the virtual tour.");
}
