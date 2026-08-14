# STUDIO-OPERATING-DESIGN-MA-001-CONTRACT-TRUTH-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-MA-001-CONTRACT-TRUTH-1  
**Mode:** Product-contract freeze only — no renderer work · no proof · no intake implementation · no remapping  
**Scout status:** PARKED (acceptance recorded; DELTA-2 authorized separately)  
**Final status:** OWNER ACCEPTED WITH TWO CLARIFICATIONS  
**Git:** No commit · No push · No merge  

---

## Verdict

### MA-001 CONTRACT TRUTH — ACCEPTED WITH CLARIFICATIONS

| Gate | Status |
|------|--------|
| SKU #9 selection (`ma-001`) | Accepted (prior) |
| **MA-001 DELTA C** | Accepted (prior) |
| **Contract freeze** | **ACCEPTED WITH TWO CLARIFICATIONS** (Owner) |
| Closed member kinds | **ACCEPTED** |
| N ∈ {1,2,3,4} | **ACCEPTED** |
| Mixed kinds | **ACCEPTED** |
| Customer composition locked pre-payment | **ACCEPTED** |
| Unsupported / “similar” kinds | **FAIL CLOSED** before payment |
| Pack completeness | Exact **N/N** on locked members |
| Pack QA + manifest + whole-pack versioning | **ACCEPTED** |
| Renderer / proof | **NOT AUTHORIZED** |
| Canva / Make | Unchanged / NOT REQUIRED |
| Eight sealed lanes | Protected |

**Hard boundary honored:**

> `ma-001` must **not** remain an open-ended “or similar marketing asset” escape hatch for Machine fulfillment. Unsupported kinds are handled **before payment** (fail closed / route out) — never silently substituted after purchase.

**Lock intent:** Product truth first. Renderer convenience must not shrink kinds to “whatever is easiest,” invent plates, invent captions, or pad packs to four.

### Owner amendments (binding)

**Amendment 1 — What counts as one pack member**

A pack member is **one selected service kind identity**, not necessarily one physical output file.

| Example | Pack member count |
|---------|-------------------|
| One flyer | 1 |
| One menu | 1 |
| One service_sheet | 1 |
| One business_card | 1 — even though sealed producer emits front + back |
| One promotion_graphic | 1 — even though the adapter may emit its own approved output set (e.g. PNG + PDF) |

**Frozen:** `lockedPackMemberCount` counts **selected member identities**, not artifact-file count. Each member may own one or more artifacts per its sealed producer contract.

**Amendment 2 — Copy / content boundary**

Promotion Pack does **not** create new marketing copy. Each member **inherits** the authoritative content/copy requirements of its **sealed producer contract**.

| Rule | Freeze |
|------|--------|
| Studio-written social captions | **No** |
| New pack-level copywriting / caption service | **No** |
| Invented marketing claims | **No** |
| Customer-authorized member content | **Required** per that member’s existing sealed contract (e.g. menu / service-sheet pricing & content truth) |

Do **not** override sealed member content contracts with a universal “client final copy only” slogan.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `30b0e4ddef1f54813d5a408d12c28e26dccd4f22` |
| Prior package | `STUDIO-OPERATING-DESIGN-MA-001-DELTA-1` → **MA-001 DELTA C** (accepted) |
| Scoreboard | **8/13 sealed** · `ma-001` = SKU #9 · proof not authorized |
| Authorities | `src/catalog/services.ts` (`ma-001`) · `sku-overrides.ts` · `closeout/ledger.ts` · `family-baselines.ts` (`marketing_assets`) · `cert-design/artifact-registry.ts` (`ma-001` min/max) · Batch 1 RTU lineage (`batch1-ready-to-use.ts`) · sealed eight-lane contracts (member reuse only) · DELTA-1 report |

---

## 2. Evidence (not freezes)

### 2.1 What the catalog / kitchen actually say

