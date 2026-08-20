# STUDIO-OPERATING-ROOM-4B-LAUNCH-TOOLBOX-CERTIFICATION-1 CONTINUATION REPORT

**Manager verdict (unchanged until close):** OPEN / PARKED WITH PRODUCT BLOCKERS  
**Prior work tip:** `e87b193` · hash note `7fdcefe`  
**Room 5:** NOT STARTED · **No merge** · **No next Toolbox project**  
**Resend/domain:** parked at `d6974eb` (not reopened)

**Continuation campaign (composition v2):** `nia-r4b-live-1787185497469`  
**Video wire campaign:** `nia-r4b-live-1787184976955`  
**Evidence:**  
- `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation/`  
- `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/`

---

## Strategic finding (kept)

The operating spine can move a campaign. The production engine still cannot consistently create work we would confidently deliver under The Studio’s name as a coordinated professional campaign.

That is why Room 4 stays creative-production heavy. We finish Nia — we do not start another menu item.

**Would we confidently deliver this exact work to a serious paying client?**  
**Not yet as a full Fall Reset campaign.** Machine-language leaks are fixed. Layout is safer. Short video now has a customer Review path. Static design remains CERT-plate / text-led template output — not photo-led campaign creative. Package stays **OPEN**.

---

## Blocker 1 — Customer art vs machine language

### Fix
Shared contract: `src/lib/studio-design-renderer/customer-facing-creative-copy.ts`

- Strip Voice brief / MISSING FACT / Style trails from body
- Strip `Destination:` from CTA
- Detect purpose/role chrome
- Negative tests: `customer-facing-creative-copy.test.ts`, `customer-mode-purpose-chrome.test.ts`

Mappers + reasoners:

- Flyer / promo / social map through customer-safe body/CTA
- Customer mode **omits** `purpose_label` layers
- Set QA **fails closed** if chrome / Destination / Voice brief appear on customer declared PNG text
- Nia fixture: voice brief on dedicated keys only (not dumped into mustInclude body)

### Composition follow-up (continuation-v2)
- Business wordmark ≠ campaign title
- Offer headline = `Fall Reset` (not “Promotional flyer for…”)
- CTA shortened to `Enroll in Fall Reset` (phone/URL on contact layers)

### Inspection result
Declared-text leak scan: **PASS** (3 specs).  
Visual: no Voice brief, no Intake Fact, no Post N of 4, no Destination label.

Residual polish issues (not “machine chrome,” still unprofessional): redundant “Fall Reset” layers, `phone `/`web ` prefixes on flyer, awkward social body dashes, no customer photography.

---

## Blocker 2 — Collision / layout protection

### Fix
`src/lib/studio-design-renderer/text-layer-collision.ts` — AABB fail-closed (`COLLISION` / `OVERLAP`) wired into customer validate path.

### Inspection result
Continuation-v2: **no title ghosting / CTA clipping** like the first park.  
Still sparse template stacking and weak hierarchy — collision gate prevents known overlaps; it does not create art direction.

---

## Blocker 3 — Nia social creative (visual)

Inspected actual files under `continuation-v2/artifacts/`:

| Asset | Result |
|-------|--------|
| Social post 1 | Customer-safe copy; Fall Reset / $297 / dates / Enroll; **no chrome**. Text-led CERT plate; body still slightly mechanical (“six — week”). |
| Social posts 2–4 | Same plate family; hierarchy uneven; post 2 repeats Fall Reset; not photo-led. |

**Judgment:** Safer than first park. **Not** yet “intentional campaign social” for a serious wellness launch without explicit limits.

---

## Blocker 4 — Print collateral (visual)

Inspected `continuation-v2/artifacts/nia-flyer-v2.png`:

- Customer-safe copy; CTA fits button; logo + Fall Reset + price/dates/enroll
- No Voice brief / revision stamp
- Redundant Fall Reset (headline + offer); `phone `/`web ` prefixes; logo plate in circle looks unfinished

**Judgment:** Print path operable with **explicit limits**. Not campaign-poster art direction.

---

## Blocker 5 — Short video customer lifecycle

### Wired
- `attachShortVideoArtifactToCustomerJob` / `ensureShortVideoMachineReviewBind`
- `present-short-video-review.ts` — MP4 as `review_proof`
- Review UI: `<video controls>` for `video/mp4`
- Delivery: approve pins short-video MP4

### Proven on `nia-r4b-live-1787184976955`
Produce → attach → `ready_for_review` with playable proof → feedback → revision reproduce → re-attach.

**Limits remain:** one aspect; client posts/distributes; A/V sync per artifact; music/stock unresolved; auto-Shotstack on `ensureDispatch` not required (produce-then-attach).

---

## Blocker 6 — Video feedback / revision

Nia note: “video feels a little fast around the price and dates.”

- Feedback stored on short-video Review
- `reproduceShortVideoAfterRevision` lengthens price/date holds (+1.5s)
- Revised MP4: `continuation/video/nia-fall-reset-1787184976955-rev-timing.mp4`  
  sha `ceb65a0c9a0248c7365b36da130af8b9e9b165f00deb63884615ca1587294d29`
