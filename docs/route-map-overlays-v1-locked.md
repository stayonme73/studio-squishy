# Route Map Overlays V1 — LOCKED

**Status:** Founder approved — **all overlay decision surfaces locked** effective 2026-07-05 (Tagia QA at 100% browser zoom)  
**Approved by:** Tagia  
**Route:** `/route-map` (overlay steps: panel → job → checkout → intake)  
**Companion doc:** [route-map-main-screen-v1-locked.md](./route-map-main-screen-v1-locked.md) — landing workspace only (also locked 2026-07-05)

### Locked today (2026-07-05)

| Surface | Lock |
|---------|------|
| Opaque scrim + ivory panels | ✓ |
| Job shelves — I-75, I-20, Update Exit, Launch Job Shelf | ✓ viewport-fit density, no scroll @ 1440×900 / 1366×768 |
| Job detail — Purpose / Includes / Exclusions grid | ✓ 74% zoom, content-sized blocks, auto-height sheet |
| Secure Payment checkout | ✓ 67% workspace zoom, no form-column scroll |
| Intake shell opacity | follows opaque overlay rules — **density not locked** |

No overlay layout, density, opacity, or shelf grid changes without explicit Tagia approval.

## Change policy

No visual redesigns, density tweaks, frosted-glass reintroduction, per-lane scale experiments, scrim weakening, or copy rewrites unless:

- verified technical defect
- verified accessibility issue
- verified navigation failure at **100% browser zoom**

All other changes require explicit Tagia approval.

**Do not:** tie overlay scale to main-map `--rm-layout-scale`, reintroduce frosted double-layers on shelves, show How It Works during overlays, or require browser zoom adjustments for readable shelves, job detail, or Secure Payment.

## Scope (locked)

| Step | Surface | Component |
|------|---------|-----------|
| Lane pick → shelf | Route panel modal | `RouteMapRoutePanel` |
| Job detail | Job sheet | `RouteMapJobCard` (`variant="overlay"`) |
| Payment | Checkout sheet | `SecureCheckoutGrid` in overlay |
| Post-payment | Intake sheet | `RouteMapIntakeForm` |

Main map landing (desk + Choose panel + How It Works) is **not** covered here — see main-screen lock doc.

## Overlay density (locked)

Overlay scale is **independent of the main map workspace** and must work at **100% browser zoom**.

| Token / constant | Value | Applies to |
|------------------|-------|------------|
| `ROUTE_MAP_OVERLAY_DENSITY` | `0.8` | Baseline cap for ≤2-row shelves |
| `ROUTE_MAP_SHELF_DENSITY_STANDARD` | `0.74` | 3-row shelf comfort cap |
| `ROUTE_MAP_SHELF_DENSITY_DENSE` | `0.68` | 4-row shelf comfort cap |
| `ROUTE_MAP_SHELF_DENSITY_MIN` | `0.52` | 5-row shelf floor (Launch Job Shelf on short laptops) |
| `ROUTE_MAP_JOB_DETAIL_DENSITY` | `0.74` | Job detail default |
| `ROUTE_MAP_CHECKOUT_OVERLAY_DENSITY` | `0.67` | Secure Payment only |
| Per-lane shelves | `getRouteMapShelfDensity()` | Viewport-fit scale from job rows + height |
| Job detail | `getRouteMapJobDetailDensity()` | `0.74` default; `0.71` / `0.68` for list-heavy jobs |
| CSS `--rm-shelf-density` on panel | inline per lane | Drives `--rm-d` multiplier on desktop |
| CSS `--rm-checkout-density` on `.route-map-world--overlay` | `0.67` | Secure Payment |
| Shelf panel multiplier | `--rm-d: var(--rm-shelf-density, 1)` | Desktop `@media (min-width: 901px)` |
| Job detail | `zoom: var(--rm-job-detail-density, 0.74)` | `.route-map-job-card--overlay` — inline from `getRouteMapJobDetailDensity()` |

