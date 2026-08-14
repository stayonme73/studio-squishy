# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-CONTRACT-TRUTH-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-CONTRACT-TRUTH-1  
**Mode:** Product-contract freeze only — no renderer work · no proof · no intake implementation · no remapping · no dispatch  
**Scout status:** PARKED  
**Final status:** OWNER ACCEPTED WITH ONE CLARIFICATION  
**Git:** No commit · No push · No merge  

---

## Verdict

### SM-001-MONTHLY CONTRACT TRUTH — ACCEPTED WITH CYCLE-IMMUTABILITY CLARIFICATION

| Gate | Status |
|------|--------|
| Prior class | **SM-001-MONTHLY DELTA C** (accepted) — creative engine ready; monthly identity not |
| **Cycle definition** | **ACCEPTED** — explicit service production period |
| **Authoritative `productionCycleId`** | **ACCEPTED** — required before production; part of fingerprint |
| **Cycle immutability clarification** | **ACCEPTED** — see CY-7 |
| **“Current cycle” label** | **REJECTED** as production authority |
| Per-cycle N / immutability / versioning / calendar bounds | **ACCEPTED** |
| Plate / publishing / Make | Unchanged / out of scope |
| Remap / dispatch / sealed `sm-001` / `ma-001` | **NOT touched** |
| Proof | **NOT authorized** |

**Owner lock included now:**

> The cycle identity must exist **before production starts** and must be part of the **production fingerprint**. A display label is not enough.

**Product problem this freezes:** the system already knows “this campaign has `sm-001-monthly`,” but must also know “this is the March cycle versus the April cycle” (or any equivalently distinct service periods) — otherwise duplicate reuse and version soup wear a fake mustache.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `b974220a96a4f3f14fef00bb69e8980a61ee88b5` |
| Prior package | `STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DELTA-1` → **DELTA C** |
| Scoreboard | **7/13 sealed** · provisional #8 = `sm-001-monthly` · Canva · unmapped |
| Authorities | `src/catalog/services.ts` (`sm-001-monthly`, `sm-001`) · `sku-overrides.ts` · `closeout/ledger.ts` · `campaign-tasks/generate.ts` (`cycleLabel: "Current cycle"` stub) · `job-control/lane-map.ts` (`campaignId:skuId`) · sealed sm-001 CONTRACT-TRUTH / AUTO-PRODUCTION |
| Inherited creative law | Sealed `sm-001`: N∈{4,5,6}; exact N/N; captions; order; advisory calendar + date governance; square-only executable plate |

---

## 2. Evidence (not freezes)

### 2.1 What the monthly catalog actually says

| Source | Language |
|--------|----------|
| Purpose | “Consistent client-ready social content around **one monthly business focus**.” |
| Deliverables | One **monthly content focus** · up to six posts · captions · suggested sequence · **simple monthly posting calendar** |
| Fulfillment | `monthly_cycle` |
| Billing | `monthly` |
| Lane | `ongoing_monthly` |
| Cycle window | Label only: first batch 6–8 BD after inputs; later batches follow the monthly production calendar |
| Revision | One consolidated revision round across the **monthly batch** |
| Exclusions | Daily engagement · DMs · ads · reels · unlimited / extra posts · multi-format · performance guarantees |
| Method twin | “Same production method as sm-001 on a monthly cycle.” |
| Client responsibilities | Approved **monthly** offer/materials · timely approval · account access only if publishing add-on |

**Absent from authority today:** durable cycle ID · cycle start/end schema · month-vs-billing-vs-service-period law · per-cycle N identity · cross-cycle immutability · backfill rules · cycle-scoped fingerprint.

### 2.2 What the Machine actually has today (insufficient)

| Mechanism | Reality |
|-----------|---------|
| `buildJobId` | `campaignId:skuId` — campaign+SKU only |
| Task `cycleLabel` | Hard-coded **`"Current cycle"`** (Slice 3a display stub) |
| Task ids | `sm-001-monthly:{phase}` — no cycle component |
| `MonthlyCycleWindow` | `{ label: string }` — customer timing copy |
| sm-001 idempotency | No cycle key |
| Subscription / billing-period production object | **Not present** on the design fulfillment path |

