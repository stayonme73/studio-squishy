"use client";

import {
  getSelectableRouteMapRoads,
  type RouteMapRoadId,
} from "@/config/route-map-v1";

type Props = {
  onSelectRoad: (roadId: RouteMapRoadId) => void;
};

const HIGHWAY_CONTROLS: readonly {
  roadId: RouteMapRoadId;
  label: string;
  sublabel: string;
  className: string;
}[] = [
  {
    roadId: "i75",
    label: "I-75",
    sublabel: "North",
    className: "route-map-highway__control--i75-n",
  },
  {
    roadId: "i75",
    label: "I-75",
    sublabel: "South",
    className: "route-map-highway__control--i75-s",
  },
  {
    roadId: "i20",
    label: "I-20",
    sublabel: "West",
    className: "route-map-highway__control--i20-w",
  },
  {
    roadId: "i20",
    label: "I-20",
    sublabel: "East",
    className: "route-map-highway__control--i20-e",
  },
  {
    roadId: "update",
    label: "Update Exit",
    sublabel: "Interchange",
    className: "route-map-highway__control--update",
  },
  {
    roadId: "random-exit",
    label: "Random Exit",
    sublabel: "Shortcut",
    className: "route-map-highway__control--random",
  },
];

function laneTileClass(roadId: RouteMapRoadId, accentClass: string): string {
  const base = `route-map-lane-tile ${accentClass}`;
  if (roadId === "update") return `${base} route-map-lane-tile--exit`;
  if (roadId === "random-exit") return `${base} route-map-lane-tile--random`;
  return base;
}

export default function RouteMapLaneSelector({ onSelectRoad }: Props) {
  const selectableRoads = getSelectableRouteMapRoads();

  return (
    <section className="route-map-lanes" aria-labelledby="route-map-lanes-title">
      <h2 id="route-map-lanes-title" className="route-map-section-title">
        Studio Route Map
      </h2>
      <p className="route-map-section-lead">
        Pick your route on the map — I-75 and I-20 are your main highways. Branch off at the
        Update Exit interchange or take the Random Exit shortcut when you already know your job.
      </p>

      <div className="route-map-highway" role="group" aria-label="Interactive highway route map">
        <div className="route-map-highway__surface" aria-hidden>
          <div className="route-map-highway__sky" />
          <div className="route-map-highway__terrain" />
          <div className="route-map-highway__loop" />
          <div className="route-map-highway__loop-inner" />
          <div className="route-map-highway__loop-label">
            <span className="route-map-shield route-map-shield--i285">285</span>
          </div>
          <div className="route-map-highway__ns route-map-highway__ns--north">
            <span className="route-map-shield route-map-shield--i75">75</span>
          </div>
          <div className="route-map-highway__ns route-map-highway__ns--south">
            <span className="route-map-shield route-map-shield--i75">75</span>
          </div>
          <div className="route-map-highway__ew route-map-highway__ew--west">
            <span className="route-map-shield route-map-shield--i20">20</span>
          </div>
          <div className="route-map-highway__ew route-map-highway__ew--east">
            <span className="route-map-shield route-map-shield--i20">20</span>
          </div>
          <div className="route-map-highway__interchange" />
          <div className="route-map-highway__update-ramp">
            <span className="route-map-exit-sign">Update Exit</span>
          </div>
          <div className="route-map-highway__random">
            <span className="route-map-random-label">Random Exit</span>
          </div>
        </div>

        <div className="route-map-highway__controls">
          {HIGHWAY_CONTROLS.map((control) => (
            <button
              key={control.className}
              type="button"
              className={`route-map-highway__control ${control.className}`}
              onClick={() => onSelectRoad(control.roadId)}
            >
              <span className="route-map-highway__control-label">{control.label}</span>
              <span className="route-map-highway__control-sublabel">{control.sublabel}</span>
            </button>
          ))}
        </div>
      </div>

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
