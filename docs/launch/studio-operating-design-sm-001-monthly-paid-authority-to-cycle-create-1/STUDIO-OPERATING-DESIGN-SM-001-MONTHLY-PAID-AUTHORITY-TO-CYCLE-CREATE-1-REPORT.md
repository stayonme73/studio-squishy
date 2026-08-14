# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PAID-AUTHORITY-TO-CYCLE-CREATE-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PAID-AUTHORITY-TO-CYCLE-CREATE-1  
**Mode:** Implementation — create-only production cycle from confirmed paid-cycle authority  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### MONTHLY PAID AUTHORITY TO CYCLE CREATE READY

Create-only seam is live:

> confirmed `paidCyclePurchaseId` + explicit service-production-period truth → activation → exactly one `productionCycleId`

Renderer remains a **consumer only** (not invoked). No remap · no dispatch · no subscriptions.

---

## 1. Files changed

| File | Role |
|------|------|
| `src/config/studio-sm-001-monthly-production-cycle-v1.ts` | **New** — package constants |
| `src/lib/studio-monthly-production-cycle/types.ts` | **New** — period truth + cycle record |
| `src/lib/studio-monthly-production-cycle/period.ts` | **New** — explicit date/focus validation |
| `src/lib/studio-monthly-production-cycle/create.ts` | **New** — lock period · create · ensure · immutability |
| `src/lib/studio-monthly-production-cycle/index.ts` | **New** — exports |
| `src/lib/studio-monthly-production-cycle/paid-authority-to-cycle-create.test.ts` | **New** — proofs |
| `src/lib/studio-post-pay-activation/activate.ts` | Wire ensure-create into activation (incl. N+1) |
| `src/config/studio-board.ts` | `sm001MonthlyCyclePeriodTruths` · `sm001MonthlyProductionCycles` |
| `src/lib/campaign-store/customer-sync-allowlist.ts` | Client cannot invent cycle/period fields |

---

## 2. Activation trigger

`ensurePostPayActivation` calls `ensureSm001MonthlyProductionCyclesFromPaidAuthority` after line-item ensure and **before** the idempotent early-return.

If a new cycle is created (e.g. N+1 after period lock), activation **persists** even when jobs/session already match — so campaign-level `paymentTruth.checkoutSessionId` from Cycle 1 cannot swallow Cycle 2 create.

---

## 3. Cycle record shape

`Sm001MonthlyProductionCycleRecord`:

| Field | Bound |
|-------|--------|
| `productionCycleId` | Minted at create (`cyc_…`) |
| `paidCyclePurchaseId` | Confirmed ledger row |
| `checkoutSessionId` | From that purchase |
| `campaignId` | Campaign |
| `skuId` | `sm-001-monthly` |
| `cycleStartDate` / `cycleEndDate` | From explicit period truth |
| `monthlyContentFocus` | From explicit period truth |
| `status` | `open` |
| `createdAt` | Create metadata |
| `plannedPostCount` | Optional until pre-production lock |

---

## 4. Identity generation point

`mintProductionCycleId()` inside `createSm001MonthlyProductionCycleFromPaidAuthority` — **only** after:

1. purchase `status === "confirmed"`  
2. `skuId === sm-001-monthly`  
3. explicit period truth locked for that `paidCyclePurchaseId`  

Never from wall-clock, `"Current cycle"`, Stripe periods, prior cycle dates, or renderer defaults.

---

## 5. Paid-purchase binding

Uniqueness: **one `paidCyclePurchaseId` → one `productionCycleId`**.

Lookup: `findProductionCycleByPaidPurchase`. Duplicate create returns `alreadyCreated: true` with the existing row.

---

## 6. Duplicate protection

| Event | Behavior |
|-------|----------|
| Repeated create / activation / ensure | Same cycle returned |
| Second mint for same purchase | Impossible — idempotent return |
| Prior purchase reused for new period after cycle exists | `cycle_immutable` on period re-lock |

---

## 7. Date / focus authority

`lockSm001MonthlyCyclePeriodTruth` stores explicit `Sm001MonthlyCyclePeriodTruth` (`source: "explicit_service_production_period"`).

Missing / invalid dates, empty focus, or `"Current cycle"` as focus → **fail closed** (no mint).

Confirmed purchase **without** period truth → create fails `missing_period_truth`; activation **skips** that purchase (does not invent dates; does not fail non-monthly activation).

---

## 8. N+1 behavior

New paid-cycle purchase → new confirmed authority → new period truth → new `productionCycleId`.  
Prior cycle remains on the campaign ledger, unchanged.

---

## 9. Backfill behavior

Backfill = separate paid-cycle purchase + separate period truth + new cycle.  
Never rewrite an old `productionCycleId` to represent backfill (`refuseSm001MonthlyProductionCycleMutation` / immutable period re-lock).

---

## 10. Failure cases proven

| Case | Result |
|------|--------|
| Unpaid / initiated purchase | `purchase_not_confirmed` |
| Missing purchase id | `missing_purchase_id` |
| Missing period truth | `missing_period_truth` |
| Bad dates / `"Current cycle"` focus | Fail closed |
| Duplicate mint | Same cycle · `alreadyCreated` |
| Prior purchase as N+1 period change | `cycle_immutable` |
| Mutate existing cycle dates | `cycle_immutable` |
| Campaign paid alone (flyer) | Zero monthly cycles |

---

## 11. Renderer boundary

Cycle create module does **not** import or invoke `runSm001MonthlyRendererPipeline`.  
`sm-001-monthly.primaryTool` remains Canva. No dispatch wiring.

---

## 12. Payment Truth protection

Paid-cycle ledger and sealed `paymentTruth` unchanged in semantics.  
Campaign paid ≠ monthly cycle authority (`campaignPaidAloneCreatesMonthlyCycle() === false`).

---

## 13. Non-monthly activation regression

| Suite | Result |
|-------|--------|
| `activate.test.ts` (post-pay consumer) | **10/10 PASS** |
| `payment-truth.test.ts` | **15/15 PASS** |
| `paid-cycle-payment-authority.test.ts` | **11/11 PASS** |

---

## 14. Owner-independence

Owner routine for cycle create: **NONE**.  
No Owner mint of `productionCycleId`; no Owner clerk folder/id work for routine opens.

---

## 15. Tests / result

```
paid-authority-to-cycle-create.test.ts   8/8 PASS
activate.test.ts                        10/10 PASS
paid-cycle-payment-authority.test.ts    11/11 PASS
payment-truth.test.ts                   15/15 PASS
```

---

## 16. Git state

| Field | Value |
|-------|--------|
| HEAD | `b974220a96a4f3f14fef00bb69e8980a61ee88b5` |
| Branch | `operating/design-renderer-proof-1` |
| Commit / push / merge | **None** |

**Note:** Monthly commercial/payment/cycle packages remain uncommitted by design. After this READY, Owner should decide a **commit control point** for the foundation before monthly renderer dispatch.

---

## 17. Exactly one recommended next step

**Owner choice (commit control before dispatch):**

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-FOUNDATION-COMMIT-1`**

Commit/control-point the assembled lane (paid-cycle authority + period lock + production cycle create + prior monthly docs/proof consumer code as Owner scopes) — **still no remap / no dispatch**.

Only after that control point: consider monthly renderer consumer wiring / remap authorization as a separate package.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
