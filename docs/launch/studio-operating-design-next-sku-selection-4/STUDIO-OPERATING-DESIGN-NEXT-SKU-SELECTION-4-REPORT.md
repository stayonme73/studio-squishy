# STUDIO-OPERATING-DESIGN-NEXT-SKU-SELECTION-4 REPORT

**Package:** STUDIO-OPERATING-DESIGN-NEXT-SKU-SELECTION-4  
**Mode:** Inspection only — no implementation · no migration · no executor remapping · no proof start  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### Selected SKU #6: `v2-rtu-social-posts` (Make My Social Media Posts)

**DELTA B — SMALL EXTENSION**

Against the sealed five-lane baseline (flyer · business-card · menu · service-sheet · **promotion-graphics**), the previous **C** on social-posts has been partially retired:

| Prior C driver | Status after promo seal |
|----------------|-------------------------|
| Square 1024×1024 plate | **Retired** — proven by `v2-rtu-promotion-graphics` |
| First multi-asset campaign-set model | **Mostly retired** — 2-asset set, shared truth, per-asset identity, whole-set versioning, set QA are sealed |
| Exactly **4** assets | **Still new** — scale 2→4 (bounded extension of set machinery) |
| Caption file + posting-order document | **Still new** — non-graphic package beside the image set |

Honest reclass: **B**, not A (captions/order + fixed count=4 remain), not still-full-C (square + first set muscle are gone).

`ma-001` also benefits from the campaign-set muscle, but stays **C**: variable 1–4 cardinality + heterogeneous “standard-format” pack semantics are larger and less bounded than RTU social’s fixed 4× square + caption/order package.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `71f01e84ce71139c2adaf68918baa2ce9046da47` |
| Branch | `operating/design-renderer-proof-1` |
| Ahead/behind vs origin | `0/0` |
| Control match | **CONTROL_MATCH** |
| Control meaning | Promotion-graphics lane fully sealed — **V2-RTU-PROMOTION-GRAPHICS OWNER-INDEPENDENT AUTO-PRODUCTION READY** |
| Proven sealed lanes | `v2-rtu-flyer` · `v2-rtu-business-card` · `v2-rtu-menu` · `v2-rtu-service-sheet` · `v2-rtu-promotion-graphics` |

---

## 2. Five-lane renderer baseline (treat as proven)

| Capability | Proven by |
|------------|-----------|
| Portrait single-surface (1024×1536) | Flyer · Menu · Service sheet · Promo (portrait member) |
| Landscape rendering (1536×1024) | Business card *(promo Landscape intake still fail-closed / unproven for promo layouts)* |
| Square plate (1024×1024) | **Promotion graphics** |
| Front/back multi-surface | Business card |
| Coordinated **two-asset** campaign set | **Promotion graphics** |
| Mixed plate sets (square + portrait) | **Promotion graphics** |
| Shared campaign truth across assets | **Promotion graphics** |
| Per-asset semantic ID / purpose / plate binding | **Promotion graphics** |
| Whole-set versioning + set-level QA | **Promotion graphics** |
| Promotional hierarchy | Flyer · Promo |
| Contact identity layouts | Business card |
| Repeated structured rows / sectioned lists | Menu · Service sheet |
| Optional pricing modes | Service sheet |
| Max-density / overflow handling | Menu · Service sheet |
| PNG / PDF · hashes · identity · immutable versioning | All five |
| Idempotent hooks · observer auto-invoke | All five |
| Routine Owner production | **NONE** on sealed lanes |

**Still not proven (do not pretend):** N>2 asset sets as a sealed production contract; caption/order (or calendar) document packages; variable 1–N pack semantics; strategy documents; profile kits / field maps; edit-existing / not-from-scratch pipelines; promo Landscape **execution** (intake-recordable only).

---

## 3. Remaining design-SKU inventory

**Sealed / out of migration scope:** flyer · business-card · menu · service-sheet · promotion-graphics.  
**Out of scope:** copy (`em-*`, `cc-*`, email/SMS kits), voice, video/Shotstack, landing page (`rm-j005`).  
**Held:** `v2-rtu-handout` — noted, not a #6 candidate.

