# Studio Verified Discoveries — Master Record

**Established:** 2026-10-25  
**Authority:** Launch register · persistence cutover · hosted readiness  
**Rule:** One canonical record. Addenda merge here; do not maintain parallel discovery authorities.

---

## §1 — Persistence & Preview commerce (2026-10-25 → 2026-10-26)

| ID | Discovery | Evidence | Limit |
|----|-----------|----------|-------|
| PDS-1 | Test Postgres + Supabase Test spine verified for payment sessions | Cutover preflight · T3 pattern | Production migration not run |
| PDS-2 | Preview sharp/bootstrap + `pending_retry` paid recovery | `STUDIO-HOSTED-PREVIEW-SHARP-FIX-FINAL-CLOSEOUT-REPORT.md` · `dpl_569875…` | Factory cert OPEN until lane claims |
| PDS-3 | Hosted File Room T5 PASS (session jar, 200/403/SHA-256) | `scripts/hosted-preview-t5-file-room.mjs` | Not production deploy |

---

## §2 — Desk factory (frozen — do not rerun without regression)

Room 4B / 4C / Package G / static creative lane proofs remain authoritative on **local desk** (`data/` + in-process Machine). See respective closeouts. **Not** a hosted multi-worker stamp.

---

## §3b — Hosted Production Team (merged 2026-10-27)

**Source addendum:** `STUDIO-VERIFIED-DISCOVERIES-MASTER-RECORD-HOSTED-PRODUCTION-TEAM-ADDENDUM-2026-10-27.md` (**merged-only**; do not cite as authority).

| ID | Discovery | Evidence | Limit |
|----|-----------|----------|-------|
| HPT-1 | Preview payment + File Room spine certified | `STUDIO-HOSTED-PREVIEW-SHARP-FIX-FINAL-CLOSEOUT-REPORT.md` · `dpl_569875…` | Not factory cert |
| HPT-2 | ~~Vercel lane occupancy uses `/tmp`~~ **Superseded by HPT-8** when Postgres claims deployed | Historical: `quick-lane-admission.ts` pre-cert | Per-instance `/tmp` before cert |
| HPT-3 | Lane **views** and stop-sale use Postgres truth | `loadStudioLaneViews`, `evaluateHeavyStopSale` | Mutex was FS/`/tmp` until HPT-8 |
| HPT-4 | Postgres advisory/`FOR UPDATE` patterns exist for campaigns/comms | `postgres-pool.ts`, `postgres-comms*.ts` | Extended to lanes in cert |
| HPT-5 | Production observers run inline on serverless | `ensureDispatchExecution`, design + launch-menu observers | Timeout/queue risk |
| HPT-6 | `pending_retry` durable for paid activation/dispatch | `confirm.ts`, `activate.ts`, `recover.test.ts` | Requires wake event |
| HPT-7 | Room 4B/4C/Package G proofs are desk-local | Room 4B/4C closeouts, Package G tests | Hosted replay OPEN until cert scenarios |
| HPT-8 | **Postgres `studio_lane_claims` on Vercel** behind existing admission APIs | `postgres-lane-claims.ts` · migration `20261027200000_studio_lane_claims.sql` | Test DB only until Production stamp |
| HPT-9 | Desk/local keeps `data/studio-lane-occupancy` filesystem locks | `shouldUsePostgresLaneClaims()` gates Vercel+postgres | Owner sync path uses subprocess worker on Vercel |

**Chronology preserved:** HPT-2 documents pre-cert state; HPT-8 records the corrective engineering from `STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1`.

---

## §4 — Open until cert report stamps

Hosted Production Team factory E2E for four homepage packages · dual-worker concurrency on Preview · failure/recovery with `pending_retry` · independent Quality on hosted paths.
