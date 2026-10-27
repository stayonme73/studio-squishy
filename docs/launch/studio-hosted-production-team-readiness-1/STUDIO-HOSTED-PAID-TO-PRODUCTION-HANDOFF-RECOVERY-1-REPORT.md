# STUDIO-HOSTED-PAID-TO-PRODUCTION-HANDOFF-RECOVERY-1 — Report

**Written:** 2026-10-27 (America/New_York)  
**Accepts:** `STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1` continuation (checkout/webhook/concurrency evidence preserved; not re-run).  
**Trace snapshot:** `HPT-HANDOFF-TRACE-SNAPSHOT.json` (four disposable HPT campaigns).  
**Preview deploy (handoff fixes only):** `dpl_7QEMKtGKpoQbEgP6q7fiygjmTvhJ` · `https://the-studio-company-5k0jst2uw-stayonme73s-projects.vercel.app`  
**Prior Preview (payment cert):** `dpl_2tboEKNUEY7PLbCT6XQnxumUxhRo` (unchanged for payment evidence).

---

## Executive summary

| Area | Finding | Verdict |
|------|---------|---------|
| Clip / SFV deferred dispatch | `activation_phase:awaiting_materials` | **Correct eligibility** — intake done; **no uploaded source footage** |
| Campaign Launch Kit `unknown_sku` | Parent job SKU `v2-campaign-launch-kit` skipped composite router | **Product defect** — **fixed** (factory SKU alias) |
| Kit HPT disposable intake | Brief missing price/dates/phone/website | **Harness / intake incomplete** — not a routing bug |
| Social intake HTTP 500 (prior Preview) | Sync dispatch + observers exceeded response window | **Fixed** — intake returns **HTTP 200** + slim JSON; dispatch in `after()` |
| Social production on hosted Preview | `after()` throws **ENOENT** writing `data/campaign-design-artifacts/...` under `/var/task` | **Architectural blocker** — serverless FS; not fakeable PASS |
| Genuine production → QA → Review → Delivery | Not achieved on hosted Preview in this package | **STOP** |

---

## 1. Postgres trace (disposable HPT campaigns)

| Campaign | Package | Routing / dispatch blocker | `executionIdentityReady` | Observers in DB |
|----------|---------|----------------------------|--------------------------|-----------------|
| `…-clip_repurposing-6a31a13c` | clip | `WAITING_FOR_PREREQUISITE` · `activation_phase:awaiting_materials` | false | empty (expected) |
| `…-short_form_video_editing-cd113eac` | SFV | same | false | empty |
| `…-social_and_promo_graphics-cfee3b4a` | social | `READY_FOR_DISPATCH` (2 branches) | true (both) | null after partial timeout |
| `…-campaign_launch_kit-fe2d85f6` | kit | `ROUTING_BLOCKED` · **`unknown_sku`** on `v2-campaign-launch-kit` | false | empty |

**Clip / SFV:** Paid, intake stamped, post-pay **activated**, ownership present (`client_user_id` set). Machine correctly waits for **required customer materials** before `ready_for_routing`. Cert harness submitted text intake only — **customer has not satisfied materials gate**.

**Campaign Launch Kit:** Condensed checkout stores **factory SKU** on the parent job; `campaignLaunchKitCompositeRoutingDecisions` only matched package id `campaign_launch_kit`, so routing fell through to generic evaluator → **unknown_sku**. **Not** intentional policy.

**Social:** Dispatch identity **evaluated** and ready; prior run ended before observer envelope persisted (sync work + timeout). Intake answers sufficient for routing (no materials gate for this door).

---

## 2. Social intake HTTP 500 — cause

**Not** a payment or intake-stamp failure. Postgres already had `routeMapIntakeSubmittedAt` and `dispatchExecution.status = evaluated`.

**Cause class:** **Serverless duration + synchronous post-intake chain** (`ensureDispatchExecution` → design renderer observers → filesystem writes) inside `/api/payments/intake-submit` on the old Preview.

