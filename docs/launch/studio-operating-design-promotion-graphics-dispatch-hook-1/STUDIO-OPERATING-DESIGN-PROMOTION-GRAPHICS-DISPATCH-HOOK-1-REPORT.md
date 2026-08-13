# STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-DISPATCH-HOOK-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-DISPATCH-HOOK-1  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

**Owner decisions sealed into this package:**

- PROMOTION-GRAPHICS DELTA B — SMALL EXTENSION (accepted)
- PROMOTION-GRAPHICS RENDERER PROOF — **PASS** (visual **PASS WITH LIMITS**)
- Two-asset campaign-set proof — ACCEPTED
- Per-asset intake truth — READY (INTAKE-TRUTH-1)
- Landscape may be **recorded** in intake; execution is **not proven** → fail closed
- PROMOTION-GRAPHICS DISPATCH HOOK — **AUTHORIZED** (this package)
- Flyer / Card / Menu / Service-sheet — **PROTECTED**
- Canva = OFF fulfillment spine for this SKU
- Make — **NOT REQUIRED**

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Branch tip (pre-package) | `fce3c289dae50e5ff64ded8eb25a3cc4662c1961` |
| Proof | STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-PROOF-1 |
| Intake | STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-INTAKE-TRUTH-1 |
| Visual evidence | `docs/launch/.../promotion-graphics-proof-1/artifacts/.../renders/v3/` |

---

## 2. Scope delivered

Thin `dd:{jobId}` invoke for **`v2-rtu-promotion-graphics` only** so EXECUTION_IDENTITY_READY jobs auto-produce a coordinated two-asset campaign set via `studio_design_renderer` after `ensureDispatchExecution`.

Consumes authoritative intake only:

- `graphicA_authorizedPurpose` / `graphicA_agreedPlate`
- `graphicB_authorizedPurpose` / `graphicB_agreedPlate`

No purpose or plate inference. No Canva. No Make.

---

## 3. Plate execution lock

| Plate | Intake | Execution |
|-------|--------|-----------|
| Square 1024×1024 | recordable | **EXECUTABLE** |
| Portrait 1024×1536 | recordable | **EXECUTABLE** |
| Landscape 1536×1024 | recordable | **FAIL CLOSED** (`UNSUPPORTED_PLATE_EXECUTION`) |

No silent Square/Portrait substitution. No Owner repair loop for Landscape.

---

## 4. Files changed (uncommitted)

| Path | Role |
|------|------|
| `sku-overrides.ts` | Promo `primaryTool` → `studio_design_renderer` (this SKU only) |
| `map-promo-job-truth.ts` | Intake → PromoProjectTruth + executable-plate gate |
| `promo-hook-idempotency.ts` | Campaign-set fingerprint / lock / receipts |
| `promo-dispatch-hook.ts` | `invokePromoDispatchHook` |
| `promo-dispatch-hook.test.ts` | Hook gates, Landscape, idempotency, versioning, fail-closed |
| `promo-pipeline.ts` | `runPromoJobPipeline` + Asset A force-fail injector |
| `promo-intake-truth.ts` | `assertPromoAssetsExecutableForDispatch` |
| `design-renderer-observer.ts` | + promotion-graphics observe |
| `design-renderer-observer.test.ts` | Promo auto-invoke + ALREADY_RENDERED |
| `ensure.ts` | Comment: + promotion-graphics |
| `index.ts` (dispatch) | Exports |
| `promotion-graphics-proof.test.ts` | Expects remapped primaryTool |
| `service-sheet-dispatch-hook.test.ts` | Expects promo on renderer |
| `promo-fixtures.ts` | Intake/dispatch note refresh |
| This report | Governing record |

**Flyer / card / menu / service-sheet hooks:** observer allow-list extended only — no intentional sealed-lane behavior change.

---

## 5. Hook contract

`invokePromoDispatchHook({ repoRoot, campaign, dispatchRecord, materials, stagedLogoRelativePath? })`

Gates (fail-closed):

1. `skuId === v2-rtu-promotion-graphics`
2. `executionIdentityReady === true`
3. `primaryTool === studio_design_renderer`
4. Both graphic purposes present
5. Both agreed plates present
6. Both plates currently executable (Square + Portrait only)
7. Required campaign/material truth present
8. Success requires Asset A + Asset B render + individual QA + set QA

Idempotency: same fingerprint → `ALREADY_RENDERED` (no new set version).  
Authoritative truth change → immutable campaign-set `vN+1` (both members).

---

## 6. Executor truth

| SKU | primaryTool |
|-----|-------------|
| `v2-rtu-flyer` | `studio_design_renderer` (sealed) |
| `v2-rtu-business-card` | `studio_design_renderer` (sealed) |
| `v2-rtu-menu` | `studio_design_renderer` (sealed) |
| `v2-rtu-service-sheet` | `studio_design_renderer` (sealed) |
| `v2-rtu-promotion-graphics` | **`studio_design_renderer`** (this package) |
| Other design SKUs | unchanged (Canva baseline where previously set) |

---

## 7. Observer path

```
READY_FOR_DISPATCH
→ ensureDispatchExecution
→ promotion-graphics observer gate
→ invokePromoDispatchHook
→ per-asset purpose/plate + shared campaign truth
→ Asset A + Asset B PNG/PDF + set QA
→ durable campaign-set identity
```

Repeated observation is harmless (`ALREADY_RENDERED`).

---

## 8. Owner-independence

Routine Owner production: **NONE**  
Canva required: **false** (this SKU)  
Make required: **false**

Tagia does not select layouts after purchase, resize graphics, pair files, repair consistency, operate Canva, or manually route Landscape jobs.

---

## 9. Minimum proof coverage

- Square + Portrait ready set auto-renders
- Exact per-asset purposes / plates preserved
- Repeat observer / hook → `ALREADY_RENDERED` (no new set version)
- Truth change → immutable `vN+1`
- Asset A / Asset B / set QA / individual QA failures block set
- Missing purpose / plate fail closed
- Landscape fail closed as unproven
- No Canva / Make invocation
- Owner production = NONE
- Four sealed design lanes remain on `studio_design_renderer`

---

## 10. Verdict

**PROMOTION-GRAPHICS DISPATCH HOOK READY**

Scout PARKED.
