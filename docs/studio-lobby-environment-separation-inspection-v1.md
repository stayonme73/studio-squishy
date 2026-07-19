# Studio Lobby Environment Separation Inspection

| Field | Value |
|---|---|
| Status | **LOCKED — Tagia approved 2026-07-18** |
| Room | Studio Lobby only |
| Date | 2026-07-18 |
| Scope | Environment separation + Host Layer *capability* — not Guide conversation wiring, not voice enablement, not Host appearance redesign |
| Code changes | **None** until a separate implementation plan is approved |
| Authority | This file is the approved technical contract for the Studio Lobby Environment Separation package |

**Amendment 2026-07-18:** Tagia locked Lobby environment at **1920 × 1080 (16:9)** (`studio-lobby-scene.png?v=10`). Desktop uses **contain** so the full Lobby shows on standard monitors without dominating blur bars. Host remains a separate layer.

**Purpose:** Create an exact technical contract so Chat/Tagia can produce artwork and Scout can later implement environment/Host separation without redesigning the Lobby or guessing layout.

**Permanent certification rule:** Desktop and Samsung certify together. Neither is considered complete until both pass.

---

## 1. Current room

Studio Lobby (`/` · `/studio-lobby`).

## 2. Exact issue

The production plate `public/welcome-hall/studio-lobby-scene.png` currently bakes multiple responsibilities into one image:

- Lobby environment
- Host figure
- Greeting / message
- Kiosk artwork (including baked CTA)

The Lobby needs clean technical separation into:

1. **Environment layer** — room, lighting, furniture, kiosk, mural, plants, city view (no Host, no message text intended for software)
2. **Host Layer** — separate transparent Host artwork; stable feet-anchored position/scale; future blink / breathe / listen / think / speak *hooks*
3. **Software layer** — conversation interface, visual-state wiring, animation controls, reduced-motion, future speech connections (voice stays off unless Tagia approves)

The visual Host must not be baked into the Lobby environment.

**Preserve exactly as today:** desktop kiosk tap behavior, mobile cream action dock, Back navigation, desktop composition intent.

## 3. Why it matters to the client

Customers must still feel they entered a professional Studio, notice the Host, and begin at the podium. Separating environment from Host Layer enables presence and future motion without breaking Samsung-hardened entry or desktop podium interaction.

## 4. What Scout inspected

**Confirmed from code**

| Path | Role |
|------|------|
| `src/app/page.tsx`, `src/app/studio-lobby/page.tsx` | Lobby entry: scene + `LobbyGuideOverlay` |
| `WelcomeHallStaticScene.tsx` → `WelcomeHallWelcomeScene.tsx` | Plate, kiosk, mobile dock |
| `welcome-hall-scene.ts`, `welcome-hall-phase1.ts` | Native size, hotspot, framing, copy, routes |
| `welcome-hall-phase1.css`, `welcome-hall.css` | Desktop contain + bleed; mobile crop + dock |
| `LobbyGuideOverlay.tsx`, `GuideConversationPanel.tsx` | Conversation UI (portal; Back → `/`) |
| `studio-guide-conversation-v1.ts` | `CONVERSATION` / `VOICE` flags |
| `studio-guide-speech-state.ts`, `useGuideDictation.ts`, `GuideMicControl.tsx` | Voice infrastructure (gated) |
| Locked docs | Lobby composition + Host identity standards |

**Not completed this pass:** live desktop matrix; real Samsung device. Those remain certification gates under the dual-pass rule.

---

## 5. Current desktop layout behavior

**Confirmed from code** (`min-width: 1025px` and `plateSize.width >= 1025`):

- Lobby plate fills the Lobby shell (`100dvh` constraints on desktop).
- Sharp plate uses **contain** via `welcomeHallPlateCoverLayout` + centered framing (`x/y = 0.5`) on native **1448 × 1086**.
- Canvas art uses `object-fit: fill` inside the aspect-correct canvas.
- Soft **backdrop bleed** reuses the **same** image with `cover` + blur + slight scale — presentation framing only (not second locked art).
- Plate fallback colors `#2e2d2b` / `#3a3835` can show as dark bands if bleed is late or missing.
- **Kiosk tap target** (native): `x: 68, y: 417, width: 453, height: 594` → percent on the plate canvas via `sceneRectToPercent`. Interactive stack `z-index: 10`.
- HTML greeting balloon **off** (`squishyGreetingOverlayEnabled: false`); greeting is baked in current production art.
- Conversation mounts above the Lobby via portal (`z-index: 2147483000`); close uses hard navigation to `/`.

