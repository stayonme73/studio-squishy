# STUDIO-OPERATING-DESIGN-SERVICE-SHEET-DELTA-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SERVICE-SHEET-DELTA-1  
**Mode:** Inspection only — no implementation · no Canva remap · no Make · no sealed-lane edits  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### SERVICE-SHEET DELTA B — SMALL EXTENSION

`v2-rtu-service-sheet` can reuse the sealed menu/list **spine** (portrait plate → bounded repeated rows → descriptions → PNG/PDF → identity/hash → QA → durable truth). It cannot reuse the sealed menu **price-required** truth model as-is.

The principal seam is a **bounded optional-pricing truth model**:

1. Customer-supplied listed price text (exact), **or**
2. Customer-explicit **“contact for pricing”** (or equivalent customer-authored pricing line), **or**
3. **Omitted** price (no cell / no invented filler)

**Critical honesty lock:** “Contact for pricing” is a **catalog-authorized optional line type when customer-supplied** — **not** a renderer fallback when price truth is missing. The Machine must never improvise pricing language.

Layout/density are **REUSE** (≤10 rows ≪ menu max). No new density system. Do not force menu two-column composition onto a light sheet.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `a92947a156fee54a25916da5803c9224ba1ed350` |
| Branch | `operating/design-renderer-proof-1` |
| Ahead/behind vs origin | `0/0` |
| Control match | **CONTROL_MATCH** |
| Proven sealed lanes | `v2-rtu-flyer` · `v2-rtu-business-card` · `v2-rtu-menu` |
| Candidate | `v2-rtu-service-sheet` |

---

## 2. Authoritative service-sheet contract

**Authorities inspected (no generic service-sheet conventions invented):**

| Source | Role |
|--------|------|
| `src/catalog/v2/batch1-ready-to-use.ts` (`v2-rtu-service-sheet`) | Customer promise / deliverables / exclusions / responsibilities |
| `src/catalog/intake/schemas.ts` (`rtu-service-sheet`) | Intake fields |
| `src/catalog/route-map-v2-launch.ts` | Purpose line |
| `src/lib/studio-kitchen-production/sku-overrides.ts` | Current executor (Canva) |
| `src/lib/studio-kitchen-production/cert-design/artifact-registry.ts` | CERT plate (portrait 1024×1536) |
| Sealed `menu-*` modules | Menu/list baseline (price-required today) |

### Promise summary

| Topic | Contract truth |
|-------|----------------|
| Customer name | Make Me a Service Sheet |
| Catalog SKU price | $79 |
| Purpose line | “One page with up to ten services and brief descriptions.” |
| Design | **One finished single-page service sheet** — **up to 10 services** with **brief descriptions only**; **optional starting prices or “contact for pricing” line**; **one agreed size** |
| Outputs | **Print-ready PDF** + **one digital PNG or JPG** |
| Max services | **10** |
| Pages / surfaces | **1** (double-sided / multi-page **excluded**) |
| Food menus / detailed many-line price lists | **Excluded** |
| Editable sources / photography / printing / posting | **Excluded** |
| Revisions | One revision round max |
| Turnaround | Within **2–3 business days** (Route Map timing label) |
| Client distributes | Yes (print / share themselves) |
| Current executor | **Canva** (`marketing_assets` family baseline; override notes “manual Canva operational path”) |

### Required / optional fields (from intake + catalog)

Intake template `rtu-service-sheet`:

| Field id | Label | Required? |
|----------|-------|-----------|
| `services` | “Final service names, descriptions, and **any** starting prices” | **Yes** (the list) |
| `contactDetails` | “Contact details that must appear” | **Yes** |
| `wording` | “Required wording or disclosures (you supply and verify)” | **Yes** |
| `materials` | “Logo, photos, and brand references” | **Yes** (materials role — may state none; do not invent files) |
| `sizeNotes` | “Required size, if known” | Optional |

Client responsibilities:

