# STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-PROOF-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-PROOF-1  
**Mode:** Proof only — no primaryTool remap · no dispatch hook · no observer wiring · no Canva · no Make · no sealed-lane edits  
**Scout status:** PARKED  
**Git:** No commit · No push · No merge  

---

## Verdict

### SOCIAL-POSTS RENDERER PROOF PASS
### OWNER/MANAGER VISUAL VERDICT: PASS WITH LIMITS ✅

Technical proof earned for:

1. **First four-member campaign set** — exactly four square posts under one shared campaign identity, whole-set versioning, set-level fail-closed QA
2. **First Studio-written caption layer** — four captions written from campaign truth only, each durably bound to one post
3. **First durable posting order** — position → post → caption, persisted as its own artifact and versioned with the set

**Owner visual acceptance (2026-08-13):** four-post campaign set **ACCEPTED**; caption↔post binding **ACCEPTED**; posting order **ACCEPTED** (1 offer → 2 booking CTA → 3 date window → 4 brand trust). Limits are polish-level only (conservative/social-native energy; Post 2 formal centered CTA; Post 4 most stylistically distinct; CERT chrome labels not a customer concern). No weak member blocking the set.

**Operating caveat (not papered over):** renderer + visual accepted; `primaryTool` for `v2-rtu-social-posts` **remains Canva**. No dispatch hook yet. Live intake truth for per-post role/angle and platform placement is still the gate before DISPATCH-HOOK. Technical + visual PASS ≠ sealed lane.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `71f01e84ce71139c2adaf68918baa2ce9046da47` |
| Branch | `operating/design-renderer-proof-1` |
| Candidate SKU | `v2-rtu-social-posts` |
| Executor during proof | **Canva** (unchanged) |
| Preceding proven lane | PROMOTION-GRAPHICS-PROOF-1 (square plate `cert-square-1024`) |

---

## 2. Authoritative contract (preserved)

| Topic | Truth |
|-------|--------|
| Posts | Exactly **4**, all required |
| Campaign | One campaign / theme |
| Plate | Square **1024 × 1024** only — reused `cert-square-1024` |
| Portrait variants | **Not authorized** — none produced |
| Captions | **Required** — one per post, Studio-written from campaign truth |
| Posting order | **Required** — durable position → post → caption |
| Outputs | PNG + PDF + HTML per post |
| primaryTool | Remains Canva |
| Owner routine responsibility | **NONE** |

---

## 3. Files created (uncommitted, all additive)

| Path | Role |
|------|------|
| `social-posts-types.ts` | Four-member set truth/spec/caption/order/identity model |
| `social-posts-contracts.ts` | Exact-4 contract; square-only plate resolution; remap-not-authorized flags |
| `social-posts-fixtures.ts` | Harbor fixture with explicit per-post order + role angle; dispatch-scope note |
| `social-posts-captions.ts` | Deterministic caption authoring, fact validation, caption↔post binding |
| `social-posts-reason.ts` | Four distinct square layouts (offer / CTA / window / trust) |
| `social-posts-validate.ts` | Spec/plate/order/material validation |
| `social-posts-render-html.ts` | Per-post HTML |
| `social-posts-bind.ts` | Whole-set `vN` identity + caption/order artifacts + nested hashes |
| `social-posts-set-qa.ts` | Set consistency (anti-clone, caption binding, order coverage, leakage) |
| `social-posts-pipeline.ts` | Four captures → captions → order → set QA → design QA → durable identity |
| `social-posts-proof.test.ts` | Proof + fail-closed + sealed-lane regressions |
| `index.ts` | Additive exports only — existing exports untouched |
| This report + `artifacts/.../renders/v3/` | Visual evidence |

**Not changed:** flyer / business-card / menu / service-sheet / promotion-graphics production lanes · `sku-overrides` primaryTool · dispatch / observer wiring · Canva / Make wiring · live intake schemas · `PROMO_SQUARE_PLATE` definition (imported, not redefined).

---

## 4. Four-post set model

```
socialPostsSet vN
├── sharedCampaign (offer, price, dates, CTA, brand, materials, platformLabel)
├── post 1: social-post-1  · roleAngle offer_lead    · caption-1
├── post 2: social-post-2  · roleAngle cta_book      · caption-2
├── post 3: social-post-3  · roleAngle dates_window  · caption-3
└── post 4: social-post-4  · roleAngle trust_brand   · caption-4
    (all four: plate cert-square-1024, 1024×1024)
```

Exactly four posts. No N-asset pack engine. No portrait variants.

---

## 5. Shared vs per-post truth

