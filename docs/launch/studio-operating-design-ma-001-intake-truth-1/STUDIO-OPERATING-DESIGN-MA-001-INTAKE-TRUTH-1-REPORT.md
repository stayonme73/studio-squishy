# STUDIO-OPERATING-DESIGN-MA-001-INTAKE-TRUTH-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-MA-001-INTAKE-TRUTH-1  
**Mode:** Live composition truth before payment — **no** remap · **no** dispatch · **no** Canva change  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### MA-001 INTAKE TRUTH READY

Customer-locked Promotion Pack composition is now an **authoritative live truth** the Machine can read before payment. `skuId: ma-001` alone is **insufficient** for checkout.

| Gate | Status |
|------|--------|
| Technical pack proof | PASS (prior) |
| Visual pack | PASS WITH LIMITS (prior) |
| `lockedPackMemberCount ∈ {1,2,3,4}` | **CLOSED** |
| Ordered member identities | **CLOSED** |
| Closed kind set (customer labels) | **CLOSED** |
| Composition locked before payment | **CLOSED** (working-draft field + payment gate) |
| Unsupported kinds fail closed | **CLOSED** |
| No silent substitution | **CLOSED** |
| Pack manifest seed from composition | **CLOSED** |
| Completeness = member N/N | **CLOSED** |
| No pack-level copywriting fields | **CLOSED** |
| Owner routine | **NONE** |
| Canva / Make | Unchanged / NOT REQUIRED |
| Remap / dispatch | **NOT AUTHORIZED** |
| Eight sealed lanes | Protected |

**Honesty:** This package closes **composition authority** (mapper + manifest seed + payment-readiness API + working-draft persisted field). It does **not** ship a full Studio Plan UI polish pass or wire every checkout button — those must **call** `assertMa001CompositionReadyForPayment`. Truth is ready; UI consumption is the next seam (still not remap/dispatch).

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Prior | MA-001 PROOF accepted · visual PASS WITH LIMITS · pack coherence accepted |
| Branch | `operating/design-renderer-proof-1` |
| Control tip (pre-work) | `30b0e4ddef1f54813d5a408d12c28e26dccd4f22` |
| Gap closed | Live record that only said `ma-001` without knowing which 1–4 pieces were purchased |

---

## 2. Authoritative composition model

### Customer-facing kinds (no producer jargon)

| Customer label | Machine kind |
|----------------|--------------|
| Flyer | `flyer` |
| Menu | `menu` |
| Service sheet | `service_sheet` |
| Business card | `business_card` |
| Campaign graphic | `promotion_graphic` |

Poster / rack card / “or similar” / free text → **UNSUPPORTED_KIND** (no closest-match).

### Locked fields

- `lockedPackMemberCount` ∈ {1,2,3,4}  
- Ordered members: durable `memberId` · kind · purpose · plate  
- `lockedBeforePayment: true`  
- `completenessAuthority: exact_locked_member_nn`  
- `countUnit: member_identities`

### Plate / format

| Kind | Plate authority |
|------|-----------------|
| Flyer / Menu / Service sheet / Business card | Inherited sealed plate (Studio production — customer does not invent sizes) |
| Campaign graphic | Customer selects **Square** or **Portrait** only (Landscape fail-closed) |

### Content inheritance

Each member inherits its **sealed producer content contract**. Pack-level caption/copywriting fields (`packCaption`, `studioWriteCaptions`, …) → **FORBIDDEN_PACK_COPY_FIELD**.

---

## 3. Payment gate (critical lock)

```ts
assertMa001CompositionReadyForPayment({
  selectedServiceIds,
  composition, // live input or mapped truth
})
```

| Situation | Result |
|-----------|--------|
| `ma-001` selected · no composition | **`SKU_ONLY_INSUFFICIENT`** · `blockCheckout: true` |
| `ma-001` selected · locked valid composition | **ok** · returns truth + manifest seed |
| `ma-001` not selected | Gate skipped (`applicable: false`) |

Checkout must not accept payment on `ma-001` until this returns ok.

---

## 4. Pack manifest seed

`buildMa001PackManifestSeed` / mapper output:

- `status: composition_locked_pre_payment`  
- Member list with customer labels + Machine kinds + plates + content inheritance sources  
- Completeness note: N/N **members**, not artifact files  

---

## 5. Working draft

Added persisted field:

`ma001PackComposition` → `WORKING_DRAFT_PERSISTED_FIELDS`

So pre-payment navigation can retain the locked mix (alongside `selectedServices`). sku-only selection without this field remains payment-blocked by the gate.

---

## 6. Ambiguous / dual sources of truth

| Rejected as composition authority | Why |
|-----------------------------------|-----|
| `skuId: ma-001` alone | Does not name the pieces |
| `orSimilar` / `assetKinds` / `marketingAssets` | Ambiguous legacy |
| Pack caption fields | Contradict member-content inheritance |
| Filename / folder inference | Forbidden by proof + intake doctrine |

Single authority after lock: mapped `Ma001CompositionLiveTruth` (+ manifest seed).

---

## 7. Files changed (uncommitted)

| Path | Role |
|------|------|
| `src/lib/studio-design-renderer/ma-001-intake-truth.ts` | Mapper · gate · schema · inheritance |
| `src/lib/studio-design-renderer/ma-001-intake-truth.test.ts` | Fail-closed + payment tests |
| `src/lib/studio-design-renderer/index.ts` | Exports |
| `src/lib/studio-design-renderer/ma-001-contracts.ts` | Note update |
| `src/config/studio-working-draft-v1.ts` | `ma001PackComposition` persisted field |
| This report | Governing record |

**Not changed:** dispatch hooks · `sku-overrides` primaryTool · sealed producer pipelines · Canva/Make · eight sealed lanes.

---

## 8. Tests

```
npx vitest run src/lib/studio-design-renderer/ma-001-intake-truth.test.ts
→ 12 passed

npx vitest run src/lib/studio-working-draft/studio-working-draft.test.ts
→ 4 passed
```

Covered: N=1–4 · mixed kinds · unsupported Poster/rack/similar · count mismatch · missing purpose · promo format rules · forbidden copy fields · legacy ambiguity · payment block on sku-only · payment ok when locked · flat answers · plain-language options · content inheritance.

---

## 9. Final verdict

# MA-001 INTAKE TRUTH READY

---

## 10. Exactly one recommended next step

**Wire Studio Plan / checkout consumption of `assertMa001CompositionReadyForPayment` + persist `ma001PackComposition` on the working draft** (still **no** remap · **no** dispatch), **or** Owner-authorize `STUDIO-OPERATING-DESIGN-MA-001-DISPATCH-HOOK-1` only after that consumption is proven.

Prefer checkout/composition UI consumption first so payment cannot accept sku-only `ma-001`.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
