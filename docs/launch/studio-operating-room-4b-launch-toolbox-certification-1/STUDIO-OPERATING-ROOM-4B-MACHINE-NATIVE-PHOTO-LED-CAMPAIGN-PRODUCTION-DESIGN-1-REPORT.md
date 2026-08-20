# STUDIO-OPERATING-ROOM-4B-MACHINE-NATIVE-PHOTO-LED-CAMPAIGN-PRODUCTION-DESIGN-1 REPORT

**Package:** `STUDIO-OPERATING-ROOM-4B-MACHINE-NATIVE-PHOTO-LED-CAMPAIGN-PRODUCTION-DESIGN-1`  
**Parent:** `STUDIO-OPERATING-ROOM-4B-LAUNCH-TOOLBOX-CERTIFICATION-1` (remains OPEN)  
**Prior park tip:** `47ba8c0`  
**This tip:** `c4deabb` (pushed; synced with `origin/operating/design-renderer-proof-1`)  
**Contracts:** `src/lib/studio-campaign-creative/contracts.ts`  
**Mode:** Design + decomposition + repo feasibility — **no purchase · no vendor trial · no giant rewrite**  
**Room 5:** NOT STARTED · **No merge** · **No next Toolbox service**

---

## Top-level recommendation

# **A. BUILD MACHINE-NATIVE**

Studio can own the Launch Now photo-led campaign capability with the current stack plus coherent Machine-owned packages — **zero required vendors**.

Canva, Adobe, Placid remain **optional sockets** for advanced primitives The Studio does **not** need for Launch Now Nia (background removal, generative expansion, generative imagery).

**Not** “automate Canva.” **Not** “buy Adobe.” Same CapCut fork: own the capability; rent a socket only when a named primitive cannot be owned.

Contracts spike (types only): `src/lib/studio-campaign-creative/contracts.ts`  
Config: `src/config/studio-room-4b-machine-native-photo-led-campaign-production-design-v1.ts`

---

## Why A (not B/C/D)

| Option | Why not (or why yes) |
|--------|----------------------|
| **A — BUILD MACHINE-NATIVE** | **Chosen.** Layout grammar, materials ingest, Playwright PNG/PDF, collision QA, job spine, revision versioning already exist. Missing pieces are **Studio-owned**: hero layout recipes, CampaignVisualSystem config, Visual Prep (promote `sharp`), focal/subject structure (local detector or intake-declared focal — not Adobe). |
| B — + one narrow external engine | Only justified if SubjectDetection cannot be owned locally after a later spike. Socket defined now; **not required to hire a vendor to start.** |
| C — + multiple engines | Unjustified for Launch Now. |
| D — not practical | False. We do not need Canva-the-application. We need ~20 production operations. CERT-plate failure ≠ Machine-native impossibility. |

**Quality honesty:** A does **not** mean “CERT plates tomorrow.” It means the architecture can move past CERT plates into photo-led creative **if** we ship approved layout families + Visual Prep + hero emission. Technically renderable ≠ professionally art-directed — the design system + recipes carry art direction; the renderer executes them.

---

## CapCut parallel (locked)

| Short video | Campaign creative |
|-------------|-------------------|
| Need: MP4 without Tagia in CapCut | Need: photo-led assets without Tagia in Canva/Photoshop |
| CapCut failed independence → Shotstack as **engine under Studio contract** | Do not force Canva/Adobe because APIs exist |
| Customer buys Short Promotional Video | Customer buys Campaign Creative / Social Graphic / Print Collateral |

---

## Test case (unchanged)

**Nia Carter / Rooted & Ready Wellness Studio / Fall Reset Launch Campaign**

Preserve: calm wellness · no neon · no before/after body · photography · logo · dates · price · booking CTA · social + print · revision “window photo, same campaign style.”

Do not simplify. Do not replace Nia. Text-led renderer already proven insufficient for professional photo-led creative.

---

## Current-stack inventory

