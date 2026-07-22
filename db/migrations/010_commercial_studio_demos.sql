-- 010_commercial_studio_demos.sql
-- Durable public enquiries for partner websites.

ALTER TABLE partner_websites ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'agent'
  CHECK (kind IN ('agent', 'agency', 'developer', 'hospitality', 'serviced_apartments', 'short_stay'));

CREATE TABLE IF NOT EXISTS website_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES partner_websites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed', 'spam')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_enquiries_website ON website_enquiries(website_id, created_at DESC);
