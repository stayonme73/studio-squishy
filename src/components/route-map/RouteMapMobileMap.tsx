"use client";

import { useCallback, useId, useState } from "react";

import RouteMapChoosePanel from "@/components/route-map/RouteMapChoosePanel";
import RouteMapHighwayMap from "@/components/route-map/RouteMapHighwayMap";
import {
  getRouteStartJob,
  type RouteMapJob,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import { ROUTE_MAP_STOP_ICONS } from "@/config/route-map-icons";

type Props = {
  onSelectRoad: (roadId: RouteMapRoadId) => void;
  onSelectRouteStart: (job: RouteMapJob, roadId: RouteMapRoadId) => void;
};

export default function RouteMapMobileMap({ onSelectRoad, onSelectRouteStart }: Props) {
  const choosePanelId = useId();
  const [sheetOpen, setSheetOpen] = useState(false);
  const routeStart = getRouteStartJob();

  const openSheet = useCallback(() => setSheetOpen(true), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const handleSelectRoad = useCallback(
    (roadId: RouteMapRoadId) => {
      closeSheet();
      onSelectRoad(roadId);
    },
    [closeSheet, onSelectRoad],
  );

  const handleRouteStart = useCallback(() => {
    if (!routeStart) return;
    closeSheet();
    onSelectRouteStart(routeStart, "random-exit");
  }, [closeSheet, onSelectRouteStart, routeStart]);

  return (
    <div className="route-map-mobile-scene" role="group" aria-label="Studio Route Map">
      <div className="route-map-mobile-scene__map">
        <RouteMapHighwayMap variant="cloverleaf" onSelectRoad={handleSelectRoad} />
      </div>

      <div className="route-map-mobile-scene__actions">
        <button
          type="button"
          className="route-map-mobile-scene__choose-btn"
          onClick={openSheet}
          aria-expanded={sheetOpen}
          aria-controls={choosePanelId}
        >
          Choose Your Route
        </button>
      </div>

      {sheetOpen ? (
        <>
          <div
            className="route-map-mobile-scene__scrim"
            onClick={closeSheet}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeSheet();
            }}
            role="presentation"
          />
          <div className="route-map-mobile-scene__sheet">
            <div className="route-map-route-panel__handle" aria-hidden />
            <button
              type="button"
              className="route-map-route-panel__close"
              onClick={closeSheet}
            >
              Close
            </button>
            <RouteMapChoosePanel id={choosePanelId} onSelectRoad={handleSelectRoad} />
            {routeStart ? (
              <div className="route-map-mobile-scene__route-start">
                <button type="button" className="route-map-route-start__btn" onClick={handleRouteStart}>
                  <span className="route-map-route-start__icon" aria-hidden>
                    {ROUTE_MAP_STOP_ICONS[routeStart.intakeType]}
                  </span>
                  <span className="route-map-route-start__body">
                    <span className="route-map-route-start__name">{routeStart.name}</span>
                    <span className="route-map-route-start__desc">{routeStart.purpose}</span>
                    <span className="route-map-route-start__meta">
                      <span className="route-map-route-start__price">{routeStart.priceDisplay}</span>
                      <span className="route-map-route-start__badge">Route Start</span>
                    </span>
                  </span>
                  <span className="route-map-route-start__arrow" aria-hidden>
                    →
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
