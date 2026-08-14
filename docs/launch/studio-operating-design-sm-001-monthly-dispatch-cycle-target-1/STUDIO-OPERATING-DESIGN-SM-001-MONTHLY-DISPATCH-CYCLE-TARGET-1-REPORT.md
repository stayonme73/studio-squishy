# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-CYCLE-TARGET-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-CYCLE-TARGET-1  
**Mode:** Inspection / freeze only — no remap · no observer wire · no commit · no push · no merge  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  

---

## Verdict

### SM-001-MONTHLY DISPATCH CYCLE TARGET READY

Dispatch may proceed to a **narrow monthly hook** only after consuming an **explicit** target:

> **`productionCycleId` that is deliberately cleared for Machine production**, with durable **`plannedPostCount ∈ {4,5,6}` locked on that same cycle**, bound to its paid purchase and period/focus truth.

No newest / last-paid / wall-clock / `"Current cycle"` / array-order selection.

| Class | Why |
|-------|-----|
| **GAP A–D** | Rejected — target home, set event, N lock, readiness, and isolation are freezable on existing campaign cycle + job dispatch identity |
| **READY** | Explicit target + per-cycle N lock frozen below for implement |

This package **does not implement**. It freezes the authority so the next hook cannot play detective.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Foundation | `72f1127ee8b7d29529603090d871f9a5acd1e912` |
| Docs note | `715bac0afa8d480a594f246e08fa205e0365b079` |
| Prior | RENDERER-DISPATCH-SEAM-1 → **GAP C** |
| Branch | `operating/design-renderer-proof-1` |
| This package | **No commit** · no push · no merge |
| `sm-001-monthly` | **Canva** |

---

## 2. Authoritative target location — FROZEN

### DT-1. Primary home (narrowest)

**On the existing `Sm001MonthlyProductionCycleRecord`** (campaign `sm001MonthlyProductionCycles[]`):

| Field (conceptual) | Role |
|--------------------|------|
| `productionCycleId` | Already identity |
| `plannedPostCount` + selection audit | Durable N lock (today optional → **required before target**) |
| `machineDispatchTarget` | Explicit boolean (or equivalent status) — **only** true when Studio clears **this** cycle for Machine invoke |

**Not** a parallel scheduler. **Not** “first unrendered in array.”

### DT-2. Dispatch mirror (execution bind)

When `JobDispatchRecord.skuId === "sm-001-monthly"` and status is execution-ready, the record **must** carry the same explicit:

`productionCycleId`

sourced **only** from a cycle with `machineDispatchTarget === true` for that campaign.

| Rejected homes | Why |
|----------------|-----|
| Routing handoff alone | Capability/family only — no cycle notion today |
| Activation create alone | Creates cycle obligation; does **not** mean “run Machine now” |
| Implicit “only open cycle” | Still a guess when 0 or 2+ exist |
| Newest / last paid / current month | **Forbidden** |

---

## 3. Target creation / set event — FROZEN

### DT-3. Set event

**Explicit Studio production clearance** for a **named** `productionCycleId`:

`clearSm001MonthlyCycleForMachineDispatch(productionCycleId)` (name illustrative)

| May set target | Must not set target |
|----------------|---------------------|
| After cycle exists with period/focus | On payment confirm alone |
| After N locked on **that** cycle | On activation create alone |
| With `productionCycleId` passed in | By scanning for newest / unrendered / last paid |

Owner routine: **NONE** — clearance is system Studio production, not Owner picking folders/ids by hand. Still **explicit per id**, not detective scan.

### DT-4. Unset / replace

| Rule | Law |
|------|-----|
| At most **one** `machineDispatchTarget=true` per `(campaignId, sm-001-monthly)` | **Frozen** |
| Setting target on B while A is still targeted and not terminal | **Fail closed** (no invented dual-run concurrency) |
| After Machine success / cycle-scoped ALREADY_RENDERED terminal for A | A target cleared; B may be targeted later via **its own** clearance |

---

## 4. `productionCycleId` + paid-purchase binding — FROZEN

Dispatch / clearance **must** validate the targeted cycle binds:

| Field | Required |
|-------|----------|
| `productionCycleId` | Exact target |
| `paidCyclePurchaseId` | Confirmed ledger row |
| `campaignId` | Matches dispatch campaign |
| `skuId` | `sm-001-monthly` |
| Cycle period + focus | Present and valid |

