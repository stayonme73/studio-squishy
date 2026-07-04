"use client";

import { useCallback, useId } from "react";

import RouteMapChoosePanel from "@/components/route-map/RouteMapChoosePanel";
import RouteMapHighwayMap from "@/components/route-map/RouteMapHighwayMap";
import {
  type RouteMapJob,
  type RouteMapRoadId,
} from "@/config/route-map-v1";

type Props = {
  onSelectRoad: (roadId: RouteMapRoadId) => void;
  onSelectRouteStart: (job: RouteMapJob, roadId: RouteMapRoadId) => void;
  showSelector?: boolean;
};

export default function RouteMapMobileMap({
  onSelectRoad,
  onSelectRouteStart: _onSelectRouteStart,
  showSelector = true,
}: Props) {
  const choosePanelId = useId();

  const handleSelectRoad = useCallback(
    (roadId: RouteMapRoadId) => {
      onSelectRoad(roadId);
    },
    [onSelectRoad],
  );

  return (
    <div className="route-map-mobile-scene" role="group" aria-label="Studio Route Map">
      <div className="route-map-mobile-scene__map" aria-hidden={false}>
        <RouteMapHighwayMap
          variant="desk-scene"
          onSelectRoad={handleSelectRoad}
          interactive={false}
        />
      </div>

      {showSelector ? (
        <div className="route-map-mobile-scene__selector">
          <RouteMapChoosePanel id={choosePanelId} onSelectRoad={handleSelectRoad} />
        </div>
      ) : null}
    </div>
  );
}
