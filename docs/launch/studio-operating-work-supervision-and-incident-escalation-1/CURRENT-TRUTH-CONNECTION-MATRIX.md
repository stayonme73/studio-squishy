# Current-truth connection matrix

Opening snapshot 2026-08-23. Do not treat this as a live certification.

| System | Exists | Creds here | Code connector | Machine send | Machine receive | Schedule | Failure detect | Customer context | Owner alert | Proven |
|--------|--------|------------|----------------|--------------|-----------------|----------|----------------|------------------|-------------|--------|
| Claude | Anthropic Messages path in code | Key absent | Decision-learner / optional design reasoner | Not as an agent | Model JSON if keyed | No | No | No incident object | No | **NOT CONNECTED** |
| Build-A-Bot | Not in repo | No | No | No | No | No | No | No | No | **NOT PRESENT** |
| Resend | Adapter | Key/from absent | Yes | If configured | Provider id | Sweep route; no cron; secret absent | Watchdog findings | Campaign id | No pager | **PARKED / not live** |
| Machine records | Campaign, jobs, exceptions, plus durable Machine incident and lease store (`studio-data-json`) | Local `data/` JSON; Supabase record DB absent | Yes for production records; supervision uses the same data/ family, not Postgres | Production events; fictional supervision fixtures and live proof leases | Authenticated register/heartbeat/sweep/reload/snapshot | In-process sweep while Node is awake; authenticated sweep wake; durable state survives Node restart; no external scheduler | Lease stall, dead service, mismatch, overdue next check, missed heartbeats during downtime | Yes on those records; fixtures isolated from live proof runtime | Desk folders + additive Incident Command | **Partial — persisted locally, no external scheduler** |
| Owner Console | `/file-room/owner-console` | Session | Yes | Exception folders | Folder state | No | Known exception kinds | Campaign labels | Open the desk | **Decision desk unchanged** |
| Incident Command | `/file-room/incident-command` | Session (Owner) | Yes | Fixture snapshot and persisted live snapshot, never mixed | Owner actions append history | No | Machine lease/incident rules | Fixture and fictional live proof labels | On this board only | **Additive command view. Not certified. Fixture and live sets labeled separately.** |
| Make.com | — | — | No | No | No | No | No | No | No | Not active; do not add unless Owner later authorizes after Build-A-Bot fails the contract |

Full mobile-park audit: `docs/launch/studio-operating-mobile-customer-journey-certification-1/SUPERVISION-DEPENDENCY-AUDIT.md`.
