# Studio Squishy — Weather Portal

**Status:** Approved — Tall Vertical Portal type locked (June 2026)  
**Implementation:** Not started — documentation only  
**Character / Step 3:** Unaffected — portal is environment architecture, not Squishy

---

## Approved portal type: Tall Vertical Portal

**Founder approval:** Tall Vertical Portal — June 2026

The portal is **not about maximizing the view**. It is about **storytelling and emotional connection**. It should feel **magical, architectural, and memorable** while preserving Squishy's connection to weather, seasons, and the world outside.

The Weather Portal exists to create **moments of pause, wonder, and perspective** within the Studio environment.

### Design implications (Tall Vertical)

| Principle | Direction |
| --------- | --------- |
| **Proportion** | Narrow width, generous height — a designed aperture, not a picture window |
| **Outdoor framing** | Vertical composition: sky, treetops, light, weather — not wide panoramic vistas |
| **Emotional register** | Magical and architectural; invites pause, not surveillance |
| **Squishy continuity** | Same storytelling DNA as the study-room round window — weather, seasons, living world |
| **Avoid** | Wide glazing, maximum view, corporate floor-to-ceiling office windows |

---

## Purpose

The Weather Portal is a **signature architectural feature** — the Studio's emotional connection to the outside world. It reinforces that life continues beyond work and brings time, seasons, and nature into the creative process.

**Desired emotional response:**

> *"Something beautiful is happening outside."*

The Studio remains a place where people build meaningful things while staying connected to the living world beyond work.

---

## What it is (and is not)

| It is | It is not |
| ----- | --------- |
| An intentional architectural element | A traditional office window |
| Integrated into the Studio from the start | Something added afterward |
| A defined frame and opening with its own identity | Generic exterior imagery behind standard windows |
| Modern, warm, and distinctive | A television screen or digital gimmick |

**Reference pattern:** Similar to Squishy's study-room storytelling window — a **dedicated cutout/layering approach** (interior art masks the opening; outdoor scene and effects render behind the frame).

---

## Design requirements

### Architecture

- Designed as an **intentional architectural element**, not an afterthought
- **Own defined frame and opening** — reads as a designed feature, not incidental glazing
- **Brushed steel framing** preferred (warm metallic, not cold chrome)
- Optional **walnut ledge or integrated shelf** beneath the opening if it supports the overall design language
- Modern, warm, distinctive — memorable at first glance

### Constraints

- Must **not** resemble a television screen
- Must **not** feel like a gimmick
- Must **not** be exterior imagery placed behind generic office windows
- Must **not** compete with the strategy room glass enclosure (interior partition vs exterior portal)

---

## Studio layout placement

### Approved location: left wall, upper-left (Tall Vertical)

The Tall Vertical Weather Portal belongs on the **left architectural plane** — the wall shared by the whiteboard zone (upper) and executive desk zone (lower). This placement:

| Reason | Explanation |
| ------ | ----------- |
| **Lighting continuity** | Matches approved ambient golden wash from the left ([artist-brief-pack.md](./artist-brief-pack.md) §9) |
| **Executive desk sightline** | Visible from Squishy's future workspace — connection to the world while working |
| **Distinct from strategy room** | Strategy room glass (upper-right) is an interior collaboration enclosure; the portal is the **exterior** connection |
| **Memorable composition** | Left portal + right glass room creates balanced asymmetry across the plate |
| **Zone map compatibility** | Lives within the existing `whiteboardWall` zone without requiring zone coordinate changes |

### Layout diagram (full plate)

```
┌─────────────────────────────────────────┐
│  Exposed ceiling · teal pipes           │
├──────────┬─────────────┬────────────────┤
│ WEATHER  │ Whiteboard  │ Strategy Room  │
│ PORTAL   │ wall        │ (glass)        │
│ (tall    │             │                │
│ vertical │             │                │
│ opening) │             │                │
├──────────┤             │                │
│ (portal  │             │                │
│  lower   │             │                │
│  edge)   │             │                │
├──────────┼─────────────┼────────────────┤
│ Executive│             │ Builder        │
│ Desk     │             │ Workspace      │
│ (views   │             │                │
│  portal) │             │ Storage        │
├──────────┴─────────────┴────────────────┤
│  Polished concrete floor                │
└─────────────────────────────────────────┘
```

### Normalized bounds (approved — Tall Vertical, illustration reference)

These coordinates are **illustration-planning references**. Engineering zone map (`src/config/studio-zones.ts`) is unchanged until a future integration phase.

| Element | x | y | width | height | Notes |
| ------- | --- | --- | ----- | ------ | ----- |
| **Weather Portal opening** | 0.04 | 0.14 | 0.14 | 0.40 | Tall vertical aperture (~1:2.9 aspect); outdoor scene visible here |
| **Portal frame (outer)** | 0.02 | 0.12 | 0.18 | 0.44 | Brushed steel frame + optional walnut ledge |
| **Parent zone** | — | — | — | — | `whiteboardWall` (0, 0.10, 0.46, 0.46) + lower sightline into `executiveDesk` |

