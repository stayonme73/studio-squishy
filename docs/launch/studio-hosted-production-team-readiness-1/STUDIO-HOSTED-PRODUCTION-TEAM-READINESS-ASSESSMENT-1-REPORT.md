# STUDIO — HOSTED PRODUCTION TEAM READINESS — Assessment 1

**Written:** 2026-10-27 (America/New_York)  
**Type:** READ-ONLY · documentation only  
**Accepts:** `STUDIO-HOSTED-PREVIEW-SHARP-FIX-FINAL-CLOSEOUT` as **PASS WITH EXPLICIT LIMITS**  
**Preview anchor:** `dpl_569875Y8CPp9NTTMYycNVuwEwQzd` · Git `78b3ac4f` · Test Postgres/Supabase · Stripe TEST  
**Production:** unchanged (`fc56426`)

---

## Executive verdict

| Overall | Meaning |
|---------|---------|
| **Hosted customer commerce + delivery spine** | **DONE** (paid truth, File Room, session auth pattern) |
| **Hosted Production Team / factory** | **OPEN** — not certified for multi-worker Vercel |
| **Recommended next package** | **`STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1`** (bounded; see §8) |

---

## 1. Reused certifications (not reopened)

| Source | Status | Relevance to hosted |
|--------|--------|---------------------|
| **Room 4B** (`STUDIO-OPERATING-ROOM-4B-CLOSEOUT.md`) | **CLOSED** — short-form video, social graphics, print, copy/email, campaign creative **READY WITH EXPLICIT LIMITS** | Proves **local / desk** Machine-native paths and owner-independence doctrine; **not** a hosted multi-instance stamp |
| **Room 4C** (`STUDIO-OPERATING-ROOM-4C-CLOSEOUT.md`) | **CLOSED WITH EXPLICIT LIMITS** — scenarios 1–3 | Multi-service orchestration, QA, review, delivery coherence on **durable FS + local rehearsal** |
| **Package G** (`STUDIO-OPERATING-PRODUCTION-TEAM-LAUNCH-READINESS-1` · `studio-production-team-launch-readiness-v1.ts`) | Coordination fire drill — menu, email-kit, short-video SKUs | **Local** `data/` campaign proof; **not** hosted Preview factory run |
| **Static Creative Lane** (`STUDIO-OPERATING-STATIC-CREATIVE-LANE-READINESS-1`) | Shared design-lane contract | Grades machinery Room 4B SKUs share; **hosted lane locks still OPEN** |
| **Machine / dispatch** (`STUDIO-OPERATING-DISPATCH-1`, design dispatch observer, launch-menu observer) | Architecture **implemented** | Observers run **inline** on serverless invocations (webhook, recovery, customer GET wake) |
| **Factory independence** (Room 4B tool eval, 4C owner-independence gates) | **Frozen** | CapCut-style lesson: own capability; **hosted worker isolation not proven** |
| **Customer Review / Final Delivery** (Room 4C matrix, Phase B / hosted T5) | Review proofs ≠ Final Delivery; **hosted T5 PASS** on Preview | Delivery bytes + ACL **certified on Preview**; **production render path to release** not fully hosted-certified |

---

## 2. Hosted post-payment flow (current code path)

```
Stripe TEST webhook / reconcile
  → confirmPaymentFromProcessor (Postgres: studio_payment_sessions, studio_campaigns, events)
  → activateAfterPayment
       → recoverPaidOperatingChain
            → applySealedPostPayStructures / ensurePostPayActivation
            → ensureRoutingHandoff
            → ensureDispatchExecution
                 → evaluateJobDispatch records on campaign envelope (Postgres)
                 → runDesignRendererDispatchObserver (print/design SKUs)
                 → runLaunchMenuProductionObserver (copy, short-video, clip, footage)
                 → runCreativeQaFinishObserver
                 → machine *ReviewBind* hooks (Review Room eligibility)
  → on throw after paid truth: postPayActivation / dispatchExecution pending_retry (durable in Postgres)
  → customer wake: reconcile, GET /api/campaigns/current, sweepPaidActivationRecovery
  → Review Room → QA → releaseFinalDeliveryFiles → File Room download (Supabase Test on Preview)
```

**Durable coordination (Postgres):** campaign envelope, tasks, materials, payment truth, dispatchExecution, postPayActivation, comms/life/activity rows; **per-campaign** `pg_advisory_xact_lock` and selected `FOR UPDATE` envelopes (`postgres-pool.ts`, `postgres-comms*.ts`, `postgres-activity-production.ts`).

**Ephemeral coordination (filesystem):** quick-lane reservations + admission lock; heavy single-file lock — **`/tmp/studio-lane-occupancy` on `VERCEL`**, `data/studio-lane-occupancy` on desk/local.

---

## 3. Where `/tmp` per-instance occupancy is insufficient

