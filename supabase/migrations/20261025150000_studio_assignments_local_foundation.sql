-- STUDIO-PRELAUNCH-INFRASTRUCTURE-COMPLETION-1 Phase A
-- Local / test foundation only. Not for Production without Owner authorization.

CREATE TABLE IF NOT EXISTS studio_file_room_assignments (
  singleton_id TEXT PRIMARY KEY DEFAULT 'default',
  envelope JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