**Rejected as production authority:** any UI/display string equivalent to `"Current cycle"`.

---

## 3. CYCLE DEFINITION FREEZE — PROPOSED

### CY-1. What a monthly cycle is — FROZEN (proposed)

A **monthly cycle** for `sm-001-monthly` is:

> **One bounded service production period** that receives exactly one monthly content focus and exactly one Launch-Set-shaped content package (posts + captions + sequence + monthly posting calendar), within the purchased monthly entitlement.

| Is | Is not |
|----|--------|
| One production batch with its own identity | Daily engagement / ongoing community management |
| Distinct from other cycles on the same campaign+SKU | The campaign lifetime as a single identity |
| The unit of delivery, revision, QA, and versioning | A wall-clock month name alone |

### CY-2. Alignment basis — FROZEN (proposed)

| Option | Verdict |
|--------|---------|
| Calendar month alone (e.g. “March 2026”) | **Rejected as sole identity** — late/backfill and off-calendar periods break it |
| Billing period alone (implicit) | **Insufficient alone** — may *source* dates, but production must still mint an explicit cycle record |
| **Explicit service production period** | **ACCEPTED** — durable identity with start/end + `productionCycleId` |

**Law:** Cycle identity is an **explicit service production period**. It may be *aligned to* a billing period when authoritative billing/subscription truth provides period bounds, but the production authority is always the **cycle record**, not an inferred calendar-month string and not a display label.

### CY-3. Required cycle fields — FROZEN (proposed)

Every producible monthly cycle MUST carry:

| Field | Rule |
|-------|------|
| **`productionCycleId`** | Durable, unique per campaign + `sm-001-monthly` + period. Opaque stable id (not “Current cycle”, not “March” alone). |
| **`cycleStartDate`** | Inclusive start of the service production period (date, not clock time). |
| **`cycleEndDate`** | Inclusive end of the service production period (date, not clock time). |
| **`monthlyContentFocus`** | This cycle’s one approved monthly business/content focus (catalog deliverable). |
| Linkage | Bound to campaign id + SKU `sm-001-monthly` + entitlement/subscription reference when available |

`cycleEndDate` ≥ `cycleStartDate`. Missing either date → **fail closed** (no production).

### CY-4. Authoritative source — FROZEN (proposed)

| Source class | Role |
|--------------|------|
| **Authoritative job / subscription / entitlement truth** | **Required origin** of `productionCycleId` + start/end (or of the facts from which ops mints them before production) |
| Staff / Studio ops opening a cycle | May mint the cycle record **only** into that authoritative store — not into renderer local state |
| Catalog `monthlyCycleWindow.label` | Timing **guidance copy only** — not identity |
| Task `cycleLabel` | **Not authority** — must never gate production |
| Renderer / QA / fingerprint code | **Consumers** of cycle identity — never inventors of a substitute label |

**Fail closed:** If `productionCycleId` (and start/end) are absent from authoritative job truth at production start → **do not render**, do not return a fake success, do not fall back to `"Current cycle"`.

---

## 4. OWNER LOCK — IDENTITY BEFORE PRODUCTION + FINGERPRINT

### CY-5. Pre-production gate — FROZEN (Owner lock)

1. Cycle identity (`productionCycleId` + `cycleStartDate` + `cycleEndDate` + this-cycle focus truth) **MUST exist before production starts**.  
2. That identity **MUST be part of the production fingerprint** (idempotency / `ALREADY_RENDERED` / whole-set identity).  
3. A display label is **never** enough.

### CY-6. Fingerprint membership — ACCEPTED

For `sm-001-monthly`, the production fingerprint / idempotency tuple **MUST include at least**:

- `productionCycleId`  
- campaign id  
- sku id `sm-001-monthly`  
- sealed sm-001-equivalent content fingerprints (plannedPostCount, shared spec, materials, calendar inputs)  
- cycle timing bounds used for date governance (`cycleStartDate` / `cycleEndDate`, plus any campaign timing constraints respected)

**Consequence:** Identical creative facts in a **different** `productionCycleId` are a **new** production identity — not prior-cycle `ALREADY_RENDERED`, and not duplicate churn.

### CY-7. `productionCycleId` immutability once production begins — ACCEPTED (Owner clarification)

