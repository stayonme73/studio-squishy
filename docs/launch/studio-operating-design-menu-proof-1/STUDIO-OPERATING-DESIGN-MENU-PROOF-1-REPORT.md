# STUDIO-OPERATING-DESIGN-MENU-PROOF-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-MENU-PROOF-1  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

---

## Proof verdict

# MENU RENDERER PROOF PASS

Owner-independent menu production proven on the sealed design-renderer architecture with bounded DELTA B extensions only. Seal fixture is **5 sections / 30 items TOTAL** (not per section). Dispatch `primaryTool` for `v2-rtu-menu` remains **`canva`** (not retargeted).

**Owner visual gate still required before any Canva→renderer migration.** Max-load artifact path below.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `a4a1a614dd0cf344f5230d49e50a75c229e24856` |
| Accepted delta | **MENU DELTA B — SMALL EXTENSION** |
| Sealed lanes | `v2-rtu-flyer` · `v2-rtu-business-card` |
| Candidate SKU | `v2-rtu-menu` |

---

## 2. Menu contract

Preserved (not expanded):

| Promise | Honored |
|---------|---------|
| Single page | **Yes** |
| Max **5 sections** | Enforced in truth + validate |
| Max **30 items TOTAL** | Enforced (seal fixture = exactly 30) |
| One agreed size | CERT plate **1024×1536** portrait |
| PNG or JPG preview | **PNG** (satisfies) |
| Print-ready PDF | Flattened single-page PDF (Studio meaning — not bleed/CMYK) |
| Client prices / descriptions | Fixture = customer-truth stand-in; Machine does not invent |
| Client dietary/allergen/disclaimer | Placed from truth only |
| Multi-page / bifold | **Excluded** — density overflow fails closed |
| Allergen verification | **Excluded** |

---

## 3. Files changed (uncommitted)

**Additive only** under `src/lib/studio-design-renderer/`:

| File | Role |
|------|------|
| `menu-types.ts` | Bounded menu spec + truth + limits + min fonts |
| `menu-contracts.ts` | Contract surface + item counter |
| `menu-fixtures.ts` | Salt & Cedar small / medium / **max 5×30** fixtures |
| `menu-reason.ts` | Deterministic sectioned-list packer (comfortable→compact→minimum) |
| `menu-validate.ts` | Fail-closed spec validation |
| `menu-render-html.ts` | HTML/CSS compositor |
| `menu-capture.ts` | Playwright PNG/PDF + **strong content-bound overflow** |
| `menu-completeness.ts` | Authoritative vs rendered item/price set |
| `menu-bind.ts` | Identity / hashes / immutable vN |
| `menu-pipeline.ts` | End-to-end proof/job pipeline |
| `menu-proof.test.ts` | Max/small/medium + fail-closed + flyer/card regression |
| `index.ts` | Additive exports only |

**Artifacts:** `docs/launch/studio-operating-design-menu-proof-1/`

**Not changed:** flyer/card pipelines, hooks, observers, idempotency, QA modules; `sku-overrides` menu `primaryTool` (still Canva).

---

## 4. Menu design-spec extension

`menu-design-spec-1.0.0` with:

- Portrait canvas 1024×1536
- Structured truth: `sections[]` → `items[]` (`name`, optional `description`, `priceDisplay`)
- Client `dietaryLabels` + optional `legalDisclaimer`
- Caps: `MENU_MAX_SECTIONS = 5`, `MENU_MAX_ITEMS_TOTAL = 30`
- Text roles: section_title, item_name, item_description, item_price, dietary/legal disclaimer
- **Not** a generic document engine

Flyer / card specs remain backward-compatible and untouched.

---

## 5. Sectioned-list renderer

Deterministic packer proves:

- Section heading → item rows → optional description → right-aligned price
- Stable section rules + vertical packing
- Scale ladder: comfortable → compact → **minimum** (seal used **minimum**)
- No silent row omission; unfit content → `DENSITY_OVERFLOW`

---

## 6. Maximum-load fixture

| Field | Value |
|-------|--------|
| Sections | **5** (Pastries 7 · Breads 6 · Coffee & Tea 7 · Savory 5 · Sweets & Treats 5) |
| Items TOTAL | **30** |
| Per item | Realistic name + price + non-empty description |
| Dietary / legal | Client-authored fixture strings present |
| Brand | Salt & Cedar Bakery CERT fixture (INTERNAL TEST) |

---

## 7. Density / overflow behavior

| Topic | Result |
|-------|--------|
| Min font floors | itemName/price **13px**, description **11px**, section **15px** (on CERT plate) |
| Seal typographyMode | **minimum** |
| contentBottomPx | **1405.35** (within canvas before footer) |
| Strong overflow | Bounds + fixed-height clip + font-floor + item-name overlap |
| Scroll-only evasion | Mitigated — absolute off-canvas still fails |
| Absurd long descriptions | Proven **DENSITY_OVERFLOW** fail-closed |
| Silent shrink / omit / page-2 | **Not used** |

---

## 8. Content / price truth

| Check | Status |
|-------|--------|
| No invented items/prices/descriptions/allergens | Fixture truth only |
| Empty section / missing name / missing price / malformed price | Fail-closed |
| >30 items | Fail-closed |
| All 30 names + prices in declared text | Pass |
| Price bound per `itemId` | Pass (`verifyMenuItemCompletenessAndPrices`) |

---

## 9. Artifact outputs (Owner visual evidence)

