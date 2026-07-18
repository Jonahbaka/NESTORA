import crypto from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { AccessError } from "@/lib/server/authorization";
import { recordAuditEvent } from "@/lib/server/audit";
import { getPool, query } from "@/lib/server/db";
import { allowDemoContent } from "@/lib/server/demo-environment";
import { requireFeature } from "@/lib/server/entitlements";
import { deletePrivateObject, getPrivateObject, putPrivateObject } from "@/lib/server/object-storage";
import { tenantScope } from "@/lib/server/workspace-context";
import { scanUpload } from "@/lib/server/malware-scan";

export async function listListingMedia({ context, listingId }) {
  await requireListingManagement(context, listingId);
  const result = await query(
    `SELECT id, listing_id, filename, mime_type, byte_size, kind, media_role, scene_label, is_cover, status, sort_order, created_at, updated_at
     FROM listing_media WHERE listing_id = $1 AND status <> 'deleted' ORDER BY sort_order, created_at`,
    [listingId],
  );
  return result.rows.map((row) => ({ ...row, byte_size: Number(row.byte_size), url: `/api/media/${row.id}` }));
}

export async function createListingMedia({ context, listingId, file, category, mediaRole, sceneLabel }) {
  await requireFeature(context, "media_upload");
  await requireListingManagement(context, listingId);
  assertMediaRole(category, mediaRole);
  const body = Buffer.from(await file.arrayBuffer());
  await validateFileContents({ body, category, mimeType: file.type });
  await scanUpload({ body, filename: file.name, mimeType: file.type });
  const extension = path.extname(file.name).toLowerCase();
  const ownerSegment = context.organization?.id || context.user.id;
  const storageKey = `listing-media/${ownerSegment}/${listingId}/${crypto.randomUUID()}${extension}`;
  await putPrivateObject({ key: storageKey, body, contentType: file.type });
  try {
    const client = await getPool().connect();
    let result;
    try {
      await client.query("BEGIN");
      const cover = mediaRole === "cover" || (category === "image" && mediaRole === "gallery" && !(await client.query("SELECT 1 FROM listing_media WHERE listing_id = $1 AND status = 'ready' AND is_cover = TRUE LIMIT 1", [listingId])).rowCount);
      if (cover) await client.query("UPDATE listing_media SET is_cover = FALSE, media_role = CASE WHEN media_role = 'cover' THEN 'gallery' ELSE media_role END, updated_at = NOW() WHERE listing_id = $1 AND is_cover = TRUE", [listingId]);
      result = await client.query(
        `INSERT INTO listing_media
           (listing_id, owner_user_id, organization_id, storage_key, filename, mime_type, byte_size, kind, media_role, scene_label, is_cover, status, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ready',
                 COALESCE((SELECT MAX(sort_order) + 1 FROM listing_media WHERE listing_id = $1 AND status = 'ready'), 0))
         RETURNING id, listing_id, filename, mime_type, byte_size, kind, media_role, scene_label, is_cover, status, sort_order, created_at, updated_at`,
        [listingId, context.user.id, context.organization?.id || null, storageKey, sanitizeFilename(file.name), file.type, body.length, category, cover ? "cover" : mediaRole, normalizedSceneLabel(mediaRole, sceneLabel), cover],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => null);
      throw error;
    } finally {
      client.release();
    }
    await recordAuditEvent({ actorId: context.user.id, action: "listing_media.created", targetType: "listing_media", targetId: result.rows[0].id, metadata: { listingId, category, byteSize: body.length } });
    return { ...result.rows[0], byte_size: Number(result.rows[0].byte_size), url: `/api/media/${result.rows[0].id}` };
  } catch (error) {
    await deletePrivateObject(storageKey).catch(() => null);
    throw error;
  }
}

