# STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-DELTA-1 REPORT

**Package:** STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-DELTA-1  
**Mode:** Inspection only — no implementation · no primaryTool remap · no proof start · no sealed-lane edits  
**Scout status:** PARKED  
**Final status:** READY FOR OWNER REVIEW  
**Git:** No commit · No push · No merge  

---

## Verdict

### SOCIAL-POSTS DELTA B — SMALL EXTENSION

`v2-rtu-social-posts` reuses the sealed **square plate** and **campaign-set spine** from Promotion Graphics. What is genuinely new is a **bounded four-member same-plate set** plus a **caption + posting-order packaging layer** with durable **caption↔post identity binding** — not a new rendering architecture and not an arbitrary N-asset engine.

Not A: promo is exactly two assets and **explicitly excludes** captions; social requires four posts + one caption each + order doc.  
Not C: square, shared campaign truth, set QA, whole-set versioning, partial-set fail-closed, and observer/idempotency patterns already exist.  
Not D: Machine direct record/observer model still fits (promo set path scaled + caption package).

**Watchpoint (Owner-confirmed):** four images + four captions is insufficient if caption↔post identity can scramble. Packaging truth is the critical small extension.

---

## 1. Starting control point

| Field | Value |
|-------|--------|
| Control SHA | `71f01e84ce71139c2adaf68918baa2ce9046da47` |
| Branch | `operating/design-renderer-proof-1` |
| Ahead/behind vs origin | `0/0` |
| Control match | **CONTROL_MATCH** |
| Sealed lanes (do not touch) | flyer · business-card · menu · service-sheet · **promotion-graphics** |
| Candidate | `v2-rtu-social-posts` |
| Current executor | **Canva** (`social` family default; SKU override has no `studio_design_renderer` remap). Family optional tool includes text model for copy-adjacent work — **not remapped here**. |

---

## 2. Authoritative social-posts contract

Sources: `src/catalog/v2/batch1-ready-to-use.ts`, `src/catalog/intake/schemas.ts`, `SocialPostsIntakeForm` (`RouteMapIntakeForm.tsx`), `SOCIAL-POSTS-CUSTOM-UI.md`, `sku-overrides.ts`, `closeout/ledger.ts`, `cert-design/artifact-registry.ts`, `route-map-social-posts.ts`.

| Topic | Authoritative truth |
|-------|---------------------|
| Exact post count | **Exactly 4** (`quantity: 4`; `SOCIAL_POSTS_TOTAL = 4`; CERT `minAssets/maxAssets: 4`; QA `four_posts`; exclusion “More than 4 posts”) |
| Are all four always required? | **Yes** — fixed four; no “up to four” language on this RTU SKU |
| Dimensions / plate | Catalog: “PNG or JPG … in **one agreed platform size**” (one size/version for the set). CERT: **1024×1024 square ×4**. Exclusion: “More than one platform size/version” |
| Captions | **Required** — “one caption for each post” + deliverable `caption_file` (document or plain-text for all posts) |
| Caption length/content | **No numeric length limit** found in catalog. Must carry campaign facts customer supplies; deep hashtag research **excluded** |
| Post order | **Required** deliverable: “Simple recommended posting order (**not** a full calendar)” |
| Hashtags | Optional customer input (“exact wording, required disclosures, or hashtags”). Not a deep-research promise. If supplied, preserve — do not invent a research program |
| Platform posting | **Excluded** from this SKU — client uploads/posts. Separate Post/Publish addon exists elsewhere — not this SKU |
| Output formats | 4× PNG or JPG; 1 caption file; 1 posting-order document. **No zip / contact sheet promised** |
| Customer inputs / materials | Theme/purpose, CTA/key details, one platform, logo/photos/materials path, optional required wording/hashtags, must-not-say. Client responsibilities: final wording/prices/logo/images/contact; client posts |
| QA | Design QA per CERT; count=4; multi-asset consistency; captions present when promised (family delivery criteria); no unauthorized claims (CERT social history) |
| Review / delivery | Creation/delivery; revision limit **1**; Review Room handoff pattern for static posts + captions (family baseline). Client distributes |

