"use client";

import { ROUTE_MAP_STOP_ICONS } from "@/config/route-map-icons";
import type { RouteMapJob } from "@/config/route-map-v1";

type Props = {
  job: RouteMapJob;
  index: number;
  onSelect: () => void;
};

export default function RouteMapStopCard({ job, index, onSelect }: Props) {
  return (
    <button
      type="button"
      className="route-map-stop"
      onClick={onSelect}
      aria-label={`${job.name}, ${job.priceDisplay}`}
    >
      <span className="route-map-stop__left">
        <span className="route-map-stop__number" aria-hidden>
          {index + 1}
        </span>
        <span className="route-map-stop__icon" aria-hidden>
          {ROUTE_MAP_STOP_ICONS[job.intakeType]}
        </span>
      </span>

      <span className="route-map-stop__body">
        <span className="route-map-stop__head">
          <span className="route-map-stop__name">{job.name}</span>
          <span className="route-map-stop__price">{job.priceDisplay}</span>
        </span>
        {job.purpose ? (
          <span className="route-map-stop__desc">{job.purpose}</span>
        ) : null}
      </span>

      <span className="route-map-stop__aside">
        <span className="route-map-stop__arrow" aria-hidden>
          →
        </span>
      </span>
    </button>
  );
}
