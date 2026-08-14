# STUDIO-OPERATING-DESIGN-RM-J002-DELTA-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-RM-J002-DELTA-1  
**Mode:** Inspection only — no implementation · no proof · no remap · no sealed-lane edits · no `ma-001` reopen  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### RM-J002 DELTA C / D-LEANING — PROFILE KIT COMPOSER (HOLDS)

Selection-8’s provisional class **holds**. This inspection does **not** promote `rm-j002` to B and does **not** demote it to pure D.

Nine sealed design lanes (including frozen `ma-001`) prove create-from-spec surfaces, same-family sets, heterogeneous **marketing** packs, payment-composition seals for packs, and Owner-NONE dispatch. They do **not** prove a **Profile Setup Kit**.

Against that baseline, `rm-j002` still requires material new product/capability truths:

1. **Kit composer class** — one coordinated package spanning **copy + design assets + field-map/checklist** production systems (not a renderer-only pack of sealed marketing kinds).  
2. **Platform-recipe membership** — fixed deliverable recipe per chosen platform, with **cover/banner present or omitted by platform support** (not customer-variable 1–4 pack N).  
3. **Plate / dimension freeze missing** — profile avatar and cover/banner pixel contracts are **not** frozen; sealed square/portrait/card plates are **candidates only**, not proven kit plates.  
4. **Studio-authored profile copy** — bio/about/description are Studio-produced (text-model class), not customer-final-copy paste alone.  
5. **Hard anti-mutation boundary** — sold path is kit files the customer applies; login, OAuth mutation, publishing, and account creation remain **excluded** (Owner A+C).

Together that is **C / D-leaning**: packaging/composition discipline from `ma-001` is useful inheritance, but the **profile kit composer** is still new work — not a parameter tweak on `ma-001` or on sealed visual SKUs.

Not A: kit schema, plates, copy authority, and completeness gates unproven for Machine design migration.  
Not B: must not promote because `ma-001` taught multi-member orchestration.  
Not pure D: still create-and-deliver kit from campaign/work-packet truth — not edit-existing ingest (`rm-j007` class).

**Delta C / D-leaning holds.** Do not start proof until Owner freezes the product truths in §11. Scoreboard remains **9/13** until `rm-j002` earns its lane.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `54f9a688750f8c250e4da7e4c22b84f5f6cea86c` |
| Branch | `operating/design-renderer-proof-1` |
| Ahead / behind vs origin | **0 / 0** |
| Selection | Owner accepted SELECTION-8 — provisional SKU #10 = `rm-j002` · **C / D-leaning** |
| Sealed Machine design lanes (do not touch) | flyer · business-card · menu · service-sheet · promotion-graphics · social-posts · sm-001 · sm-001-monthly · **ma-001** (**9/13**) |
| Candidate | `rm-j002` — Make Me a Social Profile Setup Kit |
| Current executor | **Canva** (+ optional text model) — **no** `studio_design_renderer` remap |
| Parked | `bf-001` · `rm-j008` · `rm-j007` · held handout · `ma-001-monthly` |
| Canva / Make | Canva **unchanged** · Make **NOT REQUIRED** |
| `ma-001` | **FROZEN** — reopen only on defect evidence |

**Authorities (read-only):** `src/catalog/route-map-launch.ts` · `src/catalog/intake/schemas.ts` (`social-setup`) · `sku-overrides.ts` · `closeout/ledger.ts` · `src/lib/studio-kitchen-production/social-profile/*` · `docs/launch/kitchen-social-profile-production-1/*` · SELECTION-8 · sealed nine-lane reports.

---

## 2. Exact live customer promise

| Topic | Authoritative truth |
|-------|---------------------|
| Name | **Make Me a Social Profile Setup Kit** |
| Purpose | Complete setup kit for **one** Facebook, Instagram, or TikTok profile — platform-ready bio/about, contact/URL field map, profile and cover assets where applicable, and exact field-by-field setup instructions **the customer applies** |
| Price | **$99 / platform** (`priceCents: 9900`) |
| Service class | core · catalog status **limited** |
| Execution mode | **`creation_delivery`** — not managed platform mutation |
| Studio produces | Platform-specific bio/about copy; business/profile description; URL/contact field map; profile image/avatar; cover/banner **where the platform supports one**; display-name/field recommendations; platform-specific setup sheet + checklist; Studio QC |
| Customer does | Own/create the account; complete platform login/security; **apply the delivered kit** on the platform; supply logo/brand assets and accurate business facts/links/hours |
| Owner routine | **NONE** |
| Readiness (closeout / override) | **CUSTOMER READY WITH LIMITS — PROFILE KIT** |

