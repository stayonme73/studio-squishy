# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DELTA-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DELTA-1  
**Mode:** Inspection only — no implementation · no proof · no remap · no Canva change  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### SM-001-MONTHLY DELTA C

Provisional Selection-6 class **A** does **not** survive inspection against Owner’s bar:

> A only if cycle identity is already authoritative enough that we are adding a narrow wrapper around the sealed sm-001 engine rather than inventing a subscription system in disguise.

**Creative reduction to sealed `sm-001`:** **YES** — same posts / captions / order / calendar family; no new artifact family; still one bounded batch per cycle (not daily management).

**Cycle identity authoritative enough for a free/thin remap:** **NO.**

| Hole | Evidence |
|------|----------|
| No durable production cycle ID | `buildJobId(campaignId, skuId)` → `campaignId:skuId` — **no cycle component** |
| No cycle in sm-001 idempotency | Fingerprint tuple = dispatch/job/sku + spec/material/calendar inputs — **no cycle key** |
| “Cycle” stub only | Task `cycleLabel` hard-coded `"Current cycle"` (Slice 3a) — display string, not identity |
| Task IDs collide across months | `sm-001-monthly:{phase}` — cycle not in id |
| `MonthlyCycleWindow` | `{ label: string }` only — customer timing copy, not a period object |
| No subscription/billing-period production record | No `cycleId` / `billingPeriod` / `servicePeriod` type in dispatch, kitchen, or job-control production path |

A naïve remap of `sm-001-monthly` onto the sealed sm-001 hook **today** would allow:

- cross-month **`ALREADY_RENDERED`** when campaign facts/materials match  
- accidental overwrite / whole-set `vN+1` soup under the same job root  
- silent reuse of prior-month artifacts  
- wrong calendar dates if timing is campaign-lifetime rather than cycle-bounded  

That is exactly the version-soup failure mode Owner called out. Therefore class is **C** — material undefined **cycle-boundary product/engineering truth** — even though the renderer family is already sealed.

| Class | Why |
|-------|-----|
| **A** | **Rejected** — cycle identity is not authoritative; free remap fails Owner’s bar |
| **B** | Rejected for now — small-wrapper shape is plausible *after* cycle law is frozen; not earned yet |
| **C** | **Accepted** — cycle definition, authoritative source, per-cycle N, immutability, and cycle-scoped idempotency are undefined machine truth |
| **D** | Rejected — still create-from-campaign bounded batch; not edit/ingest |

**Not** inventing a full subscription platform in this finding — but also **not** pretending a Slice 3a `"Current cycle"` label is enough to seal a Machine lane.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `b974220a96a4f3f14fef00bb69e8980a61ee88b5` |
| Seal-record (sm-001) | `39761b8cdc8c2e0f2034258c0574af58ff81ecb1` |
| Scoreboard | **7/13 sealed** · provisional #8 = `sm-001-monthly` · unmapped · Canva |
| Provisional class (SEL-6) | DELTA A — thin remap + cycle identity (**superseded for class by this inspect**) |
| Sealed lanes protected | flyer · card · menu · service-sheet · promo · social-posts · **sm-001** |
| Parked | `ma-001` · remaining five design SKUs · Make |

---

## 2. Current monthly contract (catalog / kitchen)

| Field | `sm-001-monthly` | Sealed `sm-001` (contrast) |
|-------|------------------|----------------------------|
| Name | Monthly Social Media Content Support | Social Media Launch Set |
| Billing | `monthly` · $349/mo | one-time |
| Lane | `ongoing_monthly` | standard build |
| Fulfillment | `monthly_cycle` | `project` |
| Deliverables | One **monthly content focus**; up to six static posts; captions; suggested sequence; **simple monthly posting calendar** | Launch/campaign focus; 4–6 posts; captions; order; simple content calendar |
| Exclusions | Daily engagement · DMs · ads · reels · unlimited requests · extra posts · multi-format · performance guarantees | Same family exclusions + launch-set framing |
| Revision | `REVISION_MONTHLY` — one consolidated revision round across the **monthly batch** | one-time revision rule |
| Cycle window | Label only: first batch 6–8 BD after direction/materials; later batches follow monthly production calendar | Final delivery window (project) |
| Client responsibilities | Approved monthly offer/materials; timely approval; account access **only if** publishing add-on | Offer details; materials; approval |
| Execution | `managed_execution_when_selected` · `requiresClientAccess: true` | same pattern on launch set |
| Kitchen override | “Same production method as sm-001 on a monthly cycle.” · Canva formats · ≤6 QA | `studio_design_renderer` sealed |
| Closeout | METHOD COVERED · Owner routine **NONE** · inherits static social Canva method | Machine sealed · Owner NONE |