| Area | Status | Evidence |
|-------|--------|----------|
| Design renderer (HTML → Playwright PNG/PDF) | **EXISTS** | `src/lib/studio-design-renderer/` — flyer, promo, social, card, menu, etc. |
| Layer grammar (text / image / shape) | **EXISTS** | `types.ts` — `FlyerImageRole` includes `"hero"` but **reasoners never emit hero** |
| Logo placement | **EXISTS** | Deterministic reasoners |
| Photo-led layout / hero use | **MISSING** | Gap that produces CERT plates |
| Text collision QA | **EXISTS** | `text-layer-collision.ts` |
| Customer copy leak gates | **EXISTS** | `customer-facing-creative-copy.ts` |
| Kitchen design-quality evaluate | **EXISTS** | Declared text/metadata — **does not see pixels** |
| `sharp` | **PARTIAL** | `devDependency` — script prep only; **not** design production path |
| Playwright | **EXISTS** | Capture path |
| PDF library | **PARTIAL** | Via Playwright `page.pdf` — enough for current print plates |
| Materials upload / File Room / storage | **EXISTS** | `materials/`, `file-storage/`, materials API |
| Image dimensions / derivatives / focal | **MISSING** | Materials track mime; no assessment pipeline |
| Crop / focal-aware refit | **MISSING** | CSS `object-fit` only |
| Subject / face detection | **MISSING** | No vision path |
| Multimodal AI | **PARTIAL** | Anthropic **text** for flyer reason only — no vision critique |
| Job spine / dispatch | **EXISTS** | `job-control/`, `studio-dispatch/` — not Redis/Bull |
| Canva / Adobe / Placid clients | **ABSENT** | Intentional |
| Nia photo binaries | **MISSING** | Fixture placeholders only |

### What the renderer CAN / CANNOT do with photography today

**CAN:** Place logo (and typed-but-unused hero) via contain/cover; veiled reference backdrop on rm-j007; export fixed plates; collision/leak QA.

**CANNOT:** Select/treat lifestyle photos into a sellable multi-format campaign; focal-aware crop; art-directed photo prominence; close Campaign Creative as launch-ready.

---

## Capability decomposition (A/B/C/D)

Classification: **A** Studio owns · **B** owns with libraries · **C** narrow external API · **D** Owner/manual (forbidden for routine)

### 1. Image ingest

| Primitive | Class | Notes |
|-----------|-------|-------|
| Accept binaries | **A** | Materials + file-storage exist |
| Stable asset ID + provenance | **A** | Extend materials ledger |
| Preserve original | **A** | |
| Read dimensions/orientation/format | **B** | Promote `sharp` (or image-size) to runtime |
| Safe working derivatives | **B** | `sharp` |
| Corrupt/unusable detect | **B** | |
| Bind to campaign | **A** | |

### 2. Image quality assessment

| Primitive | Class | Notes |
|-----------|-------|-------|
| Resolution / size floors | **B** | Objective |
| Format/orientation | **B** | |
| Severe compression / tiny file | **B** | Heuristic |
| Blur score | **B** | Optional Laplacian via `sharp`/raw — approximate |
| Subjective “good wellness photo” | **≠ numeric** | Creative QA / intake rules — do not pretend blur = art direction |

### 3. Focal-point / subject awareness

| Primitive | Class | Notes |
|-----------|-------|-------|
| Structured focal + safe crop + protected bounds | **B** (preferred) | Local face/person detector **or** intake/Voice-declared focal region |
| External vision SaaS | **C** socket | Only if local B fails later spike — `SubjectDetectionProvider` |
| Tagia hand-crops each job | **D — FAIL** | |

**Feeds layout.** Required for Nia window-photo crop safety.

### 4. Crop / refit / aspect prep

| Primitive | Class | Notes |
|-----------|-------|-------|
| Crop/resize/contain/cover around focal | **B** | `sharp` |
| Padding / safe-zone | **A** | Recipe + prep |
| Square / vertical / print targets | **A** | Format contracts |

### 5. Image treatment (basic)

| Primitive | Class | Notes |
|-----------|-------|-------|
| Brightness/contrast/normalize | **B** | `sharp` |
| Overlay / gradient / tint / soft mask | **A** | HTML/CSS in existing capture path |
| Framing | **A** | Recipe |

**Do not require Adobe for basic deterministic treatment.**

### 6. Advanced image operations