### Live intake note (divergence)

Live customer surface is **`SocialPostsIntakeForm`** (not the catalog schema alone). It captures purpose chips, action/destination, platform chips (Instagram detail text mentions “Square or portrait feed graphic”), materials path, required wording. It does **not** capture four customer-authored captions or an explicit per-post plate select. Future Machine mapping must coordinate **both** surfaces (per Owner F2 divergence rule).

---

## 3. Five-lane renderer baseline (reuse)

Already proven (Promotion Graphics + prior seals):

| Capability | Reuse for social-posts? |
|------------|-------------------------|
| Square 1024×1024 | **Yes** — CERT social plate |
| Portrait plate | Proven elsewhere; **not** CERT social default |
| Per-asset semantic identity | **Yes** — extend to 4 IDs |
| Per-asset purpose/plate binding | Promo pattern reusable; social CERT is same-plate |
| Shared campaign truth | **Yes** |
| Exactly-two-asset set | Pattern only — social needs **exactly four** |
| Set-level QA / whole-set versioning | **Yes** — scale members |
| Observer / idempotent set reuse / partial fail-closed | **Yes** — same doctrine |
| Owner production NONE | **Must preserve** |

---

## 4. Four-asset set delta

Bounded model (do **not** generalize to arbitrary N):

```
socialPostSet vN
├── post-1 (semantic ID + order=1 + square plate + graphic truth)
├── post-2 (… order=2 …)
├── post-3 (… order=3 …)
├── post-4 (… order=4 …)
├── caption bindings (1:1 with post IDs)
└── posting-order document (explicit sequence of the four IDs)
```

| Preserve from promo set | Extend |
|-------------------------|--------|
| One shared campaign identity | Member count **2 → 4** |
| Semantic asset IDs | Fixed IDs `post-1`…`post-4` (or equivalent durable keys) |
| Plate binding | Same square plate ×4 (CERT) |
| Set completion truth | Completion = **all 4 graphics + 4 captions + order doc** |
| Whole-set versioning | Prefer whole-set `vN+1` on material change |

Two-asset campaign-set model **can be extended cleanly** as a fixed-four specialization — not an open N-pack engine.

---

## 5. Post-order truth

Contract promises a recommended sequence package → order is **authoritative set truth**, not filename sort or UI display order.

Required future truth (inspection bound):

- Durable ordered members: `post-1` … `post-4` (or `orderIndex` 1–4 on each asset)
- Posting-order document must reference those IDs in sequence
- Order survives re-render / ALREADY_RENDERED reuse

Do not implement yet.

---

## 6. Caption truth

| Question | Finding |
|----------|---------|
| Customer-supplied four captions? | **No** — intake does not collect per-post captions |
| Studio writes captions? | **Yes** — deliverable promises captions; family baseline optional text tool; sm-001 lineage “Writes one caption per post” |
| Optional? | **No** — one caption per post is in the included deliverable |
| Bounded by contract? | Yes — one per post; deep hashtag research excluded; must not invent business facts |
| Reviewed as part of delivery? | Yes — captions are part of the design/copy package submitted to Review Room |

**Authoritative inputs before caption production:** campaign theme (`postsAbout` / purpose), CTA/destination facts, platform, customer-required wording/hashtags (if any), must-not-say, approved brand/materials, prices/dates/contacts present in campaign truth — **no invented claims**.

---

## 7. Caption-generation boundary

If AI/text tools phrase captions under the current contract:

| May do | Must not do |
|--------|-------------|
| Creative wording / sequencing of **approved** facts | Invent offers, prices, dates, testimonials, guarantees, availability claims |
| Include customer-supplied required wording/hashtags when present | Perform deep hashtag research |
| Vary angle across posts (CERT shows offer vs trust angles) | Contradict shared campaign truth or `mustNotSay` |

