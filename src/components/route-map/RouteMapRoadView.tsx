"use client";

import type { CSSProperties } from "react";

import {
  getJobsForRoad,
  getRouteMapRoad,
  getRouteStartJob,
  ROUTE_MAP_V1,
  type RouteMapIntakeType,
  type RouteMapJob,
  type RouteMapRoadId,
} from "@/config/route-map-v1";

type Props = {
  roadId: RouteMapRoadId;
  onSelectJob: (job: RouteMapJob) => void;
  onBack: () => void;
};

const STOP_ICONS: Record<RouteMapIntakeType, string> = {
  discovery: "◎",
  "social-setup": "◉",
  promotion: "▶",
  video: "▷",
  page: "▣",
  voice: "♫",
  update: "↻",
};

function StopTile({
  job,
  index,
  onSelect,
}: {
  job: RouteMapJob;
  index: number;
  onSelect: () => void;
}) {
  return (
    <button type="button" className="route-map-stop" onClick={onSelect}>
      <span className="route-map-stop__number" aria-hidden>
        {index + 1}
      </span>
      <span className="route-map-stop__icon" aria-hidden>
        {STOP_ICONS[job.intakeType]}
      </span>
      <span className="route-map-stop__body">
        <span className="route-map-stop__name">{job.name}</span>
        <span className="route-map-stop__meta">
          <span className="route-map-stop__price">{job.priceDisplay}</span>
        </span>
      </span>
      <span className="route-map-stop__arrow" aria-hidden>
        →
      </span>
    </button>
  );
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

  const prompt =
    variant === "shelf" ? "Not sure which job fits?" : "Not sure where to begin?";

  return (
    <div className="route-map-route-start">
      <p className="route-map-route-start__prompt">{prompt}</p>
      <button type="button" className="route-map-route-start__btn" onClick={onSelect}>
        <span className="route-map-route-start__icon" aria-hidden>
          {STOP_ICONS[routeStart.intakeType]}
        </span>
        <span className="route-map-route-start__body">
          <span className="route-map-route-start__name">{routeStart.name}</span>
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
  );
}

export default function RouteMapRoadView({ roadId, onSelectJob, onBack }: Props) {
  const road = getRouteMapRoad(roadId);
  const jobs = getJobsForRoad(roadId);
  const routeStart = getRouteStartJob();

  if (!road) return null;

  const handleRouteStart = () => {
    if (routeStart) onSelectJob(routeStart);
  };

  if (roadId === "random-exit") {
    return (
      <section className="route-map-road route-map-road--shelf" aria-labelledby="route-map-shelf-title">
        <button type="button" className="route-map-back-link" onClick={onBack}>
          {ROUTE_MAP_V1.backToMapLabel}
        </button>
        <h2 id="route-map-shelf-title" className="route-map-section-title">
          {ROUTE_MAP_V1.jobShelfHeading}
        </h2>
        <p className="route-map-section-lead">{road.tagline}</p>
        <RouteStartOption onSelect={handleRouteStart} variant="shelf" />
        <ol className="route-map-stops route-map-stops--shelf">
          {jobs.map((job, index) => (
            <li key={job.id}>
              <StopTile job={job} index={index} onSelect={() => onSelectJob(job)} />
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section
      className={`route-map-road ${road.accentClass}`}
      aria-labelledby="route-map-road-title"
    >
      <button type="button" className="route-map-back-link" onClick={onBack}>
        {ROUTE_MAP_V1.backToMapLabel}
      </button>

      <header className="route-map-road__header">
        <p className="route-map-road__highway">
          {road.highwayLabel} · {road.directionLabel}
        </p>
        <h2 id="route-map-road-title" className="route-map-section-title">
          {road.customerLabel}
        </h2>
        <p className="route-map-section-lead">{road.tagline}</p>
      </header>

      <RouteStartOption onSelect={handleRouteStart} />

      <div className={`route-map-road-track route-map-road-track--${road.geometry}`} aria-hidden>
        {road.geometry === "forward" || road.geometry === "direct" || road.geometry === "shortcut" ? (
          <div className="route-map-road-track__line" />
        ) : null}
        {road.geometry === "loop" ? <div className="route-map-road-track__loop-ring" /> : null}
        {road.geometry === "interchange" ? (
          <>
            <div className="route-map-road-track__loop-ring route-map-road-track__loop-ring--ghost" />
            <div className="route-map-road-track__ramp">
              <span className="route-map-exit-sign route-map-exit-sign--sm">Update Exit</span>
            </div>
          </>
        ) : null}
      </div>

      <ol className="route-map-stops">
        {jobs.map((job, index) => (
          <li key={job.id} style={{ "--stop-index": index } as CSSProperties}>
            <StopTile job={job} index={index} onSelect={() => onSelectJob(job)} />
          </li>
        ))}
      </ol>
    </section>
  );
}
