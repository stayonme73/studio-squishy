/**
 * Pure per-job customer stage derivation from JobSpineStatus + evidence facts.
 */

import {
  REVIEW_DELIVERY_STAGE_DEFINITIONS,
  SPINE_TO_DEFAULT_STAGE,
  type ReviewDeliveryStageId,
} from "@/config/review-delivery-stage-v1";

import type { JobCustomerStage, JobCustomerStageFacts } from "./types";

function stageFromId(
  stageId: ReviewDeliveryStageId,
  spineStatus: JobCustomerStageFacts["spineStatus"],
): JobCustomerStage {
  const def = REVIEW_DELIVERY_STAGE_DEFINITIONS[stageId];
  return {
    stageId: def.stageId,
    label: def.label,
    explanation: def.explanation,
    actionOwner: def.actionOwner,
    blocksCampaignCustomerAction: def.blocksCampaignCustomerAction,
    terminal: def.terminal,
    spineStatus,
  };
}

/**
 * Resolves the customer-facing stage for one job.
 * Per-job truth is authoritative — campaign summaries must not replace this.
 */
export function deriveJobCustomerStage(
  facts: JobCustomerStageFacts,
): JobCustomerStage {
  const { spineStatus } = facts;

  // Owner still holds the release-to-client gate — customer cannot review yet.
  // Source: PurchasedJobRecord.ownerApprovalPending + canClientAccessJobReview.
  if (
    spineStatus === "ready_for_review" &&
    facts.ownerApprovalPending === "before_review"
  ) {
    return stageFromId("studio-working", spineStatus);
  }

  if (spineStatus === "ready_for_review") {
    // Draft progress wins over first-vs-revised labeling.
    if (facts.hasUnsubmittedReviewDraft) {
      return stageFromId("customer-reviewing", spineStatus);
    }
    // Revised Work Ready only with durable per-job evidence.
    if (facts.hasPriorRevisionCycle) {
      return stageFromId("revised-work-ready", spineStatus);
    }
    return stageFromId("work-ready-for-review", spineStatus);
  }

  const defaultStage = SPINE_TO_DEFAULT_STAGE[spineStatus];
  return stageFromId(defaultStage, spineStatus);
}
