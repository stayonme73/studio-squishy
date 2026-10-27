# STUDIO-HOSTED-PREVIEW-SHARP-FIX-FINAL-CLOSEOUT — Final report

**Written:** 2026-10-26 ~10:24 PM (America/New_York)  
**GitHub branch:** `operating/mobile-customer-journey-certification-1-thin-release`  
**Commit (product release):** **`2297df3e51bd48047979f47ab4c1959d34988f5f`**  
**Follow-up commit (T5 runner):** pending push — cookie-jar session fix for hosted File Room  
**Canonical Preview deployment:** **`dpl_569875Y8CPp9NTTMYycNVuwEwQzd`**  
**Preview URL:** `https://the-studio-company-q7ekwyk0h-stayonme73s-projects.vercel.app`  
**Production:** **`fc56426`** unchanged  
**Verdict:** **PASS WITH LIMITS** — hosted payment-to-file-delivery slice certifiable on Preview; **Production Team multi-worker concurrency OPEN**

---

## Authorization executed

| Step | Result |
|------|--------|
| Commit approved product + QA + evidence | **DONE** @ `2297df3e` |
| Push thin release (no force) | **DONE** — remote matches `2297df3e` |
| Preview deploy (Test Stripe/Postgres, email off) | **DONE** — `dpl_569875…` (redeploy after Preview env refresh) |
| `NEXT_PUBLIC_SITE_URL` | **Set** to canonical Preview host |
| Preview `SESSION_SECRET` | **Rotated** via `preview-deploy-set-vercel-env.mjs` (Preview-scoped only; not Production) |
| Hosted T5 (legitimate session) | **PASS** |
| Activation / `pending_retry` regressions | **PASS** (120s timeout) |
| OLD Production site | **UNCHANGED** |

---

## Hosted T5 — customer File Room (disposable)

**Session path:** Preview **signup → login**; **`vercel curl` cookie jar (`-c`/`-b`)** — same server-issued `studio_session` as browser sign-in. Manual `-H Cookie:` does **not** authenticate on GET (CLI quirk); cookie jar does.

| Check | Result @ **`dpl_569875Y8CPp9NTTMYycNVuwEwQzd`** |
|-------|--------------------------------------------------|
| Owner client download | **200** |
| Unrelated signed-in client | **403** |
| SHA-256 vs seeded Test Supabase object | **PASS** — `bba534fafb96317315ef52a51bb00a64f98d9d9260ec5bbc59b2d8dd4d48230b` |
| Campaign / file (disposable) | `disposable-hosted-t5-007c8f36` · `file:disposable-hosted-t5-007c8f36:v2-rtu-flyer:final_delivery:…` |

**Runner:** `node scripts/hosted-preview-t5-file-room.mjs dpl_569875Y8CPp9NTTMYycNVuwEwQzd https://the-studio-company-q7ekwyk0h-stayonme73s-projects.vercel.app`

---

## Payment / API on Preview (spot check)

| Check | Result |
|-------|--------|
| `hosted-preview-payment-smoke.mjs` signup + checkout | **200** / `cs_test_…` |
| Prior T3 webhook + Postgres (same Test project) | **Valid pattern** — re-run after deploy when signing with Preview `STRIPE_WEBHOOK_SECRET` |
| `activateAfterPayment` → `pending_retry` on throw | **In commit `2297df3e`** — covered by unit/integration suites below |

---

## Regressions (focused)

| Suite | Result |
|-------|--------|
| `disposable-sp-cert-design-renderer-boundary.test.ts` | **PASS** (3/3) |
| `disposable-kit-test-isolation.test.ts` | **PASS** (12/12) |
| `activate.test.ts` | **PASS** (12/12) @ **120s** timeout — prior 5s timeouts **resolved** |
| `recover.test.ts` | **PASS** (10/10) @ **120s** timeout — prior 5s timeouts **resolved** |
| `hosted-preview-t5-fixture.test.ts` (seed + local route) | **PASS** (via T5 runner env) |

---

## OPEN limits (explicit)

1. **`/tmp` lane locks on Vercel** — **per-instance only**; does **not** certify safe concurrency across multiple hosted Machine workers. **Production Team factory certification remains OPEN.**
2. **Preview `SESSION_SECRET` rotation** — Preview env refresh mints a new secret; always **redeploy Preview** after full env script run; do not assume local `.env.local` matches Preview for minting cookies.
3. **Deployment protection** — Preview uses Vercel authentication; customer API proofs use **`vercel curl`** (or browser with team access), not raw unauthenticated `fetch` to the host.
4. **No Production** migration, live Stripe, merge to `main`, or publication in this package.

---

## Deploy trail (this closeout)

| Deployment | Notes |
|------------|--------|
| `dpl_GNsEczQjh6n9zwDJHPj5sioUxW92` | First deploy @ `2297df3e`; superseded after env refresh |
| **`dpl_569875Y8CPp9NTTMYycNVuwEwQzd`** | **Canonical** — env-aligned redeploy; **T5 PASS** |

Prior accepted sharp fix deploy `dpl_6U6ocV5…` superseded for certification purposes by **`dpl_569875…` @ `2297df3e`**.

---

## Register

Updated in **`STUDIO-PRODUCTION-PERSISTENCE-STORAGE-CUTOVER-1-REGISTER.md`** with SHA, deployment id, T5 PASS, and OPEN concurrency gate.
