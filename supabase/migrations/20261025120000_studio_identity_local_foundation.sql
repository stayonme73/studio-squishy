-- STUDIO-DURABLE-PERSISTENCE-USERS-AND-CLAIM-1
-- Local / test foundation only. Not for Production without Owner authorization.

CREATE TABLE IF NOT EXISTS studio_users (
  user_id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL,
  envelope JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS studio_users_email_normalized_idx
  ON studio_users (email_normalized);

CREATE TABLE IF NOT EXISTS studio_email_verification_tokens (
  token_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES studio_users (user_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS studio_email_verification_tokens_hash_idx
  ON studio_email_verification_tokens (token_hash);

CREATE INDEX IF NOT EXISTS studio_email_verification_tokens_user_idx
  ON studio_email_verification_tokens (user_id);

CREATE TABLE IF NOT EXISTS studio_password_reset_tokens (
  token_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES studio_users (user_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS studio_password_reset_tokens_hash_idx
  ON studio_password_reset_tokens (token_hash);

CREATE INDEX IF NOT EXISTS studio_password_reset_tokens_user_idx
  ON studio_password_reset_tokens (user_id);

CREATE TABLE IF NOT EXISTS studio_auth_rate_limits (
  rate_key TEXT PRIMARY KEY,
  bucket_count INTEGER NOT NULL,
  window_started_at_ms BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studio_project_claim_receipts (
  receipt_id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  checkout_session_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  envelope JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS studio_project_claim_receipts_hash_idx
  ON studio_project_claim_receipts (token_hash);

CREATE INDEX IF NOT EXISTS studio_project_claim_receipts_campaign_idx
  ON studio_project_claim_receipts (campaign_id);
