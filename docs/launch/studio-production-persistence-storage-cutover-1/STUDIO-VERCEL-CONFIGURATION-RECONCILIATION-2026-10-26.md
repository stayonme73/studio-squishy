# STUDIO — Vercel configuration reconciliation (2026-10-26)

**Project (Owner-verified):** `the-studio-company`  
**Release code ref:** `ed36ba5c817c7c5c78c78bfd53eb4be5d9b7257b`  
**Method:** Owner dashboard read-only + repo `@ ed36ba5c` env contract (no secret values read)

---

## 1. Vercel state — VERIFIED (Owner, 2026-10-26)

| Item | Status |
|------|--------|
| Production domain **`studio-squishy.vercel.app`** | Serves **OLD** Studio |
| Visible Production deployment | **2025-06-22**, Git **`main`**, commit **`fc56426`** |
| Git repository connection | **None** (“no repository currently connected”) |
| Production environment | Exists; **no branch tracking** |
| Preview / Development environments | Exist |
| Production env vars | **Many configured** (names visible; **values UNKNOWN**) |
| **`STUDIO_PERSISTENCE_BACKEND` / `DATABASE_URL`** | **Not visible in supplied screenshots** — **status UNKNOWN** until full Production env inventory |

---

## 2. Configuration delta — NEW Studio (`ed36ba5c`) vs existing Vercel Production

**Legend:** REUSE = likely same name/value after Owner confirms target; ADD = required for postgres cutover; ALIAS = add NEW name copying existing secret value; LEGACY = old deploy only — do not depend for NEW; REVIEW = confirm value targets Production Supabase `txgzguzlojlhndkbncc`.

| Vercel (Owner saw) | Required by `ed36ba5c` | Reconciliation |
|--------------------|-------------------------|----------------|
| `SESSION_SECRET` | `SESSION_SECRET` | **REUSE** — required for auth cookies |
| `SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` | **ALIAS** — File Room reads **`NEXT_PUBLIC_SUPABASE_URL`** only (`resolveSupabaseStorageEnv`); set public URL var to same Production project URL or add NEXT_PUBLIC_ copy at cutover |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | **REUSE** — **REVIEW** ref `txgzguzlojlhndkbncc` |
| *(not confirmed)* | `SUPABASE_STORAGE_BUCKET` | **ADD if missing** — value **`studio-files`** (bucket verified private) |
| `RESEND_API_KEY` | `RESEND_API_KEY` | **REUSE** |
| `NEXT_PUBLIC_SITE_URL` | `NEXT_PUBLIC_SITE_URL` | **REUSE** — must be public HTTPS (not localhost) for auth links |
| `STUDIO_DURABLE_STATE_PROVIDER` | *(not referenced in `ed36ba5c`)* | **LEGACY** — superseded by **`STUDIO_PERSISTENCE_BACKEND`** + postgres adapters |
| `STUDIO_PERSISTENCE_BACKEND` | `postgres` for cutover | **ADD or REUSE** — verify full inventory; default in code is **filesystem** if unset |
| `DATABASE_URL` | `DATABASE_URL` / `STUDIO_DATABASE_URL` | **ADD or REUSE** — Production pooler for `txgzguzlojlhndkbncc`; verify full inventory |
| Auth / campaign / materials / production / communication / payment-control vars | Various routes | **REUSE where names match** — spot-check after Preview deploy; values UNKNOWN |
| Stripe / payment vars | `STRIPE_*`, sandbox flags | **REUSE** (test mode until T-07) — no live activation in cutover prep |
| `TRANSACTIONAL_EMAIL_PROVIDER` | defaults **`resend`** | **ADD if absent** (optional) |
| `TRANSACTIONAL_EMAIL_FROM` / `REPLY_TO` | same | **REUSE** if present |
| `AUTH_EMAIL_VERIFY_TOKEN_TTL_MINUTES` | optional TTL | **ADD if absent** (defaults 60 in code) |
| `AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES` | optional TTL | **ADD if absent** |
| `AUTH_EMAIL_…PROVIDER` (Needs Attention) | **Not used** in `ed36ba5c` | See §4 — likely **legacy / integration orphan** |
| `AUTH_PASSWO…PROVIDER` (Needs Attention) | **Not used** in `ed36ba5c` | See §4 |
| `STUDIO_PERSISTENCE_TEST_*` | test-only | **Do not** copy to Production |
| `STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF` | optional guard | **ADD** non-secret `txgzguzlojlhndkbncc` (recommended) |

