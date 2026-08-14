# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-CYCLE-TARGET-IMPLEMENT-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-CYCLE-TARGET-IMPLEMENT-1  
**Mode:** Implement explicit target + per-cycle N lock — no remap · no observer wire · no renderer invoke · no commit · no push · no merge  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  

---

## Verdict

### SM-001-MONTHLY DISPATCH CYCLE TARGET IMPLEMENTED

The Machine can now know **which exact cycle is ready to dispatch** via an explicit named-cycle state transition and a durable per-cycle N lock. The renderer still does **not** run.

| Control point | Value |
|---------------|--------|
| Foundation | `72f1127ee8b7d29529603090d871f9a5acd1e912` |
| Docs tip | `715bac0afa8d480a594f246e08fa205e0365b079` |
| Branch | `operating/design-renderer-proof-1` (ahead 2) |
| This package | **Uncommitted** · no push · no merge |

---

## 1. Files changed

| Path | Role |
|------|------|
| `src/config/studio-sm-001-monthly-dispatch-cycle-target-v1.ts` | Package config |
| `src/lib/studio-monthly-production-cycle/types.ts` | Target + N fields on cycle record |
| `src/lib/studio-monthly-production-cycle/n-lock.ts` | Named-cycle N lock (reuse sm-001 select) |
| `src/lib/studio-monthly-production-cycle/machine-dispatch-target.ts` | Clearance + mirror + readiness |
| `src/lib/studio-monthly-production-cycle/create.ts` | `replaceSm001MonthlyProductionCycle` |
| `src/lib/studio-monthly-production-cycle/index.ts` | Exports |
| `src/lib/studio-monthly-production-cycle/dispatch-cycle-target.test.ts` | Proof suite (12) |
| `src/lib/studio-dispatch/types.ts` | Optional `JobDispatchRecord.productionCycleId` |
| `src/lib/studio-dispatch/ensure.ts` | Re-apply mirror after evaluate; equality includes cycle id |

---

## 2. Target record shape

On `Sm001MonthlyProductionCycleRecord`:

| Field | Meaning |
|-------|---------|
| `plannedPostCount` | Durable N ∈ {4,5,6} |
| `plannedPostCountSelection` | Auditable sm-001 selection |
| `plannedPostCountLockedAt` | Lock timestamp |
| `machineDispatchTarget` | Explicit Machine target flag |
| `machineDispatchTargetSetAt` | Clearance timestamp |

On monthly `JobDispatchRecord`:

| Field | Meaning |
|-------|---------|
| `productionCycleId?` | Mirror of the explicitly targeted cycle — never invented |

---

## 3. N-lock implementation

`lockSm001MonthlyPlannedPostCount(campaign, { productionCycleId, creative })`

- Requires named cycle + confirmed `paidCyclePurchaseId` + campaign/SKU match + period/focus  
- Builds signals with **this cycle’s** date window (`cycleStartDate – cycleEndDate`)  
- Reuses `collectSm001NSelectSignals` + `selectSm001PlannedPostCount`  
- Insufficient signals → fail closed (`insufficient_n_signals`)  
- Already locked to a different N → `n_already_locked`  
- After `machineDispatchTarget` → `n_immutable_after_target`  
- Does not ask the customer for a count; does not pad  

---

## 4. Target-set event

`clearSm001MonthlyCycleForMachineDispatch(campaign, productionCycleId)`

- Explicit state transition for the **named** id only  
- Requires locked N first  
- Sets `machineDispatchTarget: true`  
- Same-cycle retarget → idempotent (`alreadyTargeted: true`)  
- Another cycle already targeted → `dual_target` fail closed  
- Never selects by newest / last-paid / month / array order / `"Current cycle"`  

---

## 5. Dispatch mirror

- Clearance writes `productionCycleId` onto the monthly `JobDispatchRecord`  
- Missing monthly dispatch record → `dispatch_mirror_missing`  
- Mirror already pointing at a different cycle → `wrong_cycle_mirror`  
- `ensureDispatchExecution` re-applies `applySm001MonthlyDispatchTargetMirror` after evaluate so identity refresh cannot invent or silently drop the bind incorrectly without a target  

---

## 6. Validation rules

Clearance / readiness require all of:

1. Valid `productionCycleId`  
2. `campaignId` match  
3. `skuId = sm-001-monthly`  
4. Confirmed `paidCyclePurchaseId`  
5. Valid cycle period + focus  
6. Locked `plannedPostCount ∈ {4,5,6}` matching selection  
7. Explicit `machineDispatchTarget` (readiness)  
8. Dispatch mirror equals that cycle id  

`evaluateSm001MonthlyDispatchTargetReadiness` is the gate for a future hook.

---

## 7. Concurrency behavior

| Case | Result |
|------|--------|
| One targeted cycle | Allowed |
| Second concurrent target | `dual_target` fail closed |
| Same cycle retarget | Idempotent |
| Multiple historical cycles | Allowed as records; only one may be targeted |

---

## 8. Prior-cycle isolation

Proven: Cycle A N/focus/calendar/fingerprint stay intact when Cycle B is locked and targeted. Dispatch mirror binds B’s id only — not A’s.

---

## 9. Failure cases proven

| Case | Error |
|------|--------|
| Missing cycle id | `missing_cycle_id` |
| Unknown cycle | `cycle_not_found` |
| Wrong campaign | `wrong_campaign` |
| Wrong SKU | `wrong_sku` |
| Unconfirmed purchase | `purchase_not_confirmed` |
| Missing period/focus | `missing_period_focus` |
| Insufficient N signals | `insufficient_n_signals` |
| N mutate after lock | `n_already_locked` |
| N mutate after target | `n_immutable_after_target` |
| Dual targets | `dual_target` |
| Wrong-cycle mirror | `wrong_cycle_mirror` |
| Mirror mismatch readiness | `dispatch_mirror_mismatch` |

---

## 10. Renderer-not-invoked proof

- All N-lock / clearance results return `rendererInvoked: false`  
- Spy on `runSm001MonthlyRendererPipeline` → **0 calls** after lock + clear  
- Package does not wire observer or invoke monthly pipeline  

---

## 11. Non-monthly / seven-lane protection

- `sm-001-monthly.primaryTool` remains **Canva**  
- Sealed lanes + sealed `sm-001` remain `studio_design_renderer`  
- Flyer `JobDispatchRecord` has no `productionCycleId`  
- Existing `dispatch.test.ts` green; sm-001 remap-vs-Canva assertion green  

---

## 12. Owner / tools

| Lock | Status |
|------|--------|
| Owner routine | **NONE** — system clearance with named id |
| Canva | Monthly still Canva |
| Make | Unused |
| Remap / observer / renderer invoke | **Out of this package** |
| Subscriptions | Not created |
| Foundation commits | Untouched · no rewrite |

---

## 13. Git state

| Field | Value |
|-------|--------|
| HEAD | `715bac0…` (docs tip) |
| Foundation | `72f1127…` |
| Branch | `operating/design-renderer-proof-1` ahead 2 |
| This package | **No commit** (Owner gate) |

---

## 14. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-HOOK-1`**

Narrow monthly observer/renderer hook that consumes **only** the explicit targeted `productionCycleId` + locked N, then remap `sm-001-monthly` off Canva onto `studio_design_renderer`. First package authorized to leave Canva for monthly.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**

The Machine knows which cycle is ready. The renderer has not produced it yet.