| Primitive | Needed for Nia Launch? | Class | Notes |
|-----------|------------------------|-------|-------|
| Background removal | **No** (good photos + intentional crop) | **C** socket optional | `BackgroundRemovalProvider` |
| Generative expansion | **No** if photos adequate | **C** socket | `ImageExpansionProvider` |
| Object removal | **No** | **C** optional | |
| Generative imagery | **No** — preserve customer identity | **C** socket | `VisualGenerationProvider` |
| Compositing logo+photo | **Yes** | **A** | Existing layer model |

**Do not bundle into “we need Adobe.”** Name the primitive.

### 7. Campaign visual system

| Primitive | Class | Notes |
|-----------|-------|-------|
| Palette, type roles, logo rules, spacing, CTA, hierarchy, layout families | **A** | Structured config Machine consumes — **not** a Canva file |
| One-time Owner/approved design of systems | **Allowed setup** | Not routine D |

### 8. Layout engine

| Primitive | Class | Notes |
|-----------|-------|-------|
| Finite production grammar (text/image/logo/shape/z-order/safe zones) | **A** | Extend existing DesignSpec |
| Interactive Canva rebuild | **Out of scope** | |
| Emit **hero** photo layouts | **A — BUILD** | Primary gap vs CERT plates |

### 9. Text-fit / collision safety

| Primitive | Class | Notes |
|-----------|-------|-------|
| Collision / overflow / CTA-logo collision | **A** | Extend existing fail-closed |
| Iterative font-fit | **A** | Add shrink-or-fail (never silent squash) |

### 10. Multi-format adaptation

| Primitive | Class | Notes |
|-----------|-------|-------|
| One family → square / vertical / print | **A** | Format-specific recipes; shared CampaignVisualSystem |
| Unrelated templates per size | **Forbidden** | |

### 11. Template / recipe model

| Primitive | Class | Notes |
|-----------|-------|-------|
| **Layout recipes** + visual system (preferred) | **A** | Reusable; accepts photo/logo/copy tokens |
| “Tagia redesigns each customer” templates | **D — FAIL** | |

### 12. Creative variation

| Primitive | Class | Notes |
|-----------|-------|-------|
| Approved recipe variants (full-bleed / panel / image-left) | **A** | Controlled creativity |
| Random generative layout | **Reject** | Slot-machine design |

### 13. QA contract

| Layer | Class | Notes |
|--------|-------|-------|
| Automated (collision, dims, missing fields, blank image, logo, version) | **A** | |
| Creative (hierarchy, polish, photo suitability, coherence, cheap/template look) | **B/C socket** | `CreativeQaProvider` — multimodal structured critique preferred; Owner visual inspect for **certification** only, not routine editor labor |
| Pixel aesthetic as pure numeric | **Honest gap** | Do not fake |

### 14. Revision (Nia exact)

> “Use the photo where I’m standing by the window instead, but keep the campaign style the same.”

| Step | Class |
|------|-------|
| Resolve `nia-photo-good-1` (window) as primary | **A** |
| Retain same CampaignVisualSystem + recipe family | **A** |
| Re-prep crop · regenerate formats · QA · new version | **A** |
| Manual rebuild in editor | **D — FAIL** |

### 15. Failure / recovery

| Failure | Machine behavior |
|---------|------------------|
| Corrupt image | Fail ingest; request different asset |
| Weak photo | Alternate asset or alternate recipe; else customer asset request |
| Impossible crop | Alternate recipe / format rule; not Tagia crop |
| Missing font | Fail closed |
| Renderer/export fail | Retryable job |
| Creative QA reject | Retry recipe variant or escalate Owner **judgment** — not Owner operating Photoshop |

### 16. Export

| Primitive | Class | Notes |
|-----------|-------|-------|
| PNG/JPEG | **A** | Playwright / sharp |
| Print PDF | **A** | Existing PDF path |
| Naming / version / SHA | **A** | Existing bind/fingerprint doctrine |

### 17. Scale / concurrency

