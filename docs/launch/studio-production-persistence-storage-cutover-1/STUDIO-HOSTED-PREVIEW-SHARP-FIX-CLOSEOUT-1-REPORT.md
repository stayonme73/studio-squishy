# STUDIO-HOSTED-PREVIEW-SHARP-FIX-CLOSEOUT-1 — Closeout report

**Written:** 2026-10-26 ~10:08 PM (America/New_York)  
**Branch (local):** `operating/mobile-customer-journey-certification-1-thin-release`  
**Canonical Preview deployment (unchanged):** **`dpl_6U6ocV5dd1yxDeY79LGxPyreNjHo`**  
**Canonical Preview URL:** `https://the-studio-company-b381ngezk-stayonme73s-projects.vercel.app`  
**Production:** **`fc56426`** / Welcome Hall **unchanged**  
**Verdict:** **PASS WITH LIMITS** — review + regressions + activation recovery hardening complete; **hosted T5 partially complete** (shared Test DB + local route proof; hosted authenticated GET blocked on Preview session parity)

**No git commit or push** (per Owner authorization boundary). Prior Preview evidence and Production site remain protected.

---

## 1. Uncommitted fix set review

| Check | Result |
|-------|--------|
| Secrets in product diff | **PASS** — no keys, tokens, or credentials added in modified product files |
| Unrelated product churn | **PASS** — changes confined to sharp/bootstrap, payment activation, lane occupancy, narrow imports, register line |
| Accidental loss of Design / Production behavior | **PASS** — no renderer stubbing; Production desk lane locks still use `data/studio-lane-occupancy`; checkout caps unchanged |
| Ops / noise in workspace | **Not for commit** — `.cursor/hooks.json`, vitest JSON artifacts, `assets/`, ops `*.pid` / tunnel logs, mobile lounge proof temps, `test-artifacts/` |

### Product files in proposed release set (18)

| File | Purpose |
|------|---------|
| `next.config.ts` | Trace `@img` + `sharp`; stop externalizing `sharp` on API lambdas |
| `package.json` / `package-lock.json` | Optional `@img/sharp-linux-x64` |
| `src/app/api/payments/checkout-session/route.ts` | `runtime = "nodejs"` |
| `src/app/api/payments/reconcile/route.ts` | `runtime = "nodejs"` |
| `src/app/api/payments/sandbox-confirm/route.ts` | `runtime = "nodejs"` |
| `src/lib/materials/store.ts` | Narrow design-renderer import |
| `src/lib/materials/requirements.ts` | Narrow design-renderer import |
| `src/lib/studio-payment/disposable-test-isolation-guards.ts` | Narrow promo/social types import |
| `src/lib/studio-payment/reconcile.ts` | Lazy recovery/confirm imports |
| `src/lib/studio-payment/confirm.ts` | Lazy recovery; **catch → `pending_retry` after paid truth** |
| `src/lib/studio-payment/webhook.ts` | Lazy confirm import |
| `src/lib/studio-post-pay-activation/activate.ts` | Export **`persistPostPayActivationPendingRetry`** |
| `src/lib/studio-post-pay-activation/index.ts` | Re-export pending-retry helper |
| `src/lib/job-control/quick-lane-admission.ts` | Vercel → `/tmp/...`; **documented per-instance limit** |
| `src/lib/job-control/heavy-occupancy-lock.ts` | Vercel → `/tmp/.../heavy.lock.json` |
| `docs/launch/studio-production-persistence-storage-cutover-1/STUDIO-PRODUCTION-PERSISTENCE-STORAGE-CUTOVER-1-REGISTER.md` | Closeout stamp (this package) |

### Closeout-only additions (recommended with release; disposable QA)

| File | Purpose |
|------|---------|
| `src/lib/studio-durable-persistence/hosted-preview-t5-fixture.test.ts` | Seed Test Postgres + Supabase + **local** download 200/403/bytes |
| `src/lib/studio-durable-persistence/hosted-preview-mint-session.test.ts` | Mint `studio_session` for hosted curl (when Preview `SESSION_SECRET` matches local) |
| `scripts/hosted-preview-t5-file-room.mjs` | Hosted T5 runner (Preview signup + seed + curl) |
| Prior session reports (`STUDIO-HOSTED-PREVIEW-*-REPORT.md`) | **Preserve** — do not delete |

---

## 2. Payment activation recovery (dispatch failure after paid webhook)

**Requirement:** After successful paid truth, a throw during recovery/dispatch must leave a **durable, discoverable** `postPayActivation.status: pending_retry`, not a silently stranded paid campaign.

| Layer | Behavior |
|-------|----------|
| `recoverPaidOperatingChain` | Normal failure paths already persist `pending_retry` (existing tests in `recover.test.ts` / `activate.test.ts`) |
| **`activateAfterPayment` (`confirm.ts`)** | **Closeout:** wraps recovery in `try/catch`; when `paymentReceivedAt` or confirmed `paymentTruth`, calls **`persistPostPayActivationPendingRetry`** instead of returning an unchanged campaign |
| **`persistPostPayActivationPendingRetry` (`activate.ts`)** | **Closeout:** renamed/exported from private helper; all internal call sites updated |

