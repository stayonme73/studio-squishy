"use client";

import type { RouteMapJob } from "@/config/route-map-v1";

type Props = {
  job: RouteMapJob;
  className?: string;
};

/** Purpose + Includes/Exclusions | Revision/Timing — shared job detail grid. */
export default function RouteMapJobDetailBlocks({ job, className }: Props) {
  return (
    <div
      className={["route-map-job-card__body", className].filter(Boolean).join(" ")}
      aria-label={`${job.name} details`}
    >
      <section className="route-map-job-card__block route-map-job-card__block--purpose">
        <h3 className="route-map-job-card__section">Purpose</h3>
        <p>{job.purpose}</p>
      </section>

      <section className="route-map-job-card__block route-map-job-card__block--includes">
        <h3 className="route-map-job-card__section">Includes</h3>
        <ul className="route-map-job-card__list">
          {job.deliverables.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="route-map-job-card__block route-map-job-card__block--exclusions">
        <h3 className="route-map-job-card__section">Exclusions</h3>
        <ul className="route-map-job-card__list route-map-job-card__list--muted">
          {job.exclusions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="route-map-job-card__block route-map-job-card__block--revision">
        <h3 className="route-map-job-card__section">Revision</h3>
        <p>{job.revisionRule}</p>
      </section>

      <section className="route-map-job-card__block route-map-job-card__block--timing">
        <h3 className="route-map-job-card__section">Timing</h3>
        <p>{job.timingLabel}</p>
      </section>
    </div>
  );
}
