# STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-INTAKE-TRUTH-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-INTAKE-TRUTH-1  
**Mode:** Upstream intake truth — no dispatch hook · no primaryTool remap · no Canva · no Make  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

---

## Verdict

### PROMOTION-GRAPHICS INTAKE TRUTH READY

Live `rtu-promotion-graphics` intake now captures **authoritative per-graphic** `authorizedPurpose` + `agreedPlate` for Graphic 1 and Graphic 2. The ticket can say which plate each dish belongs on.

| Gate | Status |
|------|--------|
| Technical renderer proof | PASS (prior) |
| Owner/Manager visual | PASS WITH LIMITS (prior) |
| Two-asset campaign-set proof | ACCEPTED |
| Live per-asset purpose truth | **CLOSED** (this package) |
| Dispatch hook | **STILL NOT AUTHORIZED** |
| primaryTool | Canva (unchanged) |
| Make | NOT REQUIRED NOW |

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `fce3c289dae50e5ff64ded8eb25a3cc4662c1961` |
| Visual control | `renders/v3` pair · PASS WITH LIMITS |
| Prior gap | Job-level `intendedUse` + optional `sizeNotes` only |

---

## 2. What changed

### Intake schema (`rtu-promotion-graphics`)

**Removed (ambiguous for a two-asset set):**

- `intendedUse` (single job-level)
- `sizeNotes` (optional free text)

**Added (required selects):**

| Field id | Customer label |
|----------|----------------|
| `graphicA_authorizedPurpose` | Graphic 1 — intended use |
| `graphicA_agreedPlate` | Graphic 1 — agreed format |
| `graphicB_authorizedPurpose` | Graphic 2 — intended use |
| `graphicB_agreedPlate` | Graphic 2 — agreed format |

**Purpose options:** Print · Social · Email · In-store · Other  

**Agreed format options (Studio plates only — no invented ad sizes):**

- Square 1024×1024 (social / feed) → `cert-square-1024`
- Portrait 1024×1536 (print / tall) → `cert-portrait-1024x1536`
- Landscape 1536×1024 (wide) → `cert-landscape-1536x1024` (card plate reuse; promo landscape *layout* still deferred)

### Mapper

`mapPromoAssetsFromIntakeAnswers` → fail-closed Asset A/B truth (`campaign-graphic-a` / `campaign-graphic-b`) with purpose + plate + canvas. Never invents purpose/plate. Legacy `intendedUse` alone is **not** sufficient.

### Production brief + catalog TBD

Updated to the four per-graphic fields.

---

## 3. Files changed (uncommitted)

| Path | Role |
|------|------|
| `src/catalog/intake/schemas.ts` | Per-graphic purpose + plate fields |
| `src/catalog/v2/batch1-ready-to-use.ts` | intakeTemplateFieldsTbd |
| `src/lib/route-map-production-brief.ts` | Brief field labels |
| `promo-intake-truth.ts` + `.test.ts` | Mapper + fail-closed tests |
| `promo-types.ts` / `promo-contracts.ts` / `promo-fixtures.ts` / `promo-reason.ts` / `index.ts` | Landscape plate id; intake resolved flag; landscape layout fail-closed until render package |
| `promotion-graphics-proof.test.ts` | Expect intake resolved |
| `OWNER-DECISION.md` (proof package) | Visual PASS WITH LIMITS |
| This report | Governing record |

**Not changed:** dispatch hooks · observers · `sku-overrides` primaryTool · sealed flyer/card/menu/service-sheet lanes · Canva/Make wiring.

---

## 4. Honesty notes

| Topic | Truth |
|-------|--------|
| Square + portrait render | Proven in PROOF-1 |
| Landscape plate as intake choice | Recordable (card plate dims); **promo landscape layout not yet rendered** — reasoner fail-closes if asked to layout `wide_landscape` |
| Dispatch | Still blocked until Owner authorizes DISPATCH-HOOK |
| Visual limits | Preserved (sparse square; portrait more polished) — not reopened |

---

## 5. Tests / result

```
promo-intake-truth.test.ts — schema + mapper + fail-closed
promotion-graphics-proof.test.ts — intake resolved note; regressions
```

---

## 6. Exactly one recommended next step

**Owner/Manager authorize `STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-DISPATCH-HOOK-1`** — only now that live per-graphic purpose + plate truth exists and visual PASS WITH LIMITS is on record. Remap `primaryTool` for this SKU only; wire observer → hook → campaign-set render; preserve sealed lanes.

---

## Scout

**PARKED.**
