# STUDIO-OPERATING-DESIGN-BUSINESS-CARD-DELTA-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-BUSINESS-CARD-DELTA-1  
**Mode:** Inspection only — no implementation  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### DELTA B — SMALL EXTENSION

`v2-rtu-business-card` can reuse the sealed flyer renderer **architecture** (bounded design spec → HTML/CSS → Playwright PNG/PDF → artifact identity/hash → design QA → durable truth). It cannot reuse the sealed flyer lane **as-is**.

Narrow, bounded additions are required — principally **landscape canvas**, **card contact truth / text roles**, and **double-sided (front + back) composition/export**. No bleed / trim / CMYK / printer-vendor stack is promised by the SKU contract and must not be invented.

---

## Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `4a48c9893174b05db65083ccad630852c2d0713f` |
| Branch | `operating/design-renderer-proof-1` |
| Ahead/behind vs origin | `0/0` |
| Sealed control | **V2-RTU-FLYER OWNER-INDEPENDENT AUTO-PRODUCTION READY** |
| Package seal | STUDIO-OPERATING-DESIGN-FLYER-AUTO-PRODUCTION-1 |

---

## Business-card SKU contract

**Authorities inspected (no invention beyond these):**

| Source | Role |
|--------|------|
| `src/catalog/v2/batch1-ready-to-use.ts` (`v2-rtu-business-card`) | Customer promise / deliverables / exclusions |
| `src/catalog/intake/schemas.ts` (`rtu-business-card`) | Required intake fields |
| `src/catalog/route-map-v2-launch.ts` | Customer purpose line |
| `src/lib/studio-kitchen-production/sku-overrides.ts` | Production method (today) |
| `src/lib/studio-kitchen-production/closeout/ledger.ts` | Closeout deliverable honesty |
| `src/lib/studio-kitchen-production/cert-design/*` | CERT plate + QA evidence class |

### Promise summary

| Topic | Contract truth |
|-------|----------------|
| Customer name | Make Me a Business Card |
| Price | $49 (catalog) |
| Design | **One double-sided** business card design — design only; one person/version; **one agreed size** |
| Outputs | **Print-ready PDF** + **digital PNG or JPG preview** + QC review + one design direction |
| Printing | **Excluded** — printing, shipping, physical production |
| Logo | Logo **creation** excluded; customer supplies logo/brand colors |
| Revisions | One revision round max |
| Editable sources | Excluded |
| Multiple sizes / employees | Excluded |
| Client note | Customer prints/distributes through own printer/channels (`RTU_PRINT_CLIENT_NOTE`) |
| Purpose line | “One double-sided business card design — design only, not printing or shipping.” |

### Intake (required vs optional)

| Field | Required |
|-------|----------|
| Business name | Yes |
| Name and title | Yes |
| Phone | Yes |
| Email | Yes |
| Website or social | Optional |
| Address | Optional |
| Logo / brand color references (materials) | Yes |
| Preferred card size | Optional (“if known”) |

### Dimensions / orientation / sides

| Topic | What the contract actually says |
|-------|----------------------------------|
| Exact px / inches | **Not fixed in catalog** — “one agreed size” + optional preferred size |
| Orientation | Not named in catalog; CERT-DESIGN evidence plate used **landscape 1536×1024** |
| Front / back | Catalog promises **double-sided**; does not specify back content fields |
| Bleed / trim / crop marks | **Not promised** |
| CMYK / DPI / printer ICC | **Not promised** |
| “Print-ready PDF” | Means a PDF the customer can take to their own printer — **not** Studio print fulfillment |

### Current production executor (pre-migration)

| Topic | Today |
|-------|--------|
| Family baseline | Canva (manual operational) |
| `primaryTool` | Still **`canva`** (flyer alone retargeted to `studio_design_renderer`) |
| Closeout | CUSTOMER READY WITH LIMITS — DESIGN; Owner routine **NONE**; limitation notes include manual Canva path |
| CERT | Harbor card V3 PNG landscape; design QA tested; **minAssets/maxAssets = 1** in cert registry (single face evidence historically) |

**Honesty note for later proof (not a contract rewrite):** CERT-DESIGN accepted a **single** landscape PNG for a SKU that catalogs as **double-sided**. Any Owner-independent Machine proof must either (a) produce **front + back** truthfully, or (b) obtain an explicit Owner limits decision — do not silently ship single-face as full double-sided fulfillment.

---

## Flyer capability baseline (sealed)

