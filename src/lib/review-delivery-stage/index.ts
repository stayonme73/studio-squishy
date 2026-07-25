/**
 * Package 7A — Review & Delivery Stage Truth Contract.
 * Additive only — not imported by customer UI surfaces in this package.
 */

export {
  CAMPAIGN_SUMMARY_COPY,
  REVIEW_DELIVERY_STAGE_DEFINITIONS,
  SPINE_TO_DEFAULT_STAGE,
  STAGE_FAMILY,
  reviewDeliveryStageV1,
  type CampaignCustomerStageSummaryId,
  type ReviewDeliveryStageDefinition,
  type ReviewDeliveryStageFamily,
  type ReviewDeliveryStageId,
  type StageActionOwner,
} from "@/config/review-delivery-stage-v1";

export { deriveCampaignCustomerStageSummary } from "./derive-campaign-summary";
export { deriveJobCustomerStage } from "./derive-job-stage";
export { hasUnsubmittedReviewDraft } from "./draft-progress";
export type {
  CampaignCustomerStageSummary,
  JobCustomerStage,
  JobCustomerStageFacts,
} from "./types";
