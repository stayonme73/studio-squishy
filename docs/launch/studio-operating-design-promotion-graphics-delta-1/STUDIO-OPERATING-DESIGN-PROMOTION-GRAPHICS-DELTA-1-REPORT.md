# STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-DELTA-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-DELTA-1  
**Mode:** Inspection only — no implementation · no primaryTool remap · no proof start · no sealed-lane edits  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### PROMOTION-GRAPHICS DELTA B — SMALL EXTENSION

`v2-rtu-promotion-graphics` is not “two anonymous images.” It is a **bounded campaign set**: exactly two coordinated static graphics for one campaign, each with one agreed format/use, sharing brand + campaign truth, with set-level consistency QA — while remaining two semantically distinct artifacts under one job/dispatch.

Individual surfaces can reuse sealed flyer (portrait promo hierarchy) and card (landscape plate + multi-surface capture orchestration). What is genuinely new is **set orchestration + per-asset purpose/dimension binding + multi-asset consistency** — not a new visual language and not an unlimited N-asset pack engine.

Not A: card front/back ≠ independent campaign assets with possibly different dims/uses.  
Not C: no new product category; CERT already defines min/max=2 + multi-asset gates; compose primitives exist.  
Not D: Machine direct orchestration (card-like dual capture under one job) remains suitable.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `fce3c289dae50e5ff64ded8eb25a3cc4662c1961` |
| Branch | `operating/design-renderer-proof-1` |
| Ahead/behind vs origin | `0/0` |
| Control match | **CONTROL_MATCH** |
| Sealed lanes (do not touch) | `v2-rtu-flyer` · `v2-rtu-business-card` · `v2-rtu-menu` · `v2-rtu-service-sheet` |
| Candidate | `v2-rtu-promotion-graphics` |
| Current executor | **Canva** (`marketing_assets` family default; override has no `studio_design_renderer` remap) |

---

## 2. Authoritative SKU contract

Authorities: `src/catalog/v2/batch1-ready-to-use.ts`, `src/catalog/intake/schemas.ts` (`rtu-promotion-graphics`), `src/catalog/route-map-v2-launch.ts`, `src/lib/studio-kitchen-production/sku-overrides.ts`, `src/lib/studio-kitchen-production/cert-design/artifact-registry.ts`, `src/lib/studio-kitchen-production/design-quality/*`.

### Promise (exact)

| Topic | Authoritative truth |
|-------|---------------------|
| Client name | Make My Campaign Graphics |
| Exact graphic count | **2** (`campaign_graphic.quantity: 2`; exclusion: “More than 2 campaign graphics”) |
| Both always required? | **Yes** — promise is two coordinated graphics; CERT `minAssets: 2`, `maxAssets: 2` |
| Campaign scope | **One** campaign, event, offer, or launch — same campaign theme (exclusion: multiple campaigns/themes) |
| Captions | **None** (exclusion: social post sets or captions) |
| Per-graphic format/use | **One agreed format/use per graphic** (deliverable label) |
| Multiple size sets per graphic | **Forbidden** (exclusion: “Multiple size sets or format versions per graphic”) |
| Not this SKU | Flyers, menus, service sheets, handouts; video/motion; photography/custom illustration; posting/scheduling; editable sources; print fulfillment |
| Distinct from | `rm-j005` published landing page (static graphics only) |
| Revision | One revision round |
| Turnaround | Within 3–5 business days (catalog timing label) |
| Price | $79 working launch (`7900` cents) |
| Client distributes | Print, social, email, or other — client’s printer/platform/account |

### Dimensions / orientation

| Source | What it says |
|--------|----------------|
| Catalog deliverable | “one agreed format/use per graphic” — **no fixed W×H pair in catalog** |
| Intake | Single optional `sizeNotes` (“Required size or format, if known”); single required `intendedUse` select: Print · Social · Email · In-store · Other |
| CERT registry | **No** `expectedWidthPx` / `expectedHeightPx` for this SKU |
| CERT fixture-b evidence | **Mixed dims**: asset1 **1024×1024 square**, asset2 **1024×1536 portrait** |

