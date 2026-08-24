-- STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1
-- Additive wake-runtime HTTP idempotency. Schema version remains 2.
-- NOT APPLIED to live Supabase in the local build pass.
-- Do not reuse supervision_idempotency (heartbeat-only).
-- Object/file storage is not this database.

BEGIN;

CREATE TABLE IF NOT EXISTS supervision_wake_idempotency (
  idempotency_key text PRIMARY KEY,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('in_progress', 'completed')),
  first_completed_at timestamptz,
  response_status integer,
  response_body jsonb
);

CREATE INDEX IF NOT EXISTS supervision_wake_idempotency_hour_cap_idx
  ON supervision_wake_idempotency (first_completed_at)
  WHERE status = 'completed';

ALTER TABLE supervision_wake_idempotency ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE supervision_wake_idempotency FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE supervision_wake_idempotency TO service_role;

CREATE OR REPLACE FUNCTION supervision_claim_wake_idempotency(
  p_key text,
  p_now timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  existing supervision_wake_idempotency%ROWTYPE;
  hour_count integer;
BEGIN
  IF p_key IS NULL OR btrim(p_key) = '' THEN
    RAISE EXCEPTION 'WAKE_KEY_REQUIRED';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('supervision_wake_idempotency', 0));

  SELECT * INTO existing
  FROM supervision_wake_idempotency
  WHERE idempotency_key = p_key
  FOR UPDATE;

  IF FOUND AND existing.expires_at > p_now THEN
    IF existing.status = 'completed' THEN
      RETURN jsonb_build_object(
        'kind', 'replay',
        'status', existing.response_status,
        'body', existing.response_body
      );
    END IF;
    RETURN jsonb_build_object('kind', 'in_progress');
  END IF;

  SELECT COUNT(*)::integer INTO hour_count
  FROM supervision_wake_idempotency
  WHERE status = 'completed'
    AND first_completed_at IS NOT NULL
    AND first_completed_at >= p_now - interval '60 minutes';

  IF hour_count >= 18 THEN
    RETURN jsonb_build_object('kind', 'hour_cap');
  END IF;

  INSERT INTO supervision_wake_idempotency (
    idempotency_key, created_at, expires_at, status,
    first_completed_at, response_status, response_body
  ) VALUES (
    p_key, p_now, p_now + interval '24 hours', 'in_progress',
    NULL, NULL, NULL
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    created_at = EXCLUDED.created_at,
    expires_at = EXCLUDED.expires_at,
    status = 'in_progress',
    first_completed_at = NULL,
    response_status = NULL,
    response_body = NULL;

  RETURN jsonb_build_object('kind', 'fresh');
END;
$$;

CREATE OR REPLACE FUNCTION supervision_complete_wake_idempotency(
  p_key text,
  p_status integer,
  p_body jsonb,
  p_now timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  existing supervision_wake_idempotency%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('supervision_wake_idempotency', 0));

  SELECT * INTO existing
  FROM supervision_wake_idempotency
  WHERE idempotency_key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WAKE_KEY_UNKNOWN';
  END IF;

  UPDATE supervision_wake_idempotency
  SET
    status = 'completed',
    response_status = p_status,
    response_body = p_body,
    first_completed_at = COALESCE(first_completed_at, p_now)
  WHERE idempotency_key = p_key;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION supervision_claim_wake_idempotency(text, timestamptz)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION supervision_complete_wake_idempotency(text, integer, jsonb, timestamptz)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION supervision_claim_wake_idempotency(text, timestamptz)
  TO service_role;
GRANT EXECUTE ON FUNCTION supervision_complete_wake_idempotency(text, integer, jsonb, timestamptz)
  TO service_role;

COMMIT;
