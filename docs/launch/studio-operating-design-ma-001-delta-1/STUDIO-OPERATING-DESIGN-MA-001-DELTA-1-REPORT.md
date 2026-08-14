# STUDIO-OPERATING-DESIGN-MA-001-DELTA-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-MA-001-DELTA-1  
**Mode:** Inspection only — no implementation · no proof · no primaryTool remap · no sealed-lane edits  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### MA-001 DELTA C — HETEROGENEOUS VARIABLE PACK (HOLDS)

Selection of `ma-001` as provisional SKU #9 (SELECTION-7) remains sound. Provisional **Delta C** is **certified by this inspection** — not promoted to B, not demoted to D.

Sealed eight-lane muscle proves single-surface kinds, exact-2 campaign sets, same-plate N∈{4,5,6} social sets, mixed **plates** within one promo SKU, whole-set versioning, exact N/N fail-closed, and dispatch/idempotency. It does **not** prove a Promotion Pack.

Against that baseline, `ma-001` still requires material new product/capability truths:

1. **Closed kind contract** — catalog gives **examples** (“brochures, flyers, rack cards, menus…” + “similar finished marketing assets”), not an authoritative Machine enum. Several example kinds have no sealed Machine member path (rack cards, posters, presentation materials; multi-page brochures already excluded).
2. **Cardinality contract** — “up to four” / QA “no more than four” / delivery `quantity: 4` are a **ceiling**. Minimum, job-level N rule, and completeness vs “up to” are **missing** (same failure class as pre-freeze `sm-001` “up to six”).
3. **Composition authority** — who chooses each member’s kind (customer / Studio / Discovery / fixed template) is **not frozen**.
4. **Pack orchestration** — whole-pack identity, durable member IDs, pack-level QA across **unlike** surfaces, and delivery packaging for a heterogeneous set are **not** established for Machine.

Together that is **C**, not B: reuse of sealed surfaces as *possible members* is real, but **heterogeneous pack + undefined kind/N/chooser truths are not a parameter tweak** on promo or social.

Not A: kinds, N policy, chooser, pack identity unproven.  
Not B: Owner caution from SELECTION-7 stands — treating sealed members + variable-N pattern as automatic pack readiness hides C-sized work.  
Not D: still create-from-campaign Machine shape; not edit-existing / ingest architecture.

