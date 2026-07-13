"use client";

import RouteMapInterstateShield from "@/components/route-map/RouteMapInterstateShield";
import SquishyHelpPrompt from "@/components/route-map/SquishyHelpPrompt";
import { getSelectableRouteMapRoads, type RouteMapRoadId } from "@/config/route-map-v1";
import { useSquishyHelpPromptVisibility } from "@/lib/use-squishy-help-prompt-visibility";

type Props = {
  id?: string;
  onSelectRoad: (roadId: RouteMapRoadId) => void;
  onTogglePanel?: () => void;
  panelOpen?: boolean;
};

function RouteCardIcon({ roadId }: { roadId: RouteMapRoadId }) {
  if (roadId === "i75") return <RouteMapInterstateShield number="75" variant="i75" size="sm" />;
  if (roadId === "i20") return <RouteMapInterstateShield number="20" variant="i20" size="sm" />;
  if (roadId === "update") {
    return (
      <span className="route-map-exit-sign route-map-exit-sign--sm">
        <span className="route-map-exit-sign__pill">EXIT</span>
        <span className="route-map-exit-sign__label">Update</span>
      </span>
    );
  }
  return (
    <span className="route-map-random-label route-map-random-label--sm">
      <span className="route-map-random-label__title">Random</span>
      <span className="route-map-random-label__sub">Exit</span>
    </span>
  );
}

export default function RouteMapChoosePanel({
  id,
  onSelectRoad,
  onTogglePanel,
  panelOpen = true,
}: Props) {
  const roads = getSelectableRouteMapRoads();
  const helpPromptVisible = useSquishyHelpPromptVisibility();

  return (
    <aside id={id} className="route-map-choose-panel" aria-label="Choose your route">
      <header className="route-map-choose-panel__header">
        {onTogglePanel ? (
          <button
            type="button"
            className="route-map-choose-panel__collapse"
            onClick={onTogglePanel}
            aria-expanded={panelOpen}
            aria-label="Hide routes"
          >
            <span aria-hidden>›</span>
            <span className="route-map-choose-panel__collapse-label">Hide routes</span>
          </button>
        ) : null}
        <div className="route-map-choose-panel__title-row">
          <span className="route-map-choose-panel__bulb" aria-hidden>
            💡
          </span>
          <h2 className="route-map-choose-panel__title">Choose Your Route</h2>
        </div>
        <p className="route-map-choose-panel__lead">
          Pick a lane, select a job, pay, then share intake details.
        </p>
        <p className="route-map-choose-panel__orientation">
          Choose a route on the map or use the guide on the right.
        </p>
      </header>

      <SquishyHelpPrompt visible={helpPromptVisible} />

      <nav className="route-map-choose-panel__nav">
        {roads.map((road) => (
          <button
            key={road.id}
            type="button"
            className={[
              "route-map-choose-card",
              road.accentClass,
              road.id === "update" ? "route-map-choose-card--exit" : "",
              road.id === "random-exit" ? "route-map-choose-card--random" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onSelectRoad(road.id)}
          >
            <span className="route-map-choose-card__icon" aria-hidden>
              <RouteCardIcon roadId={road.id} />
            </span>
            <span className="route-map-choose-card__body">
              <span className="route-map-choose-card__highway">{road.highwayLabel}</span>
              <span className="route-map-choose-card__label">{road.customerLabel}</span>
              <span className="route-map-choose-card__tagline">{road.tagline}</span>
            </span>
            <span className="route-map-choose-card__arrow" aria-hidden>
              →
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