- Provide final, approved service descriptions and content
- Confirm starting prices and contact information are accurate
- Confirm any required legal wording is accurate

Intake TBD list also names: final service names, accurate descriptions, **any** starting prices, contact, disclosures, logo/photos if available.

### Pricing language in the contract (exact)

Deliverable label (catalog) authorizes:

> optional starting prices **or** `"contact for pricing"` line

Intake frames prices as **“any starting prices”** — optional, not mandatory per row.

**No** catalog authority for:

- Machine-invented default prices
- Auto-inserting “contact for pricing” when the customer left a price blank
- A separate priced “range engine” (if the customer writes a range, that is **their** listed price text)

### CERT / QA plate

| Topic | Truth |
|-------|--------|
| Expected dims | Portrait **1024×1536** (same plate as flyer/menu) |
| Assets | min=1 max=1 |
| Logo variant | required |
| Multi-asset consistency | false |
| Fixture evidence | Harbor service-sheet corrected PNG (CERT path) — fixture campaign facts are **not** a requirement that every live job lists prices |

### Review / delivery expectations

| Topic | Truth |
|-------|--------|
| Production lane | `standard_build` / `creation_delivery` |
| Launch status | `limited` |
| Placement | Route Map + Direct Exit (`both`) |
| Delivery | Flattened digital + print-ready PDF; client prints/shares |
| Staff path today | Manual Canva operational (Owner-independence gap until Machine path) |

---

## 3. Proven menu/list baseline (reuse)

Already sealed — treat as reusable:

| Capability | Status for service-sheet |
|------------|--------------------------|
| Portrait single surface 1024×1536 | **REUSE** |
| Bounded repeated rows | **REUSE** |
| Section headings (if used) | **REUSE** (optional; sheet may be one flat list) |
| Item/service names | **REUSE** |
| Descriptions (optional; no silent truncate) | **REUSE** |
| Price alignment when a price exists | **REUSE** |
| Two-column structured flow | **REUSE available** — **not required** at ≤10 |
| Density / overflow fail-closed | **REUSE** (headroom vs menu max) |
| PNG/PDF | **REUSE** |
| Artifact identity / versioning | **REUSE pattern** |
| QA binding | **REUSE pattern** (SKU-specific tokens) |
| Idempotent hooks / observer | **REUSE pattern** (future; not remapped now) |
| Owner production NONE | **Target preserved** |

### What service-sheet needs beyond this baseline

| Need | Class |
|------|-------|
| Optional / omitted price per row | **SMALL EXTENSION** (truth model) |
| Customer-explicit “contact for pricing” line (only when supplied) | **SMALL EXTENSION** (authorized display mode) |
| Required contact block from intake `contactDetails` | **REUSE** flyer/card contact roles (composition profile) |
| Flat ≤10 service list (no menu multi-section requirement) | **REUSE** (one section or flat list) |
| No food-menu / allergen inventing | **REUSE** fail-closed honesty (exclude menu-specific allergen roles) |
| New canvas / multi-page / square / multi-asset | **Not needed** |

---

## 4. Pricing-truth delta

### Is the sealed menu model too strict?

**Yes.** Sealed menu truth requires every item to have non-empty `priceDisplay` and rejects strings without a digit (`menu-reason.ts`). That correctly matches the **menu** intake (“complete item list with … prices”). It does **not** match the service-sheet deliverable (“optional starting prices or contact for pricing line”).

### Bounded per-service price states (repository-approved)

| State | Allowed? | Source |
|-------|----------|--------|
| Numeric / starting price text (customer-authored) | **Yes** | Catalog + intake “any starting prices” |
| Price range text (customer-authored, e.g. “$50–$75”) | **Yes as listed text only** — not a separate engine mode | Customer supply; render exact |
| No listed price (omitted) | **Yes** | “optional starting prices” / “any” |
| Explicit “contact for pricing” (or customer’s equivalent phrase) | **Yes — only when customer-authorized in input truth** | Catalog deliverable label |
| Machine-invented “contact for pricing” for blanks | **No** | Reject as improvisation |
| Blank decorative price cell / “$—” / “TBD” invented by Machine | **No** | Fail-closed |

