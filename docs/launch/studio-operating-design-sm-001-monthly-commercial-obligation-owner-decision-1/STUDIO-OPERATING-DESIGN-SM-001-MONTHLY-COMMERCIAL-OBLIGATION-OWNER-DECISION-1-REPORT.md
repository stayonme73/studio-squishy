# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-COMMERCIAL-OBLIGATION-OWNER-DECISION-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-COMMERCIAL-OBLIGATION-OWNER-DECISION-1  
**Mode:** Owner product freeze only — no implementation · no payment spine remap · no dispatch · no subscription build  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### MONTHLY COMMERCIAL OBLIGATION OWNER DECISION FROZEN

Owner has frozen the commercial obligation rule for `sm-001-monthly` launch.

**Launch model:** pay-per-cycle monthly service.

**Hinge answer (now frozen):**

> The Studio owes a production cycle only when the customer has explicitly purchased and paid for that cycle.

Cycle 1 and Cycle N+1 use the same rule. No automatic renewal. No payment → no new Studio obligation.

This package records that law. It does **not** wire creation into the payment/activation spine — that is the next reinspection.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `b974220a96a4f3f14fef00bb69e8980a61ee88b5` |
| Prior | PERMISSION-TRUTH-1 → **GAP C** (obligation undefined) |
| This package | Owner answers → **frozen operating rule** |
| Renderer | Consumer-only (unchanged) |
| `sm-001-monthly.primaryTool` | **Canva** (unchanged) |

---

## 2. Frozen operating rules (Owner law)

### CO-1. Launch model — FROZEN

**Pay-per-cycle monthly service.**

Each production cycle is a distinct commercial purchase. The SKU may be labeled monthly; the obligation model is **not** a standing subscription entitlement that auto-opens periods.

### CO-2. Cycle 1 obligation — FROZEN

**Cycle 1 opens only after confirmed payment for that cycle.**

| Rule | Law |
|------|-----|
| Trigger | Confirmed payment for Cycle 1 |
| Without confirmed payment | **No** Cycle 1 obligation |
| Catalog presence / plan line alone | **Not** sufficient |

### CO-3. Cycle N+1 obligation — FROZEN

**Cycle N+1 opens only after the customer explicitly purchases and pays for the next cycle.**

| Rule | Law |
|------|-----|
| Trigger | Explicit purchase + confirmed payment for the next cycle |
| Automatic rollover from Cycle N | **Forbidden** |
| Wall-clock month change | **Forbidden** as obligation |
| `"Current cycle"` / job id alone | **Forbidden** as obligation |

### CO-4. No automatic renewal — FROZEN

There is **no** automatic renewal. Completing or closing Cycle N does **not** create Cycle N+1.

### CO-5. No payment = no new Studio obligation — FROZEN

Failed, missing, cancelled, or incomplete payment for a cycle → **no** new owed production cycle for that period.

### CO-6. No speculative future cycles — FROZEN

| Rule | Law |
|------|-----|
| Pre-create unpaid future cycles | **Forbidden** |
| Open Cycle N+1 early “because next month is coming” | **Forbidden** |
| Two unpaid/speculative future cycles open at once | **Forbidden** |

A cycle record may be created only as the authoritative consequence of a **paid** cycle purchase (or a separately authorized paid backfill — CO-8).

### CO-7. No Stripe subscription inference — FROZEN

| Rule | Law |
|------|-----|
| Current checkout `mode: "payment"` | Remains one-shot context |
| Stripe subscription periods | **Must not** be inferred as production-cycle authority |
| Billing platform period ≠ cycle identity | Unless a later **explicit** product freeze links them |

Pay-per-cycle may still use one-shot payment rails. The **obligation** is the paid cycle purchase event — not a subscription object implied from Stripe.

### CO-8. Backfill — FROZEN

**Backfill requires a separately authorized paid cycle.**

| Rule | Law |
|------|-----|
| In-place mutate of an existing cycle’s dates/id | **Forbidden** (CY-7 preserved) |
| Backfill path | New cycle record only |
| Commercial gate | That new cycle must be a **separately authorized paid** cycle |
| Unpaid “ops catch-up” invent | **Forbidden** |

### CO-9. Ending the relationship — FROZEN

**Ending the relationship means no new cycle is purchased.**

| Rule | Law |
|------|-----|
| Explicit cancel-subscription ceremony | Not required for V1 pay-per-cycle |
| Stop future owes | Simply do not purchase/pay for another cycle |
| Prior paid cycles | Remain historical obligations / records as already opened; not silently erased |

### CO-10. Renderer — FROZEN

**Renderer remains a consumer only.**

| Rule | Law |
|------|-----|
| Mint `productionCycleId` | **Forbidden** |
| Infer cycle from calendar / Stripe / `"Current cycle"` | **Forbidden** |
| Produce without authoritative paid-cycle record | **Fail closed** |

### CO-11. Owner routine production role — FROZEN

**Owner routine = NONE.**

Owner does not choose N at render time, invent cycle ids, manage month folders as clerk work, or bypass pay-per-cycle gates for routine production. Exception paths (if any later) remain product-frozen — not routine.

---

## 3. Answers to prior PERMISSION-TRUTH questions (now frozen)

| Question | Owner freeze |
|----------|--------------|
| What creates Cycle 1? | Confirmed payment for that cycle |
| What creates Cycle N+1? | Explicit purchase + confirmed payment for the next cycle |
| Event type? | **Paid cycle purchase** (pay-per-cycle) — not auto-renewal, not wall-clock |
| Failed/missing payment block next? | **Yes** — no payment → no new obligation |
| Pause/cancel future cycles? | No purchase of next cycle = no future obligation (pause/cancel = non-purchase) |
| Cycle without payment cleared? | **No** for new obligation open |
| Open early / two future at once? | **No** speculative opens |
| Backfill authority? | Separately authorized **paid** cycle (new record) |
| Relationship ends? | No new cycle purchased |
| Authoritative “Studio owes this cycle”? | **Paid cycle purchase confirmation** for that cycle’s record |

---

## 4. Explicit non-goals (this package)

| Non-goal | Status |
|----------|--------|
| Implement cycle mint in payment/activation | **Out** — next package maps the seam |
| Recurring Stripe / subscription platform | **Out** |
| Subscription-management UI | **Out** |
| Remap `sm-001-monthly` off Canva | **Out** |
| Dispatch wiring | **Out** |
| Renderer changes | **Out** |
| `ma-001` / other SKUs | Parked / untouched |

---

## 5. Preserve locks

| Lock | Status |
|------|--------|
| Seven sealed design lanes + sealed `sm-001` | Untouched |
| `sm-001-monthly` Canva | Unchanged |
| Monthly renderer proof (consume-only) | Preserved |
| No commit / push / merge | Confirmed |

---

## 6. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-OBLIGATION-SEAM-1`**

Narrow reinspection only — **no build**:

> Given pay-per-cycle truth, where in the existing payment/activation spine should the authoritative cycle record be created?

Map CO-2 / CO-3 onto living seams (checkout confirm, payment truth, post-pay activation, job materialization) and return READY or GAP for that create-only attach point — without inventing a subscription platform.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**

Business rule is frozen. Next: map it onto the existing payment spine.