**Do not invent** Instagram/Facebook/ad-network sizes. Formats must come from customer-authorized agreement (intake `sizeNotes` / future per-asset format fields) or from locked Machine plates chosen in a later proof package — not from Scout guesses.

### Output formats

- One finished file per graphic — **print-ready PDF and/or PNG or JPG** (catalog)
- Production override: Canva formats — “Two campaign graphics”
- Editable source files **not** included

### Customer inputs (intake + catalog TBD)

Required intake today:

1. Campaign, offer, event, or launch focus  
2. Exact copy that must appear  
3. Dates, deadlines, or event details  
4. CTA / link / phone / QR destination  
5. Logo, photos, colors, or brand references (materials role)  
6. Intended use (single select for the job)

Optional: size/format notes; required wording/disclosures (customer-supplied).

### Brand / QA / review expectations

| Topic | Truth |
|-------|--------|
| Brand | Logo/materials required; CERT `requireLogoVariant: true` |
| Multi-asset QA | CERT `requireMultiAssetConsistency: true` |
| Design-quality gates already defined | Brand identity lock; campaign truth lock; logo variant set; offer/price/date/phone set presence; bundle inclusions when claimed; artifact binding (sha256); visual attestations including `multiAssetConsistencyReviewed` |
| Closeout ledger | “Two campaign graphics (static; distinct from rm-j005 page)” |
| Delivery | Client-facing files for customer distribution — Studio does not post/print |

### Intake gap (must not paper over)

Current intake has **one** `intendedUse` and **one** optional `sizeNotes`, while the deliverable promises **per-graphic** format/use. Delta for a future proof must bind **each** asset to an authorized purpose + agreed plate — either by extending intake or by an explicit customer-authorized pair recorded into job truth. Do not invent a second use silently from “Social” alone.

---

## 3. Proven renderer baseline (four sealed lanes)

| Proven | Source |
|--------|--------|
| Portrait single-surface (1024×1536) | Flyer · Menu · Service sheet |
| Landscape single-surface (1536×1024) | Business card |
| Front/back paired surfaces (same plate) | Business card |
| Promotional hierarchy | Flyer |
| Structured list layouts | Menu · Service sheet |
| Logo / material binding | All four |
| PNG / PDF | All four |
| Artifact identity / hashes | All four |
| Immutable versioning | All four |
| Idempotent observer execution | All four |
| Fail-closed QA | All four |
| Owner production = NONE | All four |

**Not proven:** square production plate; independent multi-asset campaign sets; per-asset purpose registry beyond card `front`/`back`; set-level fail-closed completion for two independent campaign graphics.

---

## 4. Campaign-set truth delta

### Required shape (minimum durable model — not implemented)

```
campaignSet (sku: v2-rtu-promotion-graphics)
├── sharedCampaignIdentity
│   ├── campaignFocus / offer / dates / CTA / disclosures (customer-authorized)
│   ├── brandIdentity + materialFingerprint
│   └── campaignTruth lock (offer/price/date/contact tokens as applicable)
├── asset[0]
│   ├── assetId (semantic, not "graphic1")
│   ├── purpose / agreedUse
│   ├── agreedPlate (width×height) OR fail-closed if missing
│   ├── content roles (copy hierarchy for this use)
│   └── perAssetSpecFingerprint
└── asset[1]
    └── (same fields)
```

Bound: **exactly two** assets. Do **not** generalize to unlimited packs (`ma-001`) in this SKU’s model.

### Shared vs per-asset

