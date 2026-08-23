-- STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1
-- Pass 3C live connector RPCs. Apply after 20260823_supervision_launch_runtime.sql.
-- Object/file storage is not this database.
-- Do not expose the service-role key to the browser.

BEGIN;

UPDATE supervision_meta
SET schema_version = 2, provider = 'supabase-postgres'
WHERE id = 1;

CREATE OR REPLACE FUNCTION supervision_verify_schema()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  meta supervision_meta%ROWTYPE;
BEGIN
  SELECT * INTO meta FROM supervision_meta WHERE id = 1;
  IF meta.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'schemaVersion', null, 'provider', null, 'expected', 2);
  END IF;
  RETURN jsonb_build_object(
    'ok', meta.schema_version = 2 AND meta.provider = 'supabase-postgres',
    'schemaVersion', meta.schema_version,
    'provider', meta.provider,
    'expected', 2
  );
END;
$$;

CREATE OR REPLACE FUNCTION supervision_upsert_lease(p_lease jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO supervision_leases (
    lease_id, customer_id, project_id, campaign_id, health, kind,
    last_heartbeat_at, last_healthy_at, expected_update_at, next_check_at, payload, updated_at
  ) VALUES (
    p_lease->>'leaseId',
    p_lease->>'customerId',
    p_lease->>'projectId',
    p_lease->>'campaignId',
    p_lease->>'health',
    p_lease->>'kind',
    (p_lease->>'lastHeartbeatAt')::timestamptz,
    NULLIF(p_lease->>'lastHealthyAt', '')::timestamptz,
    NULLIF(p_lease->>'expectedUpdateAt', '')::timestamptz,
    NULLIF(p_lease->>'expectedUpdateAt', '')::timestamptz,
    p_lease,
    now()
  )
  ON CONFLICT (lease_id) DO UPDATE SET
    customer_id = EXCLUDED.customer_id,
    project_id = EXCLUDED.project_id,
    campaign_id = EXCLUDED.campaign_id,
    health = EXCLUDED.health,
    kind = EXCLUDED.kind,
    last_heartbeat_at = EXCLUDED.last_heartbeat_at,
    last_healthy_at = EXCLUDED.last_healthy_at,
    expected_update_at = EXCLUDED.expected_update_at,
    next_check_at = EXCLUDED.next_check_at,
    payload = EXCLUDED.payload,
    updated_at = now();
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION supervision_accept_heartbeat(p_lease jsonb, p_heartbeat jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  inserted integer;
  existing_customer text;
  existing_project text;
BEGIN
  SELECT customer_id, project_id INTO existing_customer, existing_project
  FROM supervision_leases WHERE lease_id = p_heartbeat->>'leaseId';
  IF existing_customer IS NOT NULL AND existing_customer <> p_heartbeat->>'customerId' THEN
    RAISE EXCEPTION 'TENANT_ISOLATION';
  END IF;
  IF existing_project IS NOT NULL AND existing_project <> p_heartbeat->>'projectId' THEN
    RAISE EXCEPTION 'TENANT_ISOLATION';
  END IF;
  INSERT INTO supervision_idempotency (lease_id, idempotency_key)
  VALUES (p_heartbeat->>'leaseId', p_heartbeat->>'idempotencyKey')
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN
    RETURN jsonb_build_object('accepted', false);
  END IF;
  INSERT INTO supervision_heartbeats (
    lease_id, idempotency_key, at, reported_status, customer_id, project_id
  ) VALUES (
    p_heartbeat->>'leaseId',
    p_heartbeat->>'idempotencyKey',
    (p_heartbeat->>'at')::timestamptz,
    p_heartbeat->>'reportedStatus',
    p_heartbeat->>'customerId',
    p_heartbeat->>'projectId'
  );
  PERFORM supervision_upsert_lease(p_lease);
  RETURN jsonb_build_object('accepted', true);
END;
$$;

CREATE OR REPLACE FUNCTION supervision_upsert_incident_with_events(p_incident jsonb, p_events jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  ev jsonb;
  attempt jsonb;
BEGIN
  INSERT INTO supervision_incidents (
    incident_id, lease_id, customer_id, project_id, campaign_id, dedupe_key,
    state, severity, owner_escalated, next_check_at, payload, updated_at
  ) VALUES (
    p_incident->>'incidentId',
    NULLIF(p_incident->>'leaseId', ''),
    p_incident->>'customerId',
    p_incident->>'projectId',
    p_incident->>'campaignId',
    p_incident->>'dedupeKey',
    p_incident->>'state',
    p_incident->>'severity',
    COALESCE((p_incident->>'ownerEscalated')::boolean, false),
    (p_incident->>'nextCheckAt')::timestamptz,
    p_incident - 'history' - 'recoveryAttempts',
    now()
  )
  ON CONFLICT (incident_id) DO UPDATE SET
    lease_id = EXCLUDED.lease_id,
    state = EXCLUDED.state,
    severity = EXCLUDED.severity,
    owner_escalated = EXCLUDED.owner_escalated,
    next_check_at = EXCLUDED.next_check_at,
    payload = EXCLUDED.payload,
    updated_at = now();

  FOR ev IN SELECT * FROM jsonb_array_elements(COALESCE(p_events, '[]'::jsonb))
  LOOP
    INSERT INTO supervision_incident_events (
      event_id, incident_id, at, type, actor, summary, payload
    ) VALUES (
      ev->>'eventId',
      p_incident->>'incidentId',
      (ev->>'at')::timestamptz,
      ev->>'type',
      ev->>'actor',
      ev->>'summary',
      COALESCE(ev->'payload', '{}'::jsonb)
    )
    ON CONFLICT (event_id) DO NOTHING;
  END LOOP;

  DELETE FROM supervision_recovery_attempts WHERE incident_id = p_incident->>'incidentId';
  FOR attempt IN SELECT * FROM jsonb_array_elements(COALESCE(p_incident->'recoveryAttempts', '[]'::jsonb))
  LOOP
    INSERT INTO supervision_recovery_attempts (
      incident_id, attempt_index, at, strategy, result, detail
    ) VALUES (
      p_incident->>'incidentId',
      COALESCE((attempt->>'attemptIndex')::integer, 0),
      (attempt->>'at')::timestamptz,
      attempt->>'strategy',
      attempt->>'result',
      attempt->>'detail'
    );
  END LOOP;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION supervision_record_recovery(p_incident jsonb, p_attempt jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN supervision_upsert_incident_with_events(
    p_incident,
    COALESCE(p_incident->'history', '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION supervision_record_sweep_evaluation(p_evaluation jsonb, p_lease jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO supervision_sweep_evaluations (
    evaluation_id, claim_id, at, lease_id, incident_id, health
  ) VALUES (
    p_evaluation->>'evaluationId',
    p_evaluation->>'claimId',
    (p_evaluation->>'at')::timestamptz,
    p_evaluation->>'leaseId',
    NULLIF(p_evaluation->>'incidentId', ''),
    p_evaluation->>'health'
  );
  IF p_lease IS NOT NULL THEN
    PERFORM supervision_upsert_lease(p_lease);
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION supervision_save_coverage(p_providers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO supervision_coverage (id, providers, updated_at)
  VALUES (1, p_providers, now())
  ON CONFLICT (id) DO UPDATE SET providers = EXCLUDED.providers, updated_at = now();
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION supervision_mark_restored(p_at timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE supervision_meta SET restored_at = p_at WHERE id = 1;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION supervision_due_next_checks(p_at timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN jsonb_build_object(
    'leaseIds', COALESCE((
      SELECT jsonb_agg(lease_id)
      FROM supervision_leases
      WHERE expected_update_at IS NOT NULL AND expected_update_at <= p_at
    ), '[]'::jsonb),
    'incidentIds', COALESCE((
      SELECT jsonb_agg(incident_id)
      FROM supervision_incidents
      WHERE state <> 'RESOLVED' AND next_check_at <= p_at
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION supervision_hydrate()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  meta supervision_meta%ROWTYPE;
BEGIN
  SELECT * INTO meta FROM supervision_meta WHERE id = 1;
  RETURN jsonb_build_object(
    'schemaVersion', meta.schema_version,
    'provider', meta.provider,
    'leases', COALESCE((SELECT jsonb_agg(payload) FROM supervision_leases), '[]'::jsonb),
    'incidents', COALESCE((
      SELECT jsonb_agg(payload || jsonb_build_object(
        'history', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'eventId', e.event_id,
            'at', e.at,
            'type', e.type,
            'actor', e.actor,
            'summary', e.summary,
            'payload', e.payload
          ) ORDER BY e.seq)
          FROM supervision_incident_events e WHERE e.incident_id = i.incident_id
        ), '[]'::jsonb),
        'recoveryAttempts', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'attemptId', r.attempt_index,
            'at', r.at,
            'strategy', r.strategy,
            'result', r.result,
            'detail', r.detail
          ) ORDER BY r.attempt_index)
          FROM supervision_recovery_attempts r WHERE r.incident_id = i.incident_id
        ), '[]'::jsonb)
      ))
      FROM supervision_incidents i
    ), '[]'::jsonb),
    'idempotency', COALESCE((
      SELECT jsonb_agg(lease_id || ':' || idempotency_key) FROM supervision_idempotency
    ), '[]'::jsonb),
    'heartbeats', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'leaseId', lease_id,
        'idempotencyKey', idempotency_key,
        'at', at,
        'reportedStatus', reported_status,
        'customerId', customer_id,
        'projectId', project_id
      ) ORDER BY heartbeat_id)
      FROM supervision_heartbeats
    ), '[]'::jsonb),
    'coverage', COALESCE((SELECT providers FROM supervision_coverage WHERE id = 1), '[]'::jsonb),
    'evaluations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'evaluationId', evaluation_id,
        'claimId', claim_id,
        'at', at,
        'leaseId', lease_id,
        'incidentId', incident_id,
        'health', health
      ))
      FROM supervision_sweep_evaluations
    ), '[]'::jsonb),
    'sweepClaim', (
      SELECT jsonb_build_object(
        'claimId', claim_id,
        'claimedAt', claimed_at,
        'holder', holder,
        'expiresAt', expires_at
      ) FROM supervision_sweep_claims WHERE id = 1
    ),
    'meta', jsonb_build_object(
      'schemaVersion', meta.schema_version,
      'provider', meta.provider,
      'restoredAt', meta.restored_at,
      'lastSweepClaim', meta.last_sweep_claim
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION supervision_apply_ops(p_ops jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  op jsonb;
  results jsonb := '[]'::jsonb;
  item jsonb;
BEGIN
  FOR op IN SELECT * FROM jsonb_array_elements(COALESCE(p_ops, '[]'::jsonb))
  LOOP
    CASE op->>'op'
      WHEN 'upsert_lease' THEN
        item := supervision_upsert_lease(op->'lease');
      WHEN 'accept_heartbeat' THEN
        item := supervision_accept_heartbeat(op->'lease', op->'heartbeat');
      WHEN 'upsert_incident_with_events' THEN
        item := supervision_upsert_incident_with_events(op->'incident', op->'events');
      WHEN 'record_recovery' THEN
        item := supervision_record_recovery(op->'incident', op->'attempt');
      WHEN 'record_sweep_evaluation' THEN
        item := supervision_record_sweep_evaluation(op->'evaluation', op->'lease');
      WHEN 'save_coverage' THEN
        item := supervision_save_coverage(op->'providers');
      WHEN 'mark_restored' THEN
        item := supervision_mark_restored((op->>'at')::timestamptz);
      ELSE
        RAISE EXCEPTION 'UNKNOWN_OP';
    END CASE;
    results := results || jsonb_build_array(item);
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'results', results);
END;
$$;

REVOKE ALL ON FUNCTION supervision_verify_schema() FROM anon, authenticated;
REVOKE ALL ON FUNCTION supervision_hydrate() FROM anon, authenticated;
REVOKE ALL ON FUNCTION supervision_due_next_checks(timestamptz) FROM anon, authenticated;
REVOKE ALL ON FUNCTION supervision_upsert_lease(jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION supervision_accept_heartbeat(jsonb, jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION supervision_upsert_incident_with_events(jsonb, jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION supervision_record_recovery(jsonb, jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION supervision_record_sweep_evaluation(jsonb, jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION supervision_save_coverage(jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION supervision_mark_restored(timestamptz) FROM anon, authenticated;
REVOKE ALL ON FUNCTION supervision_apply_ops(jsonb) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION supervision_verify_schema() TO service_role;
GRANT EXECUTE ON FUNCTION supervision_hydrate() TO service_role;
GRANT EXECUTE ON FUNCTION supervision_due_next_checks(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION supervision_upsert_lease(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION supervision_accept_heartbeat(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION supervision_upsert_incident_with_events(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION supervision_record_recovery(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION supervision_record_sweep_evaluation(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION supervision_save_coverage(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION supervision_mark_restored(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION supervision_apply_ops(jsonb) TO service_role;

COMMIT;