**Preview-only (recommended first deploy):** clone Production env to **Preview**, add postgres vars on **Preview** first; leave **Production** env serving **`fc56426`** until promote.

---

## 3. Safest deployment path for `ed36ba5c` (does not alter live OLD site)

**Constraint:** Do **not** merge to `main`; do **not** reconnect Git without separate authorization; do **not** auto-promote.

| Step | Action |
|------|--------|
| 1 | Keep **Production domain** assigned to current deployment **`fc56426`** (OLD Studio). |
| 2 | Deploy **`ed36ba5c`** to **Preview only**: Vercel CLI from local checkout at release ref (`vercel link` to project `the-studio-company`, then **`vercel deploy`** without `--prod`) **or** Dashboard **Create Deployment** by commit SHA once Git link is authorized later. |
| 3 | Configure **Preview** environment variables (postgres + `NEXT_PUBLIC_SUPABASE_*` + bucket + reuse secrets from Production where valid). |
| 4 | Run cutover **smokes on Preview URL** (Stripe test, claim, file 200/403) after Production DB migrations — migrations still Production DB; Preview can point at same DB only with explicit Owner acceptance of risk (prefer Preview env + staging DB policy if split later). |
| 5 | **Promote** Preview deployment to Production **only** after Owner EXECUTE GO — single swap replaces OLD site on `studio-squishy.vercel.app`. |

**Lower risk variant:** Preview deploy + Preview env targeting **Persistence Test** ref for UI-only smoke; Production postgres cutover + Production env on **promoted** deployment only.

**Not authorized in this package:** Git reconnect, `--prod` deploy, promote, domain changes.

---

## 4. “Needs Attention” — `AUTH_EMAIL_…PROVIDER` & `AUTH_PASSWO…PROVIDER` (read-only)

**Repo finding (`ed36ba5c`):** No `AUTH_EMAIL_*_PROVIDER` or `AUTH_PASSWORD_*_PROVIDER` variables. Email verification and password reset use **custom auth** + **`TRANSACTIONAL_EMAIL_PROVIDER`** (default `resend`) + TTL vars `AUTH_EMAIL_VERIFY_TOKEN_TTL_MINUTES` / `AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES` — not `*_PROVIDER` pairs.

**Likely cause of Vercel “Needs Attention”:** Orphaned or integration-linked secrets (e.g. past Supabase/Vercel integration or OLD app template) where the integration is **disconnected** (matches “no repository connected”) or values are **stale/empty**. Vercel flags these without exposing values.

**Owner read-only next step (no credential changes):** Open each flagged var in dashboard → note **exact full name**, **scope** (Production/Preview), and **reason** Vercel shows (expired integration, empty, sensitive exposure). If names are not referenced in `ed36ba5c`, mark **safe to retire at cutover** after Preview proves auth without them.

**No secrets were read or modified in this reconciliation.**

---

## 5. Recovery readiness (unchanged + Vercel context)

| Layer | Status |
|-------|--------|
| Supabase Production identity / bucket / scheduled DB backups | **VERIFIED** Owner 2026-10-26 |
| PITR | **Not enabled** |
| Restore demonstrated | **No** |
| Storage in DB backups | **No** |
| Live site rollback | **Pin** deployment **`fc56426`** — remains on Production until promote; rollback = **reassign Production to prior deployment** + DB restore if postgres cutover applied |

**Before EXECUTE:** Owner **accept `R-04` WITH EXPLICIT LIMITS** or authorize non-destructive restore drill (separate package).

---

## 6. Remaining prerequisites & Owner decisions