| Rule | Law |
|------|-----|
| After production begins for a cycle | **`productionCycleId` is immutable** |
| Wrong dates discovered / late / backfill / focus correction that changes period identity | **Do not mutate** the existing cycle record in place |
| Required action | Create a **distinct authoritative cycle record** (new `productionCycleId` + its own start/end + focus) |
| In-place rewrite of cycle metadata on an opened/producing/completed cycle | **Forbidden** · fail closed |

This clarification keeps March-vs-April (and late/backfill) separation honest: identity never “slides” underneath a fingerprint that already bound the old dates.

---

## 5. PER-CYCLE N FREEZE — ACCEPTED (inherits sealed sm-001)

### N-1. Each cycle gets its own `plannedPostCount` — FROZEN (proposed)

| Rule | Law |
|------|-----|
| Cardinality | Inherit sealed sm-001: **N ∈ {4, 5, 6}** |
| Scope | **`plannedPostCount` is per-cycle**, not lifetime SKU identity |
| Who chooses | Studio production, **before that cycle’s execution** |
| Customer | Does not pick N from a menu |
| QA | Must not rewrite N after the fact |

### N-2. N may differ month to month — FROZEN (proposed)

**YES.** Cycle A may lock N=4; Cycle B may lock N=6. Prior cycle’s N does not bind the next.

### N-3. Exact N/N per cycle — FROZEN (proposed)

Customer-ready for a cycle requires exact **N/N** for that cycle’s locked `plannedPostCount`. No phantoms, no pad, no auto-shrink, no shipping partial as success.

---

## 6. IMMUTABILITY / VERSIONING / IDEMPOTENCY FREEZE — PROPOSED

### I-1. Prior-cycle immutability — FROZEN (proposed)

| Rule | Law |
|------|-----|
| Completed / identified prior-cycle sets | **Immutable** |
| Mutation of cycle A from cycle B work | **Forbidden** · fail closed |
| Shared campaign+SKU | Never an excuse to rewrite another cycle’s artifacts or identity |

### I-2. Cycle-scoped `ALREADY_RENDERED` — FROZEN (proposed)

| Same fingerprint + same `productionCycleId` | → `ALREADY_RENDERED` (no new vN) |
| Same creative facts + **different** `productionCycleId` | → **new cycle production** (not prior `ALREADY_RENDERED`) |
| Missing `productionCycleId` | → **fail closed** (no render) |

### I-3. Cycle-scoped whole-set versioning — FROZEN (proposed)

| Rule | Law |
|------|-----|
| Version tree | Whole-set `vN` lives **inside one cycle** |
| Material change within a cycle | Immutable `vN+1` for **that cycle only**; retain prior versions |
| Cross-cycle | Never allocate “next version” of another cycle’s set |
| What versions together | N posts + N captions + order + monthly posting calendar + cycle identity |

### I-4. No mutation across cycles — FROZEN (proposed)

Production for cycle B must not open, rewrite, re-fingerprint-as-same, or “repair” cycle A’s completed set. Corrections to a closed cycle follow revision / change-order product rules for **that cycle’s** identity — never silent cross-cycle edit.

---

## 7. CALENDAR / DATE / STALE-TRUTH FREEZE — PROPOSED

### K-1. Calendar family — FROZEN (proposed)

Monthly delivers a **simple monthly posting calendar** = same **advisory schedule-manifest** family as sealed sm-001 (ordered, 1:1 post binding, no publish times). Not a new artifact family. Not a visual calendar graphic requirement.

### K-2. Active cycle window constraint — FROZEN (proposed)

Suggested dates for a cycle **MUST** lie inside:

1. **This cycle’s** `[cycleStartDate, cycleEndDate]`, **and**  
2. Any authoritative **campaign timing constraints** (start/end/event/blackout/etc.) when present  

Violation → **fail closed** / revise — do not ship an illegal pretty calendar.

If no campaign timing constraints exist beyond the cycle window, Studio may use a bounded advisory policy **inside the cycle window only**. Those dates remain recommendations, not customer facts.

### K-3. Stale campaign truth — FROZEN (proposed)

