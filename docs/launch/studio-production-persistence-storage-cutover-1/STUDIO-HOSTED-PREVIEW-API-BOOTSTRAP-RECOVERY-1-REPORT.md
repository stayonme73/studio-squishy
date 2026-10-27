# STUDIO-HOSTED-PREVIEW-API-BOOTSTRAP-RECOVERY-1 — Report

**Written:** 2026-10-26 ~9:05 PM (America/New_York)  
**Deployment:** **`dpl_D2HEhN3KXV81zqgrKrMqx3nvxqkg`** · `https://the-studio-company-gvkkmu2wr-stayonme73s-projects.vercel.app`  
**Branch:** `operating/mobile-customer-journey-certification-1-thin-release` @ **`e3bc65a1`**  
**Verdict:** **Root cause identified — not Stripe, not Postgres auth.** Hosted payment and File Room routes die at **`sharp`** native module load during serverless bootstrap.

---

## 1. Vercel runtime logs (captured before any code changes)

Source: `npx vercel logs --deployment dpl_D2HEhN3KXV81zqgrKrMqx3nvxqkg` (2026-10-27T00:58–01:01Z window; reprobe reconcile @ 01:01:03Z).

| Request | Method | `deploymentId` | Exception (abbrev.) |
|---------|--------|----------------|---------------------|
| `/api/payments/checkout-session` | POST | `dpl_D2HEhN3KXV81zqgrKrMqx3nvxqkg` | Failed to load external module **`sharp-20c6a5da84e2135f`** |
| `/api/payments/reconcile?session_id=cs_test_fake` | GET | same | same |
| `/api/payments/reconcile?session_id=cs_test_probe` | GET | same | same |
| `/api/file-room/files/test/download` | GET | same | same |

**Full error class (all rows):**

```text
Error: Could not load the "sharp" module using the linux-x64 runtime
ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3: cannot open shared object file: No such file or directory
    at Context.externalImport [as y] (.next/server/chunks/[turbopack]_runtime.js:607:15)
    at async (.next/server/chunks/[root-of-the-server]__07473um._.js:1:2342)
```

**Runtime:** `nodejs24.x` · region `iad1` · environment **preview**.

Handlers never run — customer sees Next.js **500 HTML** (`__next_error__`), not payment/File Room JSON.

---

## 2. Working signup vs failing routes

| Route | Bootstrap | Handler reached? | Import graph (summary) |
|-------|-----------|------------------|-------------------------|
| **`POST /api/auth/signup`** | No `sharp` in logs | Yes (JSON **200** / **503** when session misconfigured) | `@/lib/auth/*` → `@/lib/studio-durable-persistence/postgres-identity` — **no** `@/lib/studio-design-renderer` barrel |
| **`/api/payments/*`** | **`sharp` DLOPEN** | No | Payment spine → `@/lib/campaign-store/*`, `@/lib/studio-payment/*` including guards that import **`@/lib/studio-design-renderer`** (barrel) |
| **`/api/file-room/*`** | **`sharp` DLOPEN** | No | `@/lib/campaign-tasks/store` → `@/lib/materials/store` → **`@/lib/studio-design-renderer`** (barrel) |

**Configuration difference that matters:** not missing Stripe keys on first load — the function crashes loading **`sharp`** via Turbopack **`serverExternalPackages`** before env-dependent logic executes.

**Code anchors (import coupling, not a redesign):**

- `src/lib/materials/store.ts` — `FLYER_PROOF_CONTRACT`, `isDesignRendererProofSku` from **`@/lib/studio-design-renderer`** (full index re-exports capture/render pipelines).
- `src/lib/studio-payment/disposable-test-isolation-guards.ts` — `DESIGN_RENDERER_*_SKU` from same barrel.
- `src/lib/campaign-tasks/store.ts` — `getOrInitializeMaterials` from materials store (File Room registry lists tasks envelopes).

`next.config.ts` already lists **`sharp`** under **`serverExternalPackages`** (with **`@img/sharp-wasm32`** excluded from `/api/**` file tracing). On this deployment, externalized **`sharp`** resolves without a usable **libvips** `.so` in the lambda filesystem.

---

## 3. Preview Stripe TEST and route dependencies (no secrets printed)

### 3a. Vercel Preview — variable presence (`npx vercel env ls preview`)

