BEGIN;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS state_region TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS area_sqm NUMERIC(12,2) CHECK (area_sqm IS NULL OR area_sqm > 0);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS features TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS fees JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'available'
  CHECK (availability_status IN ('available', 'coming_soon', 'occupied', 'unavailable'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS available_from DATE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS tour_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS review_note TEXT;

ALTER TABLE listing_media ADD COLUMN IF NOT EXISTS media_role TEXT NOT NULL DEFAULT 'gallery'
  CHECK (media_role IN ('gallery', 'cover', 'walkthrough', 'floor_plan', 'panorama'));
ALTER TABLE listing_media ADD COLUMN IF NOT EXISTS scene_label TEXT;
ALTER TABLE listing_media ADD COLUMN IF NOT EXISTS is_cover BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE listing_media ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS listing_media_single_cover_idx
  ON listing_media (listing_id)
  WHERE is_cover = TRUE AND status = 'ready';

CREATE TABLE IF NOT EXISTS marketing_attribution_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL UNIQUE REFERENCES marketing_materials(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  destination_path TEXT NOT NULL CHECK (destination_path LIKE '/%' AND destination_path NOT LIKE '//%'),
  listing_id TEXT REFERENCES listings(id) ON DELETE SET NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_attribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES marketing_attribution_links(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  anonymous_session UUID NOT NULL,
  referrer_host TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS marketing_attribution_events_link_idx
  ON marketing_attribution_events (link_id, created_at DESC);

COMMIT;
