# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-CYCLE-SOURCE-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-CYCLE-SOURCE-1  
**Mode:** Inspection only — no implementation · no remap · no dispatch · no billing build · no renderer change  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### MONTHLY CYCLE SOURCE GAP

**Gap class: C**

The monthly **renderer** is cycle-ready (PROOF PASS · DELTA A). The **live create-only source** for authoritative cycle records is **not**.

Studio today knows “this campaign purchased `sm-001-monthly`,” and task UI can show a display stub `"Current cycle"`. It does **not** know March-vs-April as a durable production identity, and nothing in the live spine mints `productionCycleId` + start/end + focus before production.

This is **not** a missing paint step. It is a **missing recurring-service lifecycle seam**: who opens a cycle, on what event, into what store, with what immutability and duplicate rules — especially for month 2+ and late/backfill.

| Class | Why |
|-------|-----|
| **A** | Rejected — no authoritative source is ready to consume |
| **B** | Rejected — first-cycle mint on activation alone would still leave renewal/month-2 trigger undefined |
| **C** | **Accepted** — material gap in create-only cycle identity across the operating spine |
| **D** | Rejected — not an edit/ingest problem |

**Stripe billing period ≠ production cycle** unless product truth makes it so — and current checkout is `mode: "payment"`, not a wired subscription lifecycle that could authoritatively drive cycles.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `b974220a96a4f3f14fef00bb69e8980a61ee88b5` |
| Monthly CONTRACT-TRUTH | Accepted (+ CY-7) |
| DELTA A | Accepted |
| CYCLE PROOF | **PASS** (renderer consumes; does not mint) |
| `sm-001-monthly.primaryTool` | **Canva** (unchanged) |
| Dispatch | Not authorized |
| Required cycle fields | `productionCycleId` · `cycleStartDate` · `cycleEndDate` · cycle focus · per-cycle `plannedPostCount` prerequisite |

---

## 2. Source candidates inspected

| Candidate | What exists today | Authoritative for production cycle? |
|-----------|-------------------|-------------------------------------|
| **Task `cycleLabel`** | Hard-coded `"Current cycle"` on monthly billing lines (`campaign-tasks/generate.ts`) | **No** — display stub; CONTRACT forbids it as authority |
| **Job id / PurchasedJobRecord** | `buildJobId` = `campaignId:skuId` — one job per campaign+SKU for life | **No** — no cycle component; month 2 collides with month 1 |
| **Post-pay activation** | Durable activation + `jobIds[]` from paid plan lines; Owner action false; idempotent | **Partial candidate for cycle #1 only** — creates jobs once; no cycle record; no month-2 event |
| **Payment truth / Stripe Checkout** | Confirmed payment; sessions use **`mode: "payment"`** with one-shot `price_data` | **No** — not subscription period authority; no `current_period_start/end` production binding |
| **Approved Studio Plan line** | `billingType: "monthly"` · price · deliverables snapshot | **No** — SKU entitlement, not a dated production period |
| **Catalog `monthlyCycleWindow`** | Customer timing **label** string only | **No** |
| **Campaign Record** | Campaign + plan + payment + activation + routing/dispatch shells | **No** `productionCycleId` / cycle start/end / focus fields |
| **Board membership `renewalDate`** | Package Spark/Momentum display renewal copy | **No** — account packaging UI, not Kitchen cycle identity |
| **Materials / intake** | Per-campaign materials; Route Map intake | **No** cycle record; may later supply **focus/facts** once a cycle exists |
| **Dispatch / design renderer** | Monthly wrapper **consumes** cycle; sealed `sm-001` unchanged | **Forbidden** as mint source (PROOF + CONTRACT) |
| **Subscription / renewal service module** | **Not found** as a production cycle authority | Missing |
| **Recurring-service period store** | **Not found** | Missing |

---

## 3. Selected authoritative source

**None.**

No living seam is authoritative enough to supply:

`productionCycleId` + `cycleStartDate` + `cycleEndDate` + cycle-specific focus + (prerequisite) per-cycle N lock  

before monthly Machine production.

Closest *future* composition (not ready):

1. **Create-only cycle accept store** (new or additive on Campaign/Job)  
2. **Trigger events** still undefined: first paid activation · subsequent renewal/ops “open next cycle” · explicit late/backfill open  
3. **Renderer** remains consumer only  

Do **not** select Stripe period, wall-clock month, or `"Current cycle"` as the source.

---

## 4. Required answers (freeze-oriented findings)

| Question | Finding |
|----------|---------|
| Who/system creates the cycle record today? | **Nobody.** Proof fixtures invent ids only inside proof; live path has no creator. |
| When is it created? | **Undefined** for live. |
| What event permits creation? | **Undefined.** Payment confirm activates jobs once; no “open production cycle” event. Renewal/subscription invoice events are not wired as production authority. |
| Duplicate cycle creation prevented? | **N/A** — no create path. Job/task ids would currently **collide** across months if production were forced without a cycle key. |
| Late/backfill creation? | **Undefined** live. CONTRACT requires new cycle records; nothing implements that open. |
| How IDs stay immutable? | CONTRACT/CY-7 + proof enforce immutability **after** production begins — but only once a record exists. No live mint to protect yet. |
| Is `plannedPostCount` stored at creation or before execution? | **Before execution** (inherit sealed sm-001 / CONTRACT). Not present on any cycle create store today. Creation may omit N; Studio production must lock N before render. |
| Campaign timing bind at creation or later? | **Later / at production map** is acceptable under CONTRACT (intersect cycle window ∩ campaign timing). Cycle start/end themselves must exist at create. |
| Owner intervention required? | Routine Owner render action must stay **NONE**. Opening a cycle must not become Tagia’s manual folder/ID chore — but **some** non-Owner system/ops create-only path is still required. Today that path is missing. |
| New schema/store necessary? | **Yes** — at least a durable cycle record (fields above) keyed by campaign + sku + `productionCycleId`. Not a full subscription product. |
| Small seam vs larger recurring gap? | **Larger recurring-service gap** than a one-line UUID mint: month-2+ trigger, backfill open, duplicate prevention, and binding to entitlement are undefined. First-cycle-only mint on activation would be an incomplete fake READY. |

