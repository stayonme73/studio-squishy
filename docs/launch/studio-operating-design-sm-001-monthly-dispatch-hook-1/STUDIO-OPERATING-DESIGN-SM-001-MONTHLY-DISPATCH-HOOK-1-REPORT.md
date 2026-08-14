# STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-HOOK-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-HOOK-1  
**Mode:** Remap + observer/hook wire — no commit · no push · no merge  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  

---

## Verdict

### SM-001-MONTHLY DISPATCH HOOK READY

`sm-001-monthly` is remapped to `studio_design_renderer`. The observer invokes the monthly hook only when an **explicit** targeted `productionCycleId` + locked N + paid authority + dispatch mirror are present. The proven cycle-keyed wrapper consumes that target — it does not select, mint, or repair.

| Control | Value |
|---------|--------|
| Foundation | `72f1127ee8b7d29529603090d871f9a5acd1e912` |
| Docs tip | `715bac0afa8d480a594f246e08fa205e0365b079` |
| Branch | `operating/design-renderer-proof-1` |
| This package | **Uncommitted** (with TARGET-IMPLEMENT-1) |

---

## 1. Files changed

| Path | Role |
|------|------|
| `src/lib/studio-kitchen-production/sku-overrides.ts` | Remap `sm-001-monthly` → `studio_design_renderer` |
| `src/lib/studio-dispatch/map-sm-001-monthly-job-truth.ts` | Map targeted cycle + locked N → monthly truth |
| `src/lib/studio-dispatch/sm-001-monthly-dispatch-hook.ts` | Hook invoke + N/N + calendar gates |
| `src/lib/studio-dispatch/sm-001-monthly-dispatch-hook.test.ts` | Proof suite (7) |
| `src/lib/studio-dispatch/design-renderer-observer.ts` | Observe + invoke monthly lane |
| `src/lib/studio-dispatch/index.ts` | Exports |
| `src/lib/studio-design-renderer/sm-001-monthly-contracts.ts` | Remap/dispatch authorized |
| `src/lib/studio-design-renderer/sm-001-contracts.ts` | Note monthly remapped separately |
| `src/lib/studio-kitchen-production/closeout/ledger.ts` | Monthly readiness language |
| Prior Canva assertions | Updated to renderer (sm-001 / monthly / target tests) |

Also carries uncommitted TARGET-IMPLEMENT-1 (N lock + `machineDispatchTarget` + mirror).

---

## 2. Remap

| SKU | primaryTool |
|-----|-------------|
| `sm-001-monthly` | **`studio_design_renderer`** (this package) |
| `sm-001` | unchanged (`studio_design_renderer`) |
| Sealed flyer/card/menu/sheet/promo/social | unchanged |
| `ma-001` + remaining | parked / unchanged |

Canva is **not** on the monthly fulfillment spine.

---

## 3. Observer / hook trigger

`shouldObserveDesignRenderer` includes `sm-001-monthly` when:

- execution identity ready  
- `primaryTool === studio_design_renderer`  

`invokeSm001MonthlyDispatchHook` additionally requires readiness:

- confirmed paid-cycle purchase  
- valid named `productionCycleId`  
- `machineDispatchTarget === true` (exactly one)  
- dispatch mirror matches that cycle  
- period/focus present  
- locked `plannedPostCount ∈ {4,5,6}`  

No newest / last-paid / calendar / array-order selection.

---

## 4. Explicit cycle consumption

Mapper builds `Sm001MonthlyProjectTruth` from the **mirrored** cycle only:

- cycle id / period / focus from the targeted record  
- N + selection from the cycle lock (not re-selected at render)  
- creative from campaign materials/intake, focus-bound to this cycle  
- artifact root: `data/campaign-design-artifacts/{campaign}/cycles/{productionCycleId}`  

Wrapper: `runSm001MonthlyRendererPipeline` (proven).

---

## 5. Cycle-scoped identity / idempotency / versioning

| Case | Behavior |
|------|----------|
| Same targeted cycle + same truth | `ALREADY_RENDERED` |
| Material change, same cycle | immutable cycle-local `vN+1` |
| New `productionCycleId` | separate root/lineage |

---

## 6. N/N + calendar

- Exact locked N posts, captions, order, calendar entries — fail closed on partial  
- Calendar dates must lie inside explicit cycle period  
- Impossible window / bad plate → fail closed  

---

## 7. Cross-cycle isolation

Proven: Cycle B render does not overwrite Cycle A root, N, focus, version, or ALREADY_RENDERED. Re-target A → still cycle-scoped ALREADY_RENDERED at A’s root.

---

## 8. Failure cases proven

| Case | Result |
|------|--------|
| No explicit target / missing mirror | fail closed |
| Wrong mirror | fail closed |
| Dual target | fail closed |
| Unconfirmed purchase | fail closed |
| Unsupported plate | fail closed |

---

## 9. Owner / tools / lanes

| Lock | Status |
|------|--------|
| Owner routine | **NONE** |
| Canva | **Not required** for monthly fulfillment |
| Make | **NOT REQUIRED** |
| Pay-per-cycle | Preserved (no subscription / auto-renewal) |
| Renderer mint / N select | Forbidden (still) |
| Platform publish/schedule | Out of scope |
| Seven sealed lanes + sealed `sm-001` | Green |
| `ma-001` | Parked |

---

## 10. Tests / result

| Suite | Result |
|-------|--------|
| `sm-001-monthly-dispatch-hook.test.ts` | **7/7 pass** |
| monthly production-cycle + target + sm-001 hook + dispatch + sm-001/monthly proof | **52/52 pass** (combined regression) |

---

## 11. Git state

| Field | Value |
|-------|--------|
| HEAD | `715bac0…` (docs tip) over foundation `72f1127…` |
| Branch | `operating/design-renderer-proof-1` ahead 2 |
| This package + TARGET-IMPLEMENT-1 | **Uncommitted** · no push · no merge |

---

## 12. Exactly one recommended next step

**Joint commit (Owner-authorized):** commit TARGET-IMPLEMENT-1 + MONTHLY-DISPATCH-HOOK-1 together on this branch — then seal / Owner review. Do not start another long uncommitted train.

Suggested commit focus: *wire sm-001-monthly Machine path — explicit cycle target, locked N, renderer remap + observer hook.*

---

## READY FOR OWNER REVIEW

**Scout PARKED.**

`sm-001-monthly` is off Canva and on the explicit-cycle Machine path.