Wide/short desktop: same contain math; letterbox size changes. Visual quality: **Real-device verification required** (with Samsung, under dual-pass rule).

## 6. Current Samsung mobile layout behavior

**Confirmed from code** (`max-width: 1024px`):

- No desktop plate canvas path; **kiosk hotspot hidden** (`hall-kiosk-stack` not interactive).
- Hero crop height: `calc(100vw * 1086 / 1448 * 1.12)` (~12% taller than pure plate ratio).
- Art: `object-fit: cover`, `object-position: 48% 50%` (slight left bias toward podium).
- Cream dock below crop: heading, greeting lines, primary CTA, secondary nav; bottom padding includes `env(safe-area-inset-bottom)`.
- Guide CTA uses hard `location.assign("/?guide=1&gr=room-v8")` (Samsung-hardened).
- Guide open relaxes overflow clip on the Lobby root.

Browser responsive mode is **not** certification. **Desktop and Samsung certify together.**

---

## 7. Required clean-background sizes and exports

| Item | Spec | Label |
|------|------|--------|
| Runtime native space (keep) | **1448 × 1086** | **Scout recommendation** — preserves hotspot math and aspect lock |
| Source master for Chat | **2896 × 2172** (2×) | **Scout recommendation** |
| Runtime environment export | **1448 × 1086** opaque | **Scout recommendation** |
| One runtime for desktop + mobile | **Yes** (CSS contain vs cover already differs) | **Confirmed from code** + **Scout recommendation** |
| Separate Samsung export | Not required for v1 unless dual-pass certification fails composition | **Scout recommendation**; **Tagia decision** if needed after cert |
| Backdrop | Same runtime environment src + CSS blur bleed | **Confirmed from code** |
| Dark edges cause | Letterbox fallback colors + contain gaps | **Confirmed from code** |
| Environment format | Opaque PNG-24 or high-quality WebP; sRGB | **Scout recommendation** |
| Host Layer format | Transparent RGBA PNG or transparent WebP; clean edges; sRGB | **Scout recommendation** |
| Cache bust | Bump `?v=` on src when assets change | **Confirmed from code** |

Do not change native **1448 × 1086** without remapping `kioskTapTarget` and plate helpers.

**Proposed file names (runtime):**

- `public/welcome-hall/studio-lobby-environment.png`
- Optional master (not served): `studio-lobby-environment-master-2896x2172.png` (Chat/Tagia workspace)

Do not overwrite `studio-lobby-scene.png` during inspection or until cutover is approved.

---

## 8. Available Host Layer space (not a locked footprint)

**Engineering owns available space. Art owns how much of that space the Host occupies.**

Do **not** lock a Host footprint bounding box as an engineering contract. Exact Host silhouette comes from approved artwork after Tagia/Chat compose within the safe available region.

### Hard exclusions (Confirmed from code + Scout recommendation)

| Region | Native / layout | Rule |
|--------|-----------------|------|
| Kiosk tap target | `(68, 417)–(521, 1011)` · 453×594 | Host Layer must never cover this interaction rect (desktop) |
| Mobile cream dock | DOM below crop; z-index 20–21 | Host Layer must never sit in or block the dock |
| Conversation / Back | Portal overlay | Software layer above Host Layer; Back remains reachable |

### Available space for Host placement (Scout recommendation — guidance only)

Within the native **1448 × 1086** plate, the practical region for a full-body Host that preserves podium primacy is the area **to the right of the kiosk interaction rect**, above the floor, and clear of mandatory UI:

- **Suggested available region (not locked):** roughly native **x ≥ 536** (kiosk right + ~16 px margin) through the right side of the plate; **y** from upper torso clearance down to floor line.
- Feet should remain groundable under **contain** (desktop).
- Under **mobile cover**, feet or sides may crop — **Tagia decision** whether Host appears on all mobile widths, may be partially cropped, or is desktop-primary.

Art/Tagia decide the Host’s exact width, height, and padding inside that available space. Engineering then anchors and scales to the art’s feet point.

Reference-only (HTML balloon currently off): greeting balloon rect `(594, 198)–(990, 368)` — **Confirmed from code**.

---

## 9. Recommended anchoring and scaling strategy

