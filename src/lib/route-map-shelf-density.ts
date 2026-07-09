/**
 * Route Map overlay decision surfaces — scale at 100% browser zoom.
 *
 * @locked docs/route-map-overlays-v1-locked.md
 * Do not change without Tagia approval.
 */
export const ROUTE_MAP_OVERLAY_DENSITY = 0.8;

/**
 * Secure Payment — taller three-column form.
 * @locked docs/route-map-overlays-v1-locked.md — 0.67 on workspace only; auto-height sheet; no form scroll.
 */
export const ROUTE_MAP_CHECKOUT_OVERLAY_DENSITY = 0.67;

/** Minimum shelf density — 5-row Launch Job Shelf on short laptop viewports. @locked docs/route-map-overlays-v1-locked.md */
export const ROUTE_MAP_SHELF_DENSITY_MIN = 0.52;

/** Comfort cap for 4-row shelves (I-20). @locked docs/route-map-overlays-v1-locked.md */
export const ROUTE_MAP_SHELF_DENSITY_DENSE = 0.68;

/** Comfort cap for 3-row shelves (I-75, Update Exit). @locked docs/route-map-overlays-v1-locked.md */
export const ROUTE_MAP_SHELF_DENSITY_STANDARD = 0.74;

/**
 * Job detail overlay — same comfort tier as 3-row shelves.
 * @locked docs/route-map-overlays-v1-locked.md
 */
export const ROUTE_MAP_JOB_DETAIL_DENSITY = ROUTE_MAP_SHELF_DENSITY_STANDARD;

/**
 * Scale job detail down when list-heavy jobs would overflow a laptop viewport.
 * @locked docs/route-map-overlays-v1-locked.md
 */
export function getRouteMapJobDetailDensity(
  deliverableCount: number,
  exclusionCount: number,
): number {
  const listItems = deliverableCount + exclusionCount;
  if (listItems >= 10) return ROUTE_MAP_SHELF_DENSITY_DENSE;
  if (listItems >= 6) return 0.71;
  return ROUTE_MAP_JOB_DETAIL_DENSITY;
}
const SHELF_CHROME_BASE_PX = 298;
const SHELF_PANEL_PAD_PX = 46;
const SHELF_ROW_BASE_PX = 192;
const SHELF_GAP_BASE_PX = 18;
const SHELF_PANEL_INSET_PX = 16;
/** Safety margin — rendered tiles run slightly taller than min-height estimates. */
const SHELF_FIT_SAFETY = 0.9;

function shelfComfortCap(rows: number): number {
  if (rows >= 4) return ROUTE_MAP_SHELF_DENSITY_DENSE;
  if (rows >= 3) return ROUTE_MAP_SHELF_DENSITY_STANDARD;
  return ROUTE_MAP_OVERLAY_DENSITY;
}

function shelfHeightAtDensity(rows: number, density: number): number {
  const rowBlock = rows * SHELF_ROW_BASE_PX + Math.max(0, rows - 1) * SHELF_GAP_BASE_PX;
  return (SHELF_CHROME_BASE_PX + SHELF_PANEL_PAD_PX + rowBlock) * density;
}

/**
 * Per-lane shelf scale so every overlay fits the viewport at 100% zoom without scrollbars.
 * @locked docs/route-map-overlays-v1-locked.md
 */
export function getRouteMapShelfDensity(
  jobCount: number,
  gridColumns: number,
  viewportHeight = 900,
): number {
  const columns = Math.max(1, gridColumns);
  const rows = Math.ceil(jobCount / columns);
  const maxPanelHeight = Math.max(520, viewportHeight - SHELF_PANEL_INSET_PX);
  const comfortCap = shelfComfortCap(rows);

  for (let density = ROUTE_MAP_OVERLAY_DENSITY; density >= ROUTE_MAP_SHELF_DENSITY_MIN; density -= 0.005) {
    const rounded = Math.round(density * 1000) / 1000;
    if (shelfHeightAtDensity(rows, rounded) <= maxPanelHeight * SHELF_FIT_SAFETY) {
      return Math.min(comfortCap, rounded);
    }
  }

  return ROUTE_MAP_SHELF_DENSITY_MIN;
}
