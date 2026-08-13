# STUDIO-OPERATING-DESIGN-NEXT-SKU-SELECTION-5 REPORT

**Package:** STUDIO-OPERATING-DESIGN-NEXT-SKU-SELECTION-5  
**Mode:** Inspection only — no implementation · no migration · no executor remapping · no proof start  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### Selected SKU #7: `sm-001` (Social Media Launch Set)

**DELTA B — SMALL EXTENSION** (reclassed from prior **C**)

Against the sealed **six-lane** baseline (flyer · business-card · menu · service-sheet · promotion-graphics · **social-posts**), Social Posts just retired the expensive part of the old `sm-001` C:

| Prior C driver for `sm-001` | Status after social-posts seal |
|-----------------------------|-------------------------------|
| Square / feed compose | **Retired** — `cert-square-1024` sealed |
| Multi-post campaign set | **Mostly retired** — fixed-4 same-plate set sealed |
| Caption packaging + binding | **Retired** — Studio-written captions + 1:1 binding sealed |
| Simple sequence / order truth | **Mostly retired** — posting-order manifest sealed (not a calendar) |
| Live dispatch of set + captions | **Retired** — observer/hook path sealed |
| **≤6** variable cardinality | **Still new** — open “up to six,” not fixed four |
| **Simple calendar** document | **Still new** — dated schedule package beyond posting-order |

Honest reclass: **B**, not A (calendar + variable ≤6 remain), not still-full-C (compose + captions + set + order muscle are gone).

`ma-001` also benefits (N=4 scale + set QA), but stays **C**: variable **1–4** plus **heterogeneous** pack types remain larger than `sm-001`’s same-family social extension.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `fa3cddc3871ede9d75ad27b8e765edc565a10f7c` |
| Package commit (social) | `eeb0465e1910d60350666c685801d3cd3e7e9541` |
| Branch | `operating/design-renderer-proof-1` |
| Ahead/behind vs origin | `0/0` |
| Control match | **CONTROL_MATCH** |
| Control meaning | Social Posts lane sealed — **V2-RTU-SOCIAL-POSTS OWNER-INDEPENDENT AUTO-PRODUCTION READY** |
| Proven sealed lanes | flyer · business-card · menu · service-sheet · promotion-graphics · **social-posts** (**6/13**) |

---

## 2. Six-lane renderer baseline (treat as proven)

| Capability | Proven by |
|------------|-----------|
| Portrait single-surface (1024×1536) | Flyer · Menu · Service sheet · Promo (portrait member) |
| Landscape rendering (1536×1024) | Business card *(promo Landscape execution still fail-closed)* |
| Square plate (1024×1024) | Promo · **Social posts** |
| Front/back multi-surface | Business card |
| Coordinated **two-asset** campaign set | Promotion graphics |
| Coordinated **four-asset** same-plate set | **Social posts** |
| Mixed plate sets (square + portrait) | Promotion graphics |
| Shared campaign truth across assets | Promo · Social |
| Per-asset semantic ID / purpose or layout binding | Promo · Social (Studio layout templates) |
| Whole-set versioning + set-level QA | Promo · Social |
| Studio-written captions + 1:1 caption↔post binding | **Social posts** |
| Durable posting-order manifest | **Social posts** |
| Live intake → Machine structure mapping | Social (INTAKE-TRUTH-1) |
| Idempotent dispatch + observer auto-invoke | All six |
| Routine Owner production | **NONE** on sealed lanes |

**Still not proven (do not pretend):** open N-pack engines (arbitrary 1–N); heterogeneous multi-kind packs; **calendar** schedule packages; strategy documents; profile kits / field maps; edit-existing / not-from-scratch pipelines; promo Landscape **execution**.

---

## 3. Remaining design-SKU inventory (7)

**Sealed / out of migration scope:** flyer · business-card · menu · service-sheet · promotion-graphics · social-posts.  
**Out of scope:** copy (`em-*`, `cc-*`), voice, video/Shotstack, landing page (`rm-j005`).  
**Held:** `v2-rtu-handout` — noted, not a #7 candidate.

