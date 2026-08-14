# STUDIO-OPERATING-DESIGN-RM-J008-DELTA-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-RM-J008-DELTA-1  
**Mode:** Inspection only — no implementation · no proof · no remap · no sealed-lane edits  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### RM-J008 DELTA **B** HOLDS

Against sealed `rm-j002` (lane #10), live customer-promise truth for `rm-j008` is:

> **Tell us what the profile is now and what should change; we generate a replacement Social Profile Update Kit that you apply yourself.**

It is **not**:

> Give us login / admin access / live platform ingest so we directly modify the account.

Owner A+C already rejected done-for-you mutation for both kit SKUs. Catalog exclusions forbid Studio login and platform-side mutations. Execution mode is **`creation_delivery`**. Closeout and `sku-overrides` keep **kit_not_mutation**.

Therefore **B holds**: expensive kit machinery is sealed under `rm-j002`; update adds **customer-supplied before-state**, a **before→after change sheet**, and **replacement** framing — not a new ingest/edit spine and not platform mutation.

**Not A:** before-state authority + change sheet are real new product truths; update ≠ setup; shared `social-setup` intake is not a frozen update payment lock.  
**Not C:** not a new strategy/document or unrelated composer class — same profile-kit composer family (`copy` + `design` + `field_map_package`) with mode=`update` additives.  
**Not D:** not `rm-j007`-class ingest/edit of a named existing promotional file, and not live account mutation.

Do **not** bend the product to preserve B — the repo already points at kit replacement. Do **not** reopen sealed `rm-j002`. Scoreboard stays **10/13** until proof/seal.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Selection | Owner accepted SELECTION-9 — provisional SKU #11 = `rm-j008` · provisional **B** |
| Sealed Machine design lanes | **10/13** including frozen `rm-j002` |
| Candidate | `rm-j008` — Make Me a Social Profile Update Kit |
| Current executor | **Canva** (+ optional text) — **no** `studio_design_renderer` remap |
| Parked | `bf-001` · `rm-j007` |
| Canva / Make | Canva **unchanged** · Make **NOT REQUIRED** |
| `rm-j002` | **FROZEN** — reopen only on defect evidence |

**Authorities (read-only):**  
`src/catalog/route-map-launch.ts` · `src/catalog/intake/schemas.ts` (`social-setup`) · `sku-overrides.ts` · `closeout/ledger.ts` · `src/lib/studio-kitchen-production/social-profile/*` · `docs/launch/kitchen-social-profile-production-1/*` · sealed `rm-j002` CONTRACT-TRUTH / DELTA / FINAL-SEAL · SELECTION-9.

---

## 2. Exact live customer promise

| Topic | Authoritative truth |
|-------|---------------------|
| Catalog name | **Make Me a Social Profile Update Kit** |
| Owner framing (A+C) | Update kit for **one existing** Facebook / Instagram / TikTok profile — revised copy, updated imagery, before→after change sheet, field-replacement instructions **you apply**. **Not** done-for-you profile management |
| Price | **$99 / platform** |
| Unit of purchase | **One platform** (`deliveryMapping` quantity 1 platform; exclusion: more than one platform) |
| Service class | core |
| Execution mode | **`creation_delivery`** |
| What “update” means | Produce a **replacement kit** of approved after-state assets/copy + instructions that replace current fields **when the customer applies them** — not Studio editing the live profile |
| Studio produces | Reviewed current-profile **inputs**; revised approved bio/about; updated avatar; updated banner/cover **where platform supports**; URL/contact recommendations; before→after change sheet; field-replacement checklist; one revision + QC |
| Customer does | Control existing profile; supply **current details or screenshots**; supply updated business facts / source images; **apply** kit changes; approve before publishing |
| Owner routine | **NONE** |
| Readiness | **CUSTOMER READY WITH LIMITS — PROFILE KIT** |

### Hard boundary (must not quietly expand)

| Claim | Live promise? |
|-------|----------------|
| Studio logs in / OAuth / admin-invite mutation | **No** — excluded |
| New account setup | **No** — excluded (`rm-j002` territory) |
| Account recovery / login troubleshooting | **No** |
| Original posts / reels / stories | **No** |
| More than one platform | **No** |
| Facebook Page API mutation sold here | **No** — future-only / not wired |
| Instagram / TikTok direct mutation | **UNSUPPORTED** |
| Editable source / unlimited revisions | One revision round only (catalog) |

---

## 3. Critical fork — kit replacement vs mutate/ingest

| Interpretation | Supported by repo? | Effect on Delta |
|----------------|--------------------|-----------------|
| **A.** “Tell us what changed → generate replacement kit → customer applies” | **YES** — A+C NEW PROMISE; catalog purpose/exclusions/responsibilities; `directPlatformMutationPromised: false`; kit spine Copy → Design → field package → customer delivery; QA item `kit_not_mutation` | **B holds** |
| **B.** “Give us the existing platform/profile and we directly modify or intelligently ingest/edit it” | **NO as sold path** — old promise explicitly retired; login/mutation excluded; Meta OAuth not started | Would collapse toward **D** / mutation spine — **rejected by product truth** |

**Naming caution:** kitchen work-packet types still use words like `mutations` and `setupVsUpdateBoundary(… “approved mutations → read-back”)`. Those model **field recommendation records** and a **future** mutation path. Sold fulfillment for this SKU is **`kit`**. Do not treat internal type names as authorization to sell platform mutation.

**Before-state source:** `SocialProfileSnapshot.source` allows `customer_supplied` | `platform_readback` | `unavailable`. For the **sold kit path**, pre-payment truth must freeze **customer_supplied** (details/screenshots). Requiring live `platform_readback` would reintroduce auth/ingest capability **not** sealed and would break B.

---

## 4. Platform / membership (inherit sealed `rm-j002`)

| Platform | Kit membership (sealed `rm-j002`) | Update after-state |
|----------|-----------------------------------|--------------------|
| Facebook | **4** — bio/about · field map · avatar · Page cover | Same four after-state design/copy/field members + update packaging |
| Instagram | **3** — bio · field map · avatar · **no cover** | Same three — **no Instagram cover** |
| TikTok | **3** — bio · field map · avatar · **no cover** | Same three |

**Instagram / TikTok remain no-cover** for Machine migration — sealed CONTRACT-TRUTH-1 (Instagram generic profile cover **OUT**).  
Do **not** freeze older `platformSupportsCoverAsset(facebook || instagram)` as truth; that helper is known-incorrect relative to the sealed recipe.

Facebook Page cover **may be regenerated/replaced in the kit** (customer uploads). Instagram/TikTok kits must fail closed if a cover member is invented.

---

## 5. Member reuse vs new work

### Reusable unchanged from sealed `rm-j002` (after-state production)

| Member / capability | Reuse? |
|---------------------|--------|
| Platform recipes (FB 4 / IG 3 / TT 3) | **Yes** |
| Avatar plate + visual version | **Yes** — regenerate/replace updated avatar in kit |
| Facebook Page cover plate + visual version | **Yes** — regenerate/replace when Facebook |
| Platform-tailored bio/about copy production | **Yes** — may be **rewritten** as “revised approved” copy (Studio-authored, same class as setup) |
| Field-map / checklist package | **Yes** — reframed as **field-replacement** instructions (`Replace with` vs `Enter`) |
| Kit identity / manifest / member QA + kit QA | **Yes** |
| ALREADY_RENDERED / immutable vN+1 whole-kit versioning | **Yes** (SKU-scoped — must not collide with `rm-j002`) |
| Payment lock → post-pay structure → dispatch pattern | **Yes** (parallel IDs; update-specific facts) |
| No credential / customer-applies boundary | **Yes** |

### Genuinely new after `rm-j002`

| New truth | Notes |
|-----------|-------|
| **Customer-supplied before-state** | Required for update QA advancement in kitchen packet rules; catalog requires current details/screenshots |
| **`current_profile_review` deliverable** | Review of **inputs**, not live login audit |
| **`before_after_change_sheet` member** | Diff of locked before → approved after; only claim changes present in truth |
| Update payment / draft lock fields | Shared `social-setup` is insufficient alone — before-state completeness gate required |
| SKU / mode separation | `rm-j008` + `mode=update` must not be fulfillable by an `rm-j002` setup seal |

---

## 6. Answers to Owner inspection questions

| Question | Finding |
|----------|---------|
| Exact promise for Update My Facebook / Instagram / TikTok | **Make Me a Social Profile Update Kit** — one existing platform; replacement kit; customer applies |
| One platform still unit of purchase? | **Yes** — $99 / platform; multi-platform excluded |
| What “update” means | Generate **after-state kit** + change sheet from locked before + approved after — customer replaces fields on-platform |
| Which `rm-j002` members reuse unchanged? | After-state copy, avatar, FB cover (when FB), field-map package, kit packaging/QA/versioning, anti-mutation |
| Which existing-profile inputs must be ingested? | **Customer-supplied** current bio/about/links/display facts and/or screenshots (+ optional image hashes). **Not** credentialed platform scrape as sold path |
| Studio only applies supplied facts vs evaluates content? | Studio **reviews** supplied current inputs and produces **revised approved** copy/assets (Studio craft), not silent paste-only and not unsupervised “smart edit” of a live account |
| Bio/profile copy may be rewritten? | **Yes** — “Revised approved bio and about copy” |
| Avatar regenerated/replaced? | **Yes** — in the kit (“Updated platform-ready profile image/avatar”) |
| Facebook Page cover regenerated/replaced? | **Yes** — when Facebook |
| IG/TT remain no-cover? | **Yes** — inherit sealed `rm-j002` freeze |
| Field-map/checklist remains a deliverable? | **Yes** — as field-replacement instructions + checklist |
| Generate-new-kit-from-current-truth vs mutate account? | **Generate-new-kit** (plus change sheet). Mutation **excluded** |
| Exact pre-payment truth required | Locked platform · existing-profile control acknowledgment · **before-state** · approved after facts/brand materials · no credentials · membership recipe for platform |
| Account/login/credential boundary | **No** passwords, admin invites, or OAuth on sold path |
| Customer-applies boundary | **Preserved** — customer publishes/applies |
| Whole-kit identity/versioning | Whole update kit versions together; same truth → ALREADY_RENDERED; material authorized truth change → vN+1 |

---

## 7. Pre-payment truth (freeze targets — not implemented here)

Minimum Machine lock for honest update (parallel to `rmj002KitLock`, not identical):

1. `skuId = rm-j008`  
2. Exactly one platform ∈ {facebook, instagram, tiktok}  
3. Customer controls existing profile (not new-account setup)  
4. **Before-state** present (customer-supplied fields and/or screenshot references) — fail closed if missing when advancing  
5. Approved after-state business facts + brand/logo notes for regenerable avatar/(FB) cover  
6. Locked membership = sealed recipe for that platform (no IG/TT cover)  
7. No credential / login / admin-invite fields  
8. Change-sheet scope bound to before↔after field set only  

Shared intake template `social-setup` may remain the customer form **surface**, but Machine update lock must require before-state completeness that setup can omit.

---

## 8. Final Delta classification

| Class | Status | Evidence |
|-------|--------|----------|
| **A** | Rejected | Before-state + change sheet + update lock are unproven Machine work |
| **B** | **HOLDS** | Same kit composer / plates / recipes / anti-mutation spine as sealed `rm-j002`; sold path is replacement kit the customer applies; new work is additive packaging + before-state authority |
| **C** | Rejected | Not a new strategy-document or unrelated composer class |
| **D** | Rejected for sold path | Would require login mutate or file-ingest edit spine — catalog A+C forbids mutation; before-state is customer-supplied kit input, not `rm-j007` edit |

### RM-J008 DELTA **B** — UPDATE KIT ON SEALED PROFILE-KIT COMPOSER

---

## 9. Explicit non-goals

- No implementation / proof / remap / payment wiring  
- No commit / push / merge  
- No reopen of sealed `rm-j002`  
- No Meta OAuth / mutation path  
- No Instagram profile cover invention  
- No auto-start of `bf-001` or `rm-j007`  

---

## 10. Exactly one recommended next package

**`STUDIO-OPERATING-DESIGN-RM-J008-CONTRACT-TRUTH-1`** — freeze update before-state schema, before→after change-sheet membership, and inheritance of sealed platform recipes (FB 4 / IG 3 / TT 3 · no IG/TT cover · customer-supplied before only · kit-not-mutation) before any proof build.

---

## READY FOR OWNER REVIEW

**Scout PARKED.**

**Delta B holds** — `rm-j008` is a replacement Update Kit on the sealed Profile Kit composer, not platform mutation and not a new ingest class.
