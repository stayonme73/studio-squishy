# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-OBLIGATION-SEAM-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-OBLIGATION-SEAM-1  
**Mode:** Inspection only — no build · no remap · no dispatch · no commit  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### MONTHLY OBLIGATION SEAM GAP — C

**Question answered:**

> Where, in the existing payment → activation spine, does a confirmed pay-per-cycle purchase become the authoritative monthly cycle record?

**Create locus (recommended — not implemented):**

A **narrow cycle-creation step triggered by post-pay activation**, after processor-confirmed payment truth — **not** inside `applyPaidTruthToCampaignRecord` alone, and **not** in the renderer.

| Boundary | Law |
|----------|-----|
| Payment | **Authorizes** the obligation |
| Activation-triggered create | **May create** the cycle record |
| Renderer | **Consumes only** |

**Why not READY:** the *placement* is clear, but the **existing spine cannot yet authorize a paid monthly cycle**. Hidden lifecycle gaps remain larger than “add one store write”:

1. Checkout charges **one-time only** (`amountDueTodayCents` excludes monthly) — monthly can appear on `selectedServiceIds` / jobs **without** being paid.  
2. Campaign payment is **one-shot** (`already_paid` / `transaction_reuse` on a second session) — **Cycle N+1 has no repurchase path** on the same campaign.  
3. **No** durable cycle record store/schema exists.  
4. Live jobs are `campaignId:skuId` — **no cycle component** for multi-cycle identity.

So monthly is **not** one small create-hook away from live Machine dispatch. Payment-authority for pay-per-cycle must land before (or with) cycle mint.

| Class | Why |
|-------|-----|
| **A** | Rejected — create locus *can* be named |
| **B** | Rejected — “write cycle in confirm only” would blur authorize vs materialize and still fails amount/N+1 gaps |
| **C** | **Accepted** — recommended seam + remaining payment/lifecycle gaps before implementation |
| **D** | Rejected — not edit/ingest |

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `b974220a96a4f3f14fef00bb69e8980a61ee88b5` |
| Prior | OWNER-DECISION-1 → **pay-per-cycle FROZEN** |
| Chain today | `confirmPaymentFromProcessor` → `ensureDispatchExecution` → `ensureRoutingHandoff` → `ensurePostPayActivation` |
| Cycle store | **Absent** |
| `sm-001-monthly` | Canva · renderer consumer-only · no remap |

---

## 2. Spine map (living code)

```
Checkout create (one-shot mode:payment, amount = oneTime only)
    → paymentTruth status:initiated
Confirm (webhook/sandbox/reconcile)
    → applyPaidTruthToCampaignRecord  ← AUTHORIZE (paymentTruth confirmed)
    → activateAfterPayment
        → ensureDispatchExecution
            → ensureRoutingHandoff
                → ensurePostPayActivation  ← MATERIALIZE jobs/tasks/materials
Renderer / dispatch hooks
    → consume job truth (sm-001 only today; monthly Canva)
```

| Candidate create point | Fit under CO boundary? | Fit with living spine? |
|------------------------|------------------------|-------------------------|
| Immediately inside payment confirm / `applyPaidTruth*` | Weak — confirm should stay authorization + durable payment write | Would load confirm with operating mint; still blocked by amount/N+1 |
| **Inside / triggered by post-pay activation** | **Strong** — matches “activation may create”; same layer as job materialization | **Best fit** once payment proves *this cycle* was paid |
| Renderer | **Forbidden** | Proof already fail-closed on mint |

---

## 3. Recommended seam (freeze for next implement — not built)

### OS-1. Exact trigger event

**Processor-confirmed payment that includes a paid `sm-001-monthly` cycle line for this purchase**, observed when activation runs (`isPaymentConfirmedForActivation` true).

Same rule for Cycle 1 and Cycle N+1: each is a **distinct confirmed pay-per-cycle purchase** → distinct create.