export async function removeListingMedia({ context, mediaId }) {
  const result = await query("SELECT id, listing_id, storage_key, is_cover FROM listing_media WHERE id = $1 AND status <> 'deleted' LIMIT 1", [mediaId]);
  const media = result.rows[0];
  if (!media) throw new AccessError("NOT_FOUND", "Media not found.");
  await requireListingManagement(context, media.listing_id);
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE listing_media SET status = 'deleted', is_cover = FALSE, updated_at = NOW() WHERE id = $1", [mediaId]);
    if (media.is_cover) {
      await client.query(
        `UPDATE listing_media SET is_cover = TRUE, media_role = 'cover', updated_at = NOW()
         WHERE id = (SELECT id FROM listing_media WHERE listing_id = $1 AND status = 'ready' AND kind = 'image' ORDER BY sort_order, created_at LIMIT 1)`,
        [media.listing_id],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
  await deletePrivateObject(media.storage_key);
  await recordAuditEvent({ actorId: context.user.id, action: "listing_media.deleted", targetType: "listing_media", targetId: mediaId, metadata: { listingId: media.listing_id } });
  return { deleted: true };
}

export async function updateListingMedia({ context, mediaId, action, mediaRole, sceneLabel, direction }) {
  const existing = await query("SELECT id, listing_id, kind, media_role, sort_order FROM listing_media WHERE id = $1 AND status = 'ready' LIMIT 1", [mediaId]);
  const media = existing.rows[0];
  if (!media) throw new AccessError("NOT_FOUND", "Media not found.");
  await requireListingManagement(context, media.listing_id);
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    let result;
    if (action === "setRole") {
      assertMediaRole(media.kind, mediaRole);
      if (mediaRole === "cover") await client.query("UPDATE listing_media SET is_cover = FALSE, media_role = CASE WHEN media_role = 'cover' THEN 'gallery' ELSE media_role END, updated_at = NOW() WHERE listing_id = $1 AND status = 'ready'", [media.listing_id]);
      result = await client.query(
        `UPDATE listing_media SET media_role = $1, scene_label = $2, is_cover = $3, updated_at = NOW()
         WHERE id = $4 RETURNING id, listing_id, filename, mime_type, byte_size, kind, media_role, scene_label, is_cover, status, sort_order, created_at, updated_at`,
        [mediaRole, normalizedSceneLabel(mediaRole, sceneLabel), mediaRole === "cover", mediaId],
      );
    } else if (action === "move") {
      const operator = direction === "up" ? "<" : ">";
      const order = direction === "up" ? "DESC" : "ASC";
      const neighbour = await client.query(
        `SELECT id, sort_order FROM listing_media WHERE listing_id = $1 AND status = 'ready' AND sort_order ${operator} $2 ORDER BY sort_order ${order}, created_at ${order} LIMIT 1 FOR UPDATE`,
        [media.listing_id, media.sort_order],
      );
      if (neighbour.rowCount) {
        await client.query("UPDATE listing_media SET sort_order = $1, updated_at = NOW() WHERE id = $2", [neighbour.rows[0].sort_order, mediaId]);
        await client.query("UPDATE listing_media SET sort_order = $1, updated_at = NOW() WHERE id = $2", [media.sort_order, neighbour.rows[0].id]);
      }
      result = await client.query("SELECT id, listing_id, filename, mime_type, byte_size, kind, media_role, scene_label, is_cover, status, sort_order, created_at, updated_at FROM listing_media WHERE id = $1", [mediaId]);
    } else {
      throw new AccessError("NOT_FOUND", "Media action not found.");
    }
    await client.query("COMMIT");
    await recordAuditEvent({ actorId: context.user.id, action: `listing_media.${action === "move" ? "reordered" : "updated"}`, targetType: "listing_media", targetId: mediaId, metadata: { listingId: media.listing_id, mediaRole: mediaRole || media.media_role, direction: direction || null } });
    return { ...result.rows[0], byte_size: Number(result.rows[0].byte_size), url: `/api/media/${mediaId}` };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
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
  const publicAsset = media.listing_status === "active" && media.verification_status === "verified" && (!media.is_demo || allowDemoContent());
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

function assertMediaRole(kind, mediaRole) {
  const allowed = {
    image: new Set(["gallery", "cover", "floor_plan", "panorama"]),
    video: new Set(["walkthrough"]),
    document: new Set(["floor_plan"]),
  };
  if (!allowed[kind]?.has(mediaRole)) throw new AccessError("VALIDATION_ERROR", "Choose a media purpose that matches this file type.");
}

function normalizedSceneLabel(mediaRole, value) {
  if (mediaRole !== "panorama") return null;
  const label = String(value || "").trim();
  if (label.length < 2 || label.length > 80) throw new AccessError("VALIDATION_ERROR", "Add a room label between 2 and 80 characters for each 360 scene.");
  return label;
}