| Concern | Shared | Per-asset |
|---------|--------|-----------|
| Campaign / offer truth | Yes | May emphasize differently; must not contradict |
| Brand / logo / materials | Yes | Placement/scale may adapt |
| Purpose / use | — | **Required** (catalog: one agreed format/use each) |
| Dimensions | — | **Required agreed plate each** (may match or differ) |
| Content composition | Theme shared | Layout adaptation to plate/use |
| Consistency QA | Set-level | Each asset also independently QA-pass |

### Card front/back is **not** this model

| Card | Promotion graphics |
|------|--------------------|
| One physical identity piece | Two independent campaign graphics |
| Fixed same landscape plate | Agreed format/use per graphic; CERT shows mixed dims |
| Sides: `front` / `back` | Purposes: customer-authorized uses (print/social/email/in-store/other + size) |
| Multi-page PDF of faces | Two deliverable files (+ optional combined package later) |

---

## 5. Mixed-dimension delta

| Question | Finding |
|----------|---------|
| May both graphics share dimensions? | **Yes** — contract allows; not forbidden |
| May they differ? | **Yes** — CERT fixture-b uses square + portrait |
| Customer-selected? | **Yes, when known** — intake `sizeNotes`; catalog “if known” |
| Contract-defined fixed pair? | **No** — no locked W×H pair in catalog/CERT registry |
| Invent platform sizes? | **Forbidden** |

**CERT evidence:** `promo-b-1` = 1024×1024; `promo-b-2` = 1024×1536. Registry does not assert a single expected size.

### Classification (mixed dimensions alone)

**SMALL EXTENSION**

- Reuse portrait plate (proven) and landscape plate (proven) when those are the agreed formats.  
- Differing plates under one job = orchestration + validation extension.  
- **Nested plate gap:** square (1024×1024) appears in CERT fixture and is **not** a sealed production plate yet. Introducing square as an allowed agreed plate is a narrow plate addition inside this B — it must be explicit in proof, not smuggled.  
- Do not treat “any ad-network size” as in-scope.

---

## 6. Multi-asset consistency requirements

“Coordinated” under the actual promise = **same campaign theme** + related brand presentation + non-contradictory facts — **not** pixel-identical clones.

### Bounded consistency checks (align with existing design-quality + visual judgment)

| Check | Bound |
|-------|--------|
| Same campaign / offer truth | Shared `campaignTruth`; no contradictory price/offer/date/CTA |
| Coherent color / brand use | Shared palette/brand lock; creative variation allowed |
| Logo / material consistency | Approved logo variant on each asset; binding hashes |
| Typography family / roles | Related family/roles; hierarchy may adapt to plate |
| Visual relationship | Attestation: looks like one campaign (layout variation OK) |
| No contradictory copy | Fail-closed on conflicting facts |
| Intentional adaptation to each plate | Expected — related, not cloned |

Existing CERT evaluator already fails multi-asset jobs without brandIdentity/campaignTruth, unapproved logos, missing set-level price/phone/date tokens, and offer mutations. Future Machine lane should **bind** to that seam — not invent a second consistency philosophy.

Attestation already named: `multiAssetConsistencyReviewed` — “same brand + campaign truth with allowed creative variation.”

---

## 7. Per-asset purpose model

Catalog: **one agreed format/use per graphic.**

Recommended durable semantics (names illustrative — lock in proof/contracts, not here):

| Field | Rule |
|-------|------|
| `assetId` | Stable semantic id (e.g. `campaign-graphic-a` / `campaign-graphic-b`) |
| `agreedUse` | Customer-authorized use category (from intake options or explicit per-asset authorization) |
| `agreedPlateId` | Bound plate (e.g. portrait CERT / landscape CERT / square CERT when authorized) |
| Output filenames | Derived from assetId + use — **not** anonymous `graphic1.png` / `graphic2.png` without identity metadata |

**Intake honesty:** today’s form has one job-level `intendedUse`. Future truth mapping must not invent a second purpose. If both assets share one authorized use but different agreed sizes, purpose may match while plates differ — still bind each asset’s plate + use explicitly.

---

## 8. Design-spec delta

