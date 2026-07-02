# Route Map — superseded visual iterations

**Archived:** 2026-07-01

Deprecated Route Map **visual-only** components — not deleted, removed from the active `/route-map` journey. Backend plumbing (`route-map-v1`, campaign lib, intake, launch) stays active.

## Visual iteration history

| Phase | Approach | Status |
|-------|----------|--------|
| 1 | Procedural SVG highway diagram (`route-map-highway__*` controls, lane grid) | Superseded — CSS already removed from `route-map.css` |
| 2 | Dark dashboard + scattered job pins on highways (`.route-map-map-pin`) | Superseded — pins removed from map-first UX |
| 3 | Full-page road view with procedural track geometry (`RouteMapRoadView`) | Superseded by bottom-sheet `RouteMapRoutePanel` |
| 4 | Lane selector wrapper (`RouteMapLaneSelector`) | Superseded by art-first `RouteMapWorkspace` |
| **Current** | Art-first Studio workspace (`RouteMapWorkspace`, `RouteMapChoosePanel`, board hotspots via `RouteMapHighwayMap`) | **Active** at `/route-map` |

## Archived modules

| File | Why |
|------|-----|
| `RouteMapLaneSelector.tsx` | Deprecated lane-grid + shortcut tiles; scene now uses `RouteMapWorkspace` directly |
| `RouteMapRoadView.tsx` | Full-page road/track job list; replaced by overlay `RouteMapRoutePanel` |

Import via `@/archive/route-map-visual/...` if reviving for reference. Active code must not import these.

## Reference images

| Asset | Description |
|-------|-------------|
| `assets/studio-discovery-board-reference.png` | Discovery-style Studio board mockup — art-first workspace direction (neon sign, drafting board, 3×3 cards) |
| `assets/studio-route-map-reference.png` | Route Map board reference art (from `public/route-map/`) |

## Screenshot captures (current UX)

Map-first V1 screenshots live in `tmp/route-map-v1-screenshots/`:

- `01-desktop-full-map.png` — full-screen art workspace (no job pins)
- `02-desktop-route-panel-i75.png` — route panel over map (I-75)
- `03-desktop-job-card-over-map.png` — job detail card overlay
- `04-mobile-map-entrance.png` — mobile vertical route list
- `05-mobile-route-panel.png` — mobile route panel

Capture: `node scripts/capture-route-map-v1.mjs` (requires dev server at `localhost:3000`).

## What remains active

- **Scene / layout:** `RouteMapScene`, `RouteMapWorkspace`, `RouteMapChoosePanel`, `RouteMapHighwayMap`, `RouteMapMobileMap`, `RouteMapRoutePanel`, `RouteMapJobCard`, `RouteMapHowItWorks`, `RouteMapInterstateShield`, `RouteMapIntakeForm`
- **Config / lib:** `route-map-v1.ts`, `route-map-intake-v1.ts`, `route-map-campaign.ts`, `route-map-launch.ts`, `route-map-icons.ts`, `route-map-map-layout.ts`
- **Route:** `src/app/route-map/page.tsx`, `src/app/route-map/route-map.css`
- **Tests:** `src/lib/route-map-campaign.test.ts`