**Delta C holds.** Do not move to B until Owner freezes the product truths below. Do not move to D unless Owner reframes the SKU as edit/ingest or unbounded “any collateral” outside create-from-spec.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `30b0e4ddef1f54813d5a408d12c28e26dccd4f22` |
| Branch | `operating/design-renderer-proof-1` |
| Ahead / behind vs origin | **0 / 0** |
| Selection | Owner authorized this DELTA after SELECTION-7 (`ma-001` provisional #9 · **C**) |
| Sealed Machine design lanes (do not touch) | flyer · business-card · menu · service-sheet · promotion-graphics · social-posts · **sm-001** · **sm-001-monthly** (**8/13**) |
| Candidate | `ma-001` — Promotion Pack |
| Current executor | **Canva** (`marketing_assets` family + SKU override; **no** `studio_design_renderer` remap) |
| Parked | remaining Canva design SKUs · `ma-001-monthly` (follow-on after `ma-001`) |
| Canva / Make | Canva **unchanged** · Make **NOT REQUIRED** (no new evidence) |

**Authorities:** `src/catalog/services.ts` · `sku-overrides.ts` · `closeout/ledger.ts` · `family-baselines.ts` (`marketing_assets`) · Batch 1 RTU lineage notes in `catalog/v2/batch1-ready-to-use.ts` · SELECTION-7 report · sealed eight-lane reports (read-only).

---

## 2. Authoritative `ma-001` service contract

| Topic | Authoritative truth |
|-------|---------------------|
| Name | Promotion Pack |
| Purpose | Focused set of branded visual pieces for **one** campaign, service, offer, event, or launch |
| Asset count | **“Creates up to four branded standard-format marketing assets”** — ceiling language |
| Delivery map | `marketing_asset` **quantity: 4** · unit `assets` |
| Kitchen QA | “No more than four assets” · “Final customer copy used (not inventing offers)” |
| Focus | One agreed business/campaign focus · approved brand materials |
| Formats | “Final digital files in agreed formats” · family: “Formats as agreed” |
| Captions / posting order / calendar | **Not promised** on `ma-001` (contrast `sm-001`) |
| Customer receives (examples) | brochures, flyers, rack cards, menus, business cards, posters, presentation materials, and **similar** finished marketing assets |
| Exclusions (material) | Printing/shipping · photography · custom illustration · **multi-page brochures/catalogs** · packaging · website · **large-format signage** · editable source by default · **multiple size/version sets** · **more than four assets** · unlimited revisions · guaranteed results |
| Client responsibilities | Final copy · offer terms · dates · prices · links · logos · required wording · print requirements if printing · approval — **no “select asset kinds” / “choose N” field** |
| Family inputs | “Final copy when required” · “Brand assets” · “SKU asset count limit” |
| Review handoff (family) | “Submit final digital asset files to Review Room after QA.” |
| Closeout | ≤4 assets · manual Canva · per-artifact design QA · Owner routine **NONE** · readiness CUSTOMER READY WITH LIMITS — DESIGN |
| Executor today | Canva manual · readiness: contract_ready / sell-with-limits |
| Price note (Batch 1 lineage) | Pack is **$495 for up to four** — not a per-flyer price; RTU singles carved from this lineage at lower prices |

### Exact allowed asset kinds

| Question | Finding |
|----------|---------|
| Closed Machine enum? | **No.** Catalog lists **examples** + open “similar finished marketing assets.” |
| What is excluded by name? | Multi-page brochures/catalogs · packaging · website · large-format signage · (plus photography/illustration as production methods) |
| One-page brochure? | Ambiguous — “brochures” appear in examples; **multi-page** brochures excluded. One-page brochure vs flyer not distinguished. |
| Rack cards / posters / presentation materials | Named as examples; **no** sealed Machine SKU member path today |
| Flyer / menu / business card / service-sheet-like / promo graphics | Named or implied; **have** sealed or lineage Machine surfaces — reuse **candidates only** after kind freeze |
| Social posts as pack members? | **Not named** in `ma-001` examples. Do not invent inclusion. |

**Fail-closed implication:** Machine must not invent an allowed-kinds list. Without Owner freeze, Scout cannot certify which sealed lanes are legal pack members.

### Cardinality — is N truly 1–4?

| Question | Finding |
|----------|---------|
| Fixed 4? | **No** — language is “up to four,” not “exactly four.” |
| Variable 1–4? | **Ceiling only.** Catalog does not state a minimum. Kitchen QA does not require a floor. |
| Delivery `quantity: 4` | Models the **maximum / package ceiling**, not a proven job always produces 4. |
| Job-level N rule | **Missing.** No intake field, Studio production policy, or Machine contract decides N for a given job. |
| Partial pack vs “up to” | Ambiguous: is a 2-asset delivery a complete “up to four” job, or an incomplete 4? **Not frozen.** |
| SELECTION-7 “1–4” | Working hypothesis for ranking — **not** earned contract law until Owner freezes min + completeness. |

**Fail-closed implication:** without an Owner-accepted cardinality policy, Machine cannot choose N without inventing business truth (same class as pre-`sm-001` CONTRACT-TRUTH).

### Mixed kinds in one pack?

| Question | Finding |
|----------|---------|
| Product intent from examples? | **Implies mix is allowed** (flyer + card + poster language). |
| Frozen rule “mixed kinds allowed”? | **No.** |
| Frozen rule “same-kind packs allowed”? | **No** (e.g. four flyers). |
| Frozen rule “must mix”? | **No.** |
| Sealed precedent | Promo = mixed **plates** within one graphic SKU (exact-2). Social / sm-001 / monthly = **same kind** (static social posts). **No** sealed heterogeneous **kind** pack. |

### Who chooses each kind?

| Candidate chooser | Evidence |
|-------------------|----------|
| Customer | Not in client responsibilities; no intake kind picker found for `ma-001` |
| Studio / producer | Manual Canva path historically chooses; not frozen as Machine authority |
| Discovery / Recommendation | No `ma-001`-specific kind composition mapping found |
| Fixed pack template | Not in catalog |

**Finding:** **Chooser is undefined.** Machine must not invent who picks member kinds.

### Per-member size / format rules

| Topic | Finding |
|-------|---------|
| Plate map per kind | **Missing** for the pack |
| “Standard-format” | Named; not CERT-locked dimensions |
| “Agreed formats” | Family delivery criterion — agreement source not Machine-frozen |
| Multiple size/version sets | **Excluded** → one agreed size **per asset** (not multi-version of same piece), but pack may still mix plates **if** Owner allows (promo precedent is same-SKU only) |
| Large-format | **Excluded** |
| Inherit sealed plates? | Strongest reuse path **if** allowed kinds freeze to sealed members — still an Owner freeze, not inherited law |

### Copy / caption requirements by kind

| Topic | Contract today |
|-------|----------------|
| Studio-written captions | **Not a `ma-001` deliverable** |
| Client final copy | **Required** (client responsibility + QA gate) |
| Per-kind copy schema | **Missing** (menu items ≠ card contact ≠ flyer offer ≠ poster headline) |
| Inventing offers | Forbidden (QA: final customer copy used) |

Do **not** reuse social caption engines as pack truth without an Owner product decision that Studio writes captions for pack members (catalog does not say that).

### Whole-pack identity / versioning

| Topic | Finding |
|-------|---------|
| Pack root / durable member IDs | **Unspecified** for Machine |
| Whole-pack `vN` | Family implies package delivery; sealed set doctrine exists on promo/social/sm-001 — **not wired** to `ma-001` |
| Per-artifact vs pack version | Closeout emphasizes **per-artifact** design QA; pack-level versioning not frozen |
| Fake members / padding to 4 | Must be banned once N is locked (social/sm-001 doctrine) — **not yet stated** for `ma-001` |

### N/N fail-closed behavior

| Layer | Today | Needed for Machine |
|-------|-------|--------------------|
| Ceiling | “No more than four” | Keep |
| Floor / exact chosen N | **Missing** | Exact **chosen N / N** after policy freeze (pattern from sm-001 / monthly) |
| Shrink-on-QA | Forbidden on sealed social/monthly | Must apply to pack once N locked |
| Heterogeneous completeness | Unproven | Every chosen member kind+plate must pass; pack fails if any member fails |

### Intake gaps

| Gap | Why it blocks Owner-independent production |
|-----|--------------------------------------------|
| No closed **allowed-kinds** list | Machine would invent collateral types |
| No authoritative **N** (or fixed K) rule | Machine would invent count |
| No **chooser** / composition record | Machine would invent pack makeup |
| No per-member **plate / format** binding | Risk of invented sizes or multi-version drift |
| No per-kind **copy structure** bounds | Risk of empty or invented factual fields |
| No `ma-001` Machine intake map | Live Canva path ≠ renderer dispatch truth |
| Boundary vs RTU singles | Batch 1 notes: pack ≠ per-flyer price; must not silently fulfill as four unrelated RTU jobs without pack identity |

### QA and delivery packaging

| Layer | Gap |
|-------|-----|
| QA today | Count ≤4 · final copy used · per-artifact design QA |
| Pack-level set QA | **Missing** (cross-kind brand/campaign consistency; no clone-of-wrong-kind checks) |
| Delivery package | “Final digital files” — no manifest of member IDs/kinds/plates, no ordered pack index, no whole-pack fingerprint |
| Source files | Not default — preserve |
| Partial failure | Undefined vs “up to four” |

---

## 3. Reuse from eight sealed lanes

| Sealed lane | Reuse for `ma-001`? |
|-------------|---------------------|
| Flyer (portrait single-surface) | **Candidate member** — only if “flyer” is an allowed pack kind and plate policy inherits |
| Business card (front/back · landscape) | **Candidate member** — same caveat; multi-surface ≠ multi-kind pack |
| Menu | **Candidate member** — same caveat |
| Service sheet | **Candidate member** — “presentation materials / one-page collateral” lineage exists in Batch 1 notes; still needs kind freeze |
| Promotion graphics (exact-2 · mixed plates · campaign set) | **Strongest pack-muscle pattern** — purpose/plate binding + set QA — but **exact-2 same SKU**, not 1–4 heterogeneous kinds |
| Social posts (exact-4 same plate) | **Pattern only** for set identity / fail-closed — kind is social; captions/order **not** `ma-001` promises |
| `sm-001` (N∈{4,5,6} same-plate · calendar) | **Cardinality + N/N + whole-set versioning patterns** — not heterogeneous kinds; calendar **out of scope** for `ma-001` |
| `sm-001-monthly` (cycle target · paid-cycle · cycle roots) | **Orchestration discipline patterns** — cycle/payment identity **not** required for one-time `ma-001` |

### What is already covered vs genuinely new

| Already covered (pattern / member candidates) | Genuinely new for `ma-001` |
|-----------------------------------------------|----------------------------|
| Single-surface compose for several named kinds | Closed **allowed-kinds** enum for the pack |
| Exact-2 set orchestration (promo) | **Heterogeneous** composition across kinds |
| Same-plate variable N + exact N/N (sm-001 / monthly) | Job **N policy** for marketing assets (min + completeness) |
| Mixed plates inside one promo SKU | Per-member kind→plate map for **unlike** SKU shapes |
| Campaign / brand shared truth | Pack-level purpose binding when members differ |
| Export · QA primitives · Owner NONE path | Pack identity · member IDs · pack delivery manifest · cross-kind set QA |
| Dispatch / idempotency patterns (SKU-gated) | `ma-001`-specific intake→composition→dispatch contract |

**Critical challenge — does sealed muscle already run a Promotion Pack?**

**No.**

Evidence:

- Promo DELTA explicitly: do **not** generalize to unlimited / `ma-001` packs.
- Social / sm-001 / monthly: same-kind sets; engines refuse wrong cardinality / wrong SKU shape.
- No `ma-001` renderer modules · no pack composition type · no kind enum · Canva still primary.

Therefore **“wire sealed members into a bag of ≤4” is not automatic.** Extending without freezes risks:

| Failure mode | How it appears if forced |
|--------------|--------------------------|
| Kind invention | Machine renders rack cards / posters / “similar” without authority |
| Count invention | Always-4 or random N under “up to” |
| Chooser invention | Studio picks kinds customer never approved |
| Fake members | Padding unused slots to keep a typed quad |
| Wrong reuse | Treating four flyers as four social posts or as promo dual |
| Silent RTU split | Fulfilling pack as four separate SKU jobs without pack root |
| Caption/calendar leakage | Importing sm-001 deliverables the pack does not promise |

---

## 4. Actual new capabilities (honest delta)

| # | New capability | Why not already proven |
|---|----------------|------------------------|
| 1 | **Owner-frozen allowed-kinds set** (closed, not “similar”) | Catalog examples only |
| 2 | **Cardinality policy** — fixed K vs determined N≤4; minimum; completeness; durable IDs; ban fake members | Ceiling-only contract |
| 3 | **Composition authority** — who chooses kinds + durable composition record | Undefined chooser |
| 4 | **Heterogeneous pack orchestration** — member kind→plate→copy-structure binding under one pack root | Promo is exact-2 same SKU; social is same-kind N |
| 5 | **Pack-level QA + delivery packaging** across unlike surfaces | Per-artifact Canva QA only today |
| 6 | **`ma-001`-specific intake / dispatch truth** | Unmapped; Canva manual |

**Not new (reuse after freezes):** sealed member compose paths for kinds that map to flyer/card/menu/service-sheet/promo · set fail-closed / whole-set versioning **doctrine** · observer/idempotency patterns (SKU-gated) · Canva-off / Make-not-required pattern after authorized proof+hook · Owner routine NONE target.

---

## 5. Execution / renderer / QA / delivery gaps (Machine path)

| Layer | Gap |
|-------|-----|
| Renderer | No `ma-001` pack modules; sealed engines are SKU-specialized |
| Composition contract | Need typed members `{ kind, plate, copyBinding, assetId }[]` sized to chosen N — not `SocialPostsQuad` or promo dual reuse-by-lie |
| QA | Need max≤4, actual-count completeness, per-member kind-legal, pack consistency, no fake members, final-copy lock |
| Delivery | Pack manifest + member files (+ optional combined package later) — do not invent zip/PDF rules here |
| Idempotency | Whole-pack fingerprint must include N + ordered kind/plate bindings |
| Partial failure | Fail closed on incomplete **chosen N**, not on “missing slots up to 4” |
| Executor | Remains Canva until separately authorized proof + hook |

---

## 6. Owner-independence

| Target | Status |
|--------|--------|
| Routine Owner production | **NONE** (closeout intent) |
| Today’s Machine path for `ma-001` | **Not mapped** — Canva manual |
| Path to independence | Contract truth → proof → intake map → SKU-gated dispatch — **after** kinds + N + chooser + plate map freeze |
| Risk if proof starts now | Proof would invent pack product law |

---

## 7. Downstream (`ma-001-monthly`)

| Finding | Detail |
|---------|--------|
| Catalog twin | `ma-001-monthly` — up to four assets per month · limited availability |
| After `ma-001` Machine seal | Monthly pack should inherit pack composition truths + add cycle ops (not started) |
| Do not start monthly now | Parked — SELECTION-7: follow-on after `ma-001`, not #9 |

---

## 8. Protected lanes / non-goals

| Preserve | Status this package |
|----------|---------------------|
| Eight sealed design lanes | Untouched |
| `ma-001` unmapped / unwired | Confirmed — still Canva |
| Remaining design SKUs parked | Confirmed |
| `ma-001-monthly` parked | Confirmed |
| Canva unchanged | Confirmed |
| Make not required | Confirmed — no contrary evidence |
| Implementation / proof / remap / commit / push / merge | **None** |

---

## 9. Delta class rationale (A/B/C/D)

| Class | Why accepted / rejected |
|-------|-------------------------|
| **A** | Rejected — kinds enum, N policy, chooser, pack identity, heterogeneous QA all unproven |
| **B** | Rejected — sealed members + variable-N *patterns* do not retire heterogeneous pack product gaps; SELECTION-7 caution stands |
| **C** | **Accepted / holds** — material new pack composition + undefined product truths, despite strong member/set reuse |
| **D** | Rejected — still create-from-campaign Machine shape; not edit/ingest (`rm-j007` class) |

**Selection vs delta:** SKU #9 provisional selection stands. Scoreboard remains **8/13 sealed · #9 provisionally selected · DELTA inspected · not started** until contract truths earn a smaller class or a C-sized proof plan is explicitly authorized.

**Reclass trigger:** After CONTRACT-TRUTH freezes, Scout may restate earned class (still **C**, or toward **B** if kinds collapse to a tiny sealed-member subset + fixed composition rules). Do **not** reclass to **D** unless Owner expands into edit-existing or open-ended “any collateral” outside create-from-spec.

---

## 10. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-MA-001-CONTRACT-TRUTH-1`**

Inspection / Owner-freeze package only (no renderer proof, no remapping):

1. Freeze **allowed kinds** — closed enum (map each to sealed member path or explicitly out-of-Machine until later); ban open “similar” for Machine  
2. Freeze **cardinality policy** — fixed K vs determined N≤4; minimum; completeness rule; durable member IDs; ban fake members  
3. Freeze **composition authority** — who chooses each kind; durable composition record shape  
4. Freeze **per-member plate / format** bindings and copy-structure bounds (client final copy preserved; no silent caption engine)  
5. Freeze **whole-pack identity / versioning / delivery packaging / pack-level QA**  
6. Re-state whether the earned class after freeze is still **C** or reclasses toward **B**  
7. Only then recommend proof / intake / dispatch packages  

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
