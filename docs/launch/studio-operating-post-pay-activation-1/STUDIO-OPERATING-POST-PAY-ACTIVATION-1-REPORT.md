# STUDIO-OPERATING-POST-PAY-ACTIVATION-1 INSPECTION REPORT

**Package:** Paid truth → active project → actionable work  
**Kind:** INSPECTION FIRST (no implementation)  
**Starting control point:** Payment Truth sealed tip `438f6e137e427113f461eda7ce0c1be1d8cb78ef`  
**Branch:** `operating/post-pay-activation-1`  
**Status:** READY FOR OWNER / MANAGER REVIEW  
**Scout:** PARKED  
**Git:** No commit · No push · No merge  
**Kitchen / Production Assurance / Payment Truth:** Untouched  

---

## Verdict

**POST-PAY ACTIVATION NOT READY — MATERIAL GAP**

### Primary answer

After Stripe confirms payment, the **only automatic durable system action** is writing paid truth onto the server Campaign Record:

- `paymentReceivedAt`
- `paymentTruth.status = confirmed`
- `campaignStatus = PAYMENT_RECEIVED` (or `BUILDING_CONCEPTS` if intake was already complete)
- processed payment-event idempotency file

That is **payment acceptance**, not **work activation**.

There is **no payment-event consumer** that automatically:

- materializes campaign tasks
- materializes job records
- opens / completes intake
- enqueues customer “payment received” communications at webhook time
- queues production
- dispatches producers

### Secondary answer

**Yes — a paid project can become stranded relative to operating work** without Tagia noticing:

1. Stripe webhook confirms paid on the server.
2. Customer closes the browser (never returns to Studio).
3. Nobody opens File Room / Owner Console.

Result:

- Durable **paid** truth exists.
- Tasks / job envelopes may **never be created** (lazy on File Room/API visit).
- Customer intake may never advance (browser return/reconcile drives CR intake handoff).
- Production does not start (correctly — Owner-gated), but the project also never becomes an automatic **actionable work** record on disk.

Classify: **POST-PAY ACTIVATION DEFECT** (paid ≠ durable active/awaiting-input operating spine).

---

## Trace (each transition)

### A. `paymentTruth.status = confirmed`

| Field | Value |
|-------|--------|
| Trigger | Stripe `checkout.session.completed` → `handleStripeWebhook` → `confirmPaymentFromProcessor` (also reconcile / sandbox-confirm) |
| Authoritative record | `data/campaigns/{campaignId}.json` + `data/payment-events/{eventId}.json` |
| State written | `paymentReceivedAt`, `paymentTruth`, status `PAYMENT_RECEIVED` / `BUILDING_CONCEPTS`, note |
| Actor | System (processor evidence) |
| Idempotency | Event-id store; duplicates → `alreadyPaid` |
| Retry | Reconcile retrieves Stripe session if webhook delayed |
| Customer-visible | Not until browser return / Board hydrate |
| Owner requirement | **NONE** for money truth |

### B. Paid → “accepted/paid campaign state”

| Field | Value |
|-------|--------|
| Trigger | Same confirm path (`applyPaidTruthToCampaignRecord`) |
| Authoritative record | Campaign `campaignStatus` |
| State written | `PAYMENT_RECEIVED` if intake incomplete |
| Actor | System |
| Note | This is **paid-only**, not active production |

### C. Intake / material state

| Field | Value |
|-------|--------|
| Trigger | Customer Project Intake submit (`submitRouteMapIntake` / legacy intake) — **not** payment webhook |
| Authoritative record | `routeMapIntakeSubmittedAt` / materials ledger (lazy init) |
| Actor | Customer (+ system ledger on first materials access) |
| Owner requirement | **NONE** for intake itself |
| Gap | Browser closure after pay can leave intake unopened |

### D. Project activation (durable actionable work)

| Field | Value |
|-------|--------|
| Trigger today | **Lazy:** `getOrGenerateTasks` / `syncJobRecordsFromCampaign` on File Room, Owner Console, jobs/tasks APIs |
| Authoritative record | `data/campaign-tasks/{campaignId}.json` (`tasks` + `jobRecords`) |
| Actor | First staff/system API visitor — **not** payment consumer |
| Idempotency | Stable task/job ids once generated |
| Defect | Activation depends on a human/system **visiting** a surface |

### E. Ready-for-routing / production start

| Field | Value |
|-------|--------|
| Trigger | Owner `start_building_concepts` after Acceptance Review + materials + capacity gates |
| Authoritative record | Job `productionStartedAt` / spine transition |
| Actor | Staff / Owner Console |
| Correct | Paid must **not** auto-start production without inputs |
| Boundary | This inspection **stops** before producer routing/dispatch |

---

## 1. Payment event consumer

**Consumers of authoritative paid truth:**

| Path | Role |
|------|------|
| `POST /api/payments/webhook` → `handleStripeWebhook` | Primary live consumer |
| `GET /api/payments/reconcile` → `reconcileCheckoutSession` | Delayed-webhook recovery |
| Sandbox confirm | Dev fixture only |

**Not consumers:** page load, Board visit, File Room visit, staff mark-paid (blocked without processor/test authority).

