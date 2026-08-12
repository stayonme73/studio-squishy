# STUDIO-OPERATING-DESIGN-MENU-DELTA-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-MENU-DELTA-1  
**Mode:** Inspection only — no implementation · no Canva remap · no Make · no sealed-lane edits  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### MENU DELTA B — SMALL EXTENSION

`v2-rtu-menu` can reuse the sealed portrait single-surface renderer **spine** (bounded design spec → HTML/CSS → Playwright PNG/PDF → identity/hash → design QA → durable truth). It cannot reuse the sealed flyer **reasoner** as-is.

The principal new muscle is a **bounded sectioned item/price list** with honest **density/overflow fail-closed** behavior — not a generic document-layout engine, and not quiet font-shrink to fake a fit.

**Density honesty (watch point):** Existing CERT menu evidence is **not** a contract-maximum fixture. A future proof that only renders a tiny menu would not stress the SKU promise.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `a4a1a614dd0cf344f5230d49e50a75c229e24856` |
| Branch | `operating/design-renderer-proof-1` |
| Ahead/behind vs origin | `0/0` |
| Control match | **CONTROL_MATCH** |
| Sealed lanes | `v2-rtu-flyer` · `v2-rtu-business-card` |
| Candidate | `v2-rtu-menu` |

---

## 2. Authoritative menu contract

**Authorities inspected (no restaurant conventions invented beyond these):**

| Source | Role |
|--------|------|
| `src/catalog/v2/batch1-ready-to-use.ts` (`v2-rtu-menu`) | Customer promise / deliverables / exclusions / responsibilities |
| `src/catalog/intake/schemas.ts` (`rtu-menu`) | Intake fields |
| `src/catalog/route-map-v2-launch.ts` | Purpose line |
| `src/lib/studio-kitchen-production/sku-overrides.ts` | Current executor notes |
| `src/lib/studio-kitchen-production/cert-design/*` | CERT plate + existing menu evidence class |
| `src/lib/studio-design-renderer/*` | Sealed flyer/card renderer baseline |

### Promise summary

| Topic | Contract truth |
|-------|----------------|
| Customer name | Make Me a Menu |
| Price | $89 (catalog) |
| Purpose line | “One single-page menu with a defined item limit — ready to print or share.” |
| Design | **One finished single-page menu** — **one agreed size only**; **up to 5 sections**; **up to 30 total items** |
| Outputs | **Print-ready PDF** + **digital PNG or JPG** + QC review + one design direction |
| Printing | **Excluded** — printing, shipping, physical menu production |
| Multi-page / bifold / trifold / booklet / table-service | **Excluded** |
| >5 sections or >30 items | **Excluded** |
| Price-list cleanup / rewriting / allergen verification | **Excluded** (client confirms accuracy) |
| Editable sources / multiple sizes / photography / custom illustration | **Excluded** |
| Revisions | One revision round max |
| Turnaround | Within 3–5 business days (Route Map timing label) |
| Client distributes | Yes (`RTU_PRINT_CLIENT_NOTE` / intended use print, digital, or both) |

### Maximums (hard)

| Limit | Value |
|-------|--------|
| Maximum sections | **5** |
| Maximum items (total across all sections) | **30** |
| Pages / surfaces | **1** (single-page only) |

### Required item fields (from intake + catalog wording)

Intake required field `items` label:

> Complete item list with names, descriptions, and prices (up to 30 items total)

| Field | Contract posture |
|-------|------------------|
| Item name | **Required** (part of complete item list) |
| Description | **Expected in the complete list**; Machine must not invent. Empty/absent description is client truth — do not fabricate blurbs |
| Price | **Required** in the complete item list (client confirms prices accurate). Contract does **not** specify currency format beyond client-supplied price text |
| Section assignment / section order | **Required** via sections field + section order |

### Price requirements

| Topic | Truth |
|-------|--------|
| Per-item price | Intake frames a complete list **with prices** — treat missing price as fail-closed for Machine truth |
| Price cleanup / proofreading | **Excluded** — Studio does not rewrite or verify business accuracy |
| Format | **Not specified** (no forced `$X.XX` schema in catalog) — accept client-authored price strings; reject empty/whitespace-only |

### Optional / conditional content

