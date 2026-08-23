# Supervision durable store schema

**Package:** `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1`  
**Pass:** 3C (live REST/RPC connector)

This document classifies providers. It does **not** rewrite or replace Pass 3 local evidence.

## Provider classification

| Kind | Provider stamp | Allowed use |
|------|----------------|-------------|
| `memory` | in-process maps | Unit tests only |
| `durable-file` | `studio-data-json` | Local development and controlled certification only |
| `supabase-postgres` | `supabase-postgres` | Required launch-production shared store |

Launch runtime (`NODE_ENV=production`, `NETLIFY=true`, or `STUDIO_SUPERVISION_RUNTIME=launch`) **fails closed** if only memory or JSON-file persistence is available.

Supabase **object/file storage is not the incident database**.

Live production is **not certified** in Pass 3C. The live REST/RPC connector is wired. Owner still must apply migrations, set server-only env names, and authorize a real two-process proof.

## Local JSON layout (Pass 3, accepted for local/controlled proof only)

Root: `data/supervision/` or `STUDIO_SUPERVISION_DATA_DIR`.

| Path | Role |
|------|------|
| `SCHEMA.json` | Schema version and provider stamp |
| `meta.json` | Restored-at and last sweep claim |
| `coverage.json` | Provider-coverage state |
| `leases/{leaseId}.json` | Current derived lease |
| `incidents/{incidentId}.json` | Current derived incident |
| `incidents/{incidentId}.events.jsonl` | Append-only incident events |
| `idempotency/{leaseId}__{key}.json` | Create-only idempotency keys (`wx`) |
| `heartbeats.jsonl` | Append-only heartbeat log |
| `sweep-evaluations.jsonl` | Which Machine sweep claimed and evaluated each due item |
| `sweep-claim.json` | Current sweep holder / TTL |

Pass 3 proof files remain under `review-evidence/pass-3-*.json` and `owner-evidence-pass-3-*.html`. Do not delete them.

## Production Postgres (Pass 3B adapter)

Migration: `supabase/migrations/20260823_supervision_launch_runtime.sql`

| Table / object | Role |
|----------------|------|
| `supervision_leases` | Current derived leases; tenant and heartbeat indexes |
| `supervision_incidents` | Current derived incidents; due-check and open-dedupe indexes |
| `supervision_incident_events` | Append-only incident events (trigger forbids UPDATE/DELETE) |
| `supervision_recovery_attempts` | Recovery attempts |
| `supervision_idempotency` | Unique `(lease_id, idempotency_key)` |
| `supervision_heartbeats` | Append-only heartbeat log |
| `supervision_coverage` | Provider coverage |
| `supervision_sweep_claims` | Single-row sweep holder; claimed through `supervision_try_claim_sweep` |
| `supervision_sweep_evaluations` | Append-only sweep evaluation log |
| `supervision_meta` | Schema/provider stamp and last claim |

Adapter: `src/lib/studio-work-supervision/postgres-adapter.ts` over `postgres-engine.ts` (deterministic) using the existing `SupervisionRepository` contract. Object storage is unused.

## Live connector RPCs (Pass 3C)

Migration: `supabase/migrations/20260824_supervision_live_connector.sql` (schema version 2)

| Function | Atomic group |
|----------|----------------|
| `supervision_verify_schema` | Initialization / compatibility |
| `supervision_hydrate` | Active-record restore after restart/deploy |
| `supervision_due_next_checks` | Due-check query |
| `supervision_upsert_lease` | Lease registration/update |
| `supervision_accept_heartbeat` | Idempotency + heartbeat + lease |
| `supervision_upsert_incident_with_events` | Incident derived state + append-only events + recovery rows |
| `supervision_record_recovery` | Recovery + incident-state transition |
| `supervision_try_claim_sweep` | Atomic sweep claim |
| `supervision_record_sweep_evaluation` | Sweep evaluation + lease next-check |
| `supervision_save_coverage` | Provider coverage |
| `supervision_mark_restored` | Restart stamp |
| `supervision_apply_ops` | One Postgres transaction wrapping the coalesced ops from a Machine write |

Live client: `src/lib/studio-work-supervision/postgres-live-client.ts`  
Live repository: `src/lib/studio-work-supervision/postgres-live-repository.ts`

Least privilege: `anon` / `authenticated` revoked. `service_role` only. Service-role key must not reach the browser.

Retention and deletion are documented separately in `SUPERVISION-RECORD-RETENTION-AND-DELETION.md`.

## Rules

- Incident events cannot be overwritten or deleted through normal operations. `replaceIncidentEvents` throws `AppendOnlyViolationError`.
- Derived incident state is reconstructed from immutable history.
- Concurrent sweeps: a live claim from another holder is refused. Same holder may continue. `supervision_try_claim_sweep` uses row lock (`FOR UPDATE`) in SQL.
- Tenant isolation remains `customerId` / `projectId` on the lease and incident. Cross-customer writes stay `403`.
- Production/launch forbids memory and JSON-file repositories.
- The in-memory repository remains for deterministic unit tests only.
- `studio-data-json` remains for local development and the accepted Pass 3 restart proof only.