**Code:** `src/lib/route-map-shelf-density.ts` · `.route-map-world--overlay` block in `src/app/route-map/route-map.css`

Clients must not need to change browser zoom to read shelves, job detail, or Secure Payment at 100%.

## Secure Payment (locked)

**Component:** `SecureCheckoutGrid` in Route Map overlay · standalone `/payment` via `SecureCheckoutPageScene`  
**Founder QA:** Full form + **Complete Payment** visible at 1440×900 and 100% browser zoom — **no scrollbar on the form column**.

### Density (locked)

| Rule | Locked behavior |
|------|-----------------|
| Zoom target | `0.67` (`ROUTE_MAP_CHECKOUT_OVERLAY_DENSITY`) — **not** 0.8 |
| Zoom application | `.route-map-overlay-workspace--checkout` only — **not** the whole sheet |
| Standalone `/payment` | Same `0.67` on workspace via `.payment-secure-checkout-page` + `--rm-checkout-density` |

### Sheet + workspace (locked)

| Rule | Locked behavior |
|------|-----------------|
| Sheet height | `height: auto` — grows with content |
| Sheet max height | `max-height: calc(100dvh - 12px)` |
| Sheet overflow | `overflow: visible` — **no** internal sheet scroll for desktop checkout |
| Workspace | `height: auto`, `overflow: visible`, `flex: 0 0 auto` |
| Form column scroll | **Forbidden** — `.pay-paper-card--form .pay-paper-card__body` stays `overflow: visible` |

**Do not:** reintroduce form-column scrollbars, fixed sheet height that clips Complete Payment, or apply 67% zoom to the outer sheet wrapper instead of the workspace.

### Three-column grid (locked @ desktop ≥901px)

| Column | Grid track |
|--------|------------|
| Left (summary) | `minmax(15rem, 0.78fr)` |
| Center (form) | `minmax(26rem, 1.32fr)` — wider center for field readability |
| Right (acknowledgment / next steps) | `minmax(15rem, 0.78fr)` |
| Alignment | `align-items: start` |
| Gap | `clamp(0.85rem, 1.35vw, 1.25rem)` |

### Form spacing (locked)

Tighter vertical rhythm on checkout sheet only: form `gap: 0.5rem`, field `gap: 0.22rem`, compact field inputs (`min-height: 2.45rem`). Typography and eucalyptus headings per existing `.route-map-world__sheet--checkout` rules in `route-map.css`.

### Parity (locked)

Route Map overlay checkout and standalone `/payment` share the same sheet classes and checkout density — visual or scroll behavior must not diverge between routes.

**CSS:** `.route-map-world__sheet--checkout`, `.route-map-overlay-workspace--checkout`, `.payment-secure-checkout-page` block in `src/app/route-map/route-map.css`

## Opaque overlay treatment (locked)

When `.route-map-world--overlay` is active:

| Rule | Locked behavior |
|------|-----------------|
| Scrim | 64% graphite + 10px blur; map dimmed (`blur(2px) brightness(0.9)`) |
| Panel / sheet background | Solid studio ivory → warm paper gradient — **no** frosted glass |
| Job tiles + detail blocks | Opaque ivory cards — **no** second frost layer |
| How It Works | **Hidden** for all overlay steps (not only intake) |
| Text shadow | Frost text-shadow removed on overlay titles |

Main-map Choose panel **remains frosted** — frosted glass is for the landing guide column only.

## Job shelf grid (locked @ desktop)

**Component:** `RouteMapRoutePanel` — grid columns from JS, styles from `route-map.css`.

| Viewport | Columns |
|----------|---------|
| `< 901px` | 1 (stacked / bottom sheet) |
| `901px – 1279px` | 2 |
| `≥ 1280px` | 3 |

### Per-lane shelf density (locked)

