# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PAID-CYCLE-PAYMENT-AUTHORITY-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PAID-CYCLE-PAYMENT-AUTHORITY-1  
**Mode:** Inspection / payment-authority freeze only — no build · no cycle mint · no remap · no dispatch · no subscription  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### MONTHLY PAID-CYCLE PAYMENT AUTHORITY READY

The missing truth is now freezable without rebuilding Payment Truth or inventing Stripe subscriptions:

> **This processor-confirmed one-shot payment bought exactly one `sm-001-monthly` cycle for this campaign.**

Authority identity is a durable **`paidCyclePurchaseId`** (Studio purchase authority) — **before** and **distinct from** `productionCycleId` (activation-created production obligation).

| Boundary (unchanged) | Role |
|----------------------|------|
| Customer explicitly buys each cycle | Commercial act |
| Processor-confirmed payment | Authorizes **that** `paidCyclePurchaseId` only |
| Activation | May create `productionCycleId` later |
| Renderer | Consumes cycle — never mints payment or cycle |

**Critical anti-bug (frozen):**

Campaign-level `paymentReceivedAt` / singular `paymentTruth.confirmed` **MUST NOT** mean “every future monthly cycle is paid.”

| Class | Why |
|-------|-----|
| **A–D GAP** | Rejected — authority model is definable on one-shot Checkout without subscriptions |
| **READY** | Purchase identity, binding, confirm record, idempotency, and campaign-paid supplementation are frozen below |

Implementation is **not** done in this package. READY = authority **design** frozen for a narrow implement package.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `b974220a96a4f3f14fef00bb69e8980a61ee88b5` |
| Prior | OBLIGATION-SEAM-1 → **GAP C** (create locus named; payment cannot authorize cycle) |
| Commercial law | OWNER-DECISION-1 pay-per-cycle **FROZEN** |
| Payment Truth | **SEALED** — protected; extend by supplementation, do not reopen seal semantics |
| Stripe | Hosted Checkout `mode: "payment"` (living) — **not** subscription |

---

## 2. Living spine gaps this freeze closes (by design)

| Living behavior | Bug under pay-per-cycle |
|-----------------|-------------------------|
| `amountDueTodayCents = oneTimeSubtotalCents` only | Monthly can ride on plan labels / jobs **unpaid** |
| `createCheckoutSession` → `already_paid` if `paymentReceivedAt` | Blocks Cycle N+1 repurchase |
| Singular `paymentTruth` overwrite | One campaign payment ≠ ledger of cycle purchases |
| `confirm` `transaction_reuse` on new session when already confirmed | Blocks second paid cycle |
| `reconcile` short-circuit on `paymentReceivedAt` | Treats any later session as already done without cycle authority |

---

## 3. Exact purchase identity — FROZEN

### PA-1. `paidCyclePurchaseId`

| Rule | Law |
|------|-----|
| What | Studio-issued **paid-cycle purchase** identity |
| When minted | At **checkout initiation** for an explicit cycle buy (before processor confirm) |
| Scope | Exactly one intended purchase of `sm-001-monthly` for one `campaignId` |
| Relation to `productionCycleId` | **Prior and distinct** — payment authority first; production cycle created later by activation seam |
| Relation to Stripe | Bound to one Checkout Session (`checkoutSessionId`); **not** a Stripe Subscription id |
| Forbidden substitutes | `"Current cycle"`, wall-clock month, campaign `paymentReceivedAt`, catalog `billingType: monthly` alone |

**Yes — `paidCyclePurchaseId` (or equivalent) is required before `productionCycleId`.**

Without it, confirm cannot prove *which* cycle purchase was paid, and N+1 collapses into campaign-paid fog.

### PA-2. Authority tuple (confirmed)

A confirmed paid-cycle authority binds:

| Field | Required |
|-------|----------|
| `paidCyclePurchaseId` | Yes |
| `campaignId` | Yes |
| `skuId` = `sm-001-monthly` | Yes |
| `checkoutSessionId` | Yes |
| `expectedAmountCents` / `confirmedAmountCents` | Yes — must include **this cycle’s** catalog price |
| `currency` | Yes (`usd`) |
| `status` | `initiated` → `confirmed` (failed/cancelled/expired stay non-authority) |
| `paymentIntentId` / `stripeEventId` | When processor provides |
| `confirmedAt` | On confirm |
| Optional window intent | Allowed later; must not invent production focus |

