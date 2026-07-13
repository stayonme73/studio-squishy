# Route Map Main Screen — LOCKED

| Field | Value |
|---|---|
| Room | Route Map |
| Status | **LOCKED** |
| Owner | Tagia |
| Date | 2026-07-09 |
| Builder Bob inspection | PASS |
| Accessibility | PASS |
| Engineering | PASS |
| Owner Walkthrough | PASS |

**Route:** `/route-map`
**Scope:** Landing workspace only — hero art, Choose Your Route panel, How It Works strip. Overlays locked separately — see `docs/route-map-overlays-v1-locked.md` (shelves, job detail, Secure Payment).

**Supersedes prior lock (2026-07-05):** hero art, map frame, highway markers, and panel eyebrow labels changed under explicit Tagia approval on 2026-07-09 (see "What changed since the 2026-07-05 lock" below). This document has been updated to describe the current, actually-approved state — do not treat the 2026-07-05 values in git history as still current.

No layout, art, or copy changes on this screen without explicit Tagia approval.

## Change policy

No visual redesigns, panel repositioning, map-frame rescaling, highway-marker reintroduction, How It Works band realignment, frosted-panel restyling, or copy rewrites unless:

- verified technical defect
- verified accessibility issue
- verified navigation failure at **100% browser zoom**

All other changes require explicit Tagia approval.

**Do not:** pull the Choose panel left onto the map art, reintroduce panel scrollbars to clip route taglines, re-enable the disabled decorative highway-marker shields, or shrink the hero to make room for the panel column.

## Screen composition (locked)

```
┌─────────────────────────────────────────────────────────────┐
│  [ Full-bleed aerial interchange hero — Studio Route ]  │Panel│
│    badges (75/20/285) baked into the artwork             │Choose│
│                                                            │Your │
│                                                            │Route│
├─────────────────────────────────────────────────────────────┤
│              How It Works — 5 steps (full band width)       │
└─────────────────────────────────────────────────────────────┘
```

| Region | Component | Role |
|--------|-----------|------|
| Left | `RouteMapHighwayMap` (`variant="desk-scene"`, `interactive={false}`) | Full-bleed hero art only — display-only, not a click surface |
| Right | `RouteMapChoosePanel` | Primary route selection — four selectable lanes |
| Bottom | `RouteMapHowItWorks` | Orientation strip — same width as hero + gap + panel |

Route selection on this screen is **panel-first**. Map hotspots exist in config for calibration and other variants; they are **not** click targets on the main screen.

## Hero art (locked — v2, approved 2026-07-09)

| Asset | Path |
|-------|------|
| Hero (primary, live) | `public/route-map/studio-route-map-hero-v2.png` |
| Aspect | `1586 / 992` (`ROUTE_MAP_DESK_SCENE_ASPECT`) |
| Cloverleaf (legacy / capture compat, unused) | `public/route-map/studio-route-map-cloverleaf.png` |
| Old desk-scene asset (superseded, retained on disk) | `public/route-map/studio-route-map-desk-scene.png` — no longer referenced by any live code; not deleted |

Studio Route badges ("STUDIO ROUTE 75" / "20" / "285") are baked into the v2 artwork directly, next to each colored CTA banner. `alt` text: *"Studio Route Map showing a city skyline, highway interchange, and four Studio route options: Get My Business Started, Promote Something Now, Update What I Already Have, and I Know What I Need."*

`object-fit: contain` at desktop widths (never crops or stretches — letterboxes instead); `object-fit: cover` at mobile/tablet widths (crops to fill, never stretches).

## Map frame inset (locked — v2)

Percent of hero scene (`ROUTE_MAP_DESK_MAP_FRAME` in `src/config/route-map-map-layout.ts`):

| Edge | Value |
|------|-------|
| left | 0% |
| top | 0% |
| width | 100% |
| height | 100% |

Hero v2 is full-bleed (no desk/frame border), so the map frame covers the entire scene. `ROUTE_MAP_DESK_CONTROLS` (invisible click hotspots) were recalibrated to the v2 art's actual CTA banner positions — currently inert on this screen since `interactive={false}` here, but kept correctly calibrated for any variant that does set `interactive`.

