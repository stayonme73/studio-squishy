# STUDIO-OPERATING-DESIGN-SM-001-DELTA-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SM-001-DELTA-1  
**Mode:** Inspection only — no implementation · no proof · no primaryTool remap · no sealed-lane edits  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### SM-001 DELTA C

Selection of `sm-001` as SKU #7 remains sound. Provisional **Delta B** from SELECTION-5 is **not certified**.

Sealed `v2-rtu-social-posts` proves a **fixed-exact-4** same-plate set with Studio captions, durable posting order, whole-set versioning, and live dispatch. It does **not** prove bounded **variable** cardinality, and it **explicitly excludes** a content calendar (“posting order · **not** a full calendar”).

Against that baseline, `sm-001` still requires two material new product/capability truths:

1. **Cardinality contract** — catalog ceiling “up to six” with no authoritative minimum, no job-level N rule, and a Machine set engine that is specialized for `exact = 4` (`SocialPostsQuad`, `SOCIAL_POSTS_EXACT_COUNT`, order `1|2|3|4`, four layout templates only).
2. **Calendar product truth** — promised as “simple content calendar,” but inputs, artifact shape, post bindings, date source, and customer promise are **not established**. “Simple” is not yet an earned label.

Together that is **C**, not B: reuse of square / captions / order / set-QA / dispatch is real, but **exactly-4 → ≤6 is not a parameter tweak**, and calendar is a new deliverable class still undefined.

Not A: neither variable-N nor calendar is sealed.  
Not B: Owner caution stands — variable cardinality + undefined calendar hide C-sized work if treated as automatic.  
Not D: still a create-from-campaign Machine path; not edit-existing / ingest architecture.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `fa3cddc3871ede9d75ad27b8e765edc565a10f7c` |
| Branch | `operating/design-renderer-proof-1` |
| Selection | Owner accepted `sm-001` as SKU #7 (selection only) |
| Provisional class (SELECTION-5) | Delta B — **superseded by this inspection** |
| Sealed Machine design lanes (do not touch) | flyer · business-card · menu · service-sheet · promotion-graphics · **social-posts** (**6/13**) |
| Candidate | `sm-001` — Social Media Launch Set |
| Current executor | **Canva** (social family baseline; **no** `studio_design_renderer` remap) |
| Parked | `ma-001` · `sm-001-monthly` · remaining design SKUs |
| Canva / Make | Canva **unchanged** · Make **NOT REQUIRED** (no new evidence) |

---

## 2. Authoritative `sm-001` service contract

**Sources:** `src/catalog/services.ts` · `sku-overrides.ts` · `closeout/ledger.ts` · `family-baselines.ts` (`social`) · `social_media-execution` add-on · RTU lineage note in `batch1-ready-to-use.ts`.

| Topic | Authoritative truth |
|-------|---------------------|
| Name | Social Media Launch Set |
| Purpose | Polished starter batch for **one** offer, launch, event, or business focus |
| Post count | **“Creates up to six static social posts”** — ceiling language |
| Delivery map | `static_social_post` **quantity: 6** · `content_calendar` **quantity: 1** |
| Kitchen QA | “No more than six static posts” · “No reels/advanced motion claimed” |
| Captions | **“Writes one caption per post”** — required 1:1 with produced posts |
| Order | **“Provides suggested posting order”** (separate from calendar) |
| Hashtags | **“Provides basic hashtag/keyword suggestions where appropriate”** · exclusion: unlimited hashtag research |
| Calendar | **“Provides a simple content calendar”** · delivery key `content_calendar` ×1 |
| Plate / size | Not CERT-locked. Exclusion: **“Multiple aspect-ratio versions”** → one agreed size for the set, size itself not named square |
| Exclusions (base SKU) | Daily posting · community/DM · paid ads · filming · reels/advanced motion · multi-aspect versions · unlimited hashtag research · guaranteed results |
| Client posts | Closeout: client posts/schedules on own accounts; Studio does **not** post on base SKU |
| Scheduling / publishing | **Separate add-on** `social_media-execution` — not part of `sm-001` fulfillment |
| Client responsibilities | Connected-account access **if execution selected** · correct offer details · logos/images · timely approval — **no required “provide publish dates” field** |
| Review handoff (family) | “Submit static posts + captions (**and calendar when included**) to Review Room after QA” |
| Executor today | Canva manual (family) · optional text model · readiness: method-covered / sell-with-limits |
| Owner routine (closeout target) | **NONE** (method-covered claim; Machine remapping **not** done) |

### Cardinality truth (critical)

| Question | Finding |
|----------|---------|
| Fixed 6? | **No** — language is “up to six,” not “exactly six.” |
| Variable 1–6? | **Ceiling only.** Catalog does not state a minimum. Kitchen QA does not require a floor. |
| Delivery `quantity: 6` | Models the **maximum / package ceiling**, not a proven job always produces 6. |
| Job-level N rule | **Missing.** No intake field, Studio production policy, or Machine contract decides N for a given job. |
| Partial set vs “up to” | Ambiguous: is a 3-post delivery a complete “up to six” job, or an incomplete 6? **Not frozen.** |