**Activation that depends on a human visiting a screen:** task/job materialization and Owner Console aggregate sync — **yes, visit-lazy**.

---

## 2. Project activation state (do not collapse)

| State | Authoritative signal |
|-------|----------------------|
| Paid only | `paymentReceivedAt` + `paymentTruth.status === "confirmed"` |
| Awaiting intake | Paid + intake incomplete → often `PAYMENT_RECEIVED` |
| Awaiting materials | Materials ledger `blockingRequiredCount > 0` / Board `materials_blocking` |
| Ready for production (queue) | Job spine `ready_for_queue` (intake complete; not started) |
| Production started | `productionStartedAt` / `start_building_concepts` |

Campaign `BUILDING_CONCEPTS` ≠ production started.

---

## 3. Job / task creation

| Question | Finding |
|----------|---------|
| When created? | On first `getOrGenerateTasks` / job sync access — **not** at payment confirm |
| SKU mapping | From `approvedStudioPlan` / production plan lines; deterministic `buildJobId` |
| Webhook replay duplicates? | Payment: no. Jobs: N/A until first generate; then stable ids |
| Refresh duplicates? | Merge/fingerprint behavior once envelope exists |

Related readiness gap: task readiness keys off `projectDetailsSubmittedAt`; live Route Map intake sets `routeMapIntakeSubmittedAt` — can leave tasks `not_ready` / `gates_pending` after paid + CR intake.

---

## 4. Paid-but-stranded scenario

**Reproduce (logical):** webhook paid → close browser → no File Room.

| Expected (package) | Actual |
|--------------------|--------|
| Durable active / awaiting-input operating state | **Partial:** paid durable; tasks/jobs may absent; intake may not start |
| Classification | **POST-PAY ACTIVATION DEFECT** |

Payment Truth itself is not lost. Operating **activation** is.

---

## 5. Materials / intake handoff

Paid does **not** auto-start production despite missing inputs — gates (`canTransitionToBuildingConcepts`, production trigger) preserve this.

Acceptable semantics if automatic and durable:

`paid → active → waiting for materials/intake`

Today: `paid` is automatic; `active/waiting` as an operating envelope is **not** automatic.

---

## 6. Customer Board

| Concern | Finding |
|---------|---------|
| After payment (with return) | CR advances to intake; Board next-action can prompt intake / materials |
| Authority | Paid fields are server-owned; client sync cannot invent them |
| Risk | Without return or signed-in hydrate, customer UI can lag server paid truth |

---

## 7. Owner independence

| Action | Required for money truth? | Required for work activation today? |
|--------|---------------------------|-------------------------------------|
| Mark paid | **NONE** | — |
| Notice payment / open File Room | — | **Effectively yes** to materialize tasks/jobs |
| Create jobs manually | — | Lazy generate on visit |
| Start routing / production | — | Explicit `start_building_concepts` (correct for production start) |

**Routine Owner action for post-pay activation: NOT NONE** under current visit-lazy design — that fails the package bar for activation (not for payment).

---

## 8. Failure recovery

| Scenario | Detectable? | Durable? | Retryable? | Idempotent? | Owner of recovery |
|----------|-------------|----------|------------|-------------|-------------------|
| A. Paid write fails | Yes (webhook/reconcile error) | Unpaid | Reconcile / Stripe retry | Event store | System |
| B. Activation partial | **Weak** — no activation transaction at pay time | Paid without tasks | Open File Room (lazy) | Task ids once created | **Implicit human visit** |
| C. Duplicate Stripe event | Yes | Paid once | Returns alreadyPaid | Yes | System |
| D. Browser close | Paid on server | Paid; intake/UI may stall | Return / Board hydrate | — | Customer + system |
| E. Restart between pay and activation | Paid file survives | Paid | Same lazy path | — | System for pay; visit for tasks |

Silent disappearance of **money** truth: no. Silent absence of **actionable work envelope**: yes, until visited.

---

## 9. Routing boundary

Inspection stops at ready-for-routing / actionable work.  
**Not started:** producer selection, Make, Canva, Shotstack, ElevenLabs, Netlify, text-model dispatch.

---

## Recommended narrow next package (exactly one)

**STUDIO-OPERATING-POST-PAY-ACTIVATION-CONSUMER-1**

Purpose: After authoritative `paymentTruth.status = confirmed`, **eagerly and idempotently** write durable post-pay operating state:

- paid project is active in the operating spine
- awaiting intake and/or awaiting materials as honest waiting states
- purchased SKUs materialize as stable job/task records **once**
- no File Room visit required
- no auto-start of production
- no producer routing/dispatch
- routine Owner action = **NONE** for activation
- Payment Truth + Assurance untouched

Do **not** start routing/tool orchestration in that package.

---

## Protections held

- No implementation changes in this inspection
- No commit / push / merge
- Payment Truth seal preserved as base
- Kitchen / Assurance not modified
- Canva / Make not assumed

---

## Return

**POST-PAY ACTIVATION NOT READY — MATERIAL GAP**

Next: `STUDIO-OPERATING-POST-PAY-ACTIVATION-CONSUMER-1` (Owner/Manager authorize before construction).

Scout PARKED.