| Concern | Assessment |
|---------|------------|
| Path | Chromium per capture — CPU heavy |
| Architecture | Job spine exists; **no** dedicated worker pool yet |
| 5 concurrent | Plausible with queue + worker process |
| 25–50 | Needs worker pool / timeouts / no render on request thread |
| Room 4D | Do not optimize for 100 now; **do** keep render off Next.js request path when productionizing |

---

## Nia primitive map

| Nia need | Primitive | Own? |
|----------|-----------|------|
| Window / group / lifestyle photos | Ingest + AssetAssessment | A/B |
| Calm no-neon system | CampaignVisualSystem | **A** |
| Photo prominence (not CERT price plate) | Hero LayoutRecipe families | **A — BUILD** |
| Square + vertical + print coherence | Multi-format recipes | **A** |
| Dates / price / CTA / logo | Slots + collision QA | **A** |
| Window-photo revision | Asset swap + regen | **A** |
| Background remove / outpaint | **Not Launch-required** | Socket only |

---

## Machine-native reference architecture

```
Project truth
  → CreativeBrief
  → CampaignVisualSystem          (Studio-owned config)
  → AssetAssessment               (sharp + optional SubjectDetectionProvider)
  → LayoutRecipe                  (approved family + format)
  → PreparedVisualAsset           (Visual Prep: crop/refit/treat)
  → RenderedCampaignAsset         (extend DesignSpec HTML → Playwright)
  → AutomatedQA
  → CreativeQA                    (CreativeQaProvider optional)
  → ReviewVersion
  → DeliveryAsset
```

Provider IDs stay internal. Customer never sees vendor names.

Preferred runtime flow:

**Machine** → **Studio Visual Prep** → **Studio Campaign Renderer** → **Studio QA** → Review → Delivery

---

## Build-vs-buy matrix (compact)

| Capability | Nia? | Launch Now? | Own? | Existing? | External? | Risk | Rationale |
|------------|------|-------------|------|-----------|-----------|------|-----------|
| Image ingest/bind | Y | Y | A | Partial | No | L | Extend materials |
| Dimensions/derivatives | Y | Y | B | sharp scripts | No | L | Promote sharp |
| Technical image QA | Y | Y | B | No | No | M | Heuristics |
| Subject/focal | Y | Y | B (+C socket) | No | Not required | M | Local detector or declared focal |
| Crop/refit | Y | Y | B | CSS only | No | L | sharp prep |
| Basic treatment | Y | Y | A/B | Partial CSS | No | L | |
| BG remove | N | N | — | No | Socket later | — | Not Launch |
| Generative expand | N | N | — | No | Socket later | — | Not Launch |
| CampaignVisualSystem | Y | Y | A | No | No | M | Design once |
| Layout engine + hero | Y | Y | A | Partial | No | **H** | Core gap |
| Collision/text safety | Y | Y | A | Yes | No | L | Extend |
| Multi-format family | Y | Y | A | Partial plates | No | M | Recipes |
| Creative variation | Y | Y | A | No | No | M | Approved variants |
| Automated QA | Y | Y | A | Yes | No | L | |
| Creative QA | Y | Y | B/C | Text-only | Optional vision | M | Multimodal socket |
| Revision | Y | Y | A | Version patterns | No | L | |
| Export PNG/PDF | Y | Y | A | Yes | No | L | |
| Queue/concurrency | Later | Partial | A | Spine only | No | M | Workers later |
| Canva Autofill | — | N | — | No | **Avoid** | H cost | Not needed if recipes own layout |
| Adobe Firefly/PS | — | N | — | No | **Avoid for Launch** | H cost/ETLA | Advanced sockets only |

**Smallest external dependency set: `[]` (empty).**

---

## Provider sockets (defined, not wired)

| Contract | When to hire |
|----------|--------------|
| `SubjectDetectionProvider` | If local focal detection fails sellability spike |
| `BackgroundRemovalProvider` | Product requires cutout look |
| `ImageExpansionProvider` | Photos cannot fill formats without inventing pixels |
| `VisualGenerationProvider` | Rare; protect customer identity default |
| `CreativeQaProvider` | Multimodal critique at scale |

**Never name interfaces after Adobe/Canva/Placid.**

---

## QA design