| SKU | Current executor | Artifact count | Dims / plates | Content package | What social seal changed |
|-----|------------------|----------------|---------------|-----------------|--------------------------|
| `sm-001` | Canva | **≤6** graphics + captions + **calendar** | Square / feed | Launch set; captions; simple calendar | Captions, square, fixed-set, order, dispatch **reuse** — remaining: ≤6 + calendar |
| `sm-001-monthly` | Canva | Same ≤6 + captions + calendar | Same | Monthly batch of `sm-001` method | Same production delta as `sm-001`; billing/cycle only |
| `ma-001` | Canva | **1–4** | Mixed standard shapes | Heterogeneous pack (flyer/card/poster/etc.) | N=4 scale + set QA help — remaining: **variable 1–4** + **heterogeneous kinds** |
| `bf-001` | Canva (+ text) | 2+ kinds | Mixed (doc + profile/cover) | Brand Direction Sheet + graphic | Weak — strategy doc still new |
| `rm-j002` | Canva (+ text) | Multi | Avatar/banner + field map | Profile Setup Kit | Kit/composer layer still new |
| `rm-j008` | Canva (+ text) | Multi | Avatar/banner + change sheet | Profile Update Kit | Same kit class as `rm-j002` |
| `rm-j007` | Canva / file edit | **1** (edit) | Matches source | Corrected named existing item | Edit/ingest path still separate |

Authorities: `services.ts`, `sku-overrides.ts`, `batch1-ready-to-use.ts`, family baselines, CERT registry, intake schemas.

### Coverage vs six-lane baseline

| SKU | Already covered | Genuinely new | Downstream reuse |
|-----|-----------------|---------------|------------------|
| `sm-001` | Square; 4-set orchestration; captions+binding; posting order; set QA; dispatch | **≤6** variable count; **calendar** document | Unlocks `sm-001-monthly` nearly for free |
| `sm-001-monthly` | Same as `sm-001` method | Monthly batching / subscription ops (not renderer-first) | After `sm-001` |
| `ma-001` | Promo 2-set; social 4-set; mixed-plate *idea*; export/QA | Variable **1–4**; heterogeneous pack types; “up to N” pack semantics | Broad legacy pack |
| `bf-001` | Some graphic compose | Strategy document + dual artifact kinds | Weak into RTU print |
| `rm-j002` / `rm-j008` | Some graphic surfaces | Kit packaging + field maps | Needs kit/composer layer |
| `rm-j007` | Almost none of create-from-spec | Ingest + limited edit of existing | Separate edit path |

---

## 4. Capability-delta matrix (re-ranked on evidence)

| SKU | Executor | Prior (SEL-4) | **Now (SEL-5)** | Principal remaining new capability | Risk | Downstream |
|-----|----------|---------------|-----------------|------------------------------------|------|------------|
| `sm-001` | Canva | **C** | **B** | ≤6 variable count + simple **calendar** (captions/set/square/order **reused**) | Low–med if additive | Unlocks monthly |
| `sm-001-monthly` | Canva | **C** | **B-follow** | Same renderer delta as `sm-001`; monthly ops | Low after `sm-001` | Do not pick before base |
| `ma-001` | Canva | **C** | **C** (slightly smaller) | Variable 1–4 + heterogeneous pack kinds | Med–high | After social scale / optional after sm |
| `bf-001` | Canva (+ strategy) | **C** | **C** | Brand strategy document + dual kinds | Med | Weak RTU print reuse |
| `rm-j002` / `rm-j008` | Canva (+ copy) | **C / D** | **C / D** | Kit packaging + field maps | High if forced into pure renderer | Kit/composer layer |
| `rm-j007` | Canva / file edit | **D** | **D** | Ingest + limited edit of existing named item | High on create spine | Separate edit/ingest path |

### Special re-evaluation (required)

| Question | Finding now (six-lane baseline) |
|----------|----------------------------------|
| Did social retire enough of `sm-001`’s C? | **Yes.** Captions, square, multi-post set, order truth, and live set dispatch are sealed. Remaining: ≤6 + calendar → **B**. |
| Does that make `sm-001` **A**? | **No.** Calendar is a new document class; ≤6 is not the sealed fixed-4 contract. |
| Did social make `ma-001` **B**? | **Not yet.** Variable 1–4 + heterogeneous kinds remain material → still **C**. |
| Who wins head-to-head: `sm-001` vs `ma-001`? | **`sm-001`** — same-family extension of sealed social muscle; smaller truthful delta; clearer unlock (monthly). |
| Pick `sm-001-monthly` as #7? | **No.** Same production method as `sm-001`; seal base first. |
| Any pure **A** left? | **No.** |
| Habit trap? | Avoid “next is ma-001 because packs are next.” Evidence says social→`sm-001` is the tighter wedge. |

---

## 5. Highest-reuse candidates

Ranked by (active-menu importance × smallest truthful delta × six-lane reuse × unlock × risk):