## Highway markers — DISABLED (locked, 2026-07-09)

`ROUTE_MAP_DESK_HIGHWAY_MARKERS` is intentionally an **empty array**. The old red/white/blue decorative "INTERSTATE 75/20/285" shield overlays were removed because hero v2 bakes equivalent "STUDIO ROUTE" signage directly into the artwork — rendering both was duplicate, conflicting visual noise. The array is emptied, not deleted, and can be restored if a future hero variant needs it. Do not re-enable without explicit Tagia approval.

## Desktop layout tokens (locked @ ≥1101px)

**Code:** `src/app/route-map/route-map.css` — `.route-map-workspace` and `@media (min-width: 1101px)` block. Unchanged by the 2026-07-09 update — still accurate:

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

## Choose Your Route panel (locked copy — updated 2026-07-09)

**Header**

- Title: **Choose Your Route**
- Lead: *Pick a lane, select a job, pay, then share intake details.*
- Orientation line (`Choose a route on the map or use the guide on the right.`) — **hidden on desktop wrap**; visible in other contexts as designed.

**Route cards** — from `getSelectableRouteMapRoads()` in `src/config/route-map-v1.ts`:

| Order | Customer label | Tagline | Badge |
|---|----------------|---------|-------|
| 1 | Get My Business Started | Forward route — sequential stops to build your foundation. | STUDIO / 75 — green |
| 2 | Promote Something Now | Direct urgent route — get something live fast. | STUDIO / 20 — blue |
| 3 | Update What I Already Have | Exit off the loop — refresh one profile or promotion that's already live. | STUDIO / 285 — gold |
| 4 | I Know What I Need | Opens the job shelf directly — Route Start only if you are unsure. | STUDIO / Direct — purple |

**Removed 2026-07-09 (Tagia approval):** the small eyebrow labels above each title ("I-75," "I-20," "Update Exit," "Random Exit") were removed from the visible card body. This text still exists as underlying data (`road.highwayLabel` in `route-map-v1.ts`, `.route-map-choose-card__highway` CSS class) but is no longer rendered — not deleted, just no longer output in `RouteMapChoosePanel.tsx`'s JSX. Do not re-add without explicit approval.

Badge colors correct as of 2026-07-09: `--rm-i75` and `--rm-i20` in `route-map.css` were swapped so I-75 renders green and I-20 renders blue, matching the hero art's own banner colors (they were previously reversed).