| SKU | Current executor | Artifact count | Dims / plates | Content package | Customer inputs | Outputs | QA |
|-----|------------------|----------------|---------------|-----------------|-----------------|---------|-----|
| `v2-rtu-social-posts` | Canva (`social_media` baseline) | **4** graphics + caption file + posting-order doc | CERT **square 1024×1024** ×4; one platform size | One campaign/theme; one caption per post; recommended order (not full calendar) | Theme/offer facts, platform, logo/materials, wording/hashtags, must-not-say; live UI = `SocialPostsIntakeForm` | 4× PNG/JPG + captions + order doc | Count=4; multi-asset consistency; caption/order honesty |
| `ma-001` | Canva | **1–4** | Mixed standard shapes | Heterogeneous pack (flyer/card/poster/etc. examples) | Final copy, brand, one campaign focus | Agreed digital formats ≤4 | ≤4; multi-asset consistency; final-copy honesty |
| `sm-001` / `sm-001-monthly` | Canva | **≤6** + calendar | Square / feed | Captions + simple calendar | Campaign focus, captions, calendar | Flattened posts + calendar | ≤6; no reels claim |
| `bf-001` | Canva (+ text optional) | **2+** kinds | Mixed (doc + profile/cover) | Brand Direction Sheet + graphic | Logo/refs; HEX; fonts | Direction sheet + profile/cover | Strategy honesty; no new-logo claim |
| `rm-j002` | Canva (+ text) | Multi | Avatar/banner + field map | Profile Setup Kit | Bio/about, field map, assets | Kit (not mutation) | Kit not mutation |
| `rm-j008` | Canva (+ text) | Multi | Avatar/banner + change sheet | Profile Update Kit | Revised bio + before→after | Kit | Kit not mutation |
| `rm-j007` | Canva / file edit | **1** (edit) | Matches source | Corrected named existing item | Replacement facts only | Corrected export | Named item only; no redesign |

Authorities: `batch1-ready-to-use.ts`, `services.ts`, `sku-overrides.ts`, `family-baselines.ts`, `cert-design/artifact-registry.ts`, `active-set.ts`, intake schemas.

### Coverage vs five-lane baseline

| SKU | Already covered | Genuinely new | Downstream reuse |
|-----|-----------------|---------------|------------------|
| `v2-rtu-social-posts` | Square plate; set consistency; shared campaign truth; per-asset identity; whole-set versioning/QA; hierarchy; PNG; hook/observer patterns | **4**-asset same-plate set; **caption + posting-order package**; platform-size lock; live custom intake surface | Unlocks `sm-001` / monthly |
| `ma-001` | Promo set muscle; mixed-plate *idea*; export/QA patterns | Variable **1–4**; heterogeneous pack types; “up to N” pack semantics | Broad legacy pack after RTU social |
| `sm-001` (+ monthly) | Partial social compose | ≤6 + **calendar** | After RTU social-posts |
| `bf-001` | Some graphic compose | Strategy document + dual artifact kinds | Weak into RTU print |
| `rm-j002` / `rm-j008` | Some graphic surfaces | Kit packaging + field maps | Needs kit/composer layer |
| `rm-j007` | Almost none of create-from-spec | Ingest + limited edit of existing | Separate edit path |

---

## 4. Capability-delta matrix

| SKU | Executor | Delta | Principal new capability | Risk | Downstream reuse |
|-----|----------|-------|--------------------------|------|------------------|
| `v2-rtu-social-posts` | Canva | **B** | 4-asset same-plate set + caption/order package (square + 2-asset set **reused**) | Low–med if additive | Unlocks `sm-001` |
| `ma-001` | Canva | **C** | Variable 1–4 heterogeneous pack semantics | Med–high | After RTU social set scale |
| `sm-001` (+ monthly) | Canva | **C** | ≤6 posts + calendar | Med–high | After `v2-rtu-social-posts` |
| `bf-001` | Canva (+ strategy) | **C** | Brand strategy document + dual kinds | Med | Weak RTU print reuse |
| `rm-j002` / `rm-j008` | Canva (+ copy) | **C / D-leaning** | Kit packaging + field maps | High if forced into pure renderer | Kit/composer layer |
| `rm-j007` | Canva / file edit | **D** | Ingest + limited edit of existing named item | High on create spine | Separate edit/ingest path |

### Special re-evaluation (required)

| Question | Finding now (five-lane baseline) |
|----------|----------------------------------|
| How much of social’s prior **C** disappeared? | **Square** fully retired. **First campaign-set model** largely retired (orchestration, shared truth, set QA, whole-set versioning). Remaining: **N=4** + **caption/order package** → reclass **B**. |
| Does that make social **A**? | **No.** Captions/order + exact-four set are still new contract surface. |
| Does promo make `ma-001` **B**? | **Not yet.** Variable 1–4 + heterogeneous pack types remain material → still **C**. |
| Who wins head-to-head: social vs `ma-001`? | **Social** — smaller truthful delta, fixed plate, fixed count, RTU shelf, cleaner unlock to `sm-001`. |
| Any pure **A** left? | **No.** |

---

## 5. Highest-reuse candidates

