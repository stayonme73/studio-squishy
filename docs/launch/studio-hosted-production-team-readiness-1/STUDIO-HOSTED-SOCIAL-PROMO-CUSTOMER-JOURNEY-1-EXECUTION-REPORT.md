# STUDIO-HOSTED-SOCIAL-PROMO-CUSTOMER-JOURNEY-1 — Execution Report

**Date:** 2026-10-27  
**Verdict:** **PASS WITH EXPLICIT LIMITS** — hosted **Design production + independent Quality** for both Social & Promo branches; **STOP** before full Review → revision → approval → Final Delivery cert  
**Authoritative Preview:** `dpl_FMEpEfaF5hq9C2R1ijDsEd998JJ2` · `https://the-studio-company-qh02t0ysa-stayonme73s-projects.vercel.app`  
**Journey campaign (disposable):** `disposable-hosted-sp-journey-454f1def`  
**Accepted upstream:** `STUDIO-HOSTED-RENDER-RUNTIME-RECOVERY-1` — not re-run (payment/lane/checkout unchanged)

**Not done:** commit, push, merge, Production, live Stripe, full customer-journey stamp, manual approval without Review Room.

---

## 1. Social Posts `QA_FAILURE` — root cause (prior HPT run)

| Layer | Finding |
|-------|---------|
| **Quality token** | `requiredTextTokens` included full intake **`social_and_promo_graphics:facts`** (`"Free mini-consultations Saturday 10–4. One complimentary beverage per guest."`) via theme-led mapping (`map-social-promo-theme-led-truth.ts` → `disclosureBody`). |
| **Production gap** | Theme-led social layouts painted theme + core message + beats but **did not paint customer-supplied facts** on any post layer → `declaredText` failed substring check (`evaluateDesignQuality` / `required_text_*`). |
| **Intake gap (HPT harness)** | Minimal HPT answers lacked **phone/web** and **offer-led date/price** shape used by machine-cert briefs — routed **theme-led** while facts were mandatory for QA. |
| **Not a Playwright/runtime defect** | Promotion branch **RENDERED + QA pass** on same deployment proved render path. |

**Corrective changes (uncommitted):**

1. **`themeLedCustomerSuppliedFactsLine` + hero support layer** — paints supplied facts on post 1 when present (`social-posts-theme-led.ts`).  
2. **`hpt-cert-intake-answers.mjs`** — Social & Promo brief aligned to realistic **offer-led** cert copy (Nov 8–Dec 15 2026 window, $49 consultation, phone, web).  
3. **No Quality gate weakening** — tokens and deliverable promise unchanged.

---

## 2. `socialPromoRenderRelease` (policy, not diagnostic stamp)

- **Before intake dispatch:** Postgres stamp with product shape: `authorizedBy: owner-tagia`, `authorizedAt`, `reason`, `packageId`, `campaignId`, `sandboxOnly: true` (see `HOSTED-SOCIAL-PROMO-CUSTOMER-JOURNEY-1-RUN.json`).  
- **Not** the prior `tmp-stamp-hpt-social-render-release.mjs` (`releasedAt` / generic `owner`) on `cfee3b4a`.  
- Observer **invoked** both branches only after release was set.

---

## 3. Hosted production + Quality (Preview)

**Flow:** sandbox checkout → webhook → render release → intake → `after()` dispatch (~17s to both `ok: true`).

| SKU | Result | Evidence |
|-----|--------|----------|
| `v2-rtu-social-posts` | **RENDERED · ok** | `pngContentSha256: 84f2531d…`, `invocationOutcome: RENDERED` |
| `v2-rtu-promotion-graphics` | **RENDERED · QA pass** | `generalDesignLoop.status: passed`, `qaResult: pass` |

**Recovery:** `POST /api/hosted-cert/continue-paid-intake-chain` ~30s — idempotent re-invoke, both SKUs remain `ok: true` (no placeholder downgrade).

**Runtime:** First production window **~17s** after intake on warm Preview; continue-chain retry **~30s** (includes Chromium work).

---

## 4. Supabase Test Storage

**Prefix:** `campaign-design-artifacts/disposable-hosted-sp-journey-454f1def/`  
**12** `.png` / `.pdf` objects (4 social + 2 promo × PNG+PDF). Sample: portrait PNG **102,639** bytes (`89504e47`), PDF **28,260** bytes (`%PDF-`).

---

## 5. Access control

- **Owner session:** `GET …/jobs/…/review` → **403** (not ready — see §6).  
- **Second customer session:** **403** on same review URL — **PASS** (cross-customer denial).

---

## 6. STOP — Review / revision / Final Delivery not certified

**Observed blocker:**

- Parent job `disposable-hosted-sp-journey-454f1def:social_and_promo_graphics` remains **`spineStatus: ready_for_queue`** in Test Postgres after successful dual-branch render.  
- Customer Review API correctly returns **403** (`not ready for client review`).  
- **Not authorized to:** hand-approve, seed review proofs, or skip production spine transitions.

**Remaining for full customer-journey PASS:** hosted path must advance composite parent to **`ready_for_review`**, bind review proofs from Storage/workspace, then exercise **PATCH** approve → optional **revision** → **Final Delivery** + authorized download bytes (desk cert pattern in `disposable-sp-cert-production-truth-e2e.mjs`).

---

## 7. Code / script artifacts (uncommitted)

| Item | Role |
|------|------|
| `social-posts-theme-led.ts` | Facts-on-artifact fix |
| `hpt-cert-intake-answers.mjs` | Complete disposable brief |
| `scripts/hosted-social-promo-customer-journey-1.mjs` | Preview E2E runner |
| `HOSTED-SOCIAL-PROMO-CUSTOMER-JOURNEY-1-RUN.json` | Run ledger |

---

## 8. Summary verdict

| Gate | Status |
|------|--------|
| Trace + fix QA_FAILURE root cause | **PASS** |
| Realistic brief + render release policy | **PASS** |
| Hosted dual-branch render + Quality | **PASS** |
| Durable Storage bytes | **PASS** |
| Cross-customer isolation (review URL) | **PASS** |
| Review → revision → approval → delivery | **NOT REACHED** (spine `ready_for_queue`) |

**Package status:** **PASS WITH EXPLICIT LIMITS** — certify **hosted Social & Promo production + Quality** on Preview; **OPEN** spine/review handoff for full journey close.