| Topic | Truth |
|-------|--------|
| Item descriptions | Present in intake model; may be blank if client supplies none — **never invent** |
| Photos | Materials field may include photos; photography **creation** excluded |
| Size notes | Optional (“Required menu size, if known”) |
| Extra legal disclaimers | Optional textarea (`disclaimers`) — client-supplied |
| Exact px / inches | **Not fixed in catalog** — “one agreed size” |

### Disclaimer / allergen handling

| Topic | Truth |
|-------|--------|
| Dietary/allergen labels | Intake field `dietaryLabels` is **required** — client supplies and verifies |
| Client responsibilities | Confirm dietary/allergen info accurate; confirm legal wording accurate |
| Studio exclusions | Allergen **verification** excluded |
| Machine rule | **Customer-provided/approved truth only** — no invented gluten-free / vegan / allergen / health / ingredient claims |

### Dimensions / orientation

| Topic | Truth |
|-------|--------|
| Catalog | Single-page; one agreed size; orientation not named |
| CERT-DESIGN plate for menu | Portrait **1024×1536** (same plate as flyer / service-sheet) |
| Proof plate recommendation | Lock CERT portrait **1024×1536** as the agreed Machine plate unless Owner later chooses another agreed size |

### Outputs

| Output | Required |
|--------|----------|
| Print-ready PDF | Yes |
| Digital PNG or JPG | Yes (PNG satisfies) |
| Design direction | Yes (catalog deliverable) |
| QC review before delivery | Yes |

### Required materials (intake)

| Field | Required |
|-------|----------|
| Business name and type | Yes |
| Menu sections (up to 5) + order | Yes |
| Complete item list (names, descriptions, prices; ≤30) | Yes |
| Dietary/allergen labels and required wording | Yes (client-supplied; may state none) |
| Logo / photos / colors / brand references | Yes (materials; do not invent files) |
| Intended use (Print / Digital / Both) | Yes |
| Size notes | Optional |
| Disclaimers / legal wording | Optional |

### QA / review / delivery behavior

| Topic | Truth |
|-------|--------|
| Production QA class | Design QA (CERT-DESIGN tested SKU) |
| CERT dims | Portrait 1024×1536; logo required; single asset; multi-asset consistency **false** |
| Closeout / delivery | Standard creation_delivery; client prints/shares |
| Current executor | Canva (`marketing_assets` baseline; override notes “manual Canva operational path”) |
| Owner routine today (Canva path) | Manual operational — **not** Owner-independent Machine yet |

### Existing CERT evidence (inspect-only; not max-load)

Non-mutating artifact already exists:

`docs/launch/kitchen-production-cert-design-1/artifacts/fixture-b/menu-final.png`

Observed (inspection of existing file only — **not re-rendered**):

- Portrait menu for Salt & Cedar Bakery
- **3 sections** (Pastries / Breads / Coffee), roughly **~26 name+price rows**
- Descriptions mostly absent (short parentheticals at most)
- Heavy photo collage + promo panel consumes ~half the canvas
- **Does not prove** 5 sections × 30 items with descriptions on a text-primary single surface

---

## 3. Proven renderer baseline

| Capability | Status |
|------------|--------|
| Portrait single-surface (1024×1536) | Proven — flyer |
| Landscape | Proven — card |
| Front/back multi-surface | Proven — card |
| Bounded text hierarchy | Proven — flyer/card (**fixed** role stacks, not variable lists) |
| Logo/material placement | Proven |
| PNG / PDF / multi-page PDF | Proven |
| QA binding + identity/hash + versioning | Proven |
| Idempotent hooks + observer | Proven for flyer **and** card only |
| Owner production | **NONE** on sealed lanes |
| Sectioned item lists / dynamic row packing | **Not proven** |
| Right-aligned price columns as repeated rows | **Not proven** (flyer has one centered campaign price) |
| Density fail at contract maximum | **Not proven** |

---

## 4. Sectioned-list delta

Needed content shape (repo-appropriate; not built here):

```
sections[] → {
  sectionId, title, sortOrder,
  items[] → { itemId, name, description?, priceDisplay }
}
+ optional dietaryDisclaimerText / legalDisclaimerText (client-authored)
+ business identity + logo materials
```