### Hard boundary (must not quietly expand)

| Claim | Live promise? |
|-------|----------------|
| Studio configures / mutates the live profile | **No** — excluded (“logging into your account or performing platform-side profile mutations”) |
| Studio creates the underlying account | **No** — excluded |
| Studio posts, schedules, or manages content | **No** — excluded |
| Studio handles ads, DMs, verification, old-admin disputes | **No** — excluded |
| More than one platform per job | **No** — excluded |
| Facebook Page API mutation sold here | **No** — future-only / not wired / not sold as mutation |
| Instagram / TikTok direct mutation | **UNSUPPORTED** |

**Delta freeze:** Machine path must remain **kit delivery only**. Any proof or remap that implies login, publishing, or account setup **violates** the live promise unless Owner intentionally reopens A+C (out of scope for this package).

---

## 3. Member / output count — fixed recipe vs variable N

### Kit deliverable IDs (setup mode)

From `kitDeliverablesForMode("setup")`:

| # | Deliverable ID | Production system |
|---|----------------|-------------------|
| 1 | `bio_about_copy` | copy |
| 2 | `profile_description` | copy |
| 3 | `url_contact_field_map` | field_map_package |
| 4 | `profile_image_asset` | design |
| 5 | `cover_banner_asset` | design (**omit when platform has no cover**) |
| 6 | `display_name_recommendations` | field_map_package |
| 7 | `setup_sheet_checklist` | field_map_package |

### Fixed or variable?

| Question | Finding |
|----------|---------|
| Customer-chosen N ∈ {1..4} like `ma-001`? | **No.** |
| Fixed exact count always? | **Nearly fixed recipe** — seven logical deliverables for FB/IG; **six** when cover omitted (TikTok). |
| What varies? | **Platform support for cover/banner** (`platformSupportsCoverAsset`: facebook + instagram = true; tiktok = false). Not a customer pack builder. |
| Delivery map quantity | `social_profile_setup_kit` · quantity **1** · unit **platform** — one kit per platform job |
| Completeness rule | Whole kit for the chosen platform must be complete; omitting cover on TikTok is **correct**; omitting cover on Facebook/Instagram is **incomplete** |

**Delta freeze candidate:** membership is a **platform-determined fixed recipe**, not heterogeneous marketing-pack cardinality. Do not reuse `ma-001` 1–4 chooser language.

---

## 4. What kind of “kit” is this?

| Model | Fits? |
|-------|-------|
| Multiple independent assets with no package binding | **No** — sold as one kit; checklist binds fields + assets |
| One coordinated package | **Yes** — primary product shape |
| Both | **Yes, precisely:** multiple **heterogeneous deliverable kinds** (copy · design · field-map) assembled into **one** platform kit identity |

**Contrast with `ma-001`:** Promotion Pack = ordered marketing **visual members** of sealed/standard kinds. Profile Setup Kit = **composer** across copy + visuals + implementation sheet. Shared inheritance is **package discipline**, not member-kind enum.

---

## 5. Supported profile / platform targets

| Platform | Sold? | Cover/banner in kit? | Mutation under A+C |
|----------|-------|----------------------|--------------------|
| Facebook | **Yes** (one of three) | **Yes** (included) | Future-only Page API — **not** this SKU path |
| Instagram | **Yes** | **Yes** (included in kit architecture; Graph cover write unsupported — customer applies) | **UNSUPPORTED** |
| TikTok | **Yes** | **No** (omit cover) | **UNSUPPORTED** |

Intake options (`social-setup`): `Facebook` · `Instagram` · `TikTok` — **exactly one** required.

**Note:** Facebook capability text treats **Page** (not personal profile) as the mutation research target. Kit delivery still sells “Facebook” as platform label; Machine DELTA must not invent personal-vs-Page without Owner freeze if it changes assets/fields.

---

## 6. Which outputs can reuse sealed visual producers?

| Output | Sealed reuse? | Evidence |
|--------|---------------|----------|
| Profile image / avatar | **Partial candidate only** | Square plate (`cert-square-1024`) is nearest sealed surface; circular crop / platform avatar rules **not** proven |
| Cover / banner | **Not proven** | Sealed landscape card (`1536×1024`) and promo landscape (fail-closed) are **not** documented kit cover plates; platform cover aspect ratios **unfrozen** |
| Flyer / menu / service-sheet / business-card / promo set / social posts / sm-001 / ma-001 pack members | **Not pack members of this SKU** | Wrong product shape — do not force kit into `ma-001` kinds |
| Bio/about/description copy | **Copy path** (text model / CERT-COPY method) — not design-renderer | Already cited in kit-delivery coverage |
| Field map / setup checklist | **social-profile package** — new for design-migration Machine spine | Exists as kitchen kit architecture; not a sealed design lane |

