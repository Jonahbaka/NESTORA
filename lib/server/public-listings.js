import { allowDemoContent } from "@/lib/server/demo-environment";
import { hasDatabase, query } from "@/lib/server/db";

const publicColumns = `l.id, l.title, l.category, l.location, l.price_amount, l.currency, l.description, l.bedrooms, l.bathrooms,
  l.address_line1, l.address_line2, l.city, l.state_region, l.postal_code, l.property_type, l.area_sqm, l.features,
  l.fees, l.availability_status, l.available_from, l.tour_enabled, l.updated_at, l.published_at, l.is_demo,
  u.id AS owner_user_id, u.name AS owner_name, o.name AS organization_name`;

export async function listPublicListings({ limit = 100 } = {}) {
  if (!hasDatabase()) return [];
  const demoAllowed = allowDemoContent();
  const result = await query(
    `SELECT ${publicColumns},
            (SELECT lm.id FROM listing_media lm WHERE lm.listing_id = l.id AND lm.kind = 'image' AND lm.status = 'ready'
             ORDER BY lm.is_cover DESC, lm.sort_order, lm.created_at LIMIT 1) AS image_id
     FROM listings l
     JOIN users u ON u.id = l.owner_user_id AND u.status = 'active'
     LEFT JOIN organizations o ON o.id = l.organization_id AND o.status = 'active'
     WHERE l.status = 'active' AND l.verification_status = 'verified' AND (l.is_demo = FALSE OR $2::boolean)
       AND (l.organization_id IS NULL OR o.id IS NOT NULL)
       AND EXISTS (SELECT 1 FROM listing_media lm WHERE lm.listing_id = l.id AND lm.kind = 'image' AND lm.status = 'ready')
     ORDER BY l.published_at DESC NULLS LAST, l.updated_at DESC
     LIMIT $1`,
    [Math.min(Math.max(Number(limit) || 100, 1), 200), demoAllowed],
  );
  return result.rows.map(toPublicListing);
}

export async function getPublicListing(id) {
  if (!hasDatabase()) return null;
  const result = await query(
    `SELECT ${publicColumns}
     FROM listings l
     JOIN users u ON u.id = l.owner_user_id AND u.status = 'active'
     LEFT JOIN organizations o ON o.id = l.organization_id AND o.status = 'active'
     WHERE l.id = $1 AND l.status = 'active' AND l.verification_status = 'verified' AND (l.is_demo = FALSE OR $2::boolean)
       AND (l.organization_id IS NULL OR o.id IS NOT NULL)
     LIMIT 1`,
    [id, allowDemoContent()],
  );
  if (!result.rowCount) return null;
  return withMedia(result.rows[0], false);
}

export async function getManagedListingPreview(id, context) {
  if (!hasDatabase() || !context?.user) return null;
  let clause = "l.owner_user_id = $2";
  let value = context.user.id;
  if (context.isAdmin) { clause = "TRUE"; value = null; }
  else if (context.organization) { clause = "l.organization_id = $2"; value = context.organization.id; }
  const result = await query(
    `SELECT ${publicColumns}
     FROM listings l
     JOIN users u ON u.id = l.owner_user_id
     LEFT JOIN organizations o ON o.id = l.organization_id
     WHERE l.id = $1 AND ${clause}
     LIMIT 1`,
    context.isAdmin ? [id] : [id, value],
  );
  if (!result.rowCount) return null;
  return withMedia(result.rows[0], true);
}

async function withMedia(row, preview) {
  const [mediaResult, roomTypeResult] = await Promise.all([query(
    `SELECT id, kind, mime_type, filename, media_role, scene_label, is_cover, sort_order
     FROM listing_media WHERE listing_id = $1 AND status = 'ready'
     ORDER BY is_cover DESC, sort_order, created_at LIMIT 60`,
    [row.id],
  ), row.category === "stay" ? query(
    `SELECT rt.id, rt.name, rt.capacity, rt.nightly_rate,
            COUNT(r.id) FILTER (WHERE r.status = 'available')::int AS available_rooms
     FROM hotel_room_types rt
     LEFT JOIN hotel_rooms r ON r.room_type_id = rt.id
     WHERE rt.listing_id = $1
     GROUP BY rt.id
     HAVING COUNT(r.id) FILTER (WHERE r.status = 'available') > 0
     ORDER BY rt.nightly_rate, rt.name`,
    [row.id],
  ) : Promise.resolve({ rows: [] })]);
  const galleryMedia = mediaResult.rows.filter((item) => item.kind === "image" && ["cover", "gallery"].includes(item.media_role));
  const fallbackImage = mediaResult.rows.find((item) => item.kind === "image");
  const images = (galleryMedia.length ? galleryMedia : fallbackImage ? [fallbackImage] : []).map((item) => `/api/media/${item.id}`);
  if (!images.length && !preview) return null;
  const listing = toPublicListing({ ...row, image_id: galleryMedia[0]?.id || fallbackImage?.id });
  return {
    ...listing,
    preview,
    gallery: images,
    media: mediaResult.rows.map((item) => ({ ...item, url: `/api/media/${item.id}` })),
    stayRoomTypes: roomTypeResult.rows.map((item) => ({ ...item, nightlyRate: Number(item.nightly_rate) })),
    hasTour: Boolean(row.tour_enabled && mediaResult.rows.some((item) => ["walkthrough", "panorama"].includes(item.media_role))),
  };
}

function toPublicListing(row) {
  const mode = { stay: "stay", rent: "rent", sale: "buy", development: "new" }[row.category];
  const area = String(row.city || row.location || "Abuja").split(",")[0].trim() || "Abuja";
  const price = Number(row.price_amount);
  return {
    id: row.id,
    mode,
    category: row.category,
    title: row.title,
    area,
    location: row.location,
    address: [row.address_line1, row.address_line2, row.city, row.state_region].filter(Boolean).join(", ") || row.location,
    price,
    currency: row.currency,
    cadence: mode === "stay" ? "night" : mode === "rent" ? "year" : "total",
    beds: row.bedrooms == null ? null : Number(row.bedrooms),
    baths: row.bathrooms == null ? null : Number(row.bathrooms),
    areaSqm: row.area_sqm == null ? null : Number(row.area_sqm),
    propertyType: row.property_type,
    features: row.features || [],
    availabilityStatus: row.availability_status || "available",
    availableFrom: row.available_from,
    image: row.image_id ? `/api/media/${row.image_id}` : null,
    description: row.description || "Contact the verified listing professional for full property details.",
    verified: true,
    illustrative: Boolean(row.is_demo),
    fresh: freshness(row.updated_at),
    tag: mode === "stay" ? "Verified stay" : mode === "new" ? "Verified development" : "Verified listing",
    host: row.organization_name || row.owner_name,
    hostId: row.owner_user_id,
    fees: normalizeFees(row.fees, price, mode),
  };
}

function normalizeFees(value, price, mode) {
  const fees = value && typeof value === "object" ? value : {};
  return {
    ...(mode === "stay" ? { nightly: price } : {}),
    serviceCharge: Number(fees.serviceCharge || 0),
    cautionDeposit: Number(fees.cautionDeposit || 0),
    agencyFee: Number(fees.agencyFee || 0),
    legalFee: Number(fees.legalFee || 0),
    cleaningFee: Number(fees.cleaningFee || 0),
  };
}

function freshness(value) {
  const updated = new Date(value).getTime();
  const days = Math.max(0, Math.floor((Date.now() - updated) / 86_400_000));
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  return `Updated ${days} days ago`;
}
