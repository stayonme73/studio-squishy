/**
 * C8a — presentation-only map from Package 7A stage IDs to locked C #7 handoff wording.
 * Does not replace 7A derivation. Unknown / unmapped stages keep the 7A label.
 */

import type { ReviewDeliveryStageId } from "@/config/review-delivery-stage-v1";

/** Locked C #7 handoff labels used only for customer-facing presentation. */
export const C8A_HANDOFF_PRESENTATION_LABEL = {
  updateInProgress: "Update in progress",
  submittedToCustomer: "Submitted to customer",
  receivedByCustomer: "Received by customer",
  customerReviewing: "Customer reviewing",
  feedbackReturned: "Feedback returned",
  approved: "Approved",
  delivered: "Delivered",
} as const;

/**
 * Map 7A stage → approved handoff wording when a clear overlay exists.
 * `waiting-on-you` and `cancelled` stay on 7A labels (outside the 7-step chain).
 * Receive is not separately tracked in 7A — ready-for-review stages present as submitted.
 */
export const C8A_HANDOFF_FROM_7A_STAGE: Partial<
  Record<ReviewDeliveryStageId, string>
> = {
  "studio-working": C8A_HANDOFF_PRESENTATION_LABEL.updateInProgress,
  "work-ready-for-review": C8A_HANDOFF_PRESENTATION_LABEL.submittedToCustomer,
  "revised-work-ready": C8A_HANDOFF_PRESENTATION_LABEL.submittedToCustomer,
  "customer-reviewing": C8A_HANDOFF_PRESENTATION_LABEL.customerReviewing,
  "revision-submitted": C8A_HANDOFF_PRESENTATION_LABEL.feedbackReturned,
  "approved-for-final-delivery": C8A_HANDOFF_PRESENTATION_LABEL.approved,
  "final-delivery": C8A_HANDOFF_PRESENTATION_LABEL.delivered,
};

export function resolveC8aHandoffPresentationLabel(input: {
  stageId: ReviewDeliveryStageId;
  stageLabel: string;
}): { handoffLabel: string; usedMappedHandoff: boolean } {
  const mapped = C8A_HANDOFF_FROM_7A_STAGE[input.stageId];
  if (mapped) {
    return { handoffLabel: mapped, usedMappedHandoff: true };
  }
  return { handoffLabel: input.stageLabel, usedMappedHandoff: false };
}