**Customer-facing promise check:** Monthly does **not** invent a new artifact family beyond the existing monthly contract (batch + captions + sequence + calendar + focus). It is still **one bounded batch per cycle**, not ongoing daily management (exclusions prove that).

**Creative reuse check:** Yes — sealed sm-001 spine (N∈{4,5,6}, exact N/N, captions, order, advisory calendar + date governance, square-only, set QA, whole-set versioning) is the correct engine family.

---

## 3. Cycle identity source — CRITICAL

### What exists today

| Source | What it actually is | Authoritative cycle ID? |
|--------|---------------------|-------------------------|
| `billingType: "monthly"` | Plan line billing flag | No — not a period |
| `fulfillmentMode: "monthly_cycle"` | Catalog delivery enum | No — mode label only |
| `monthlyCycleWindow.label` | Customer-facing timing sentence | No |
| Task `cycleLabel: "Current cycle"` | Slice 3a **stub** for “one current-cycle set” | **No** — not unique, not dated, not sourced |
| Task id `sm-001-monthly:{phase}` | Stable per SKU phase | **No cycle scope** — month 2 collides with month 1 |
| Dispatch `jobId` / `dd:{jobId}` | `campaignId:skuId` | **No cycle scope** |
| sm-001 hook receipt / fingerprint | Job + SKU + spec/material/calendar inputs | **No cycle scope** |
| Subscription / billing-period object | **Not found** in production/dispatch path | Missing |

### Answers to Owner’s critical questions (inspection freeze — proposed law, not implemented)

| Question | Finding / proposed freeze |
|----------|---------------------------|
| What defines a cycle? | **One bounded monthly production batch** for the purchased monthly entitlement — the unit that receives one content focus + one ≤6 set + one calendar. **Not** daily management. |
| Month vs billing vs campaign vs service period? | **Must be an explicit service production period** bound to the monthly entitlement. Wall-clock month alone is insufficient (late/backfill). Campaign lifetime alone is insufficient (multi-month campaign). Billing period is a candidate **source**, but only if it yields a durable `productionCycleId` on the job. **Not frozen as “calendar month” by default.** |
| Does cycle ID come from authoritative job/subscription truth? | **Required: YES.** **Today: NO such authoritative field exists.** Fail-closed until present. |
| Each cycle gets its own `plannedPostCount`? | **YES** — N is chosen **per cycle** before that cycle’s execution (inherit sm-001 law). |
| May N vary between cycles? | **YES** — each cycle independently selects N∈{4,5,6}; prior cycle’s N does not bind the next. |
| Can one cycle mutate another? | **NO** — fail-closed. Prior-cycle sets are immutable. |
| Is `ALREADY_RENDERED` scoped to the same cycle only? | **YES — required.** Same fingerprint in a **different** cycle must **not** return prior-cycle `ALREADY_RENDERED`. |
| Does a new month automatically mean new production identity? | **Only when a new authoritative `productionCycleId` is opened.** A wall-clock rollover alone must not silently mint identity without job truth. |
| How prior-cycle artifacts remain immutable | Separate cycle-scoped identity / artifact root / receipt; never rewrite prior cycle’s `current-identity` or vN tree. |
| Calendar dates inside current cycle/campaign timing? | Suggested dates must sit inside **this cycle’s** timing bounds ∩ any authoritative campaign constraints. Cycle bounds are required inputs — today undefined. |
| Missed/late cycles backfilled? | **Product hole.** Catalog does not define backfill. Proposed: allow only as an **explicit new cycle** with its own id and timing bounds — never mutate a closed cycle. |
| Same campaign facts → new cycle without duplicate churn? | **YES, legitimate** when `productionCycleId` differs — new batch identity even if offer text overlaps. Fingerprint **must include cycle id** so this is not churn and not false `ALREADY_RENDERED`. |
| Still one bounded batch? | **YES** — catalog exclusions forbid daily management; delivery remains one monthly batch. |

**Inspection conclusion:** The wrapper shape is right, but the **authoritative cycle key is missing**. That missing key is the C driver.

---

## 4. Cycle-scoped N truth

| Rule | Status |
|------|--------|
| Inherit sm-001: N∈{4,5,6}; Studio chooses before execution; exact N/N; no QA shrink | **Reusable** once cycle scope exists |
| N is per-cycle job identity, not lifetime SKU identity | **Required** · not implemented |
| No padding across cycles to “catch up” to six | **Required** (sm-001 no-pad law per cycle) |

