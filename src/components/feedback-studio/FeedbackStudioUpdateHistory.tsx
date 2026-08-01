"use client";

import { feedbackStudio } from "@/config/feedback-studio";
import type { CustomerUpdateHistoryItem } from "@/lib/job-control/customer-update-history";

type Props = {
  items: readonly CustomerUpdateHistoryItem[];
  /** When the job/review cannot be loaded in Final/Delivery. */
  unavailable?: boolean;
};

/** UPDATE-HISTORY-1 — truthful customer Update History in the unified room rail. */
export default function FeedbackStudioUpdateHistory({ items, unavailable }: Props) {
  const copy = feedbackStudio.updateHistory;
  const rows = items ?? [];

  return (
    <section
      className="fs-status-card fs-update-history"
      aria-label={copy.label}
    >
      <span className="fs-status-card__label">{copy.label}</span>
      {unavailable ? (
        <p className="fs-update-history__empty">{copy.unavailable}</p>
      ) : null}
      {!unavailable && rows.length === 0 ? (
        <p className="fs-update-history__empty">{copy.empty}</p>
      ) : null}
      {!unavailable && rows.length > 0 ? (
        <ol className="fs-update-history__list">
          {rows.map((item) => (
            <li key={item.id} className="fs-update-history__item">
              <div className="fs-update-history__meta">
                <time dateTime={item.occurredAt}>
                  {item.occurredAtLabel ?? "Time not available"}
                </time>
                <span>{item.actorLabel}</span>
              </div>
              <p className="fs-update-history__headline">{item.headline}</p>
              {item.versionLabel ? (
                <p className="fs-update-history__detail">
                  {copy.versionLabel}: {item.versionLabel}
                </p>
              ) : null}
              {item.detail ? (
                <p className="fs-update-history__detail">{item.detail}</p>
              ) : null}
              {item.actionRequired ? (
                <p className="fs-update-history__action">
                  <span className="fs-update-history__action-label">
                    {copy.actionRequiredLabel}
                  </span>
                  {item.actionRequired}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