---

## 4. How the customer explicitly purchases one monthly cycle — FROZEN

### PA-3. Purchase act

Customer **explicitly selects/buys one monthly cycle** (Cycle 1 or N+1) as a pay-per-cycle purchase — not auto-renewal, not implied by prior campaign payment.

### PA-4. Checkout identification

Checkout session binding **must** carry:

| Binding field | Purpose |
|---------------|---------|
| `paidCyclePurchaseId` | Which cycle purchase this session is for |
| `campaignId` | Project |
| `skuId` / cycle SKU marker | `sm-001-monthly` |
| `purchaseKind: "paid_cycle"` | Distinguishes from initial one-time plan checkout |
| `expectedAmountCents` | Includes cycle price (see PA-5) |

Stripe metadata should mirror these keys (short values) alongside existing Payment Truth metadata — **extend**, do not replace sealed keys carelessly.

### PA-5. Amount-due includes the cycle — FROZEN

| Rule | Law |
|------|-----|
| Cycle purchase amount | At least `getServicePriceCents("sm-001-monthly")` (catalog **$349** / `34900` cents today) |
| “Monthly entitlement label only” | **Forbidden** as payment authority |
| Mixed cart (one-time SKUs + this cycle) | Allowed **only if** charged total **includes** the cycle price **and** binding marks `paidCyclePurchaseId` for the monthly line |
| Monthly on `selectedServiceIds` but omitted from charged amount | **Fail closed** — no paid-cycle authority |

Living `computePlanPricingTotals` / `deriveCheckoutAmountCents` **must change** for paid-cycle purchases so amount-due-today is not one-time-only when a cycle is being bought. That is an **additive checkout path / amount rule**, not a subscription.

### PA-6. Processor path — FROZEN

| Question | Answer |
|----------|--------|
| Can existing Stripe Checkout support this? | **Yes** — another hosted `mode: "payment"` one-shot session |
| Stripe Subscription / recurring price | **Forbidden** for this launch model |
| Sandbox confirm | Same authority shape; still not live money |

---

## 5. Cycle 1 and Cycle N+1 — same payment path — FROZEN

| Cycle | Path |
|-------|------|
| **1** | Create `paidCyclePurchaseId` → one-shot Checkout → confirm → durable confirmed authority |
| **N+1** | **New** `paidCyclePurchaseId` → **new** Checkout Session → confirm → append another confirmed authority |

Same modules, same rules. No automatic renewal. Completing Cycle N never opens payment authority for N+1.

---

## 6. Durable processor-confirmed authority record — FROZEN

### PA-7. Store shape (design)

Append-only (or status-updating) **paid-cycle purchase ledger** on the campaign (or payment store keyed by campaign), e.g. `paidCyclePurchases[]`, each row = one `paidCyclePurchaseId`.

| Status | Meaning |
|--------|---------|
| `initiated` | Checkout opened; **not** obligation authority |
| `confirmed` | Processor confirmed; **authorizes** exactly this cycle purchase |
| `failed` / `cancelled` / `expired` | **No** authority |

### PA-8. Relation to sealed campaign payment truth — FROZEN

| Artifact | Meaning after this freeze |
|----------|---------------------------|
| `paymentReceivedAt` + singular `paymentTruth` | Initial / plan / one-time campaign payment authority (**preserved**) |
| `paidCyclePurchases[]` | **Supplement** — per-cycle monthly payment authority |
| Interpreting campaign paid as “all monthly cycles paid” | **Forbidden** |

**Existing campaign one-shot “paid” state must be supplemented — not reused as cycle authority.**

---

## 7. Idempotency — FROZEN

| Event | Rule |
|-------|------|
| Duplicate webhook / reconcile / sandbox for same session/event | Confirm once; return existing confirmed `paidCyclePurchaseId` authority (`alreadyPaid` for **that purchase**) |
| Processed payment event store | Keep eventId / session idempotency (living `payment-events`) |
| Second mint of authority for same `paidCyclePurchaseId` | **Fail closed** / no-op return existing |
| Same `checkoutSessionId` rebound to different `paidCyclePurchaseId` | **Fail closed** |
| New session for new `paidCyclePurchaseId` on same campaign | **Allowed** (N+1) — must not hit campaign-level `transaction_reuse` / `already_paid` as if illegal |