| Set-level | Post-level |
|-----------|------------|
| Business / wordmark / offer / price / dates / phone / web / CTA | `assetId` |
| Brand colors + logo materials | `orderIndex` (1–4, unique) |
| Platform label | `roleAngle` (distinct per post) |
| Shared spec / caption / order fingerprints | `authorizedPurpose` (rendered on-post) |
| Set QA + multi-asset consistency | Layout layers + PNG/PDF/HTML + hashes + individual QA |
| Whole-set render version | Bound `captionId` |

---

## 6. Square-plate reuse (no rival plate)

| Field | Value |
|-------|--------|
| plateId | `cert-square-1024` |
| Dimensions | **1024 × 1024** |
| Source | Imported from `promo-types.PROMO_SQUARE_PLATE` — **not redefined** |
| Posts using it | All four |
| Portrait | **None** — square-only proof |

A test asserts `SOCIAL_POSTS_SQUARE_PLATE` is the same object reference as `PROMO_SQUARE_PLATE`, so a divergent square definition cannot be introduced silently.

---

## 7. Per-post role binding

| Post | Position | Role angle | Authorized purpose (fixture) | Carries price? |
|------|----------|------------|------------------------------|----------------|
| `social-post-1` | 1 | `offer_lead` | Instagram Post — square feed (CERT) — Offer lead | Yes |
| `social-post-2` | 2 | `cta_book` | Instagram Post — square feed (CERT) — Booking call to action | Yes |
| `social-post-3` | 3 | `dates_window` | Instagram Post — square feed (CERT) — Offer window reminder | Yes |
| `social-post-4` | 4 | `trust_brand` | Instagram Post — square feed (CERT) — Brand trust | **No** (brand-only) |

Order and role angle are **explicit on project truth**, not inferred. Both are rendered on each post so set variety is auditable from the PNG alone. The brand-trust post is declared `isCampaignOfferAsset: false` to the design-quality gate, matching the CERT precedent — and set QA **fails** it if it carries the price anyway.

---

## 8. Captions — Studio-written from campaign truth

Captions are generated deterministically per role angle and validated against the campaign record.

| Guard | Behavior |
|-------|----------|
| Invented price (`$99`) | `CAPTION_FAILURE` |
| Invented date (`May 31`) | `CAPTION_FAILURE` |
| Invented percentage | `CAPTION_FAILURE` |
| Prohibited claim (`Best in Richmond`) | `CAPTION_FAILURE` |
| Fixture wording in caption | `FIXTURE_LEAKAGE` |
| Creative phrasing with only truth facts | **Allowed** |

Every money token, percentage, and number in a caption must appear in the campaign-truth corpus (business name, wordmark, descriptor, headline, offer, price, was-price, date window, body, CTA, phone, web, required tokens). Wording, tone, and ordering are free.

Fixture disclaimer text (`CERTIFICATION FIXTURE / INTERNAL TEST`) appears **only on the post disclaimer plate** — never in a caption, in either mode.

Captions produced (v3):

```
Post 1 / social-post-1 / caption-1: Spring Tune-Up + Drain Clear is $189 at Harbor & Oak Home Services. The offer runs March 10 – April 15, 2026.
Post 2 / social-post-2 / caption-2: Book online or call: (804) 555-0142 or harborandoak.example/book-tuneup. Spring Tune-Up + Drain Clear is $189 at Harbor & Oak Home Services.
Post 3 / social-post-3 / caption-3: Harbor & Oak Home Services: Spring Tune-Up + Drain Clear runs March 10 – April 15, 2026 for $189. HVAC tune-up and drain clear for homeowners who want plain, steady service.
Post 4 / social-post-4 / caption-4: Harbor & Oak Home Services. Spring service you can trust. Book online or call: (804) 555-0142.
```

---

## 9. Caption ↔ post ↔ order binding (durable)

Binding is enforced in three independent places and persisted in three artifacts:

1. `assertCaptionsBoundToPosts` — count, uniqueness, assetId resolution, `orderIndex` agreement, `caption-N` ↔ position N
2. `evaluateSocialPostsSetConsistency` — re-checks binding plus order coverage and caption/post cross-reference
3. `persistSocialPostsSetArtifacts` — refuses to write if any post lacks a caption

Persisted as:

- `captions.json` — structured array with `captionId` / `assetId` / `orderIndex` / `text`
- `posting-order.json` — `position` → `assetId` → `captionId`
- `captions.txt` — human-readable, every line prefixed `Post N / assetId / captionId:`
- `artifact-identity.json` — carries `assets[].captionId`, full `captions`, full `postingOrder`, plus `captionSetFingerprint` and `postingOrderFingerprint`

