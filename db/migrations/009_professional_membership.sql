-- 009_professional_membership.sql
-- Subscription, entitlement, partner websites, brand kits, marketing studio, analytics

-- ============================================================
-- ENHANCED SUBSCRIPTIONS & ENTITLEMENTS
-- ============================================================

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_interval TEXT NOT NULL DEFAULT 'monthly'
  CHECK (billing_interval IN ('monthly', 'annual', 'founding_partner', 'trial', 'promotional'));
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS founding_partner BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS promotional_entitlement TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS entitlement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entitlement_history_subscription ON entitlement_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_history_created ON entitlement_history(created_at DESC);

-- ============================================================
-- PARTNER WEBSITES
-- ============================================================

CREATE TABLE IF NOT EXISTS partner_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE NOT NULL DEFAULT 'website-' || gen_random_uuid()::text,
  owner_user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  template_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  subdomain TEXT NOT NULL,
  custom_domain TEXT,
  domain_verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'preview', 'published', 'unpublished', 'suspended', 'expired')),
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  logo_media_id UUID,
  cover_media_id UUID,
  brand_kit_id UUID,
  contact JSONB DEFAULT '{}'::jsonb,
  seo JSONB DEFAULT '{}'::jsonb,
  analytics_enabled BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_websites_subdomain ON partner_websites(subdomain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_websites_custom_domain ON partner_websites(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_websites_owner ON partner_websites(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_partner_websites_org ON partner_websites(organization_id);
CREATE INDEX IF NOT EXISTS idx_partner_websites_status ON partner_websites(status);

-- ============================================================
-- BRAND KITS
-- ============================================================

CREATE TABLE IF NOT EXISTS brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE NOT NULL DEFAULT 'brand-' || gen_random_uuid()::text,
  owner_user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  is_organization_kit BOOLEAN NOT NULL DEFAULT false,
  logo_media_id UUID,
  alternate_logo_media_id UUID,
  brand_colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  fonts JSONB NOT NULL DEFAULT '{}'::jsonb,
  contact_footer TEXT,
  website_url TEXT,
  social_handles JSONB DEFAULT '{}'::jsonb,
  disclaimer TEXT,
  default_qr_style TEXT DEFAULT 'standard',
  approved_images JSONB DEFAULT '[]'::jsonb,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_kits_owner ON brand_kits(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_brand_kits_org ON brand_kits(organization_id);

-- ============================================================
-- MARKETING STUDIO DESIGNS
-- ============================================================

CREATE TABLE IF NOT EXISTS marketing_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE NOT NULL DEFAULT 'design-' || gen_random_uuid()::text,
  owner_user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  brand_kit_id UUID REFERENCES brand_kits(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  template_id TEXT,
  is_template BOOLEAN NOT NULL DEFAULT false,
  is_organization_template BOOLEAN NOT NULL DEFAULT false,
  is_approved_template BOOLEAN NOT NULL DEFAULT false,
  canvas_width INTEGER NOT NULL DEFAULT 595,
  canvas_height INTEGER NOT NULL DEFAULT 842,
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  dynamic_bindings JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'completed', 'archived')),
  thumbnail_storage_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_designs_owner ON marketing_designs(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_designs_org ON marketing_designs(organization_id);
CREATE INDEX IF NOT EXISTS idx_marketing_designs_kind ON marketing_designs(kind);
CREATE INDEX IF NOT EXISTS idx_marketing_designs_template ON marketing_designs(is_template) WHERE is_template = true;

-- ============================================================
-- DESIGN EXPORTS
-- ============================================================

CREATE TABLE IF NOT EXISTS design_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES marketing_designs(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'png', 'jpeg', 'webp')),
  storage_key TEXT NOT NULL,
  file_size_bytes BIGINT,
  page_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_exports_design ON design_exports(design_id);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  listing_id TEXT REFERENCES listings(id),
  event_type TEXT NOT NULL,
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_org ON analytics_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_listing ON analytics_events(listing_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_source ON analytics_events(source);

-- ============================================================
-- ANALYTICS AGGREGATES (materialized for performance)
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  listing_id TEXT REFERENCES listings(id),
  event_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(date, organization_id, user_id, listing_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_org ON analytics_daily(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_user ON analytics_daily(user_id);

-- ============================================================
-- WEBSITE VISITS (for partner website analytics)
-- ============================================================

CREATE TABLE IF NOT EXISTS website_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES partner_websites(id) ON DELETE CASCADE,
  visitor_ip INET,
  user_agent TEXT,
  referrer TEXT,
  path TEXT NOT NULL DEFAULT '/',
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_visits_website ON website_visits(website_id);
CREATE INDEX IF NOT EXISTS idx_website_visits_created ON website_visits(created_at DESC);

-- ============================================================
-- SUBDOMAIN RESERVATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS reserved_subdomains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLAN DEFINITIONS (configurable without code changes)
-- ============================================================

CREATE TABLE IF NOT EXISTS plan_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  audience TEXT,
  monthly_price_ngn INTEGER NOT NULL DEFAULT 0,
  annual_price_ngn INTEGER,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default plan definitions
INSERT INTO plan_definitions (plan_id, name, audience, monthly_price_ngn, annual_price_ngn, limits, features, sort_order) VALUES
  ('basic', 'Basic', 'New agents and individual landlords', 0, 0,
    '{"users":1,"activeListings":5,"branches":0,"hostedTours":0,"storageMb":100,"pdfExports":5,"imageExports":10,"marketingDesigns":3,"websites":0,"brandKits":0,"teamSeats":0}',
    '["media_upload","basic_analytics","public_profile","basic_inbox","availability_reminders"]', 1),
  ('pro', 'Pro', 'Active independent professionals', 30000, 288000,
    '{"users":2,"activeListings":40,"branches":0,"hostedTours":5,"storageMb":500,"pdfExports":50,"imageExports":100,"marketingDesigns":20,"websites":1,"brandKits":1,"teamSeats":0}',
    '["media_upload","marketing_generation","lead_pipeline","inspection_calendar","advanced_analytics","pdf_export","image_export","qr_generation","partner_website","brand_kit","marketing_studio","follow_up_reminders","social_formats"]', 2),
  ('team', 'Team', 'Small agencies and operating teams', 80000, 768000,
    '{"users":5,"activeListings":150,"branches":1,"hostedTours":20,"storageMb":2000,"pdfExports":200,"imageExports":500,"marketingDesigns":50,"websites":1,"brandKits":2,"teamSeats":5}',
    '["media_upload","marketing_generation","lead_pipeline","inspection_calendar","advanced_analytics","pdf_export","image_export","qr_generation","partner_website","brand_kit","marketing_studio","follow_up_reminders","social_formats","team_management","shared_inbox","shared_media_library","shared_templates","approval_workflows","team_analytics"]', 3),
  ('agency', 'Agency', 'Multi-branch property businesses', 200000, 1920000,
    '{"users":20,"activeListings":500,"branches":5,"hostedTours":60,"storageMb":10000,"pdfExports":1000,"imageExports":2500,"marketingDesigns":200,"websites":1,"brandKits":5,"teamSeats":20}',
    '["media_upload","marketing_generation","lead_pipeline","inspection_calendar","advanced_analytics","pdf_export","image_export","qr_generation","partner_website","brand_kit","marketing_studio","follow_up_reminders","social_formats","team_management","shared_inbox","shared_media_library","shared_templates","approval_workflows","team_analytics","lead_routing","external_delivery","custom_domain","bulk_import","api_access","webhooks","compliance_oversight","branch_management","csv_export","scheduled_reports"]', 4),
  ('developer-studio', 'Developer Studio', 'Property developers', 250000, 2400000,
    '{"users":10,"activeListings":20,"developments":3,"units":500,"hostedTours":30,"storageMb":5000,"pdfExports":500,"imageExports":1000,"marketingDesigns":100,"websites":1,"brandKits":2,"teamSeats":10}',
    '["media_upload","marketing_generation","developer_inventory","advanced_analytics","pdf_export","image_export","qr_generation","partner_website","brand_kit","marketing_studio","follow_up_reminders","social_formats","team_management","shared_templates","external_delivery","development_microsites","payment_plan_sheets","construction_updates","buyer_reports"]', 5),
  ('host-centre', 'Host Centre', 'Hotels and short-stay operators', 40000, 384000,
    '{"users":3,"activeListings":10,"rooms":50,"hostedTours":10,"storageMb":1000,"pdfExports":100,"imageExports":200,"marketingDesigns":30,"websites":1,"brandKits":1,"teamSeats":3}',
    '["media_upload","marketing_generation","hotel_inventory","advanced_analytics","pdf_export","image_export","qr_generation","partner_website","brand_kit","marketing_studio","follow_up_reminders","social_formats","team_management","external_delivery","reservation_management","guest_messaging","availability_calendar","booking_analytics"]', 6),
  ('enterprise', 'Enterprise', 'Large organisations', 0, 0,
    '{"users":100000,"activeListings":100000,"branches":100,"hostedTours":10000,"storageMb":100000,"pdfExports":100000,"imageExports":100000,"marketingDesigns":10000,"websites":10,"brandKits":100,"teamSeats":100000}',
    '["media_upload","marketing_generation","lead_pipeline","inspection_calendar","advanced_analytics","pdf_export","image_export","qr_generation","partner_website","brand_kit","marketing_studio","follow_up_reminders","social_formats","team_management","shared_inbox","shared_media_library","shared_templates","approval_workflows","team_analytics","lead_routing","external_delivery","custom_domain","bulk_import","api_access","webhooks","compliance_oversight","branch_management","csv_export","scheduled_reports","developer_inventory","hotel_inventory","development_microsites","reservation_management","guest_messaging","sso_ready","custom_reporting","data_export","dedicated_onboarding","custom_templates","service_level_support"]', 7)
ON CONFLICT (plan_id) DO NOTHING;

-- ============================================================
-- RESERVED SUBDOMAINS (prevent abuse)
-- ============================================================

INSERT INTO reserved_subdomains (subdomain, reason) VALUES
  ('www', 'reserved'), ('api', 'reserved'), ('admin', 'reserved'), ('mail', 'reserved'),
  ('app', 'reserved'), ('help', 'reserved'), ('support', 'reserved'), ('docs', 'reserved'),
  ('status', 'reserved'), ('blog', 'reserved'), ('about', 'reserved'), ('contact', 'reserved'),
  ('terms', 'reserved'), ('privacy', 'reserved'), ('security', 'reserved'), ('trust', 'reserved'),
  ('my', 'reserved'), ('nestora', 'reserved'), ('demo', 'reserved'), ('test', 'reserved'),
  ('dev', 'reserved'), ('staging', 'reserved'), ('cdn', 'reserved'), ('static', 'reserved'),
  ('media', 'reserved'), ('assets', 'reserved'), ('files', 'reserved'), ('uploads', 'reserved'),
  ('auth', 'reserved'), ('login', 'reserved'), ('signup', 'reserved'), ('register', 'reserved'),
  ('workspace', 'reserved'), ('dashboard', 'reserved'), ('console', 'reserved')
ON CONFLICT (subdomain) DO NOTHING;