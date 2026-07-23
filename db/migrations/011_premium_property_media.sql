-- 011_premium_property_media.sql
-- Premium website content, brand systems, multi-page design metadata,
-- property-media pricing, bookings, operations, and delivered-media attribution.

ALTER TABLE partner_websites ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE partner_websites ADD COLUMN IF NOT EXISTS navigation JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS brand_system JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE marketing_designs ADD COLUMN IF NOT EXISTS pages JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE marketing_designs ADD COLUMN IF NOT EXISTS document_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE marketing_designs ADD COLUMN IF NOT EXISTS mockup_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE marketing_designs ADD COLUMN IF NOT EXISTS autosaved_at TIMESTAMPTZ;
ALTER TABLE marketing_designs ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1;

ALTER TABLE design_exports ADD COLUMN IF NOT EXISTS preset TEXT NOT NULL DEFAULT 'web';
ALTER TABLE design_exports ADD COLUMN IF NOT EXISTS dpi INTEGER;
ALTER TABLE design_exports ADD COLUMN IF NOT EXISTS export_kind TEXT NOT NULL DEFAULT 'artwork';

CREATE TABLE IF NOT EXISTS property_media_settings (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  service_media JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_media_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT UNIQUE NOT NULL,
  requester_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  listing_id TEXT REFERENCES listings(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  customer_type TEXT NOT NULL,
  property_type TEXT NOT NULL,
  property_address TEXT NOT NULL,
  map_location TEXT,
  package_id TEXT NOT NULL,
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  property_scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  drone_requested BOOLEAN NOT NULL DEFAULT false,
  tour_360_requested BOOLEAN NOT NULL DEFAULT false,
  preferred_date DATE NOT NULL,
  alternate_date DATE,
  access_instructions TEXT,
  occupancy_status TEXT NOT NULL,
  special_requirements TEXT,
  estimate JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'quote_pending', 'awaiting_deposit', 'confirmed', 'scheduled', 'capture_completed', 'editing', 'ready_for_review', 'delivered', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'deposit_pending', 'deposit_paid', 'paid', 'refunded', 'failed')),
  consented_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_media_bookings_requester ON property_media_bookings(requester_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_media_bookings_org ON property_media_bookings(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_media_bookings_listing ON property_media_bookings(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_media_bookings_status ON property_media_bookings(status, preferred_date);

CREATE TABLE IF NOT EXISTS property_media_operations (
  booking_id UUID PRIMARY KEY REFERENCES property_media_bookings(id) ON DELETE CASCADE,
  quote JSONB NOT NULL DEFAULT '{}'::jsonb,
  staff_assignment TEXT,
  photographer_assignment TEXT,
  drone_operator_assignment TEXT,
  equipment_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  travel_estimate_ngn INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  production_notes TEXT,
  media_delivery JSONB NOT NULL DEFAULT '{}'::jsonb,
  revision_requests JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_media_booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES property_media_bookings(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_media_booking_events_booking ON property_media_booking_events(booking_id, created_at DESC);

ALTER TABLE listing_media ADD COLUMN IF NOT EXISTS service_booking_id UUID REFERENCES property_media_bookings(id) ON DELETE SET NULL;
ALTER TABLE listing_media ADD COLUMN IF NOT EXISTS media_source TEXT NOT NULL DEFAULT 'user_upload'
  CHECK (media_source IN ('user_upload', 'professional_photography', 'drone', 'tour_360', 'floor_plan', 'brand_asset'));

CREATE INDEX IF NOT EXISTS idx_listing_media_service_booking ON listing_media(service_booking_id) WHERE service_booking_id IS NOT NULL;
