import crypto from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { AccessError } from "@/lib/server/authorization";
import { recordAuditEvent } from "@/lib/server/audit";
import { query } from "@/lib/server/db";
import { requireFeature } from "@/lib/server/entitlements";
import { deletePrivateObject, getPrivateObject, putPrivateObject } from "@/lib/server/object-storage";
import { tenantScope } from "@/lib/server/workspace-context";
import { scanUpload } from "@/lib/server/malware-scan";

export async function listListingMedia({ context, listingId }) {
  await requireListingManagement(context, listingId);
  const result = await query(
    `SELECT id, listing_id, filename, mime_type, byte_size, kind, status, sort_order, created_at
     FROM listing_media WHERE listing_id = $1 AND status <> 'deleted' ORDER BY sort_order, created_at`,
    [listingId],
  );
  return result.rows.map((row) => ({ ...row, byte_size: Number(row.byte_size), url: `/api/media/${row.id}` }));
}

export async function createListingMedia({ context, listingId, file, category }) {
  await requireFeature(context, "media_upload");
  await requireListingManagement(context, listingId);
  const body = Buffer.from(await file.arrayBuffer());
  await validateFileContents({ body, category, mimeType: file.type });
  await scanUpload({ body, filename: file.name, mimeType: file.type });
  const extension = path.extname(file.name).toLowerCase();
  const ownerSegment = context.organization?.id || context.user.id;
  const storageKey = `listing-media/${ownerSegment}/${listingId}/${crypto.randomUUID()}${extension}`;
  await putPrivateObject({ key: storageKey, body, contentType: file.type });
  try {
    const result = await query(
      `INSERT INTO listing_media (listing_id, owner_user_id, organization_id, storage_key, filename, mime_type, byte_size, kind, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ready')
       RETURNING id, listing_id, filename, mime_type, byte_size, kind, status, sort_order, created_at`,
      [listingId, context.user.id, context.organization?.id || null, storageKey, sanitizeFilename(file.name), file.type, body.length, category],
    );
    await recordAuditEvent({ actorId: context.user.id, action: "listing_media.created", targetType: "listing_media", targetId: result.rows[0].id, metadata: { listingId, category, byteSize: body.length } });
    return { ...result.rows[0], byte_size: Number(result.rows[0].byte_size), url: `/api/media/${result.rows[0].id}` };
  } catch (error) {
    await deletePrivateObject(storageKey).catch(() => null);
    throw error;
  }
}

export async function removeListingMedia({ context, mediaId }) {
  const result = await query("SELECT id, listing_id, storage_key FROM listing_media WHERE id = $1 AND status <> 'deleted' LIMIT 1", [mediaId]);
  const media = result.rows[0];
  if (!media) throw new AccessError("NOT_FOUND", "Media not found.");
  await requireListingManagement(context, media.listing_id);
  await query("UPDATE listing_media SET status = 'deleted' WHERE id = $1", [mediaId]);
  await deletePrivateObject(media.storage_key);
  await recordAuditEvent({ actorId: context.user.id, action: "listing_media.deleted", targetType: "listing_media", targetId: mediaId, metadata: { listingId: media.listing_id } });
  return { deleted: true };
}

export async function readMediaObject({ mediaId, userId = null }) {
  const result = await query(
    `SELECT m.storage_key, m.mime_type, m.filename, m.kind, l.status AS listing_status, l.verification_status, l.is_demo,
            l.owner_user_id, l.organization_id,
            EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = l.organization_id AND om.user_id = $2 AND om.status = 'active') AS member_access
     FROM listing_media m JOIN listings l ON l.id = m.listing_id
     WHERE m.id = $1 AND m.status = 'ready' LIMIT 1`,
    [mediaId, userId],
  );
  const media = result.rows[0];
  if (!media) throw new AccessError("NOT_FOUND", "Media not found.");
  const publicAsset = ["image", "video"].includes(media.kind) && media.listing_status === "active" && media.verification_status === "verified" && !media.is_demo;
  const privateAccess = userId && (media.owner_user_id === userId || media.member_access);
  if (!publicAsset && !privateAccess) throw new AccessError("NOT_FOUND", "Media not found.");
  return { body: await getPrivateObject(media.storage_key), mimeType: media.mime_type, filename: media.filename, publicAsset };
}

async function requireListingManagement(context, listingId) {
  const scope = context.user.role === "agent"
    ? { clause: "owner_user_id = $2", values: [context.user.id] }
    : tenantScope(context, { start: 2 });
  const result = await query(`SELECT id FROM listings WHERE id = $1 AND ${scope.clause}`, [listingId, ...scope.values]);
  if (!result.rowCount) throw new AccessError("NOT_FOUND", "Listing not found.");
}

async function validateFileContents({ body, category, mimeType }) {
  if (category === "image") {
    try {
      const metadata = await sharp(body, { failOn: "error" }).metadata();
      const expected = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" }[mimeType];
      if (!expected || metadata.format !== expected || !metadata.width || !metadata.height || metadata.width > 12000 || metadata.height > 12000) throw new Error("invalid image");
    } catch {
      throw new AccessError("FORBIDDEN", "The image contents do not match a supported image format.");
    }
  }
  if (category === "document" && body.subarray(0, 5).toString("ascii") !== "%PDF-") throw new AccessError("FORBIDDEN", "The document contents are not a valid PDF.");
  if (category === "video") {
    const signature = body.subarray(0, 64).toString("latin1");
    const valid = mimeType === "video/mp4" ? signature.includes("ftyp") : body.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    if (!valid) throw new AccessError("FORBIDDEN", "The video contents do not match a supported video format.");
  }
}

function sanitizeFilename(value) {
  return path.basename(value).replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 180);
}
