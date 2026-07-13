/**
 * Route Map — hero art paths, map-frame insets, and hotspot positions.
 * Desk scene (primary — desktop + mobile). Cloverleaf retained for legacy capture compat.
 * Invisible hotspots overlay baked sign callouts in map art — no HTML labels on map.
 *
 * @locked docs/route-map-main-screen-v1-locked.md — map frame insets, desk highway marker
 * positions, and desk scene asset path. Do not change without Tagia approval.
 */

import type { RouteMapRoadId } from "@/config/route-map-v1";

export type RouteMapRoadControl = {
  roadId: RouteMapRoadId;
  label: string;
  sublabel: string;
  /** Position within map frame (percent) */
  left: number;
  top: number;
  width: number;
  height: number;
  className: string;
};

export type RouteMapHeroVariant = "desk-scene" | "cloverleaf";

export const ROUTE_MAP_ASSETS = {
  deskScene: "/route-map/studio-route-map-hero-v2.png",
  cloverleaf: "/route-map/studio-route-map-cloverleaf.png",
} as const;

/** Hero v2 — full-bleed aerial interchange, approved 2026-07-09 (Tagia). */
export const ROUTE_MAP_DESK_SCENE_ASPECT = "1586 / 992";

/** Map frame inset within scene (% of scene) — hero v2 is full-bleed, no inset. */
export const ROUTE_MAP_DESK_MAP_FRAME = {
  left: 0,
  top: 0,
  width: 100,
  height: 100,
} as const;

/** Cloverleaf map — mobile fallback (Tagia 2nd choice). */
export const ROUTE_MAP_CLOVERLEAF_ASPECT = "16 / 10";

/**
 * Hotspots aligned to map frame inside desk-scene hero.
 * Recalibrated 2026-07-09 for hero v2 (full-bleed aerial interchange) —
 * each rect bounds the corresponding colored CTA banner baked into the art.
 */
export const ROUTE_MAP_DESK_CONTROLS: readonly RouteMapRoadControl[] = [
  {
    roadId: "i75",
    label: "I-75",
    sublabel: "Get My Business Started",
    left: 44.14,
    top: 16.63,
    width: 40.98,
    height: 16.13,
    className: "route-map-board__hotspot--i75",
  },
  {
    roadId: "i20",
    label: "I-20",
    sublabel: "Promote Something Now",
    left: 2.52,
    top: 52.42,
    width: 31.53,
    height: 19.15,
    className: "route-map-board__hotspot--i20",
  },
  {
    roadId: "update",
    label: "Update Exit",
    sublabel: "Update What I Already Have",
    left: 59.27,
    top: 42.84,
    width: 39.09,
    height: 18.15,
    className: "route-map-board__hotspot--update",
  },
  {
    roadId: "random-exit",
    label: "Random Exit",
    sublabel: "I Know What I Need",
    left: 68.41,
    top: 72.58,
    width: 29.63,
    height: 15.63,
    className: "route-map-board__hotspot--random",
  },
];

/** Hotspots aligned to cloverleaf cardinal nodes (full image = map frame). */
export const ROUTE_MAP_CLOVERLEAF_CONTROLS: readonly RouteMapRoadControl[] = [
  {
    roadId: "i75",
    label: "I-75",
    sublabel: "Get My Business Started",
    left: 36,
    top: 6,
    width: 28,
    height: 20,
    className: "route-map-board__hotspot--i75",
  },
  {
    roadId: "i20",
    label: "I-20",
    sublabel: "Promote Something Now",
    left: 4,
    top: 38,
    width: 26,
    height: 18,
    className: "route-map-board__hotspot--i20",
  },
  {
    roadId: "update",
    label: "Update Exit",
    sublabel: "Update What I Already Have",
    left: 70,
    top: 38,
    width: 26,
    height: 18,
    className: "route-map-board__hotspot--update",
  },
  {
    roadId: "random-exit",
    label: "Random Exit",
    sublabel: "I Know What I Need",
    left: 36,
    top: 68,
    width: 28,
    height: 22,
    className: "route-map-board__hotspot--random",
  },
];

/** Studio-style highway route markers on map art — subtle labels, not click targets. */
export type RouteMapHighwayMarker = {
  roadId: "i75" | "i20" | "i285";
  label: string;
  left: number;
  top: number;
  className: string;
};

/**
 * Desk scene marker positions (% within map frame) — aligned to baked road geometry.
 * Disabled 2026-07-09: hero v2 bakes its own "STUDIO ROUTE" signage into the artwork,
 * making these decorative INTERSTATE overlay markers duplicate/conflicting noise.
 * Left empty (not removed) so this can be restored if a future hero variant needs it.
 */
export const ROUTE_MAP_DESK_HIGHWAY_MARKERS: readonly RouteMapHighwayMarker[] = [];

export const ROUTE_MAP_CLOVERLEAF_HIGHWAY_MARKERS: readonly RouteMapHighwayMarker[] = [
  { roadId: "i75", label: "I-75", left: 46, top: 14, className: "route-map-highway-marker--i75" },
  { roadId: "i20", label: "I-20", left: 8, top: 44, className: "route-map-highway-marker--i20" },
  { roadId: "i285", label: "I-285", left: 82, top: 28, className: "route-map-highway-marker--i285" },
];

/** @deprecated Use ROUTE_MAP_DESK_CONTROLS — kept for capture script compat. */
export const ROUTE_MAP_ROAD_CONTROLS = ROUTE_MAP_DESK_CONTROLS;

export function getRouteMapHeroConfig(variant: RouteMapHeroVariant) {
  if (variant === "cloverleaf") {
    return {
      src: ROUTE_MAP_ASSETS.cloverleaf,
      aspect: ROUTE_MAP_CLOVERLEAF_ASPECT,
      mapFrame: { left: 0, top: 0, width: 100, height: 100 },
      controls: ROUTE_MAP_CLOVERLEAF_CONTROLS,
      highwayMarkers: ROUTE_MAP_CLOVERLEAF_HIGHWAY_MARKERS,
    };
  }
  return {
    src: ROUTE_MAP_ASSETS.deskScene,
    aspect: ROUTE_MAP_DESK_SCENE_ASPECT,
    mapFrame: ROUTE_MAP_DESK_MAP_FRAME,
    controls: ROUTE_MAP_DESK_CONTROLS,
    highwayMarkers: ROUTE_MAP_DESK_HIGHWAY_MARKERS,
  };
}