| Source | Language |
|--------|----------|
| Deliverable | “Creates **up to four** branded standard-format marketing assets” |
| Delivery map | `marketing_asset` **quantity: 4** |
| Kitchen QA | “**No more than** four assets” · “Final customer copy used” |
| Purpose | One campaign / service / offer / event / launch focus |
| Customer receives | **Examples:** brochures, flyers, rack cards, menus, business cards, posters, presentation materials, and **similar** finished marketing assets |
| Client responsibilities | Final copy · offer terms · dates · prices · links · logos · required wording · print requirements if printing · approval — **no kind picker · no N picker** |
| Exclusions | Multi-page brochures/catalogs · packaging · website · large-format · editable source by default · **multiple size/version sets** · **more than four** · … |
| CERT design brief | `ma-001`: **`minAssets: 1` · `maxAssets: 4`** · `requireMultiAssetConsistency: true` · **no** fixed expected WxH (unlike flyer/menu/card) |
| Closeout | ≤4 · manual Canva · **per-artifact** design QA · Owner routine NONE |
| Family delivery | “Asset count within SKU limit” · “Formats as agreed” · final digital files to Review Room |
| Batch 1 lineage | Flyer / menu / service-sheet / promo / handout carved from `ma-001` pack price — pack ≠ per-single price |

### 2.2 What is absent (must not be invented silently)

Closed kind enum · who chooses mix · job-level planned composition · per-member plate law for the pack · pack-level delivery manifest · whole-pack versioning · Machine handling of “similar” / rack card / poster · Studio caption promise (none) · social posts as pack members.

### 2.3 Sealed member muscle (reuse candidates only)

| Sealed lane | Plate / shape (executable today) | Counts as |
|-------------|----------------------------------|-----------|
| Flyer | Portrait **1024×1536** | 1 design / 1 pack member |
| Menu | Portrait **1024×1536** | 1 |
| Service sheet | Portrait **1024×1536** | 1 |
| Business card | Landscape **1536×1024** · front/back | **1** card design (multi-surface ≠ two pack slots) |
| Promotion graphics | Square **1024×1024** · Portrait **1024×1536** executable; Landscape recordable but **fail-closed** on sealed promo path | Sealed SKU = **exact 2** graphics — not a 1-slot pack member by default |
| Social / sm-001 / monthly | Square only · captions · calendar | **Not** named in `ma-001` examples; different deliverable class |

---

## 3. KIND ENUM FREEZE — PROPOSED

### K-1. Closed Machine-supported kinds (V1) — PROPOSED

For Machine / Owner-independent fulfillment of `ma-001`, the **only** legal member kinds are:

| Kind ID | Customer-facing label | Sealed producer reuse |
|---------|----------------------|------------------------|
| `flyer` | Flyer | **Yes** — `v2-rtu-flyer` / flyer lane |
| `menu` | Menu | **Yes** — menu lane |
| `service_sheet` | Service sheet | **Yes** — service-sheet lane |
| `business_card` | Business card | **Yes** — business-card lane (front+back = one member) |
| `promotion_graphic` | Campaign graphic | **Partial** — reuse promo **surface + plate** muscle for **one** graphic; pack orchestration is new (do **not** require the exact-2 promo SKU job as the pack member) |

**Hard rule:** No other kind ID may appear on a purchased Machine pack composition.

### K-2. Catalog example → Machine mapping — PROPOSED

| Catalog example | Machine V1 treatment |
|-----------------|----------------------|
| Flyers | → `flyer` |
| Menus | → `menu` |
| Business cards | → `business_card` |
| Presentation materials | → `service_sheet` (one-page collateral lineage; not a separate kind) |
| Brochures | **One-page only** → `flyer`. Multi-page remains **excluded** (catalog). No distinct `brochure` kind in V1. |
| Rack cards | **Unsupported** in Machine V1 |
| Posters | **Unsupported** in Machine V1 (also overlaps large-format exclusion risk) |
| “Similar finished marketing assets” | **Revoked as Machine authority** (see K-4) |
| Social posts | **Not** a `ma-001` pack kind in V1 |
| Handout (`v2-rtu-handout`) | **Not** Machine V1 (held / unsealed) |
| Full promo dual set (`v2-rtu-promotion-graphics`) | Remains its **own** SKU. Inside `ma-001`, use **`promotion_graphic` ×1 or ×2** as separate pack members if the customer wants two campaign graphics — not a silent nested exact-2 promo job. |

### K-3. Kinds that still require new capability — PROPOSED honesty

| Item | Status |
|------|--------|
| Pack composition engine (kinds × N · pack root · pack QA · manifest) | **New** — required for any Machine `ma-001` |
| `flyer` / `menu` / `service_sheet` / `business_card` member production | **Reuse** sealed producers (adapters under pack root) |
| `promotion_graphic` as **single** pack member | **Thin new capability** — promo lane is sealed as exact-2 set; pack needs one-graphic invocation without inventing Landscape execution |
| `rack_card` · `poster` · distinct multi-page brochure · handout · social-in-pack | **Out of Machine V1** — new kind capability **or** stay non-Machine |