1. **AutomatedQA** — fail-closed: collision, clip, dims, missing facts, blank/failed image, logo rules, leak chrome, version bind.  
2. **CreativeQA** — structured multimodal critique against CreativeBrief + CampaignVisualSystem (hierarchy, photo prominence, calm wellness, cheap-template risk).  
3. **Owner visual inspect** — certification / exception judgment only — **not** production software operation.

---

## Revision design

```
Customer feedback
  → parse asset intent (window photo = nia-photo-good-1)
  → CreativeBrief.selectedAssetIds.primaryPhotoId = that id
  → same CampaignVisualSystem + recipe family
  → Visual Prep recomputes crop
  → render all affected formats
  → AutomatedQA + CreativeQA
  → ReviewVersion n+1
```

No Tagia rebuild.

---

## Failure / recovery design

Machine labels each fail: `retryable` | `needs_different_customer_asset` | `needs_alternate_layout` | `needs_external_socket` | `needs_owner_judgment`.

Owner is never asked to open Canva/Photoshop to finish a job.

---

## Scale / concurrency assessment

- Capture is Chromium-bound → **queue + workers** before 25+ concurrent.  
- Keep customer app non-blocking.  
- 5 concurrent: plausible early.  
- 50: needs dedicated workers + timeouts — design now so Room 4D is possible; do not build 4D now.

---

## Proof spikes (bounded)

| Spike | Done? |
|-------|-------|
| Repo inventory | **Yes** (this report) |
| Types-only production contract | **Yes** — `contracts.ts` |
| Live photo-led render of Nia | **No** — requires photo binaries + later implementation packages |
| Vendor API calls | **Forbidden this package** |

---

## Implementation estimate (coherent packages — not task crumbs)

| # | Package | Intent |
|----|---------|--------|
| 1 | Campaign creative contracts + CampaignVisualSystem schema (seal) | Config Machine can consume |
| 2 | AssetAssessment + Visual Prep (`sharp` runtime) | Derivatives, crop around focal |
| 3 | Subject focal adapter (local first) | Fill `AssetAssessment.subject` |
| 4 | Photo-led LayoutRecipe families (square / vertical / print) for wellness campaign system | End CERT-only reasoners for campaign SKUs |
| 5 | Wire hero recipes into existing HTML→Playwright + set QA | Produce inspectable Nia set |
| 6 | Revision + failure taxonomy + Delivery bind | Window-photo proof |
| 7 | Optional CreativeQaProvider (vision) | Structured sellability assist |
| 8 | Nia live cert with real photo pack | Visual “would we charge?” gate |

**Do not start #2–8 until Manager accepts A and authorizes the next build package.**

---

## Risks

1. **Recipe quality** — Machine-native still looks CERT-like if layout families are weak. Mitigation: one-time approved design systems; controlled variants.  
2. **Focal without vision** — center-crop can cut faces. Mitigation: local detector or declared focal; C socket if needed.  
3. **Creative QA subjectivity** — multimodal helps; final Launch cert still needs human sellability look once.  
4. **Chromium cost at scale** — plan workers early.  
5. **Subscription sprawl relapse** — reject “buy Canva because recipes are hard.”  

---

## Owner decisions genuinely required

1. **Accept recommendation A** (or override to B if Owner insists on SaaS subject detection from day one).  
2. **Authorize next build package** (contracts seal → Visual Prep) when ready.  
3. **Supply Nia photo pack** (binaries for fixture material IDs) before live visual cert.  
4. **One-time approve** first CampaignVisualSystem + layout family (setup, not routine).  
5. **Do not** open Placid trial / buy Canva Enterprise / buy Adobe ETLA for this fork unless a later spike proves a named C primitive.

---

## Final A/B/C/D

# **A. BUILD MACHINE-NATIVE**

**Smallest external dependency set:** none for Launch Now.

Adobe/Canva/Placid = optional future sockets behind provider-neutral contracts — not the workstation.

---

## PARK FOR MANAGER

4B remains OPEN.  
Campaign Creative remains on the long-term capability list.  
Carousel stays off Launch Now.  

**No purchase. No trial. No merge. No Room 5. No next Toolbox service. No implementation continuation unless Manager authorizes the next coherent build package.**
