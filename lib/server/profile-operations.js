import crypto from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { AccessError } from "@/lib/server/authorization";
import { recordAuditEvent } from "@/lib/server/audit";
import { query } from "@/lib/server/db";
import { allowDemoContent } from "@/lib/server/demo-environment";
import { scanUpload } from "@/lib/server/malware-scan";
import { deletePrivateObject, getPrivateObject, putPrivateObject } from "@/lib/server/object-storage";

const professionalRoles = new Set(["agent", "agency_admin", "developer", "host"]);

export async function readProfessionalProfile(context) {
  requireProfessional(context);
  const result = await query(
    `SELECT p.slug, p.headline, p.biography, p.service_areas, p.languages, p.specialisations,
            p.verification_status, p.is_public, p.updated_at, pm.id AS image_media_id,
            o.id AS organization_id, o.name AS organization_name, o.kind AS organization_kind
     FROM users u
     LEFT JOIN professional_profiles p ON p.user_id = u.id
     LEFT JOIN professional_profile_media pm ON pm.user_id = u.id AND pm.status = 'ready'
     LEFT JOIN organizations o ON o.id = COALESCE(p.organization_id, $2::uuid)
     WHERE u.id = $1
     LIMIT 1`,
    [context.user.id, context.organization?.id || null],
  );
  const row = result.rows[0] || {};
  return {
    profile: {
      slug: row.slug || null,
      headline: row.headline || "",
      biography: row.biography || "",
      serviceAreas: row.service_areas || [],
      languages: row.languages || [],
      specialisations: row.specialisations || [],
      verificationStatus: row.verification_status || "not_submitted",
      isPublic: row.is_public ?? true,
      updatedAt: row.updated_at || null,
      imageUrl: row.image_media_id ? `/api/profile-media/${row.image_media_id}` : null,
      publicUrl: row.slug ? `/profile/${row.slug}` : null,
      organization: row.organization_id ? { id: row.organization_id, name: row.organization_name, kind: row.organization_kind } : null,
    },
  };
}

export async function updateProfessionalProfile(input, context) {
  requireProfessional(context);
  const existing = await query("SELECT slug FROM professional_profiles WHERE user_id = $1 LIMIT 1", [context.user.id]);
  const slug = existing.rows[0]?.slug || `${slugify(context.user.name)}-${String(context.user.id).slice(0, 8)}`;
  const organizationId = context.organization?.id || null;
  const result = await query(
    `INSERT INTO professional_profiles
       (user_id, organization_id, slug, headline, biography, service_areas, languages, specialisations, is_public, verification_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'not_submitted')
     ON CONFLICT (user_id) DO UPDATE SET
       organization_id = EXCLUDED.organization_id,
       headline = EXCLUDED.headline,
       biography = EXCLUDED.biography,
       service_areas = EXCLUDED.service_areas,
       languages = EXCLUDED.languages,
       specialisations = EXCLUDED.specialisations,
       is_public = EXCLUDED.is_public,
       updated_at = NOW()
     RETURNING slug, headline, biography, service_areas, languages, specialisations, verification_status, is_public, updated_at`,
    [context.user.id, organizationId, slug, input.headline, input.biography, input.serviceAreas, input.languages, input.specialisations, input.isPublic],
  );
  await recordAuditEvent({ actorId: context.user.id, action: "professional_profile.updated", targetType: "professional_profile", targetId: context.user.id, metadata: { organizationId, isPublic: input.isPublic } });
  return { profile: result.rows[0], publicUrl: `/profile/${slug}` };
}

export async function createProfileImage({ context, file }) {
  requireProfessional(context);
  const body = Buffer.from(await file.arrayBuffer());
  await validateProfileImage(body, file.type);
  await scanUpload({ body, filename: file.name, mimeType: file.type });
  const storageKey = `profile-media/${context.user.id}/${crypto.randomUUID()}${path.extname(file.name).toLowerCase()}`;
  await putPrivateObject({ key: storageKey, body, contentType: file.type });
  const previous = await query("SELECT storage_key FROM professional_profile_media WHERE user_id = $1 AND status = 'ready' LIMIT 1", [context.user.id]);
  try {
    const result = await query(
      `INSERT INTO professional_profile_media (user_id, storage_key, filename, mime_type, byte_size, status)
       VALUES ($1, $2, $3, $4, $5, 'ready')
       ON CONFLICT (user_id) DO UPDATE SET storage_key = EXCLUDED.storage_key, filename = EXCLUDED.filename,
         mime_type = EXCLUDED.mime_type, byte_size = EXCLUDED.byte_size, status = 'ready', updated_at = NOW()
       RETURNING id, filename, mime_type, byte_size, updated_at`,
      [context.user.id, storageKey, sanitizeFilename(file.name), file.type, body.length],
    );
    if (previous.rows[0]?.storage_key && previous.rows[0].storage_key !== storageKey) await deletePrivateObject(previous.rows[0].storage_key).catch(() => null);
    await recordAuditEvent({ actorId: context.user.id, action: "professional_profile.image_updated", targetType: "professional_profile_media", targetId: result.rows[0].id, metadata: { byteSize: body.length } });
    return { ...result.rows[0], byte_size: Number(result.rows[0].byte_size), url: `/api/profile-media/${result.rows[0].id}` };
  } catch (error) {
    await deletePrivateObject(storageKey).catch(() => null);
    throw error;
  }
}

export async function removeProfileImage(context) {
  requireProfessional(context);
  const result = await query("DELETE FROM professional_profile_media WHERE user_id = $1 RETURNING id, storage_key", [context.user.id]);
  const media = result.rows[0];
  if (!media) throw new AccessError("NOT_FOUND", "Profile image not found.");
  await deletePrivateObject(media.storage_key);
  await recordAuditEvent({ actorId: context.user.id, action: "professional_profile.image_removed", targetType: "professional_profile_media", targetId: media.id });
  return { deleted: true };
}

export async function readProfileImageObject({ mediaId, userId = null }) {
  const result = await query(
    `SELECT pm.storage_key, pm.mime_type, pm.filename, pm.user_id, p.is_public, p.is_demo, u.status AS user_status
     FROM professional_profile_media pm
     JOIN professional_profiles p ON p.user_id = pm.user_id
     JOIN users u ON u.id = pm.user_id
     WHERE pm.id = $1 AND pm.status = 'ready'
     LIMIT 1`,
    [mediaId],
  );
  const media = result.rows[0];
  if (!media) throw new AccessError("NOT_FOUND", "Profile image not found.");
  const publicAsset = media.is_public && media.user_status === "active" && (!media.is_demo || allowDemoContent());
  if (!publicAsset && media.user_id !== userId) throw new AccessError("NOT_FOUND", "Profile image not found.");
  return { body: await getPrivateObject(media.storage_key), mimeType: media.mime_type, filename: media.filename, publicAsset };
}

async function validateProfileImage(body, mimeType) {
  try {
    const metadata = await sharp(body, { failOn: "error" }).metadata();
    const expected = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" }[mimeType];
    if (!expected || metadata.format !== expected || !metadata.width || !metadata.height || metadata.width > 6000 || metadata.height > 6000) throw new Error("invalid image");
  } catch {
    throw new AccessError("FORBIDDEN", "Choose a valid JPG, PNG, or WebP profile image.");
  }
}

function requireProfessional(context) {
  if (!professionalRoles.has(context.user.role)) throw new AccessError("FORBIDDEN", "A professional account is required.");
}

function slugify(value) {
  return String(value || "professional").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "professional";
}

function sanitizeFilename(value) {
  return path.basename(value).replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 180);
}
