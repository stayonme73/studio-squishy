# STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION — PACKAGE CONTRACT

**Package:** `STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1`  
**Status:** **OPEN / IN PROGRESS** — Foundation Pass 1 accepted at `0dc76903`. Runtime Pass 2 accepted at `1f8e2600`. Durable Pass 3 accepted at `05509c9b` for local/controlled proof only. Pass 3B accepted at `7d0d4323` as the production guardrail. Pass 3C completes the live Supabase REST/RPC connector. **Not** live-certified. **Not** closed.  
**Opened:** 2026-08-23  
**Base:** mobile park tip `bc458931c46ed845b982f62a4c70f8a312c169c8`  
**Branch:** `operating/work-supervision-and-incident-escalation-1`  
**Room:** 4 — Full business rehearsal. **Not** Room 5. **Not** Room 4D or 4E.  
**Mobile package:** PARKED (not closed). Resume after this package **closes**.  

Config: `src/config/studio-work-supervision-and-incident-escalation-v1.ts`

---

## Purpose

Build and certify a **Machine-owned** supervision and incident-control system so Tagia does not have to watch agents, tools, providers, servers, and customer-project stalls by hand.

Scout may build. Claude may later **verify** incidents. Build-A-Bot may later **automate** checks. The Machine owns heartbeat and incident truth. The Owner Console shows a complete actionable incident record.

---

## What opening authorized

Opening documents, schema, contracts, scenario list, defect ledger, board pointers, and one opening commit.

## What Foundation Pass 1 authorizes

Provider-independent Machine incident core, heartbeat/lease health, severity/escalation rules, additive Owner Incident Command, Squishy Watchkeeper on routine internal states only, and proof tests with fictional fixtures.

## What Runtime Pass 2 authorizes

Machine-owned work leases, authenticated provider-independent heartbeat ingest, an independent Machine sweep, contract-authorized routine recovery, and a registration/heartbeat contract that future workers can use. Live controlled proof uses fictional work only. This pass does **not** connect Claude, Build-A-Bot, Make, or Resend.

## What Durable Pass 3 authorizes

Provider-independent durable persistence for leases, heartbeats, idempotency keys, incidents, append-only events, recovery attempts, coverage, next-check schedules, and escalation state, plus restart recovery. Incident Command reads fixtures and persisted live records in separate sets. This pass does **not** connect Build-A-Bot, Claude, Make, or Resend.

Pass 3 is accepted for **local development and controlled Node restart proof only**. `studio-data-json` is not a certified launch-production store.

## What Pass 3B authorizes

Classify providers (memory = tests, JSON = local/controlled, Postgres = launch production). Fail closed in launch runtime if only memory or JSON is available. Implement a Supabase Postgres adapter on the existing `SupervisionRepository` contract, with SQL migration and deterministic multi-process tests. Do **not** claim live production certification without a live shared database proof. Do **not** connect Build-A-Bot. An external scheduler is not authorized until **live** production durability is proven.

## What Pass 3C authorizes

A real server-side Supabase Postgres connector on `SupervisionRepository`: schema verification, hydrate, transactional RPCs, and fail-closed launch selection. Current Secret Keys (`sb_secret_`) are sent only as `apikey`. The JWT `service_role` key is a documented compatibility fallback. A live two-process proof against the real database has passed with fictional Maple/Harbor records. This does **not** close the package. Do **not** connect Build-A-Bot. An external scheduler is still not authorized. **L14:** the private certification host’s Netlify Team Login blocked a noninteractive sweep POST (401 HTML) before Studio authentication. Keep the site private. Stop sweep tests on that host. See `MACHINE-ONLY-WAKE-INGRESS-DECISION-NOTE.md`.

## What this package still does **not** authorize

- Claiming Claude, Build-A-Bot, Make, Resend, or any alert channel is live  
- Fake success connectors  
- Using real customer data  
- Security theater  
- Making the private certification site public  
- Rotating `STUDIO_OPERATING_SWEEP_SECRET` again because of L14  
- Using a Netlify management API token as visitor authentication  
- Claiming the authenticated sweep passed or failed at the Studio layer  
- Connecting an external scheduler before a machine-only wake ingress exists  
- Implementing a connector or gateway in this recording  
- L13 / Board persistence work  
- Merging  
- Starting Room 5  
- Unparking or running the mobile phone walk  
- Assigning Room 4D / 4E  
- Opening any other package  

---

## Certification gates (later — not this commit)

1. Machine incident record exists and is append-only.  
2. Independent heartbeat/supervision (Machine-owned; no agent self-certifies).  
3. Owner Console incident command view for every required field.  
4. Severity and escalation, including serious security presentation.  
5. Provider-independent automation contract; Build-A-Bot connected only if it meets the contract.  
6. Claude verifier live send/receive certification, or honest NOT CONNECTED.  
7. At least one real out-of-band alert channel live-proven (Resend cannot be claimed).  
8. Squishy Watchkeeper uses the canonical asset with CSS rings; never on security incidents.  
9. Controlled scenarios pass, including recovery without Owner and recovery-fail with a complete incident.

---

## Protected board

| Control | Truth |
|---------|-------|
| Room 4 | OPEN |
| Room 5 | NOT STARTED |
| Mobile cert | PARKED at readiness `b35c8aa2`; park tip `bc458931` |
| Gate X | CLOSED WITH EXPLICIT LIMITS |
| Room 4B | CLOSED |
| Room 4C | CLOSED WITH EXPLICIT LIMITS |
| Carousel | NOT ON LAUNCH MENU |
| Merge | No |
