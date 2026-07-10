"use client";

import { type CSSProperties } from "react";

import RouteMapJobDetailBlocks from "@/components/route-map/RouteMapJobDetailBlocks";
import { ROUTE_MAP_V1, type RouteMapJob } from "@/config/route-map-v1";
import { getRouteMapJobDetailDensity } from "@/lib/route-map-shelf-density";

/** @locked docs/route-map-overlays-v1-locked.md — --rm-job-detail-density inline on overlay variant. */

type Props = {
  job: RouteMapJob;
  onChoose: () => void;
  onBack: () => void;
  chooseLabel?: string;
  chooseDisabled?: boolean;
  variant?: "inline" | "overlay";
};

export default function RouteMapJobCard({
  job,
  onChoose,
  onBack,
  chooseLabel = ROUTE_MAP_V1.chooseJobCta,
  chooseDisabled = false,
  variant = "inline",
}: Props) {
  const detailDensity =
    variant === "overlay"
      ? getRouteMapJobDetailDensity(job.deliverables.length, job.exclusions.length)
      : undefined;
  const overlayStyle =
    detailDensity !== undefined
      ? ({ "--rm-job-detail-density": String(detailDensity) } as CSSProperties)
      : undefined;

  return (
    <article
      className={`route-map-job-card${variant === "overlay" ? " route-map-job-card--overlay" : ""}`}
      style={overlayStyle}
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
        <button
          type="button"
          className="route-map-primary-btn"
          onClick={onChoose}
          disabled={chooseDisabled}
        >
          {chooseLabel}
        </button>
      </footer>
    </article>
  );
}