| Capability | Sealed flyer lane |
|------------|-------------------|
| SKU lock | `skuId === "v2-rtu-flyer"` only (`DESIGN_RENDERER_PROOF_SKU`) |
| Canvas | Portrait **1024×1536** (hard-validated) |
| Design spec | `FlyerDesignSpec` — flyer text roles (offer/price/dates/CTA/disclaimer…) |
| Project truth | Offer / campaign flyer fields (`FlyerProjectTruth`) |
| Sides | **Single-sided** (flyer exclusions explicitly forbid double-sided flyer) |
| Render | HTML/CSS absolute layers |
| Export | One PNG + one single-page PDF via Playwright (`captureFlyerExports` accepts optional W/H) |
| Materials | Approved logo material + content hash |
| QA | Design-quality gate + overflow clip check; flyer hierarchy notes |
| Dispatch | Flyer-only observer → hook → idempotency → durable receipts |
| Owner | Routine production **NONE** |
| Canva | **OFF** fulfillment spine for flyer |
| Make | **NOT REQUIRED NOW** |

Architecture pattern is SKU-shaped composition + flattened export — not Canva-dependent.

---

## Design-spec delta

| Need | Flyer today | Card need | Delta |
|------|-------------|-----------|-------|
| `skuId` | Locked to flyer | Must accept `v2-rtu-business-card` (or sibling card spec) | **Extension** |
| Canvas | 1024×1536 portrait only | Landscape plate (CERT **1536×1024**) / one agreed size | **Extension** |
| Text roles | Offer/price/CTA-centric | Contact identity: business name, person name/title, phone, email, web, optional address | **Extension** |
| Layer roles | Flyer shape roles | Same primitives (text/image/shape) likely sufficient | Reuse |
| Materials | Logo (+ optional hero) | Logo primary; no hero required by intake | Reuse / narrow |
| Multi-face | One canvas / one layer stack | Front + back specs (or multi-page design object) | **Extension** |
| Output formats | png + pdf | PDF + PNG (JPG optional — PNG satisfies “PNG or JPG”) | Reuse |

**Cannot represent the card without material changes to the sealed flyer-only spec/types/validation.** A bounded card spec (or generalized multi-SKU design-spec with card profile) is required — not a silent reuse of `FlyerDesignSpec` as named.

---

## Renderer delta

| Need | Flyer today | Card need | Delta |
|------|-------------|-----------|-------|
| HTML compositor | Absolute positioned layers | Same mechanism | Reuse |
| Landscape layout reasoner | Flyer deterministic/Anthropic paths encode portrait flyer hierarchy | Card contact hierarchy + dual faces | **Bounded new reasoner/profile** |
| Overflow / clip check | Single canvas | Per-face | Small extension |
| Fixture-leak rejection | Customer mode | Same doctrine | Reuse |

No new “design tool” is required. Layout intelligence must be **card-shaped**, not flyer-offer-shaped.

---

## Export / print delta

| Need | Contract | Flyer baseline | Delta |
|------|----------|----------------|-------|
| PNG (or JPG) preview | Required (PNG **or** JPG) | PNG | Reuse (PNG sufficient) |
| Print-ready PDF | Required | Single-page PDF | **Extend to front+back** (typically 2-page PDF and/or two PNG faces) |
| Bleed / trim / CMYK / DPI | **Not in contract** | Not implemented | **Do not add** |
| Physical print/ship | Excluded | N/A | None |

“Print-ready” here is the same honesty class as the flyer PDF: flattened digital file for customer print — **not** a print-shop imposition package.

---

## Materials delta

| Need | Card | Flyer lane | Delta |
|------|------|------------|-------|
| Approved logo | Required (no logo creation) | Required + approved identity | Reuse pattern |
| Brand colors | Intake materials | Brand color fields on truth | Reuse / map from intake |
| Hero imagery | Not required by card intake | Optional flyer hero | None required |
| Missing material fail-closed | Required for Owner-independence | Existing | Reuse |

---

## QA delta

| Topic | Flyer / shared | Card-specific |
|-------|----------------|---------------|
| Design-quality gate | Shared CERT class | Already has card case (contact tokens, landscape dims, logo variant) |
| Hierarchy | Offer → price → CTA | Contact identity / readability on small plate |
| Contact semantics | Flyer phone/web | Phone + web presentation; name/title accuracy |
| Dual-face | N/A | **Both faces must be QA-bound** if double-sided promise is kept |
| Overflow | Single canvas | Per face |
| Fixture leak | Customer mode | Same |

