# STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1 — Execution Report

**Written:** 2026-10-27 (America/New_York)  
**Package:** `STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1`  
**Authorization:** Owner bounded implement + isolated Preview cert (no commit/push/merge/Production)

---

## Executive verdict

| Layer | Verdict |
|-------|---------|
| **Postgres lane claims (engineering)** | **PASS** — Test Postgres integration + migration applied |
| **Isolated Preview deploy (lane code)** | **PASS** — new Preview deployment ready |
| **Dual-worker claim contention** | **PASS** — concurrent heavy acquire; exactly one winner (Test Postgres) |
| **Hosted payment spine regression (T3 webhook/reconcile)** | **FAIL / BLOCKED** — `vercel curl` returned status `0` on webhook/reconcile in this runner (Windows shell); signup/checkout smoke **PASS** on same deployment |
| **Four homepage package factory E2E on Preview** | **NOT CERTIFIED** — cert runner reached signup after fix; checkout-session did not return `checkoutSessionId` for non–launch-kit packages in this pass (intake/production/QA/Review/Delivery **not executed**) |
| **Full hosted Production Team factory** | **OPEN** |

**Overall package stamp:** **PASS WITH EXPLICIT LIMITS** on cross-instance lane coordination only. **Not** a full Production Team factory certification.

---

## 1. Master Discoveries reconciliation

- Created canonical `docs/launch/studio-verified-discoveries-master-record-1/STUDIO-VERIFIED-DISCOVERIES-MASTER-RECORD-2026-10-25.md` with **§3b Hosted Production Team** (HPT-1–HPT-9).
- Addendum `STUDIO-VERIFIED-DISCOVERIES-MASTER-RECORD-HOSTED-PRODUCTION-TEAM-ADDENDUM-2026-10-27.md` marked **MERGED-ONLY**.
- HPT-8 documents `studio_lane_claims` + Vercel-gated Postgres admission; HPT-2 marked superseded for mutex (chronology preserved).

---

## 2. Engineering changes (exact scope)

### Postgres lane claims

| Path | Change |
|------|--------|
| `supabase/migrations/20261027200000_studio_lane_claims.sql` | New `studio_lane_claims` table + indexes |
| `src/lib/job-control/postgres-lane-claims.ts` | Transactional quick/heavy claims; `ensureStudioLaneClaimsTable`; `shouldUsePostgresLaneClaims()` = `VERCEL` + postgres backend |
| `src/lib/job-control/postgres-lane-sync-bridge.ts` | Sync subprocess bridge for Owner desk APIs |
| `scripts/postgres-lane-claim-worker.mjs` | Worker entry |
| `scripts/lib/postgres-lane-claims-core.mjs` | Shared SQL for worker + cert runner |
| `scripts/apply-test-postgres-lane-claims-migration.mjs` | Test DB guard + apply migration |
| `src/lib/job-control/quick-lane-admission.ts` | Vercel → Postgres; desk → `data/studio-lane-occupancy`; async + sync paths |
| `src/lib/job-control/heavy-occupancy-lock.ts` | Same gating; removed `/tmp` Vercel path |
| `src/lib/job-control/index.ts` | Export async APIs + `shouldUsePostgresLaneClaims` |
| `src/lib/studio-dispatch/launch-menu-production-observer.ts` | Await async lane admission |
| `src/lib/studio-dispatch/design-renderer-observer.ts` | Await async quick admission |
| `src/lib/job-control/postgres-lane-claims.test.ts` | Integration: concurrent heavy + quick capacity @ Test Postgres |

**Preserved:** Room 4B/4C/Package G desk proofs; `pending_retry` activation/dispatch paths untouched; checkout stop-sale; `loadStudioLaneViews`.

---

## 3. Local / Test Postgres evidence

| Test | Result | When |
|------|--------|------|
| `postgres-lane-claims.test.ts` (2 tests, `VERCEL=1`) | **PASS** | 2026-10-27 |
| `capacity-100-order-hardening.test.ts` (filesystem heavy lock) | **PASS** (no rerun of 4B/4C) | 2026-10-27 |
| Migration apply script → Test project ref guard | **PASS** | 2026-10-27 |