| # | Prerequisite | Owner decision |
|---|--------------|----------------|
| 1 | Full Production env inventory (incl. `STUDIO_PERSISTENCE_BACKEND`, `DATABASE_URL`) | Scroll/export list; confirm ADD vs REUSE |
| 2 | **`R-04` limits** acceptance | Sign or schedule drill |
| 3 | Production **five migrations** | EXECUTE GO |
| 4 | **Preview deploy** `ed36ba5c` + env reconciliation table | Authorize CLI or future Git deploy |
| 5 | **`NEXT_PUBLIC_SUPABASE_URL`** alias from `SUPABASE_URL` | At cutover (same value, new key name) |
| 6 | Resolve or retire **Needs Attention** auth provider vars | After exact names confirmed |
| 7 | **Promote** to Production domain | Only after Preview smokes + explicit GO |
| 8 | Stripe live / publication | **Out of scope** (T-07) |

**Cutover EXECUTE:** **NO-GO** until 1–4 + **`R-04`** addressed.  
**Vercel reconciliation:** **COMPLETE** (documentation); **deploy still NOT RUN**.

---

## 7. NEW Studio Preview readiness (`ed36ba5c`) — PREPARED, NOT EXECUTED

**Isolation doctrine:** Preview must use **Persistence Test** (`tzyglhypseyokhbeozjw`) + **Stripe test** + **non-production email**. **Never** point Preview at Production Postgres (`txgzguzlojlhndkbncc`), Production `studio-files`, `sk_live`, or Production customer records.

### 7.1 Minimum Preview environment variables (release code)

