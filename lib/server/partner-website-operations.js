import { AccessError } from "@/lib/server/authorization";
import { recordAuditEvent } from "@/lib/server/audit";
import { query } from "@/lib/server/db";
import { requireFeature } from "@/lib/server/entitlements";
import { requireOrganization, tenantScope } from "@/lib/server/workspace-context";
import { listPartnerWebsites, getPartnerWebsite, createPartnerWebsite, updatePartnerWebsite, publishPartnerWebsite, unpublishPartnerWebsite, suspendPartnerWebsite, reinstatePartnerWebsite, getWebsiteAnalytics } from "@/lib/server/partner-websites";

const websiteTemplateKinds = [
  { value: "agent", label: "Independent professional" },
  { value: "agency", label: "Agency" },
  { value: "developer", label: "Developer" },
  { value: "hospitality", label: "Hospitality" },
  { value: "serviced_apartments", label: "Serviced apartments" },
  { value: "short_stay", label: "Short-stay operator" },
];

export async function readWebsiteWorkspace(context) {
  const organizationId = context.organization?.id || null;
  const scope = tenantScope(context, { alias: "w" });
  const [listResult, analyticsResult] = await Promise.all([
    query(
      `SELECT w.id, w.external_key, w.organization_id, w.owner_user_id, w.kind, w.name, w.subdomain, w.status, w.published_at, w.suspended_at, w.created_at, w.updated_at,
              COUNT(v.id)::int AS visit_count,
              COUNT(v.id) FILTER (WHERE v.created_at >= NOW() - INTERVAL '30 days')::int AS visits_last_30_days
       FROM partner_websites w
       LEFT JOIN website_visits v ON v.website_id = w.id
       WHERE w.owner_user_id = $1 OR w.organization_id = $2
       GROUP BY w.id ORDER BY w.updated_at DESC
       LIMIT 100`,
      [context.user.id, organizationId],
    ),
    analyticsResultFor(context.user.id, organizationId),
  ]);
  return { websites: listResult.rows.map(websitePresentation), analytics: analyticsResult };
}

export async function readWebsiteEditor(context, websiteId) {
  const website = await getPartnerWebsite(websiteId, context.user.id, context.organization?.id || null);
  return { website: websitePresentation(website) };
}

export async function writeWebsiteEditor(input, context) {
  if (!["agent", "agency_admin", "developer", "host"].includes(context.user.role)) throw new AccessError("FORBIDDEN", "Website builder access is limited to professional accounts.");
  await requireFeature(context, "partner_website");
  if (input.action === "create") {
    const website = await createPartnerWebsite({ ...input, ownerUserId: context.user.id, organizationId: context.organization?.id || null });
    await recordAuditEvent({ actorId: context.user.id, action: "website.created", targetType: "partner_website", targetId: website.id, metadata: { kind: input.kind, subdomain: input.subdomain } });
    return { website: websitePresentation(website) };
  }
  if (input.action === "update") {
    const website = await updatePartnerWebsite(input.websiteId, { ...input, ownerUserId: context.user.id, organizationId: context.organization?.id || null });
    await recordAuditEvent({ actorId: context.user.id, action: "website.updated", targetType: "partner_website", targetId: input.websiteId, metadata: { kind: input.kind, subdomain: input.subdomain } });
    return { website: websitePresentation(website) };
  }
  if (input.action === "publish") {
    await requireFeature(context, "partner_website");
    const website = await publishPartnerWebsite(input.websiteId, context.user.id, context.organization?.id || null);
    await recordAuditEvent({ actorId: context.user.id, action: "website.published", targetType: "partner_website", targetId: input.websiteId });
    return { website: websitePresentation(website) };
  }
  if (input.action === "unpublish") {
    const website = await unpublishPartnerWebsite(input.websiteId, context.user.id, context.organization?.id || null);
    await recordAuditEvent({ actorId: context.user.id, action: "website.unpublished", targetType: "partner_website", targetId: input.websiteId });
    return { website: websitePresentation(website) };
  }
  throw new AccessError("NOT_FOUND", "Website action not found.");
}

export async function writeWebsiteAdministration(input, context) {
  if (!context.canModerate) throw new AccessError("FORBIDDEN", "Administrative access is required.");
  const website = input.action === "suspend" ? await suspendPartnerWebsite(input.websiteId, input.reason) : await reinstatePartnerWebsite(input.websiteId);
  await recordAuditEvent({ actorId: context.user.id, action: `website.${input.action}`, targetType: "partner_website", targetId: input.websiteId, metadata: { reason: input.reason } });
  return { website: websitePresentation(website) };
}

export function listWebsiteTemplates(context) {
  const professionalOnly = ["agent", "agency_admin", "developer", "host"];
  if (!professionalOnly.includes(context.user.role)) throw new AccessError("FORBIDDEN", "Website templates require a professional account.");
  return { templates: [
    { id: "professional", name: "Professional", audience: "Independent agent", sections: ["hero", "about", "featured", "contact", "social"] },
    { id: "agency", name: "Agency", audience: "Multi-branch agency", sections: ["hero", "about", "team", "featured", "contact", "social"] },
    { id: "developer", name: "Developer", audience: "Property developer", sections: ["hero", "developments", "available_units", "contact", "social"] },
    { id: "hospitality", name: "Hospitality", audience: "Hotel and serviced apartments", sections: ["hero", "rooms_stays", "amenities", "contact", "social"] },
  ] };
}

function websitePresentation(website) {
  if (!website) return null;
  const analytics = website.analytics || {};
  return {
    id: website.id,
    externalKey: website.external_key,
    kind: website.kind,
    name: website.name,
    subdomain: website.subdomain,
    status: website.status,
    publishedAt: website.published_at,
    suspendedAt: website.suspended_at,
    createdAt: website.created_at,
    updatedAt: website.updated_at,
    configuration: website.configuration || {},
    visitCount: analytics.visitCount || 0,
    visitsLast30Days: analytics.visitsLast30Days || 0,
    enquiries: analytics.enquiries || 0,
  };
}

async function analyticsResultFor(userId, organizationId) {
  const [visits, enquiries] = await Promise.all([
    query("SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30_days FROM website_visits WHERE website_id IN (SELECT id FROM partner_websites WHERE owner_user_id = $1 OR organization_id = $2)", [userId, organizationId]),
    query("SELECT COUNT(*)::int AS count FROM enquiries WHERE website_id IN (SELECT id FROM partner_websites WHERE owner_user_id = $1 OR organization_id = $2)", [userId, organizationId]),
  ]);
  return { visitCount: visits.rows[0]?.count || 0, visitsLast30Days: visits.rows[0]?.last_30_days || 0, enquiries: enquiries.rows[0]?.count || 0 };
}