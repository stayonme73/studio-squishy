# Route Map Main Screen — LOCKED

**Status:** Founder approved — main workspace layout locked effective 2026-07-05  
**Approved by:** Tagia  
**Route:** `/route-map`  
**Scope:** Landing workspace only — desk hero, Choose Your Route panel, How It Works strip. Overlays locked same day — see `docs/route-map-overlays-v1-locked.md` (shelves, job detail, Secure Payment).

No layout, art, or copy changes on this screen without explicit Tagia approval.

## Change policy

No visual redesigns, panel repositioning, map-frame rescaling, highway-marker nudges, How It Works band realignment, frosted-panel restyling, or copy rewrites unless:

- verified technical defect
- verified accessibility issue
- verified navigation failure at **100% browser zoom**

All other changes require explicit Tagia approval.

**Do not:** pull the Choose panel left onto the map art, reintroduce panel scrollbars to clip route taglines, CSS-patch or programmatically redraw baked callout arrows in the desk scene PNG, or shrink the hero to make room for the panel column.

## Screen composition (locked)

```
┌─────────────────────────────────────────────────────────────┐
│  [ Desk hero — full wood frame + framed map art ]  │ Panel │
│                                                     │Choose │
│  I-75 / I-20 / I-285 shields on map                 │Your   │
│  Baked sign callouts in art (display only)          │Route  │
├─────────────────────────────────────────────────────────────┤
│              How It Works — 5 steps (full band width)       │
└─────────────────────────────────────────────────────────────┘
```

| Region | Component | Role |
|--------|-----------|------|
| Left | `RouteMapHighwayMap` (`variant="desk-scene"`, `interactive={false}`) | Full desk hero; map art + interstate shields only |
| Right | `RouteMapChoosePanel` | Primary route selection — four selectable lanes |
| Bottom | `RouteMapHowItWorks` | Orientation strip — same width as hero + gap + panel |

Route selection on this screen is **panel-first**. Map hotspots exist in config for calibration and other variants; they are **not** click targets on the main screen.

## Hero art (locked)

| Asset | Path |
|-------|------|
| Desk scene (primary) | `public/route-map/studio-route-map-desk-scene.png` |
| Aspect | `1536 / 1024` (`ROUTE_MAP_DESK_SCENE_ASPECT`) |
| Cloverleaf (legacy / capture compat) | `public/route-map/studio-route-map-cloverleaf.png` |

Baked blue / green / gold callout arrow stubs remain as exported in art. The purple ramp cue is the reference quality bar; fixing other stubs requires a **source art export**, not CSS overlays or PNG patches.

## Map frame inset (locked)

Percent of desk scene (`ROUTE_MAP_DESK_MAP_FRAME` in `src/config/route-map-map-layout.ts`):

| Edge | Value |
|------|-------|
| left | 16.5% |
| top | 8.5% |
| width | 67% |
| height | 60% |

CSS mirrors these as `--rm-map-frame-*-pct` on `.route-map-workspace`.

## Highway markers (locked — desk scene)

Interstate shields via `RouteMapInterstateShield` — positions are **% within map frame**, not click targets.

| Shield | left | top |
|--------|------|-----|
| I-75 | 47% | 28% |
| I-20 | 4% | 46% |
| I-285 | 64% | 54% |

## Desktop layout tokens (locked @ ≥1101px)

**Code:** `src/app/route-map/route-map.css` — `.route-map-workspace` and `@media (min-width: 1101px)` block.

| Rule | Locked value / behavior |
|------|-------------------------|
| Panel overlap | `--rm-panel-map-overlap: 0px` |
| Panel pull-left | `--rm-choose-panel-pull-left: 0px`; `margin-left: 0` on wrap — panel sits **after** full hero width |
| Panel width | `min(372px, 27vw, …)` |
| Panel height | `height: auto`; `min-height: var(--rm-choose-panel-h)`; `max-height: none`; `overflow: visible` |
| Route cards | `flex: 0 0 auto`; taglines **not** line-clamped in wrap context |
| Nav | `overflow: visible` — no scrollbar on panel body |
| How It Works band | `--rm-workspace-band-w: var(--rm-main-flex-w)`; how-wrap width matches main row (hero left → panel right) |
| Workspace gap | Tight vertical gap between main row and How It Works (`clamp(0px, 0.2vh, 2px)`) |
| Layout scale | `--rm-layout-scale: 0.82` at desktop breakpoint |
| Hero sizing | Viewport-driven; panel column must not shrink hero past fit |

**Browser zoom:** Must read correctly at 100% on desktop (1440×900), laptop (1366×768), and mobile (390×844 portrait).

## Choose Your Route panel (locked copy)

**Header**

- Title: **Choose Your Route**
- Lead: *Pick a lane, select a job, pay, then share intake details.*
- Orientation line (`Choose a route on the map or use the guide on the right.`) — **hidden on desktop wrap**; visible in other contexts as designed.

**Route cards** — from `getSelectableRouteMapRoads()` in `src/config/route-map-v1.ts`:

| Lane | Customer label | Tagline |
|------|----------------|---------|
| I-75 | Get My Business Started | Forward route — sequential stops to build your foundation. |
| I-20 | Promote Something Now | Direct urgent route — get something live fast. |
| Update Exit | Update What I Already Have | Exit off the loop — refresh one profile or promotion that's already live. |
| Random Exit | I Know What I Need | Opens the job shelf directly — Route Start only if you are unsure. |

I-285 (Perimeter Loop) is visual-only on the map — not a choose-panel card.

**Styling:** Cream frosted header/body, dark charcoal text, bold route titles — see `.route-map-choose-panel-wrap` rules in `route-map.css`.

## How It Works (locked)

**Component:** `src/components/route-map/RouteMapHowItWorks.tsx`

| # | Title | Lead |
|---|-------|------|
| 1 | Pick Your Route | Start with what you need right now. |
| 2 | Choose a Job | See what is included and choose your service. |
| 3 | Pay & Confirm | Review your order and pay securely. |
| 4 | Share the Details | Send the information and materials we need. |
| 5 | We Get To Work | We create it, you review it, then we deliver it or post it when included. |

## Engineering references

| Concern | Location |
|---------|----------|
| Workspace composition | `src/components/route-map/RouteMapWorkspace.tsx` |
| Map hero + shields | `src/components/route-map/RouteMapHighwayMap.tsx` |
| Layout + frost + panel | `src/app/route-map/route-map.css` |
| Map frame, hotspots, marker coords | `src/config/route-map-map-layout.ts` |
| Road labels + business lanes | `src/config/route-map-v1.ts` |
| Page shell | `src/app/route-map/page.tsx` |

Hotspot rectangles (`ROUTE_MAP_DESK_CONTROLS`) remain aligned to baked sign callouts for QA overlays and non–main-screen interactive variants — do not drift them without recalibrating against art.

## Out of scope (not frozen by this doc)

- Overlay decision surfaces — job shelf, job detail, checkout, intake (`docs/route-map-overlays-v1-locked.md`)
- Catalog pricing, shelf SKUs, activation map, intake routing (`route-map-v1.ts` business rules)
- Cloverleaf mobile fallback layout (separate breakpoint rules)
- Legacy journey redirects to `/route-map`
