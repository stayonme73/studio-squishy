/**
 * Pure multi-job campaign summary — never erases per-job stages.
 */

import {
  CAMPAIGN_SUMMARY_COPY,
  REVIEW_DELIVERY_STAGE_DEFINITIONS,
  STAGE_FAMILY,
  type ReviewDeliveryStageFamily,
  type ReviewDeliveryStageId,
} from "@/config/review-delivery-stage-v1";

import type { CampaignCustomerStageSummary, JobCustomerStage } from "./types";

function isCancelled(stage: JobCustomerStage): boolean {
  return stage.stageId === "cancelled";
}

function familyOf(stageId: ReviewDeliveryStageId): ReviewDeliveryStageFamily {
  return STAGE_FAMILY[stageId];
}

function summaryFromStageId(
  stageId: ReviewDeliveryStageId,
  jobStages: readonly JobCustomerStage[],
): CampaignCustomerStageSummary {
  const def = REVIEW_DELIVERY_STAGE_DEFINITIONS[stageId];
  return {
    summaryId: stageId,
    label: def.label,
    explanation: def.explanation,
    jobStages,
  };
}

function pickReviewingSummary(
  active: readonly JobCustomerStage[],
  jobStages: readonly JobCustomerStage[],
): CampaignCustomerStageSummary {
  if (active.some((job) => job.stageId === "customer-reviewing")) {
    return summaryFromStageId("customer-reviewing", jobStages);
  }
  if (active.some((job) => job.stageId === "revised-work-ready")) {
    return summaryFromStageId("revised-work-ready", jobStages);
  }
  return summaryFromStageId("work-ready-for-review", jobStages);
}

function summaryForUniformFamily(
  family: ReviewDeliveryStageFamily,
  active: readonly JobCustomerStage[],
  jobStages: readonly JobCustomerStage[],
): CampaignCustomerStageSummary {
  switch (family) {
    case "waiting":
      return summaryFromStageId("waiting-on-you", jobStages);
    case "reviewing":
      return pickReviewingSummary(active, jobStages);
    case "studio-revision":
      return summaryFromStageId("revision-submitted", jobStages);
    case "studio-production":
      return summaryFromStageId("studio-working", jobStages);
    case "pre-delivery":
      return summaryFromStageId("approved-for-final-delivery", jobStages);
    case "delivered":
      return summaryFromStageId("final-delivery", jobStages);
    case "cancelled":
      return summaryFromStageId("cancelled", jobStages);
  }
}

/**
 * Deterministic campaign summary from already-derived per-job stages.
 * Always returns the full `jobStages` array unchanged in the result.
 */
export function deriveCampaignCustomerStageSummary(
  jobStages: readonly JobCustomerStage[],
): CampaignCustomerStageSummary {
  if (jobStages.length === 0) {
    return {
      summaryId: CAMPAIGN_SUMMARY_COPY["no-active-jobs"].summaryId,
      label: CAMPAIGN_SUMMARY_COPY["no-active-jobs"].label,
      explanation: CAMPAIGN_SUMMARY_COPY["no-active-jobs"].explanation,
      jobStages,
    };
  }

  const active = jobStages.filter((job) => !isCancelled(job));

  if (active.length === 0) {
    return summaryFromStageId("cancelled", jobStages);
  }

  if (active.every((job) => job.stageId === "final-delivery")) {
    return summaryFromStageId("final-delivery", jobStages);
  }

  // Customer blocker outranks Studio work and review invitations.
  if (active.some((job) => job.stageId === "waiting-on-you")) {
    return summaryFromStageId("waiting-on-you", jobStages);
  }

  const families = new Set(active.map((job) => familyOf(job.stageId)));
  if (families.size === 1) {
    const [family] = [...families];
    return summaryForUniformFamily(family, active, jobStages);
  }

  return {
    summaryId: CAMPAIGN_SUMMARY_COPY["project-in-progress"].summaryId,
    label: CAMPAIGN_SUMMARY_COPY["project-in-progress"].label,
    explanation: CAMPAIGN_SUMMARY_COPY["project-in-progress"].explanation,
    jobStages,
  };
}
