import crypto from "node:crypto";
import { AccessError } from "@/lib/server/authorization";
import { recordAuditEvent } from "@/lib/server/audit";
import { getPool, query } from "@/lib/server/db";
import { requireFeatureAccess, requireUsageLimit } from "@/lib/server/subscriptions";

const RESERVED_SLUGS = new Set([
  "www", "api", "admin", "mail", "app", "help", "support", "docs", "status", "blog",
  "about", "contact", "terms", "privacy", "security", "trust", "my", "nestora",
  "demo", "test", "dev", "staging", "cdn", "static", "media", "assets", "files",
  "uploads", "auth", "login", "signup", "register", "workspace", "dashboard", "console",
]);

const ALLOWED_SECTION_TYPES = [
  "hero", "about", "featured_listings", "active_developments", "available_units",
  "hotels_rooms", "short_stay", "services", "areas_served", "team", "testimonials",
  "verification_badges", "virtual_tours", "open_house", "construction_updates",
  "amenities", "contact", "enquiry_form", "inspection_request", "reservation_request",
  "whatsapp", "social_links", "newsletter", "gallery",
];

const DEFAULT_THEME = {
  primaryColor: "#173b31",
  secondaryColor: "#e98d7e",
  backgroundColor: "#ffffff",
  textColor: "#17231f",
  fontFamily: "Inter, system-ui, sans-serif",
  headingFont: "Inter, system-ui, sans-serif",
  borderRadius: "8px",
  buttonStyle: "rounded",
};

export async function getPartnerWebsite(context, websiteId) {
  const result = await query(
    `SELECT pw.*, bk.name AS brand_kit_name
     FROM partner_websites pw
     LEFT JOIN brand_kits bk ON bk.id = pw.brand_kit_id
     WHERE pw.id = $1 AND (pw.owner_user_id = $2 OR ($3::uuid IS NOT NULL AND pw.organization_id = $3) OR $4 = true)
     LIMIT 1`,
    [websiteId, context.user.id, context.organization?.id || null, context.isAdmin],
  );
  if (!result.rowCount) throw new AccessError("NOT_FOUND", "Partner website not found.");
  return result.rows[0];
}

export async function listPartnerWebsites(context) {
  const result = await query(
    `SELECT pw.*, bk.name AS brand_kit_name
     FROM partner_websites pw
     LEFT JOIN brand_kits bk ON bk.id = pw.brand_kit_id
     WHERE pw.owner_user_id = $1 OR ($2::uuid IS NOT NULL AND pw.organization_id = $2) OR $3 = true
     ORDER BY pw.updated_at DESC LIMIT 50`,
    [context.user.id, context.organization?.id || null, context.isAdmin],
  );
  return result.rows;
}

export async function createPartnerWebsite(input, context) {
  await requireFeatureAccess(context, "partner_website");
  await requireUsageLimit(context, "websites");

  const slug = slugify(input.name || input.slug);
  if (!slug || slug.length < 2) throw new AccessError("VALIDATION_ERROR", "Website name must be at least 2 characters.");
  if (RESERVED_SLUGS.has(slug)) throw new AccessError("VALIDATION_ERROR", "This website name is reserved.");

  const reservedCheck = await query("SELECT 1 FROM reserved_subdomains WHERE subdomain = $1 LIMIT 1", [slug]);
  if (reservedCheck.rowCount) throw new AccessError("VALIDATION_ERROR", "This website name is reserved.");

  const existing = await query("SELECT 1 FROM partner_websites WHERE subdomain = $1 LIMIT 1", [slug]);
  if (existing.rowCount) throw new AccessError("VALIDATION_ERROR", "This website name is already taken.");

  const externalKey = `website-${crypto.randomUUID()}`;
  const result = await query(
    `INSERT INTO partner_websites (external_key, owner_user_id, organization_id, kind, template_id, brand_kit_id, name, slug, subdomain, sections, theme, contact, seo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb)
     RETURNING *`,
    [
      externalKey, context.user.id, context.organization?.id || null,
      input.kind || "agent", input.templateId || "default", input.brandKitId || null, input.name, slug, slug,
      JSON.stringify(input.sections || []),
      JSON.stringify({ ...DEFAULT_THEME, ...(input.theme || {}) }),
      JSON.stringify(input.contact || {}),
      JSON.stringify(input.seo || {}),
    ],
  );
  const website = result.rows[0];
  await recordAuditEvent({
    actorId: context.user.id, action: "partner_website.created", targetType: "partner_website",
    targetId: website.id, metadata: { slug, name: input.name },
  });
  return { website };
}

