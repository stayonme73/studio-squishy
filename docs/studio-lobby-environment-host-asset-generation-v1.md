# Studio Lobby — Environment & Host Asset Generation Instructions V1

| Field | Value |
|---|---|
| Status | **Active** — art production brief |
| Date | 2026-07-18 |
| Authority | Locked contract: [`studio-lobby-environment-separation-inspection-v1.md`](studio-lobby-environment-separation-inspection-v1.md) |
| Host identity | [`studio-host-character-standard-v1-locked.md`](studio-host-character-standard-v1-locked.md) |
| Environment lock | [`studio-lobby-v1-locked.md`](studio-lobby-v1-locked.md) — preserve composition; remove baked Host + software greeting from the plate |
| Audience | Chat / Tagia (artwork). Scout does not generate art. |

**Do not implement code from this brief.** After assets exist, Scout produces a separate implementation plan before touching code.

**V1 runtime delivery remains limited to the clean environment, Host Base, Eyes Open, and Eyes Closed. However, the production Host must be created and retained as a layered editable master with separable head/face, mouth region, arms, hands, tablet, torso, and lower-body groups. These master layers are future-production safeguards and are not additional V1 runtime assets. Do not flatten or discard the editable master.**

See also: [`studio-host-behavior-asset-architecture-review-v1.md`](studio-host-behavior-asset-architecture-review-v1.md) (accepted with layered-master correction).

---

## 1. Goal

Produce a **clean Lobby environment** and a **separate Host Layer** asset set so software can stack:

1. Environment (opaque room + kiosk)  
2. Host Layer (transparent Host)  
3. Interactive kiosk hotspot (unchanged behavior)  
4. Conversation overlay (unchanged; voice off)

Preserve the locked Lobby experience: enter Studio → notice Host → notice podium → start at podium.

---

## 2. Locked engineering constraints (do not renegotiate in art)

| Constraint | Value |
|------------|--------|
| Runtime plate size | **1920 × 1080** (16:9 locked Lobby 2026-07-18) |
| Aspect | `1920 / 1080` |
| Optional Chat master | Prefer true 1920×1080 or 3840×2160 export (current runtime upscaled from 1024×576 source) |
| Feet anchor | **Required** — Host scales from feet (`transform-origin: 50% 100%`) |
| Host footprint | **Artwork owns size** inside available space; engineering does not lock a bbox |
| Available space | Open floor center-right of podium; must not cover kiosk tap `(55, 340)–(575, 1040)` on 1920×1080 |
| V1 Host assets | **Only** base + eyes open + eyes closed |
| Voice / mouth / shadow layers | **Out of scope** for V1 |
| Certification | Desktop and real Samsung certify together later — compose for both contain (desktop) and cover crop (mobile) |

---

## 3. Deliverable A — Clean Lobby environment

### 3.1 What to produce

| Deliverable | Spec |
|-------------|------|
| Runtime file | `public/welcome-hall/studio-lobby-environment.png` |
| Dimensions | **1920 × 1080**, opaque, sRGB |
| Optional master | `studio-lobby-environment-master-2896x2172.png` (workspace only; not required in `public/`) |

### 3.2 Must include (environment)

- Room architecture, lighting, atmosphere  
- Furniture, table, workspace  
- Mural, plants, city / skyline view  
- Meeting room / Discovery entrance as in locked composition  
- **Kiosk / podium** — same placement and proportions; screen + physical podium readable  
- Baked kiosk CTA art may remain on the podium screen if it matches today’s “LET’S GET STARTED” treatment (software hotspot still covers the kiosk body)

### 3.3 Must remove from the environment plate

- The **Host figure** (full body)  
- Any **speech bubble / greeting text** meant for software (current baked “Welcome to The Studio…” bubble)  
- Any alternate person or mascot  

Mobile cream dock already shows greeting in HTML — do not rely on a bubble in the plate.

### 3.4 Composition rules

- Same overall hierarchy and premium feel as baseline  
  - Baseline reference: `docs/illustration/references/studio-lobby-baseline-image-1.png`  
  - Current production (to split): `public/welcome-hall/studio-lobby-scene.png`  
- Do **not** redesign the room  
- Leave **visual room** for the Host to the right of the podium without covering the kiosk interaction area  
- Floor plane must remain clear enough that Host feet can read as standing on the Lobby floor  
- No transparent pixels required on the environment plate (opaque)

### 3.5 Export checklist

- [ ] Exactly 1920 × 1080  
- [ ] No Host  
- [ ] No greeting bubble  
- [ ] Kiosk still dominant left-foreground  
- [ ] sRGB; no huge unintended borders  
- [ ] Do **not** overwrite `studio-lobby-scene.png` until cutover is approved  

---

## 4. Deliverable B — Host Layer V1 (three files only)