**Fix (this package):**

- `submitPaidIntakeByCheckoutSession({ deferDispatch: true })` from the route — sync path: recovery skip when deferred, **post-pay activation**, **routing handoff** only.
- `after(() => continuePaidIntakeOperatingChain(campaignId))` — recovery + dispatch observers off the HTTP response.
- Response: `{ ok, alreadySubmitted, campaignId }` (no multi‑MB campaign blob).

**Proof on `dpl_7QEMKtGK…` (2026-10-27T07:04:49Z):** Re-submit intake for existing paid social campaign → **HTTP 200**, body `{"ok":true,"alreadySubmitted":true,"campaignId":"disposable-hpt-cert-social_and_promo_graphics-cfee3b4a"}` (no 500).

---

## 3. Social production — Vercel runtime (hosted blocker)

**Log (Preview `dpl_7QEMKtGK…`, `iad1`, 2026-10-27T07:04:53.677Z):**

```text
An error occurred in a function passed to `after()`:
Error: ENOENT: no such file or directory, mkdir
'/var/task/data/campaign-design-artifacts/disposable-hpt-cert-social_and_promo_graphics-cfee3b4a/production-team'
```

**Interpretation:** Observers **did run** in `after()`, but **creative artifact paths** still assume repo-writable `data/campaign-design-artifacts/` (desk/local). Vercel Preview **cannot** mkdir under `/var/task/data/…`.

**Limitation:** Real design production + independent QA + Review + Final Delivery on **hosted Preview** requires **durable writable artifact storage** (persistence/storage cutover lane — blob or equivalent). **Out of scope** for a bounded handoff fix; **no manual seeding** performed.

After 90s post-intake wait, Postgres: `dispatch_status=evaluated`, `designObserverPresent=false`, `invoked=false`.

---

## 4. Code changes (uncommitted)

| File | Change |
|------|--------|
| `campaign-launch-kit-composite-dispatch.ts` | Accept parent job SKU `v2-campaign-launch-kit` **or** `campaign_launch_kit` |
| `campaign-launch-kit-composite-dispatch.test.ts` | Regression for factory SKU parent job |
| `intake-submit.ts` | `deferDispatch`, `continuePaidIntakeOperatingChain` |
| `api/payments/intake-submit/route.ts` | defer + `after()` continuation; slim JSON |
| Diagnostics | `HPT-HANDOFF-TRACE-SNAPSHOT.json`, tmp scripts (trace / wake) |

**Tests run:** `campaign-launch-kit-composite-dispatch.test.ts`, `intake-job-reconciliation.test.ts` — **PASS**.  
**Build:** production `npm run build` — **PASS** (2026-10-27).

---

## 5. Per-package handoff stamps (this package)

| Package | Handoff diagnosis | Production on Preview | Overall |
|---------|-------------------|------------------------|---------|
| Clip Repurposing | Awaiting materials — **correct** | NOT REACHED | **PASS WITH LIMITS** (eligibility correct; cert gap = materials) |
| Short-Form Video | Awaiting materials — **correct** | NOT REACHED | **PASS WITH LIMITS** |
| Social & Promo | Intake response **fixed**; identity ready | **FAIL** (ENOENT artifact root) | **PASS WITH LIMITS** |
| Campaign Launch Kit | **unknown_sku defect fixed** in code; HPT brief incomplete | NOT REACHED (needs redeploy + full brief + routing re-eval) | **PASS WITH LIMITS** |

Payment/checkout/webhook/concurrency evidence from **`dpl_2tboEKN…`** run — **unchanged**, not repeated.

---

## 6. Register update

Hosted factory cert remains **OPEN**. Add row reference: this report + Preview `dpl_7QEMKtGK…` for intake/deferred-dispatch proof. Blocker: **hosted writable artifact storage** before E2E production certification.

**STOP** — cannot complete item 7–8 (genuine production artifacts on Preview) without storage cutover or equivalent; reporting exact Vercel ENOENT limitation instead of substituting PASS.