| Need | Required for menu? | Notes |
|------|--------------------|-------|
| Section headings | **Yes** | Up to 5; ordered |
| Item rows | **Yes** | Up to 30 total |
| Optional descriptions | **Yes** (place when supplied) | Never invent |
| Price alignment | **Yes** | Name ↔ price scannable pairing |
| Variable item counts | **Yes** | 1…30; 1…5 sections |
| Vertical spacing / section breaks | **Yes** | Bounded rhythm, not free-form pages |
| Overflow detection | **Yes — critical** | Fail-closed; no silent omission |

**Not required by contract (do not invent):** bifold columns as a second page, QR menus, calorie tables, multi-currency, kitchen modifiers engines, photo-per-item grids.

---

## 5. Density / overflow findings

### Canvas budget (CERT plate)

Portrait **1024×1536**. After brand header + footer/disclaimer band, usable list height is roughly on the order of **~1000–1200px** depending on chrome — not a second page (multi-page **excluded**).

### Load ladder (inspection judgment — no new render)

| Load | Approx content | Fit outlook on 1024×1536 at readable type |
|------|----------------|-------------------------------------------|
| **Small** | 1–2 sections, ≤8 items, short/no descriptions | **Fits** with sealed portrait techniques |
| **Medium** | 3 sections, ~15–20 name+price rows, sparse descriptions | **Likely fits** (CERT-like density) |
| **Maximum** | **5 sections + 30 items** with non-empty descriptions + allergen/disclaimer block | **High mismatch risk** — cannot assume fit |

### Contract / rendering mismatch flag

**FLAG — MAXIMUM-LOAD RISK**

The catalog promises up to **5 sections / 30 items** on **one** page, and intake asks for **names, descriptions, and prices**. At readable minimum typography, a full maximum with real descriptions can exceed one portrait surface.

Honest Machine postures (Owner chooses later — **not** implemented here):

1. **Fail-closed overflow** when content cannot fit at minimum readable type (preferred for Owner-independence honesty), and/or  
2. **Bounded description caps** documented as Machine limits (PASS WITH LIMITS) without inventing multi-page menus, and/or  
3. Explicit Owner contract clarification if maximum+descriptions must always fit.

**Forbidden:** quietly shrink type into unreadably small text, clip rows, or omit items to force a green check.

### Overflow detection gap in sealed capture

Current flyer/card capture flags overflow via **document scroll vs canvas** while CSS uses `overflow: hidden` on a fixed canvas. Absolute layers that draw past the clip box may still report `overflowOk: true`.

Menu proof will need a **stronger content-bounds / last-row / min-typography check** (QA extension) — not scroll metrics alone.

---

## 6. Content-truth rules

Machine must not invent menu facts.

| Condition | Fail-closed behavior |
|-----------|----------------------|
| Missing item name | **FAIL** |
| Missing required price | **FAIL** |
| Malformed / empty price string | **FAIL** |
| Empty section (section with zero items) | **FAIL** (or reject at truth-mapping) |
| Item count > 30 | **FAIL** |
| Section count > 5 | **FAIL** |
| Unparseable intake → structured truth | **FAIL** (textarea intake is not yet a typed work packet) |
| Unsupported / excessive field length (reasoner bounds) | **FAIL** with clear code — do not truncate silently into wrong prices/names |
| Dietary / allergen / disclaimer / ingredient / health claims | **Client-supplied only** — never invent “gluten-free”, “vegan”, allergen lists, etc. |
| Missing logo material when required | **FAIL** (same doctrine as flyer/card) |

---

## 7. Design-spec delta

Minimum bounded additions (names illustrative; keep SKU-shaped):

| Concept | Purpose |
|---------|---------|
| `MenuDesignSpec` (or `menu-design-spec-1.x`) | Parallel to flyer/card specs — **not** a rewrite of sealed flyer types |
| `MenuProjectTruth` | Business identity + structured `sections[]` / `items[]` + client disclaimer fields |
| `sectionTitle` role | Section headings |
| `itemName` / `itemDescription` / `itemPrice` roles | Row content |
| Display limits | `maxSections: 5`, `maxItems: 30`, optional description char bound for Machine honesty |
| Canvas | Portrait 1024×1536 (CERT) |
| Materials | Logo (+ optional approved images only if contract path supplies them — do not require hero collage) |

**Do not** turn the spec into a generic multi-column document engine, CSS page builder, or Canva substitute API.

Flyer `FlyerDesignSpec` / card specs stay sealed and untouched.

