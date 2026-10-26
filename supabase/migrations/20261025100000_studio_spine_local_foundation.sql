-- STUDIO-DURABLE-PERSISTENCE-IMPLEMENT-1
-- Local foundation schema only. Do not apply to production without Owner authorization.

CREATE TABLE IF NOT EXISTS studio_campaigns (
  campaign_id TEXT PRIMARY KEY,
  client_user_id TEXT,
  sync_version INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL,
  envelope JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studio_campaign_tasks (
  campaign_id TEXT PRIMARY KEY REFERENCES studio_campaigns (campaign_id) ON DELETE CASCADE,
  synced_at TIMESTAMPTZ NOT NULL,
  envelope JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studio_campaign_materials (
  campaign_id TEXT PRIMARY KEY REFERENCES studio_campaigns (campaign_id) ON DELETE CASCADE,
  synced_at TIMESTAMPTZ NOT NULL,
  envelope JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studio_payment_events (
  event_id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL,
  envelope JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS studio_payment_events_campaign_id_idx
  ON studio_payment_events (campaign_id);

CREATE TABLE IF NOT EXISTS studio_payment_sessions (
  checkout_session_id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  envelope JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS studio_payment_sessions_campaign_id_idx
  ON studio_payment_sessions (campaign_id);
