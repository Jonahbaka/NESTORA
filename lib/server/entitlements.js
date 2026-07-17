import { AccessError } from "@/lib/server/authorization";
import { query } from "@/lib/server/db";
import { getPlanPolicy } from "@/lib/entitlement-policy";

export async function getEffectiveEntitlements(context) {
  if (context.isAdmin) return { planId: "enterprise", ...getPlanPolicy("enterprise") };
  const organizationId = context.organization?.id || null;
  const result = await query(
    `SELECT s.id, s.plan_id, f.feature_key, f.enabled, f.limit_value
     FROM subscriptions s LEFT JOIN feature_entitlements f ON f.subscription_id = s.id
     WHERE (s.user_id = $1 OR ($2::uuid IS NOT NULL AND s.organization_id = $2))
       AND s.status IN ('active', 'trial', 'grace') AND (s.ends_at IS NULL OR s.ends_at > NOW())
     ORDER BY s.starts_at DESC`,
    [context.user.id, organizationId],
  );
  const planId = result.rows[0]?.plan_id || "basic";
  const base = getPlanPolicy(planId);
  const features = new Set(base.features);
  const limits = { activeListings: base.activeListings, users: base.users };
  for (const row of result.rows) {
    if (!row.feature_key) continue;
    if (row.enabled) features.add(row.feature_key); else features.delete(row.feature_key);
    if (row.limit_value != null && row.feature_key in limits) limits[row.feature_key] = row.limit_value;
  }
  return { planId, features: [...features], ...limits };
}

export async function requireFeature(context, feature) {
  const entitlements = await getEffectiveEntitlements(context);
  if (!entitlements.features.includes(feature)) throw new AccessError("FORBIDDEN", "Your current plan does not include this feature.");
  return entitlements;
}

export async function requireListingCapacity(context, { excludingId } = {}) {
  const entitlements = await getEffectiveEntitlements(context);
  const values = [];
  let clause;
  if (context.organization) { values.push(context.organization.id); clause = `organization_id = $${values.length}`; }
  else { values.push(context.user.id); clause = `owner_user_id = $${values.length}`; }
  if (excludingId) { values.push(excludingId); clause += ` AND id <> $${values.length}`; }
  const result = await query(`SELECT COUNT(*)::int AS count FROM listings WHERE ${clause} AND status = 'active'`, values);
  if (result.rows[0].count >= entitlements.activeListings) throw new AccessError("FORBIDDEN", `Your ${entitlements.planId} plan has reached its active listing limit.`);
  return entitlements;
}

export async function requireTeamCapacity(context) {
  const entitlements = await requireFeature(context, "team_management");
  const result = await query("SELECT COUNT(*)::int AS count FROM organization_members WHERE organization_id = $1 AND status IN ('invited', 'active')", [context.organization.id]);
  const pending = await query("SELECT COUNT(*)::int AS count FROM team_invitations WHERE organization_id = $1 AND status = 'pending' AND expires_at > NOW()", [context.organization.id]);
  if (result.rows[0].count + pending.rows[0].count >= entitlements.users) throw new AccessError("FORBIDDEN", `Your ${entitlements.planId} plan has reached its workspace user limit.`);
  return entitlements;
}