**Dual-worker (X1):** `scripts/hosted-production-team-cert-1.mjs` — parallel `acquireHeavy` on Test Postgres; one `held_by_other`; winner released. Evidence: `STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1-HOSTED-RUN.json`.

---

## 4. Preview deployment

| Field | Value |
|-------|--------|
| Deployment ID | **`dpl_2tboEKNUEY7PLbCT6XQnxumUxhRo`** |
| Preview URL | `https://the-studio-company-la2h2kcar-stayonme73s-projects.vercel.app` |
| Production | **Unchanged** (`fc56426` / Welcome Hall) |
| Method | Local `npx vercel deploy` (no `--prod`, no git push) |
| Build | `npm run build` with `NODE_ENV=production` **PASS** after exporting async lane APIs |

**Prior Preview anchor** (`dpl_569875…` @ `78b3ac4f`) superseded for **lane-claims code** only; T5 File Room not re-run on this deployment in this package.

---

## 5. Hosted scenario results (four homepage packages)

Runner: `scripts/hosted-production-team-cert-1.mjs`  
Ledger: `docs/launch/studio-hosted-production-team-readiness-1/STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1-HOSTED-RUN.json`

| Package | Paid → intake → dispatch → production → QA → Review → Delivery | Result |
|---------|------------------------------------------------------------------|--------|
| Clip Repurposing | Not reached (checkout-session) | **BLOCKED** |
| Short-Form Video Editing | Not reached | **BLOCKED** |
| Social & Promo Graphics | Not reached | **BLOCKED** |
| Campaign Launch Kit | Not reached | **BLOCKED** |

**Smoke control:** `hosted-preview-payment-smoke.mjs` on same deployment — signup **200**, checkout **200** (launch kit condensed offer).

**Gap:** Cert runner must align checkout payload/validation per package SKU and complete Stripe TEST webhook + intake + dispatch wake before production/QA/Review/Delivery can be judged. **No placeholder PASS** was recorded.

---

## 6. Failure / recovery (`pending_retry`)

- **Not re-run:** `activate.test.ts` / `recover.test.ts` (no changes to recovery evaluators).
- **Design:** Failed lane claim → observer skip / slot wait; paid truth remains in Postgres (unchanged doctrine).

---

## 7. Unproven limits (explicit)

- Cross-instance mutex on Preview **under real concurrent serverless** (two lambdas) — inferred from shared Test Postgres claims + deployed code path; **not** proven with two simultaneous Preview production observers on the same job in this pass.
- Serverless duration for Shotstack/sharp/video pipelines on Preview.
- Full independent Quality + Review + Final Delivery on Preview for all four homepage packages.
- Windows-hosted `vercel curl` webhook/reconcile (T3-complete returned status `0`); fix runner shell/body handling before re-stamping payment spine on this deployment.

---

## 8. Launch blockers (remaining)

1. **Hosted factory E2E** for four homepage packages — **OPEN**.
2. **Hosted payment webhook/reconcile proof** on `dpl_2tboEKN…` — **OPEN** (runner/tooling).
3. **Production** Supabase migration for `studio_lane_claims` — **not authorized / not run**.
4. **Merge / push / live Stripe / publication** — **not authorized**.

---

## 9. Register update (standing)

Update row **Hosted multi-worker lane concurrency** → **PASS WITH EXPLICIT LIMITS** (Postgres claims implemented + Test Postgres contention PASS; Preview factory E2E OPEN).

Update row **Hosted Production Team readiness** → **OPEN** (this report).

---

## 10. Next authorized work (not started here)

1. Fix cert runner checkout payloads per package + cookie-jar pattern from T5; re-run webhook/reconcile with working `vercel curl`.
2. Per package: complete intake → prove dispatch → genuine production artifact → independent QA → Review → Final Delivery (or **FAIL** with evidence).
3. Optional: Preview dual-lambda probe on same job after paid wake.
4. Owner-authorized commit/push when ready (local changes **uncommitted** per authorization).

**STOP** — execution report complete; await Owner direction.
