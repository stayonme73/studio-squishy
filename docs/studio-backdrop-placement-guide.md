# Studio Backdrop Placement Guide

**Status:** Approved implementation standard  
**Pairs with:** [Studio Utility Page Design System](./studio-utility-design-system.md)

---

## Apply Studio backdrop

Full-page parchment background. Content sits in the main container on top. Cards and text must remain readable. Do not alter the backdrop asset.

| Page | Route | Backdrop |
|------|-------|----------|
| Campaign Details | `/campaign-details` | **Yes** |
| Help Center | `/help-center` | **Yes** |
| Payment | `/payment` | **Yes** |
| Review Room | `/review-room` | **Yes** |
| Final Delivery | `/deliverables` | **Yes** |
| Past Campaigns | `/past-campaigns` | **Yes** |
| My Account | `/account` | **Yes** |

---

## Do not apply Studio backdrop

| Page | Route | Reason |
|------|-------|--------|
| Studio Board | `/studio-board` | Dashboard shell — skyline hero + sidebar (locked) |
| Welcome Hall | `/` | Environment room |
| Studio Guide | `/studio-guide` | Environment room |
| Draft Room | `/draft-room` | Environment room |
| Creative Room | `/creative-room` (planned) | Environment room |

---

## Implementation

- Wrapper: `StudioCanvasLayout` (`src/components/studio-canvas/StudioCanvasLayout.tsx`)
- Backdrop asset: `public/studio-utility/studio-utility-backdrop.png` (owner-approved Studio backdrop)
- Styles: `src/app/studio-canvas.css`
- Route check: `utilityPageUsesBackdrop()` in `src/config/studio-utility-standards.ts`

### Single backdrop rule

**One page-level background only:** the approved backdrop image on `.studio-canvas__backdrop`.

Do **not** add:

- Gradient overlays on the backdrop (`::after` tints, radial washes)
- Secondary texture images (e.g. texture exploration swatches)
- `bf-material` noise layers on the page shell
- Competing cream fills on `.utility-page` inside the canvas (must stay transparent)

**Card surfaces** (`.utility-card`) are content containers — not additional page backgrounds.

Utility page content background must be **transparent** inside the canvas so the single backdrop shows through.

---

## Rollout order

1. Utility design system (typography, buttons, cards, navigation)
2. Backdrop on approved routes only
3. Owner screenshot review before lock