| Rule | Law |
|------|-----|
| Each cycle | Requires **this cycle’s** approved monthly content focus + offer/materials truth |
| Silent carry-forward of prior-cycle focus/facts/materials into a new cycle render | **Forbidden** |
| Reuse of identical facts across cycles | Allowed **only** when a **new** `productionCycleId` is explicitly opened and fingerprint includes it — still a new batch identity, not silent reuse of prior artifacts |
| Prior-cycle artifacts as substitutes for current-cycle delivery | **Forbidden** |

### K-4. Publishing / scheduling — unchanged exclusion

Base `sm-001-monthly` still does **not** log into accounts, schedule, or publish. Execution add-ons remain separate.

---

## 8. LATE / BACKFILL CYCLES — FROZEN (proposed)

| Question | Law |
|----------|-----|
| Are late/backfill cycles allowed? | **YES, only as explicit new cycles** |
| How identified? | Their own `productionCycleId` + their own `cycleStartDate` / `cycleEndDate` (which may lie in the past relative to “today”) |
| May they mutate the “missed” cycle’s completed set? | **NO** |
| Wall-clock rollover alone | Does **not** auto-open a cycle and does **not** auto-mint identity |
| Unscoped “catch-up” batch without cycle id | **Forbidden** |

---

## 9. Coupled locks (in scope)

| Lock | Freeze |
|------|--------|
| One focus per cycle | Catalog “one monthly content focus” — **per cycle** |
| Bounded batch | Still one batch per cycle; daily management excluded |
| Creative engine | Reuse sealed sm-001 family; no new post/caption/calendar artifact family |
| Captions / order | Inherit sm-001: one caption per post; exact order for N |
| `"Current cycle"` | **Never** production authority |
| Sealed `sm-001` | **Unchanged** |
| Canva on monthly | **Unchanged** until later authorized remap |
| Make | **NOT REQUIRED** |
| `ma-001` / other SKUs | Parked |

---

## 10. Explicitly not decided by renderer ease

| Temptation | Rejected |
|------------|----------|
| “Use campaignId:skuId; months will differ in content” | Rejected — identical facts would false-`ALREADY_RENDERED` |
| “Label tasks Current cycle and ship” | Rejected — Owner lock; display ≠ identity |
| “Cycle = calendar month name” | Rejected as sole identity — breaks late/backfill |
| “Invent a full subscription billing platform in the renderer” | Rejected — cycle record is a production identity boundary, not a billing product rewrite |
| “Skip cycle id; fingerprint materials only” | Rejected — Owner lock requires cycle id in fingerprint |
| “Remap monthly now; freeze later” | Rejected — DELTA C stands until this truth is accepted |

---

## 11. What this freeze does *not* authorize

| Item | Status |
|------|--------|
| Implementation / schema code | **Not authorized** |
| Proof / intake wiring | **Not authorized** |
| Dispatch hook / observer for monthly | **Not authorized** |
| Canva remap for `sm-001-monthly` | **Not authorized** |
| Edits to sealed `sm-001` | **Forbidden** |
| `ma-001` start | **Forbidden** |
| Commit / push / merge | **None** |

---

## 12. Owner acceptance record

| Item | Verdict |
|------|---------|
| Cycle = explicit service production period | **ACCEPTED** |
| `productionCycleId` before production + in fingerprint | **ACCEPTED** |
| CY-7 immutability / new-cycle-not-mutate | **ACCEPTED** (Owner clarification) |
| Per-cycle N · vary between cycles · prior-cycle immutability | **ACCEPTED** |
| Cycle-scoped `ALREADY_RENDERED` / whole-set versioning | **ACCEPTED** |
| Calendar inside cycle window · stale-truth ban · late/backfill = new cycles | **ACCEPTED** |
| `"Current cycle"` display-only | **ACCEPTED** |
| Remap / proof | **NOT authorized** by this acceptance alone |
| Next | `STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DELTA-2` |

---

## 13. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DELTA-2`** — technical re-inspect against this **accepted** product truth: given frozen cycle identity + sealed sm-001 engine, what genuinely new engineering remains? Return exactly one class **A / B / C / D**. No proof · no remap.

---

## OWNER ACCEPTED WITH ONE CLARIFICATION

**Scout proceeded to DELTA-2.**