---

## 5. Cycle-scoped idempotency / versioning boundary

| Concern | Sealed sm-001 behavior | Monthly gap |
|---------|------------------------|-------------|
| Same truth → `ALREADY_RENDERED` | Job/SKU scoped | Must become **job + SKU + productionCycleId** scoped |
| Material change → immutable `vN+1` | Within one set root | Must stay **inside one cycle**; never cross-cycle mutate |
| Artifact root | Campaign/SKU proof roots | Needs **cycle-partitioned** root or equivalent |
| Cross-month identical facts | Would falsely `ALREADY_RENDERED` today | Must produce a **new cycle set**, not reuse |

---

## 6. Calendar / date boundary + stale-truth prevention

| Concern | Finding |
|---------|---------|
| Calendar artifact | Monthly promises “simple **monthly posting** calendar” — same schedule-manifest family as sealed sm-001; naming differs, not a new family |
| Date governance | sm-001 law reusable **only if** cycle timing bounds are authoritative inputs |
| Stale campaign truth | Monthly requires **this cycle’s** approved focus/offer/materials; carrying last month’s facts without a new cycle accept = stale-truth risk |
| Publishing | Still out of SKU (add-on only) — unchanged |

---

## 7. Dispatch reuse + actual new engineering

### Reusable without re-proving (after cycle law exists)

- Sealed sm-001 reason/render/QA/captions/order/calendar/date governance  
- Square-only · unsupported plates fail closed  
- Whole-set versioning pattern **within a cycle**  
- Observer auto-invoke pattern  
- Owner routine NONE target  

### Actually new (this is the C-sized hole)

1. **Authoritative `productionCycleId` (or equivalent)** on monthly job/dispatch truth  
2. Cycle-scoped job/dispatch/idempotency/artifact identity  
3. Intake mapping for **monthly content focus** + cycle timing bounds → sm-001 structure  
4. SKU-gated hook for `sm-001-monthly` (separate from `sm-001`; monthly stays Canva until authorized)  
5. Rules for opening/closing cycles · late/backfill · prior-cycle immutability  
6. Fail-closed when cycle id / cycle timing absent  

**Not required for this lane:** full subscription billing engine, publishing/scheduling, engagement management, Make, new post graphic family.

---

## 8. Owner-independence / Canva / Make

| Item | Status |
|------|--------|
| Closeout Owner routine | **NONE** (intent) |
| Path to independence | Cycle-identity contract freeze → thin remap/proof/hook — **not** free remap now |
| Canva for `sm-001-monthly` | **Unchanged** this package |
| Canva for sealed seven lanes | Untouched |
| Make | **NOT REQUIRED NOW** — cycle identity is not a Make problem |

---

## 9. Seven-lane protection / non-goals

| Preserve | Status |
|----------|--------|
| Seven sealed design lanes | Untouched |
| `sm-001` frozen / sealed | Untouched |
| `ma-001` parked | Confirmed |
| Remaining five design SKUs parked | Confirmed |
| Implementation / proof / remap | **None** |
| Commit / push / merge | **None** |

---

## 10. Delta class rationale (summary)

Creative side collapsed to sealed sm-001 → looks like A.  
Identity side has only `"Current cycle"` + `campaignId:skuId` → **not** a wrapper-ready boundary.  

Remapping now would invent cycle law inside the renderer/hook under pressure — same failure mode as proving `sm-001` before calendar/cardinality freeze (**historical DELTA C**).  

Hence: **SM-001-MONTHLY DELTA C**.

After an Owner-accepted cycle-identity contract freeze, expect reclass toward **A** (if the freeze is only a required authoritative cycle key + fail-closed wrapper) or **B** (if cycle open/close/backfill/timing rules prove thicker). Do not skip that freeze.

---

## 11. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-CONTRACT-TRUTH-1`**

Inspection / Owner-freeze only (no renderer proof, no remapping):

1. Freeze **what a cycle is** (explicit service production period vs billing vs wall-clock)  
2. Freeze **authoritative cycle ID source** on job/subscription truth — fail-closed if absent  
3. Freeze **per-cycle `plannedPostCount`**, cross-cycle immutability, and cycle-scoped `ALREADY_RENDERED`  
4. Freeze **cycle timing bounds** for calendar date governance + stale-truth / backfill rules  
5. Re-state earned class (**A** vs **B**) only after that freeze  
6. Only then recommend proof / intake / SKU-gated dispatch packages  

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
