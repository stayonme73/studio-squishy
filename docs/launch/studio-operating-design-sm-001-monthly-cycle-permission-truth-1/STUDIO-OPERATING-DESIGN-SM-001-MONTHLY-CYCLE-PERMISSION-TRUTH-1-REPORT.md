# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-CYCLE-PERMISSION-TRUTH-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-CYCLE-PERMISSION-TRUTH-1  
**Mode:** Inspection / commercial-obligation freeze only — no implementation · no billing build · no remap · no dispatch · no fake renewal  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### MONTHLY CYCLE PERMISSION TRUTH GAP — C

**Hinge question:**

> Why does The Studio owe this customer another production cycle?

**Answer today: UNDEFINED.**

`sm-001-monthly` exists as a catalog SKU with monthly *language*. It does **not** yet have frozen commercial obligation events that turn “monthly service is on the plan” into “The Studio now owes Cycle 1 / Cycle N+1.” Until Owner freezes those events, **monthly Machine production remains blocked** — Canva stays primary; renderer stays consumer-only; no cycle mint.

This package **does not invent** payment, renewal, customer confirmation, or Studio acceptance as the trigger. Stripe is **not** elevated to recurring-cycle authority by implication.

| Class | Why |
|-------|-----|
| **A** | Rejected — no authoritative obligation event set exists to declare READY |
| **B** | Rejected — inventing “first post-pay job = Cycle 1 only” would fake permission truth |
| **C** | **Accepted** — commercial obligation rule for Cycle 1 and Cycle N+1 is missing product law |
| **D** | Rejected — not an edit/ingest problem |

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `b974220a96a4f3f14fef00bb69e8980a61ee88b5` |
| Prior | ACCEPT-SEAM-1 → **GAP C** |
| Renderer | Monthly CYCLE PROOF **PASS** (consume-only · no mint) |
| `sm-001-monthly.primaryTool` | **Canva** |
| Dispatch / remap / recurring billing / subscription UI | **Not authorized** |

---

## 2. Evidence base (what exists vs what does not)

| Source | What it proves | Obligation authority? |
|--------|----------------|----------------------|
| Catalog `sm-001-monthly` | Monthly purpose, ≤6 posts, cycle window **label** | **No** — sellable SKU, not dated owe-event |
| `billingType: "monthly"` | Line is labeled monthly | **No** |
| `computePlanPricingTotals` | `amountDueTodayCents = oneTimeSubtotalCents` only | Monthly **not charged** at checkout |
| Stripe Checkout | `mode: "payment"` one-shot | **Not** subscription lifecycle |
| Post-pay activation | One-shot jobs from paid plan SKUs | Opens **jobs**, not production cycles |
| Task `cycleLabel = "Current cycle"` | Display stub | **Forbidden** as authority |
| Help FAQ “monthly subscription” | “No. Purchase only the services you need.” | Anti-subscription messaging — not cycle law |
| Momentum refund copy | “before monthly production starts” | Package refund timing — not Cycle N+1 permission |
| Board `renewalDate` | Membership UI mock | **Not** Kitchen cycle permission |
| Pause language in policies | Waiting-on-Client / per-**job** pause | **Not** pause-future-monthly-cycles |
| Renewal / entitlement / backfill open modules | **Not found** as production-cycle obligation sources | Missing |

**Boundary lock:** Do not design around Stripe just because Stripe exists. Current checkout cannot become recurring-cycle authority by implication.

---

## 3. Required answers — inspection results

### Q1. What creates Cycle 1 obligation?

**UNDEFINED.**

No frozen event makes the first dated production period a Studio owe. Post-pay job materialization for `sm-001-monthly` (when that SKU somehow reaches payment truth) creates a **job**, not an authoritative `productionCycleId` obligation record.

### Q2. What creates Cycle N+1 obligation?

**UNDEFINED.**

No renewal, next-period payment, accept, or ops open event exists that makes April a new owe after March.

### Q3. Is that event payment, renewal acceptance, customer confirmation, Studio acceptance, or another explicit lifecycle event?

**NOT DECIDED.**

Candidates remain **candidates only** (from ACCEPT-SEAM-1) — none are live law:

| Candidate | Live today? |
|-----------|-------------|
| Payment confirmation that includes monthly entitlement | Checkout does not collect monthly as amount-due-today |
| Renewal / next-period payment acceptance | No spine |
| Customer confirmation (“open this month”) | No surface |
| Studio / Owner acceptance | No authorized open path |
| Wall-clock rollover | **Forbidden** |
| Stripe subscription period | **Forbidden** as implied authority |

### Q4. Does a failed or missing payment block the next cycle?

**UNDEFINED as cycle law.**

