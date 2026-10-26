-- STUDIO-DURABLE-PERSISTENCE-COMMS-AND-LIFE-1
-- Local / test foundation only. Not for Production without Owner authorization.

CREATE TABLE IF NOT EXISTS studio_project_communication (
  campaign_id TEXT PRIMARY KEY REFERENCES studio_campaigns (campaign_id) ON DELETE CASCADE,
  envelope JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studio_project_communication_ack (
  campaign_id TEXT NOT NULL REFERENCES studio_campaigns (campaign_id) ON DELETE CASCADE,
  customer_user_id TEXT NOT NULL,
  envelope JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (campaign_id, customer_user_id)
);

CREATE TABLE IF NOT EXISTS studio_campaign_customer_life (
  campaign_id TEXT PRIMARY KEY REFERENCES studio_campaigns (campaign_id) ON DELETE CASCADE,
  envelope JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