1. **`sm-001`** — Active. Smallest remaining **useful** delta (**B**). Highest reuse of newly sealed social-posts captions + 4-set + order + square + dispatch. Best unlock for `sm-001-monthly`.
2. **`ma-001`** — Important Discovery green, still **C** (variable heterogeneous pack). Benefits from set scale but not enough to beat `sm-001`.
3. **`sm-001-monthly`** — Follow-on after `sm-001` (near-A renderer delta once base sealed).

**Deferred (not #7):** `bf-001`, profile kits, `rm-j007`, held `v2-rtu-handout`.

---

## 6. Risks

| Risk | Mitigation if Owner accepts `sm-001` |
|------|--------------------------------------|
| Treating fixed-4 social as “already ≤6” | DELTA must bound variable count (1–6 or exact policy), fail-closed above 6, and not invent open-N engines |
| Treating posting-order as “already a calendar” | DELTA must define calendar as a distinct dated-schedule artifact — not rename posting-order |
| Customer-supplied vs Studio-written captions on `sm-001` | DELTA must confirm catalog/intake truth; preserve no-invented-facts rule from social |
| Jumping to `ma-001` “because N=4 exists” | Rejected for #7 — heterogeneous variable pack still **C** |
| Sealed-lane regression | Additive `sm-001` modules only; SKU-gated hook/observer; re-run all **six** sealed lanes |
| Hidden Canva dependence | Same Owner-NONE / Canva-OFF pattern only after authorized proof+hook — not this inspection |
| Monthly billing confusion | Do not implement `sm-001-monthly` in the same production package as first seal |

---

## 7. Selected SKU #7

| Field | Value |
|-------|--------|
| **SKU** | **`sm-001`** |
| Client / catalog name | Social Media Launch Set (up to six static posts + captions + simple calendar) |
| Delta class | **B — SMALL EXTENSION** |
| Principal new requirement | Variable **≤6** coordinated square/feed posts + **simple calendar** document, reusing sealed social captions/set/order/square/dispatch muscle |
| Reused without re-proving | Square 1024×1024; fixed-set orchestration patterns; Studio caption binding; posting-order patterns; set QA; whole-set versioning; PNG export; identity/hash; hook/observer; Owner NONE |
| Executor today | Canva (unchanged by this inspection) |

---

## 8. Why this SKU wins now

| Candidate | Why `sm-001` beats it **now** |
|-----------|-------------------------------|
| Prior ranking (`SELECTION-4`) | Correctly chose RTU social as #6. That seal shrank `sm-001` from **C→B**. |
| `ma-001` | Set scale helps, but variable 1–4 + mixed asset kinds stay **C**. Larger / messier than same-family social extension. |
| `sm-001-monthly` | Same renderer method; pick base `sm-001` first. |
| `bf-001` / kits / `rm-j007` | Wrong capability wedge for next renderer seal. |

**Selection rule fit:** active importance · smallest truthful **useful** delta after six-lane baseline · highest reuse of social-posts captions/set/order/square · unlocks monthly · lowest regression risk among remaining set candidates · evidence-led, not habit-led.

Not chosen because “social is next on the list” — chosen because Social Posts retired the expensive part of the prior `sm-001` C, leaving a bounded B that compounds the new muscle.

---

## 9. Canva / Make status

| Item | Status |
|------|--------|
| Canva on sealed six lanes | **OFF** fulfillment spine |
| Canva on remaining design SKUs (incl. `sm-001`) | **Unchanged** — still Canva / family baseline |
| Executor mappings in this package | **None changed** (inspection only) |
| Make | **NOT REQUIRED NOW** |
| Make conclusion change from six-lane baseline? | **No new evidence** — calendar docs do not require Make; do not create or wire Make |

---

## 10. Git state

| Field | Value |
|-------|--------|
| HEAD | `fa3cddc3871ede9d75ad27b8e765edc565a10f7c` |
| Branch | `operating/design-renderer-proof-1` |
| Tracking | `origin/operating/design-renderer-proof-1` · ahead/behind **0/0** |
| This package | Inspection report only under `docs/launch/studio-operating-design-next-sku-selection-5/` |
| Commit | **None** |
| Push | **None** |
| Merge | **None** |
| Sealed lanes touched | **None** |
| SKU #7 implementation | **Not started** |

---

## 11. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-DELTA-1`**

Inspection-only capability-delta package for `sm-001` against the sealed six-lane baseline — bound:

- variable count policy (≤6, fail-closed above)
- simple **calendar** artifact vs posting-order (do not conflate)
- caption source rules (Studio-written vs customer-supplied) without inventing facts
- reuse of social-posts square/set/caption/order/dispatch muscle
- no implementation · no Canva remapping · no Make · no sealed-lane edits

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
