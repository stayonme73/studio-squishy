"use client";

import { useCallback, useId, useState } from "react";

import RouteMapChoosePanel from "@/components/route-map/RouteMapChoosePanel";
import RouteMapHighwayMap from "@/components/route-map/RouteMapHighwayMap";
import RouteMapHowItWorks from "@/components/route-map/RouteMapHowItWorks";
import type { RouteMapRoadId } from "@/config/route-map-v1";

type Props = {
  onSelectRoad: (roadId: RouteMapRoadId) => void;
  showChoosePanel: boolean;
};

export default function RouteMapWorkspace({ onSelectRoad, showChoosePanel }: Props) {
  const choosePanelId = useId();
  const [choosePanelOpen, setChoosePanelOpen] = useState(true);

  const toggleChoosePanel = useCallback(() => {
    setChoosePanelOpen((open) => !open);
  }, []);

  const uiClassName = [
    "route-map-workspace__ui",
    showChoosePanel && !choosePanelOpen ? "route-map-workspace__ui--panel-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="route-map-workspace" role="group" aria-label="Studio Route Map workspace">
      <div className="route-map-workspace__scene" aria-hidden={false}>
        <RouteMapHighwayMap variant="desk-scene" onSelectRoad={onSelectRoad} />
      </div>

      <div className={uiClassName}>
        <div className="route-map-workspace__stage">
          <div className="route-map-workspace__stage-spacer" aria-hidden />

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
    </div>
  );
}