Ranked by (active-menu importance × smallest truthful delta × five-lane reuse × unlock × risk):

1. **`v2-rtu-social-posts`** — Active RTU (`placement: both`, Route Map, Batch 1). Smallest remaining **useful** delta (**B**). Highest reuse of newly sealed square + campaign-set muscle. Best unlock for `sm-001`.
2. **`ma-001`** — Important Discovery green, but still **C** (variable heterogeneous pack). Wait for RTU social scale + caption package.
3. **`sm-001` / monthly** — Larger **C**; after social-posts RTU.

**Deferred (not #6):** `bf-001`, profile kits, `rm-j007`, held `v2-rtu-handout`.

---

## 6. Risks

| Risk | Mitigation if Owner accepts social-posts |
|------|------------------------------------------|
| Treating 2-asset promo as “already 4-asset social” | DELTA must bound exact count=4, same-plate set, and fail-closed on partial sets |
| Caption/order treated as optional chrome | DELTA must treat caption file + posting-order as required deliverables — not afterthought text |
| Live `SocialPostsIntakeForm` vs catalog schema divergence | DELTA must map authoritative live intake → Machine truth without inventing captions |
| Jumping to `ma-001` “because set muscle exists” | Rejected — variable/heterogeneous pack still **C** |
| Sealed-lane regression | Additive social modules only; SKU-gated hook/observer; re-run all five sealed lanes |
| Hidden Canva dependence | Same Owner-NONE / Canva-OFF pattern only after authorized proof+hook — not this inspection |
| Promo Landscape confusion | Social CERT is square-only; do not reopen promo Landscape in this lane |

---

## 7. Selected SKU #6

| Field | Value |
|-------|--------|
| **SKU** | **`v2-rtu-social-posts`** |
| Client name | Make My Social Media Posts |
| Delta class | **B — SMALL EXTENSION** |
| Principal new requirement | Exactly **four** coordinated square posts + **caption package** + **posting-order document**, reusing sealed square plate + campaign-set orchestration / set QA / whole-set versioning |
| Reused without re-proving | Square 1024×1024; shared campaign truth; set consistency QA; per-asset identity patterns; whole-set versioning; PNG export; identity/hash; hook/observer patterns; Owner NONE |
| Executor today | Canva (unchanged by this inspection) |

---

## 8. Why this SKU wins now

| Candidate | Why social-posts beats it **now** |
|-----------|-----------------------------------|
| Prior ranking (`SELECTION-3`) | Promo correctly took the first campaign-set + square wedge as #5. That muscle is sealed. Social’s remaining delta shrank from **C→B**. |
| `ma-001` | Campaign-set helps, but variable 1–4 + mixed asset kinds stay **C**. Larger / messier than RTU social. |
| `sm-001` / monthly | Calendar + ≤6 still **C**; harvest after RTU social. |
| `bf-001` / kits / `rm-j007` | Wrong capability wedge for next renderer seal. |

**Selection rule fit:** active RTU importance · smallest truthful **useful** delta after five-lane baseline · highest reuse of square + set muscle · unlocks `sm-001` · lowest regression risk among remaining set candidates · no hidden Canva operation assumed for selection.

Not chosen because “social is popular” — chosen because Promotion Graphics retired the expensive part of the prior C, leaving a bounded B that compounds the new muscle.

---

## 9. Canva / Make status

| Item | Status |
|------|--------|
| Canva on sealed five lanes | **OFF** fulfillment spine |
| Canva on remaining design SKUs (incl. social-posts) | **Unchanged** — still Canva / family baseline |
| Executor mappings in this package | **None changed** (inspection only) |
| Make | **NOT REQUIRED NOW** |
| Make conclusion change from five-lane baseline? | **No new evidence** — caption/order docs do not require Make; do not create or wire Make |

---

## 10. Git state

| Field | Value |
|-------|--------|
| HEAD | `71f01e84ce71139c2adaf68918baa2ce9046da47` |
| Branch | `operating/design-renderer-proof-1` |
| Tracking | `origin/operating/design-renderer-proof-1` · ahead/behind **0/0** |
| This package | Inspection report only under `docs/launch/studio-operating-design-next-sku-selection-4/` |
| Commit | **None** |
| Push | **None** |
| Merge | **None** |
| Sealed lanes touched | **None** |

---

## 11. Exactly one recommended next package

**`STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-DELTA-1`**

Inspection-only capability-delta package for `v2-rtu-social-posts` against the sealed five-lane baseline — bound the exact-four same-plate set, caption file + posting-order deliverables, live-intake → Machine truth mapping, and set-level fail-closed rules — **no implementation**, **no Canva remapping**, **no Make**, **no sealed-lane edits**.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