Existing flyer QA notes must **not** be retargeted blindly. Card QA should follow CERT contact/logo patterns, extended for **front+back** when Machine-fulfilling double-sided.

---

## Dispatch delta (eventual — not implementing)

To move this SKU from Canva executor reference to `studio_design_renderer` **later** (Owner-authorized package only):

| Surface | Today | Eventual change |
|---------|-------|-----------------|
| `sku-overrides` `primaryTool` | Family Canva baseline | Retarget **card only** to `studio_design_renderer` (flyer pattern) |
| Observer | `skuId === v2-rtu-flyer` | Add card SKU gate (or shared allowlist) — **without** weakening flyer-only behavior |
| Hook | Flyer-only | Card invoke path / shared hook with SKU switch |
| Job-truth mapper | `map-flyer-job-truth` | New `map-business-card-job-truth` from `rtu-business-card` intake |
| Idempotency | Flyer fingerprints | Same lock pattern; card face fingerprints included |
| Other 11 design SKUs | Untouched | Stay untouched |

**This inspection does not perform any of those changes.**

---

## Owner-independence

| Rule | Status for this delta |
|------|------------------------|
| Routine Owner production | Must remain **NONE** |
| Tagia does not design / export / open Canva / copy artifacts | Preserve |
| Failures fail-closed; not routine Owner work | Preserve |

DELTA B is compatible with Owner-independence **if** dual-side + card truth are Machine-produced.

---

## Canva / Make status

| System | Status for this inspection |
|--------|----------------------------|
| Canva | Remains current executor reference for card **until** a future authorized migration; **must stay OFF** any new Machine-renderer path (same doctrine as flyer) |
| Make | **NOT REQUIRED NOW** — do not add |
| This package | No Canva/Make changes |

---

## Flyer protection

| Lock | Confirmed |
|------|-----------|
| No edits to sealed flyer renderer / hook / observer / QA / idempotency | **Yes — inspection only; zero code changes** |
| No second-SKU migration in this package | **Yes** |
| Flyer remains sole auto-production design SKU | **Yes** |

---

## Delta classification

# DELTA B — SMALL EXTENSION

**Why not A (reuse only):** Flyer-only SKU/canvas/role locks; single-sided export; offer-centric truth cannot truthfully express double-sided contact card.

**Why not C (material new capability):** Same operating spine; same compositor primitives; same PNG/PDF capture approach; same materials/hash/QA doctrine. Additions are bounded profiles + dual-face export — not a new executor class.

**Why not D (unsuitable):** Architecture can honestly deliver design-only card files without Canva/Make once dual-side + card truth exist. Contract does not demand print-shop engineering the renderer lacks.

---

## Risks

1. **Double-sided honesty** — CERT historically bound one face; Machine proof must not claim double-sided while emitting one face.
2. **“Agreed size” ambiguity** — Catalog does not freeze inches/px; proof should lock one agreed plate (CERT landscape is the existing evidence plate) and document limits.
3. **Back-side content** — Intake fields are front-contact heavy; back content rules are underspecified — Owner/proof package must define bounded back behavior (e.g. logo + wordmark + optional URL) without inventing new catalog promises.
4. **Scope creep** — Bleed/CMYK/trim marks are **not** contract requirements; adding them would falsely inflate to DELTA C.
5. **Flyer contamination** — Implementing card by mutating flyer-only types/gates risks breaking the sealed lane; prefer additive card profile + shared primitives.
6. **Dispatch premature retarget** — Changing `primaryTool` before card renderer proof would route ready jobs into an unfinished path.

---

## Git state

| Check | Value |
|-------|--------|
| HEAD | `4a48c9893174b05db65083ccad630852c2d0713f` |
| Origin HEAD | `4a48c9893174b05db65083ccad630852c2d0713f` |
| Ahead/behind | `0/0` |
| Commit / push / merge | **NONE** (inspection only) |
| Code changes to sealed flyer stack | **NONE** |
| Untracked local noise | Present (prior Canva/tool-coordination docs, local flyer render churn) — **not part of this package** |

---

## Exactly one recommended next step

**Owner/Manager review this DELTA B report and authorize a single bounded package to add card landscape canvas + front/back export + card project-truth/QA on top of the sealed renderer architecture — without modifying the sealed flyer auto-production lane and without retargeting dispatch `primaryTool` until that proof passes.**

Suggested package name for that authorization (not started):  
`STUDIO-OPERATING-DESIGN-BUSINESS-CARD-PROOF-1`

---

## Final status

**READY FOR OWNER REVIEW**

**Scout PARKED**