**Fail-closed implication:** without an Owner-accepted cardinality policy, Machine cannot choose N without inventing business truth.

### Caption / identity / order (when N ≠ 4)

| Topic | Contract today | Sealed social baseline | Gap |
|-------|----------------|------------------------|-----|
| Caption per post | Required | Proven 1:1 for exact-4 | Must scale to size-N with same binding doctrine |
| Suggested posting order | Required | Proven as `posting-order.json` for exact-4 | Must become size-N ordered ID list — not filename sort |
| Asset IDs | Unspecified for `sm-001` | Fixed `social-post-1…4` | Need durable IDs for whichever N is chosen — no fake members for unused slots |
| Whole-set versioning | Family implies package | Proven whole-set `vN` for exact-4 | Must version **actual produced set** of size N — not pad to 6 ghosts |

### Plate

| Topic | Finding |
|-------|---------|
| Must every asset be square? | **Not contract-locked** for `sm-001`. RTU social is square-only CERT. Reusing `cert-square-1024` is the strongest reuse path, but that plate policy for `sm-001` is still a freeze decision, not inherited law. |
| Multiple aspect versions | Excluded |

---

## 3. Calendar truth (do not call “simple” yet)

| Question | Finding now |
|----------|-------------|
| What is it? | Catalog string only: “simple content calendar.” No schema, sample artifact, or binding model in Machine renderer or intake. |
| Document vs visual vs schedule? | **Unresolved.** Could be a client-readable schedule document, a visual calendar graphic, or a dated recommendation table. Authority does not choose. |
| Relation to posting order | Social RTU deliberately separates them: order ≠ calendar. `sm-001` promises **both** suggested order **and** content calendar — they are distinct deliverables. |
| Calendar↔post binding | **Not defined.** No required keys tying calendar rows to post IDs / caption IDs. |
| Date / order truth | **Not defined.** No rule for recommended dates vs sequence-only vs week slots. |
| Customer dates required? | Client responsibilities do **not** require publish dates. Dates in campaign truth (offer windows) ≠ a posting calendar. |
| Studio production assignment? | Plausible (recommended dates), but **not frozen** — do not invent. |
| Scheduling / publishing? | **Excluded from base SKU.** Lives on `social_media-execution` / monthly twin. Calendar deliverable must not become a silent publishing engine. |
| Make required? | **No evidence.** Calendar as a document/package does not imply Make. |

**Verdict on “simple”:** Until authoritative inputs, outputs, bindings, and exclusions are Owner-frozen, the calendar remains **undefined product truth** — a primary driver of **DELTA C**.

---

## 4. Reuse from sealed Social Posts (six-lane baseline)

| Capability | Reuse for `sm-001`? |
|------------|---------------------|
| Square plate compose (`cert-square-1024`) | **Strong candidate** — if plate policy freezes square |
| Studio-written captions + fact lock | **Yes** — same doctrine |
| Caption↔post binding | **Yes** — pattern scales; implementation is exact-4 today |
| Durable posting-order manifest | **Yes** — pattern scales; exact-4 today |
| Same-plate multi-member set QA / anti-clone | **Partial** — pattern yes; **hardcoded exact-4** |
| Whole-set versioning + retain prior `vN` | **Partial** — doctrine yes; typed as quad |
| Live intake→structure map + dispatch/idempotency | **Pattern only** — wired to `v2-rtu-social-posts` only |
| Owner routine NONE | **Target** — preserve; do not remap yet |
| Fixed four layout templates (`offer_lead`…`trust_brand`) | **Insufficient for N>4** without new templates or a freeze that N≤4 for Machine (which would shrink the SKU promise) |

### Critical challenge — does the set engine support bounded variable cardinality?

**No. Not today.**

Evidence from sealed social implementation:

- `SOCIAL_POSTS_EXACT_COUNT = 4`
- `SocialPostsQuad<T> = [T,T,T,T]`
- `SocialPostOrderIndex = 1 | 2 | 3 | 4`
- Exactly four Machine layout templates
- Set QA requires positions `"1,2,3,4"` exactly once
- Captions fail closed unless asset count is exactly 4
- CERT / dispatch success = **4/4**

Social DELTA-1 itself locked: bounded four-member set — **“not an arbitrary N-asset engine.”**

Therefore **exactly-4 → up to six is not automatically trivial.** Extending without a new bounded-N contract risks:

| Failure mode | How it appears if forced |
|--------------|--------------------------|
| Identity ambiguity | Reusing `social-post-1…4` for N=6, or unstable IDs |
| Partial-set ambiguity | Is 3/6 complete “up to six,” or fail? |
| Version churn | Re-rendering when N changes mid-draft without set rules |
| Caption scrambling | Binding tables sized for 4 |
| Calendar scrambling | Dates bound to missing/padded members |
| Fake “missing” members | Padding unused slots to keep quad/hex types |
| Special-case code for counts 1–6 | Six parallel completion paths instead of one bounded-N contract |

---

## 5. Actual new capabilities (honest delta)

