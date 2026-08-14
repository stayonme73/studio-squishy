# STUDIO-OPERATING-DESIGN-RM-J002-CONTRACT-TRUTH-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-RM-J002-CONTRACT-TRUTH-1  
**Mode:** Product-contract freeze proposal only — no implementation · no proof · no remap · no intake UX build  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW (proposed freeze — not implemented)  
**Git:** No commit · No push · No merge  

---

## Verdict

### RM-J002 CONTRACT TRUTH — PROPOSED FREEZE (INSTAGRAM COVER CORRECTED)

| Gate | Status |
|------|--------|
| DELTA C / D-leaning — Profile Kit Composer | **HOLDS** (prior Owner accept) |
| Instagram generic profile cover | **REMOVED** — no Studio-defined Instagram profile-banner placement found |
| Facebook Page cover | **IN** — Meta Page cover photo is a real placement |
| TikTok cover | **OUT** — profile photo only |
| Platform lock before payment | **PROPOSED REQUIRED** |
| One platform per purchased kit | **PROPOSED REQUIRED** |
| Kit delivery only (no login / mutation / publish) | **PROPOSED REQUIRED** |
| Renderer / proof | **NOT AUTHORIZED** until Owner accepts this freeze |
| Canva / Make | Unchanged / **NOT REQUIRED** |
| Scoreboard | **Still 9/13** — `rm-j002` has not earned a sealed lane |

**Hard boundary honored:**

> Profile Setup Kit must **not** quietly become account setup, profile publishing, login handling, credential handling, or platform mutation. Customer applies every field and asset.

**Correction from DELTA-1 / kitchen kit-delivery code:**

Prior language and `platformSupportsCoverAsset()` treated **Instagram** as cover-capable (`facebook || instagram`). That is **not** frozen here.

