BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('agency', 'developer', 'hotel')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'restricted', 'suspended')),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'agent', 'sales', 'front_desk')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS professional_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  headline TEXT NOT NULL,
  biography TEXT NOT NULL,
  service_areas TEXT[] NOT NULL DEFAULT '{}',
  verification_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (verification_status IN ('not_submitted', 'pending', 'revision_requested', 'verified', 'rejected')),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('rent', 'sale', 'stay', 'development')),
  location TEXT NOT NULL,
  price_amount BIGINT NOT NULL CHECK (price_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'stale', 'expired', 'suspended', 'rejected', 'archived')),
  verification_status TEXT NOT NULL DEFAULT 'illustrative' CHECK (verification_status IN ('illustrative', 'pending', 'verified', 'rejected')),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listings_owner_idx ON listings (owner_user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS listings_org_idx ON listings (organization_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS developments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'suspended')),
  completion_date DATE,
  construction_progress SMALLINT NOT NULL DEFAULT 0 CHECK (construction_progress BETWEEN 0 AND 100),
  payment_plan_summary TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS development_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  development_id UUID NOT NULL REFERENCES developments(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  floors SMALLINT NOT NULL CHECK (floors > 0),
  UNIQUE (development_id, code)
);

CREATE TABLE IF NOT EXISTS unit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  development_id UUID NOT NULL REFERENCES developments(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  bedrooms SMALLINT NOT NULL CHECK (bedrooms >= 0),
  bathrooms NUMERIC(4,1) NOT NULL CHECK (bathrooms >= 0),
  area_sqm NUMERIC(10,2) NOT NULL CHECK (area_sqm > 0),
  price_amount BIGINT NOT NULL CHECK (price_amount >= 0),
  UNIQUE (development_id, code)
);

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  development_id UUID NOT NULL REFERENCES developments(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES development_blocks(id) ON DELETE CASCADE,
  unit_type_id UUID NOT NULL REFERENCES unit_types(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  floor SMALLINT NOT NULL CHECK (floor >= 0),
  status TEXT NOT NULL CHECK (status IN ('available', 'reserved', 'sold', 'unavailable')),
  price_amount BIGINT NOT NULL CHECK (price_amount >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (development_id, code)
);

CREATE INDEX IF NOT EXISTS units_inventory_idx ON units (development_id, status, unit_type_id);

CREATE TABLE IF NOT EXISTS hotel_room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  capacity SMALLINT NOT NULL CHECK (capacity > 0),
  nightly_rate BIGINT NOT NULL CHECK (nightly_rate >= 0),
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES hotel_room_types(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'occupied', 'maintenance', 'inactive')),
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  listing_id TEXT REFERENCES listings(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('listing', 'profile', 'qr', 'tour', 'hotel', 'development')),
  stage TEXT NOT NULL CHECK (stage IN ('new', 'contacted', 'qualified', 'inspection', 'reservation', 'won', 'lost')),
  next_action TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_owner_idx ON leads (owner_user_id, stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS leads_org_idx ON leads (organization_id, stage, updated_at DESC);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT NOT NULL UNIQUE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('listing', 'development', 'reservation', 'support')),
  subject_id TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  muted_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  attachment_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT NOT NULL UNIQUE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('proposed', 'confirmed', 'reschedule_requested', 'cancelled', 'completed')),
  accuracy_score SMALLINT CHECK (accuracy_score BETWEEN 1 AND 5),
  feedback TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inspections_professional_idx ON inspections (professional_id, scheduled_at, status);

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT NOT NULL UNIQUE,
  guest_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES hotel_rooms(id) ON DELETE RESTRICT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests SMALLINT NOT NULL CHECK (guests > 0),
  total_amount BIGINT NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL CHECK (status IN ('requested', 'confirmed', 'declined', 'cancelled', 'completed')),
  special_request TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (check_out > check_in)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_no_double_booking') THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_no_double_booking
      EXCLUDE USING gist (room_id WITH =, daterange(check_in, check_out, '[)') WITH &&)
      WHERE (status IN ('requested', 'confirmed'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'agent', 'sales', 'front_desk')),
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'trial', 'grace', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK ((user_id IS NOT NULL) <> (organization_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  deep_link TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'captured' CHECK (delivery_status IN ('captured', 'queued', 'sent', 'failed')),
  read_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, read_at, created_at DESC);

CREATE TABLE IF NOT EXISTS verification_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT NOT NULL UNIQUE,
  subject_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('identity', 'agent', 'developer', 'hotel')),
  status TEXT NOT NULL CHECK (status IN ('submitted', 'approved', 'revision_requested', 'rejected', 'expired')),
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_note TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (subject_user_id IS NOT NULL OR organization_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS listing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT NOT NULL UNIQUE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  resolution TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  listing_id TEXT REFERENCES listings(id) ON DELETE CASCADE,
  development_id UUID REFERENCES developments(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('agent_profile', 'rental_flyer', 'sale_brochure', 'development_brochure', 'hotel_flyer', 'payment_plan', 'qr_poster', 'comparison_sheet')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'generated', 'archived')),
  storage_key TEXT,
  qr_target TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
