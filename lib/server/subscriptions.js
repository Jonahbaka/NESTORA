import crypto from "node:crypto";
import { AccessError } from "@/lib/server/authorization";
import { recordAuditEvent } from "@/lib/server/audit";
import { getPool, query } from "@/lib/server/db";

export async function getPlanDefinition(planId) {
  const result = await query("SELECT * FROM plan_definitions WHERE plan_id = $1 AND is_active = true", [planId]);
  if (!result.rowCount) return null;
  return result.rows[0];
}

export async function getAllPlanDefinitions() {
  const result = await query("SELECT * FROM plan_definitions WHERE is_active = true ORDER BY sort_order");
  return result.rows;
}

export async function getActiveSubscription(context) {
  const organizationId = context.organization?.id || null;
  const result = await query(
    `SELECT s.*, pd.name AS plan_name, pd.limits, pd.features AS plan_features
     FROM subscriptions s
     LEFT JOIN plan_definitions pd ON pd.plan_id = s.plan_id
     WHERE (s.user_id = $1 OR ($2::uuid IS NOT NULL AND s.organization_id = $2))
       AND s.status IN ('active', 'trial', 'grace', 'founding_partner')
       AND (s.ends_at IS NULL OR s.ends_at > NOW())
     ORDER BY s.starts_at DESC LIMIT 1`,
    [context.user.id, organizationId],
  );
  if (!result.rowCount) return null;
  return result.rows[0];
}

export async function getSubscriptionHistory(context) {
  const organizationId = context.organization?.id || null;
  const result = await query(
    `SELECT s.*, pd.name AS plan_name
     FROM subscriptions s
     LEFT JOIN plan_definitions pd ON pd.plan_id = s.plan_id
     WHERE (s.user_id = $1 OR ($2::uuid IS NOT NULL AND s.organization_id = $2))
     ORDER BY s.starts_at DESC LIMIT 50`,
    [context.user.id, organizationId],
  );
  return result.rows;
}

export async function getEntitlementHistory(context) {
  const organizationId = context.organization?.id || null;
  const sub = await getActiveSubscription(context);
  if (!sub) return [];
  const result = await query(
    "SELECT * FROM entitlement_history WHERE subscription_id = $1 ORDER BY created_at DESC LIMIT 100",
    [sub.id],
  );
  return result.rows;
}

export async function checkFeatureAccess(context, feature) {
  const sub = await getActiveSubscription(context);
  if (!sub) return { allowed: false, reason: "No active subscription" };
  if (context.isAdmin) return { allowed: true };
  const features = sub.plan_features || [];
  if (features.includes(feature)) return { allowed: true };
  const overrides = await query(
    "SELECT enabled FROM feature_entitlements WHERE subscription_id = $1 AND feature_key = $2 LIMIT 1",
    [sub.id, feature],
  );
  if (overrides.rowCount) return { allowed: overrides.rows[0].enabled, reason: overrides.rows[0].enabled ? null : "Feature disabled" };
  return { allowed: false, reason: `Your ${sub.plan_id} plan does not include this feature` };
}

export async function requireFeatureAccess(context, feature) {
  const check = await checkFeatureAccess(context, feature);
  if (!check.allowed) throw new AccessError("FORBIDDEN", check.reason || "Your current plan does not include this feature.");
}