**Code review:** **PASS** for the stranded-paid failure mode addressed in this package.  
**Note:** Closeout activation change is **local only** until Owner approves commit + Preview redeploy.

---

## 3. Serverless lane occupancy / `/tmp` concurrency honesty

| Environment | Lane state | Cross-instance exclusivity |
|-------------|------------|----------------------------|
| **Production desk / local dev** | `data/studio-lane-occupancy/**` | **Yes** — file locks + admission lock (unchanged) |
| **Vercel Preview / serverless** | `/tmp/studio-lane-occupancy/**` | **No** — **per-instance only**; documented in `quick-lane-admission.ts` |

**Defect corrected:** Read-only `/var/task/data/...` on Vercel (webhook 500 after sharp fix).  
**Explicit limit (not weakened):** Serverless does not provide cluster-wide file exclusivity; **Postgres-backed checkout / `evaluateHeavyStopSale`** remains authority for customer-facing caps. Production Team file-lock path is untouched.

---

## 4. Focused regressions

| Suite | Result |
|-------|--------|
| `disposable-sp-cert-design-renderer-boundary.test.ts` | **PASS** (3/3) |
| `disposable-kit-test-isolation.test.ts` | **PASS** (12/12) |
| `activate.test.ts` / `recover.test.ts` (full file) | **PARTIAL** — 20 passed, **2 timeouts** (Postgres pool / 5s default); not attributed to this diff |
| `hosted-preview-t5-fixture.test.ts` (`HOSTED_T5_SEED=1`, via T5 script) | **PASS** — sandbox pay → Supabase upload → **authorized 200 + SHA256** + **stranger 403** on **local** download route against **Test** Postgres + `studio-files-test` |
| Phase B integration (standalone `npm run test`) | **Skipped** — vitest process did not load `.env.local` test targets in isolated run; same env **is** loaded by `scripts/hosted-preview-t5-file-room.mjs` for fixture seed |
| `npm ci` + devDependencies | **Restored** (`npm ci --include=dev` where `NODE_ENV` had omitted vitest) |

---

## 5. Hosted Preview T5 (disposable file)

| Step | Result @ **`dpl_6U6ocV5dd1yxDeY79LGxPyreNjHo`** |
|------|--------------------------------------------------|
| Preview signup (owner + stranger) via `vercel curl` | **PASS** |
| Seed paid campaign + released final file on **shared Test** Postgres + Supabase | **PASS** (fixture test) |
| **Local** download route on seeded file (authorized 200, stranger 403, bytes) | **PASS** (same fixture test) |
| **Hosted** `GET /api/file-room/files/.../download` with session | **NOT PASS** — **401 Authentication required** |

**T5 limit (root cause):** Authenticated hosted GET could not be completed in this closeout:

1. **`vercel curl` + Set-Cookie** from signup does not yield a working session on subsequent GET (checkout POST does not require session — so T3 smoke is not a counterexample).
2. **Minted `studio_session`** (local `SESSION_SECRET` + `createSessionToken`) still returned **401** on Preview — indicates **Preview `SESSION_SECRET` parity** with local mint was not verified (Owner env pull not executed in this session).

**Shared infrastructure proof:** Seeded file and campaign are on the same Test DB Preview uses; once session auth is confirmed (env parity or curl cookie fix), hosted download should exercise the same registry row.

**Helper:** `node scripts/hosted-preview-t5-file-room.mjs dpl_6U6ocV5dd1yxDeY79LGxPyreNjHo https://the-studio-company-b381ngezk-stayonme73s-projects.vercel.app`

---

## 6. T3 / T4 reconfirmation

Closeout edits **materially touch payment activation** (`confirm.ts`, `activate.ts`) but are **not deployed** to **`dpl_6U6ocV5…`**.

| Track | Action |
|-------|--------|
| **Deployed Preview (`dpl_6U6ocV5…`)** | **No rerun required** for sharp/bootstrap/lane/webhook/reconcile — prior **T3/T4 PASS** in `STUDIO-HOSTED-PREVIEW-SHARP-BOOTSTRAP-FIX-1-REPORT.md` stands |
| **After Owner commit + redeploy** | Re-run signed test webhook + reconcile + Postgres probe + optional T5 script |

---

## 7. Release recommendation

**Ready for Owner review commit** (product 18 files + closeout QA files above).  
**Exclude** ops artifacts, vitest dumps, and `.cursor/hooks.json` from commit.

**Not authorized in this package:** Production migration, promotion, live Stripe, merge to `main`, publication, Vercel Production deploy.

---

## 8. Register pointer

See **`STUDIO-PRODUCTION-PERSISTENCE-STORAGE-CUTOVER-1-REGISTER.md`** — closeout row appended; prior timestamps and **`STUDIO-HOSTED-PREVIEW-SHARP-BOOTSTRAP-FIX-1-REPORT.md`** evidence preserved.