| Mechanism | Desk / local | Vercel Preview | Cross-instance safe? |
|-----------|--------------|----------------|----------------------|
| Quick lane reservations (`quick-lane-admission.ts`) | `data/.../quick/*.json` + file admission lock | `/tmp/.../quick` | **No** — each instance has its own `/tmp` |
| Heavy occupancy lock (`heavy-occupancy-lock.ts`) | `data/.../heavy.lock.json` (exclusive create) | `/tmp/.../heavy.lock.json` | **No** |
| Lane **capacity views** (`loadStudioLaneViews`) | Built from **Postgres** campaign/task truth | Same | **Yes** for *visibility* and stop-sale |
| Checkout stop-sale (`evaluateHeavyStopSale`) | Uses lane views | Same | **Yes** for *pre-purchase* caps (not runtime mutex) |
| Design renderer / video observer admission | Calls `admitQuickLaneProduction` / `acquireHeavyOccupancyLock` before work | Same code | **Risk:** two concurrent serverless invocations can both pass admission on **different** `/tmp` trees |

**Impact:** Paid jobs are not lost (Postgres + `pending_retry`), but **two workers could theoretically enter the same quick/heavy slot** on Preview under concurrent webhooks/wakes — violating the **coded lane cap** the Production Team relies on locally.

---

## 4. Can Postgres claims/leases cover cross-instance safety without rebuilding the factory?

**Assessment: yes, with a narrow additive layer — not a factory rewrite.**

Existing patterns to extend (already in codebase):

- `pg_advisory_xact_lock(hashtext(...))` for global or lane-scoped namespaces
- `FOR UPDATE` row locks on envelope tables
- Durable job/dispatch state already in `studio_campaigns.envelope`

**Minimal engineering shape (conceptual):**

1. **`studio_lane_claims` table** (or advisory key `lane:quick`, `lane:heavy`) with columns: `lane`, `job_id`, `campaign_id`, `heartbeat_at`, unique active claim per lane slot index.
2. **Replace or gate** `withAdmissionLock` / `writeLockAtomic` on `VERCEL` with **transactional claim** in Postgres, keeping desk `data/` path unchanged.
3. **Reconcile stale claims** using existing heartbeat stale MS from `studioCapacity100OrderHardeningV1` — mirror `reconcileQuickLaneReservations` evidence from `loadStudioLaneViews()`.

**Do not rebuild:** dispatch evaluator, design renderer hooks, launch-menu observer, Review/Final Delivery gates — only the **mutex implementation** behind existing admission APIs.

---

## 5. Remaining hosted gaps (workers, retry, queue, capacity, recovery)

| Gap | Severity | Notes |
|-----|----------|-------|
| **No durable work queue** | High for video/heavy | Production runs **inside** API/serverless handler; no separate worker service on Preview |
| **Function duration / CPU** | High | Sharp renders, Shotstack poll loops, composite pipelines may exceed Vercel limits; partial progress relies on idempotent hooks + **`pending_retry`** |
| **Multi-instance lane mutex** | High (cert blocker) | §3 — OPEN until Postgres claims or single-worker routing |
| **Inline retry** | Medium | `recoverPaidOperatingChain` immediate retries + sweep; **no** guaranteed background processor |
| **Capacity at runtime** | Medium | Views accurate from Postgres; **reservation** not cluster-safe on Preview |
| **Kitchen / Shotstack credentials** | Medium | Package G tests check credential presence; **hosted env** must carry TEST keys; provider polling still synchronous |
| **Identity safety gate** | Low (implemented) | Fail-closed on dispatch when customer context mismatches |
| **Final Delivery** | Low for ACL | **Hosted proven**; **production mint path** per SKU not fully exercised on Preview |

**Recovery (DONE on Preview for payment spine):** `pending_retry` on post-pay activation and dispatch; webhook/reconcile/customer GET re-wake — **proven in vitest** and partially on Preview payment slice; **not** proven for full render-to-review under concurrent load.

---

## 6. Smallest hosted acceptance scenario per package

Legend: **P** = prior local/desk proof reused · **H** = must run on hosted Preview · **U** = genuinely untested on hosted

### A. Room 4B — Print collateral (representative: `v2-rtu-flyer`)

| Step | P/H/U |
|------|-------|
| Disposable pay → intake → dispatch observer invoked | H (partial: pay + activation on Preview; **full render** U) |
| Quick-lane admission under **two concurrent** invocations | **U** — cert blocker |
| QA → Review bind → customer Review Room | P local · **H** minimal |
| Release → hosted File Room 200/403/bytes | **H DONE** (T5 pattern; flyer-specific file U) |

**Smallest H scenario:** paid flyer kit on Preview → complete intake → single webhook wake → assert `dispatchExecution` evaluated + observer skip/invoke logged → **one** released final PDF via same T5 pattern.

### B. Room 4B — Short-form video (`v2-rtu-short-form-video-edit` / Package G video SKU)