**Locked decision: feet anchor.** Everything scales from the feet.

| Rule | Choice | Label |
|------|--------|--------|
| Anchor | **Feet** contact point in native Lobby coordinates | **Locked for this contract** |
| Transform origin | **`50% 100%`** | **Scout recommendation** |
| Coordinate system | Reuse Lobby native space (same family as kiosk `%` mapping). Desktop: Host Layer inside plate canvas. Mobile: map with cover math into crop (or hide per Tagia) | **Scout recommendation** |
| Scale | `renderedPlateWidth / 1448` (same scale as environment plate) | **Scout recommendation** |
| Contain (desktop) | Host Layer sibling of plate art inside canvas | **Scout recommendation** |
| Cover (mobile) | Same native feet anchor + cover mapping; Samsung override only if dual-pass cert proves shared math insufficient | **Scout recommendation** |
| Avoid kiosk | Host drawn content must not overlap kiosk tap rect | **Scout recommendation** |
| Avoid mobile dock | Host only in crop layer, never in dock DOM | **Confirmed from code** / **Scout recommendation** |
| Load without jump | Reserve layout box from art intrinsic size; reveal after `onLoad`; width/height attributes | **Scout recommendation** |

Exact feet `(x, y)` is **Tagia decision** after clean environment + Host art exist (measure from approved Host asset standing on the clean plate).

---

## 10. Recommended Host Layer wiring

**Locked component name:** `StudioLobbyHostLayer.tsx`

Owns exactly one thing: the **visual Lobby Host**.

Does **not** own conversation UI, kiosk hits, or voice STT.

| Concern | Owner |
|---------|--------|
| Clean Lobby background | `WelcomeHallWelcomeScene` plate environment `<img>` |
| Visual Host | **`StudioLobbyHostLayer`** (new), sibling inside plate canvas / mapped mobile crop |
| Conversation UI only | `LobbyGuideOverlay` → `GuideConversationPanel` |
| Config | `welcome-hall-scene.ts` and/or `studio-lobby-host-layer-v1.ts`: feet anchor, asset paths, visual state enums |
| Reuse | `sceneRectToPercent` / plate layout helpers for placement |
| Visual state vs mic | Separate `LobbyHostVisualState`. Map from speech **only** when `NEXT_PUBLIC_STUDIO_GUIDE_VOICE=1`. Voice off → idle / breathe / blink only |
| Coupling | One-way optional visual state into Host Layer; Host Layer never calls STT |
| Before Guide open | Idle + breathing + blink |
| Guide open, voice off | Same idle / breathing / blink |
| Voice | Remains disabled unless Tagia explicitly approves |

**Separation (locked conceptually):**

```
Host Layer          → visual presence only
Conversation Overlay → questions, answers, Back
Voice State          → mic/dictation (gated; off for first visual pass)
```

---

## 11. First-pass asset requirements

**Version 1 stays ridiculously simple.**

### Required now

| Asset | Runtime name (proposed) |
|-------|-------------------------|
| Clean Lobby environment (opaque) | `studio-lobby-environment.png` (1448×1086) |
| Host base (transparent full-body) | `studio-lobby-host-base.png` |
| Eyes open | `studio-lobby-host-eyes-open.png` |
| Eyes closed | `studio-lobby-host-eyes-closed.png` |

Optional Chat-only master: `studio-lobby-environment-master-2896x2172.png` (not a runtime requirement).

### Explicitly not in Version 1

- Grounding shadow as a separate layer
- Mouth / lipsync / expression mouths
- Listening / speaking / thinking pose swaps
- Sprite sheets
- SVG masks
- Separate Samsung environment export (unless dual-pass fails)

### Motion in Version 1

- Subtle breathing on base
- Blink via eyes open/closed
- `prefers-reduced-motion: reduce` → static (no breathe/blink loop)

---

## 12. Future animation and conversation-state hooks

| State | V1 | Later |
|-------|----|--------|
| idle | Yes | — |
| breathing | Yes | — |
| blink | Yes | — |
| reduced-motion | Yes | — |
| listening-ready / listening | Hook only | When voice approved |
| thinking | Hook only | Later |
| speaking-ready / speaking | Hook only | Later — no speech enablement now |

- Prevent false listening/speaking: never enter those visual states unless voice flag is on **and** speech machine matches.
- On unmount: cancel animation frames / blink timers.
- Do not enable speech in the environment-separation package.