**Future need:** a bounded caption reasoning/output contract (facts in → four caption strings out, each bound to a post ID). **Not implemented in this delta.**

Optional family text tool does **not** require Make for this inspection.

---

## 8. Caption-to-asset binding (critical)

Do **not** allow four images + an unordered blob of four captions.

Required future binding fields (per caption):

| Field | Role |
|-------|------|
| `assetId` / post semantic ID | Which graphic |
| `orderIndex` (1–4) | Durable sequence |
| `captionId` + caption text | Caption identity |
| `campaignSetRenderVersion` | Same set version as graphics |
| Design-spec / shared fingerprint refs | Traceability |

Caption file may be one document, but internally each caption row/section must name its post ID/order. Pairing by array position alone is insufficient unless the positions are locked to durable IDs in the same immutable set record.

---

## 9. Visual consistency versus variety

Set should be:

- clearly one campaign/brand family  
- visually coherent  
- **not four clones**  
- not contradictory  
- intentionally varied (CERT: offer posts + trust/brand post)

| Deterministic / structural | Design-quality evaluation |
|----------------------------|---------------------------|
| Shared brand/logo rules; shared offer/price/date tokens where offer assets; count=4; same plate dims; no fixture leakage; no contradictory declared facts | Hierarchy polish; “feels like a package”; acceptable visual variety vs clone risk |

---

## 10. Square plate reuse

| Source | Plate |
|--------|-------|
| CERT social-posts | **1024×1024 square ×4** |
| Catalog | One agreed platform size for the set |
| Live Instagram chip detail | Mentions “Square **or portrait** feed graphic” |

**Machine proof recommendation:** lock all four to the **already-proven square 1024×1024**. Do **not** expand portrait social-feed execution by assumption. If live intake implies portrait, future packages must either (a) fail closed until proven, or (b) authorize a separate plate proof — same honesty pattern as promo Landscape.

---

## 11. Four-asset rendering delta (classified)

| Concern | Classification |
|---------|----------------|
| Orchestration reuse (shared truth → multi render → set QA) | **Mostly reuse** of promo set pipeline |
| Render sequencing (4 captures vs 2) | **Small extension** — longer loop, same capture primitive |
| Storage / identity model | **Small extension** — fixed four members + caption bindings |
| QA scaling | **Small extension** — set QA over 4; caption QA added |
| Failure / retry | **Reuse doctrine** — whole-set fail-closed; no partial customer-ready |

---

## 12. Set identity / versioning

Simplest truthful lineage:

```
socialPostSet vN
→ Post 1 + Caption 1
→ Post 2 + Caption 2
→ Post 3 + Caption 3
→ Post 4 + Caption 4
→ posting-order doc
```

**Any material change** to a required graphic, caption, shared campaign truth, or order → new immutable **whole-set `vN+1`**. Do not mutate one member inside a completed prior set. No evidence supports independent member revision as the primary model.

---

## 13. Partial-failure semantics

All four graphics are promised; captions and order are promised.

| Failure | Required behavior |
|---------|-------------------|
| Post 1 pass, Post 2 fail | **Set incomplete** — fail closed |
| One caption fails truth validation | **Set incomplete** |
| One image fails QA | **Set incomplete** |
| Three posts exist, fourth missing | **Set incomplete** |
| One member stale materials | **Set incomplete** / new version path — no silent mix |

**No three-of-four customer-ready state** — contract does not permit fewer than four.

---

## 14. Caption QA (future)

At minimum verify:

- caption attached to correct post ID/order  
- no contradictory offer/price/date vs shared truth / graphic declared text  
- no invented customer/business claims  
- no fixture leakage  
- required CTA/destination facts preserved where campaign truth requires action  
- customer-required wording/hashtags preserved when supplied  
- set ordering matches posting-order document  

