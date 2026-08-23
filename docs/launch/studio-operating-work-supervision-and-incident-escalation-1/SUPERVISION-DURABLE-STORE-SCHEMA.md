# Supervision durable store schema

**Package:** `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1`  
**Pass:** Durable Pass 3  
**Provider:** `studio-data-json`  
**Schema version:** `1`  
**Mechanism:** Studio `data/` JSON store (same family as `src/lib/campaign-store/`) with atomic replace and append-only jsonl.

This is **not** a new database. Supabase in this repository is private **file storage** only and is **not configured** as a record store. There is no SQL migration folder and no `DATABASE_URL` record database. If those credentials or a Postgres schema appear later, this file must be updated honestly before any claim that Supabase holds supervision records.

## Layout

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

## Rules

- Incident events cannot be overwritten or deleted through normal operations. `replaceIncidentEvents` throws `AppendOnlyViolationError`.
- Derived incident state is reconstructed from immutable jsonl history.
- Concurrent sweeps: a live claim from another holder is refused. Same holder may continue.
- Tenant isolation remains `customerId` / `projectId` on the lease and incident. Cross-customer writes stay `403`.
- Production and `STUDIO_SUPERVISION_REQUIRE_DURABLE=1` forbid the in-memory repository. There is no fallback from durable persistence to volatile memory.
- The in-memory repository remains for deterministic unit tests only.

## Restart

After Node starts, the Machine loads leases, incidents, recovery attempts, next-check times, coverage, heartbeats, and idempotency keys from this directory. Long-running services are not `SERVICE_AWAKE` until a new health check passes. `WAITING_FOR_OWNER` is not relabeled `WORKING` or `ACTIVE`.