### “Contact for pricing” classification

| Question | Answer |
|----------|--------|
| Is it in the authoritative catalog promise? | **Yes** — deliverable label |
| Is it an intake auto-default when price missing? | **No** — intake says “any starting prices” |
| May the renderer invent it? | **Never** |
| Correct treatment | **Customer-authorized pricing-display mode** (or exact customer-authored pricing line), distinct from **omitted** |

---

## 5. Service-row truth model (minimum bounded — inspection only)

Not implemented. Minimum concepts required for a future proof:

| Field | Required? | Notes |
|-------|-----------|-------|
| `serviceId` | Yes | Stable id |
| `name` | Yes | Fail-closed if missing |
| `description` | Optional | Client truth; never invent |
| `priceMode` | Yes | `listed` \| `contact_for_pricing` \| `omitted` |
| `priceDisplay` | Conditional | **Required exact customer text** when `listed` or `contact_for_pricing`; **must be absent/empty** when `omitted` |
| Sheet-level `contactDetails` | Yes | From intake |
| Sheet-level `wording` / disclosures | Yes | Client-verified; never invent legal claims |
| Logo material | Yes (when required by materials/CERT) | Approved identity |

**Do not** implement a general pricing engine, tax math, or package configurator.

---

## 6. Missing-price behavior (fail-closed vs allowed)

| Situation | Required behavior |
|-----------|-------------------|
| `priceMode=listed` and price text missing/blank | **Fail-closed** |
| `priceMode=omitted` (customer legitimately supplied no price) | **Allowed** — render name (+ description); **no** price cell; **no** invented filler |
| Customer explicitly supplied “contact for pricing” (or equivalent authorized line) → `contact_for_pricing` | **Allowed** — render **exact** customer text |
| Malformed / contradictory mode (e.g. `omitted` but price text present, or `listed` with whitespace-only) | **Fail-closed** |
| Invented placeholder (“$99”, “TBD”, “Call us”, “contact for pricing”) not in customer truth | **Fail-closed** |
| Blank price cell drawn for visual balance when omitted | **Forbidden** — that is fake money theater |

**Rule:** Missing truth must never become fake money or fake pricing language.

---

## 7. Layout reuse classification

| Need | Class |
|------|-------|
| ≤10 service rows on portrait CERT canvas | **REUSE** |
| Brief descriptions | **REUSE** |
| Optional pricing column / trailing price when present | **SMALL EXTENSION** (hide price when `omitted`) |
| Headings / business title / sheet chrome | **REUSE** (flyer/menu header patterns) |
| Contact + disclosure footer/block | **REUSE** (flyer/card contact + menu footer honesty) |
| Forced two-column menu packing | **Not required** — prefer simpler bounded single-column unless proof shows need |

---

## 8. Density finding

| Topic | Finding |
|-------|---------|
| Contract max | **10** services |
| Menu proven max | **30** items / 5 sections |
| New density system needed? | **No** |
| Two-column mandatory? | **No** — do not over-engineer; reuse is the goal |
| Overflow posture | Keep fail-closed overflow/clipping gates from menu spine |

---

## 9. QA delta

Service-sheet QA should verify (future proof — not implemented here):

| Check | Required |
|-------|----------|
| All supplied services represented | Yes |
| Names exact | Yes |
| Descriptions exact where supplied | Yes |
| Listed prices exact to customer text | Yes |
| “Contact for pricing” **only** when authorized by input truth | Yes |
| No invented prices / pricing language | Yes |
| Omitted-price rows show **no** fabricated price | Yes |
| No omitted rows | Yes |
| No clipping / overflow | Yes |
| Readable typography (existing floors) | Yes |
| Correct portrait dims + PNG/PDF | Yes |
| Contact + client wording present when supplied | Yes |
| Logo identity binding | Yes (CERT/class pattern) |