---

## 15. Design / set QA

| Layer | Reuse / new |
|-------|-------------|
| Per-post square design QA | **Reuse** square design-quality gates (dims, logo, overflow, claims) |
| Set-level consistency | **Reuse** promo multi-asset consistency; scale to 4 |
| New set checks | Caption↔post binding; order doc consistency; anti-clone / variety attestation; brand-only post rules if used (CERT post #4 `isCampaignOfferAsset: false`) |

---

## 16. Delivery-package delta

Promised package:

1. Four image files (PNG or JPG)  
2. One caption document/plain-text covering all four (internally bound)  
3. One posting-order document  

**Not promised:** zip archive, contact sheet, multi-size variants, calendar (that is `sm-001`).

Do not invent packaging formats beyond the three deliverable kinds.

---

## 17. Posting / platform boundary

Studio creates the **social-post package**. Customer uploads/posts on their own account.

Do **not** turn this SKU into platform automation. Post/Publish remains a separate addon path.

---

## 18. Owner-independence

Future lane must preserve:

**Routine Owner production = NONE**

Tagia must not: order posts manually, pair captions to graphics, resize, repair brand consistency, operate Canva, or manually bundle files.

---

## 19. Canva / Make status

| Item | Status |
|------|--------|
| `v2-rtu-social-posts.primaryTool` | **Unchanged** (Canva) during inspection |
| Remap | **Not performed** |
| Make | **NOT REQUIRED NOW** |
| Direct Machine fit? | **Yes** — fixed four-asset orchestration fits existing dispatch/observer/set-identity model; captions are an additive package record, not a Make workflow |

---

## 20. Downstream reuse

Proving this SKU would unlock:

| SKU | Unlock |
|-----|--------|
| `sm-001` | Caption+order package + larger ≤6 set / calendar becomes the remaining delta |
| `sm-001-monthly` | Same after one-time social content muscle |
| `ma-001` | Partial — set scale helps, but variable/heterogeneous pack remains a separate C |

Do **not** migrate them in this package.

---

## 21. Sealed-lane protection

Preserve flyer · business-card · menu · service-sheet · promotion-graphics.  
No implementation changes to those lanes in this inspection.

---

## 22. Delta verdict

### SOCIAL-POSTS DELTA B — SMALL EXTENSION

---

## 23. Risks

| Risk | Mitigation for next package |
|------|-----------------------------|
| Caption↔post scramble | Durable post IDs + bound caption records + order doc referencing IDs |
| Unordered caption blob | Forbid; require structured binding in set identity |
| Treating promo 2-set as already-social | Explicit fixed-four + caption/order contract in PROOF |
| Live Instagram “portrait” chip vs CERT square | Proof locks **square only**; portrait social-feed = unproven until authorized |
| Catalog schema vs live UI divergence | Map live `SocialPostsIntakeForm` answers as authoritative customer truth |
| Invented caption facts | Caption contract: approved facts only |
| Partial 3/4 delivery | Fail closed — all four required |
| Sealed-lane regression | Additive modules; SKU-gated hook later; re-run five-lane regressions |

---

## 24. Git state

| Field | Value |
|-------|--------|
| HEAD | `71f01e84ce71139c2adaf68918baa2ce9046da47` |
| Branch | `operating/design-renderer-proof-1` |
| Ahead/behind | `0/0` |
| Commit / push / merge | **None** |
| Sealed lanes touched | **None** |

---

## 25. Exactly one recommended next step

**`STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-PROOF-1`**

Bounded technical + visual proof for `v2-rtu-social-posts` only:

- exactly four square 1024×1024 posts  
- durable post order IDs  
- four captions bound 1:1 to post IDs  
- posting-order document  
- whole-set versioning + partial fail-closed  
- no Canva remap yet · no Make · no sealed-lane edits · no platform posting  

---

## READY FOR OWNER REVIEW

**Scout PARKED.**
