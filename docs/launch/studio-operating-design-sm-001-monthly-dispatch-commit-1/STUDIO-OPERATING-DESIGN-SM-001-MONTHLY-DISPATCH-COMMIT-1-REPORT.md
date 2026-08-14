# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-COMMIT-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-COMMIT-1  
**Mode:** Joint commit only — no push · no merge · no seal · no next SKU  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  

---

## Verdict

Joint operating control point created.

| Field | Value |
|-------|--------|
| **Commit SHA** | `2d0ab8c9ab8dec2bea5f972124221c10e00d6898` |
| **Short** | `2d0ab8c` |
| **Branch** | `operating/design-renderer-proof-1` |
| **Ahead of origin** | 3 (foundation `72f1127` · tip note `715bac0` · **this joint** `2d0ab8c`) |
| **Push** | **No** |
| **Merge** | **No** |

### Commit message

```
feat(monthly): wire explicit cycle target and sm-001-monthly Machine dispatch

Lock per-cycle N and machineDispatchTarget before render, mirror productionCycleId onto monthly dispatch, remap sm-001-monthly to studio_design_renderer, and observe/auto-invoke the cycle-keyed wrapper without cycle guessing.
```

---

## Files included (30)

### Governing reports
- `docs/launch/.../sm-001-monthly-dispatch-cycle-target-1/...REPORT.md`
- `docs/launch/.../sm-001-monthly-dispatch-cycle-target-implement-1/...REPORT.md`
- `docs/launch/.../sm-001-monthly-dispatch-hook-1/...REPORT.md`

### Target + N lock
- `src/config/studio-sm-001-monthly-dispatch-cycle-target-v1.ts`
- `src/lib/studio-monthly-production-cycle/{types,create,index,n-lock,machine-dispatch-target,dispatch-cycle-target.test}.ts`

### Monthly wrapper (required consumer for hook)
- `src/lib/studio-design-renderer/sm-001-monthly-{types,contracts,cycle,fingerprint,fixtures,pipeline,proof.test}.ts`
- `src/lib/studio-design-renderer/index.ts` (exports)

### Dispatch hook + observer + remap
- `src/lib/studio-dispatch/{types,ensure,design-renderer-observer,index}.ts`
- `src/lib/studio-dispatch/map-sm-001-monthly-job-truth.ts`
- `src/lib/studio-dispatch/sm-001-monthly-dispatch-hook.ts`
- `src/lib/studio-dispatch/sm-001-monthly-dispatch-hook.test.ts`
- `src/lib/studio-dispatch/sm-001-dispatch-hook.test.ts` (Canva→renderer expectation)
- `src/lib/studio-kitchen-production/sku-overrides.ts`
- `src/lib/studio-kitchen-production/closeout/ledger.ts`
- `src/lib/studio-design-renderer/sm-001-contracts.ts`
- `src/lib/studio-design-renderer/sm-001-proof.test.ts`

---

## Files excluded

| Excluded | Reason |
|----------|--------|
| Seal report work | Out of scope |
| Sealed-lane `current-identity.json` churn | Unrelated |
| Sealed-lane render artifact trees | Not accepted evidence for this commit |
| `docs/.../sm-001-monthly-proof-1/artifacts/` | Test artifact tree |
| Prior seam / freeze docs not in this joint | Optional history; not required for Machine path |
| `ma-001` / next-SKU | Parked |
| `/data` | Excluded |
| Secrets / env | None staged |
| Unrelated tool-coordination / Canva account docs | Out of scope |

---

## Tests / result (final before commit)

| Suite | Result |
|-------|--------|
| `sm-001-monthly-dispatch-hook.test.ts` | **7/7 pass** |
| `studio-monthly-production-cycle/` (incl. target + paid-authority) | **27/27 pass** (combined with hook in pre-commit run) |
| Remap assertions (`sm-001-monthly` → renderer; sealed lanes green) | **pass** |

Covers: targeted auto-invoke · A/B isolation · ALREADY_RENDERED · vN+1 · N=4/5/6 · exact N/N · calendar bound · no-target / wrong-mirror / dual-target / unpaid / plate fail-closed · only new remap is monthly · foundation path unchanged in tests.

---

## Staging / worktree state

| Check | Status |
|-------|--------|
| Staged scope | Joint dispatch only (30 files) |
| After commit | Joint scope clean on HEAD |
| Remaining dirty | Unrelated identity/artifact/docs noise — **not** part of this commit |
| Secrets in staged diff | **None** |
| `/data` in staged | **None** |

---

## Protections

| Lock | Status |
|------|--------|
| Monthly foundation `72f1127` + tip `715bac0` | **Untouched** (ancestors; not rewritten) |
| Sealed `sm-001` Machine path | Unchanged (only expectation text that monthly also remaps) |
| Seven sealed lanes | Remap assertions green |
| Paid-cycle model | Unchanged |
| One paid purchase → one cycle | Preserved |
| Explicit target required · no guessing | Preserved |
| N locked before render · exact N/N · calendar in window | Preserved |
| Cycle-local ALREADY_RENDERED · vN+1 · separate roots · no cross-cycle | Preserved |
| Canva | **Off** `sm-001-monthly` fulfillment spine |
| Make | **NOT REQUIRED** |
| Owner routine | **NONE** |
| Push / merge / seal | **Not performed** |

---

## Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-AUTO-PRODUCTION-1`** — seal + Owner-authorized push to make monthly social design **lane #8 of 13**.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**

Control point: `2d0ab8c` on `operating/design-renderer-proof-1`.
