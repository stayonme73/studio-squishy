# Current-truth connection matrix

Opening snapshot 2026-08-23. Do not treat this as a live certification.

| System | Exists | Creds here | Code connector | Machine send | Machine receive | Schedule | Failure detect | Customer context | Owner alert | Proven |
|--------|--------|------------|----------------|--------------|-----------------|----------|----------------|------------------|-------------|--------|
| Claude | Anthropic Messages path in code | Key absent | Decision-learner / optional design reasoner | Not as an agent | Model JSON if keyed | No | No | No incident object | No | **NOT CONNECTED** |
| Build-A-Bot | Not in repo | No | No | No | No | No | No | No | No | **NOT PRESENT** |
| Resend | Adapter | Key/from absent | Yes | If configured | Provider id | Sweep route; no cron; secret absent | Watchdog findings | Campaign id | No pager | **PARKED / not live** |
| Machine records | Campaign, jobs, exceptions, plus in-process Machine incident store (Foundation Pass 1 fixtures) | Local store + process memory | Yes for production records; incident core is in-process only | Production events; fictional supervision fixtures | Same stores / process snapshot | Unscheduled sweep routes; no incident scheduler | Production stalls plus Machine lease evaluation | Yes on those records; fixtures isolated | Desk folders + additive Incident Command | **Partial — incident core not persisted, not live** |
| Owner Console | `/file-room/owner-console` | Session | Yes | Exception folders | Folder state | No | Known exception kinds | Campaign labels | Open the desk | **Decision desk unchanged** |
| Incident Command | `/file-room/incident-command` | Session (Owner) | Yes | Machine incident snapshot | Owner actions append history | No | Machine lease/incident rules | Fixture customer labels | On this board only | **Additive command view. Not certified. Fixture-seeded.** |
| Make.com | — | — | No | No | No | No | No | No | No | Not active; do not add unless Owner later authorizes after Build-A-Bot fails the contract |

Full mobile-park audit: `docs/launch/studio-operating-mobile-customer-journey-certification-1/SUPERVISION-DEPENDENCY-AUDIT.md`.