### 4.1 Identity (locked — do not redesign)

Use the Studio Host Character Standard. Same individual as the Lobby baseline:

- Same face, hair, glasses, proportions, expression language  
- Guide, not product/mascot/cartoon  
- Default wardrobe per Host standard / Lobby baseline  
- She is **not** the primary click target; podium remains primary  

### 4.2 Files

#### V1 runtime (deliver to `public/welcome-hall/`)

| Asset | Proposed runtime path | Notes |
|-------|----------------------|--------|
| Host base | `public/welcome-hall/studio-lobby-host-base.png` | Flattened full body, transparent; tablet may be painted into this flat; prefer complete face with open eyes on base plus separate eye layers for blink |
| Eyes open | `public/welcome-hall/studio-lobby-host-eyes-open.png` | Aligned to base; transparent outside eyes |
| Eyes closed | `public/welcome-hall/studio-lobby-host-eyes-closed.png` | Same alignment registration as eyes open |

**V1 runtime forbids:** separate mouth, shadow plate, pose variants, sprite sheets as shipped files.

#### Layered editable master (retain — not a runtime asset)

Create and keep a layered source file (PSD/AI/etc.) with editable groups for:

- head and face  
- eyes  
- mouth area  
- torso  
- near arm and hand  
- far arm and hand  
- **tablet** (separate editable object)  
- hands touching the tablet (editable with / next to tablet)  
- legs and feet  
- clothing elements where movement may matter  

Export the three flattened Host runtime files from this master. **Do not flatten or discard the editable master** after export.

### 4.3 Technical art requirements

- Transparent RGBA for runtime Host exports (PNG-24 or transparent WebP)  
- Clean edges (no white matte fringe)  
- Enough transparent padding that feet sit clearly inside the canvas  
- Register eyes layers to the **same pixel canvas size** as the base (same width/height) so software can stack without offset hacks  
- Pose: natural standing guide / work-ready idle; open body language; looking toward customer / podium relationship as in baseline; tablet OK on flattened base  
- Do not hold a second product CTA that competes with the kiosk  
- Retain layered editable master after all exports (see §4.2) 

### 4.4 Footprint guidance (art-owned)

Engineering available-space reminder only:

- Keep drawn Host clear of native kiosk tap `(70, 360)–(630, 1040)` when placed on the 1920×1080 plate  
- Prefer Host standing in the open floor to the right of the podium  
- Exact width/height of the Host is **your** call inside that available space  

### 4.5 Feet pin (required handoff to Scout)

After Host base is approved on the clean environment:

1. Composite Host on environment at intended Lobby placement (Tagia review).  
2. Measure **feet contact point** in native plate coordinates `(x, y)` on the 1920×1080 space.  
3. Record that pin for the implementation plan (Scout will set `transform-origin: 50% 100%` to those feet).

---

## 5. Mobile / Samsung note for artists

Desktop uses **contain** (full plate visible).  
Mobile uses **cover** with slight left bias (`object-position: 48% 50%`) and a taller crop box.

Compose so the Host still reads if sides/bottom crop slightly — **unless Tagia decides Host is desktop-primary / hidden on mobile**. Default assumption until Tagia says otherwise: Host should survive gentle mobile cover without losing face or feet entirely.

---

## 6. What not to generate

- Lip-sync / mouth frames  
- Listening / speaking / thinking alternate bodies  
- Separate Samsung environment plate (unless dual-pass cert later fails)  
- New Lobby redesign, new Host face, new wardrobe (unless Tagia-approved exception)  
- Guide conversation UI mockups as part of the plate  

---

## 7. Acceptance for art handoff

Art package is ready for Scout’s **implementation plan** when:

1. `studio-lobby-environment.png` @ 1920×1080 accepted by Tagia  
2. Host base + eyes open + eyes closed accepted by Tagia  
3. Layered editable Host master retained (not discarded after flatten)  
4. Feet anchor `(x, y)` recorded on the composed plate  
5. Mobile Host visibility decision stated (show / partial crop OK / hide)  
6. Runtime format confirmed (PNG vs transparent WebP for Host)

Then: Scout writes implementation plan → Tagia approves → code (voice still off) → **Desktop and Samsung certify together**.

---

## 8. Reference paths

| Role | Path |
|------|------|
| Locked inspection contract | `docs/studio-lobby-environment-separation-inspection-v1.md` |
| Host identity | `docs/studio-host-character-standard-v1-locked.md` |
| Lobby lock | `docs/studio-lobby-v1-locked.md` |
| Baseline image | `docs/illustration/references/studio-lobby-baseline-image-1.png` |
| Current baked production plate | `public/welcome-hall/studio-lobby-scene.png` |
| Kiosk native rect | `src/config/welcome-hall-scene.ts` → `kioskTapTarget` |
