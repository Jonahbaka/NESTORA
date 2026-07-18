BEGIN;

ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS specialisations TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  UPDATE professional_profiles p
  SET slug = COALESCE(
    NULLIF(regexp_replace(lower(u.name), '[^a-z0-9]+', '-', 'g'), ''),
    'professional'
  ) || '-' || substring(p.user_id::text, 1, 8)
  FROM users u
  WHERE u.id = p.user_id AND p.slug IS NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS professional_profiles_slug_idx
  ON professional_profiles (slug)
  WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS professional_profile_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