---

## 8. Fail-closed unpaid paths — FROZEN

| Path | Result |
|------|--------|
| Checkout abandoned / cancelled / failed | No `confirmed` paid-cycle authority |
| Amount mismatch / SKU mismatch / binding mismatch | Confirm fails (Payment Truth fail-closed preserved) |
| Monthly present without cycle purchase binding / without cycle amount | No paid-cycle authority |
| Activation / cycle create without confirmed `paidCyclePurchaseId` for that open | **Forbidden** (downstream; not built here) |

---

## 9. Backfill — FROZEN

Backfill = **separate** `paidCyclePurchaseId` + separate paid Checkout + separate confirmed authority → later separate `productionCycleId`. Never rewrite a prior purchase row to “become” backfill.

---

## 10. Required changes (design inventory — not built)

### Checkout

| Change | Need |
|--------|------|
| Paid-cycle checkout entry (Cycle 1 and N+1) | Yes |
| Mint `paidCyclePurchaseId` at session create | Yes |
| Session binding + Stripe metadata include purchase kind + id + sku | Yes |
| Amount includes cycle catalog price | Yes |
| Allow session create when campaign already has `paymentReceivedAt` **if** `purchaseKind: paid_cycle` | Yes |
| Do not open Stripe Subscription | Yes (non-goal) |

### Payment truth / confirm

| Change | Need |
|--------|------|
| On confirm: write/update **paid-cycle authority** row to `confirmed` | Yes |
| Do not treat new cycle session as `transaction_reuse` solely because campaign is already plan-paid | Yes |
| Preserve sealed one-time `paymentTruth` semantics for non-cycle checkouts | Yes |
| Idempotent confirm per purchase/session/event | Yes |

### Reconcile / return

| Change | Need |
|--------|------|
| Do not short-circuit solely on `paymentReceivedAt` for cycle sessions | Yes — resolve by session → `paidCyclePurchaseId` |

### Post-pay activation

| Change | Need |
|--------|------|
| May observe confirmed paid-cycle authority as gate for later cycle **create** | Yes (consume) |
| Must not invent cycles from campaign paid alone | Yes |
| Must not create cycle in this payment-authority package | **Out of scope** |

### Payment Truth seal

| Rule | Law |
|------|-----|
| Protect | Processor authority, browser non-authority, client cannot invent paid, hosted Checkout, Owner routine NONE |
| Allowed | **Additive** paid-cycle ledger + checkout path |
| Forbidden | Reopening seal to make campaign paid imply future cycles; subscription rebuild |

---

## 11. Owner role

**NONE** for routine paid-cycle payment authority. No Owner clerk confirm, no Owner invents `paidCyclePurchaseId` for routine buys.

---

## 12. Preserve locks

| Lock | Status |
|------|--------|
| Payment Truth seal protected (semantics) | Honored — supplement only |
| Monthly renderer proof frozen | Untouched |
| No cycle creation | Confirmed |
| No remap / dispatch / Stripe subscription | Confirmed |
| Seven sealed design lanes · `ma-001` parked | Confirmed |
| No commit / push / merge | Confirmed |

---

## 13. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PAID-CYCLE-PAYMENT-AUTHORITY-IMPLEMENT-1`**

Narrow implementation only:

1. Add `paidCyclePurchaseId` + durable paid-cycle purchase ledger  
2. Checkout path that charges the cycle and binds the tuple  
3. Confirm/reconcile that confirm **that purchase only** (idempotent)  
4. Supplement campaign paid — never reuse it as future-cycle authority  
5. Regression-protect sealed Payment Truth  

**Still out:** cycle record mint, remap, dispatch, subscription UI, Stripe Subscriptions.

After implement + proof, next reinspection can attach activation create to confirmed `paidCyclePurchaseId`.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**

Authority rule is frozen: **this payment bought this cycle** — identified by `paidCyclePurchaseId`, charged as one-shot Checkout, confirmed by the processor, supplemental to campaign-level paid truth.