| Name | Preview scope | Notes |
|------|---------------|--------|
| `STRIPE_SECRET_KEY` | Secret | present |
| `STRIPE_WEBHOOK_SECRET` | Secret | present |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Config | present |
| `STRIPE_MODE` | Secret | present |
| `DATABASE_URL` | Secret | present |
| `NEXT_PUBLIC_SUPABASE_URL` | Config | present |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | present |
| `SUPABASE_STORAGE_BUCKET` | Secret | present |
| `STUDIO_PERSISTENCE_BACKEND` | Secret | present |
| `SESSION_SECRET` | Secret | present |
| `TRANSACTIONAL_EMAIL_PROVIDER` | Secret | present |
| `NEXT_PUBLIC_PAYMENT_SANDBOX` | Config | `1` |
| `VERCEL_SUPPORT_LARGE_FUNCTIONS` | Secret | present |

Non-secret pull check: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` begins with **`pk_test_`**; `NEXT_PUBLIC_SUPABASE_URL` host includes Persistence Test ref **`tzyglhypseyokhbeozjw`**.

Secrets cannot be pulled via CLI (`[SENSITIVE]` placeholders). **Prefix/mode validation** against owner `.env.local` source used by `scripts/preview-deploy-set-vercel-env.mjs`:

| Key | Mode check |
|-----|------------|
| `STRIPE_SECRET_KEY` | **`sk_test_*`** OK |
| `STRIPE_WEBHOOK_SECRET` | **`whsec_*`** OK |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **`pk_test_*`** OK |
| `STRIPE_MODE` | **`test`** |
| Test DB / Supabase URLs | Test ref **`tzyglhypseyokhbeozjw`** OK |
| Storage bucket | **`studio-files-test`** OK |

**Limit:** Cannot prove Preview secrets are uncorrupted (same class as prior `DATABASE_URL` paste) without dashboard re-entry — but **current failures occur before Stripe/DB handlers**, so corruption is **not the primary hypothesis**.

### 3b. Config drift (secondary)

Preview `NEXT_PUBLIC_SITE_URL` (env pull) still points at **`rnqpyzvgo`** host, not canonical **`gvkkmu2wr`**. Fix when resuming payment smokes; **not** the cause of API **500** bootstrap.

---

## 4. Shared root cause?

**Yes — one bootstrap failure class for both payment and File Room on this deployment.**

Evidence:

- Identical stack trace and **`[root-of-the-server]__07473um._.js`** chunk for checkout, reconcile, and file-room download.
- Same **`sharp` / libvips** message; no separate Stripe or Supabase exception in logs.

**Mechanism (hypothesis, consistent with logs + import graph):**

1. Server routes that pull **`@/lib/studio-design-renderer`** (barrel) or **`materials/store`** into the shared server chunk.
2. Turbopack externalizes **`sharp`** (`serverExternalPackages`).
3. Lambda runtime on **`nodejs24.x`** cannot load **linux-x64** libvips → module init throws → Next **500** for every route in that chunk.

Payment-specific business logic and File Room ACL logic were **not evaluated** on Preview for this package.

---

## 5. Recommended fix package (not executed — needs Owner commit/deploy authorization)

Minimal, no rebuild of payment/File Room business rules:

1. **Break the barrel import** — change `materials/store` and `disposable-test-isolation-guards` to import from **`@/lib/studio-design-renderer/contracts`** (or other sharp-free modules) instead of **`@/lib/studio-design-renderer`** index.
2. **Revisit `next.config.ts`** — either stop externalizing **`sharp`** for `/api/**` so linux binaries trace into the function, or ensure Vercel install includes **`@img/sharp-linux-x64`** without stripping `.so` files (audit `outputFileTracingExcludes`).
3. **Redeploy** thin-release; rerun **T3/T5** on **`dpl_*`** canonical host.
4. Align **`NEXT_PUBLIC_SITE_URL`** to active Preview URL.

Local counterproof remains valid: production-like **`createCheckoutSession`** probe passes with Test DB + Stripe test keys.

---

## 6. Stop

No Production promotion, no live Stripe, no commit/push in this package unless separately authorized.

**Package status:** **Diagnosis complete — blocker = hosted `sharp` bootstrap on shared server chunk, not independent payment vs File Room failures.**