### K-4. End of the “or similar” escape hatch — PROPOSED (hard boundary)

| Layer | Rule |
|-------|------|
| Machine / purchased composition | **Closed enum only** (K-1). “Similar” is **not** a valid kind. |
| Catalog `customerReceives` example string | Marketing illustration only until catalog copy is intentionally updated; **not** production authority after this freeze. |
| Unsupported kind requested | **Before payment:** fail closed — customer cannot lock / purchase a Machine pack composition that includes unsupported kinds. |
| Substitution | **Forbidden.** Do not silently swap poster→flyer, rack card→service sheet, etc. |
| Alternate paths | Route to: (a) choose only supported kinds, (b) dedicated RTU/single SKU when available, or (c) remain on **Canva manual** fulfillment for that job — without pretending Machine delivered the unsupported kind. |
| After payment | Composition immutable for production (see C- / P- locks). Cannot “discover” a fifth kind or an unsupported kind mid-job. |

---

## 4. CARDINALITY + COMPOSITION FREEZE — PROPOSED

### C-1. Ceiling — PROPOSED

**Hard maximum = 4** finished marketing assets per `ma-001` job. Above 4 = contract breach / fail-closed.

### C-2. Floor + allowed N — PROPOSED

**N ∈ {1, 2, 3, 4}.**  
Aligned with CERT `minAssets: 1` / `maxAssets: 4`.  
Empty pack forbidden. Values &lt;1 or &gt;4 invalid.

### C-3. Customer promise language — PROPOSED (clarification)

“Up to four” alone can still sound like four is expected. **Authoritative customer / preaccept / service promise:**

> The Studio creates **1–4** branded standard-format marketing assets for one campaign focus. The final count and asset kinds are the **locked pack composition** agreed before production — not empty reserved slots, and not a guarantee of four.

### C-4. Mixed kinds — PROPOSED

| Rule | Freeze |
|------|--------|
| Mixed kinds in one pack | **Allowed** (any combination from K-1) |
| Same kind repeated | **Allowed** (e.g. three `flyer` members) if each member has a distinct durable purpose/role in the composition — still one agreed plate **per member**, not multiple size/version sets of the same piece |
| Multiple size/version sets of one piece | **Still excluded** (catalog) |
| Nested sealed multi-asset SKUs as one slot | **Forbidden** (e.g. counting social-4 or promo-2 as a single pack member) |

### C-5. Who chooses the mix — PROPOSED

| Who | Role |
|-----|------|
| **Customer** | Locks the pack composition from the **closed kind list** before payment (working draft → purchased snapshot). Supplies final copy, facts, brand assets, constraints. |
| Studio | May **recommend** kinds within K-1; must not invent unsupported kinds; must not invent offers/prices/dates/copy. |
| Discovery / Recommendation | May suggest; **cannot** alone authorize an unsupported kind onto a purchased Machine pack. |
| QA / renderer | **Do not** choose or revise kinds or N after lock. |

**Rationale:** Unlike `sm-001` post-count (Studio-chosen within 4–6), pack **kinds** change what the customer receives (menu ≠ flyer). Pre-payment kind lock is required to enforce K-4 before money moves.

### C-6. Durable composition identity — ACCEPTED (clarified)

| Field | Rule |
|-------|------|
| **`lockedPackMemberCount`** | `1 \| 2 \| 3 \| 4` — equals **member identity** list length (**not** artifact-file count) — Owner Amendment 1 |
| **`plannedPackMembers`** | Ordered list of exactly `lockedPackMemberCount` entries; each has `kind` ∈ K-1 + durable `memberId` + distinct `memberPurpose` (short role label) |
| When locked | Scope lock / purchase — **before execution** |
| Pre-payment draft | Editable while `working_draft` |
| After purchase | **Immutable** for that job’s production pack |
| Artifacts per member | One or more files/surfaces per sealed producer contract (card front/back; PNG+PDF; etc.) — still **one** member |
| Alias | Early draft used `plannedAssetCount`; authoritative name is **`lockedPackMemberCount`** (member identities) |

### C-7. Completeness (full-pack / N/N) — ACCEPTED (clarified)

| Situation | Truth |
|-----------|-------|
| Locked N=3, deliver 3 matching **members** | Complete (artifact-file count may be &gt;3) |
| Locked N=4, deliver 3 members | **Incomplete / fail** |
| Pad with invented members / empty member slots | **Forbidden** |
| Auto-reduce N because one member failed QA | **Forbidden** |
| Swap kind post-lock to “make QA pass” | **Forbidden** |
| Confuse PNG+PDF or front+back as two members | **Forbidden** — those are artifacts under one member |