export async function checkUsageLimit(context, limitKey) {
  const sub = await getActiveSubscription(context);
  if (!sub) return { allowed: false, used: 0, limit: 0 };
  if (context.isAdmin) return { allowed: true, used: 0, limit: 999999 };
  const limits = sub.limits || {};
  const limit = limits[limitKey] || 0;
  if (limit <= 0) return { allowed: false, used: 0, limit: 0 };

  let used = 0;
  const organizationId = context.organization?.id || null;

  if (limitKey === "activeListings") {
    const result = await query(
      "SELECT COUNT(*)::int AS count FROM listings WHERE (owner_user_id = $1 OR ($2::uuid IS NOT NULL AND organization_id = $2)) AND status = 'active'",
      [context.user.id, organizationId],
    );
    used = result.rows[0].count;
  } else if (limitKey === "users" || limitKey === "teamSeats") {
    if (organizationId) {
      const result = await query(
        "SELECT COUNT(*)::int AS count FROM organization_members WHERE organization_id = $1 AND status IN ('invited', 'active')",
        [organizationId],
      );
      used = result.rows[0].count;
    } else {
      used = 1;
    }
  } else if (limitKey === "marketingDesigns") {
    const result = await query(
      "SELECT COUNT(*)::int AS count FROM marketing_designs WHERE (owner_user_id = $1 OR ($2::uuid IS NOT NULL AND organization_id = $2)) AND status = 'draft'",
      [context.user.id, organizationId],
    );
    used = result.rows[0].count;
  } else if (limitKey === "pdfExports") {
    const result = await query(
      "SELECT COUNT(*)::int AS count FROM design_exports de JOIN marketing_designs md ON md.id = de.design_id WHERE (md.owner_user_id = $1 OR ($2::uuid IS NOT NULL AND md.organization_id = $2)) AND de.format = 'pdf' AND de.created_at > NOW() - INTERVAL '30 days'",
      [context.user.id, organizationId],
    );
    used = result.rows[0].count;
  } else if (limitKey === "imageExports") {
    const result = await query(
      "SELECT COUNT(*)::int AS count FROM design_exports de JOIN marketing_designs md ON md.id = de.design_id WHERE (md.owner_user_id = $1 OR ($2::uuid IS NOT NULL AND md.organization_id = $2)) AND de.format IN ('png', 'jpeg', 'webp') AND de.created_at > NOW() - INTERVAL '30 days'",
      [context.user.id, organizationId],
    );
    used = result.rows[0].count;
  } else if (limitKey === "websites") {
    const result = await query(
      "SELECT COUNT(*)::int AS count FROM partner_websites WHERE (owner_user_id = $1 OR ($2::uuid IS NOT NULL AND organization_id = $2)) AND status IN ('draft', 'preview', 'published')",
      [context.user.id, organizationId],
    );
    used = result.rows[0].count;
  } else if (limitKey === "brandKits") {
    const result = await query(
      "SELECT COUNT(*)::int AS count FROM brand_kits WHERE (owner_user_id = $1 OR ($2::uuid IS NOT NULL AND organization_id = $2))",
      [context.user.id, organizationId],
    );
    used = result.rows[0].count;
  } else if (limitKey === "hostedTours") {
    const result = await query(
      "SELECT COUNT(*)::int AS count FROM listing_media WHERE (owner_user_id = $1 OR ($2::uuid IS NOT NULL AND organization_id = $2)) AND media_role = 'walkthrough' AND status = 'ready'",
      [context.user.id, organizationId],
    );
    used = result.rows[0].count;
  } else if (limitKey === "storageMb") {
    const result = await query(
      "SELECT COALESCE(SUM(byte_size), 0)::bigint AS total FROM listing_media WHERE (owner_user_id = $1 OR ($2::uuid IS NOT NULL AND organization_id = $2)) AND status = 'ready'",
      [context.user.id, organizationId],
    );
    used = Math.ceil(Number(result.rows[0].total) / (1024 * 1024));
  }

  return { allowed: used < limit, used, limit };
}

export async function requireUsageLimit(context, limitKey) {
  const check = await checkUsageLimit(context, limitKey);
  if (!check.allowed) throw new AccessError("FORBIDDEN", `Your plan has reached its ${limitKey} limit (${check.used}/${check.limit}).`);
}

export async function assignSubscription({ subjectType, subjectId, planId, status, endsAt, billingInterval, reason, context }) {
  if (!context.isAdmin && !context.canModerate) throw new AccessError("FORBIDDEN", "Administrative access is required.");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const runQuery = client.query.bind(client);
    const subjectColumn = subjectType === "user" ? "user_id" : "organization_id";
    await runQuery(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE ${subjectColumn} = $1 AND status IN ('active', 'trial', 'grace', 'founding_partner')`,
      [subjectId],
    );
    const externalKey = `subscription-${crypto.randomUUID()}`;
    const values = subjectType === "user"
      ? [externalKey, subjectId, null, planId, status, billingInterval || 'monthly', endsAt || null, context.user.id]
      : [externalKey, null, subjectId, planId, status, billingInterval || 'monthly', endsAt || null, context.user.id];
    const result = await runQuery(
      `INSERT INTO subscriptions (external_key, user_id, organization_id, plan_id, status, billing_interval, starts_at, ends_at, assigned_by)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8) RETURNING *`,
      values,
    );
    await recordAuditEvent({
      actorId: context.user.id, action: "subscription.assigned", targetType: subjectType, targetId: subjectId,
      metadata: { planId, status, billingInterval, reason }, runQuery,
    });
    await client.query("COMMIT");
    return { subscription: result.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

export async function recordEntitlementChange({ subscriptionId, action, field, oldValue, newValue, metadata, context }) {
  await query(
    `INSERT INTO entitlement_history (subscription_id, actor_id, action, field, old_value, new_value, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [subscriptionId, context.user.id, action, field, oldValue, newValue, JSON.stringify(metadata || {})],
  );
}