Mismatch (wrong campaign / SKU / purchase / missing period) → **reject** — do not invoke renderer.

---

## 5. Per-cycle N selection + lock — FROZEN

### DT-5. Where Studio chooses N

**Reuse** sealed `collectSm001NSelectSignals` + `selectSm001PlannedPostCount` (sm-001 production-selection logic).

| Input | Source |
|-------|--------|
| Logo / offer / CTA / copy signals | Campaign materials + cycle-scoped creative facts derived from **this cycle’s** focus/period (not prior cycle) |
| Date window | **This cycle’s** `cycleStartDate`–`cycleEndDate` (authoritative period) — not wall-clock “this month” |

| Forbidden | Law |
|-----------|-----|
| Customer asked for a count only to satisfy wiring | **No** |
| Pad content to raise N | **No** |
| QA / render success chooses or shrinks N | **No** |
| Insufficient signals | **Fail closed** before target clearance and before renderer |

### DT-6. When N locks

**After** authoritative cycle truth exists · **before** Machine clearance · **before** renderer invoke.

Persist on the **same** cycle record (`plannedPostCount` + selection audit with `selectedBeforeExecution: true`).  
Once locked for a targeted/produced cycle → **immutable** for that `productionCycleId` (CY-7: need new cycle to change N).

---

## 6. Dispatch-readiness requirements — FROZEN

Monthly renderer eligibility requires **all** of:

1. Confirmed paid-cycle authority for the cycle’s `paidCyclePurchaseId`  
2. Valid `productionCycleId` record  
3. Valid cycle period + focus  
4. Durable locked `plannedPostCount ∈ {4,5,6}` on **that** cycle  
5. Explicit `machineDispatchTarget` on **that** cycle  
6. `JobDispatchRecord.productionCycleId` equals that id (when dispatch identity is ready)

Missing any → **not ready** · fail closed · no observer invent.

---

## 7. Duplicate / concurrency — FROZEN

| Case | Law |
|------|-----|
| Same cycle targeted / observed repeatedly | Same cycle-scoped root + idempotency → `RENDERED` / `ALREADY_RENDERED` for **that** `productionCycleId` |
| Two cycles simultaneously `machineDispatchTarget` | **Not authorized** — fail closed |
| Multiple historical cycles on campaign | Allowed as records; **only one** may be targeted for Machine at a time |

---

## 8. Prior-cycle isolation — FROZEN

Target bind **must** prevent Cycle B from:

| Leak | Prevention |
|------|------------|
| Cycle A’s N | N read only from targeted cycle record |
| Cycle A’s focus | Focus from targeted cycle only |
| Cycle A’s artifact root | Root keyed by `productionCycleId` (proof pattern) |
| Cycle A’s calendar bounds | Timing from targeted cycle window |
| Cycle A’s ALREADY_RENDERED | Idempotency / receipt scoped to targeted id |

---

## 9. Renderer boundary — FROZEN

| Renderer may | Renderer must not |
|--------------|-------------------|
| Consume explicit targeted cycle + locked N | Select which cycle |
| Fail closed if target/N missing | Mint cycles / payment authority |
| | Choose current month / repair missing N |

---

## 10. Owner / tools / lanes

| Lock | Status |
|------|--------|
| Owner routine | **NONE** |
| Canva | Monthly remains Canva this package |
| Make | Unused / not required |
| Seven sealed lanes · sealed `sm-001` | Untouched |
| Foundation commits | Untouched · no rewrite |
| Remap / observer wire / proof edit | **Out** |

---

## 11. Git state

| Field | Value |
|-------|--------|
| Foundation | `72f1127…` |
| Docs note | `715bac0…` |
| Branch tip | Carry both forward; **no rewrite** |
| This package | Report only · **no commit** |

---

## 12. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-CYCLE-TARGET-IMPLEMENT-1`**

Implement only:

1. Durable N lock on cycle record (reuse sm-001 N-select; fail closed)  
2. Explicit `machineDispatchTarget` set/clear with single-target rule  
3. `JobDispatchRecord.productionCycleId` bind for monthly when targeted  

Still **no** Canva remap · **no** observer allowlist · **no** hook invoke — until target+N exist and tests prove isolation. Then a narrow monthly dispatch-hook package.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**

Dispatch no longer needs a detective — it needs this explicit target + locked N, then a thin wire.
