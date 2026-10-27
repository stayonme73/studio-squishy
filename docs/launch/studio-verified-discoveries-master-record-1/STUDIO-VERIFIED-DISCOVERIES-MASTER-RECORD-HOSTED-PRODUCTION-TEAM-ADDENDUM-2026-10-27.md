# Master Discoveries — Addendum (Hosted Production Team readiness)

**Date:** 2026-10-27  
**Status:** **MERGED-ONLY** — authority is `STUDIO-VERIFIED-DISCOVERIES-MASTER-RECORD-2026-10-25.md` **§3b**  
**Do not cite this file as authority.** Preserved for chronology only.

## Discoveries

| ID | Discovery | Evidence | Limit |
|----|-----------|----------|-------|
| HPT-1 | Preview payment + File Room spine certified | `STUDIO-HOSTED-PREVIEW-SHARP-FIX-FINAL-CLOSEOUT-REPORT.md` · `dpl_569875…` | Not factory cert |
| HPT-2 | Vercel lane occupancy uses `/tmp` | `quick-lane-admission.ts`, `heavy-occupancy-lock.ts` | Per-instance only |
| HPT-3 | Lane **views** and stop-sale use Postgres truth | `loadStudioLaneViews`, `evaluateHeavyStopSale` | Mutex still FS/`/tmp` on Vercel |
| HPT-4 | Postgres advisory/`FOR UPDATE` patterns exist for campaigns/comms | `postgres-pool.ts`, `postgres-comms*.ts` | Not yet used for lanes |
| HPT-5 | Production observers run inline on serverless | `ensureDispatchExecution`, design + launch-menu observers | Timeout/queue risk |
| HPT-6 | `pending_retry` durable for paid activation/dispatch | `confirm.ts`, `activate.ts`, `recover.test.ts` | Requires wake event |
| HPT-7 | Room 4B/4C/Package G proofs are desk-local | Room 4B/4C closeouts, Package G tests | Hosted replay OPEN |

**Merge to main register file when that file is restored in repo.**
