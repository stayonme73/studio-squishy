/**
 * Squishy Help Prompt — free reassurance entry for customers who are unsure where to start.
 * Not a service, SKU, route, lane, plan item, or checkout line. Reassurance and navigation only.
 *
 * Home: Route Map main screen, above the route cards (see docs/route-map-main-screen-v1-locked.md).
 * Kept intentionally small — one prompt line, one button — so it reads as reassurance, not a feature.
 */

export const SQUISHY_HELP_PROMPT = {
  prompt: "Not sure where to start?",
  cta: "Let Squishy help you choose the right project.",
  squishyMessage:
    "Not sure where to start? Tell me what you're trying to get done — I'll help you choose the right project from the verified services on your route.",
  /**
   * Phase 2 (not yet wired): shorter nudge for a hesitation-triggered prompt.
   * When the Help Prompt becomes context-aware, a brief pause before route selection
   * can surface this line instead of the always-visible prompt above — without any
   * Route Map layout change. Recorded here so the direction isn't lost.
   */
  hesitationPrompt: "Need help deciding?",
} as const;

/** @deprecated Use SQUISHY_HELP_PROMPT — retained for existing Route Map imports. */
export const ROUTE_MAP_GUIDANCE = SQUISHY_HELP_PROMPT;

/** SKU IDs retired from active commerce — preserved for historical campaign reads only. */
export const ROUTE_MAP_RETIRED_COMMERCE_SKU_IDS = ["rm-j001", "v2-addon-post-publish"] as const;

export type RouteMapRetiredCommerceSkuId = (typeof ROUTE_MAP_RETIRED_COMMERCE_SKU_IDS)[number];

export function isRouteMapRetiredCommerceSku(value: string): value is RouteMapRetiredCommerceSkuId {
  return (ROUTE_MAP_RETIRED_COMMERCE_SKU_IDS as readonly string[]).includes(value);
}
