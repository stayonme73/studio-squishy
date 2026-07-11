"use client";

import type { CustomerTimelineItem } from "@/lib/project-activity/types";

type Props = {
  events: readonly CustomerTimelineItem[];
  loading: boolean;
  error: string | null;
  emptyCopy: string;
  title: string;
};

export default function ProjectActivityCard({ events, loading, error, emptyCopy, title }: Props) {
  return (
    <section className="utility-card cd-card--activity" aria-labelledby="cd-activity-title">
      <h2 id="cd-activity-title" className="utility-card__title">
        {title}
      </h2>
      {loading ? <p className="cd-updates__hint">Loading project activity...</p> : null}
      {error ? (
        <p className="cd-updates__hint" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && events.length === 0 ? (
        <p className="cd-updates__hint">{emptyCopy}</p>
      ) : null}
      {!loading && !error && events.length > 0 ? (
        <ul className="cd-activity">
          {events.map((event) => (
            <li key={event.id} className="cd-activity__item">
              <time className="cd-activity__date" dateTime={event.occurredAt}>
                {new Date(event.occurredAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
              <div className="cd-activity__body">
                <p className="cd-activity__headline">{event.headline}</p>
                {event.detail ? <p className="cd-activity__detail">{event.detail}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