---

## 13. Z-layer ownership map

**Locked stacking order inside the Studio Lobby experience:**

| Layer | Name | Owns | Must not own |
|------:|------|------|----------------|
| 0 | Backdrop | Soft cover bleed / presentation framing | Hotspots, Host, conversation |
| 1 | Lobby Environment | Clean room plate (opaque) | Host pixels, interactive hits |
| 2 | Host Layer | Transparent Host + V1 eyes/breathe | Kiosk hits, conversation, voice STT |
| 3 | Interactive Elements | Kiosk hotspot (desktop); other plate hits | Drawing the Host |
| 4 | Conversation Overlay | Guide panel, form, Back | Host raster animation internals |
| 5 | Modal / Dialog | Future confirms / blocking UI | Routine Lobby chrome |

**Confirmed from code today (approximate):** backdrop `z-index: 0`; plate canvas `1`; kiosk stack `10`; mobile dock `20–21`; Guide portal `2147483000`. Future implementation must preserve **Host under interactive kiosk** and **conversation above both**.

---

## 14. Single-responsibility ownership map

| Responsibility | Single owner |
|----------------|--------------|
| Position (feet in native space → rendered placement) | `StudioLobbyHostLayer` + scene/host-layer config |
| Scale (tied to plate render scale) | `StudioLobbyHostLayer` (derived from plate layout helpers) |
| Animation (breathe / blink / reduced-motion) | `StudioLobbyHostLayer` |
| Visual state enum (idle vs future listen/speak) | Host-layer config + optional one-way input from conversation when voice on |
| Loading (no jump / reserved box / onLoad) | `StudioLobbyHostLayer` |
| Asset selection (which PNGs for env / base / eyes) | Config (`welcome-hall-scene` / `studio-lobby-host-layer-v1`) |
| Environment plate src + framing | `WelcomeHallWelcomeScene` + `welcome-hall-scene` |
| Kiosk hit testing | `WelcomeHallWelcomeScene` / `KioskHotspot` |
| Mobile dock CTA / nav | `WelcomeHallWelcomeScene` |
| Conversation open/close / Back | `LobbyGuideOverlay` / `GuideConversationPanel` |
| Voice / mic / STT | `useGuideDictation` + speech modules (flag-gated; off for V1 visual) |

If a concern has two owners, the architecture is wrong — fix ownership before adding features.

---

## 15. Exact files likely affected (future implementation — not now)

- `src/components/entrance/WelcomeHallWelcomeScene.tsx`
- `src/components/entrance/StudioLobbyHostLayer.tsx` (**new** — locked name)
- `src/config/welcome-hall-scene.ts`
- `src/config/studio-lobby-host-layer-v1.ts` (optional new)
- `src/app/welcome-hall-phase1.css`
- `src/app/welcome-hall.css` (only if required for stacking)
- `public/welcome-hall/studio-lobby-environment.png` (+ Host assets)
- Optional thin visual-state prop path: `LobbyGuideOverlay.tsx` / `GuideConversationPanel.tsx` (no voice enable)
- Tests colocated with Host Layer / scene helpers

## 16. Strict file allowlist

```
src/app/page.tsx
src/app/studio-lobby/page.tsx
src/components/entrance/WelcomeHallStaticScene.tsx
src/components/entrance/WelcomeHallWelcomeScene.tsx
src/components/entrance/StudioLobbyHostLayer.tsx
src/config/welcome-hall-scene.ts
src/config/welcome-hall-phase1.ts
src/config/studio-lobby-host-layer-v1.ts
src/app/welcome-hall-phase1.css
src/app/welcome-hall.css
src/components/studio-guide/LobbyGuideOverlay.tsx
src/components/studio-guide/GuideConversationPanel.tsx
public/welcome-hall/studio-lobby-environment.png
public/welcome-hall/studio-lobby-host-base.png
public/welcome-hall/studio-lobby-host-eyes-open.png
public/welcome-hall/studio-lobby-host-eyes-closed.png
docs/studio-lobby-v1-locked.md
docs/studio-lobby-environment-separation-inspection-v1.md
```

**Dirty repo warning (Confirmed from git):** Lobby scene, CSS, config, pages, and many `studio-guide/*` files are already modified or untracked. Tagia should protect/snapshot before any implementation edits.

## 17. Files not to touch (deny)

