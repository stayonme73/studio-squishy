# STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-1  
**Branch:** `operating/design-renderer-proof-1`  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

**Governing seal:** `docs/launch/studio-operating-design-renderer-proof-1/OWNER-DECISION-SEALED.md`

---

## 1. Starting control point

`f9a19c530d5be5dd2f6dfc7cc30692f8557bbaf7`

Owner sealed:

- DESIGN RENDERER PROOF PASS (technical)
- PASS WITH LIMITS (visual)
- APPROVE thin `dd:{jobId}` hook for **`v2-rtu-flyer` only**

## 2. Scope delivered

Thin dispatch hook so a legitimately **EXECUTION_IDENTITY_READY** flyer job may invoke the proven design-renderer contract using **authoritative customer job truth** — not Harbor CERT fixtures.

## 3. Files changed

| Path | Role |
|------|------|
| `docs/launch/studio-operating-design-renderer-proof-1/OWNER-DECISION-SEALED.md` | Sealed Owner decision |
| `src/lib/studio-kitchen-production/types.ts` | Added `studio_design_renderer` tool id |
| `src/lib/studio-kitchen-production/sku-overrides.ts` | `v2-rtu-flyer` primaryTool → design renderer (only) |
| `src/lib/studio-design-renderer/*` | Customer/job pipeline mode + fixture-leak guard |
| `src/lib/studio-dispatch/map-flyer-job-truth.ts` | Intake + materials → `FlyerProjectTruth` |
| `src/lib/studio-dispatch/design-renderer-hook.ts` | Thin `invokeDesignRendererDispatchHook` |
| `src/lib/studio-dispatch/design-renderer-hook.test.ts` | Hook tests |
| `src/lib/studio-dispatch/index.ts` | Exports |

**Not changed:** other 12 design SKUs’ Canva primary tools, Kitchen cert rewrite, Make, Review Room, auto-invoke inside `evaluateJobDispatch`.

## 4. Hook contract

`invokeDesignRendererDispatchHook({ repoRoot, campaign, dispatchRecord, materials, stagedLogoRelativePath? })`

Gates (fail-closed):

1. `skuId === v2-rtu-flyer`
2. `executionIdentityReady === true`
3. `requirements.primaryTool.toolId === studio_design_renderer`
4. Route Map intake has `flyerPurpose` + `mustInclude`
5. Approved `logo-brand` + staged local file path
6. `mustInclude` supplies phone, web destination, and price
7. **Reject** if truth contains `CERTIFICATION FIXTURE` / Harbor demo destinations

`evaluateJobDispatch` / `ensureDispatchExecution` remain **identity-only** (no tool invoke).

## 5. Executor truth (one SKU)

| SKU | primaryTool |
|-----|-------------|
| `v2-rtu-flyer` | **`studio_design_renderer`** (integrated) |
| Other design SKUs (e.g. business card) | `canva` (unchanged) |

Canva is **not** on the fulfillment spine for this one SKU.

## 6. Customer-mode boundary

| Mode | Source | Disclaimer |
|------|--------|------------|
| `certification_fixture` | Harbor CERT (proof package) | Fixture labeling allowed |
| `customer` | Campaign name + Route Map intake + approved materials | Customer disclaimer only; **fixture leak fails closed** |

Customer artifacts write under:

`data/campaign-design-artifacts/{campaignId}/{safeDispatchId}/`

## 7. Evidence run (customer truth)

Demo customer job (not Harbor):

- Campaign: **Cedar Lane Studio**
- Dispatch: `dd:camp-design-dispatch-hook-1::v2-rtu-flyer`
- Offer/price/phone/web from intake `mustInclude`
- PNG/PDF + receipt produced

| Field | Value |
|-------|--------|
| Receipt | `data/campaign-design-artifacts/camp-design-dispatch-hook-1/dd_camp-design-dispatch-hook-1_v2-rtu-flyer/dispatch-hook-receipt.json` |
| PNG | `…/renders/v1/flyer.png` |
| PDF | `…/renders/v1/flyer.pdf` |
| Declared text | Contains Cedar Lane / $99 / (804) 555-0199 — **no** CERTIFICATION FIXTURE / harborandoak.example |

## 8. Owner-independence

Routine Owner production: **NONE**  
Canva required: **false**  
Make required: **false**  
No human Canva operator.

## 9. Failure handling

Proven refusals:

- Non-flyer SKU → `SKU_NOT_SUPPORTED`
- Fixture leakage in intake → mapper fail
- Missing logo path / not ready / wrong primaryTool → fail-closed codes

## 10. Test result

```
design-renderer-hook.test.ts — 5/5 PASS
design-renderer-proof.test.ts — 10/10 PASS
dispatch.test.ts — 8/8 PASS
routing-handoff.test.ts — 9/9 PASS
activate.test.ts — 10/10 PASS
payment-truth.test.ts — 15/15 PASS
tool-coordination-inspection.test.ts — 1/1 PASS
```

Tool coordination dump now shows **12** Canva-primary SKUs; flyer is `studio_design_renderer`.

## 11. Hook verdict

### DESIGN DISPATCH HOOK PASS

Thin `dd:{jobId}` path for **`v2-rtu-flyer` only** can invoke the proven renderer from ready dispatch identity using customer job truth, without Canva/Make/Owner layout, without fixture leak into customer mode.

## 12. Remaining design-SKU impact

**None migrated.** Menu cards, menus, social posts, etc. still Canva-primary until separately authorized.

## 13. Known limits (inherited; not polished)

Accepted visual limits from Owner seal remain. Thin hook does not redesign layout/CTA/contact weight.

Logo bytes still require a **staged local path** for Machine render (File Room remote-only refs fail closed until staged) — honest, not silent Canva fallback.

## 14. Backtrack impact

Revert `sku-overrides` flyer primaryTool + remove hook/mapper + restore types union member if Owner rejects. Proof package artifacts remain separately.

## 15. Git state

| Item | Value |
|------|--------|
| Branch | `operating/design-renderer-proof-1` |
| Base tip | `f9a19c530d5be5dd2f6dfc7cc30692f8557bbaf7` |
| Commit | **None** |
| Push / merge | **None** |

## 16. Exactly one recommended next step

**Owner/Manager review this hook report + the Cedar Lane customer-mode PNG under `data/campaign-design-artifacts/.../renders/v1/flyer.png`, then decide whether to wire `invokeDesignRendererDispatchHook` into the post-`ensureDispatchExecution` observer for flyer-ready records only (still no other SKUs).**

---

**Scout PARKED.**
