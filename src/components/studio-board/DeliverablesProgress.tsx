import Link from "next/link";

import { studioBoard, type CampaignStatus } from "@/config/studio-board";
import type { DeliverableRemainingItem } from "@/lib/campaign-record";

const { deliverablesCard: copy, routes } = studioBoard;

type Props = {
  items: readonly DeliverableRemainingItem[];
  campaignStatus: CampaignStatus | null;
};

function progressLabel(item: DeliverableRemainingItem) {
  if (item.total <= 0) return copy.completeLabel;
  if (item.delivered >= item.total) return copy.completeLabel;
  return `${item.delivered}/${item.total} ${copy.completeLabel}`;
}

/** Deliverable progress bars with download links when delivered. */
export default function DeliverablesProgress({ items, campaignStatus }: Props) {
  const downloadsAvailable = campaignStatus === "DELIVERED";

  if (items.length === 0) {
    return <p className="sb-deliverables-progress__empty">Deliverables appear once your campaign begins.</p>;
  }

  return (
    <div className="sb-deliverables-progress-wrap">
      <ul className="sb-deliverables-progress" aria-label={copy.heading}>
        {items.map((item) => {
          const ratio = item.total > 0 ? item.delivered / item.total : 0;
          const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
          const isComplete = item.total > 0 && item.delivered >= item.total;

          return (
            <li key={item.id} className="sb-deliverables-progress__item">
              <div className="sb-deliverables-progress__head">
                <span className="sb-deliverables-progress__label">{item.label}</span>
                <span
                  className={`sb-deliverables-progress__count${
                    isComplete ? " sb-deliverables-progress__count--complete" : ""
                  }`}
                >
                  {progressLabel(item)}
                </span>
              </div>
              <div
                className="sb-deliverables-progress__track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={item.total}
                aria-valuenow={item.delivered}
                aria-label={`${item.label} progress`}
              >
                <div className="sb-deliverables-progress__fill" style={{ width: `${percent}%` }} />
              </div>
              {downloadsAvailable && isComplete ? (
                <Link href={routes.deliverables} className="sb-deliverables-progress__download">
                  Download →
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
      {downloadsAvailable ? (
        <Link href={routes.deliverables} className="utility-btn utility-btn--primary sb-deliverables-progress__cta">
          Open Final Delivery →
        </Link>
      ) : null}
    </div>
  );
}