---

## 8. Renderer delta

| Capability | Classification | Notes |
|------------|----------------|-------|
| Absolute text/image/shape compositor | **REUSE** | Same HTML layer primitives |
| Logo placement | **REUSE** | Proven |
| PNG/PDF Playwright export | **REUSE** | Single-page like flyer |
| Right-aligned price text | **REUSE** | `align: "right"` already exists |
| Optional rule/separator shapes | **REUSE** | Shape layers exist |
| Section headings as roles | **SMALL EXTENSION** | New text roles + reasoner output |
| Repeated item rows (variable N) | **SMALL EXTENSION** | Many layers OK; **generating** N rows is new |
| Item descriptions under names | **SMALL EXTENSION** | Secondary text role + spacing |
| Name↔price row pairing / leaders | **SMALL EXTENSION** | Not in flyer/card reasoners |
| Dynamic vertical layout / packing | **SMALL EXTENSION** (principal muscle) | Bounded column flow from structured truth — **not** a general layout engine |
| Stronger overflow / min-type gates | **SMALL EXTENSION** | Required for density honesty |

Fixed Y-stacked flyer reasoner **cannot** express variable menus. Need an additive **menu reasoner/profile** (deterministic constrained first), same separation pattern as flyer/card.

---

## 9. QA delta

Menu-specific checks beyond sealed flyer/card:

| Check | Needed? |
|-------|---------|
| All supplied sections represented | **Yes** |
| All required items represented (no omission) | **Yes** |
| Prices match authoritative truth tokens | **Yes** |
| No clipping / overflow at min typography | **Yes** |
| Readable minimum typography | **Yes** (define numeric floor in proof) |
| No duplicate / omitted rows | **Yes** |
| No invented copy (esp. dietary/allergen) | **Yes** |
| Correct dimensions (1024×1536 ± tolerance) | **Yes** (CERT already expects) |
| PNG/PDF valid + bound identity/hash | **Yes** (reuse spine) |
| Campaign offer-price lock (flyer-style) | **No** as primary — menu is item-list truth, not one offer price |
| Multi-asset consistency | **No** (single surface) |

---

## 10. Maximum-load fixture requirement

Future proof **must** include a synthetic fixture that stresses the contract maximum — not only a pretty 3-item demo.

| Field | Requirement |
|-------|-------------|
| `skuId` | `v2-rtu-menu` |
| Canvas | 1024×1536 portrait |
| Sections | **Exactly 5** titled sections |
| Items | **Exactly 30** total, distributed across all 5 sections (no empty section) |
| Per item | Non-empty `name` + non-empty `priceDisplay` + non-empty `description` (short but real — enough to stress wrap) |
| Dietary / disclaimer | Non-empty **client-authored** fixture strings (e.g. “Contains nuts.” / “Prices subject to change.”) — not Machine-invented health claims |
| Brand | Synthetic business + approved logo material (Harbor or Salt-class fixture pattern) |
| Forbidden pass path | Passing proof using only ≤8 items / 1–2 sections while claiming maximum support |
| Ladder | Also keep **small** + **medium** fixtures for progressive debug — maximum is the seal gate |

**This inspection did not render a new maximum-load fixture.** Existing CERT `menu-final.png` is medium-ish name+price density with photos — **insufficient** as the sole future pass artifact.

---

## 11. Dispatch delta

Before `v2-rtu-menu` can move Canva → `studio_design_renderer` (future packages — **not now**):

| Work | Status now |
|------|------------|
| Menu design spec + project truth + validate | Not started |
| Menu reasoner + HTML render + capture + bind + pipeline | Not started |
| Maximum-load proof + Owner visual gate | Not started |
| `map-menu-job-truth` (structured sections/items from job/intake) | Not started — intake is textarea today |
| Menu hook + idempotency (`ALREADY_RENDERED`) | Not started |
| Observer allow-list add `v2-rtu-menu` | Not started (today: flyer + card only) |
| `sku-overrides` `primaryTool` → `studio_design_renderer` | **Do not change until proof sealed** |
| Flyer/card hooks | **Unchanged** |

---

## 12. Downstream reuse

