import crypto from "node:crypto";
import { AccessError } from "@/lib/server/authorization";
import { recordAuditEvent } from "@/lib/server/audit";
import { query } from "@/lib/server/db";
import { requireFeatureAccess, requireUsageLimit } from "@/lib/server/subscriptions";

export async function getBrandKit(context, kitId) {
  const result = await query(
    `SELECT * FROM brand_kits
     WHERE id = $1 AND (owner_user_id = $2 OR ($3::uuid IS NOT NULL AND organization_id = $3) OR $4 = true)
     LIMIT 1`,
    [kitId, context.user.id, context.organization?.id || null, context.isAdmin],
  );
  if (!result.rowCount) throw new AccessError("NOT_FOUND", "Brand kit not found.");
  return result.rows[0];
}

export async function listBrandKits(context) {
  const result = await query(
    `SELECT * FROM brand_kits
     WHERE owner_user_id = $1 OR ($2::uuid IS NOT NULL AND organization_id = $2) OR $3 = true
     ORDER BY is_organization_kit DESC, name ASC LIMIT 50`,
    [context.user.id, context.organization?.id || null, context.isAdmin],
  );
  return result.rows;
}

export async function createBrandKit(input, context) {
  await requireFeatureAccess(context, "brand_kit");
  await requireUsageLimit(context, "brandKits");

  const externalKey = `brand-${crypto.randomUUID()}`;
  const result = await query(
    `INSERT INTO brand_kits (external_key, owner_user_id, organization_id, name, is_organization_kit,
      brand_colors, fonts, contact_footer, website_url, social_handles, disclaimer, default_qr_style)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb, $11, $12)
     RETURNING *`,
    [
      externalKey, context.user.id, context.organization?.id || null,
      input.name, input.isOrganizationKit || false,
      JSON.stringify(input.brandColors || {}),
      JSON.stringify(input.fonts || {}),
      input.contactFooter || null, input.websiteUrl || null,
      JSON.stringify(input.socialHandles || {}),
      input.disclaimer || null, input.defaultQrStyle || "standard",
    ],
  );
  const kit = result.rows[0];
  await recordAuditEvent({
    actorId: context.user.id, action: "brand_kit.created", targetType: "brand_kit",
    targetId: kit.id, metadata: { name: input.name },
  });
  return { brandKit: kit };
}

export async function updateBrandKit(kitId, input, context) {
  const existing = await getBrandKit(context, kitId);
  if (existing.is_locked && !context.isAdmin) throw new AccessError("FORBIDDEN", "This brand kit is locked.");

  const updates = [];
  const values = [];
  let idx = 1;

  const allowedFields = ["name", "logo_media_id", "alternate_logo_media_id", "contact_footer", "website_url", "disclaimer", "default_qr_style"];
  const jsonFields = ["brand_colors", "fonts", "social_handles", "approved_images"];

  for (const [key, value] of Object.entries(input)) {
    if (allowedFields.includes(key)) {
      updates.push(`${snakeCase(key)} = $${idx}`);
      values.push(value);
      idx++;
    } else if (jsonFields.includes(key)) {
      updates.push(`${snakeCase(key)} = $${idx}::jsonb`);
      values.push(JSON.stringify(value));
      idx++;
    }
  }

  if (!updates.length) return { brandKit: existing };

  values.push(kitId);
  updates.push("updated_at = NOW()");
  const result = await query(
    `UPDATE brand_kits SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
    values,
  );
  const kit = result.rows[0];
  await recordAuditEvent({
    actorId: context.user.id, action: "brand_kit.updated", targetType: "brand_kit",
    targetId: kitId, metadata: { updatedFields: Object.keys(input) },
  });
  return { brandKit: kit };
}

export async function lockBrandKit(kitId, context) {
  if (!context.isAdmin) throw new AccessError("FORBIDDEN", "Administrative access is required.");
  const result = await query("UPDATE brand_kits SET is_locked = true, updated_at = NOW() WHERE id = $1 RETURNING *", [kitId]);
  return { brandKit: result.rows[0] };
}

export async function deleteBrandKit(kitId, context) {
  const existing = await getBrandKit(context, kitId);
  await query("DELETE FROM brand_kits WHERE id = $1", [kitId]);
  await recordAuditEvent({
    actorId: context.user.id, action: "brand_kit.deleted", targetType: "brand_kit", targetId: kitId,
  });
}

function snakeCase(value) {
  return value.replace(/([A-Z])/g, "_$1").toLowerCase();
}