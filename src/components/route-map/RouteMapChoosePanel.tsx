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

/** Clean screen-reader names — cards otherwise fall back to concatenated inner text. */
const ROUTE_CARD_ARIA_LABEL: Record<RouteMapRoadId, string> = {
  i75: "I-75 — Get My Business Started",
  i20: "I-20 — Promote Something Now",
  i285: "I-285 — Perimeter Loop",
  update: "Studio Route 285 — Update What I Already Have",
  "random-exit": "Direct Route — I Know What I Need",
};

function RouteCardIcon({ roadId }: { roadId: RouteMapRoadId }) {
  if (roadId === "i75") {
    return <RouteMapInterstateShield number="75" variant="i75" size="sm" label="STUDIO" studio />;
  }
  if (roadId === "i20") {
    return <RouteMapInterstateShield number="20" variant="i20" size="sm" label="STUDIO" studio />;
  }
  if (roadId === "update") {
    return <RouteMapInterstateShield number="285" variant="i285" size="sm" label="STUDIO" studio />;
  }
  return (
    <RouteMapInterstateShield number="Direct" variant="random" size="sm" label="STUDIO" studio />
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
          Pick a lane, select a job, pay, then complete Project Intake.
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
            aria-label={ROUTE_CARD_ARIA_LABEL[road.id]}
          >
            <span className="route-map-choose-card__icon" aria-hidden>
              <RouteCardIcon roadId={road.id} />
            </span>
            <span className="route-map-choose-card__body">
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
