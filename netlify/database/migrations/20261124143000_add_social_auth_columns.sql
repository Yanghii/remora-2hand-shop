-- Add social login columns (Google Gmail & Zalo OAuth) to users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS provider_id TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_id
  ON users (auth_provider, provider_id)
  WHERE provider_id IS NOT NULL;