| Step | P/H/U |
|------|-------|
| Heavy lock + lane view | P local · **H** mutex U |
| Copy/script path + Shotstack submit/poll | P local · **H** full U on Preview |
| Review + delivery | P Room 4C · **H** U |

**Smallest H scenario:** disposable paid short-video with TEST Shotstack → one render completes within function budget OR lands in **`pending_retry`** with durable provider id — **prove recovery wake**, not full creative quality re-cert.

### C. Room 4B — Marketing copy / email (`v2-rtu-email-kit` / Package G copy SKU)

| Step | P/H/U |
|------|-------|
| Launch-menu copy hook | P Package G local · **H** U |
| Review proof vs Final Delivery | P doctrine · **H** optional |

**Smallest H scenario:** paid copy SKU → dispatch → copy artifact in Postgres/tasks → customer Review access 200.

### D. Room 4B — Campaign creative (photo-led / Nia limits)

| Step | P/H/U |
|------|-------|
| Machine-native campaign renderer | P Room 4B Nia live cert · **H** U |
| Multi-asset QA | P 4C · **H** U |

**Smallest H scenario:** defer full Nia replay; hosted **smoke** = paid MA-001 or promo SKU with materials → observer invoked once, QA record present — **not** a creative re-judgment.

### Package G — Coordination fire drill (menu + email + short-video)

| Step | P/H/U |
|------|-------|
| Three SKUs same campaign, partial Review readiness | **P** local evidence · **H** U |
| Customer status copy / Board next action | P tests · **H** U |

**Smallest H scenario:** one Preview campaign with **two** of three SKUs paid → prove coordinated customer status strings + two Review-ready gates without owner labor.

---

## 7. DONE vs OPEN (hosted)

### DONE

- Preview payment + durable paid truth (T3/T4 pattern).
- Hosted File Room authorized/stranger/bytes (T5).
- API bootstrap (sharp/narrow imports) on Preview.
- `pending_retry` persistence for activation/dispatch throws (code + regressions).
- Postgres-backed campaign/task/dispatch truth for **read** paths and recovery wake.
- Desk/local Production Team certifications (4B, 4C, Package G fire drill, static lane contract).

### OPEN

- **Cross-instance quick/heavy lane exclusivity** on Vercel.
- **Full SKU render → QA → Review → Final Delivery** on hosted Preview for all four Room 4B lanes.
- **Background worker / queue** for long video and heavy design (or explicit single-worker Preview policy).
- **Production Team hosted certification** stamp (explicitly **not** claimed by payment/File Room closeout).
- **Master Discoveries file** referenced by register (`STUDIO-VERIFIED-DISCOVERIES-MASTER-RECORD-2026-10-25.md`) **not present in workspace** — addendum filed beside this report (§9).

---

## 8. Actual risks

1. **Silent lane overcommit** on Preview under concurrent wakes (two lambdas, two `/tmp` locks).
2. **Render timeout** → customer sees **`pending_retry`** / “Studio is working” longer than desk; recovery depends on **next** customer or webhook event, not a worker.
3. **False confidence:** passing payment + File Room T5 **does not** prove Shotstack/sharp pipelines at scale on serverless.
4. **SESSION_SECRET / Preview env drift** — requires redeploy discipline after env scripts that rotate secrets.

---

## 9. Minimal engineering changes (before hosted factory cert)

1. **Postgres-backed lane claims** behind existing `admitQuickLaneProduction` / `acquireHeavyOccupancyLock` when `VERCEL=1` (keep `data/` on desk).
2. **Hosted observability** — structured log lines for observer skip/admit/deny (no PII) for cert evidence.
3. **Optional Preview policy** — route production invocations to a **single concurrent** queue (Vercel queue or external worker) **only if** Postgres claims are deferred.
4. **Do not** merge to `main`, expand Launch Menu, or reopen Room 4B classifications.

---

## 10. Next proposed combined execution package

**Name:** `STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1`

**Scope (single package):**

1. Implement **Postgres lane claims** (§4) + unit/integration tests (desk path unchanged).
2. Redeploy Preview @ thin-release HEAD; run **four smallest H scenarios** (§6 A–D) with disposable TEST data.
3. **Concurrency probe:** two deliberate parallel wakes on one paid quick-lane job — must show **one** admission winner (Postgres).
4. Document results in **`STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1-REPORT.md`**; update register + Master Discoveries addendum.
5. **Explicit non-goals:** Production Supabase, live Stripe, Room 5, merge to `main`.

**Depends on:** Owner authorization; Preview TEST credentials; acceptance of **PASS WITH LIMITS** if video remains retry-bound by function timeout.

---

## Register / Master Discoveries pointers

- Register row: **Hosted Production Team readiness** — this report.
- Master Discoveries addendum: `STUDIO-VERIFIED-DISCOVERIES-MASTER-RECORD-HOSTED-PRODUCTION-TEAM-ADDENDUM-2026-10-27.md` (same folder).