Shelves use **viewport-fit density** at 100% browser zoom — not a single fixed scale for every lane.

| Row tier | Lanes | Comfort cap | Behavior |
|----------|-------|-------------|----------|
| 3 rows | I-75 (9 jobs), Update Exit (7 jobs) | `0.74` | Shrink-wrap panel height — no empty footer stretch |
| 4 rows | I-20 (11 jobs) | `0.68` | Scale down to fit without scroll |
| 5 rows | Launch Job Shelf (13 jobs) | fit ≥ `0.52` | Densest tier; scales to viewport down to 52% floor |

**Code:** `getRouteMapShelfDensity()` in `src/lib/route-map-shelf-density.ts` — sets `--rm-shelf-density` inline on each panel from job count, grid columns, and viewport height.

**Scroll:** Overlay shelf body **must not** scroll on standard desktop/laptop heights (1440×900, 1366×768). Panel uses `height: auto` + `overflow-y: hidden` on the scroll region. Wide-desktop grid gaps stay density-scaled (unscaled gaps caused 4–5 row overflow).

## Job detail overlay (locked)

**Component:** `RouteMapJobCard` (`variant="overlay"`) in `.route-map-world__sheet--job`

| Rule | Locked behavior |
|------|-----------------|
| Density | `0.74` default (`ROUTE_MAP_JOB_DETAIL_DENSITY`) — list-heavy jobs may scale to `0.71` / `0.68` via `getRouteMapJobDetailDensity()` |
| Zoom | `zoom: var(--rm-job-detail-density)` on `.route-map-job-card--overlay` |
| Sheet height | `height: auto` — shrink-wrap; **no** full-viewport stretch |
| Detail grid | All rows `auto` — blocks size to content; **no** `1fr` row stretch |
| Block padding | Compact (`clamp(12px, 1.1vw, 16px)`) |
| Scroll | No internal scroll on standard desktop/laptop for Route Start and typical jobs |

**Do not:** reintroduce fixed full-height job sheets or grid rows that stretch empty space inside Purpose/Includes/Exclusions blocks.

## Lane headers (locked copy)

Headers come from `route-map-v1.ts` + `RouteMapRoutePanel` markers:

| Lane | Panel title | Marker |
|------|-------------|--------|
| I-75 | Get My Business Started | I-75 · NORTH/SOUTH |
| I-20 | Promote Something Now | I-20 · EAST/WEST |
| Update | Update What I Already Have | UPDATE EXIT · INTERCHANGE |
| Random Exit | Launch Job Shelf | RANDOM EXIT · SHORTCUT |

Route Start banner (`Help Me Figure Out What I Need`, $650) appears on every shelf above numbered job tiles.

## Engineering references

| Concern | Location |
|---------|----------|
| Overlay density constants + shelf/job detail helpers | `src/lib/route-map-shelf-density.ts` |
| Scene + overlay steps | `src/components/route-map/RouteMapScene.tsx` |
| Job shelf modal | `src/components/route-map/RouteMapRoutePanel.tsx` |
| Job detail sheet | `src/components/route-map/RouteMapJobCard.tsx` |
| Secure Payment grid | `src/components/payment/SecureCheckoutGrid.tsx` |
| Standalone checkout page | `src/components/payment/SecureCheckoutPageScene.tsx` |
| Opaque + density CSS | `src/app/route-map/route-map.css` — `.route-map-world--overlay`, checkout blocks |
| Shelf + job detail + checkout density tests | `src/lib/route-map-shelf-density.test.ts` |

## Out of scope (not frozen by this doc)

- Catalog pricing, shelf SKUs, activation map, intake field definitions
- Payment field validation, Stripe wiring, acknowledgment legal copy, Project Summary embedded checkout (`layout="embedded"`)
- Intake overlay density and internal form layout (shell opacity follows opaque overlay rules)
- Business rules in `route-map-v1.ts`
- Main map landing layout (separate lock doc)