Route Map, Project Builder, Checkout / Review and Confirm, Intake, Studio Board, payment systems, catalog / services, Tablet packages, unrelated Help Center code, unrelated Squishy surfaces, unrelated assets/docs, Recommendation Engine.

---

## 18. Automated tests

| Test | Type |
|------|------|
| Plate layout + `sceneRectToPercent` fixtures for kiosk rect | Unit |
| Host Layer: voice off ⇒ never listening/speaking visual states | Unit |
| Reduced-motion ⇒ no breathe/blink timers | Unit |
| Desktop: kiosk stack above Host Layer in DOM/CSS order | Component |
| Mobile: kiosk not interactive; dock remains | Component |
| Guide Back → `/` | Component |

## 19. Browser and Samsung device tests

**Permanent rule:** Desktop and Samsung certify together. Neither is complete until both pass.

**Desktop:** native-aspect reference; common; wide; short.  
**Tablet:** portrait + landscape.  
**Mobile sim:** narrow + common Android.  
**Samsung:** real portrait with browser chrome visible; DPR noted; Guide open/Back; dock CTA; Host grounding/crop per Tagia mobile decision; safe-area.

Verify: no black side borders / seams; environment aligned; feet anchor stable; Host does not cover kiosk; kiosk accuracy unchanged; Host does not block mobile dock; Back reachable; conversation above Host; voice still off; reduced-motion; no load jump; desktop unbroken by mobile CSS.

Label every result: code / desktop browser / simulated mobile / **real Samsung**.

---

## 20. Blockers

1. Clean environment art not yet produced.  
2. Feet anchor coordinates await art-on-plate measurement (**Tagia**).  
3. Mobile Host visibility / partial crop policy (**Tagia decision**).  
4. Dirty working tree overlaps allowlist.  
5. Dual-pass desktop + Samsung certification not yet run.  
6. Owner authorization to implement under Lobby lock (environment separation only).

---

## 21. What Scout needs from Chat or Tagia

Do not request Host appearance redesign (identity already locked).

1. Approve runtime **1448 × 1086** + optional master **2896 × 2172**.  
2. Produce clean environment (no Host, no software greeting text).  
3. Produce Host V1 set: **base + eyes open + eyes closed** only.  
4. After art exists: pin **feet anchor** native `(x, y)`.  
5. Decide mobile Host: show / allow partial crop / hide.  
6. Approve runtime formats (PNG vs transparent WebP for Host).  
7. Snapshot/commit strategy for dirty allowlist files.  
8. Explicit go-ahead that environment separation may proceed under Lobby lock.

---

## 22. Definition of done (this inspection)

This refined contract includes:

- Background master + runtime dimensions  
- Desktop contain + Samsung/mobile cover behavior  
- Available Host space (not locked art footprint)  
- Feet anchor + scale rules  
- Component ownership (`StudioLobbyHostLayer`)  
- Z-layer map + single-responsibility map  
- V1 asset list (base + eyes only)  
- Future-state hooks (dormant listen/speak)  
- File names / formats  
- Automated + dual-pass desktop/Samsung tests  
- Strict allowlist / denylist  
- Unresolved owner decisions  

**Stop.** No application code until Tagia approves a separate implementation plan.

## 23. Next step

1. ~~Tagia locks this Environment Separation Inspection.~~ **Done — LOCKED 2026-07-18.**  
2. Chat/Tagia produce environment + Host V1 assets per [`studio-lobby-environment-host-asset-generation-v1.md`](studio-lobby-environment-host-asset-generation-v1.md).  
3. Tagia pins feet anchor from the composed plate.  
4. Scout produces an **implementation plan** (still no code until that plan is approved).  
5. Scout implements on the allowlist only (voice off).  
6. **Desktop and Samsung certify together** before calling the package done.

---

## Lock checklist (four refinements applied)

1. Renamed throughout: **Host Layer** (not Character Layer).  
2. Removed locked Host bounding-box contract; retained **available space** + art-owned footprint.  
3. V1 assets simplified to **Base + Eyes Open + Eyes Closed** (no shadow/mouth layers).  
4. Added **z-layer ownership map** and **single-responsibility ownership map**.  

Also applied: title **Environment Separation**; feet anchor locked; `StudioLobbyHostLayer` name locked; dual-pass Desktop+Samsung rule.

**Tagia lock (2026-07-18):** This document is the approved technical contract for the Studio Lobby Environment Separation package.