**Whiteboard adjustment (Phase 1):** Whiteboard shifts **right** within the whiteboardWall zone to accommodate the portal on the left. Whiteboard remains in-zone; portal occupies the left ~30% of that wall plane.

### Style frame scope (Phase 0.2)

The current half-room style frame (**executive desk + strategy room only**) **does not include** the Weather Portal. Portal design is documented here for Phase 1 full-room production. Style frame concepts may show incidental left-wall light; they are not portal approval artifacts.

---

## Layer architecture (future integration)

The Weather Portal uses a **cutout/layering model** — not a flat-painted window in the environment composite.

```
┌─────────────────────────────────────┐
│  Studio interior layer              │  ← Full room art; portal opening is transparent/cut out
├─────────────────────────────────────┤
│  Weather Portal frame layer         │  ← Brushed steel frame, walnut ledge (may be part of interior art)
├─────────────────────────────────────┤
│  Weather effects layer              │  ← Rain, lightning, particles, fireflies, seasonal overlays
├─────────────────────────────────────┤
│  Outdoor environment layer          │  ← Sky, trees, time-of-day base scene
└─────────────────────────────────────┘
```

**Path B note:** The main Studio environment may ship as a flat WebP composite, but the **Weather Portal opening is an exception** — it requires a live layered stack (same pattern as Squishy `StudyRoom` + `StudyWindowPortal` in StayOnMeVoice). Frame geometry is baked into interior art; outdoor content and effects are runtime layers aligned to the cutout bounds.

---

## Environmental behaviors (future phases — not implemented)

Support in future engineering/animation phases:

| Behavior | Notes |
| -------- | ----- |
| Daylight changes | Soft shifts through the day |
| Rain | Streaks, droplets on glass, mood shift |
| Storms and lightning | Dramatic but not horror; brief flashes |
| Sunsets | Warm color transition through opening |
| Nighttime ambiance | Stars, moonlight, interior/exterior balance |
| Seasonal shifts | Foliage, snow, spring green — subtle |
| Trees and nature movement | Gentle wind, leaves |
| Fireflies / subtle moments | Rare, appropriate, never cartoonish |

All behaviors must reinforce *"something beautiful is happening outside"* — never distract from the Studio as a workspace.

---

## Materials (portal-specific)

| Element | Material | Notes |
| ------- | -------- | ----- |
| Frame | Brushed steel | Warm metallic; soft directional highlights |
| Ledge / shelf | Walnut (optional) | Matches desk/table language; small plant or object OK |
| Glazing | Clear glass with depth | Edge highlights; not flat grey rectangle |
| Reveal | Cream wall return | Portal set into wall thickness — feels built-in |

Add **brushed steel** (`#A8A9AD` highlight, `#7A7B7F` base) as a portal-specific material token in Phase 1 art; not yet in engineering palette.

---

## Illustration checklist (Phase 1 — when full room begins)

- [ ] **Tall Vertical** proportion reads as designed aperture — narrow, not wide
- [ ] Outdoor scene framed vertically (sky, weather, nature) — not panoramic
- [ ] Portal evokes pause and wonder — magical, not utilitarian
- [ ] Portal reads as intentional architecture on first glance
- [ ] Brushed steel frame distinct from matte black steel elsewhere
- [ ] Opening cutout aligns to proposed normalized bounds
- [ ] Whiteboard repositioned right within zone — no overlap conflict
- [ ] Golden ambient wash from portal direction consistent with lighting spec
- [ ] Does not resemble TV, monitor, or picture frame gimmick
- [ ] Strategy room glass remains clearly interior partition
- [ ] Layered source includes portal frame + mask for outdoor stack

---

## Approval

| Decision | Status | Date |
| -------- | ------ | ---- |
| Weather Portal addition | **Approved** | June 2026 |
| Portal type: **Tall Vertical Portal** | **Approved** | June 2026 |
| Placement: left wall, upper-left | **Approved** | June 2026 |

**Founder rationale (portal type):** Not about maximizing the view — about storytelling and emotional connection. Magical, architectural, memorable. Preserves Squishy's connection to weather, seasons, and the world outside. Creates moments of pause, wonder, and perspective.

**Implementation gate:** Phase 2 engineering integration (after Phase 1 interior art approved)

**Related documents:**

- [artist-brief-pack.md](./artist-brief-pack.md) — Visual Design Brief §5, §7, §8, §9
- [asset-specifications.md](./asset-specifications.md) — Layer stack and integration exceptions
- [style-frame-scope.md](./style-frame-scope.md) — Portal deferred from half-room gate
