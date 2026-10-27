# STUDIO-NEW-SITE-PREVIEW-SIGNUP-RECOVERY-1 — Report

**Written:** 2026-10-26 ~8:25 PM (America/New_York)  
**Agent:** Scout (Cursor)  
**Scope:** Preview + Persistence Test only · no Production cutover · no merge · no push without separate Owner authorization

---

## Verdict

**Preview signup blocker: RESOLVED (T2 PASS).**  
**Package acceptance:** **PASS WITH EXPLICIT LIMITS** — hosted customer signup + Test Postgres identity writes proven; T3/T5 hosted smokes not complete; GitHub sync still blocked.

| Item | Result |
|------|--------|
| Original deployment `dpl_4i9n7k4PJ8fj6Hca9Nf9UKAHKnqz` | T2 **PASS** after env fix (same URL Owner linked) |
| Recovery deployment `dpl_5Y85j95VUgHCuqjB3Hp9boJAQYb7` | **`https://the-studio-company-hmumffhe0-stayonme73s-projects.vercel.app`** — diagnostic deploy; T2 **PASS** |
| Production OLD site | **Unchanged** (`fc56426` on `studio-squishy.vercel.app`) |
| GitHub remote | Still **`ee8afb0d`** — push **not completed** (hang / prior HTTP 500; see §7) |

---

## 1. Symptom (T2)

- `POST /api/auth/signup` on Preview returned **500** with customer copy: *Account creation is temporarily unavailable.*
- T1 had already **PASS** on the same deployment.

---

## 2. Root cause (evidence-based)

**Primary:** Preview-scoped **`DATABASE_URL`** on Vercel did not authenticate against Persistence Test Postgres (`tzyglhypseyokhbeozjw`). Hosted signup calls `pgFindUserByEmail` / `pgInsertStudioUserIfAbsent`; connection failure surfaced as the generic 500 handler.

**How confirmed:**

1. Local full path (`NODE_ENV=production`, `STUDIO_PERSISTENCE_BACKEND=postgres`, Test `DATABASE_URL` from `.env.local`) → **PASS** (`scripts/preview-signup-path-probe.mjs`).
2. After re-uploading Preview env from `scripts/preview-deploy-set-vercel-env.mjs` (normalized password segment + transaction pooler `6543` + `pgbouncer=true`), `POST /api/auth/signup` with **valid JSON** → **200** + user payload + session cookie on both deployment IDs.
3. Brief diagnostic deploy exposed a **separate CLI artifact**: malformed JSON from PowerShell/`vercel curl` quoting produced `JSON.parse` errors that also mapped to the same 500 copy — not the browser/customer failure mode.

**Not the cause:** Missing `SESSION_SECRET` (would be **503**). `TRANSACTIONAL_EMAIL_PROVIDER=none` is **expected** (`verification.emailSent: false`, `deliveryCode: not_configured`).

---

## 3. Fix applied (Preview-only, no git push)

| Action | Detail |
|--------|--------|
| Re-run `node scripts/preview-deploy-set-vercel-env.mjs <Preview-HTTPS-URL>` | Refreshed Preview secrets; **`DATABASE_URL`** via `normalizePostgresUrl` + `vercelServerlessDatabaseUrl`; set **`NEXT_PUBLIC_SITE_URL`** to active Preview host |
| Script hardening (local, uncommitted) | Password re-encoding; optional Preview URL arg; hosted postgres guard + signup log line (see §8) |
| Redeploy | **`dpl_5Y85j95VUgHCuqjB3Hp9boJAQYb7`** for bounded diagnostics (removed preview error body before handoff) |

---

## 4. Smoke results (§7.4)

| Tier | Result | Evidence |
|------|--------|----------|
| **T1 — Shell** | **PASS** (prior) | Unchanged — NEW homepage, not Draft Room |
| **T2 — Auth** | **PASS** | `POST /api/auth/signup` **200**; disposable emails `scout-preview-t2-*@example.com`; verification `not_configured` OK; `Set-Cookie: studio_session` |
| **T3 — Pay (test)** | **NOT RUN** | Preview has **`sk_test_*`** configured; `sandbox-confirm` is fail-closed when Stripe keys present. Probe to `/api/payments/sandbox-confirm` returned **500 HTML** — **new defect**, out of signup-recovery scope; needs dedicated hosted checkout smoke (Stripe test session or env policy) |
| **T4 — Persistence** | **PASS WITH LIMITS** | **2** rows in Test `studio_users` for scout T2 probe emails (`scripts/probe-t4-scout-signup-rows.mjs`); campaign envelope tier not exercised |
| **T5 — File Room** | **NOT RUN** | Blocked on T3 + upload fixture path |

---

## 5. Regressions (focused, local)

- `scripts/preview-signup-path-probe.mjs` — **PASS** (hosted-like env).
- `src/lib/auth/account-creation.test.ts` — **1 failure** pre-existing guard/source assertion mismatch with new `requirePostgresPersistenceOnHostedRuntime` (fix before commit).
- Full 42/42 / 4/4 — **not rerun** (per assignment).

---

## 6. `NEXT_PUBLIC_SITE_URL`

Set on Preview to:

- `https://the-studio-company-ooxt99n28-stayonme73s-projects.vercel.app` (Owner-linked deployment)
- Updated for recovery deploy host when testing `dpl_5Y85j95…`

Use **one canonical Preview URL** per active deployment; redeploy or env update when the host changes.

---

## 7. GitHub synchronization (separate track)

- Local branch **`operating/mobile-customer-journey-certification-1`** remains **ahead 6** at **`7df67f59`** (+ uncommitted recovery files).
- Remote tip **`ee8afb0d`** unchanged.
- Retry `git push` **hung >140s** in this session (same class as prior **`HTTP 500`** / receive-pack failures).
- **No force-push, no duplicate commits, no discard of local work.**

---

## 8. Uncommitted local changes (Owner authorization required to commit/push)

| Path | Purpose |
|------|---------|
| `scripts/preview-deploy-set-vercel-env.mjs` | Safe DB URL normalization + pooler + `NEXT_PUBLIC_SITE_URL` arg |
| `src/lib/studio-durable-persistence/hosted-persistence-guard.ts` | Fail-closed postgres on `VERCEL_ENV` preview/production |
| `src/lib/auth/users.ts` | Guard in `createClientAccount` |
| `src/app/api/auth/signup/route.ts` | Server log on catch (no customer leak) |
| `scripts/probe-*.mjs`, `scripts/preview-signup-path-probe.mjs` | Disposable diagnostics — **do not commit** unless Owner wants tooling |

---

## 9. Recommended next steps

1. **Owner authorize commit + push** of §8 product/script fixes (not probe scripts).
2. **Retry GitHub push** when receive-pack healthy; until then, Preview deploys via CLI from local tip remain valid.
3. **Hosted payment smoke package** — T3 with Stripe **test** checkout (or explicit Preview env policy for sandbox-confirm); then T5 File Room.
4. **Do not promote** Production or merge `main` until full T1–T5 PASS on a single canonical Preview URL.

---

## 10. Stop criteria respected

- No Production Postgres, bucket, or domain changes.
- No live Stripe.
- No merge / no unauthorized push.