There is no recurring payment gate tied to production-cycle open. Interim safe posture (not invented READY): **do not open** a cycle without a frozen permission event — which already blocks next cycles.

### Q5. Can a customer pause or cancel future cycles?

**UNDEFINED for monthly-cycle relationship.**

Existing “pause” truth is **per-job** Waiting-on-Client / materials — not “pause future monthly obligations.” No customer cancel-future-cycles control for `sm-001-monthly`.

### Q6. Can a cycle exist without payment having cleared?

**UNDEFINED.**

No product freeze binds “payment cleared” ↔ “cycle may exist.” Proof fixtures supply cycles without live payment — proof only, not production law.

### Q7. Can a cycle be opened early?

**Not authorized.**

ACCEPT-SEAM proposed default: no speculative pre-create. No Owner freeze grants early open. **Default = no.**

### Q8. Can two future cycles be open at once?

**Not authorized.**

No product freeze allows concurrent future open cycles. Overlap default from ACCEPT-SEAM: fail closed. **Default = no** until Owner says otherwise.

### Q9. What authorizes a backfill cycle?

**UNDEFINED.**

CONTRACT / CY-7 require **new** cycle records for late/backfill (never mutate). No authorization object or Owner-exception path is frozen as live law.

### Q10. What happens when the monthly relationship ends?

**UNDEFINED.**

No end-of-relationship event closes future cycle opens, freezes last owed cycle, or separates purchased history from future obligation.

### Q11. Which source becomes authoritative for “Studio owes this cycle”?

**NONE today.**

| Source | Status |
|--------|--------|
| Catalog SKU presence | Not owe |
| Approved plan monthly line | Entitlement label, not dated cycle |
| Post-pay job id (`campaignId:skuId`) | Job, not cycle |
| `"Current cycle"` | Forbidden |
| Stripe period | Forbidden as implied authority |
| Authoritative cycle obligation record + permitted create event | **Missing** ← required authority shape |

---

## 4. What this package *does* freeze (negative + interim)

These are **inspection freezes** — they stop bad inventing; they do **not** unlock production.

| ID | Freeze |
|----|--------|
| PT-1 | Cycle 1 and Cycle N+1 obligation events are **undefined** until Owner product freeze |
| PT-2 | Stripe / one-shot checkout **must not** be implied as recurring-cycle authority |
| PT-3 | Wall-clock, `"Current cycle"`, renderer mint, and fake renewal triggers are **forbidden** |
| PT-4 | Early open and concurrent future opens are **not authorized** by default |
| PT-5 | Until permission truth is READY, **monthly Machine production stays blocked** (Canva; no remap; no dispatch) |
| PT-6 | Renderer remains **consumer-only**; no cycle mint in Kitchen |

**Not frozen as live obligation law:** payment↔cycle binding, pause/cancel of future cycles, backfill authorizer, relationship-end semantics.

---

## 5. Owner role

| Role | Status |
|------|--------|
| Routine choose N / captions / month folders / invent cycle ids | **NONE** (unchanged) |
| Freeze commercial obligation events for Cycle 1 and N+1 | **Required Owner product decision** — this package’s blocker |
| Exception backfill authorizer | Possible later only if Owner freezes it — not invented here |

---

## 6. Preserve locks (this package)

| Lock | Status |
|------|--------|
| Renderer consumer-only / no mint | Confirmed |
| No dispatch / no remap | Confirmed |
| No recurring billing build / no subscription-management UI | Confirmed |
| No fake renewal trigger | Confirmed |
| Seven sealed lanes + sealed `sm-001` | Untouched |
| `sm-001-monthly` Canva | Unchanged |
| `ma-001` parked | Confirmed |
| Commit / push / merge | **None** |

---

## 7. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-COMMERCIAL-OBLIGATION-OWNER-DECISION-1`**

**Owner decision package** (not Scout inventing; not Stripe subscription build; not remap):

Owner must answer and freeze, in writing, **only**:

1. **Cycle 1 owe event** — exact lifecycle fact  
2. **Cycle N+1 owe event** — exact lifecycle fact  
3. Payment relationship — does cleared payment gate open? failed/missing block?  
4. Pause / cancel future cycles — allowed or not; who acts  
5. Cycle without payment — allowed or not  
6. Early open / concurrent future opens — confirm **no** or define exception  
7. Backfill authorizer — Owner exception / customer / disallowed for V1  
8. Relationship end — what stops future owes  

**Out of scope for that package:** recurring Stripe implementation, subscription UI, dispatch, remap, renderer changes.

If Owner cannot freeze yet → **park** monthly Machine path; keep Canva; leave obligation fog closed.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**

Until The Studio can truthfully answer “why do we owe this month?”, monthly production should remain blocked.
