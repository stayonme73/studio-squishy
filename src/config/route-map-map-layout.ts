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
  deskScene: "/route-map/studio-route-map-desk-scene.png",
  cloverleaf: "/route-map/studio-route-map-cloverleaf.png",
} as const;

/** Full desk scene — framed map on studio desk (Tagia 1st choice). */
export const ROUTE_MAP_DESK_SCENE_ASPECT = "1536 / 1024";

/** Map frame inset within desk scene (% of scene). */
export const ROUTE_MAP_DESK_MAP_FRAME = {
  left: 16.5,
  top: 8.5,
  width: 67,
  height: 60,
} as const;

/** Cloverleaf map — mobile fallback (Tagia 2nd choice). */
export const ROUTE_MAP_CLOVERLEAF_ASPECT = "16 / 10";

/** Hotspots aligned to map frame inside desk-scene hero. */
export const ROUTE_MAP_DESK_CONTROLS: readonly RouteMapRoadControl[] = [
  {
    roadId: "i75",
    label: "I-75",
    sublabel: "Get My Business Started",
    left: 40,
    top: 16,
    width: 20,
    height: 72,
    className: "route-map-board__hotspot--i75",
  },
  {
    roadId: "i20",
    label: "I-20",
    sublabel: "Promote Something Now",
    left: 8,
    top: 42,
    width: 84,
    height: 14,
    className: "route-map-board__hotspot--i20",
  },
  {
    roadId: "update",
    label: "Update Exit",
    sublabel: "Update What I Already Have",
    left: 56,
    top: 30,
    width: 24,
    height: 20,
    className: "route-map-board__hotspot--update",
  },
  {
    roadId: "random-exit",
    label: "Random Exit",
    sublabel: "I Know What I Need",
    left: 60,
    top: 56,
    width: 26,
    height: 22,
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

/** Desk scene marker positions (% within map frame) — aligned to baked road geometry. */
export const ROUTE_MAP_DESK_HIGHWAY_MARKERS: readonly RouteMapHighwayMarker[] = [
  { roadId: "i75", label: "I-75", left: 47, top: 28, className: "route-map-highway-marker--i75" },
  /** East-west leg heading toward the sun — centered on the roadway like I-75. */
  { roadId: "i20", label: "I-20", left: 4, top: 46, className: "route-map-highway-marker--i20" },
  /** Perimeter loop — centered on the ring segment like I-75 on its lane. */
  { roadId: "i285", label: "I-285", left: 64, top: 54, className: "route-map-highway-marker--i285" },
];

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
