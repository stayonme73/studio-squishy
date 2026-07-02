"use client";

import RouteMapHighwayMap from "@/components/route-map/RouteMapHighwayMap";
import {
  getSelectableRouteMapRoads,
  type RouteMapRoadId,
} from "@/config/route-map-v1";

type Props = {
  onSelectRoad: (roadId: RouteMapRoadId) => void;
};

function laneTileClass(roadId: RouteMapRoadId, accentClass: string): string {
  const base = `route-map-lane-tile ${accentClass}`;
  if (roadId === "update") return `${base} route-map-lane-tile--exit`;
  if (roadId === "random-exit") return `${base} route-map-lane-tile--random`;
  return base;
}

/** @deprecated Archived 2026-07-01 — use RouteMapWorkspace. See src/archive/route-map-visual/README.md */
export default function RouteMapLaneSelector({ onSelectRoad }: Props) {
  const selectableRoads = getSelectableRouteMapRoads();

  return (
    <section className="route-map-lanes" aria-labelledby="route-map-lanes-title">
      <h2 id="route-map-lanes-title" className="route-map-section-title">
        Studio Route Map
      </h2>
      <p className="route-map-section-lead">
        Pick your route on the map — tap a highway or exit to see jobs on that lane.
      </p>

      <RouteMapHighwayMap onSelectRoad={onSelectRoad} />

      <p className="route-map-lanes__shortcut-label">Quick lane shortcuts</p>
      <div className="route-map-lane-grid" aria-label="Lane shortcuts">
        {selectableRoads.map((road) => (
          <button
            key={road.id}
            type="button"
            className={laneTileClass(road.id, road.accentClass)}
            onClick={() => onSelectRoad(road.id)}
          >
            <span className="route-map-lane-tile__highway">{road.highwayLabel}</span>
            <span className="route-map-lane-tile__direction">{road.directionLabel}</span>
            <span className="route-map-lane-tile__label">{road.customerLabel}</span>
            <span className="route-map-lane-tile__tagline">{road.tagline}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
