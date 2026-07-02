"use client";

import { ROUTE_MAP_V1, type RouteMapJob } from "@/config/route-map-v1";

type Props = {
  job: RouteMapJob;
  onChoose: () => void;
  onBack: () => void;
};

export default function RouteMapJobCard({ job, onChoose, onBack }: Props) {
  return (
    <article className="route-map-job-card" aria-labelledby="route-map-job-title">
      <button type="button" className="route-map-back-link" onClick={onBack}>
        ← Back to route stops
      </button>

      <header className="route-map-job-card__header">
        <h2 id="route-map-job-title" className="route-map-job-card__title">
          {job.name}
        </h2>
        <p className="route-map-job-card__price">{job.priceDisplay}</p>
      </header>

      <div className="route-map-job-card__body">
        <section>
          <h3 className="route-map-job-card__section">Purpose</h3>
          <p>{job.purpose}</p>
        </section>

        <section>
          <h3 className="route-map-job-card__section">Includes</h3>
          <ul className="route-map-job-card__list">
            {job.deliverables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="route-map-job-card__section">Exclusions</h3>
          <ul className="route-map-job-card__list route-map-job-card__list--muted">
            {job.exclusions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="route-map-job-card__meta">
          <p>
            <strong>Revision:</strong> {job.revisionRule}
          </p>
          <p>
            <strong>Timing:</strong> {job.timingLabel}
          </p>
        </section>
      </div>

      <footer className="route-map-job-card__footer">
        <button type="button" className="route-map-primary-btn" onClick={onChoose}>
          {ROUTE_MAP_V1.chooseJobCta}
        </button>
      </footer>
    </article>
  );
}