Fail closed if payment not confirmed, monthly not in the **paid** set for this confirmation, or amount does not cover that cycle’s price.

### OS-2. Exact owning module / store

| Piece | Recommendation |
|-------|----------------|
| Owning step | Narrow create-only function invoked from the **activation chain** (prefer named step called by / immediately after `ensurePostPayActivation`, not buried only in job sync) |
| Durable store | Campaign-scoped **cycle obligation records** (new) — not renderer fixtures, not `"Current cycle"` task labels |
| Not owner | `studio-design-renderer`, Stripe subscription objects, wall-clock cron |

### OS-3. Fields created at mint

Align ACCEPT-SEAM create shape + payment bind:

| Field | At create |
|-------|-----------|
| `productionCycleId` | Yes |
| `cycleStartDate` / `cycleEndDate` | Yes |
| `monthlyContentFocus` (or durable pointer) | Yes per ACCEPT — **timing tension** if activation precedes intake (see §6) |
| `skuId` | `sm-001-monthly` |
| `campaignId` | Yes |
| `createdAt` + creating event type | Yes |
| Payment bind | `checkoutSessionId`, `paymentIntentId` (nullable), `confirmedAmountCents` slice / expected cycle price, `stripeEventId` if any |
| `plannedPostCount` | **Not** required at create (lock before execution) |

### OS-4. How `productionCycleId` is minted

| Rule | Freeze |
|------|--------|
| Minted by | Cycle-obligation create step (activation-triggered) — **never** renderer |
| Source | New durable id at create (server-generated) — **not** `"Current cycle"`, not calendar month alone, not Stripe subscription period |
| Stable under retry | Idempotent on the **payment identity** for that cycle purchase (see OS-5) |

### OS-5. Duplicate paid-cycle prevention

| Key | Behavior |
|-----|----------|
| Primary idempotency | One cycle record per **paid purchase identity** for this SKU — e.g. `(campaignId, skuId, checkoutSessionId)` or `(campaignId, skuId, paymentIntentId)` when present |
| Secondary | Unique `productionCycleId`; refuse second open of same id |
| Overlap | Default fail closed on overlapping windows (ACCEPT) |
| Confirm retries | Same session/event → return existing cycle (`alreadyCreated`), do not mint twin |

### OS-6. Paid amount / SKU / payment identity bind

| Bind | Requirement |
|------|-------------|
| SKU | `sm-001-monthly` must be in the **paid** confirmation set for *this* cycle |
| Amount | Confirmed payment must cover **this cycle’s** catalog price (pay-per-cycle) — **not** “monthly listed but zeroed out of amountDueToday” |
| Session | `checkoutSessionId` (and intent/event when present) stored on the cycle record |
| Unpaid monthly on plan | **Must not** create a cycle |

**Living gap:** `computePlanPricingTotals` / `deriveCheckoutAmountCents` set `amountDueTodayCents = oneTimeSubtotalCents` only. Stripe line charges that amount. `selectedServiceIds` may still list monthly → activation syncs a monthly **job** with **no** cycle pay proof. Under CO-2/CO-5 this is fail-closed for cycle create — and today there is no compliant paid monthly path.

### OS-7. Cycle 1 and N+1 — same rule

| Cycle | Rule |
|-------|------|
| 1 | Confirmed payment for that cycle → activation-triggered create |
| N+1 | Explicit purchase + confirmed payment for the next cycle → **same** create step |

**Living gap:** `createCheckoutSession` rejects `paymentReceivedAt` (`already_paid`). `confirmPaymentFromProcessor` rejects a different session when already confirmed (`transaction_reuse`). Singular `paymentTruth` overwrites one campaign payment. **N+1 cannot reuse this spine as-is.**

### OS-8. Backfill

Separately authorized **paid** cycle → new create through the **same** seam (new payment identity + new `productionCycleId`). Never mutate prior cycle (CY-7).

### OS-9. No-payment paths fail closed