| Artifact | Path |
|----------|------|
| **Max-load PNG (review this)** | `docs/launch/studio-operating-design-menu-proof-1/artifacts/v2-rtu-menu/renders/v1/menu.png` |
| Max-load PDF | `docs/launch/studio-operating-design-menu-proof-1/artifacts/v2-rtu-menu/renders/v1/menu.pdf` |
| HTML / spec / QA JSON | same `renders/v1/` directory |
| Dimensions | **1024 × 1536** |

JPG not required (PNG satisfies “PNG or JPG”).

Also produced: small + medium under `.../v2-rtu-menu-small` and `.../v2-rtu-menu-medium` (regression fixtures).

---

## 10. Artifact identity / hashes (max-load v1)

| Field | Value |
|-------|--------|
| renderVersion | 1 |
| pngContentSha256 | `abb7dd67cae0eb825c963234e6a23c6020001711d3edc52b7e97269cd8e6bb5b` |
| pdfContentSha256 | `c5af4da25c27cafc2ab04b0ba11fe293aefb35c63d9bcf5895fef7b5724f2a4d` |
| designSpecFingerprint | `8eb423c17e044ada9c5181d9d0609d76244a8236982dc45d718315bfcc573221` |
| materialFingerprint | `12e58d91287fef2841909865fa6813b579ca82db23af6168623e827706018054` |
| rendererVersion | `design-renderer-menu-proof-1.0.0` |
| overflowDetail | `scroll=1024x1536 canvas=1024x1536 issues=none` |

---

## 11. Menu QA

Applied to bound PNG (not metadata-only):

- Dimensions / logo identity / design-quality gate (Salt fixture class)
- All 5 sections + all 30 items present
- Prices exact; descriptions present where supplied
- No clipping / overflow / overlap (capture issues=none)
- Client dietary + legal wording preserved
- Completeness module PASS

---

## 12. Small / medium fixture behavior

| Fixture | Items | Result |
|---------|-------|--------|
| Small | 5 (2 sections) | PASS |
| Medium | 14 (3 sections) | PASS |

No empty-page / bizarre packing failures at low density.

---

## 13. Failure handling (proven)

| Case | Result |
|------|--------|
| Empty section | `MISSING_REQUIRED_TRUTH` |
| Missing item name | `MISSING_REQUIRED_TRUTH` |
| Missing price | `MISSING_REQUIRED_TRUTH` |
| Malformed price | `MISSING_REQUIRED_TRUTH` |
| 31 items (>30 total) | `MISSING_REQUIRED_TRUTH` |
| Oversized descriptions | `DENSITY_OVERFLOW` → **MENU RENDERER PROOF FAIL** |
| Forced QA fail | `QA_FAILURE` |

---

## 14. Owner-independence

| Rule | Status |
|------|--------|
| Routine Owner production | **NONE** |
| Canva layout / manual row positioning / Owner font shrink | **Not used** |
| Machine produces PNG/PDF + identity | **Yes** |

---

## 15. Canva status

| Topic | Status |
|-------|--------|
| Used in proof | **No** |
| `v2-rtu-menu.primaryTool` | Still **`canva`** (unchanged) |
| Flyer / card Canva-off sealed lanes | Unchanged |

---

## 16. Make status

**NOT REQUIRED NOW** — unused.

---

## 17. Flyer / card protection

| Check | Result |
|-------|--------|
| Flyer proof pipeline regression | **PASS** |
| Business-card proof pipeline regression | **PASS** |
| Flyer/card canvas + schema untouched | **Yes** |
| Menu modules additive / SKU-gated | **Yes** |

---

## 18. Downstream service-sheet reuse (not implemented)

Menu capability that should later cheapen `v2-rtu-service-sheet`:

- Sectioned / repeated row packer
- Name ↔ price alignment
- Optional secondary description lines
- Density / min-typography / strong overflow gates
- Completeness binding (authoritative list vs rendered set)

**Not migrated in this package.**

---

## 19. Tests / result

```
src/lib/studio-design-renderer/menu-proof.test.ts
  18 passed (18)
```

Includes max-load seal, small/medium, fail-closed matrix, flyer + card regressions.

---

## 20. Proof verdict

# MENU RENDERER PROOF PASS

Technical + automated QA criteria met at contract maximum (5 sections / **30 items TOTAL**).

**Owner/Manager must still visually inspect**  
`docs/launch/studio-operating-design-menu-proof-1/artifacts/v2-rtu-menu/renders/v1/menu.png`  
before authorizing dispatch migration. Seal used **minimum** typography — if Owner judges it unreadable or “tax form on a postage stamp,” treat as visual FAIL and do not migrate.

---

## 21. Git state

| Check | Value |
|-------|--------|
| HEAD | `a4a1a614dd0cf344f5230d49e50a75c229e24856` |
| Ahead/behind | `0/0` vs origin |
| Commit / push / merge | **NONE** |
| Working tree | Uncommitted menu proof modules + artifacts |

---

## 22. Exactly one recommended next step

**Owner visual certification of the max-load PNG.**  

If visual **PASS** (or PASS WITH LIMITS): authorize  
`STUDIO-OPERATING-DESIGN-MENU-DISPATCH-HOOK-1`  
to retarget **only** `v2-rtu-menu` → `studio_design_renderer` (idempotent hook + observer), without touching flyer/card.

If visual **FAIL**: do not remap Canva; open a bounded density/layout remediation package.

---

## Final status

**READY FOR OWNER REVIEW**

**Scout PARKED**
