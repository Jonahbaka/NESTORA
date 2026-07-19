import { query } from "@/lib/server/db";

const KNOWN_EVENT_TYPES = [
  "profile_view", "website_visit", "listing_view", "listing_save", "listing_share",
  "qr_scan", "tour_start", "tour_complete", "enquiry", "message_sent",
  "response_time", "inspection_request", "inspection_completed", "reservation_request",
  "reservation_confirmed", "lead_source", "campaign_source", "conversion",
  "listing_accuracy_feedback", "unit_interest", "room_interest",
  "website_cta_click", "marketing_asset_download",
];

export async function recordAnalyticsEvent({ eventType, userId, organizationId, listingId, source, metadata, ip, userAgent, sessionId }) {
  if (!KNOWN_EVENT_TYPES.includes(eventType)) return null;
  const result = await query(
    `INSERT INTO analytics_events (event_type, user_id, organization_id, listing_id, source, metadata, ip_address, user_agent, session_id)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::inet, $8, $9) RETURNING id`,
    [eventType, userId || null, organizationId || null, listingId || null, source || null,
     JSON.stringify(metadata || {}), ip || null, userAgent || null, sessionId || null],
  );
  return result.rows[0].id;
}

export async function getAnalytics(context, { days = 30, listingId, eventType } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (!context.isAdmin) {
    conditions.push(`(ae.organization_id = $${idx} OR ae.user_id = $${idx + 1})`);
    values.push(context.organization?.id || null, context.user.id);
    idx += 2;
  }
  if (listingId) { conditions.push(`ae.listing_id = $${idx}`); values.push(listingId); idx++; }
  if (eventType) { conditions.push(`ae.event_type = $${idx}`); values.push(eventType); idx++; }
  conditions.push(`ae.created_at > NOW() - $${idx}::interval`);
  values.push(`${days} days`);

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [totals, byType, bySource, byDate] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM analytics_events ae ${where}`, values),
    query(`SELECT ae.event_type, COUNT(*)::int AS count FROM analytics_events ae ${where} GROUP BY ae.event_type ORDER BY count DESC`, values),
    query(`SELECT ae.source, COUNT(*)::int AS count FROM analytics_events ae ${where} AND ae.source IS NOT NULL GROUP BY ae.source ORDER BY count DESC`, values),
    query(`SELECT DATE(ae.created_at) AS date, COUNT(*)::int AS count FROM analytics_events ae ${where} GROUP BY DATE(ae.created_at) ORDER BY date DESC LIMIT 90`, values),
  ]);

  return {
    total: totals.rows[0].total,
    byType: byType.rows,
    bySource: bySource.rows,
    byDate: byDate.rows,
  };
}

export async function getListingAnalytics(listingId, context) {
  const [views, saves, shares, qrScans, enquiries, inspections] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM analytics_events WHERE listing_id = $1 AND event_type = 'listing_view' AND created_at > NOW() - INTERVAL '90 days'", [listingId]),
    query("SELECT COUNT(*)::int AS count FROM analytics_events WHERE listing_id = $1 AND event_type = 'listing_save' AND created_at > NOW() - INTERVAL '90 days'", [listingId]),
    query("SELECT COUNT(*)::int AS count FROM analytics_events WHERE listing_id = $1 AND event_type = 'listing_share' AND created_at > NOW() - INTERVAL '90 days'", [listingId]),
    query("SELECT COUNT(*)::int AS count FROM marketing_attribution_events ae JOIN marketing_attribution_links al ON al.id = ae.link_id WHERE al.listing_id = $1 AND ae.created_at > NOW() - INTERVAL '90 days'", [listingId]),
    query("SELECT COUNT(*)::int AS count FROM leads WHERE listing_id = $1 AND created_at > NOW() - INTERVAL '90 days'", [listingId]),
    query("SELECT COUNT(*)::int AS count FROM inspections i JOIN leads l ON l.id = i.lead_id WHERE l.listing_id = $1 AND i.created_at > NOW() - INTERVAL '90 days'", [listingId]),
  ]);

  return {
    views: views.rows[0].count,
    saves: saves.rows[0].count,
    shares: shares.rows[0].count,
    qrScans: qrScans.rows[0].count,
    enquiries: enquiries.rows[0].count,
    inspections: inspections.rows[0].count,
  };
}

export async function exportAnalyticsCsv(context, { days = 90 } = {}) {
  const data = await getAnalytics(context, { days });
  const lines = ["event_type,source,count,date"];
  for (const row of data.byType) lines.push(`${row.event_type},,${row.count},`);
  for (const row of data.byDate) lines.push(`,,${row.count},${row.date}`);
  return lines.join("\n");
}