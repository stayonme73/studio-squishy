"use client";

import { useSyncExternalStore, type CSSProperties } from "react";

import RouteMapStopCard from "@/components/route-map/RouteMapStopCard";
import {
  getJobsForRoad,
  getRouteMapRoad,
  getRouteStartJob,
  ROUTE_MAP_V1,
  type RouteMapJob,
  type RouteMapRoad,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import { ROUTE_MAP_STOP_ICONS } from "@/config/route-map-icons";
import { getRouteMapShelfDensity } from "@/lib/route-map-shelf-density";

type Props = {
  roadId: RouteMapRoadId;
  onSelectJob: (job: RouteMapJob, roadId?: RouteMapRoadId) => void;
  onClose: () => void;
};

function routeMarkerLabel(road: RouteMapRoad): string {
  switch (road.id) {
    case "i75":
      return "I-75 · NORTH/SOUTH";
    case "i20":
      return "I-20 · EAST/WEST";
    case "update":
      return "UPDATE EXIT · INTERCHANGE";
    case "random-exit":
      return "RANDOM EXIT · SHORTCUT";
    default:
      return `${road.highwayLabel} · ${road.directionLabel.toUpperCase()}`;
  }
}

function RouteStartOption({
  onSelect,
  variant = "road",
}: {
  onSelect: () => void;
  variant?: "road" | "shelf";
}) {
  const routeStart = getRouteStartJob();
  if (!routeStart) return null;

  const prompt = variant === "shelf" ? "Not sure which job fits?" : null;

  return (
    <div className="route-map-route-start">
      {prompt ? <p className="route-map-route-start__prompt">{prompt}</p> : null}
      <button
        type="button"
        className="route-map-route-start__btn"
        onClick={onSelect}
        aria-label={`${routeStart.name}, ${routeStart.priceDisplay}, Route Start`}
      >
        <span className="route-map-route-start__icon" aria-hidden>
          {ROUTE_MAP_STOP_ICONS[routeStart.intakeType]}
        </span>
        <span className="route-map-route-start__body">
          <span className="route-map-route-start__head">
            <span className="route-map-route-start__name">{routeStart.name}</span>
            <span className="route-map-route-start__price">{routeStart.priceDisplay}</span>
          </span>
          <span className="route-map-route-start__desc">{routeStart.purpose}</span>
        </span>
        <span className="route-map-route-start__aside">
          <span className="route-map-route-start__badge">Route Start</span>
          <span className="route-map-route-start__arrow" aria-hidden>
            →
          </span>
        </span>
      </button>
    </div>
  );
}

function useRouteGridColumns(): number {
  return useSyncExternalStore(
    (onStoreChange) => {
      const queries = [
        window.matchMedia("(min-width: 901px)"),
        window.matchMedia("(min-width: 1280px)"),
      ];
      queries.forEach((query) => query.addEventListener("change", onStoreChange));
      window.addEventListener("resize", onStoreChange);
      return () => {
        queries.forEach((query) => query.removeEventListener("change", onStoreChange));
        window.removeEventListener("resize", onStoreChange);
      };
    },
    () => {
      if (!window.matchMedia("(min-width: 901px)").matches) return 1;
      if (!window.matchMedia("(min-width: 1280px)").matches) return 2;
      return 3;
    },
    () => 2,
  );
}

function useViewportHeight(): number {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("resize", onStoreChange);
      return () => window.removeEventListener("resize", onStoreChange);
    },
    () => window.innerHeight,
    () => 900,
  );
}

/** @locked docs/route-map-overlays-v1-locked.md — per-lane --rm-shelf-density from job rows + viewport. */
export default function RouteMapRoutePanel({ roadId, onSelectJob, onClose }: Props) {
  const road = getRouteMapRoad(roadId);
  const jobs = getJobsForRoad(roadId);
  const routeStart = getRouteStartJob();
  const gridColumns = useRouteGridColumns();
  const viewportHeight = useViewportHeight();

  if (!road) return null;

  const handleRouteStart = () => {
    if (routeStart) onSelectJob(routeStart, roadId);
  };

  const isShelf = roadId === "random-exit";
  const shelfDensity = getRouteMapShelfDensity(jobs.length, gridColumns, viewportHeight);
  const gridRows = Math.ceil(jobs.length / Math.max(1, gridColumns));
  const panelStyle = {
    "--rm-grid-cols": String(gridColumns),
    "--rm-grid-rows": String(gridRows),
    "--rm-shelf-density": String(shelfDensity),
  } as CSSProperties;

  return (
    <section
      className={[
        "route-map-route-panel",
        road.accentClass,
        isShelf ? "route-map-route-panel--shelf" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={panelStyle}
      aria-labelledby="route-map-panel-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="route-map-route-panel__texture" aria-hidden />
      <div className="route-map-route-panel__handle" aria-hidden />

      <button
        type="button"
        className="route-map-route-panel__close"
        onClick={onClose}
        aria-label="Close"
      >
        <span aria-hidden>×</span>
      </button>

      <div className="route-map-route-panel__chrome">
        {isShelf ? (
          <header className="route-map-route-panel__header">
            <p className="route-map-route-panel__marker">{routeMarkerLabel(road)}</p>
            <h2 id="route-map-panel-title" className="route-map-route-panel__title">
              {ROUTE_MAP_V1.jobShelfHeading}
            </h2>
            <p className="route-map-route-panel__lead">{road.tagline}</p>
          </header>
        ) : (
          <header className="route-map-route-panel__header">
            <p className="route-map-route-panel__marker">{routeMarkerLabel(road)}</p>
            <h2 id="route-map-panel-title" className="route-map-route-panel__title">
              {road.customerLabel}
            </h2>
            <p className="route-map-route-panel__lead">{road.tagline}</p>
          </header>
        )}

        <RouteStartOption onSelect={handleRouteStart} variant={isShelf ? "shelf" : "road"} />
      </div>

      <div className="route-map-route-panel__scroll">
        <ol className={`route-map-stops${isShelf ? " route-map-stops--shelf" : ""}`}>
          {jobs.map((job, index) => (
            <li key={job.id}>
              <RouteMapStopCard
                job={job}
                index={index}
                onSelect={() => onSelectJob(job, roadId)}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
