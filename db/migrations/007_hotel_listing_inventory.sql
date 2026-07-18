BEGIN;

ALTER TABLE hotel_room_types
  ADD COLUMN IF NOT EXISTS listing_id TEXT REFERENCES listings(id) ON DELETE RESTRICT;

UPDATE hotel_room_types rt
SET listing_id = (
  SELECT l.id
  FROM listings l
  WHERE l.organization_id = rt.organization_id AND l.category = 'stay'
  ORDER BY l.updated_at DESC, l.id
  LIMIT 1
)
WHERE rt.listing_id IS NULL;

CREATE INDEX IF NOT EXISTS hotel_room_types_listing_idx
  ON hotel_room_types (listing_id, capacity, nightly_rate);

CREATE OR REPLACE FUNCTION enforce_hotel_room_type_listing_scope()
RETURNS TRIGGER AS $$
DECLARE
  listing_organization UUID;
  listing_category TEXT;
BEGIN
  IF NEW.listing_id IS NULL THEN
    RAISE EXCEPTION 'Hotel room types require a stay listing';
  END IF;

  SELECT organization_id, category
  INTO listing_organization, listing_category
  FROM listings
  WHERE id = NEW.listing_id;

  IF listing_category IS DISTINCT FROM 'stay' OR listing_organization IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Hotel room type listing must be a stay in the same organization';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hotel_room_type_listing_scope ON hotel_room_types;
CREATE TRIGGER hotel_room_type_listing_scope
  BEFORE INSERT OR UPDATE OF listing_id, organization_id ON hotel_room_types
  FOR EACH ROW EXECUTE FUNCTION enforce_hotel_room_type_listing_scope();

COMMIT;
