# STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1 — Corrected execution plan

**Status:** PLAN ONLY — **not authorized to implement** until separate Owner stamp  
**Supersedes scope in:** Assessment 1 §10 (flyer/menu/email-kit scenarios)  
**Accepts:** `STUDIO-HOSTED-PREVIEW-SHARP-FIX-FINAL-CLOSEOUT` · Assessment 1 read-only  
**Preview anchor (current):** `dpl_569875Y8CPp9NTTMYycNVuwEwQzd` · Git `78b3ac4f` · Test only  

---

## Package identity

**`STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1`**

One bounded execution package. No merge to `main`. No Production Supabase. No live Stripe.

---

## 1. Reuse (do not rerun without regression evidence)

| Layer | Authority | Use in cert |
|-------|-----------|-------------|
| Room 4B closeout | Frozen READY WITH LIMITS classifications | Design/video/copy/campaign **desk** proofs |
| Room 4C closeout | Multi-service orchestration, QA, owner independence | Review/delivery coherence rules |
| Package G | `STUDIO-OPERATING-PRODUCTION-TEAM-LAUNCH-READINESS-1` | Coordination patterns (desk) |
| Static creative lane | Shared design machinery contract | Social & Promo graphics lane |
| Machine dispatch | `ensureDispatchExecution`, observers, review binds | **Hosted** replay only |
| Postgres durability | Campaign/tasks/payment/dispatch envelopes, per-campaign locks | Truth + recovery |
| Preview commerce spine | T3/T4/T5 PASS | Payment + File Room baseline |
| Vitest | `activate.test.ts`, `recover.test.ts` @ 120s | **No full rerun** unless lane-claim code touches recovery |

**Regression-triggered rerun only:** changes to `recoverPaidOperatingChain`, `ensureDispatchExecution`, lane admission, or observer hooks.

---

## 2. Engineering change (minimal — single theme)

### Goal

Replace Vercel **`/tmp`** quick/heavy admission with **durable cross-instance coordination** behind **existing public APIs**:

- `admitQuickLaneProduction` / `releaseQuickLaneReservation` / `reconcileQuickLaneReservations`
- `acquireHeavyOccupancyLock` / `releaseHeavyOccupancyLock` / stale recovery helpers

### Preserve

- **Local/desk:** `data/studio-lane-occupancy/**` file locks unchanged when `!VERCEL`.
- **Capacity views:** `loadStudioLaneViews()` from Postgres (unchanged).
- **Checkout:** `evaluateHeavyStopSale` (unchanged).

### Proposed implementation shape

1. **`studio_lane_claims` Postgres table** (or lane-scoped advisory keys + claim rows):  
   `lane`, `slot_index`, `job_id`, `campaign_id`, `claimed_at`, `heartbeat_at`, unique partial index on active claim per slot.
2. **Adapter:** `if (process.env.VERCEL) { postgres claim path } else { existing FS path }`.
3. **Stale recovery:** reuse `studioCapacity100OrderHardeningV1.occupancyMs.heartbeatStaleMs`; reconcile from `loadStudioLaneViews()` evidence job ids (mirror current FS reconcile).
4. **Transactions:** claim attempt in same pattern as existing `pg_advisory_xact_lock` usage — no change to dispatch evaluator logic.
5. **Tests:** unit tests for claim contention; extend `quick-lane-admission` / heavy lock tests with `VERCEL=1` mock pool.

### Paid-job safety (requirement 3)

- No change to **`pending_retry`** on `postPayActivation` / `dispatchExecution` (already in `2297df3e`).
- Failed claim → observer skip / `waiting_for_production_slot` — must **not** roll back paid truth.
- Document: claim failure ≠ unpaid.

---

## 3. Four homepage packages (canonical menu)

Source: `studioCanonicalLaunchTruthV1.packages` (four-package door).

| # | Customer name | Package ID | Factory / job SKU | Control lane | Primary hosted observer path |
|---|---------------|------------|-------------------|--------------|------------------------------|
| 1 | Clip Repurposing | `clip_repurposing` | `v2-rtu-clip-repurposing` | **heavy** | Launch-menu → `invokeClipRepurposingDispatchHook` + heavy lock |
| 2 | Short-Form Video Editing | `short_form_video_editing` | `v2-rtu-short-form-video-edit` | **heavy** | Launch-menu → short-video / footage pipeline + heavy lock |
| 3 | Social & Promo Graphics | `social_and_promo_graphics` | Package-scoped job (`social_and_promo_graphics` / composite promo+social hooks) | **quick** (design set) | Design dispatch observer + `ensureSocialPromoCompositeReviewBind` |
| 4 | Campaign Launch Kit | `campaign_launch_kit` | `campaign_launch_kit` (condensed offer) | **standard** (kit) | Kit review bind + kit intake; **not** disposable isolation marker |

