/**
 * Package 7A — Review & Delivery stage derivation types.
 * @see docs/review-delivery-stage-contract-v1.md
 */

import type {
  CampaignCustomerStageSummaryId,
  ReviewDeliveryStageId,
  StageActionOwner,
} from "@/config/review-delivery-stage-v1";
import type { JobSpineStatus } from "@/lib/job-control/types";

/**
 * Evidence-backed inputs for job stage derivation.
 *
 * Sources:
 * - `spineStatus` → `PurchasedJobRecord.spineStatus`
 * - `ownerApprovalPending` → `PurchasedJobRecord.ownerApprovalPending`
 *   (existing field; used only when present — see contract limitations)
 * - `hasUnsubmittedReviewDraft` → derived from `JobReviewFeedback` via
 *   `hasUnsubmittedReviewDraft()`
 * - `hasPriorRevisionCycle` → caller-supplied durable per-job evidence only
 *   (e.g. job-scoped `revision_ready_again` communication). Never invent.
 */
export type JobCustomerStageFacts = {
  spineStatus: JobSpineStatus;
  /**
   * Exact field on `PurchasedJobRecord`. When `"before_review"`, the customer
   * cannot access Review Room (`canClientAccessJobReview`), so the contract
   * reports Studio Working instead of a review-ready stage.
   */
  ownerApprovalPending?: "before_review" | "before_delivery" | null;
  /** Material saved-but-unsubmitted review progress. */
  hasUnsubmittedReviewDraft?: boolean;
  /** Durable per-job prior revision cycle evidence. */
  hasPriorRevisionCycle?: boolean;
};

export type JobCustomerStage = {
  stageId: ReviewDeliveryStageId;
  label: string;
  explanation: string;
  actionOwner: StageActionOwner;
  blocksCampaignCustomerAction: boolean;
  terminal: boolean;
  /** Provenance — never shown raw as customer copy. */
  spineStatus: JobSpineStatus;
};

export type CampaignCustomerStageSummary = {
  summaryId: CampaignCustomerStageSummaryId;
  label: string;
  explanation: string;
  /** Per-job stages remain authoritative; summary never replaces them. */
  jobStages: readonly JobCustomerStage[];
};