If fewer than `lockedPackMemberCount` **members** pass member + pack QA → **fail closed** (or revise under revision rules). Do **not** ship a partial pack as success.

---

## 5. PLATE / FORMAT FREEZE — PROPOSED

### F-1. Per-member executable plates — PROPOSED

| Kind | Executable plate(s) for Machine V1 | Notes |
|------|--------------------------------------|-------|
| `flyer` | Portrait **1024×1536** (sealed flyer) | One agreed size per member |
| `menu` | Portrait **1024×1536** | Same |
| `service_sheet` | Portrait **1024×1536** | Same |
| `business_card` | Landscape **1536×1024** (sealed card) | Front/back under one member |
| `promotion_graphic` | **Square 1024×1024** or **Portrait 1024×1536** only | Inherit promo fail-closed: **Landscape not executable** |

### F-2. Who chooses plate — PROPOSED

| Kind | Plate chooser |
|------|----------------|
| `flyer` / `menu` / `service_sheet` / `business_card` | **Studio production** — inherit sealed executable plate for that kind (not a customer size menu in V1) |
| `promotion_graphic` | **Studio production** chooses square vs portrait from campaign/use — must be recorded on the member before render; customer may state use intent in materials, not invent pixel sizes |

### F-3. Still forbidden — PROPOSED

Large-format · multiple size/version sets per piece · inventing Instagram/TikTok/print bleed sizes outside sealed plates · treating “agreed formats” as an unbounded size free-for-all on the Machine path.

---

## 6. COPY / CONTENT BOUNDARY FREEZE — ACCEPTED (clarified)

### X-1. Governing rule — ACCEPTED (Owner Amendment 2)

> **Promotion Pack does not create new marketing copy. Each member inherits the authoritative content/copy requirements of its sealed producer contract.**

| Rule | Freeze |
|------|--------|
| New pack-level copywriting / caption-generation service | **Forbidden** |
| Studio-written social captions | **Forbidden** as a `ma-001` deliverable — do not import `sm-001` caption engine |
| Invented marketing claims / offers / prices | **Forbidden** |
| Member content requirements | **Inherit** sealed producer contract for that kind (menu, service-sheet, flyer, card, promo surface) |
| Universal “client final copy only” slogan | **Must not override** sealed member content/pricing truth contracts |
| Missing required member content | Fail closed or clarify per that member’s contract — do not invent |

### X-2. Per-kind inheritance — ACCEPTED

| Kind | Content law source |
|------|--------------------|
| `flyer` | Sealed flyer producer / intake content contract |
| `menu` | Sealed menu producer (customer-authorized menu/pricing truth) |
| `service_sheet` | Sealed service-sheet producer (services / pricing truth) |
| `business_card` | Sealed business-card producer (identity / contact truth) |
| `promotion_graphic` | Promo surface content/campaign truth as applicable to **one** graphic — not a new pack copy product |

No separate caption file, hashtag pack, or content calendar is promised on `ma-001`.

---

## 7. QA FREEZE — PROPOSED

### Q-1. Member-level QA — PROPOSED

Each member must pass **kind-appropriate** design QA (reuse sealed member gates where the kind maps):

- Correct kind producer / plate  
- Final customer copy / fact lock  
- Brand / logo rules for that surface  
- Export formats allowed for that kind (PNG/JPG/PDF as sealed for that lane)  
- Business card: both required surfaces when the sealed card contract requires them  

### Q-2. Pack-level QA — ACCEPTED (clarified)

In addition to members:

- Delivered **member** count === `lockedPackMemberCount` (not raw file count)  
- Every `memberId` / `kind` matches `plannedPackMembers`  
- No fake / padded members  
- One campaign focus across the pack  
- Multi-asset brand/campaign consistency (**CERT already requires** `requireMultiAssetConsistency: true` for `ma-001`)  
- No unsupported kinds  
- No nested multi-asset SKU counted as one slot  
- Artifact multiplicity under a member (front/back, PNG+PDF) does **not** inflate member count  

**Partial pack = fail closed** (C-7).

### Q-3. Relation to today’s closeout — PROPOSED

Closeout “per-artifact design QA” remains necessary but **insufficient** alone. Machine `ma-001` requires **both** member-level and pack-level gates.

---

