"use client";

import RouteMapJobDetailBlocks from "@/components/route-map/RouteMapJobDetailBlocks";
import { ROUTE_MAP_V1, type RouteMapJob } from "@/config/route-map-v1";

type Props = {
  job: RouteMapJob;
  onChoose: () => void;
  onBack: () => void;
  variant?: "inline" | "overlay";
};

export default function RouteMapJobCard({ job, onChoose, onBack, variant = "inline" }: Props) {
  return (
    <article
      className={`route-map-job-card${variant === "overlay" ? " route-map-job-card--overlay" : ""}`}
      aria-labelledby="route-map-job-title"
    >
      <button type="button" className="route-map-back-link" onClick={onBack}>
        ← Back to route stops
      </button>

      <header className="route-map-job-card__header">
        <h2 id="route-map-job-title" className="route-map-job-card__title">
          {job.name}
        </h2>
        <p className="route-map-job-card__price">{job.priceDisplay}</p>
      </header>

      <RouteMapJobDetailBlocks job={job} />

      <footer className="route-map-job-card__footer">
        <button type="button" className="route-map-primary-btn" onClick={onChoose}>
          {ROUTE_MAP_V1.chooseJobCta}
        </button>
      </footer>
    </article>
  );
}
