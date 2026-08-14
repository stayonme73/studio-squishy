# STUDIO-OPERATING-DESIGN-RM-J008-CONTRACT-TRUTH-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-RM-J008-CONTRACT-TRUTH-1  
**Mode:** Product-contract freeze proposal only — no implementation · no proof · no remap · no intake UX build  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW (proposed freeze — not implemented)  
**Git:** No commit · No push · No merge  

---

## Verdict

### RM-J008 CONTRACT TRUTH — PROPOSED FREEZE (FULL REPLACEMENT KIT)

| Gate | Status |
|------|--------|
| DELTA **B** — update kit on sealed `rm-j002` composer | **HOLDS** (Owner accepted) |
| Sold path | **Replacement kit** · customer applies · **not** platform mutation |
| Before-state | **Customer-supplied only** — no login · no live inspect · no scrape |
| Unchanged after-state members | **REISSUE always** — full platform recipe every time |
| Partial “bio-only kit” as sold composition | **REJECTED** — fail closed / not a purchasable variant |
| Instagram / TikTok cover | **OUT** (inherit sealed `rm-j002`) |
| Facebook Page cover | **IN** when platform = Facebook |
| Renderer / proof | **NOT AUTHORIZED** until Owner accepts this freeze |
| Canva / Make | Unchanged / **NOT REQUIRED** |
| Scoreboard | **Still 10/13** — `rm-j008` has not earned a sealed lane |

**Hard boundary honored:**

> Social Profile Update Kit must **not** quietly become login handling, live profile inspection, scraping, credential handling, or platform mutation. Customer applies every replacement.

**Biggest contract question — answered:**