**Cert rule:** Hosted scenarios use **production-intent** disposable campaigns (no `campaign_launch_kit_pay_intake` isolation skip unless scenario explicitly tests isolation).

---

## 4. Per-package smallest hosted acceptance (E2E)

Each scenario: **Stripe TEST pay** (webhook or signed test webhook) → **intake complete** → **dispatch evaluated** → **production observer invoked or explicit skip with reason** → **QA gate** (design-qa / production assurance / video QA as applicable) → **Review Room 200** for client → **one revision round optional (limit)** → **Final Delivery** File Room **200 / 403 / SHA-256** (reuse T5 cookie-jar session pattern).

| Package | Prove | Reuse from desk | Genuinely untested on hosted until run |
|---------|-------|-----------------|--------------------------------------|
| **Clip** | Heavy claim + clip pipeline start; MP4 or durable `pending_retry` + provider id | Clip freeze + live delivery wiring | Shotstack/poll within serverless timeout |
| **Short-form** | Same heavy lane; footage pipeline invoked | SFV freeze | Same timeout / retry wake |
| **Social & Promo** | Quick lane claim; social/promo render or QA block; review proof | Social promo freeze | Full composite render on Preview |
| **Campaign Launch Kit** | Paid kit → intake → dispatch **without** isolation bypass; kit review path | Harbor-oak machine tests (desk) | Full kit production on Preview |

**Shared cross-package checks (once):**

- Postgres rows: `studio_payment_*`, `studio_campaigns`, tasks envelope, `dispatchExecution`, QA/review authorization fields.
- Customer never sees silent unpaid state.

---

## 5. Mandatory cross-cutting tests

### A. Dual-worker concurrency

- **Setup:** One paid **quick-lane** job (Social & Promo or kit sub-job on quick) + one **heavy** job (Clip or Short-form) as two scenarios or one campaign with two jobs if orchestration allows.
- **Action:** Two simultaneous Preview invocations (e.g. parallel `vercel curl` webhooks or recovery wakes) targeting **same** job admission.
- **Pass:** Exactly **one** active Postgres claim; second gets `lane_full` / `held_by_other`; paid truth unchanged; eventual single production path completes or **`pending_retry`** with recoverable error.

### B. Failure / recovery

- **Inject:** Force dispatch observer throw or simulate claim release after partial write (test hook or controlled fault injection in Preview disposable env only).
- **Pass:** `postPayActivation.status` or `dispatchExecution.status` = **`pending_retry`**; reconcile or customer GET **re-wakes**; no duplicate jobs (existing recover tests logic).

---

## 6. Master Discoveries reconciliation (no competing records)

**Problem:** Register cites `STUDIO-VERIFIED-DISCOVERIES-MASTER-RECORD-2026-10-25.md`; workspace may only have Oct 27 addendum.

**Plan (documentation step in same package, before cert evidence):**

1. Restore or author **one** canonical file at register path (§3b).
2. **Merge** `STUDIO-VERIFIED-DISCOVERIES-MASTER-RECORD-HOSTED-PRODUCTION-TEAM-ADDENDUM-2026-10-27.md` content as **§3b Hosted Production Team** (HPT-1…HPT-7), with date stamp.
3. Replace addendum file body with: *“Merged into canonical master record §3b on [date]. Do not edit this file.”*
4. Update register pointer to canonical §3b only.

---

## 7. Execution phases (when Owner authorizes implement)

| Phase | Work | Output |
|-------|------|--------|
| **0** | Discoveries merge + plan commit on thin-release | Single master record §3b |
| **1** | Postgres lane claims + tests | PR-ready diff on `operating/mobile-customer-journey-certification-1-thin-release` |
| **2** | Preview deploy @ commit; env parity (no secret rotation without redeploy) | New `dpl_*` |
| **3** | Four package hosted scenarios + A/B tests | Evidence JSON + logs |
| **4** | Report + register | `STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1-REPORT.md` |

---

## 8. Deliverables in final report (requirement 9)

- **Exact engineering files** touched (lane adapter only expected).
- **Hosted acceptance table** per package (PASS / PASS WITH LIMITS / FAIL).
- **Unproven limits:** serverless duration, Shotstack polling, Campaign Launch Kit gap vs freeze doc, multi-worker **before** phase 1.
- **Launch blockers remaining:** hosted factory OPEN until phase 3 passes; Production migration still separate; publication still false per canonical launch truth.

---

## 9. Explicit non-goals

- Reopen Room 4B classifications or Room 4C scenarios.
- Rerun Package G desk fire drill unless regression.
- Merge `main`, Production deploy, live Stripe, reduce menu scope.
- Background worker service (optional follow-on if phase 3 hits timeout limits — report as limit, not silent scope cut).