| # | New capability | Why not already proven |
|---|----------------|------------------------|
| 1 | **Bounded variable (or otherwise frozen) post count ≤6** | Engine + CERT + QA + types are exact-4; catalog ceiling has no min / job N |
| 2 | **Content calendar artifact + calendar↔post binding** | Explicitly out of social RTU; no schema for `sm-001` |
| 3 | **Layout variety for members beyond the four proven templates** | Only four anti-clone angles sealed |
| 4 | **Hashtag/keyword suggestion packaging** (basic, not research) | `sm-001` deliverable; RTU social does not promise Studio hashtag suggestions |
| 5 | **`sm-001`-specific intake truth** for Machine dispatch | Live RTU form is four-post social; no `sm-001` Machine intake map |

**Not new (reuse):** square compose patterns · Studio caption fact-lock · 1:1 caption binding doctrine · posting-order as first-class truth · set-level fail-closed · whole-set versioning doctrine · observer/idempotency patterns (SKU-gated) · Canva-off / Make-not-required pattern after authorized proof+hook.

---

## 6. Intake gaps (before live dispatch)

| Gap | Why it blocks Owner-independent production |
|-----|--------------------------------------------|
| No authoritative **N** (or “always produce K”) rule | Machine would invent count |
| No calendar inputs / date policy | Calendar would invent schedule truth or stay empty |
| Plate / platform size not frozen for `sm-001` | Risk of non-square or multi-size drift |
| Hashtag suggestion scope unclear | “Where appropriate” needs production bounds |
| Live customer intake for legacy `sm-001` vs RTU four-post form | Divergence risk (same F2 rule as social) |
| Execution add-on boundary | Must keep scheduling/publishing off base SKU |

Do **not** wire dispatch until cardinality + calendar truths are Owner-frozen.

---

## 7. Execution / renderer / QA / delivery gaps

| Layer | Gap |
|-------|-----|
| Renderer | No `sm-001` modules; social modules refuse non-4 counts |
| Set contract | Need bounded-N (or fixed-K) types — not `SocialPostsQuad` reuse-by-lie |
| Templates | Posts 5–6 need proven layouts or a frozen lower max |
| QA | Need max≤6, actual-count completeness, caption count = N, calendar present+bound, no fake members |
| Delivery package | Posts ×N + captions + posting order + **calendar** (+ hashtag suggestions as promised) |
| Idempotency | Whole-set fingerprint must include N + calendar bindings |
| Partial failure | Fail closed on incomplete **chosen N**, not on “missing slots up to 6” |
| Executor | Remains Canva until separately authorized proof + hook |

---

## 8. Owner-independence

| Target | Status |
|--------|--------|
| Routine Owner production | **NONE** (closeout intent) |
| Today’s Machine path for `sm-001` | **Not mapped** — Canva manual |
| Path to independence | Contract truth → proof → intake map → SKU-gated dispatch — **after** N + calendar freeze |
| Risk if proof starts now | Proof would invent cardinality/calendar business rules |

---

## 9. Downstream reuse (`sm-001-monthly`)

| Finding | Detail |
|---------|--------|
| Method twin | Override: “Same production method as `sm-001` on a monthly cycle.” |
| After `sm-001` Machine seal | Monthly should be near-A / B-follow for renderer delta |
| Do not start monthly now | Parked — billing/cycle ops are not the first wedge |
| Calendar twin | “Simple monthly posting calendar” — inherits whatever calendar truth `sm-001` freezes |

---

## 10. Protected lanes / non-goals

| Preserve | Status this package |
|----------|---------------------|
| Six sealed design lanes | Untouched |
| `sm-001` unmapped / unwired | Confirmed — still Canva |
| `ma-001` parked | Confirmed |
| Monthly parked | Confirmed |
| Canva unchanged | Confirmed |
| Make not required | Confirmed — no contrary evidence |
| Implementation / proof / commit / push / merge | **None** |

---

## 11. Delta class rationale (A/B/C/D)

| Class | Why accepted / rejected |
|-------|-------------------------|
| **A** | Rejected — calendar + count policy unproven |
| **B** | Rejected — provisional only; exact-4 engine ≠ bounded-N; calendar undefined |
| **C** | **Accepted** — material new set-cardinality contract + undefined calendar product truth, despite strong social reuse |
| **D** | Rejected — still create-from-campaign Machine shape; not edit/ingest |

**Selection vs delta:** SKU #7 selection stands. Scoreboard remains **6/13 sealed · #7 selected · not started** until contract truths earn a smaller class or a C-sized proof plan is explicitly authorized.

---

## 12. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SM-001-CONTRACT-TRUTH-1`**

Inspection / Owner-freeze package only (no renderer proof, no remapping):

1. Freeze **cardinality policy** — fixed K vs determined N≤6; minimum; completeness rule; durable IDs; ban fake members  
2. Freeze **calendar product truth** — artifact kind; required fields; calendar↔post(+caption) binding; date source; exclusions vs `social_media-execution`  
3. Freeze **plate policy** (square-only vs agreed one size) and hashtag-suggestion bounds  
4. Re-state whether the earned class after freeze is still **C** or reclasses toward **B**  
5. Only then recommend proof / intake / dispatch packages  

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
