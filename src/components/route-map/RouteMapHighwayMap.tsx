"use client";

import RouteMapInterstateShield from "@/components/route-map/RouteMapInterstateShield";
import {
  getRouteMapHeroConfig,
  type RouteMapHeroVariant,
  type RouteMapHighwayMarker,
  type RouteMapRoadControl,
} from "@/config/route-map-map-layout";
import type { RouteMapRoadId } from "@/config/route-map-v1";

type Props = {
  variant?: RouteMapHeroVariant;
  onSelectRoad: (roadId: RouteMapRoadId) => void;
  /** When false, map art + highway markers only — no hotspot click targets. */
  interactive?: boolean;
};

function HotspotMarker({
  control,
  onSelectRoad,
}: {
  control: RouteMapRoadControl;
  onSelectRoad: (roadId: RouteMapRoadId) => void;
}) {
  return (
    <button
      type="button"
      className={`route-map-board__hotspot ${control.className}`}
      style={{
        left: `${control.left}%`,
        top: `${control.top}%`,
        width: `${control.width}%`,
        height: `${control.height}%`,
      }}
      onClick={() => onSelectRoad(control.roadId)}
      aria-label={`${control.label} — ${control.sublabel}`}
    >
      <span className="route-map-board__hotspot-label">{control.label}</span>
      <span className="route-map-board__hotspot-sublabel">{control.sublabel}</span>
    </button>
  );
}

const HIGHWAY_SHIELD_NUM: Record<RouteMapHighwayMarker["roadId"], string> = {
  i75: "75",
  i20: "20",
  i285: "285",
};

function HighwayMarker({ marker }: { marker: RouteMapHighwayMarker }) {
  return (
    <span
      className={`route-map-highway-marker ${marker.className}`}
      style={{ left: `${marker.left}%`, top: `${marker.top}%` }}
      aria-hidden
    >
      <RouteMapInterstateShield
        number={HIGHWAY_SHIELD_NUM[marker.roadId]}
        variant={marker.roadId}
        size="sm"
      />
    </span>
  );
}

export default function RouteMapHighwayMap({
  variant = "desk-scene",
  onSelectRoad,
  interactive = true,
}: Props) {
  const hero = getRouteMapHeroConfig(variant);
  const isDesk = variant === "desk-scene";

  return (
    <div
      className={[
        "route-map-hero",
        isDesk ? "route-map-hero--desk" : "route-map-hero--cloverleaf",
        !interactive ? "route-map-hero--display-only" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ aspectRatio: hero.aspect }}
      role="group"
      aria-label={interactive ? "Interactive Studio route map" : "Studio route map"}
    >
      <img
        className="route-map-hero__art"
        src={hero.src}
        alt={
          isDesk
            ? "Studio Route Map showing a city skyline, highway interchange, and four Studio route options: Get My Business Started, Promote Something Now, Update What I Already Have, and I Know What I Need."
            : "Studio route map — illustrated highway cloverleaf interchange"
        }
        draggable={false}
      />

      <div
        className="route-map-hero__map-zone"
        style={{
          left: `${hero.mapFrame.left}%`,
          top: `${hero.mapFrame.top}%`,
          width: `${hero.mapFrame.width}%`,
          height: `${hero.mapFrame.height}%`,
        }}
      >
        <div className="route-map-hero__highway-markers" aria-hidden>
          {hero.highwayMarkers.map((marker) => (
            <HighwayMarker key={marker.roadId} marker={marker} />
          ))}
        </div>

        {interactive ? (
          <div className="route-map-hero__hotspots">
            {hero.controls.map((control) => (
              <HotspotMarker key={control.roadId} control={control} onSelectRoad={onSelectRoad} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
