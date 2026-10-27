# STUDIO-HOSTED-PREVIEW-SHARP-BOOTSTRAP-FIX-1 — Execution report

**Written:** 2026-10-26 ~9:52 PM (America/New_York)  
**Branch (local):** `operating/mobile-customer-journey-certification-1-thin-release`  
**Canonical Preview deployment:** **`dpl_6U6ocV5dd1yxDeY79LGxPyreNjHo`**  
**Canonical Preview URL:** `https://the-studio-company-b381ngezk-stayonme73s-projects.vercel.app`  
**`NEXT_PUBLIC_SITE_URL`:** aligned to canonical host (Preview env refresh)  
**Verdict:** **PASS WITH LIMITS** — API bootstrap restored; **T3/T4 PASS** on hosted Preview; **T5 partial**

No git commit or push (per Owner rule). All changes remain **uncommitted** in the workspace.

---

## Root cause (confirmed)

1. **Barrel imports** — Payment/File Room server graphs pulled `@/lib/studio-design-renderer` (full index → `sharp`) via materials store and payment isolation guards.
2. **Turbopack external `sharp`** — Default externalization + incomplete native tracing → `libvips-cpp.so.8.18.3` missing on `nodejs24.x`.
3. **Post-fix follow-on (hosted only)** — Quick/heavy lane occupancy used read-only `/var/task/data/...` on Vercel; fixed to `/tmp` without changing local `data/` behavior.

Design rendering lanes were **not** removed or stubbed; dispatch/observers still run when activation proceeds.

---

## Files changed

| File | Change |
|------|--------|
| `src/lib/materials/store.ts` | Import `contracts` submodule only |
| `src/lib/materials/requirements.ts` | Same narrow import |
| `src/lib/studio-payment/disposable-test-isolation-guards.ts` | Import `promo-types` / `social-posts-types` only |
| `src/lib/studio-payment/reconcile.ts` | Lazy import recovery + confirm |
| `src/lib/studio-payment/confirm.ts` | Lazy import recovery; catch activation failures after paid truth |
| `src/lib/studio-payment/webhook.ts` | Lazy import `confirm` |
| `next.config.ts` | Drop `sharp` from `serverExternalPackages`; add `outputFileTracingIncludes` for `@img` + `sharp`; remove wasm32 exclude under `/api/**` |
| `package.json` | `optionalDependencies`: `@img/sharp-linux-x64` |
| `src/lib/job-control/quick-lane-admission.ts` | Vercel → `/tmp/studio-lane-occupancy` |
| `src/lib/job-control/heavy-occupancy-lock.ts` | Vercel → `/tmp/.../heavy.lock.json` |
| `scripts/hosted-preview-payment-smoke.mjs` | Stricter success check |
| `scripts/*` (probes) | Disposable T3/Postgres helpers (not required for product runtime) |

---

## Build / regression

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **PASS** (after lazy-import edits; before final deploy) |
| `npm run build` | **PASS** (~8 min, prior deploy cycle) |
| `disposable-sp-cert-design-renderer-boundary.test.ts` | **PASS** (3/3) earlier in session |
| Full vitest / Phase B | **Not re-run** — local `vitest` unavailable after `npm install` in this workspace (devDependency resolution); prior Phase A storage PASS retained |

---

## Hosted verification (Preview + Test only)

### Initialization (blocker cleared)

| Route | Expected | Result @ **`dpl_6U6ocV5dd1yxDeY79LGxPyreNjHo`** |
|-------|----------|--------------------------------------------------|
| `GET /api/payments/reconcile?session_id=cs_test_probe` | JSON `unknown_session` | **PASS** |
| `POST /api/payments/checkout-session` (smoke) | JSON `ok` + `cs_test_…` | **PASS** |
| `GET /api/file-room/files/test/download` | JSON (auth), not HTML 500 | **PASS** (`Authentication required`) |
| `POST /api/payments/webhook` (signed test event) | JSON 200 | **PASS** |

### T3 — Pay (disposable Campaign Launch Kit)

| Step | Result |
|------|--------|
| Signup + checkout session | **PASS** — `cs_test_a1ngKheZ6Yr1clXS5U5wEN5y4Jc3fMBqRPunJPfQmpLaYF8s9BtMV4NGP7` |
| Signed Stripe **test** webhook (local `whsec_*` matching Preview env) | **PASS** — `HTTP 200` `{"ok":true,...}` |
| Reconcile | **PASS** — `paid: true`, `status: confirmed` |

### T4 — Durable persistence (Test Postgres)

| Check | Result |
|-------|--------|
| `studio_payment_sessions` row for session id | **PASS** — campaign `disposable-hosted-preview-69b0e7ba` |
| `studio_campaigns.envelope.record.paymentReceivedAt` | **PASS** — `paid: true` |
| `studio_payment_events` | **PASS** — count **1** |

### T5 — File Room

| Check | Result |
|-------|--------|
| Hosted download route initializes | **PASS** (JSON auth gate) |
| Full hosted upload → authorized 200 / stranger 403 on Preview | **NOT RUN** (no end-to-end file fixture on this deployment in this package) |
| Phase B integration (local Test Supabase + Postgres) | **NOT RE-RUN** (vitest tooling gap above) |

---

## Remaining limits

- **Not committed/pushed** to `operating/mobile-customer-journey-certification-1-thin-release` — Owner must authorize commit + push to freeze on GitHub.
- **T5 hosted upload/download + stranger denial** still needs one bounded Preview exercise (or Phase B re-run when vitest is restored).
- **Stripe Checkout in browser** not used; paid truth established via **signed test webhook** (valid for Preview/Test infra proof; not a substitute for Dashboard webhook endpoint registration for ongoing Preview ops).
- **Production** unchanged; no live Stripe; no merge to `main`.
- Prior Preview deployment IDs (`dpl_D2HEh…`, `dpl_AXbU6…`, etc.) superseded by **`dpl_6U6ocV5dd1yxDeY79LGxPyreNjHo`**.

---

## Prior deploy trail (this package session)

| Deployment | Notes |
|------------|--------|
| `dpl_2LDNd37YvtkcrrwsRnbRso843MXt` | Narrow imports only — still `sharp` 500 |
| `dpl_AXbU6kHLLb67gZvuNodqVWfZVYqy` | Reconcile JSON OK; webhook `sharp` then lane `mkdir` |
| `dpl_EcNBE4wzCdtfUhE9DWSmDMwLak4G` | `sharp` traced; lane occupancy 500 |
| **`dpl_6U6ocV5dd1yxDeY79LGxPyreNjHo`** | **Accepted canonical** for this report |
