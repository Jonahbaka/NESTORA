import { query } from "./db.js";

export async function resolveLeadOwner({ organizationId, source, listingCategory, defaultOwnerId, runQuery = query }) {
  if (!organizationId) return defaultOwnerId;
  const rules = await runQuery(
    `SELECT id, assignee_user_id, strategy FROM lead_routing_rules
     WHERE organization_id = $1 AND active = TRUE AND (source IS NULL OR source = $2) AND (listing_category IS NULL OR listing_category = $3)
     ORDER BY priority ASC, created_at ASC LIMIT 1`,
    [organizationId, source, listingCategory],
  );
  const rule = rules.rows[0];
  if (!rule) return defaultOwnerId;
  if (rule.strategy === "fixed" && rule.assignee_user_id) {
    const member = await runQuery("SELECT 1 FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND status = 'active'", [organizationId, rule.assignee_user_id]);
    if (member.rowCount) return rule.assignee_user_id;
  }
  const order = rule.strategy === "round_robin"
    ? "COALESCE(MAX(l.created_at), TIMESTAMPTZ '1970-01-01') ASC, om.user_id"
    : "COUNT(l.id) FILTER (WHERE l.stage NOT IN ('won', 'lost')) ASC, om.user_id";
  const assignee = await runQuery(
    `SELECT om.user_id FROM organization_members om
     LEFT JOIN leads l ON l.owner_user_id = om.user_id AND l.organization_id = om.organization_id
     WHERE om.organization_id = $1 AND om.status = 'active' AND om.role IN ('agent', 'sales', 'manager')
     GROUP BY om.user_id ORDER BY ${order} LIMIT 1`,
    [organizationId],
  );
  if (assignee.rowCount) {
    await runQuery("UPDATE lead_routing_rules SET updated_at = NOW() WHERE id = $1", [rule.id]);
    return assignee.rows[0].user_id;
  }
  return defaultOwnerId;
}