**Delta freeze:** visual **producer reuse is limited to avatar/cover-like graphics under new plate contracts**. Do not claim nine-lane visual SKUs already fulfill the kit.

---

## 7. Profile / banner dimensions — new plates?

| Question | Finding |
|----------|---------|
| Frozen Machine `agreedPlateId` for avatar? | **No** |
| Frozen Machine plate for cover/banner? | **No** |
| Pixel sizes in catalog / kit-delivery / social-profile types? | **Not found** |
| Does nine-lane baseline retire new plates? | **No** — sealed plates are marketing/social-post plates, not profile-kit plates |

**Implication:** avatar and cover almost certainly create **new plate requirements** (or an Owner-accepted mapping onto existing plates with crop rules). Until Owner freezes plates, proof must **fail closed** rather than silently use flyer/promo sizes.

---

## 8. Text / bio / about copy

| Question | Finding |
|----------|---------|
| Is copy included? | **Yes** — bio/about + business/profile description + display-name/field recommendations |
| Who authors final paste-ready copy? | **Studio** (copy production / text-model class) from customer business facts and intake notes |
| Does customer supply final bio as client responsibility? | **No** — responsibilities are account ownership, apply kit, brand assets, accurate business information/links/hours |
| Intake fields | platform · businessName · profileGoal · currentProfileNotes · brandNotes — **not** a “final bio paste” field |
| Platform length honesty | Facebook about max **100** chars enforced in social-profile copy helpers — **no silent truncation** |

**Delta freeze:** copy is an in-SKU production system, not optional decoration. Remapping `primaryTool` to `studio_design_renderer` alone would be **dishonest** unless a kit composer still owns copy + field map.

---

## 9. Platform-specific exports

| Layer | Platform-specific? |
|-------|--------------------|
| Bio/about field labels and limits | **Yes** |
| Field map / checklist rows | **Yes** (`buildPlatformFieldChecklist`) |
| Cover inclusion | **Yes** (omit TikTok) |
| Asset file formats | Flattened digital assets (Canva-era path); exact per-platform export matrix **not** frozen beyond “profile image” + optional cover |
| Separate export set per platform in one job | **N/A** — one platform per job |

---

## 10. Account configuration, publishing, login

| Question | Authoritative answer |
|----------|----------------------|
| Does Studio configure accounts? | **No** — kit files only |
| Does Studio publish / save on-platform? | **No** — checklist lists “Publish / save” as **Customer action** |
| Is login / admin invite / password required for sold path? | **No** — excluded; no raw-password workflow |
| OAuth / Meta app for sold path? | **Not started** · not required for kit |
| Fulfillment resolver | Always resolves to **`kit`** while Meta OAuth not started (`resolveFulfillment`) |

---

## 11. Kit identity, completeness, QA

### Identity / completeness (today)

| Topic | Status |
|-------|--------|
| Work packet identity (`workPacketId` / version / campaign / sku / mode / platform) | Exists in social-profile types |
| Machine **kit identity** analogous to `ma-001` pack identity (fingerprint, versioned kit root, ALREADY_RENDERED) | **Not frozen** for design-renderer migration |
| Whole-kit completeness | Implied by deliverable coverage + platform cover rule; **not** sealed as Machine pack QA |
| Member-level QA | **Required:** per-artifact **copy QA** + **design QA** (`quality-gates.ts`, sku-overrides, kit limits) |
| Kit-level QA | Checklist present (`field_checklist_present`); kit-not-mutation; no password workflow — **not** a sealed nine-lane pack-QA clone |

### Intake truth — before payment vs after

| Topic | Finding |
|-------|---------|
| Commercial unit | **$99 / platform** |
| When platform is captured today | **`social-setup` intake** (Route Map post-purchase style) — required field |
| Pre-payment composition seal like `ma-001`? | **Not present** for `rm-j002` |
| Gap | Platform is commercially material, but Machine payment-composition lock for platform (and thus cover recipe) is **not** frozen before payment |

**Owner freeze needed before proof:** whether platform (and therefore cover membership) must be locked at purchase, or may remain post-pay intake with fail-closed production until present.

Minimum production intake (whenever captured): platform · business/profile name · profile goal · current profile notes / intended messaging · brand materials path · customer owns/will own account.

---

## 12. What is genuinely new after the nine sealed lanes?