---

## 10. Dispatch delta (not changing now)

To move `v2-rtu-service-sheet` from Canva → `studio_design_renderer` **later** (after Owner-authorized proof), would eventually need:

| Piece | Change |
|-------|--------|
| `sku-overrides.ts` | `primaryTool` → `studio_design_renderer` (menu/flyer/card pattern) |
| Truth mapper | Intake `services` / contact / wording → service-sheet truth (optional pricing modes) |
| Hook + idempotency | Additive service-sheet hook (do not mutate menu hook) |
| Observer allow-list | Add SKU gate |
| Pipeline | Bounded list render + QA + identity receipts |

**This package changes none of the above.** Executor remains **Canva**.

---

## 11. Downstream reuse

Optional-pricing truth (`listed` / `contact_for_pricing` / `omitted`) would later help:

| SKU | How |
|-----|-----|
| Promo / social RTU assets | Offer lines sometimes omit price; must not invent |
| `ma-001` pack items | Mixed assets with uneven pricing presence |
| Update-path copy for existing sheets | Refresh prices only when customer supplies replacements |

Do **not** implement those SKUs here.

---

## 12. Owner-independence / Canva / Make / protection

| Lock | Status |
|------|--------|
| Owner production target | **NONE** (Machine path goal; not claimed until proof+hook seal) |
| `v2-rtu-service-sheet` executor today | **Canva** (unchanged) |
| Make | **NOT REQUIRED NOW** |
| Flyer lane | **Unchanged** |
| Card lane | **Unchanged** |
| Menu lane | **Unchanged** (do not loosen menu required-price rules) |
| Remaining design SKUs | **Unchanged** |

---

## 13. Delta verdict

# SERVICE-SHEET DELTA B — SMALL EXTENSION

**Why not A:** Sealed menu requires a price (with digit) on every row. Service-sheet catalog + intake make prices optional and authorize a customer-supplied “contact for pricing” line. That is a real truth-model extension.

**Why not C:** Same portrait plate, single surface, ≤10 rows (under menu density), PNG/PDF, list packing, identity/QA patterns — no new canvas, set architecture, or density system.

**Why not D:** Current renderer spine is suitable with the bounded pricing modes above.

---

## 14. Risks

| Risk | Mitigation for next package |
|------|-----------------------------|
| Renderer falls back to “contact for pricing” on blanks | Explicit `priceMode`; omit ≠ contact; tests for both |
| Loosening menu required-price by “sharing” types carelessly | Additive service-sheet truth types; menu stays sealed |
| Forcing menu two-column look onto a light sheet | Prefer simple bounded layout; visual Owner gate |
| Treating CERT fixture prices as mandatory for all jobs | Fixture ≠ contract; optional prices remain optional |
| Inventing price ranges / CTA pricing copy | Exact customer text only |

---

## 15. Git state

| Field | Value |
|-------|--------|
| HEAD | `a92947a156fee54a25916da5803c9224ba1ed350` |
| Branch | `operating/design-renderer-proof-1` |
| Ahead/behind | `0/0` |
| This package | Inspection report only under `docs/launch/studio-operating-design-service-sheet-delta-1/` |
| Commit / push / merge | **None** |

---

## 16. Exactly one recommended next step

**Owner/Manager accept SERVICE-SHEET DELTA B**, then authorize **`STUDIO-OPERATING-DESIGN-SERVICE-SHEET-PROOF-1`** — implement additive service-sheet truth + optional-pricing modes + bounded list render on the sealed portrait spine; prove ≤10 services with (a) listed prices, (b) customer-explicit contact-for-pricing, and (c) omitted-price rows — **no Canva remap until Owner accepts proof**, **no Make**, **no flyer/card/menu edits**.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
