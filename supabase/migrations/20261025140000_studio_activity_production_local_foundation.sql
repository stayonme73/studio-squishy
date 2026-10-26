-- STUDIO-DURABLE-PERSISTENCE-ACTIVITY-AND-PRODUCTION-1
-- Local / test foundation only. Not for Production without Owner authorization.

CREATE TABLE IF NOT EXISTS studio_project_activity (
  campaign_id TEXT PRIMARY KEY REFERENCES studio_campaigns (campaign_id) ON DELETE CASCADE,
  envelope JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studio_campaign_production (
  campaign_id TEXT PRIMARY KEY REFERENCES studio_campaigns (campaign_id) ON DELETE CASCADE,
  synced_at TIMESTAMPTZ NOT NULL,
  envelope JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
