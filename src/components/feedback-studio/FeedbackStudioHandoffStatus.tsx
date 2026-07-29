"use client";

import { useMemo } from "react";

import { resolveC8aHandoffPresentationLabel } from "@/config/c8a-review-handoff-presentation-v1";
import { c8bReviewHandoffReceiptsV1 } from "@/config/c8b-review-handoff-receipts-v1";
import { feedbackStudio } from "@/config/feedback-studio";
import type { ClientReviewView } from "@/lib/job-control/review-room-view";
import { resolveC8bHandoffStep } from "@/lib/job-control/review-handoff-receipts";
import { deriveJobCustomerStage } from "@/lib/review-delivery-stage/derive-job-stage";
import { hasUnsubmittedReviewDraft } from "@/lib/review-delivery-stage/draft-progress";

type Props = {
  review: ClientReviewView;
};

/**
 * C8a/C8b — presentation-only handoff status.
 * 7A remains authoritative; C8b overlays receive/review chain from activity evidence.
 */
export default function FeedbackStudioHandoffStatus({ review }: Props) {
  const presentation = useMemo(() => {
    const stage = deriveJobCustomerStage({
      spineStatus: review.spineStatus,
      ownerApprovalPending: null,
      hasUnsubmittedReviewDraft: hasUnsubmittedReviewDraft(review.feedback),
      hasPriorRevisionCycle: review.revisionRoundsUsed > 0,
    });
    const c8a = resolveC8aHandoffPresentationLabel({
      stageId: stage.stageId,
      stageLabel: stage.label,
    });
    const c8b = resolveC8bHandoffStep({
      feedback: review.feedback,
      activity: review.activity,
      jobId: review.jobId,
    });
    return {
      stageLabel: stage.label,
      handoffLabel: c8b.currentLabel,
      usedMappedHandoff: c8a.usedMappedHandoff,
      chainLabels: c8b.chainLabels,
      currentStepId: c8b.currentStepId,
    };
  }, [review]);

  return (
    <div
      className="fs-status-card fs-status-card--handoff"
      aria-label={`${feedbackStudio.handoffStatus.label}: ${presentation.handoffLabel}`}
    >
      <span className="fs-status-card__label">
        {c8bReviewHandoffReceiptsV1.handoffChain.label}
      </span>
      <span className="fs-status-card__value">{presentation.handoffLabel}</span>
      <ol className="fs-handoff-chain" aria-label="Handoff sequence">
        {presentation.chainLabels.map((label) => {
          const isCurrent = label === presentation.handoffLabel;
          return (
            <li
              key={label}
              className={
                isCurrent
                  ? "fs-handoff-chain__step fs-handoff-chain__step--current"
                  : "fs-handoff-chain__step"
              }
            >
              {label}
            </li>
          );
        })}
      </ol>
      {presentation.usedMappedHandoff ? (
        <span className="fs-status-card__meta">{presentation.stageLabel}</span>
      ) : null}
    </div>
  );
}
