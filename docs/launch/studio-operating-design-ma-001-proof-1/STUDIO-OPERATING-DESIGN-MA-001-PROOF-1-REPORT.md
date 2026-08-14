# STUDIO-OPERATING-DESIGN-MA-001-PROOF-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-MA-001-PROOF-1  
**Mode:** Proof only — heterogeneous pack orchestration · **no** primaryTool remap · **no** dispatch wiring · **no** sealed-producer forks  
**Scout status:** PARKED  
**Final status:** OWNER ACCEPTED — TECHNICAL PASS · VISUAL PASS WITH LIMITS  
**Git:** No commit · No push · No merge  

---

## Verdict

### MA-001 PACK ORCHESTRATOR PROOF PASS — OWNER ACCEPTED

| Gate | Status |
|------|--------|
| **Technical proof** | **PASS** (Owner accepted) |
| **Mixed 4-member visual pack** | **PASS WITH LIMITS** (Owner accepted) |
| **Pack coherence** | **ACCEPTED** — one Harbor & Oak campaign family, not four unrelated sealed outputs |
| **Single promotion-graphic adapter** | **ACCEPTED** |
| **Flyer / business card / service sheet reuse** | **ACCEPTED** |
| Proof package | **ACCEPTED** |
| Canva for `ma-001` | **Unchanged** |
| Remap / dispatch | **NOT authorized** |

**Owner visual limits (recorded, not reopened in this package):** card restrained / open; service sheet top-dense bottom-open; promo sparser than flyer; pack conservative/polished rather than energetic — acceptable for this brand.

**Offer-language note (known, not a fail):** flyer uses “…Bundle”; promo omits “Bundle”; service sheet lists separate line items — brand/palette family holds; exact string identity across offer-bearing members was not required to accept pack coherence.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA (pre-proof working tree) | `30b0e4ddef1f54813d5a408d12c28e26dccd4f22` |
| Branch | `operating/design-renderer-proof-1` |
| Classification | **MA-001 DELTA C** (accepted) |
| Contract | CONTRACT-TRUTH-1 accepted with clarifications |
| Sealed lanes | flyer · business-card · menu · service-sheet · promotion-graphics · social-posts · sm-001 · sm-001-monthly (**8/13**) |
| Canva / Make | **Unchanged** for `ma-001` / **NOT REQUIRED** |

---

## 2. Files changed (uncommitted)

| Path | Role |
|------|------|
| `src/lib/studio-design-renderer/ma-001-types.ts` | Pack / member identity types |
| `src/lib/studio-design-renderer/ma-001-contracts.ts` | Closed kinds · composition validation |
| `src/lib/studio-design-renderer/ma-001-fingerprint.ts` | Pack fingerprint |
| `src/lib/studio-design-renderer/ma-001-pack-qa.ts` | Pack-level QA |
| `src/lib/studio-design-renderer/ma-001-fixtures.ts` | Harbor max-mixed + N1 + unsupported fixtures |
| `src/lib/studio-design-renderer/ma-001-bind.ts` | Pack identity + delivery manifest persist |
| `src/lib/studio-design-renderer/ma-001-promo-member-adapter.ts` | Single `promotion_graphic` adapter |
| `src/lib/studio-design-renderer/ma-001-pipeline.ts` | Pack orchestrator |
| `src/lib/studio-design-renderer/ma-001-proof.test.ts` | Proof tests |
| `src/lib/studio-design-renderer/promo-reason.ts` | Additive export `reasonPromoGraphicAsset` (dual set path unchanged) |
| `src/lib/studio-design-renderer/index.ts` | Barrel exports |
| `docs/launch/studio-operating-design-ma-001-proof-1/artifacts/**` | Proof artifacts |
| `docs/launch/studio-operating-design-ma-001-proof-1/STUDIO-OPERATING-DESIGN-MA-001-PROOF-1-REPORT.md` | This report |

---

## 3. Composition model

Purchased pack = explicit ordered `plannedPackMembers` + `lockedPackMemberCount ∈ {1,2,3,4}`.

Each member carries durable fields before render:

- `memberId` · `kind` · `order` · `producerFamily` · `memberPurpose` · `agreedPlateId`  
- Producer payload in `memberTruthById[memberId]` (not inferred from folders/filenames)

**Count unit:** member identities (`lockedPackMemberCount`) — not artifact-file count.

---

## 4. Member identity / order (max-load fixture)

| Order | memberId | Kind | Producer family | Plate |
|------:|----------|------|-----------------|-------|
| 1 | `pack-member-1-flyer` | flyer | `v2-rtu-flyer` | portrait 1024×1536 |
| 2 | `pack-member-2-business-card` | business_card | `v2-rtu-business-card` | landscape 1536×1024 |
| 3 | `pack-member-3-service-sheet` | service_sheet | `v2-rtu-service-sheet` | portrait 1024×1536 |
| 4 | `pack-member-4-promotion-graphic` | promotion_graphic | `v2-rtu-promotion-graphics-single-adapter` | square 1024×1024 |

---

## 5. Producer reuse

| Kind | Invocation | Forked? |
|------|------------|---------|
| flyer | `runDesignRendererPipeline` | **No** |
| business_card | `runBusinessCardRendererPipeline` | **No** |
| service_sheet | `runServiceSheetRendererPipeline` | **No** |
| promotion_graphic | Adapter reuses `reasonPromoGraphicAsset` + `renderPromoAssetHtml` + `captureFlyerExports` + design QA | **No** full promo pipeline / no dual discard |