**Prefer:** one campaign-set specification wrapping two bounded per-asset specs under shared campaign/brand truth.

| Approach | Verdict |
|----------|---------|
| Two unrelated jobs | Reject — breaks one-SKU / one-campaign promise |
| Unlimited N-asset pack engine | Reject — out of SKU bound (`ma-001` later) |
| Shared campaign truth + two asset specs | **Accept** — minimum structure |
| Reuse flyer/card layer vocab per asset | Prefer — avoid new visual primitives |

Card’s `front`/`back` under one spec is the closest sealed pattern; promo needs **purpose + plate per asset** instead of side ids, and must allow **different canvases**.

---

## 9. Rendering delta

| Capability | Status |
|------------|--------|
| Render one portrait promo surface | Proven (flyer) |
| Render one landscape surface | Proven (card) |
| Capture two surfaces under one pipeline | Proven pattern (card front+back) |
| Mixed canvas sizes in one job | **New orchestration** |
| Square plate render | **Not sealed** (needed if agreed format is square / CERT parity) |
| New decorative primitives | **Not required** for delta |

**Primary extension:** orchestration of two renders + shared campaign truth + coordinated QA — **not** inventing new visual chrome.

Machine direct orchestration still fits (sequential dual capture like card, with per-asset canvas). No Make required for coordination.

---

## 10. Artifact identity delta (future structure — not implemented)

Minimum durable identity for a successful set:

| Field | Role |
|-------|------|
| `jobId` / `dispatchId` | Job spine |
| `skuId` | `v2-rtu-promotion-graphics` |
| `campaignSetRenderVersion` | Immutable set version `vN` |
| `sharedSpecFingerprint` | Shared campaign + brand + materials binding |
| `materialFingerprint` | Logo/materials |
| `assetA` | purpose, plate, `specFingerprint`, PNG/PDF hashes, paths |
| `assetB` | same |
| `qaResult` | per-asset QA + set consistency — success only if set complete |

`current-identity` should point at the successful **set** version (with both asset identities nested), analogous to card’s single identity covering front+back outputs.

---

## 11. Idempotency / versioning delta

| Scenario | Recommended simplest truthful model |
|----------|-------------------------------------|
| Same dispatch + same shared + per-asset fingerprints | **ALREADY_RENDERED** → reuse exact successful **set** identity |
| Change to shared campaign/brand/materials truth | New immutable **set** `vN+1` (both assets regenerated) |
| Change to **one** asset’s authoritative purpose/plate/content | New immutable **set** `vN+1` — **whole set versions together** |

**Why whole-set versioning:** the SKU promise is a coordinated pair. Partial asset versioning risks a mismatched set (A@v3 + B@v1) presented as one delivery. Card already versions the dual-surface product as one render version. Keep that lineage honesty.

Do not implement here.

---

## 12. Failure semantics

Both graphics are promised → **set incomplete unless both required assets pass.**

| Case | Required behavior |
|------|-------------------|
| A succeeds / B fails | **Fail-closed at set** — do not mark SKU complete; do not publish partial pair as success |
| B succeeds / A fails | Same |
| One asset fails design QA | Set fails |
| Shared campaign truth invalid | Set fails before/without durable success identity |
| One asset stale materials / binding mismatch | Set fails |
| Set consistency fails while singles “look fine” | Set fails |

Partial files on disk for debugging are allowed; **customer-success / dispatch success** requires both + set QA.

---

## 13. QA delta (what a future proof must prove)

| Gate | Level |
|------|-------|
| Exactly two assets | Set |
| Each asset matches agreed dimensions/plate | Per-asset |
| Each asset bound to purpose/use | Per-asset |
| Required content / materials present | Shared + per-asset as applicable |
| Shared campaign truth consistent | Set |
| No contradictory pricing/offer/copy | Set |
| No clipping/overflow | Per-asset |
| Each asset independently passes design QA | Per-asset |
| Set-level multi-asset consistency passes | Set |
| Logo/material binding hashes | Per-asset + shared |
| No captions / not a social-post set | Set honesty |
| Not flyer/menu/service-sheet substitute | Scope honesty |