| Platform | Generic profile cover / banner? | Evidence |
|----------|----------------------------------|----------|
| Facebook Page | **Yes** — Page cover photo | Meta Help: [Page profile picture and cover photo dimensions](https://www.facebook.com/help/125379114252045) |
| Instagram | **No** for this SKU | Official “cover” references are **Reels cover** / content surfaces — not a general profile banner. Reels/content creation is **excluded** from `rm-j002`. Capability matrix already notes IG User has no Facebook-style cover write. No Studio-defined Instagram profile-cover output exists in the live promise. |
| TikTok | **No** | Profile photo–centered setup; kit-delivery already omitted cover for TikTok |

**Scout finding:** Do **not** freeze an Instagram profile cover asset. Fail closed if any composition includes one.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `54f9a688750f8c250e4da7e4c22b84f5f6cea86c` |
| Branch | `operating/design-renderer-proof-1` · ahead/behind **0 / 0** |
| Prior | SELECTION-8 (`rm-j002` #10) · DELTA-1 **C / D-leaning** (Owner accepted classification; cover rule corrected here) |
| Sealed lanes | flyer · business-card · menu · service-sheet · promotion-graphics · social-posts · sm-001 · sm-001-monthly · **ma-001** (**9/13**, frozen) |
| Candidate | `rm-j002` — Make Me a Social Profile Setup Kit · executor still **Canva** |
| Authorities | `route-map-launch.ts` · `intake/schemas.ts` (`social-setup`) · `sku-overrides.ts` · `social-profile/*` · KITCHEN-SOCIAL-PROFILE-PRODUCTION-1 · DELTA-1 · Meta/TikTok placement evidence (read-only) |

---

## 2. Exact live customer promise (restated — binding)

| Topic | Frozen reading |
|-------|----------------|
| Name | Make Me a Social Profile Setup Kit |
| Unit | **One platform** per purchase · **$99 / platform** |
| Platforms sold | **Facebook** · **Instagram** · **TikTok** only |
| Facebook meaning for cover | **Facebook Page** cover photo (Page profile picture + Page cover) — not personal-profile cover invention |
| Studio delivers | Scoped bio/about (or platform bio/profile copy) · field map/checklist · profile image/avatar · **Page cover only when Facebook** |
| Customer applies | All fields and assets on the platform |
| Studio does **not** | Log in · create account · publish/save on-platform · mutate profile via API · handle passwords/credentials · post content · manage ads/DMs |

Catalog phrase “cover/banner **where the chosen platform supports one**” is hereby interpreted as: **Facebook Page only** among the three sold platforms — **not** Instagram.

---

## 3. Proposed frozen kit composition (by platform)

### Member identity rule

A **kit member** is one logical deliverable identity (may emit multiple files/artifacts).  
`lockedKitMemberCount` counts **member identities**, not raw file count.

### Shared anti-scope (all platforms)

| Forbidden in composition | Action |
|--------------------------|--------|
| Second platform | Fail closed **before payment** |
| Instagram cover / banner / “profile header” | Fail closed **before payment** |
| TikTok cover / banner | Fail closed **before payment** |
| Reels cover · Highlights cover · grid banner collage · Stories cover | Fail closed — **not** Profile Setup Kit placements (content/publishing adjacent) |
| Login / OAuth / password / admin-invite credentials | Fail closed — not sellable inputs for this path |
| Platform mutation / Studio publish | Fail closed |

---

### 3.1 Facebook (Page) — exact members

| Order | Member ID | Kind | Required |
|-------|-----------|------|----------|
| 1 | `bio_about_copy` | copy | **Yes** — Studio-written scoped about/description (platform limits; no silent truncation) |
| 2 | `field_map_checklist` | field_map_package | **Yes** — URL/contact/display-name recommendations + field-by-field setup checklist |
| 3 | `profile_image` | design | **Yes** — Page profile picture |
| 4 | `page_cover` | design | **Yes** — Page cover photo |

**`lockedKitMemberCount` = 4** (exact).

**Completeness:** All four members present and QA-pass. Missing cover = incomplete Facebook kit.

---

### 3.2 Instagram — exact members

| Order | Member ID | Kind | Required |
|-------|-----------|------|----------|
| 1 | `bio_profile_copy` | copy | **Yes** — Studio-written scoped bio/profile copy |
| 2 | `field_map_checklist` | field_map_package | **Yes** |
| 3 | `profile_image` | design | **Yes** — profile picture only |

**`lockedKitMemberCount` = 3** (exact).

**Completeness:** All three members present and QA-pass.  
**Cover:** **Not a member.** Any `page_cover` / `cover_banner` / Instagram “banner” in composition = **unsupported** → fail closed before payment.

---

### 3.3 TikTok — exact members

| Order | Member ID | Kind | Required |
|-------|-----------|------|----------|
| 1 | `bio_profile_copy` | copy | **Yes** — Studio-written scoped bio/profile copy |
| 2 | `field_map_checklist` | field_map_package | **Yes** |
| 3 | `profile_image` | design | **Yes** — profile photo only |

**`lockedKitMemberCount` = 3** (exact).

**Completeness:** All three members present and QA-pass. No cover member.

---

## 4. Platform lock before payment

| Law | Freeze |
|-----|--------|
| Platform chooser | Customer locks **exactly one** of `{facebook, instagram, tiktok}` **before payment** |
| Commercial binding | Purchase is for that one platform only (`$99 / platform`) |
| Composition binding | `plannedKitMembers` + `lockedKitMemberCount` derived from locked platform recipe — sealed at payment |
| Post-pay platform change | **Forbidden** as silent edit — would change member count/recipe (treat as new purchase / change process; not this SKU’s silent path) |
| Today’s gap | Live `social-setup` intake captures platform **after** Route Map purchase today — **Machine/product law proposed here requires pre-payment lock** before proof |

**Unsupported platform / use before payment:** anything outside the three platforms, multi-platform kits, Instagram/TikTok cover, Reels/Highlights “covers,” mutation add-ons sold as this SKU → **fail closed before payment**.

---

## 5. Copy authority

| Law | Freeze |
|-----|--------|
| Who writes scoped bio/about | **Studio** (copy / text-model class) from customer business facts + intake |
| Customer final-copy paste as sole deliverable | **Not** the model — customer supplies facts; Studio writes scoped paste-ready copy |
| Silent truncation to fit platform limits | **Forbidden** — return to copy correction |
| Facebook about length | Respect platform max (**100** chars for Page about — existing social-profile helper) |
| New marketing claims / invented offers | **Forbidden** |

---

## 6. Customer apply · no credentials

| Law | Freeze |
|-----|--------|
| Who applies fields/assets | **Customer only** |
| Studio login | **No** |
| Account creation | **No** |
| Publishing / save on platform | **Customer action** only |
| Profile mutation APIs | **Not** this SKU path |
| Credential / password / admin-invite handling | **No** |
| Owner routine | **NONE** |

---

## 7. Platform-specific plate / dimension truth (proposed)

These are **new kit plates** — not silent reuse of flyer/promo/social-post plates. Sealed square plates may inform avatar *approach* only after mapping to these IDs.

### 7.1 Avatar / profile image (all three platforms)

| Field | Freeze |
|-------|--------|
| Plate family | `profile-avatar-square` |
| Aspect | **1:1** |
| Studio production canvas (proposed) | **1024 × 1024 px** PNG (or JPG) — high-res source for circular crop |
| Display honesty | Platforms crop to **circle** — safe zone centered; corners may be lost |
| Facebook Page authority | Meta: best quality **320 × 320**; circular crop ([Help](https://www.facebook.com/help/125379114252045)) — Studio still exports **1024²** for sharpness; downscale acceptable |
| Instagram | Square profile picture only — **no** second image plate |
| TikTok | Square profile photo only — **no** second image plate |

### 7.2 Facebook Page cover only

| Field | Freeze |
|-------|--------|
| Plate ID | `facebook-page-cover-851x315` |
| Aspect | **~2.7:1** (Meta fastest-load reference) |
| Studio production canvas (proposed) | **851 × 315 px** sRGB (Meta “loads fastest” Page cover size) — optional 2× **1702 × 630** if Owner later prefers retina master with same aspect |
| Minimum honesty | Meta minimum ≥ **400 × 150** |
| Crop honesty | Left side overlapped by profile picture; desktop ~16:9 full bleed; mobile ~2.7–2.4:1 — keep critical content out of overlap/safe-edge zones |
| Authority | [Meta Help — Page profile picture and cover photo dimensions](https://www.facebook.com/help/125379114252045) |

### 7.3 Explicit non-plates (fail closed)

| Non-plate | Why |
|-----------|-----|
| Instagram profile cover / banner | No general profile placement in this SKU |
| Instagram Reels cover | Content/Reel feature — excluded from Profile Setup Kit |
| Instagram Highlights cover | Content feature — excluded |
| TikTok cover / banner | Not in kit recipe |
| Sealed flyer / menu / card / promo / social-post plates as silent substitutes | Wrong product; may only be reused if explicitly mapped in a future proof package **after** this freeze |

---

## 8. Kit identity / versioning

| Law | Freeze |
|-----|--------|
| Kit root | One durable kit identity per paid job: `campaignId` + `skuId=rm-j002` + locked `platform` + composition fingerprint |
| Versioning | Immutable kit `vN`; material change → `vN+1` (prior retained) |
| Same authoritative truth | `ALREADY_RENDERED` / already-produced kit — do not silently regenerate |
| Manifest | Kit manifest binds: platform, member IDs, order, kinds, plates, artifact hashes, member QA, kit QA |
| Inheritance from `ma-001` | **Packaging discipline only** (identity, exact N/N, fail-closed, versioning) — **not** ma-001 member kinds |

---

## 9. QA — member + kit

| Level | Freeze |
|-------|--------|
| Member QA — copy members | Copy quality gate required |
| Member QA — design members | Design quality gate required (avatar; Facebook cover) |
| Member QA — field_map_checklist | Checklist/field-map present and platform-consistent |
| Kit QA | Exact `lockedKitMemberCount` / N for that platform; no cover on IG/TT; cover present on Facebook; kit-not-mutation; no credentials; whole-kit completeness |
| QA must not shrink N | **Yes** — fail closed rather than drop cover or invent substitutes |

---

## 10. Exact member-count summary

| Locked platform | `lockedKitMemberCount` | Members |
|-----------------|------------------------|---------|
| `facebook` | **4** | bio_about_copy · field_map_checklist · profile_image · page_cover |
| `instagram` | **3** | bio_profile_copy · field_map_checklist · profile_image |
| `tiktok` | **3** | bio_profile_copy · field_map_checklist · profile_image |

---

## 11. Instagram cover ambiguity — resolved

| Question | Resolution |
|----------|------------|
| Does Instagram have a general profile cover/banner like a Facebook Page? | **No** evidence for a Studio Profile Setup Kit placement |
| Do “cover” mentions in Instagram docs count? | **Reels cover** / content covers — **out of scope** (SKU excludes posting/content creation) |
| Does kitchen code currently allow IG cover? | **Yes, incorrectly** — `platformSupportsCoverAsset` includes `instagram` — **do not freeze**; correct in a later implementation package after Owner accepts this contract |
| Freeze for Machine / proof | Instagram kit = **3 members · avatar only · no cover** |

**Renderer proof must not begin** until Owner accepts this Instagram resolution (per Owner instruction).

---

## 12. What remains after freeze (still C / D-leaning engineering)

Contract freeze retires product ambiguity on cover/platform recipes. It does **not** earn B or seal the lane.

Still new for proof later:

1. Profile kit composer (copy + design + field-map)  
2. Pre-payment platform + composition lock wiring  
3. New plates (`profile-avatar-square`, `facebook-page-cover-851x315`)  
4. Kit identity / manifest / ALREADY_RENDERED  
5. Honest Canva-off path only after authorized proof + hook  

Delta class remains **C / D-leaning** until proof is separately authorized and earned.

---

## 13. Canva / Make / scoreboard / git

| Item | Status |
|------|--------|
| Canva on `rm-j002` | **Unchanged** |
| Make | **NOT REQUIRED** |
| Scoreboard | **9/13 sealed** |
| Implementation / proof / remap | **None** |
| Commit / push / merge | **None** |
| HEAD | `54f9a688750f8c250e4da7e4c22b84f5f6cea86c` |

---

## 14. Exactly one recommended next step

**Owner accept or amend this CONTRACT-TRUTH-1 freeze** (especially Instagram cover **OUT** and Facebook cover **IN**).

Only after acceptance, authorize **`STUDIO-OPERATING-DESIGN-RM-J002-PROOF-1`** (kit composer proof against this frozen recipe) — still no remap until proof+hook packages say so.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**

**Proposed freeze:** Facebook 4-member kit (includes Page cover) · Instagram 3-member kit (**no cover**) · TikTok 3-member kit (no cover) · platform locked before payment · Studio writes scoped copy · customer applies · fail closed on unsupported use before payment.