A caption swapped onto the wrong post fails **`BINDING_FAILURE`** and nothing is written.

---

## 10. Four distinct layouts (anti-clone)

| Post | Layout adaptation |
|------|-------------------|
| 1 — offer lead | Top navy purpose band; left logo card + wordmark; left-stacked offer → **large price** → dates → body → CTA |
| 2 — booking CTA | Thin top rule; centered logo card; **CTA and phone set largest**; offer/price demoted below a gold divider |
| 3 — offer window | Left navy accent rail; logo card top-left; **large gold date band** with headline inside; offer/price beneath |
| 4 — brand trust | Full-width navy upper plate; centered logo card; wordmark reversed out; **no price, no dates, no offer name** |

Set QA computes a layout fingerprint per post and fails `SET_CONSISTENCY_FAILURE` if **any pair** matches. A test proves this by cloning post 1's layers onto post 2.

Shared across all four: Harbor & Oak mark, wordmark, descriptor, contact path, palette — **related, not cloned**.

---

## 11. Whole-set versioning

Proven: all four posts, both caption files, and the posting order share one `campaignSetRenderVersion`. Re-running allocates an immutable `vN+1` containing the complete set; the prior `vN` set (posts, captions, order) is retained. No independent single-post mutation inside a completed set version.

---

## 12. Individual QA + set-level QA

| Gate | Result |
|------|--------|
| Design-quality (4 artifacts, multi-asset consistency, campaign truth, artifact binding) | PASS |
| Per-post overflow / clipping | PASS |
| Set consistency (plate, order, anti-clone, role variety, offer/price by role) | PASS |
| Caption fact validation | PASS |
| Caption ↔ post ↔ order binding | PASS |
| File existence alone | Insufficient — gated |

---

## 13. Fail-closed behavior

| Case | Result |
|------|--------|
| `forceThirdAssetExportFail` (posts 1–2 staged, post 3 fails) | `PARTIAL_SET_FAILURE` |
| `forceQaFail` | `QA_FAILURE` |
| `forceSetConsistencyFail` | `SET_CONSISTENCY_FAILURE` |
| `forceCaptionBindFail` (caption on wrong post) | `BINDING_FAILURE` |
| `forceMissingCaption` (3 of 4) | `CAPTION_FAILURE` |
| `forceCaptionInventFail` (invented `$49`) | `CAPTION_FAILURE` |
| Fewer than 4 posts in truth | `MISSING_REQUIRED_TRUTH` |
| Duplicate `orderIndex` | `MISSING_REQUIRED_TRUTH` |
| Repeated `roleAngle` | `MISSING_REQUIRED_TRUTH` |
| Missing logo material | `MISSING_REQUIRED_MATERIAL` |
| Non-square plate | `INVALID_PLATE` |
| Fixture wording in customer mode | `FIXTURE_LEAKAGE` |

In every failure case no partial set is published — the set is incomplete unless all four posts, all four captions, and all four order entries pass.

---

## 14. Actual visual evidence

Owner/Manager should inspect **all four** PNGs together (v3):

- `docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/renders/v3/social-post-1.png`
- `docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/renders/v3/social-post-2.png`
- `docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/renders/v3/social-post-3.png`
- `docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/renders/v3/social-post-4.png`

Supporting artifacts in the same `v3` directory:

- `captions.json` · `captions.txt` · `posting-order.json`
- `campaign-set-design-spec.json` · `campaign-set.design-qa.json` · `artifact-identity.json`
- Matching `.pdf` and `.html` per post
- `current-identity.json` at the artifact root → **v3**

Prior sets retained at `renders/v1/` and `renders/v2/` (versioning evidence). Fail-closed and versioning test runs wrote to sibling roots: `...-versioning`, `...-partial`, `...-fail-qa`, `...-set-fail`, `...-caption-bind`, `...-caption-missing`, `...-caption-invent`.

---

## 15. Artifact identities / hashes (visual control = **v3**)

| Field | Value |
|-------|--------|
| campaignSetRenderVersion | **3** |
| designSpecVersion | `social-posts-design-spec-1.0.0` |
| rendererVersion | `design-renderer-social-posts-1.0.0` |
| sharedSpecFingerprint | `c2ac35ffa314ec7b298cd623dce9d3f6ca1bf1b4cfbc5d3d735b688a875e7f75` |
| captionSetFingerprint | `b35d70a2023965a7afdb26182494337d68dbcd04bed74fd4a61ebc730765ccc6` |
| postingOrderFingerprint | `66cbd417f04aa247091ecfd3ef81b2748aa713434f3ba6cf823bc3b68a3265a2` |
| materialFingerprint | `2a5490ae9ea5aa0336a33e4fbfacd8d905f1567bd226bd6755ae1d46bfb22b34` |
| setQaOk | **true** |

