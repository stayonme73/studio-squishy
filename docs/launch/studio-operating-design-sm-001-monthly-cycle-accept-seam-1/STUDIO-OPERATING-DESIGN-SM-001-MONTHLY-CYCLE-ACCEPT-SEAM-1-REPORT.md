# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-CYCLE-ACCEPT-SEAM-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-CYCLE-ACCEPT-SEAM-1  
**Mode:** Inspection / product-lifecycle freeze only — no implementation · no billing build · no remap · no dispatch  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### MONTHLY CYCLE ACCEPT SEAM GAP — C

**Critical product question:**

> What grants The Studio permission to open the next cycle?  
> What makes April legally and operationally become a new Studio obligation?

**Answer today: UNDEFINED.**

Catalog language sells a monthly batch service. The operating spine does **not** yet define an authoritative commercial or lifecycle event that creates April as a distinct obligation. Until that permission is frozen and real, **April must not exist in production.**

This package therefore **does not** invent a cycle-open trigger to unblock the renderer. The renderer stays frozen as a consumer (PROOF PASS). The accept seam remains a **C-sized gap**: missing recurring-service **permission + create-only open** truth — larger than a thin UUID mint, smaller than a full Stripe subscription platform if Owner later freezes a narrow entitlement event.

| Class | Why |
|-------|-----|
| **A** | Rejected — no permitted open event is authoritative |
| **B** | Rejected — “open on first activation only” would fake month-2 readiness |
| **C** | **Accepted** — permission to open cycle N+1 (and even cycle #1 as a dated obligation) is commercially/operationally undefined |
| **D** | Rejected — not edit/ingest |

**Boundary lock honored:** Stripe subscription periods are **not** production-cycle authority. Checkout is `mode: "payment"`; monthly cents are **not** in `amountDueTodayCents`. Billing and production-cycle identity remain separate unless later product truth explicitly links them.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `b974220a96a4f3f14fef00bb69e8980a61ee88b5` |
| Prior | CYCLE-SOURCE-1 → **SOURCE GAP C** |
| Renderer | Monthly CYCLE PROOF **PASS** (consume-only) |
| `sm-001-monthly.primaryTool` | **Canva** |
| Dispatch / remap | **Not authorized** |

---

## 2. Critical product question — evidence

| Evidence | What it shows |
|----------|----------------|
| Catalog `sm-001-monthly` | Monthly purpose + one batch per “monthly” framing + cycle window **label** |
| `billingType: "monthly"` on plan lines | Commercial *label* on the SKU |
| `computePlanPricingTotals` | `amountDueTodayCents = oneTimeSubtotalCents` only — **monthly not charged at checkout** |
| Stripe Checkout | `mode: "payment"` one-shot — **not** subscription renewals |
| Post-pay activation | One-shot job materialization from paid plan — **no** “open next cycle” |
| Task `cycleLabel` | `"Current cycle"` display — **forbidden** as authority |
| Help FAQ “monthly subscription” | “No. Purchase only the services you need.” — package confusion, not cycle-open law |
| Board `renewalDate` | Spark/Momentum membership UI — **not** Kitchen cycle permission |

**Conclusion:** There is **no** living answer to “what makes April a new Studio obligation?” Do not invent renewal, calendar rollover, or Stripe period as that answer in this package.

---

## 3. Permitted cycle-open events — FREEZE (honest)

### AS-1. Currently authorized open events — FROZEN

**None.**

No event is Owner-accepted and machine-authoritative to create a production cycle record for `sm-001-monthly`.

### AS-2. Explicitly unauthorized open events — FROZEN

| Event | Status |
|-------|--------|
| Wall-clock month rollover | **Forbidden** |
| Infer from `"Current cycle"` | **Forbidden** |
| Infer from Stripe subscription period (not wired; not product-linked) | **Forbidden** as authority |
| Renderer / QA / dispatch mint | **Forbidden** |
| Owner manually inventing IDs at render time as routine production | **Forbidden** |
| Silent copy of prior cycle with new dates (in-place mutate) | **Forbidden** (CY-7) |

### AS-3. Candidate events — NOT frozen as live law (Owner must decide later)

These are **inspection candidates only** — not invented triggers:

| Candidate | Why it might later be lawful | Why it is not law today |
|-----------|------------------------------|-------------------------|
| First paid entitlement confirmation that includes `sm-001-monthly` | Could open **cycle #1** if payment truth actually collects monthly obligation | Monthly not in amount-due-today; payment mode is one-shot |
| Confirmed renewal / next-period payment for that entitlement | Natural answer for **cycle N+1** | No renewal payment spine |
| Explicit late/backfill authorization record (exception path) | Matches CONTRACT backfill = new cycle | No such authorization object |
| Explicit customer “approve this month’s focus / open this period” accept | Could bind focus + dates | No such accept surface |

**Until Owner freezes one or more of the above (or another explicit event), the accept seam is not READY.**

---

## 4. Who/system creates the record — FREEZE (conditional)

| Role | Law |
|------|-----|
| **Creator** | A **system create-only accept** function — not the design renderer |
| **When** | Only on an **Owner-frozen permitted open event** (none today) |
| **Owner routine** | **NONE** for rendering; Owner must not be the monthly folder/ID clerk |
| **Owner exception** | Possible later for **backfill authorization** only if product freezes that exception path — still create-new-cycle, never mutate |

---

## 5. Required fields at creation — FREEZE (record shape)

When (and only when) a permitted open event exists, the create-only record **MUST** include at creation:

| Field | Required at create? |
|-------|---------------------|
| `productionCycleId` | **Yes** — durable, unique |
| `cycleStartDate` | **Yes** |
| `cycleEndDate` | **Yes** |
| Cycle focus/truth (`monthlyContentFocus` or durable pointer) | **Yes** — this-cycle focus; no silent prior carry |
| `skuId` (`sm-001-monthly`) | **Yes** |
| `campaignId` (customer/campaign identity) | **Yes** |
| Create metadata (`createdAt`, creating event id/type) | **Yes** |
| Optional entitlement/payment reference | Allowed as **linkage**, not as substitute identity |
| `plannedPostCount` | **No at create** — see AS-6 |

### AS-6. When `plannedPostCount` is attached — FROZEN

**Studio production locks N ∈ {4,5,6} before that cycle’s execution** (inherit sealed sm-001 / CONTRACT).  
Creation may omit N. Rendering without locked per-cycle N → fail closed.

---

## 6. Duplicate / overlap / pre-create — FREEZE (proposed policy)

These policies are **ready to adopt with the seam**; they do **not** authorize opens today.

| Rule | Freeze |
|------|--------|
| Uniqueness | One record per `(campaignId, skuId, productionCycleId)` |
| Duplicate open of same id | **Fail closed** |
| Overlapping date ranges for same campaign+sku | **Fail closed** unless Owner later freezes an explicit overlap exception (default: **no overlap**) |
| Pre-creating future cycles | **Not authorized by default** — opens happen from permitted events, not speculative calendars |
| Late/backfill | **Only** as a **new** cycle record under an explicit backfill authorization event (when frozen) — never rewrite a prior cycle |

---

## 7. Cancellation / failed payment — FREEZE (honest limit)

| Topic | Finding |
|-------|---------|
| Failed payment / cancel mid-entitlement | **No** monthly recurring payment spine to bind |
| Refund language (package Momentum) | “Before monthly production starts” — package-level, not per-`productionCycleId` |
| Safe interim rule | **Do not open** a cycle without a frozen permission event; if a cycle was opened and never produced, it may remain `open`/`unused` without rendering — **no** silent production |

Do **not** invent cancel→close semantics beyond: no permission event → no open → no April.

---

## 8. Immutability + created-but-never-produced — FREEZE

| Rule | Law |
|------|-----|
| After production begins for a cycle | `productionCycleId` **immutable**; metadata changes → **new** cycle (CY-7) |
| Created, never reaches production | Record may exist unused; must **not** be mutated into a different period; may be superseded only by explicit new cycle under a permitted event |
| Renderer sees missing/invalid cycle | **Fail closed** (already proven) |

---

## 9. Owner role

| Action | Allowed? |
|--------|----------|
| Routine choose N / captions / Canva / month folders / fix collisions at render | **No** — Owner NONE |
| Invent cycle ids during render | **No** |
| Authorize exceptional backfill open (future, if frozen) | Possible **exception** path only — not routine |
| Decide commercial permission events for this accept seam | **Yes — required Owner product decision** (this package’s blocker) |

---

## 10. Preserve locks (this package)

| Lock | Status |
|------|--------|
| Monthly renderer proof | Frozen consumer · untouched |
| `sm-001-monthly` Canva | Unchanged |
| No dispatch / no remap | Confirmed |
| No subscription platform / recurring Stripe build | Confirmed |
| Seven sealed lanes / sealed `sm-001` | Untouched |
| `ma-001` | Parked |
| Commit / push / merge | **None** |

---

## 11. Dispatch readiness impact

| Gate | Status |
|------|--------|
| Creative wrapper | PASS |
| Cycle record shape | Definable |
| **Permission event for open** | **GAP C** ← blocks READY |
| Remap / dispatch | Remain closed |

---

## 12. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-CYCLE-PERMISSION-TRUTH-1`**

Owner-facing product freeze only (still no Stripe subscription build, no remap, no dispatch):

Answer and freeze **only**:

1. What commercial/operational fact makes cycle #1 a Studio obligation?  
2. What fact makes cycle N+1 (e.g. April after March) a Studio obligation?  
3. Is late/backfill an Owner-exception authorization, a customer accept, or disallowed for V1?  
4. Confirm billing period remains **non-authority** unless explicitly linked  

If permission truth cannot be frozen yet, **park monthly Machine remap** and keep Canva — renderer stays ready, obligation fog stays closed.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
