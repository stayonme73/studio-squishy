"use client";

import { useCallback, useId, useState } from "react";

import RouteMapChoosePanel from "@/components/route-map/RouteMapChoosePanel";
import RouteMapHighwayMap from "@/components/route-map/RouteMapHighwayMap";
import RouteMapHowItWorks from "@/components/route-map/RouteMapHowItWorks";
import type { RouteMapRoadId } from "@/config/route-map-v1";

type Props = {
  onSelectRoad: (roadId: RouteMapRoadId) => void;
  showChoosePanel: boolean;
  mapInteractive?: boolean;
};

export default function RouteMapWorkspace({
  onSelectRoad,
  showChoosePanel,
  mapInteractive = true,
}: Props) {
  const choosePanelId = useId();
  const [choosePanelOpen, setChoosePanelOpen] = useState(true);

  const toggleChoosePanel = useCallback(() => {
    setChoosePanelOpen((open) => !open);
  }, []);

  const workspaceClassName = [
    "route-map-workspace",
    showChoosePanel && !choosePanelOpen ? "route-map-workspace--panel-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={workspaceClassName} role="group" aria-label="Studio Route Map workspace">
      <div className="route-map-workspace__main">
        <div className="route-map-workspace__map-col">
          <RouteMapHighwayMap
            variant="desk-scene"
            onSelectRoad={onSelectRoad}
            interactive={mapInteractive}
          />
        </div>

        {showChoosePanel ? (
          <div
            className={[
              "route-map-choose-panel-wrap",
              !choosePanelOpen ? "route-map-choose-panel-wrap--collapsed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {!choosePanelOpen ? (
              <button
                type="button"
                className="route-map-choose-panel__toggle"
                onClick={toggleChoosePanel}
                aria-expanded={choosePanelOpen}
                aria-controls={choosePanelId}
                aria-label="Show routes"
              >
                <span className="route-map-choose-panel__toggle-icon" aria-hidden>
                  ‹
                </span>
                <span className="route-map-choose-panel__toggle-label">Show routes</span>
              </button>
            ) : null}
            <RouteMapChoosePanel
              id={choosePanelId}
              onSelectRoad={onSelectRoad}
              onTogglePanel={toggleChoosePanel}
              panelOpen={choosePanelOpen}
            />
          </div>
        ) : null}
      </div>

      <div className="route-map-workspace__how-wrap">
        <RouteMapHowItWorks />
      </div>
    </div>
  );
}