| Capability | Nine-lane status | `rm-j002` need |
|------------|------------------|----------------|
| Single-surface / set / heterogeneous **marketing** pack rendering | Proven | **Not sufficient** |
| Pack composition → payment seal → post-pay structure → dispatch | Proven for `ma-001` | Pattern to **borrow**, not copy as member kinds |
| Profile kit composer (copy + assets + field map) | **Not proven** | **NEW — principal delta** |
| Platform field maps / setup checklists as deliverables | Kitchen social-profile sealed as product honesty | Still **new** on design-migration Machine spine |
| Avatar / cover plate contracts | **Not proven** | **NEW** (or Owner-mapped with crop rules) |
| Studio-authored bio/about inside design SKU fulfillment | Copy method exists; not wired as design-renderer lane | **NEW integration** for this SKU’s Machine path |
| Kit-not-mutation / no login sold path | Product-sealed A+C | Must be **preserved**, not “solved” by renderer |
| Canva OFF for `rm-j002` | Still **ON** | Future authorized remap only after proof |

---

## 13. Capability-delta matrix (evidence)

| Lens | Result |
|------|--------|
| Reuse from sealed visuals | Limited — avatar/cover **candidates** only |
| Reuse from `ma-001` | Packaging / exact membership / fail-closed / identity **patterns** |
| Reuse from social-profile A+C | Contract honesty, kit deliverable list, cover omit rule, anti-mutation |
| Principal new work | **Profile kit composer** + plate freeze + Machine kit identity/completeness + copy+design+field-map orchestration |
| Owner-independence risk | Medium if class honesty held; **high** if forced into pure `studio_design_renderer` remap |
| Likely next sibling | `rm-j008` may inherit kit structure after this proves — **out of scope now** |

---

## 14. Final Delta classification

### **C / D-LEANING — PROFILE KIT COMPOSER**

| Class | Why accepted / rejected |
|-------|-------------------------|
| **A** | Rejected — too much unfrozen (plates, kit Machine identity, pre-pay platform lock, composer) |
| **B** | Rejected — must not promote because `ma-001` multi-member orchestration exists |
| **C / D-leaning** | **Accepted** — new kit composer class on create-and-deliver spine; not edit-ingest |
| **D** | Rejected as sole label — not `rm-j007` edit-existing; still kit creation from facts |

**Watchpoints that would push toward D if mishandled:** treating kit as login/mutation; inventing account setup; ingesting customer’s existing live profile files as the primary production model.

**Watchpoints that would falsely look like B:** “ma-001 already packs multiple members” / “square plate already exists for avatars.”

---

## 15. Fail-closed rules (pre-proof freeze candidates)

Do not implement here — freeze intent only:

1. Never imply Studio login, OAuth mutation, publishing, or account creation.  
2. Never deliver Facebook/Instagram kits without cover when cover is in the platform recipe.  
3. Never include TikTok cover as required.  
4. Never silently truncate bio/about to fit platform limits.  
5. Never treat sealed marketing kinds as legal kit “members.”  
6. Never invent avatar/cover plates — fail closed until Owner freezes dimensions/mapping.  
7. Never remap `primaryTool` to `studio_design_renderer` alone without a kit composer owning copy + field map.  
8. Do not start `rm-j008` proof from this package.  
9. Do not reopen `ma-001`.

---

## 16. Canva / Make / scoreboard

| Item | Status |
|------|--------|
| Canva on nine sealed lanes | **OFF** |
| Canva on `rm-j002` | **Unchanged (ON)** |
| Make | **NOT REQUIRED** |
| Design migration scoreboard | **Still 9/13** — `rm-j002` has not earned a sealed lane |
| Remap / proof / implementation | **None in this package** |

---

## 17. Git state

| Field | Value |
|-------|--------|
| HEAD | `54f9a688750f8c250e4da7e4c22b84f5f6cea86c` |
| Branch | `operating/design-renderer-proof-1` |
| Ahead/behind | **0 / 0** |
| This package | Report only under `docs/launch/studio-operating-design-rm-j002-delta-1/` |
| Commit / push / merge | **None** |
| Sealed lanes touched | **None** |

---

## 18. Exactly one recommended next step

**Owner freeze board (product truths), then authorize either:**

- **`STUDIO-OPERATING-DESIGN-RM-J002-CONTRACT-TRUTH-1`** — if Owner wants explicit freezes for plates, pre-pay platform lock, kit identity/completeness, and composer boundaries before proof, **or**  
- **`STUDIO-OPERATING-DESIGN-RM-J002-PROOF-1`** — only after those truths are accepted as frozen enough for an honest C/D proof scope.

Do **not** authorize remap or Canva-off until proof + hook are separately authorized.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**

**RM-J002 DELTA C / D-LEANING — PROFILE KIT COMPOSER holds.** Scoreboard **9/13**. Hard boundary preserved: kit delivery only — not account setup, publishing, login, or platform management.
