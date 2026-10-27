# STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1 — Continuation Report

**Written:** 2026-10-27 (America/New_York)  
**Accepts:** Prior execution report — **PASS WITH EXPLICIT LIMITS** (Postgres lane claims)  
**Preview:** `dpl_2tboEKNUEY7PLbCT6XQnxumUxhRo` · `https://the-studio-company-la2h2kcar-stayonme73s-projects.vercel.app`  
**No redeploy** (harness-only + existing Preview code)  
**Ledger:** `STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1-HOSTED-RUN.json` (final run `2026-10-27T03:26:09Z` → `03:30:51Z`)

---

## Executive verdict

| Layer | Verdict |
|-------|---------|
| **Checkout (four homepage packages)** | **PASS** — product contract OK; initial failures were **harness** |
| **Stripe TEST webhook + dual reconcile wake** | **PASS** (after harness fix) |
| **Intake → Machine dispatch → production → QA → Review → Delivery** | **NOT CERTIFIED** — factory remains **OPEN** |

---

## 1. Checkout: harness vs product

### Working contract (matches `hosted-preview-payment-smoke.mjs`)

- `purchaseKind: "condensed_offer"`
- `facts.selectedServiceIds: [packageId]` (package id, **not** factory SKU in facts)
- `condensedOffer`: `{ packageId, customerName, company, projectNeed, materialsNote, support: {} }`
- Auth: signup → login → **cookie jar** (`-b`/`-c`) on checkout POST

Implemented in `scripts/lib/hpt-cert-intake-answers.mjs` → `condensedCheckoutBody()`.

### Root cause of first-run checkout “FAIL”

| Issue | Type | Evidence |
|-------|------|----------|
| Treating HTTP 200 body as parse failure when JSON truncated in log | **Harness** | Body contained `"ok":true,"checkoutSessionId":"cs_test_…"` |
| `-H Cookie:` instead of cookie jar on authenticated routes | **Harness** | Intermittent 500 “Account creation temporarily unavailable” |
| `facts.selectedServiceIds` used factory SKUs for clip/SFV | **Harness** (now aligned to package id) | Server overwrites via `factsForCondensedOffer`, but smoke uses package id |

### Final hosted checkout (2026-10-27 run)

All four packages: **HTTP 200** + `checkoutSessionId` (see ledger `checkout-session` rows).

**Product checkout defect:** **Not demonstrated** on this Preview for the four door packages once the harness matched smoke.

---

## 2. Webhook / reconcile: Windows `vercel curl`

| Issue | HTTP | Body | Type |
|-------|------|------|------|
| `Stripe-Signature` stripped / split on commas | **400** | `{"error":"missing_signature","message":"Stripe signature header is required."}` | **Harness** |
| `hosted-preview-t3-complete.mjs` with `shell: false` | **0** | empty | **Harness** |

**Fix:** `scripts/lib/hosted-preview-vercel-curl.mjs` → `vercelStripeWebhook()` uses **PowerShell** to read signature from file and pass `-H ('Stripe-Signature: ' + $sig.Trim())` (proven manually + in cert run).

**Dual concurrent wake:** Parallel `GET /api/payments/reconcile?session_id=…` — **200,200** for all four packages (`hosted-concurrent-reconcile-wake` **PASS**).

---

## 3. Per-package results (evidence-based)

| Package | Paid + wake | Intake | Dispatch (Postgres) | Production invoked | QA | Review | Final Delivery | **Stamp** |
|---------|-------------|--------|---------------------|--------------------|----|--------|----------------|-----------|
| **Clip Repurposing** | PASS | PASS | `deferred`; `executionIdentityReady: false` | NOT REACHED | NOT REACHED | NOT REACHED | NOT REACHED | **NOT REACHED** |
| **Short-Form Video Editing** | PASS | PASS | `deferred` | NOT REACHED | NOT REACHED | NOT REACHED | NOT REACHED | **NOT REACHED** |
| **Social & Promo Graphics** | PASS | **PASS WITH LIMITS** (HTTP **500** but intake stamped in DB) | `evaluated`; records ready | NOT REACHED in envelope scan | NOT REACHED | NOT REACHED | NOT REACHED | **NOT REACHED** |
| **Campaign Launch Kit** | PASS | PASS | `deferred` | NOT REACHED | NOT REACHED | NOT REACHED | NOT REACHED | **NOT REACHED** |

Example campaign ids (Test Postgres):  
`disposable-hpt-cert-clip_repurposing-6a31a13c` · `…-short_form_video_editing-cd113eac` · `…-social_and_promo_graphics-cfee3b4a` · `…-campaign_launch_kit-fe2d85f6`

### Social intake HTTP 500

- **Runner showed:** HTTP **500** with curl progress noise in body.  
- **Postgres showed:** `routeMapIntakeSubmittedAt` set, `dispatchExecution.status` = **`evaluated`**, `postPayActivation` = **`activated`**.  
- **Conclusion:** **Harness timeout/response handling** on long-running intake/dispatch; **paid truth preserved**. Not counted as full factory PASS (no proven production artifact / QA / Review / Delivery).

### Clip production gate

- Dispatch record: `v2-rtu-clip-repurposing` with **`executionIdentityReady: false`** → observers correctly do not invoke (no placeholder PASS).

---

## 4. Recovery / `pending_retry`

- No dedicated failure-injection run in this continuation (would require controlled fault hook on Preview).  
- **`pending_retry`** not observed on these disposable campaigns after webhook + intake.  
- Prior lane-claim + activation recovery tests **not rerun** (per authorization).

---

## 5. Harness / product files changed (uncommitted)

| Path | Role |
|------|------|
| `scripts/lib/hosted-preview-vercel-curl.mjs` | Cookie jar, response parse, PowerShell webhook |
| `scripts/lib/hpt-cert-intake-answers.mjs` | Smoke-aligned checkout + intake answers |
| `scripts/hosted-production-team-cert-1.mjs` | Continuation runner (no lane-claim retest) |
| `scripts/tmp-query-hpt-campaigns.mjs` | Diagnostic Postgres snapshot (optional) |

Lane-claim implementation and prior reports **unchanged**.

---

## 6. Launch blockers (unchanged)

1. **Hosted factory E2E** — production + independent QA + Review + Final Delivery for all four door packages.  
2. **Clip (and likely heavy video) on Preview** — dispatch **deferred** / identity not ready without full customer materials + owned-campaign path.  
3. **Social** — serverless duration on intake/dispatch response (HTTP 500 to client while work may complete).  
4. **Commit / push / Production** — not authorized.

---

## 7. Register

Update **Hosted Production Team cert** row: checkout/webhook/wake **PASS** on `dpl_2tboEKN…`; factory E2E **OPEN**; reference this continuation report + hosted run JSON.

**STOP** — material blocker for full factory cert: **no genuine production → QA → Review → Delivery** on Preview for any homepage package in this run; Social intake **500** response path needs serverless/dispatch follow-up without weakening gates.
