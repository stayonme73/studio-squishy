-- STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1 — cross-instance lane claims (Test / local only until Production stamp).

CREATE TABLE IF NOT EXISTS studio_lane_claims (
  claim_id TEXT PRIMARY KEY,
  lane TEXT NOT NULL CHECK (lane IN ('quick', 'heavy')),
  job_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL,
  heartbeat_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS studio_lane_claims_lane_heartbeat_idx
  ON studio_lane_claims (lane, heartbeat_at);

CREATE UNIQUE INDEX IF NOT EXISTS studio_lane_claims_lane_job_idx
  ON studio_lane_claims (lane, job_id);
