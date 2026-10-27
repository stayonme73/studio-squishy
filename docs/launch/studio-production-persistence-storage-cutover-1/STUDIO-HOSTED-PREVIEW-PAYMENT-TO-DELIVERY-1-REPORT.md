# STUDIO-HOSTED-PREVIEW-PAYMENT-TO-DELIVERY-1 — Report

**Written:** 2026-10-26 ~9:05 PM (America/New_York)  
**Agent:** Scout (Cursor)  
**GitHub thin-release ref:** `e3bc65a1` on `operating/mobile-customer-journey-certification-1-thin-release`  
**Verdict:** **NOT ACCEPTED — genuine blocker on hosted payment/file API routes**

---

## 1. Canonical Preview deployment (thin-release aligned)

| Field | Value |
|-------|--------|
| **Canonical URL** | `https://the-studio-company-gvkkmu2wr-stayonme73s-projects.vercel.app` |
| **Deployment ID** | **`dpl_D2HEhN3KXV81zqgrKrMqx3nvxqkg`** |
| **Built from** | Local workspace @ thin-release branch (includes `e3bc65a1` + uncommitted payment bundle experiments — see §6) |
| **Prior candidates** | `dpl_5tfHBWsMLMzYfEXUKHnixNVxDkmB` (kqnml95), `dpl_H59sBCssXYbQNYf97SpEcQYX7Urk` (rnqpyzvgo) — same payment failure class |
| **Preview env** | Refreshed via `scripts/preview-deploy-set-vercel-env.mjs` — Test Postgres `tzyglhypseyokhbeozjw`, `studio-files-test`, Stripe **test**, `TRANSACTIONAL_EMAIL_PROVIDER=none` |
| **Production** | **Unchanged** (`fc56426` on `studio-squishy.vercel.app`) |

**T1 / T2 (not rerun for acceptance):** Signup on **`dpl_D2HEhN3KXV81zqgrKrMqx3nvxqkg`** → **`POST /api/auth/signup` 200** (disposable email, session cookie).

---

## 2. Smoke results

| Tier | Result | Evidence |
|------|--------|----------|
| **T1** | **Not rerun** | Per owner — prior PASS retained |
| **T2** | **PASS (spot-check)** | Signup **200** on canonical deployment (above) |
| **T3 — Pay** | **FAIL (blocker)** | All probed **`/api/payments/*`** routes return **Next.js 500 HTML** (`__next_error__`), not JSON from handlers — **before** Stripe checkout, webhook, or reconcile can run |
| **T4 — Persistence** | **PASS WITH LIMITS (identity only)** | Signup continues to write **`studio_users`** on Test Postgres (same class as signup recovery). **Campaign / payment spine not proven on Preview** — blocked by T3 |
| **T5 — File Room** | **FAIL (blocked)** | **`GET /api/file-room/files/.../download`** → same **500 HTML** on Preview; hosted upload/download path not reachable |

---

## 3. Blocker detail (T3)

**Symptom:** Hosted payment APIs crash at function bootstrap, not application-level decline.

| Route | Expected | Observed |
|-------|----------|----------|
| `POST /api/payments/checkout-session` | JSON (`ok` / error) | **500 HTML** |
| `GET /api/payments/reconcile?session_id=…` | JSON **422** unknown session | **500 HTML** |
| `POST /api/payments/webhook` | JSON **400** missing signature | **500 HTML** |
| `POST /api/payments/sandbox-confirm` | JSON (fail-closed with Stripe keys) | **500 HTML** (prior deployments) |

**Counterproof (logic + Test infra OK):** Local **`NODE_ENV=production`** + **`VERCEL_ENV=preview`** simulation with Test `DATABASE_URL` and Stripe **test** key → **`createCheckoutSession`** **PASS** (Campaign Launch Kit condensed offer, `cs_test_…` URL returned). See `scripts/probe-hosted-checkout-local.mjs`.

**Conclusion:** Blocker is **hosted serverless execution** of payment (and file-room) route modules on Vercel Preview, not Stripe test-mode business rules or missing Test Postgres for auth.

---

## 4. T5 infrastructure (off Preview, bounded)

**Hosted File Room:** Not exercised — API **500** on Preview.

**Test bucket sanity (local runner, same credentials as Preview env script):**  
`studio-prelaunch-infrastructure-phase-a-integration` — **“uploads, backs up, restores…”** → **PASS** against **`studio-files-test`** (Supabase Test). This confirms **storage credentials and bucket** remain valid; it does **not** substitute for hosted `/api/file-room` acceptance.

---

## 5. Regressions run

| Test | Result |
|------|--------|
| Phase A Supabase upload/backup (focused) | **PASS** |
| Full 42/42 / 4/4 | **Not run** (per standing order) |
| Local `createCheckoutSession` production-like probe | **PASS** |

---

## 6. Uncommitted local experiments (not on GitHub)

Attempted **Preview-only** deploy fixes ( **not committed/pushed** per owner rule):

- `next.config.ts` — add **`stripe`**, **`pg`** to `serverExternalPackages`
- Payment routes — `export const runtime = "nodejs"` on checkout-session, reconcile, sandbox-confirm

**Redeploy `dpl_D2HEhN3KXV81zqgrKrMqx3nvxqkg`:** payment routes **still 500 HTML**. Further diagnosis requires **Vercel function runtime logs** (digest) or a minimal payment health route — **needs Owner authorization to commit** a targeted fix package.

---

## 7. Recommended next package (not started)

1. **Owner authorize** commit on thin-release: payment route runtime + bundle/external package hardening + minimal `/api/payments/health` (Preview-only diagnostic, no secrets).
2. **Vercel dashboard:** verify Preview **`STRIPE_SECRET_KEY`** / **`STRIPE_WEBHOOK_SECRET`** (same corruption class as fixed **`DATABASE_URL`**); re-enter if needed; register **test** webhook → `https://<preview-host>/api/payments/webhook`.
3. **Resume T3:** disposable Campaign Launch Kit checkout → Stripe test pay → webhook + reconcile → **`studio_campaigns`** / **`studio_payment_*`** rows on Test Postgres.
4. **Resume T5:** authorized upload + download **200** / stranger **403** on Preview.

---

## 8. Stop criteria

No Production changes, no live Stripe, no merge to `main`, no public launch.

**Package status:** **STOPPED at genuine blocker** — hosted **`/api/payments/*`** (and **`/api/file-room/*`**) **500** on Preview.