## 8. IDENTITY / VERSIONING / DELIVERY FREEZE — PROPOSED

### P-1. Whole-pack identity — PROPOSED

| Element | Rule |
|---------|------|
| Pack root | One durable pack identity per job production set |
| Members | Durable `memberId`s for exactly N real members |
| Fingerprint | Must include `plannedAssetCount` + ordered kind/purpose/plate bindings + content/material truth used |
| Whole-pack version `vN` | Versions the **entire** pack; prior versions retained (sealed set doctrine) |
| Mid-pack mutate | Forbidden — material composition or truth change → new whole-pack version |

### P-2. Delivery package shape — PROPOSED

Customer receives a **pack delivery package** containing:

1. **Pack manifest** (machine-readable + human-readable summary) with: pack version, `lockedPackMemberCount`, ordered members (`memberId`, kind, purpose, plate, artifact paths, content hashes)  
2. **Member deliverable artifacts** for each member (kind-appropriate surfaces/files per sealed producer contract)  
3. **No** required captions file · **no** posting-order · **no** content calendar (unless a future Owner freeze adds them — not proposed here)

Editable source files remain **not default**.

### P-3. Review handoff — PROPOSED

Family rule preserved: submit final digital asset files to Review Room after QA — **as the pack package** (manifest + members), not as anonymous unrelated files with no pack identity.

---

## 9. Explicitly not decided by renderer ease

| Temptation | Rejected |
|------------|----------|
| “Always N=4 because delivery map says 4” | Rejected — CERT floor is 1; pad forbidden |
| “Keep ‘similar’ so Machine can improvise” | Rejected — hard boundary |
| “Silently map poster→flyer” | Rejected — substitution forbidden |
| “Count promo dual set as one pack slot” | Rejected — would hide two assets |
| “Import social captions/calendar into the pack” | Rejected — not in `ma-001` contract |
| “Customer never sees kinds; Studio invents mix after payment” | Rejected — breaks pre-payment unsupported-kind handling |
| “Defer kind enum until proof” | Rejected — product truth first |

---

## 10. Coupled locks / non-goals

| Lock | Status |
|------|--------|
| One campaign focus per job | Preserved |
| Printing / shipping / photography / custom illustration | Still excluded |
| Editable source by default | Still excluded |
| Owner routine NONE | Target preserved |
| Canva remap / proof | **Not** authorized by this package |
| `ma-001-monthly` | Inherits these freezes later; **parked** |
| Eight sealed lanes | Untouched |
| Make | NOT REQUIRED |

---

## 11. Earned class after this freeze (preview only)

| Class | Preview |
|-------|---------|
| Still **C** until DELTA-2? | **Likely yes** — heterogeneous pack orchestration + single `promotion_graphic` adapter remain material engineering even after product freeze |
| Toward **B**? | Only if Owner later **removes** `promotion_graphic` from V1 and freezes a tiny composition (e.g. only the four fully sealed singles) **and** DELTA-2 finds only thin adapters |
| **A** / **D** | Not expected from this freeze alone |

This preview is **not** a reclass. Reclass only via Owner-accepted freezes + `MA-001-DELTA-2`.

---

## 12. Owner acceptance record

| Item | Verdict |
|------|---------|
| Closed member kinds (K-1) | **ACCEPTED** |
| Unsupported / “similar” (K-4) | **FAIL CLOSED** before payment |
| N ∈ {1,2,3,4} + promise language | **ACCEPTED** |
| Mixed kinds | **ACCEPTED** |
| Customer composition locked pre-payment | **ACCEPTED** |
| Amendment 1 — member vs artifact count | **ACCEPTED** — `lockedPackMemberCount` = member identities |
| Amendment 2 — copy/content inheritance | **ACCEPTED** — inherit sealed producer contracts; no new pack copy service |
| Plates | **ACCEPTED** as proposed |
| Pack completeness / QA / manifest / versioning | **ACCEPTED** |
| Single `promotion_graphic` adapter | Acknowledged as **genuinely new** (sealed promo = exact-two set) |
| Proof | **NOT authorized** |
| Next | `STUDIO-OPERATING-DESIGN-MA-001-DELTA-2` |

---

## 13. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-MA-001-DELTA-2`** — technical re-inspect against this **accepted** product truth (including Amendments 1–2). Return exactly one class **A / B / C / D**. No proof.

---

## OWNER ACCEPTED WITH TWO CLARIFICATIONS

**Scout proceeded to DELTA-2.**