| Capability proven by menu | Carries to |
|---------------------------|------------|
| Sectioned / repeated row list reasoner | **`v2-rtu-service-sheet`** (≤10 services — near-A afterward) |
| Price alignment + scannable rows | Service sheet starting prices; lighter list collateral |
| Density / overflow / min-type gates | Any future single-page dense list SKU |
| Client-supplied disclaimer placement | Service-sheet wording; other print collateral |
| Structured list project-truth pattern | Intake→truth mapping for other RTU list SKUs |

**Less direct reuse:** square social sets, profile kits, edit-existing (`rm-j007`), brand strategy sheets.

SKU #3 earns its place if the **list+density** muscle is proven — not if only a sparse demo menu ships.

---

## 13. Owner-independence

| Rule | Status for this delta |
|------|------------------------|
| Routine Owner production target | Must remain **NONE** after Machine path exists |
| Failures fail-closed | Preserve — especially density overflow |
| Tagia does not lay out / export / open Canva for routine jobs | Preserve on future Machine path |
| DELTA B compatibility | **Yes**, if max-load honesty is Machine-enforced |

---

## 14. Canva / Make status

| System | Status |
|--------|--------|
| Canva on flyer / card | **OFF** (sealed) — unchanged |
| Canva on `v2-rtu-menu` | **Still Canva** — **mapping unchanged** |
| Make | **NOT REQUIRED NOW** |
| This package | No Canva/Make/executor changes |

---

## 15. Flyer / card protection

| Lock | Confirmed |
|------|-----------|
| Sealed flyer lane untouched | **Yes** — inspection only |
| Sealed business-card lane untouched | **Yes** |
| Other design SKUs untouched | **Yes** |
| No `primaryTool` remap for menu | **Yes** |
| Prefer additive `menu-*` modules later | **Yes** (do not mutate flyer/card types) |

---

## 16. Delta verdict

# MENU DELTA B — SMALL EXTENSION

**Why not A (reuse only):** Sealed flyer/card reasoners have no section→item→price list model, no variable row packing, and no max-density QA. Absolute compositor alone is not enough.

**Why not C (material new capability):** Same operating spine, same portrait plate, same PNG/PDF capture, same materials/hash/QA doctrine. Additions are a bounded menu profile + list reasoner + stronger overflow gates — not a new executor class or multi-page engine.

**Why not D (unsuitable):** Architecture can honestly deliver single-page menu files without Canva/Make **if** overflow is fail-closed and maximum-load is proven. Contract does not demand bifold/print-shop features the renderer lacks. The risk is **density truth**, not architectural impossibility.

---

## 17. Risks

1. **Maximum-density oatmeal** — 30 items + descriptions may not fit readable type on one portrait page → must fail-closed or take Owner limits; never silent shrink/omit.  
2. **Pretty-demo false pass** — CERT / small fixtures must not seal the lane alone.  
3. **Weak overflow metrics** — scroll-based capture can miss clipped absolute layers.  
4. **Textarea intake ambiguity** — sections/items are free text today; truth-mapping must be strict or fail.  
5. **Allergen invention** — high-harm failure mode; client text only.  
6. **Flyer/card contamination** — mutating shared sealed types to “just add lists” risks sealed lanes.  
7. **Premature Canva remap** — retargeting `primaryTool` before max-load proof would route ready jobs into an unfinished path.  
8. **Photo-collage creep** — CERT menu uses heavy photography; catalog does not require a photo collage — do not make hero grids a silent dependency.

---

## 18. Git state

| Check | Value |
|-------|--------|
| HEAD | `a4a1a614dd0cf344f5230d49e50a75c229e24856` |
| Origin HEAD | `a4a1a614dd0cf344f5230d49e50a75c229e24856` |
| Ahead/behind | `0/0` |
| Commit / push / merge | **NONE** (inspection only) |
| Code changes to sealed flyer/card | **NONE** |
| Report path | `docs/launch/studio-operating-design-menu-delta-1/` (untracked) |

---

## 19. Exactly one recommended next step

**Owner review this MENU DELTA B report and authorize a single bounded proof package** that implements additive menu spec/reasoner/render/QA **and must pass the maximum-load fixture (5 sections / 30 items)** without remapping Canva, without Make, and without editing sealed flyer/card lanes.

Suggested package name (not started):  
**`STUDIO-OPERATING-DESIGN-MENU-PROOF-1`**

---

## Final status

**READY FOR OWNER REVIEW**

**Scout PARKED**
