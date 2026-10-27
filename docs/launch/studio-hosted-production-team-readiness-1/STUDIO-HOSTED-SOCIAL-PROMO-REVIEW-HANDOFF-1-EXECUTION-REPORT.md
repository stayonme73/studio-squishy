# STUDIO-HOSTED-SOCIAL-PROMO-REVIEW-HANDOFF-1 — Execution Report

**Verdict:** **PASS WITH EXPLICIT LIMITS** (Review handoff defect corrected; hosted Review → revision → Final Delivery exercised on Preview/Test; not a full clean-slate journey PASS.)

**Accepts prior:** `STUDIO-HOSTED-SOCIAL-PROMO-CUSTOMER-JOURNEY-1` production + Quality **PASS WITH EXPLICIT LIMITS** on campaign `disposable-hosted-sp-journey-454f1def`.

**Preview deployment (this package):** `dpl_3yrin37e6GNUFCJcGLTRM8kxwSKn` · `https://the-studio-company-aufe7z6f5-stayonme73s-projects.vercel.app`

**Parent job:** `disposable-hosted-sp-journey-454f1def:social_and_promo_graphics`

---

## 1. Root cause — spine stuck at `ready_for_queue`

`ensureSocialPromoCompositeReviewBind` resolved artifact paths with `process.cwd()` only (`/var/task` on Vercel). After successful branch renders, receipts, set QA JSON, PNGs, captions, and posting-order lived under the **hydrated production workspace** (`/tmp/studio-campaign-artifacts-…/data/campaign-design-artifacts/…`) and in **Supabase Test Storage**, not under `/var/task`.

**Gates that failed silently:**

| Gate | Requirement |
|------|-------------|
| Branch observer | Both `v2-rtu-social-posts` and `v2-rtu-promotion-graphics` results `ok` + `invoked` |
| `branchSetGatePassed` | Receipt `setQaOk` + sibling `campaign-set.design-qa.json` `ok: true` (paths must exist on disk) |
| `collectSetFiles` | Both branches `complete_reviewable_set`; all 8 delivery members + captions + order readable on disk |
| Package QA | `evaluateSocialPromoCustomerPackage` pass |
| Customer-life truth | `intakeComplete` + `blockingMaterialsCount === 0` |
| Bind side effects | Review proof upload (`uploadJobFile`), formal QA task sync, spine → `ready_for_review`, review notice |

---

## 2. Smallest code fix (uncommitted)

- Thread optional `repoRoot` through `ensureSocialPromoCompositeReviewBind`, `absPath`, `branchSetGatePassed`, `collectSetFiles`, and `collectGeneralDesignReviewContract` (hosted workspace + desk fallback).
- Hosted auto-hydrate when `repoRoot` omitted on Vercel: `withCampaignArtifactProductionWorkspace`.
- Pass `repoRoot` from `attachDesignRendererObserver` in `ensureDispatchExecution` (already wrapped in production workspace).

**Files:** `machine-social-promo-review-bind.ts`, `studio-general-design-review-bind/collect.ts`, `studio-dispatch/ensure.ts`

---

## 3. Evidence after Preview deploy

| Check | Result |
|-------|--------|
| `POST /api/hosted-cert/continue-paid-intake-chain` | **PASS** · ~31–43s observed (serverless duration; no full re-render required when observers already `ok`) |
| Parent `spineStatus` | **`ready_for_review`** then after customer actions **`ready_for_delivery`** |
| Review proof prep | **8/8** `deliverablePrep` + `fileRegistry` review_proof rows; Supabase `studio-files-test` private objects (hydrated from Storage, not local-only files) |
| Customer Review GET (owner session) | **PASS** · 8 deliverables with `accessHref` proof routes |
| One revision round | **PASS** · locked `jobReviewFeedback` with `submissionType: revision_requested` (PATCH may return `ready_for_review` again in same response after Machine re-bind — see limits) |
| Approve for delivery | **PASS** · `spineStatus: ready_for_delivery` |
| Released delivery files | **PASS** · **8/8** `clientDeliveryFiles` `releaseStatus: released` |
| Cross-customer Review denial | **PASS** · unrelated session **HTTP 403** (intermittent harness **HTTP 0** on repeat — see limits) |
| Unrelated-customer Final Delivery | Not re-stamped this run (prior journey **403** on Review API remains valid denial evidence) |

**Harness artifacts:** `HOSTED-SOCIAL-PROMO-REVIEW-HANDOFF-1-RUN.json` · `scripts/hosted-social-promo-review-handoff-1.mjs`

---

## 4. `socialPromoRenderRelease` — authorized pathway

**OPEN / LIMIT.** Composite branch observation still requires `campaign.socialPromoRenderRelease` (`design-renderer-observer.ts`). **No customer-facing or Owner Console HTTP route** was found that records an Owner decision. Journey and HPT cert scripts use disposable Postgres stamps / owner-stamp scripts — **not product evidence of an Owner decision.** Manual DB insert is **not** cited as authorization proof in this report.

---

## 5. Regression / runtime limits (focused)

- **`continue-paid-intake-chain`:** `maxDuration: 300`; observed **~31–43s** per call on this campaign (re-bind + proof upload, not full double re-render).
- **Revision PATCH:** Machine may complete re-bind within the same request; response `job.spineStatus` may read `ready_for_review` while feedback shows `revision_requested` — behavior is honest system state, not a skipped revision.
- **`correctionUses` envelope count:** **0** after revision feedback despite locked packages — C8c ledger persistence on hosted path **not verified** this run; treat as **explicit limit** for correction accounting cert.
- **Preview harness:** `vercel curl` JSON bodies may include trailing transfer stats (fixed in `parseJsonBody`); binary download via `vercel curl -o` returned **HTTP 0** on Windows in this harness — byte identity relies on **`contentSha256` / `storageRef.checksumSha256`** on released CDF rows matching render receipts (same hex as journey production run).
- **`/deliverables` page:** **HTTP 307** via `vercel curl` without redirect follow — API/file-room download path is authoritative for bytes.
- **No** re-run of checkout, Stripe live charges, lane-claim cert, or renderer/storage cutover packages.

---

## 6. Remaining limits

1. **`socialPromoRenderRelease` product authorization path** — required before treating hosted composite render as Owner-gated in production.
2. **Full disposable clean-slate E2E** (new campaign through bind → review → revision → approve → delivery in one script pass) — not re-stamped; this run continued the journey campaign after bind fix.
3. **Browser Final Delivery UI** on Preview — not browser-certified this run.
4. **C8c correction-use ledger** on hosted revision — not proven.

---

## 7. Register pointer

Update `STUDIO-PRODUCTION-PERSISTENCE-STORAGE-CUTOVER-1-REGISTER.md`: journey campaign **advanced past Review handoff** on `dpl_3yrin37e6GNUFCJcGLTRM8kxwSKn`; prior **STOP at `ready_for_queue`** closed by `repoRoot` bind fix.