---

## 5. Creation trigger / identity generation / duplicate protection

| Concern | Live status |
|---------|-------------|
| Creation trigger | **GAP** — no `openProductionCycle` (or equivalent) event |
| Identity generation | **GAP** — no authoritative id mint outside proof fixtures |
| Duplicate protection | **GAP** — would need uniqueness on `(campaignId, skuId, productionCycleId)` and refuse second open for the same period without explicit backfill id |
| Immutable-cycle handling | Law frozen; **enforcement store missing** on live path |
| Backfill handling | Law frozen (new cycle only); **open path missing** |

---

## 6. N binding / timing-truth binding

| Concern | Live status |
|---------|-------------|
| Per-cycle N | Locked by Studio **before execution** (sm-001 law) — not found on any cycle create record today |
| Cycle window | Must be on the cycle record at create |
| Campaign timing | May bind at production map (intersect); empty intersection fail-closed — proven in wrapper, not sourced live |

---

## 7. Owner-independence

| Item | Status |
|------|--------|
| Owner routine production | Must remain **NONE** |
| Owner inventing cycle ids / month folders at render time | **Forbidden** |
| Missing create-only seam today | Forces either (a) no Machine monthly path, or (b) illegal renderer/Owner mint — both rejected |
| Path forward | System create-only accept (activation / renewal / explicit open) with Owner out of the render loop |

---

## 8. New-schema requirement

**Required (minimal):** durable **Production Cycle Record** (name flexible) with at least:

- `productionCycleId`  
- `campaignId`  
- `skuId` (`sm-001-monthly`)  
- `cycleStartDate` / `cycleEndDate`  
- `monthlyContentFocus` (or pointer to this-cycle focus truth)  
- `createdAt` / `createdBy` (system)  
- `status` (open / producing / closed) — enough to enforce CY-7  
- optional entitlement/payment reference — **not** Stripe-period-as-identity unless later product freeze says so  

**Not required for READY:** full subscription management UI, recurring billing engine rewrite, Stripe Customer Portal, invoice reconciliation product.

---

## 9. Dispatch readiness impact

| Gate | Status |
|------|--------|
| Renderer cycle wrapper | **PASS** (prior package) |
| Authoritative cycle source | **GAP** ← blocks live dispatch honesty |
| Canva remap | Still closed (correct) |
| Dispatch authorize | **Not ready** — would fail closed on missing cycle or tempt illegal mint |

**Rule:** Do not authorize monthly dispatch/remap until SOURCE is READY (or an Owner-accepted create-only seam is implemented and proven).

---

## 10. Seven-lane protection

Inspection only — **no** sealed-lane edits · **no** `sm-001` edits · **no** `ma-001` start.

---

## 11. Tests / inspection result

| Activity | Result |
|----------|--------|
| Codebase scan: subscription / renewal / cycle / activation / job / payment / tasks | Completed |
| Authoritative live cycle mint found | **No** |
| Stripe Checkout subscription mode for monthly SKUs | **Not used** (`mode: "payment"`) |
| Job identity cycle-scoped | **No** (`campaignId:skuId` only) |
| Task cycle authority | **Display stub only** |

No new automated tests (inspection package).

---

## 12. Git state

| Field | Value |
|-------|--------|
| HEAD control | `b974220a96a4f3f14fef00bb69e8980a61ee88b5` |
| Commit | **None** |
| Push | **None** |
| Merge | **None** |
| Renderer / dispatch / remap | Untouched by this package |

---

## 13. Gap class rationale (C)

CONTRACT + PROOF answered **what** a cycle is and **how** the renderer consumes it.  
SOURCE inspection asked **where it comes from live**.

Answer: **nowhere authoritative.**

Treating post-pay activation’s one-shot `jobIds` or Stripe `payment` checkout as “good enough” would fake READY and recreate version soup at month 2. That is a **C-sized recurring lifecycle hole**, not a thin A remap leftover.

---

## 14. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-CYCLE-ACCEPT-SEAM-1`**

Inspection / Owner-freeze only (still no billing platform, no remap, no dispatch):

1. Freeze the **create-only accept seam** — store shape, uniqueness, CY-7 status transitions  
2. Freeze **permitted create events** for cycle #1, cycle N+1, and late/backfill (explicit opens — not wall-clock inference)  
3. Freeze what is **out of scope** (no Stripe-period-as-identity unless separately accepted)  
4. State whether first implementation is a **thin accept API + record** feeding the proven wrapper, vs a wider recurring-ops package  
5. Only then authorize implementation of that seam — renderer stays frozen consumer  

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
