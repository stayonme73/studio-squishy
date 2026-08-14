# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PAID-CYCLE-PAYMENT-AUTHORITY-IMPLEMENT-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PAID-CYCLE-PAYMENT-AUTHORITY-IMPLEMENT-1  
**Mode:** Implementation — paid-cycle payment authority only  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### MONTHLY PAID-CYCLE PAYMENT AUTHORITY IMPLEMENTED

Durable pay-per-cycle payment authority is live in code:

> one explicit one-shot purchase → one `paidCyclePurchaseId` → processor-confirmed ledger row → (later) activation may mint `productionCycleId`

**Not done in this package:** `productionCycleId` mint · monthly remap · dispatch · Stripe subscriptions.

---

## 1. Files changed

| File | Role |
|------|------|
| `src/config/studio-paid-cycle-payment-v1.ts` | **New** — package constants / metadata keys / SKU |
| `src/lib/studio-payment/paid-cycle-types.ts` | **New** — ledger record type |
| `src/lib/studio-payment/paid-cycle-amount.ts` | **New** — amount includes cycle catalog price |
| `src/lib/studio-payment/paid-cycle-ledger.ts` | **New** — mint id · find · upsert · anti-lifetime helper |
| `src/lib/studio-payment/paid-cycle-payment-authority.test.ts` | **New** — authority proofs |
| `src/lib/studio-payment/create-session.ts` | `purchaseKind: paid_cycle` path · mint before session · binding |
| `src/lib/studio-payment/confirm.ts` | Confirm ledger · N+1 without overwriting campaign paymentTruth |
| `src/lib/studio-payment/reconcile.ts` | Paid-cycle sessions ignore campaign-paid short-circuit |
| `src/lib/studio-payment/events-store.ts` | Binding fields for paid-cycle |
| `src/lib/studio-payment/types.ts` | Request/result + error codes |
| `src/lib/studio-payment/index.ts` | Exports |
| `src/config/studio-payment-v1.ts` | Additive metadata keys (seal semantics preserved) |
| `src/config/studio-board.ts` | `paidCyclePurchases?` on campaign |
| `src/lib/campaign-store/customer-sync-allowlist.ts` | Client cannot invent ledger |

---

## 2. Purchase-ID creation point

**Minted in `createCheckoutSession` via `mintPaidCyclePurchaseId()` during amount resolve — before Checkout Session id exists / before processor confirm.**

Persisted as ledger row `status: "initiated"` when the session id is known (sandbox or Stripe), still **before** any payment confirmation.

---

## 3. Checkout binding

`CheckoutSessionBinding` (and Stripe metadata when hosted) carry:

| Field | Value |
|-------|--------|
| `purchaseKind` | `paid_cycle` |
| `paidCyclePurchaseId` | minted id |
| `cycleSkuId` | `sm-001-monthly` |
| `cyclePriceCents` | catalog cycle price |
| `campaignId` / SKUs / amount / decision | existing Payment Truth binding fields |
| Stripe `mode` | **`payment`** (unchanged) |

---

## 4. Amount authority

`derivePaidCycleCheckoutAmountCents`:

- Requires `sm-001-monthly` in selection  
- Charges **sum of catalog prices** for selected SKUs (one-time + monthly cycle)  
- Fail closed if cycle price not included  

Sealed `deriveCheckoutAmountCents` / `amountDueTodayCents = oneTime only` **unchanged** for `studio_plan` checkouts.

---

## 5. Processor-confirmed ledger record

Campaign field: `paidCyclePurchases[]`

| Status | Meaning |
|--------|---------|
| `initiated` | Checkout opened — **not** authority |
| `confirmed` | Processor confirmed — **authorizes this purchase only** |

Confirm path: webhook / reconcile / sandbox → `confirmPaymentFromProcessor` → ledger `confirmed` when binding is `paid_cycle`.

**Does not create `productionCycleId`.**

---

## 6. Idempotency

| Path | Behavior |
|------|----------|
| Duplicate sandbox/webhook confirm same session/purchase | Returns existing confirmed row · `alreadyPaid: true` · no second row |
| Reconcile after confirm | Reads confirmed ledger for that session/purchase · does not mint twin |
| Processed payment events | Existing event store still written |

---

## 7. Cycle 1 / N+1

| Cycle | Behavior |
|-------|----------|
| 1 | `purchaseKind: paid_cycle` → new id → session → confirm → ledger + may write first `paymentTruth` |
| N+1 | Allowed even when `paymentReceivedAt` set → **new** id → **new** session → confirm → **append** ledger · **does not overwrite** campaign `paymentTruth` |

---

## 8. Campaign-paid-state boundary

| Rule | Enforced |
|------|----------|
| Supplement, do not replace `paymentTruth` | Yes |
| Campaign paid ≠ future cycles paid | `campaignPaidAloneAuthorizesCycle` always `false`; N+1 needs new confirmed purchase |
| Reconcile short-circuit on `paymentReceivedAt` | **Skipped** for paid-cycle sessions |

---

## 9. Failure cases proven

| Case | Result |
|------|--------|
| Missing purchase id on paid-cycle binding | `paid_cycle_invalid` |
| Wrong / missing cycle SKU in amount derive | Fail closed |
| Amount excludes / mismatches cycle | `amount_mismatch` |
| Unpaid / initiated only | Not confirmed authority |
| Session↔purchase mismatch / reuse prior id on new session | `purchase_mismatch` |
| Wrong campaign for session | `transaction_reuse` |
| Client invents `paidCyclePurchases` | Stripped on sync |
| Duplicate confirm | Single ledger row |

---

## 10. Payment Truth protection

| Lock | Status |
|------|--------|
| Hosted Checkout `mode: "payment"` | Preserved |
| Browser return non-authority | Preserved |
| Processor confirm path | Shared / extended |
| `studio_plan` one-shot `already_paid` | Preserved |
| Additive metadata + ledger only | No subscription rebuild |

---

## 11. Non-monthly regression

`payment-truth.test.ts` **15/15 PASS**  
Paid-cycle suite proves studio_plan flyer checkout still confirms without inventing cycle rows · activation still wakes.

---

## 12. Owner-independence

Routine Owner action for paid-cycle authority: **NONE**.  
No Owner mint of purchase ids; no Owner clerk confirm for routine buys.

---

## 13. Tests / result

```
paid-cycle-payment-authority.test.ts  11/11 PASS
payment-truth.test.ts                  15/15 PASS
customer-sync-allowlist.test.ts         4/4 PASS
```

---

## 14. Git state

| Field | Value |
|-------|--------|
| HEAD | `b974220a96a4f3f14fef00bb69e8980a61ee88b5` |
| Branch | `operating/design-renderer-proof-1` |
| Commit / push / merge | **None** (package changes uncommitted) |

---

## 15. Preserve locks

| Lock | Status |
|------|--------|
| No `productionCycleId` mint | Confirmed |
| No remap / dispatch / subscription / Make | Confirmed |
| Monthly renderer consumer-only · Canva primaryTool | Untouched |
| Seven sealed design lanes · `ma-001` parked | Untouched |

---

## 16. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PAID-AUTHORITY-TO-CYCLE-CREATE-1`**

Narrow seam: given a **confirmed** `paidCyclePurchaseId`, activation-triggered create of exactly one authoritative `productionCycleId` record — renderer still consumes only; no remap/dispatch yet.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