| Post | PNG sha256 |
|------|------------|
| `social-post-1` | `c295cc80723d599ad96b10875bbc34c887fedf44263be330dba035e97eff2642` |
| `social-post-2` | `4f8f87db4f1f3a5bed518b30e9ec130d528c3961775efeb6a175e04b26181cf7` |
| `social-post-3` | `6cb9aa9c2a5369e8d2e4c94560d5a41641280efdb826118e9a257d6d8d8d6843` |
| `social-post-4` | `ccff1cdb210d134e09de30e494c063b187f9d7bbaeda05d55fca01ddf93c5c08` |

Four distinct hashes — a test asserts the set cannot collapse to duplicate bytes.

---

## 16. Owner-independence

Routine production target: **Owner action = NONE**. Layouts, captions, and posting order are reasoned and rendered by the Machine from campaign truth. Tagia must not resize, duplicate/edit, write captions, sequence posts, operate Canva, or hand-repair consistency for routine jobs.

---

## 17. Canva / Make status

| Item | Status |
|------|--------|
| Canva used to produce proof | **No** |
| `primaryTool` | **Still Canva** (unchanged, asserted by test) |
| Dispatch hook | **Not authorized · not wired** |
| Observer wiring | **Not authorized · not wired** |
| Make | **NOT REQUIRED NOW** |
| Machine coordination | Four bounded captures + caption authoring + order binding + whole-set identity |

---

## 18. Sealed-lane protection

Regressions green in the same suite:

- flyer proof
- business-card proof
- menu proof
- service-sheet proof
- promotion-graphics proof

Additive `social-posts-*` modules only. `index.ts` gained exports; none were removed or changed.

---

## 19. Tests / result

```
social-posts-proof.test.ts — 21 PASS / 0 FAIL

  Social-posts proof (16):
    primaryTool still Canva + remap/dispatch/observer not authorized
    square CERT plate reused from promo (same reference), portrait not authorized
    reasoner produces four distinct 1024×1024 layouts (not clones)
    missing member / duplicate order / repeated role angle / missing logo fail closed
    exactly four captions bound to their posts, offer vs brand-trust content correct
    caption invention (price, date, claim, fixture leak) fails; creative phrasing passes
    caption bound to wrong post → BINDING_FAILURE; missing caption → CAPTION_FAILURE
    set QA rejects a cloned layout
    full proof → 4 PNG/PDF/HTML + captions.json + captions.txt + posting-order.json,
      durable position → post → caption bindings, 4 distinct PNG hashes,
      brand-trust post carries no price
    second run → vN+1 whole set; prior set (posts + captions + order) retained
    forceThirdAssetExportFail → PARTIAL_SET_FAILURE
    forceQaFail → QA_FAILURE
    forceSetConsistencyFail → SET_CONSISTENCY_FAILURE
    forceCaptionBindFail → BINDING_FAILURE
    forceMissingCaption → CAPTION_FAILURE
    forceCaptionInventFail → CAPTION_FAILURE

  Sealed-lane regressions (5):
    flyer · business-card · menu · service-sheet · promotion-graphics
```

Typecheck: no new TypeScript errors introduced by this package (pre-existing repo-wide errors are unrelated and untouched).

---

## 20. Proof verdict

### SOCIAL-POSTS RENDERER PROOF PASS

With mandatory sequencing:

1. Owner/Manager **visual** review of the v3 four-post set (posts + captions + order together)
2. Live intake truth for per-post role/angle and platform placement must be established before any DISPATCH-HOOK
3. Only then consider executor remapping

---

## 21. Git state

| Field | Value |
|-------|--------|
| HEAD | `71f01e84ce71139c2adaf68918baa2ce9046da47` |
| Branch | `operating/design-renderer-proof-1` |
| This package | Uncommitted proof stack under `src/lib/studio-design-renderer/social-posts-*` + docs artifacts |
| Commit | **None** |
| Push | **None** |
| Merge | **None** |

---

## 22. Exactly one recommended next step

**Visual gate: DONE** — PASS WITH LIMITS (Owner 2026-08-13).  
**Intake structure gate: DONE** — see `STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-INTAKE-TRUTH-1` (roles = proven Machine layouts / Studio production assignment — **not** customer contract roles).

**Next package (Owner authorize):** **`STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-DISPATCH-HOOK-1`**

---

## Scout

**PARKED.**
