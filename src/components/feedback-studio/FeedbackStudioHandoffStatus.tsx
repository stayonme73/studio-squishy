"use client";

import { useMemo } from "react";

import { resolveC8aHandoffPresentationLabel } from "@/config/c8a-review-handoff-presentation-v1";
import { feedbackStudio } from "@/config/feedback-studio";
import type { ClientReviewView } from "@/lib/job-control/review-room-view";
import { deriveJobCustomerStage } from "@/lib/review-delivery-stage/derive-job-stage";
import { hasUnsubmittedReviewDraft } from "@/lib/review-delivery-stage/draft-progress";

type Props = {
  review: ClientReviewView;
};

/**
 * C8a — presentation-only handoff status from 7A derivation.
 * Does not invent a second stage system.
 */
export default function FeedbackStudioHandoffStatus({ review }: Props) {
  const presentation = useMemo(() => {
    const stage = deriveJobCustomerStage({
      spineStatus: review.spineStatus,
      ownerApprovalPending: null,
      hasUnsubmittedReviewDraft: hasUnsubmittedReviewDraft(review.feedback),
      hasPriorRevisionCycle: review.revisionRoundsUsed > 0,
    });
    return {
      stageLabel: stage.label,
      ...resolveC8aHandoffPresentationLabel({
        stageId: stage.stageId,
        stageLabel: stage.label,
      }),
    };
  }, [review]);

  return (
    <div
      className="fs-status-card fs-status-card--handoff"
      aria-label={`${feedbackStudio.handoffStatus.label}: ${presentation.handoffLabel}`}
    >
      <span className="fs-status-card__label">{feedbackStudio.handoffStatus.label}</span>
      <span className="fs-status-card__value">{presentation.handoffLabel}</span>
      {presentation.usedMappedHandoff ? (
        <span className="fs-status-card__meta">{presentation.stageLabel}</span>
      ) : null}
    </div>
  );
}