If the customer only wants a bio rewrite, Studio still delivers a **full replacement kit** for that platform (exact after-state recipe members + change sheet). Unchanged fields are marked **UNCHANGED** on the change sheet but their after-state members are **still reissued** so the customer has one complete apply package. Variable “changed-members-only” kits are **not** sold and must **fail closed before payment** if attempted as a composition.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Prior | SELECTION-9 (`rm-j008` #11) · DELTA-1 **B** (Owner accepted) |
| Sealed lanes | **10/13** including frozen `rm-j002` |
| Candidate | `rm-j008` — Make Me a Social Profile Update Kit · executor still **Canva** |
| Authorities | `route-map-launch.ts` · `intake/schemas.ts` (`social-setup`) · `sku-overrides.ts` · `social-profile/*` · KITCHEN-SOCIAL-PROFILE-PRODUCTION-1 (A+C) · sealed `rm-j002` CONTRACT-TRUTH / FINAL-SEAL · DELTA-1 |

---

## 2. Exact live customer promise (restated — binding)

| Topic | Frozen reading |
|-------|----------------|
| Name | Make Me a Social Profile Update Kit |
| Unit | **One platform** per purchase · **$99 / platform** |
| Platforms sold | **Facebook** · **Instagram** · **TikTok** only |
| Existing profile | Customer already controls the profile — **not** new account setup (`rm-j002`) |
| Studio delivers | Full after-state kit for that platform + before→after change sheet + field-replacement checklist |
| Customer applies | All replacements on the platform |
| Studio does **not** | Log in · inspect live accounts · scrape profiles · mutate platform state · handle passwords/credentials/admin invites · publish/save on-platform · create accounts · post content |

---

## 3. Unchanged members — freeze decision (binding)

### Question

If only a bio rewrite is requested, deliver full kit or only changed members + change sheet?

### Freeze: **FULL REPLACEMENT KIT — reissue all after-state recipe members**

| Rule | Freeze |
|------|--------|
| After-state membership | Always exact sealed platform recipe (**FB 4 / IG 3 / TT 3** after-state identities) |
| Unchanged fields | Still get a delivered after-state member (copy/asset/checklist row as applicable) |
| Change sheet | Marks each recipe field **CHANGED** \| **UNCHANGED** \| **NOT_APPLICABLE** |
| “Bio-only” / “avatar-only” sold kits | **Not offered** — unsupported composition → **fail closed before payment** |
| Why | Catalog sells a complete Update Kit at the same unit price as Setup; apply path must be one coherent package; payment truth / completeness / versioning stay exact-N (not variable changed-subset); inherits sealed `rm-j002` recipe discipline |

**Not frozen:** shipping only the change sheet without after-state artifacts.  
**Not frozen:** omitting UNCHANGED avatar/cover files and telling the customer to “keep whatever is live.”

---

## 4. Anti-scope (all platforms) — fail closed before payment

| Forbidden | Action |
|-----------|--------|
| Second platform / multi-platform kit | Fail closed **before payment** |
| Credentials · passwords · admin invite · OAuth tokens as intake | Fail closed |
| Studio login · live account inspect · scrape · API readback as sold path | Fail closed |
| Platform mutation / Studio publish | Fail closed |
| New account setup sold as `rm-j008` | Fail closed — use `rm-j002` |
| Instagram cover / banner / profile header | Fail closed |
| TikTok cover / banner | Fail closed |
| Reels / Highlights / Stories “covers” | Fail closed — content surfaces, excluded |
| Changed-members-only / partial recipe composition | Fail closed |
| Claiming mutation or “we updated your live profile” | Fail closed |

---

## 5. Before-state (customer-supplied) — exact required fields

**Source freeze:** `customer_supplied` only (details and/or screenshot references the customer provides).  
**Not allowed as sold before-state:** Studio login, live scrape, or credentialed `platform_readback`.

### Shared required before-state (all platforms)

| Field | Required | Notes |
|-------|----------|-------|
| `platform` | **Yes** | Exactly one of Facebook / Instagram / TikTok |
| `businessName` | **Yes** | Current business / profile identity |
| `before.displayName` | **Yes** | What shows today (or explicit “unknown / blank”) |
| `before.bioOrAbout` | **Yes** | Current bio/about text (or explicit “blank / none”) |
| `before.website` | **Yes** | Current URL or explicit “none” |
| `before.phone` | **Yes** | Current phone/contact or explicit “none” |
| `before.profileImageNote` | **Yes** | Description of current avatar, screenshot ref, or “none / default” |
| `customerControlsExistingProfile` | **Yes** | Affirmation — existing profile, not new setup |
| `updateIntentNotes` | **Yes** | What should change (customer direction) — does **not** shrink membership |

### Platform-specific before-state

| Platform | Extra required before fields |
|----------|------------------------------|
| **Facebook** | `before.pageCoverNote` — current Page cover description/screenshot ref or “none / default” |
| **Instagram** | — none beyond shared; **no** before cover field (cover OUT) |
| **TikTok** | — none beyond shared; **no** before cover field (cover OUT) |

Screenshot attachments (when used) are **references to customer-supplied evidence**, not Studio-fetched captures.

Missing any required before field → **fail closed before payment**.

---

## 6. After-state outputs — exact rules

### 6.1 Revised bio / profile copy

| Rule | Freeze |
|------|--------|
| Authority | Studio writes **revised approved** platform-scoped copy (same class as sealed `rm-j002`) |
| Limits | Platform length limits; **no silent truncation** |
| Relation to before | May rewrite freely within approved after facts + update intent; must appear on change sheet as CHANGED or UNCHANGED |
| Customer paste-only | Not required — Studio craft allowed |

### 6.2 Avatar replacement

| Rule | Freeze |
|------|--------|
| Always a kit member | **Yes** — reissued every Facebook / Instagram / TikTok update kit |
| Plate | Inherit sealed `rm-j002` avatar plate |
| When UNCHANGED | Still reissue after-state avatar artifact consistent with locked after brand truth (may match prior kit bytes if truth unchanged) |
| When CHANGED | Regenerate/replace from approved after brand/logo materials |
| New logo from scratch | **Excluded** (catalog) |

### 6.3 Facebook Page cover replacement

| Rule | Freeze |
|------|--------|
| When platform = Facebook | **Required** after-state member — reissued every time |
| Plate | Inherit sealed `rm-j002` Facebook Page cover plate |
| UNCHANGED / CHANGED | Same reissue rule as avatar |
| Instagram / TikTok | Cover member **forbidden** |

### 6.4 Field-replacement checklist

| Rule | Freeze |
|------|--------|
| Role | Replaces setup “Enter” framing with **“Replace with” / “Leave as-is (UNCHANGED)”** rows |
| Coverage | Every after-state field in the platform recipe + publish/save customer action |
| Credentials | Never requested |

### 6.5 Before→after change sheet (real kit member)

| Rule | Freeze |
|------|--------|
| Member ID | `before_after_change_sheet` |
| Kind | `field_map_package` (change-diff package) |
| Required | **Always** — all platforms |
| Contents | Reviewed before-state summary · per-field before value · after value · status CHANGED \| UNCHANGED \| NOT_APPLICABLE · customer-apply note |
| Honesty | May only claim CHANGED when before≠after in locked truth; must not invent live-profile observations beyond customer-supplied before |
| Catalog “Reviewed current-profile inputs” | **Satisfied inside this member** (before summary block) — not a separate optional member |

---

## 7. Exact kit membership by platform

### Member identity rule

A **kit member** is one logical deliverable identity (may emit multiple files).  
`lockedKitMemberCount` counts **member identities**, not raw file count.

### After-state recipe (inherits sealed `rm-j002` IDs/kinds)

Plus **one** update-only member: `before_after_change_sheet`.

---

### 7.1 Facebook (Page) — exact members

| Order | Member ID | Kind | Required |
|-------|-----------|------|----------|
| 1 | `bio_about_copy` | copy | **Yes** — after-state (reissued) |
| 2 | `field_map_checklist` | field_map_package | **Yes** — field-**replacement** checklist (reissued) |
| 3 | `profile_image` | design_avatar | **Yes** — after-state avatar (reissued) |
| 4 | `page_cover` | design_page_cover | **Yes** — after-state Page cover (reissued) |
| 5 | `before_after_change_sheet` | field_map_package | **Yes** — update-only |

**`lockedKitMemberCount` = 5** (exact).

**Completeness:** All five present and QA-pass. Missing cover or change sheet = incomplete Facebook update kit.

---

### 7.2 Instagram — exact members

| Order | Member ID | Kind | Required |
|-------|-----------|------|----------|
| 1 | `bio_profile_copy` | copy | **Yes** — after-state (reissued) |
| 2 | `field_map_checklist` | field_map_package | **Yes** — replacement checklist (reissued) |
| 3 | `profile_image` | design_avatar | **Yes** — after-state avatar (reissued) |
| 4 | `before_after_change_sheet` | field_map_package | **Yes** — update-only |

**`lockedKitMemberCount` = 4** (exact).

**Cover:** **Not a member.** Any cover/banner in composition → fail closed before payment.

---

### 7.3 TikTok — exact members

| Order | Member ID | Kind | Required |
|-------|-----------|------|----------|
| 1 | `bio_profile_copy` | copy | **Yes** — after-state (reissued) |
| 2 | `field_map_checklist` | field_map_package | **Yes** — replacement checklist (reissued) |
| 3 | `profile_image` | design_avatar | **Yes** — after-state avatar (reissued) |
| 4 | `before_after_change_sheet` | field_map_package | **Yes** — update-only |

**`lockedKitMemberCount` = 4** (exact).

**Cover:** **Not a member.**

---

## 8. Kit completeness rule

| Rule | Freeze |
|------|--------|
| Exact N | Deliver exactly `lockedKitMemberCount` for the locked platform (FB **5** / IG **4** / TT **4**) |
| QA must not shrink N | Fail closed rather than drop UNCHANGED members or omit change sheet |
| Setup kit seal ≠ update kit | An `rm-j002` seal must **not** fulfill `rm-j008` |
| Partial change request | Still full N; change sheet records which fields CHANGED |

---

## 9. Whole-kit identity / versioning

| Rule | Freeze |
|------|--------|
| Version unit | **Whole update kit** (all members together) |
| Fingerprint inputs | Platform · before-state · after-state facts · brand/logo material · membership recipe · presentation/plate versions · SKU `rm-j008` |
| Same authoritative truth | **`ALREADY_RENDERED`** — no new kit version |
| Material authorized truth change | Immutable **`vN+1`** — prior version retained |
| Collision | Must not share identity namespace with `rm-j002` kit seals |

---

## 10. Member QA + kit QA

| Gate | Freeze |
|------|--------|
| Member QA — copy | Platform limits; no silent truncation; after copy present |
| Member QA — design | Avatar QA; Facebook cover QA when FB |
| Member QA — change sheet | Before summary present; every recipe field row present; CHANGED claims match before≠after; no credential language |
| Member QA — replacement checklist | Rows cover full recipe; UNCHANGED rows explicit; customer-apply / no Studio login |
| Kit QA | Exact N; no IG/TT cover; FB cover present; kit-not-mutation; before-state customer-supplied; full reissue (no partial recipe) |
| Owner routine | **NONE** |

---

## 11. Pre-payment lock (proposed — not implemented)

Checkout accepts `rm-j008` only when locked:

1. Exactly one platform  
2. `customerControlsExistingProfile = true`  
3. Complete customer-supplied **before-state** (§5)  
4. Approved **after-state** business facts + brand notes for regenerable assets  
5. Locked membership = §7 recipe for that platform  
6. No credential / login / admin-invite fields  
7. Not a partial-membership composition  

`skuId = rm-j008` alone is **not** enough.

---

## 12. Customer applies (binding)

| Step | Actor |
|------|-------|
| Produce kit files + change sheet | Studio |
| Log in to Facebook / Instagram / TikTok | **Customer** |
| Replace fields / upload assets per checklist | **Customer** |
| Publish / save on platform | **Customer** |
| Studio performs on-platform changes | **Never** on this SKU |

---

## 13. Inheritance from sealed `rm-j002` (do not reopen)

| Inherited | Notes |
|-----------|--------|
| Platform set | Facebook · Instagram · TikTok only |
| Cover law | FB Page cover IN · IG/TT OUT |
| Avatar + FB cover plates / visual versions | Reuse |
| Copy / checklist presentation class | Reuse with replacement framing |
| Anti-mutation / no-credential doctrine | Reuse |
| Exact recipe discipline | Reuse — update adds change sheet, does not vary after-state N |

---

## 14. Explicit non-goals

- No implementation / proof / remap / payment wiring  
- No commit / push / merge  
- No reopen of sealed `rm-j002`  
- No Meta OAuth / scrape / live readback as sold path  
- No `bf-001` / `rm-j007` work  

---

## 15. Exactly one recommended next package

**After Owner accepts this freeze:**  
**`STUDIO-OPERATING-DESIGN-RM-J008-PROOF-1`** — prove full replacement update kits (FB 5 / IG 4 / TT 4), change-sheet honesty, UNCHANGED reissue, ALREADY_RENDERED / vN+1, fail-closed partial kits — **without** remap.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**

**Proposed freeze:** Full replacement Update Kit · customer-supplied before-state only · exact FB **5** / IG **4** / TT **4** · UNCHANGED members **reissued** · change sheet mandatory · covers IG/TT **OUT** · customer applies · no login/scrape/mutation · scoreboard remains **10/13**.