---

## 14. Owner-independence

Any future lane must preserve:

**Routine Owner production = NONE**

Owner must not manually: resize, duplicate-and-edit, pair assets in Canva, regroup files, invent the second format, or operate Make.

---

## 15. Canva / Make status

| Item | Status |
|------|--------|
| `v2-rtu-promotion-graphics.primaryTool` | **Unchanged** — remains Canva / family baseline |
| Canva remap in this package | **None** |
| Make | **NOT REQUIRED NOW** |
| Direct Machine orchestration fit | **Yes** — dual bounded captures under one job (card-like), plus set QA; no Make bus required for two-asset coordination |

---

## 16. Downstream reuse (do not migrate)

| SKU | How promo-set muscle reduces future delta |
|-----|-------------------------------------------|
| `v2-rtu-social-posts` | Reuses campaign-set orchestration, multi-asset consistency, whole-set versioning/fail-closed. **Still remaining:** square×**4**, caption file, posting-order doc → remains larger (C) until those are addressed. |
| `ma-001` | Reuses set consistency + per-asset purpose/plate binding. **Still remaining:** variable 1–4 count, broader mixed shapes/pack semantics. |

---

## 17. Sealed-lane protection

| Lane | This package |
|------|----------------|
| Flyer | Untouched |
| Business card | Untouched |
| Menu | Untouched |
| Service sheet | Untouched |

No production-lane code changes in this inspection.

---

## 18. Delta verdict (locked for this package)

### PROMOTION-GRAPHICS DELTA B — SMALL EXTENSION

| Bucket | Classification |
|--------|----------------|
| Overall SKU delta | **B — SMALL EXTENSION** |
| Mixed dimensions | **SMALL EXTENSION** (with explicit nested square-plate gap if CERT parity / social use requires square) |
| Multi-asset consistency | **SMALL EXTENSION** (CERT/design-quality seam exists; Machine lane must bind it) |
| Campaign-set orchestration | **SMALL EXTENSION** (beyond card faces) |
| Unlimited pack engine | **Out of scope** |

---

## 19. Risks

| Risk | Mitigation in next packages |
|------|-----------------------------|
| Treating card faces as sufficient set muscle | Keep independent assetIds + purposes + possibly different plates |
| Inventing ad-platform sizes | Fail-closed without customer-authorized agreed plate |
| One job-level `intendedUse` silently split into two purposes | Require explicit per-asset authorization in truth mapping |
| Partial success (one PNG ships) | Set-level fail-closed |
| Per-asset version forks | Whole-set immutable versioning |
| Smuggling square without QA | If square is in-scope for proof, certify the plate explicitly |
| Scope creep to `ma-001` / social captions | Hard-bound maxAssets=2; no captions |

---

## 20. Git state

| Field | Value |
|-------|--------|
| HEAD | `fce3c289dae50e5ff64ded8eb25a3cc4662c1961` |
| Branch | `operating/design-renderer-proof-1` |
| Tracking | `origin/operating/design-renderer-proof-1` · ahead/behind **0/0** |
| This package | Inspection report only under `docs/launch/studio-operating-design-promotion-graphics-delta-1/` |
| Commit | **None** |
| Push | **None** |
| Merge | **None** |
| Executor mappings changed | **None** |

---

## 21. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-PROOF-1`**

Proof-only package for `v2-rtu-promotion-graphics` under the sealed design-renderer spine — implement bounded campaign-set truth (exactly two assets), per-asset purpose + agreed plates (no invented sizes), dual render orchestration, set-level fail-closed QA/consistency, and durable set identity — **without** remapping `primaryTool`, **without** Make, **without** sealed-lane mutations, **without** generalizing to N-asset packs.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