| Path | Behavior |
|------|----------|
| No / failed / cancelled payment | No create |
| Payment confirmed but monthly not paid in that confirmation | No create |
| Renderer without cycle | Fail closed (already proven) |
| Speculative / early / twin future opens | Forbidden (CO-6) |

### OS-10. Schema change required?

**Yes.**

| Change | Needed? |
|--------|---------|
| Durable paid-cycle obligation record(s) on campaign (or adjacent store) | **Yes** — absent today |
| Payment truth that can authorize **per-cycle** purchases (amount includes cycle price; N+1 not blocked by one-shot campaign paid) | **Yes** — current singular checkout/paymentTruth insufficient |
| Job id `campaignId:skuId` vs cycle-scoped production identity | **Likely** for multi-cycle dispatch — at minimum cycles must not collapse into one unpaid job forever |
| Renderer schema | No mint change — consumer only |

### OS-11. Owner action

**NONE** for routine create. `postPayActivation.ownerActionRequired` stays `false`. Owner does not mint cycles by hand for routine production.

---

## 4. Candidate ranking (inspection)

| Option | Verdict |
|--------|---------|
| A. Immediately after confirmed payment truth only | Reject as sole mint home — authorize yes; materialize belongs with activation; still blocked by amount/N+1 |
| B. Inside post-pay activation body | Acceptable home if gated on **paid** monthly for this confirmation |
| C. Narrow new cycle-creation step triggered by activation | **Preferred** — clearest ownership, same chain, easier N+1 re-entry when a *new* payment later wakes activation |

**Preferred: C** (may call into shared helpers used by B).

---

## 5. Focus timing tension (flag, do not invent)

ACCEPT requires focus at create. Activation often runs at `awaiting_intake` before monthly direction exists.

| Do not do | Why |
|-----------|-----|
| Invent focus at mint | Violates honesty / stale-truth bans |
| Delay all create until intake without Owner freeze | Softens “payment authorizes; activation may create” without new product law |

**Implementation package must resolve** (Owner-visible): create with focus pending vs require focus before mint vs allow create then fail-closed at render until focus locked — without weakening pay-per-cycle.

---

## 6. Dispatch readiness impact

| Gate | Status |
|------|--------|
| Commercial obligation (pay-per-cycle) | **Frozen** |
| Create locus recommendation | **Named** (activation-triggered) |
| Payment can authorize paid monthly cycle | **GAP** |
| N+1 repurchase on spine | **GAP** |
| Cycle record store | **GAP** |
| Remap / dispatch monthly | Still closed (Canva) |

**Conclusion:** Not one small implementation package from live monthly Machine dispatch. Hidden payment/lifecycle gap remains.

---

## 7. Preserve locks

| Lock | Status |
|------|--------|
| Payment authorizes · activation may create · renderer consumes | Honored in recommendation |
| No Stripe subscription inference | Honored |
| No build / remap / dispatch / commit | Confirmed |
| Seven sealed lanes · `sm-001` sealed · monthly Canva | Untouched |
| Owner routine NONE | Confirmed |

---

## 8. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PAID-CYCLE-PAYMENT-AUTHORITY-1`**

Inspection or thin design freeze (still no remap/dispatch/subscription platform):

Make pay-per-cycle **payable and confirmable** on the living spine:

1. Cycle purchase amount must include `sm-001-monthly` cycle price when that cycle is being bought.  
2. Cycle 1 and N+1 must each get a **distinct** confirmed payment identity (without inventing Stripe subscriptions).  
3. Fail closed: monthly on plan but not in paid amount → no cycle create.  
4. Preserve: payment authorizes; activation-triggered create; renderer consumes.

Only after that authority exists should an implementation package mint cycle records at the OS-preferred seam.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**

Create point is clear. Payment spine cannot yet tell the truth that a monthly cycle was paid — especially for N+1. That is the remaining blocker before mint/remap/dispatch.