Orchestrator coordinates members under `…/renders/vN/members/{memberId}/` — does not reinvent sealed layouts.

---

## 6. Single promotion_graphic adapter

| Requirement | Result |
|-------------|--------|
| Not identical to sealed exact-two set | **Pass** — does not call `runPromo*Pipeline` |
| Does not render two and discard one | **Pass** — one asset reasoned/rendered/persisted |
| Campaign truth / plate / QA / identity | **Pass** — square or portrait only; Landscape fail-closed |
| Artifact set | PNG + PDF + HTML under one member |

---

## 7. Artifact ownership per member

| Member | Artifacts (examples) | Counts as |
|--------|----------------------|-----------|
| flyer | png + pdf + html | **1** member |
| business_card | front png + back png + pdf (+ html sides) | **1** member |
| service_sheet | png + pdf + html | **1** member |
| promotion_graphic | png + pdf + html | **1** member |

Pack completeness = **4 members**, not raw file count (files ≫ 4).

---

## 8. Pack identity / versioning

| Behavior | Result |
|----------|--------|
| Durable pack identity | `pack-identity.json` + root `current-identity.json` |
| Delivery manifest | `pack-manifest.json` (`countUnit: member_identities`) |
| Same fingerprint | **`ALREADY_RENDERED`** |
| Material change (offer / member content) | Immutable whole-pack **vN+1**; prior `vN` retained |
| Fingerprint inputs | Composition + ordered kinds/purposes/plates + member content keys + orchestrator version |

---

## 9. Partial-failure behavior

Forced failure of `pack-member-3-service-sheet` → pack **FAIL** (`MEMBER_RENDER_FAILURE`). No 3-of-4 success.

Also fail-closed on: member QA fail · missing member · wrong kind/plate · incomplete manifest · pack QA fail.

---

## 10. Member QA / pack QA

| Layer | Result |
|-------|--------|
| Member QA | Each sealed producer / adapter gate must pass |
| Pack QA | Exact locked composition · order/IDs · no missing/dup · producer QA all true · brand name consistency · artifacts present with hashes · plate match |

---

## 11. Unsupported-kind behavior

Kind `poster` → `UNSUPPORTED_KIND` at composition validation **before** render.  
No flyer fallback · no closest-match substitution.

---

## 12. Actual max-load mixed-pack evidence

**Root:** `docs/launch/studio-operating-design-ma-001-proof-1/artifacts/ma-001/`  
**Latest pack version (current-identity):** `renders/v3/` (v1 retained from first proof run)

| Member | Visual path |
|--------|-------------|
| Flyer | `renders/v3/members/pack-member-1-flyer/renders/v1/flyer.png` |
| Card front | `renders/v3/members/pack-member-2-business-card/renders/v1/front.png` |
| Service sheet | `renders/v3/members/pack-member-3-service-sheet/renders/v1/service-sheet.png` |
| Promo square | `renders/v3/members/pack-member-4-promotion-graphic/renders/v1/pack-spring-tuneup-social-square.png` |

**Campaign coherence (technical + visual skim):** Shared Harbor & Oak identity, spring offer / home-services family, navy–gold–cream language across kinds. Layouts remain producer-native (expected) — pack feels like one campaign family, not four random files, while still reading as distinct surfaces.

**Owner/Manager:** please open the four PNGs above for formal visual certification.

---

## 13. Owner-independence

| Routine Owner action | **NONE** |
|----------------------|----------|
| Tagia does not | Choose producers post-purchase · assemble outputs · reconcile missing members · build manifests · operate Canva · repair partial packs |

---

## 14. Canva / Make / eight-lane protection

| Item | Status |
|------|--------|
| Canva for `ma-001` | **Unchanged** (no remap) |
| Make | **NOT REQUIRED** |
| Sealed promo proof suite | **Green** (16/16 including sealed-lane regressions) |
| ma-001 proof suite | **6/6 green** |
| Remaining SKUs | Parked |

---

## 15. Tests / result

```
npx vitest run src/lib/studio-design-renderer/ma-001-proof.test.ts
→ 6 passed

npx vitest run src/lib/studio-design-renderer/promotion-graphics-proof.test.ts
→ 16 passed (sealed promo + flyer/card/menu/service-sheet regressions)
```

Covered: unsupported kind · N=1 · N=2 · N=3 · N=4 max mixed · ALREADY_RENDERED · vN+1 · partial fail-closed · single-promo honesty · member≠file.

---

## 16. Final verdict

# MA-001 PACK ORCHESTRATOR PROOF PASS

**Owner visual:** **PASS WITH LIMITS** · pack coherence **ACCEPTED** · proof package **ACCEPTED**

---

## 17. Git state

| Item | Value |
|------|-------|
| Commit | **NOT PERFORMED** |
| Push | **NOT PERFORMED** |
| Merge | **NOT PERFORMED** |
| Working tree | Proof sources + artifacts **uncommitted** |

---

## 18. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-MA-001-INTAKE-TRUTH-1`**

Live intake / composition-truth seam only:

- Customer locks exact member mix (`plannedPackMembers` / `lockedPackMemberCount`) **before payment**
- Machine receives that composition authoritatively (no inference from filenames/folders)
- Unsupported kinds fail closed pre-payment
- Member content inherits sealed producer contracts
- **No** remap · **no** dispatch · **no** Canva change in that package unless Owner separately authorizes

Until Owner authorizes INTAKE-TRUTH-1, do not start it.

---

## OWNER ACCEPTED — VISUAL PASS WITH LIMITS

**Scout PARKED.**