Each card has an explicit `aria-label` (added 2026-07-09, in `RouteMapChoosePanel.tsx`'s `ROUTE_CARD_ARIA_LABEL`) so screen readers get a clean name instead of the raw concatenated visible text:
- I-75 — "I-75 — Get My Business Started"
- I-20 — "I-20 — Promote Something Now"
- Update — "Studio Route 285 — Update What I Already Have"
- Random Exit — "Direct Route — I Know What I Need"

I-285 (Perimeter Loop) is visual-only on the map — not a choose-panel card.

**Styling:** Cream frosted header/body, dark charcoal text, bold route titles — see `.route-map-choose-panel-wrap` rules in `route-map.css`.

## How It Works (locked)

**Component:** `src/components/route-map/RouteMapHowItWorks.tsx` — Step 5 lead amended 2026-07-12 (Post/Publish retired; truth-safe delivery wording).

| # | Title | Lead |
|---|-------|------|
| 1 | Pick Your Route | Start with what you need right now. |
| 2 | Choose a Job | See what is included and choose your service. |
| 3 | Pay & Confirm | Review your order and pay securely. |
| 4 | Share the Details | Send the information and materials we need. |
| 5 | We Get To Work | We create it, you review it, then we complete and deliver your finished project. |

## Engineering references

| Concern | Location |
|---------|----------|
| Workspace composition | `src/components/route-map/RouteMapWorkspace.tsx` |
| Hero art + (disabled) markers | `src/components/route-map/RouteMapHighwayMap.tsx` |
| Route cards + aria-labels + badge icons | `src/components/route-map/RouteMapChoosePanel.tsx` |
| Squishy Help Prompt | `src/components/route-map/SquishyHelpPrompt.tsx` |
| Badge visual component | `src/components/route-map/RouteMapInterstateShield.tsx` |
| Layout + frost + panel + badge colors | `src/app/route-map/route-map.css` |
| Hero asset, map frame, hotspot + marker coords | `src/config/route-map-map-layout.ts` |
| Road labels + business lanes | `src/config/route-map-v1.ts` |
| Page shell | `src/app/route-map/page.tsx` |

Hotspot rectangles (`ROUTE_MAP_DESK_CONTROLS`) are recalibrated to hero v2's baked CTA banner positions for QA overlays and non–main-screen interactive variants — do not drift them without recalibrating against the current art.

## Documented non-blocking notes (2026-07-09)

- **No page-level `<h1>` on `/route-map`** — only H2s exist ("Choose Your Route," "How It Works"). Pre-existing, not introduced by the 2026-07-09 changes. Not fixed — documented only, per Tagia's instruction.
- **Dev-only "Studio Review" QA badge** visually overlaps panel text at 360–390px widths. Confirmed gated behind `NODE_ENV === "development"` (renders `null` in production) — never visible to real customers.

## Squishy Help Prompt (added 2026-07-12 — Tagia approval)

**What / why:** Browser certification proved customers never reach the old Route Panel guidance overlay, because road selection routes straight to Project Builder. Guidance was relocated to the moment customers actually hesitate: the Route Map main screen, **before** any route is selected. This is the permanent home for *"I'm not sure where to start."*

**It is a Help Prompt — not a panel, not a route, not a service.** One prompt line, one button, nothing more. Reassurance and navigation only; it never touches pricing, selected services, or checkout state.

**Placement:** Inside `RouteMapChoosePanel`, **above the four route cards**, below the panel header. Renders on both desktop (`RouteMapWorkspace`) and mobile (`RouteMapMobileMap`) main-screen selectors.

**Locked copy** (`src/config/route-map-guidance-v1.ts` → `SQUISHY_HELP_PROMPT`):

- Prompt: *Not sure where to start?*
- Button: *Let Squishy help you choose the right project.*
- On open, Squishy's reassurance message appears inline (accessible `role="status"`), offering to help choose from the **verified services** on the customer's route.

**Visual rules (do not drift):**

- Not styled as a `.route-map-choose-card`; must never read as a fifth route or a purchasable item.
- No price, no route/STUDIO badge, no card chrome competing with the route cards.
- Quiet prompt line + underlined text button. Confident customers ignore it and click their route.

**Component:** `src/components/route-map/SquishyHelpPrompt.tsx` · **Styles:** `.route-map-help-prompt*` in `src/app/route-map/route-map.css`

**Modularity (intentional):** The component takes `visible` (default `true`) and `onOpen` props. This package ships it **always visible**. Phase 2 may make it **context-aware** — e.g. surfacing only after a brief pause/hesitation before route selection, using the reserved `SQUISHY_HELP_PROMPT.hesitationPrompt` (*"Need help deciding?"*) — by gating `visible` from the parent, with **no Route Map layout redesign**. Do not architect against this evolution.

**Dead path:** Squishy Help Prompt was removed from the unreachable `RouteMapRoutePanel` overlay (2026-07-12). Guidance lives only on the main-screen Choose panel. Do not re-add Help Prompt to the overlay or make the Route Panel reachable again.

## Out of scope (not frozen by this doc)

- Overlay decision surfaces — job shelf, job detail, checkout, intake (`docs/route-map-overlays-v1-locked.md`)
- Catalog pricing, shelf SKUs, activation map, intake routing (`route-map-v1.ts` business rules)
- Cloverleaf mobile fallback layout (separate breakpoint rules, unused/legacy)
- Legacy journey redirects to `/route-map`
- The old `studio-route-map-desk-scene.png` asset's continued presence on disk (retained, not a click surface, not referenced by live code)