export async function updatePartnerWebsite(websiteId, input, context) {
  const existing = await getPartnerWebsite(context, websiteId);
  if (existing.status === "suspended" && !context.isAdmin) throw new AccessError("FORBIDDEN", "This website has been suspended.");

  const updates = [];
  const values = [];
  let idx = 1;

  const normalized = {
    name: input.name,
    sections: input.sections,
    theme: input.theme,
    contact: input.contact,
    seo: input.seo,
    template_id: input.templateId,
    brand_kit_id: input.brandKitId,
    logo_media_id: input.logoMediaId,
    cover_media_id: input.coverMediaId,
    analytics_enabled: input.analyticsEnabled,
  };
  for (const [key, value] of Object.entries(normalized)) {
    if (value === undefined) continue;
    if (!["name", "sections", "theme", "contact", "seo", "template_id", "logo_media_id", "cover_media_id", "brand_kit_id", "analytics_enabled"].includes(key)) continue;
    if (key === "sections" || key === "theme" || key === "contact" || key === "seo") {
      updates.push(`${snakeCase(key)} = $${idx}::jsonb`);
      values.push(JSON.stringify(value));
    } else {
      updates.push(`${snakeCase(key)} = $${idx}`);
      values.push(value);
    }
    idx++;
  }

  if (!updates.length) return { website: existing };

  values.push(websiteId);
  updates.push("updated_at = NOW()");
  const result = await query(
    `UPDATE partner_websites SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
    values,
  );
  const website = result.rows[0];
  await recordAuditEvent({
    actorId: context.user.id, action: "partner_website.updated", targetType: "partner_website",
    targetId: websiteId, metadata: { updatedFields: Object.keys(input) },
  });
  return { website };
}

export async function publishPartnerWebsite(websiteId, context) {
  const existing = await getPartnerWebsite(context, websiteId);
  if (existing.status === "suspended") throw new AccessError("FORBIDDEN", "A suspended website cannot be published.");
  if (existing.status === "expired") throw new AccessError("FORBIDDEN", "An expired subscription website cannot be published.");

  const result = await query(
    `UPDATE partner_websites SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [websiteId],
  );
  const website = result.rows[0];
  await recordAuditEvent({
    actorId: context.user.id, action: "partner_website.published", targetType: "partner_website", targetId: websiteId,
  });
  return { website };
}

export async function unpublishPartnerWebsite(websiteId, context) {
  const existing = await getPartnerWebsite(context, websiteId);
  const result = await query(
    "UPDATE partner_websites SET status = 'unpublished', updated_at = NOW() WHERE id = $1 RETURNING *",
    [websiteId],
  );
  const website = result.rows[0];
  await recordAuditEvent({
    actorId: context.user.id, action: "partner_website.unpublished", targetType: "partner_website", targetId: websiteId,
  });
  return { website };
}

export async function suspendPartnerWebsite(websiteId, reason, context) {
  if (!context.isAdmin && !context.canModerate) throw new AccessError("FORBIDDEN", "Administrative access is required.");
  const result = await query(
    "UPDATE partner_websites SET status = 'suspended', suspended_at = NOW(), suspension_reason = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
    [websiteId, reason],
  );
  const website = result.rows[0];
  await recordAuditEvent({
    actorId: context.user.id, action: "partner_website.suspended", targetType: "partner_website", targetId: websiteId,
    metadata: { reason },
  });
  return { website };
}

export async function reinstatePartnerWebsite(websiteId, context) {
  if (!context.isAdmin && !context.canModerate) throw new AccessError("FORBIDDEN", "Administrative access is required.");
  const result = await query(
    "UPDATE partner_websites SET status = 'unpublished', suspended_at = NULL, suspension_reason = NULL, updated_at = NOW() WHERE id = $1 RETURNING *",
    [websiteId],
  );
  const website = result.rows[0];
  await recordAuditEvent({
    actorId: context.user.id, action: "partner_website.reinstated", targetType: "partner_website", targetId: websiteId,
  });
  return { website };
}

export async function getPartnerWebsiteBySubdomain(subdomain) {
  const result = await query(
    `SELECT pw.*, bk.name AS brand_kit_name, bk.brand_colors, bk.fonts, bk.contact_footer, bk.website_url, bk.social_handles
     FROM partner_websites pw LEFT JOIN brand_kits bk ON bk.id = pw.brand_kit_id
     WHERE pw.subdomain = $1 AND pw.status = 'published' LIMIT 1`,
    [subdomain],
  );
  if (!result.rowCount) return null;
  return result.rows[0];
}

export async function recordWebsiteVisit(websiteId, { ip, userAgent, referrer, path, sessionId }) {
  await query(
    `INSERT INTO website_visits (website_id, visitor_ip, user_agent, referrer, path, session_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [websiteId, ip, userAgent, referrer, path, sessionId],
  );
}

export async function getWebsiteAnalytics(websiteId, context) {
  const existing = await getPartnerWebsite(context, websiteId);
  const [visits, visitsByPath, visitsByDate] = await Promise.all([
    query("SELECT COUNT(*)::int AS total, COUNT(DISTINCT session_id)::int AS unique_visitors FROM website_visits WHERE website_id = $1", [websiteId]),
    query("SELECT path, COUNT(*)::int AS count FROM website_visits WHERE website_id = $1 GROUP BY path ORDER BY count DESC LIMIT 20", [websiteId]),
    query("SELECT DATE(created_at) AS date, COUNT(*)::int AS count FROM website_visits WHERE website_id = $1 AND created_at > NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date DESC", [websiteId]),
  ]);
  return {
    total: visits.rows[0].total,
    uniqueVisitors: visits.rows[0].unique_visitors,
    byPath: visitsByPath.rows,
    byDate: visitsByDate.rows,
  };
}

function slugify(value) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "site";
}

function snakeCase(value) {
  return value.replace(/([A-Z])/g, "_$1").toLowerCase();
}