- V1 sha `5465975d82d3c13278d617f14b9c8247fd2a2f46ed02d25e548efd2e07c38621` (distinct)

Plates remain calm sage/cream — strongest visual family in the set.

---

## Blocker 7 — Carousel decision

**Decision B — REMOVE FROM LAUNCH NOW MENU**  
Classification: **NOT ON LAUNCH MENU**

Evidence (`carousel-decision.ts` + catalog exclusions on `v2-rtu-social-posts`):

Missing: multi-slide renderer contract, sizing/export, Review/Delivery, QA set consistency.  
Do **not** invent a carousel SKU mid-certification.  
Catalog already excludes carousels/Stories/Reels.

Launch menu wording:  
**Social graphics (static posts) — carousels, Stories, and Reels not offered at launch.**

---

## Blocker 8 — Campaign coherence

| Piece | Visual language | Notes |
|-------|-----------------|-------|
| Short video plates | Sage/cream, calm | Strongest; photo-light |
| Promo A/B | Cream/navy text plate | Coherent colors; template |
| Social 1–4 | Same family | Template; weak hierarchy |
| Print flyer | Same palette | Safer copy; still template |
| Captions + email | Calm, routine-forward | Aligns with brief |

**Set judgment:** Same business name and palette — **not** yet one art-directed campaign. Seven related template outputs ≠ one Studio campaign.

Copy/email re-checked against corrected visuals: no neon / no weight-loss / dates-price-CTA consistent. Resend still parked.

---

## Tool gap (STOP AND DOCUMENT)

**Exact capability needed:** Photo-aware, art-directed multi-format campaign composition (use customer photos, intentional hierarchy, non-redundant layers, print + social + video as one system) — without Tagia manual collage.

**Why current stack cannot meet it alone:** Studio Design Renderer is sealed CERT-plate **text composition** with logo. It now refuses machine chrome and collisions, but it does not art-direct photography, custom layout, or multi-format campaign systems.

**Specialized tool?** Not purchased. Manager decides whether a search is justified. Do **not** hire humans. Do **not** add CapCut/Canva-as-spine. Do **not** subscription-sprawl.

**API/automation characteristics if sought later:** deterministic layout constraints, collision QA, customer-copy projection, versioned exports, job-control bind to Review/Delivery, no Owner click-export.

**Cost:** unknown from this package — stop before buying.

---

## Final launch classification (close taxonomy only)

| Capability | Classification | Explicit limits / why |
|-----------|----------------|------------------------|
| **Short-form video** | **READY WITH EXPLICIT LIMITS** | Customer Board→QA→Review→revision→Delivery wired; vertical MP4 ~20–30s; one aspect; client posts; A/V sync QA; music/stock unresolved; calm plate style |
| **Campaign creative** | **NOT ON LAUNCH MENU** | Cannot sell “coordinated professional campaign” until art direction + photo use + non-template set quality exist |
| **Social graphics** | **READY WITH EXPLICIT LIMITS** | Four square static posts + captions; text-led CERT plate; logo; no carousel/Stories/Reels; client posts; not photo-led |
| **Carousel** | **NOT ON LAUNCH MENU** | Decision B; catalog exclusion |
| **Marketing copy / email** | **READY WITH EXPLICIT LIMITS** | Paste-ready captions + ≤2 emails; Studio does not send; Resend parked |
| **Print collateral** | **READY WITH EXPLICIT LIMITS** | Single-page flyer/handout path; customer-safe copy; text-led CERT plate; client prints; not campaign poster art direction |

No vague **NEEDS IMPROVEMENT** left in the close vocabulary.

---

## Totals

| Run | PASS | FAIL | BLOCKED |
|-----|------|------|---------|
| Continuation (video wire) | 32 | 0 | 0 |
| Continuation-v2 (composition) | 32 | 0 | 0 |

Live creative inspection: **overrides** “green walk = sellable campaign.”

---

## Owner dependence

- Video fail/recover: **NONE** (Machine)
- Scope exception (extra TikTok/IG variations): Owner **decline** once (prior / preserved pattern)
- Creative launch stamp: **Manager** — package remains OPEN

---

## Final work commit / push-sync

- **Continuation work tip:** `f21c65e`
- Prior park tip: `e87b193` · hash note `7fdcefe`
- **Branch:** `operating/design-renderer-proof-1` (synced with origin)
- **Merge:** No

---

## PARK for Manager close

**Do not start another Toolbox project.**  
**Do not start Room 5.**  
**Finish Nia / creative production quality before expanding the menu.**

Recommended Manager close questions:

1. Accept social/print/video as **READY WITH EXPLICIT LIMITS** and keep **campaign creative + carousel** off the menu?  
2. Or keep entire 4B OPEN until photo-led campaign quality exists?  
3. Authorize a tool-search for photo-aware campaign composition — or not?

**PARK.**
