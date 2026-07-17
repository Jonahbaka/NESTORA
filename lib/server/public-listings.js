import { hasDatabase, query } from "@/lib/server/db";

export async function listPublicListings({ limit = 100 } = {}) {
  if (!hasDatabase()) return [];
  const result = await query(
    `SELECT l.id, l.title, l.category, l.location, l.price_amount, l.currency, l.description, l.bedrooms, l.bathrooms,
            l.updated_at, l.published_at, u.id AS owner_user_id, u.name AS owner_name, o.name AS organization_name,
            (SELECT lm.id FROM listing_media lm WHERE lm.listing_id = l.id AND lm.kind = 'image' AND lm.status = 'ready'
             ORDER BY lm.sort_order, lm.created_at LIMIT 1) AS image_id
     FROM listings l
     JOIN users u ON u.id = l.owner_user_id AND u.status = 'active'
     LEFT JOIN organizations o ON o.id = l.organization_id AND o.status = 'active'
     WHERE l.status = 'active' AND l.verification_status = 'verified' AND l.is_demo = FALSE
       AND (l.organization_id IS NULL OR o.id IS NOT NULL)
       AND EXISTS (SELECT 1 FROM listing_media lm WHERE lm.listing_id = l.id AND lm.kind = 'image' AND lm.status = 'ready')
     ORDER BY l.published_at DESC NULLS LAST, l.updated_at DESC
     LIMIT $1`,
    [Math.min(Math.max(Number(limit) || 100, 1), 200)],
  );
  return result.rows.map(toPublicListing);
}

export async function getPublicListing(id) {
  if (!hasDatabase()) return null;
  const listingResult = await query(
    `SELECT l.id, l.title, l.category, l.location, l.price_amount, l.currency, l.description, l.bedrooms, l.bathrooms,
            l.updated_at, l.published_at, u.id AS owner_user_id, u.name AS owner_name, o.name AS organization_name
     FROM listings l
     JOIN users u ON u.id = l.owner_user_id AND u.status = 'active'
     LEFT JOIN organizations o ON o.id = l.organization_id AND o.status = 'active'
     WHERE l.id = $1 AND l.status = 'active' AND l.verification_status = 'verified' AND l.is_demo = FALSE
       AND (l.organization_id IS NULL OR o.id IS NOT NULL)
     LIMIT 1`,
    [id],
  );
  if (!listingResult.rowCount) return null;
  const mediaResult = await query(
    `SELECT id, kind, mime_type, filename, sort_order
     FROM listing_media WHERE listing_id = $1 AND status = 'ready' AND kind IN ('image', 'video')
     ORDER BY sort_order, created_at LIMIT 30`,
    [id],
  );
  const images = mediaResult.rows.filter((item) => item.kind === "image").map((item) => `/api/media/${item.id}`);
  if (!images.length) return null;
  return { ...toPublicListing({ ...listingResult.rows[0], image_id: mediaResult.rows.find((item) => item.kind === "image")?.id }), gallery: images, media: mediaResult.rows.map((item) => ({ ...item, url: `/api/media/${item.id}` })) };
}

function toPublicListing(row) {
  const mode = { stay: "stay", rent: "rent", sale: "buy", development: "new" }[row.category];
  const area = String(row.location || "Abuja").split(",")[0].trim() || "Abuja";
  const price = Number(row.price_amount);
  return {
    id: row.id,
    mode,
    category: row.category,
    title: row.title,
    area,
    location: row.location,
    address: row.location,
    price,
    currency: row.currency,
    cadence: mode === "stay" ? "night" : mode === "rent" ? "year" : "total",
    beds: row.bedrooms == null ? null : Number(row.bedrooms),
    baths: row.bathrooms == null ? null : Number(row.bathrooms),
    image: `/api/media/${row.image_id}`,
    description: row.description || "Contact the verified listing professional for full property details.",
    verified: true,
    illustrative: false,
    fresh: freshness(row.updated_at),
    tag: mode === "stay" ? "Verified stay" : mode === "new" ? "Verified development" : "Verified listing",
    host: row.organization_name || row.owner_name,
    hostId: row.owner_user_id,
    fees: mode === "stay" ? { nightly: price } : {},
  };
}

function freshness(value) {
  const updated = new Date(value).getTime();
  const days = Math.max(0, Math.floor((Date.now() - updated) / 86_400_000));
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  return `Updated ${days} days ago`;
}