| Priority | Variable | Preview value source | Notes |
|----------|----------|---------------------|--------|
| **P0** | `SESSION_SECRET` | Preview-scoped secret (reuse Production *name* only if value is Preview-only — prefer distinct Preview secret) | Auth cookies |
| **P0** | `NEXT_PUBLIC_SITE_URL` | **Exact Preview HTTPS origin** (e.g. `https://<preview-host>.vercel.app`) | Required in production NODE_ENV for email links; set to deployed Preview URL |
| **P0** | `STUDIO_PERSISTENCE_BACKEND` | `postgres` | Default **filesystem** is not durable on serverless — Preview smokes need postgres |
| **P0** | `DATABASE_URL` | **Test** Session pooler only (`postgres.tzyglhypseyokhbeozjw…`) | **Preview env only** — must **override** any Production `DATABASE_URL` |
| **P0** | `NEXT_PUBLIC_SUPABASE_URL` | `https://tzyglhypseyokhbeozjw.supabase.co` | **Not** Production URL |
| **P0** | `SUPABASE_SERVICE_ROLE_KEY` | **Test** service role | **Preview env only** |
| **P0** | `SUPABASE_STORAGE_BUCKET` | `studio-files-test` | **Not** `studio-files` |
| **P1** | `NEXT_PUBLIC_PAYMENT_SANDBOX` | `1` | Enables sandbox confirm on Preview (`payment-sandbox.ts`) |
| **P1** | `STRIPE_SECRET_KEY` | `sk_test_…` only | Reject `sk_live` — block deploy if live prefix |
| **P1** | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` | |
| **P1** | `STRIPE_MODE` | `test` | |
| **P1** | `STRIPE_WEBHOOK_SECRET` | Test webhook secret for **Preview URL** `/api/payments/webhook` | Register endpoint in Stripe **test** mode for Preview host |
| **P2** | `TRANSACTIONAL_EMAIL_PROVIDER` | `none` **recommended** for Preview | Avoid real customer mail; auth signup survives with `not_configured` retry path |
| **P2** | `RESEND_API_KEY` / `TRANSACTIONAL_EMAIL_FROM` | Omit when provider `none` | If Owner wants mail proof, use test key + Owner inbox only |
| **Opt** | `STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF` | `txgzguzlojlhndkbncc` (non-secret) | Guardrail label only |
| **Do not set on Preview** | Production `SUPABASE_URL` / Production `DATABASE_URL` / `sk_live` / `STUDIO_PERSISTENCE_TEST_*` (laptop runner names) | — | Use standard app vars above with **Test** values |

**Reuse from Vercel Production env:** **Do not** bulk-copy Production variables to Preview. Production holds **UNKNOWN** targets; copying risks Production Supabase/Stripe. Set Preview table **explicitly** (Preview scope only in dashboard).

### 7.2 Deployment route (preserves OLD Production `fc56426`)

| Step | Action | Touches Production domain? |
|------|--------|----------------------------|
| 1 | Checkout **`ed36ba5c`** locally | No |
| 2 | `vercel link` → project **`the-studio-company`** (CLI; **not** Git reconnect) | No |
| 3 | Configure **Preview** environment variables (§7.1) in Vercel dashboard **before or after** first deploy | No |
| 4 | **`vercel deploy`** (no `--prod`) | No — creates Preview URL only |
| 5 | Set/update `NEXT_PUBLIC_SITE_URL` to Preview URL; **redeploy Preview** if needed for auth links | No |
| 6 | Run §7.4 smokes on Preview URL | No |
| **Forbidden** | `vercel deploy --prod`, Promote to Production, Git connect, merge `main` | Would replace OLD site |

### 7.3 Genuine Preview blockers

| Blocker | Mitigation |
|---------|------------|
| Preview env not yet populated with **Test** Supabase + postgres vars | Owner authorized **Preview-only** secret entry (EXECUTE package) |
| Production env vars inherited if “all environments” used | Owner sets **Preview** scope only; verify no `txgzguzlojlhndkbncc` in Preview `DATABASE_URL` / Supabase URL |
| `NEXT_PUBLIC_SITE_URL` mismatch | Match exact Preview host; redeploy Preview |
| Stripe webhook for Preview host | Create **test** webhook URL or limit smoke to sandbox-confirm without webhook-dependent paths |
| Test DB schema | Already applied via local 42/42 — **do not rerun**; optional sanity SELECT only |
| CLI not logged in / project not linked | Owner `vercel login` + link when EXECUTE authorized |
| Kitchen/provider keys (Anthropic, Shotstack, …) | **Not** required for Tier 1–3 Preview smokes |

### 7.4 Preview smoke scope (bounded)

| Tier | Scope | Pass criteria |
|------|--------|---------------|
| **T1 — Shell** | `/`, `/studio-lobby`, `/route-map`, `/help-center` | 200; NEW Lobby/condense visible (not Draft Room) |
| **T2 — Auth** | Sign-up / sign-in / session cookie | Account created; session persists refresh (**email `none` OK**) |
| **T3 — Pay (test)** | Sandbox checkout path with `NEXT_PUBLIC_PAYMENT_SANDBOX=1` | **No live charge**; test or sandbox-confirm only |
| **T4 — Persistence** | Disposable campaign id on **Test** postgres | Row visible in Test project (dashboard SQL or approved probe) |
| **T5 — File Room** | Upload + authorized download 200 / stranger 403 on **Test** bucket | Same pattern as prelaunch Phase A/B — **Test** only |
| **Out of scope** | Production migrations, Production Supabase, live Stripe, publication, 42/42 rerun, promote |

### 7.5 Rollback / stop criteria

**Stop immediately if:** Preview `DATABASE_URL` or Supabase URL contains **`txgzguzlojlhndkbncc`**; any `sk_live`; accidental **`--prod`** or Promote; real mail to non-Owner addresses when testing email.

**Rollback:** Production **`fc56426`** unchanged. Preview rollback = discard Preview deployment(s) or leave unused; no Production domain impact.

### 7.6 Authorization required (not granted in prep)

**Package:** `STUDIO-NEW-SITE-PREVIEW-DEPLOY-1` (proposed) — Owner **GO** for: (1) Preview-scoped Test env vars in Vercel, (2) CLI Preview deploy @ `ed36ba5c`, (3) bounded smokes §7.4. **Not** Production cutover, **not** promote, **not** Git connect unless separately authorized.
