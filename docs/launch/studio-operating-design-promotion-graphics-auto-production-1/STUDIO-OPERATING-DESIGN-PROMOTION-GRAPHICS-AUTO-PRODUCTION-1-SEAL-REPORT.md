# STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-AUTO-PRODUCTION-1 SEAL REPORT

**Package:** STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-AUTO-PRODUCTION-1  
**Scout status:** PARKED  
**Merge:** NOT PERFORMED  

---

## Verdict

### SEALED

**Final operating verdict:** **V2-RTU-PROMOTION-GRAPHICS OWNER-INDEPENDENT AUTO-PRODUCTION READY**

Scope: **`v2-rtu-promotion-graphics` only** — remaining design SKUs untouched.

## Seal identity

| Field | Value |
|-------|--------|
| Package commit SHA | `62a88390c27afbb01e84f3ea8ee3f216cdc1fab0` |
| Seal tip | `90536a76d4a6481435b310c392832b5960c95782` |
| Commit message (package) | `feat(operating): seal v2-rtu-promotion-graphics owner-independent auto-production` |
| Pushed branch | `operating/design-renderer-proof-1` |
| Upstream base | `fce3c289dae50e5ff64ded8eb25a3cc4662c1961` (Service-sheet auto-production seal tip) |

## Accepted stack sealed

1. STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-DELTA-1 — **DELTA B — SMALL EXTENSION**
2. STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-PROOF-1 — technical **PASS**; Owner/Manager visual **PASS WITH LIMITS**
3. STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-INTAKE-TRUTH-1 — per-asset purpose/plate **READY**
4. STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-DISPATCH-HOOK-1 — **READY**

## Operating lane

```
READY_FOR_DISPATCH
→ ensureDispatchExecution
→ promotion-graphics observer
→ promotion-graphics dispatch hook
→ authoritative per-asset purpose/plate + shared campaign truth
→ dual HTML/CSS renderer (Square + Portrait executable)
→ Asset A + Asset B PNG/PDF
→ individual QA + set QA
→ durable campaign-set identity (whole-set vN)
```

## Plate lock (preserved)

| Plate | Intake | Execution |
|-------|--------|-----------|
| Square 1024×1024 | recordable | **EXECUTABLE** |
| Portrait 1024×1536 | recordable | **EXECUTABLE** |
| Landscape 1536×1024 | recordable | **FAIL CLOSED** (`UNSUPPORTED_PLATE_EXECUTION`) |

No silent substitution. No Owner Landscape repair loop.

## Intake-truth lock (preserved)

Authoritative only:

- `graphicA_authorizedPurpose` / `graphicA_agreedPlate`
- `graphicB_authorizedPurpose` / `graphicB_agreedPlate`

Legacy job-level `intendedUse` / `sizeNotes` do **not** substitute on this SKU.

## Final tests / result

```
promotion-graphics-proof.test.ts
promo-intake-truth.test.ts
promo-dispatch-hook.test.ts
design-renderer-observer.test.ts (flyer + card + menu + service-sheet + promo)
service-sheet / menu / business-card / flyer dispatch + proof suites
hook-idempotency.test.ts
dispatch.test.ts
routing-handoff.test.ts
activate.test.ts
payment-truth.test.ts
```

**133/133 PASS** (final pre-seal suite)

| Check | Result |
|-------|--------|
| Intake-truth | READY — four required per-graphic fields; no inference |
| Square + Portrait execution | READY — coordinated two-asset set auto-renders |
| Landscape fail-closed | READY — `UNSUPPORTED_PLATE_EXECUTION`; no substitution |
| Observer | READY — ready promo auto-invokes after durable dispatch identity; repeat → `ALREADY_RENDERED` |
| Set-level idempotency | READY — same dispatch + fingerprints → reuse exact successful campaign-set identity |
| Whole-set versioning | READY — material truth change → immutable campaign-set `vN+1` (both members) |
| Failure behavior | Fail-closed — wrong SKU / not ready / wrong tool / missing purpose/plate / Landscape / materials / conflict / A/B render / individual QA / set QA / fixture leakage / partial state |
| Individual QA binding | Asset A + Asset B QA required; failure blocks set |
| Set-level QA binding | Set consistency QA required; failure blocks set |
| Artifact identity/hash | Per-asset path + hash + plate + purpose + fingerprints; whole-set version |
| Owner-independence | Routine Owner production = **NONE** |
| Canva (this SKU) | **OFF** spine |
| Make | **NOT REQUIRED NOW** |
| Flyer protection | Sealed flyer lane regressions green |
| Business-card protection | Sealed card lane regressions green |
| Menu protection | Sealed menu lane regressions green |
| Service-sheet protection | Sealed service-sheet lane regressions green |
| Remaining design SKUs | Untouched (still Canva where previously mapped) |
| Upstream Payment/Activation/Routing/Dispatch | Protected |
| No secrets / no `/data` | Confirmed at stage |

## Files included (package commit)

Promo renderer modules (`promo-*.ts`, `promotion-graphics-proof.test.ts`), index exports, `runPromoJobPipeline`, intake mapper + executable-plate gate, dispatch hook + idempotency + `map-promo-job-truth`, observer/ensure/index wiring, service-sheet test expectation update for promo remapping only, catalog intake schema + batch1 customer inputs + production-brief field map, `sku-overrides` promo `primaryTool` → `studio_design_renderer`, governing docs (delta, proof, OWNER-DECISION, intake-truth, dispatch-hook, this seal), Owner-accepted Harbor campaign-set control `renders/v3` (PNG/PDF/HTML/spec/QA/identity) + materials + `current-identity` → v3.

**Excluded:** `data/**` · secrets · Canva/tool-coordination/executor/next-sku side-packages · promo fail-qa / versioning / v1–v2 / v4+ render churn · sealed-lane `current-identity` test churn · flyer/card/menu/service-sheet local render churn · merge to main · SKU #6.

## Accepted visual limits (preserved)

PASS WITH LIMITS: square bottom half somewhat sparse; portrait more polished than square; pair coordinated but not perfectly equal in polish. Not reopened in seal.

## Remaining design gap

Other design SKUs remain on existing Canva/manual paths. Sealed Machine design lanes are now flyer · business-card · menu · service-sheet · **promotion-graphics**. Next SKU must be chosen by a fresh renderer-capability delta against this five-lane baseline — not momentum.

## Exactly one recommended next package

**Owner/Manager authorize STUDIO-OPERATING-DESIGN-NEXT-SKU-SELECTION-4 (selection only — not implementation): re-rank remaining design SKUs against sealed flyer + business-card + menu + service-sheet + promotion-graphics before authorizing any sixth auto-production lane.**

## Scout

**PARKED**

---

## Git verification

| Check | Value |
|-------|--------|
| Local HEAD | `90536a76d4a6481435b310c392832b5960c95782` |
| Origin HEAD | `90536a76d4a6481435b310c392832b5960c95782` |
| Ahead/behind | `0/0` |
| Staging | empty |
| Worktree (seal scope) | tracked seal files clean; unrelated untracked leftovers remain unstaged |
| No secrets staged | confirmed |
| No `/data` staged | confirmed |
| Merge | **NOT PERFORMED** |
