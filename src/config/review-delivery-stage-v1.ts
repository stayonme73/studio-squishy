/**
 * Review & Delivery Stage Truth Contract v1 — customer stage vocabulary.
 *
 * Pure presentation contract. Not wired into Studio Board, Review Room,
 * Final Delivery, or Project Record UI in Package 7A.
 *
 * @see docs/review-delivery-stage-contract-v1.md
 * @see src/lib/review-delivery-stage/
 */

import type { JobSpineStatus } from "@/lib/job-control/types";

export const reviewDeliveryStageV1 = {
  version: 1 as const,
  packageId: "package-7a-review-delivery-stage-truth",
} as const;

/** Customer-facing Review & Delivery stage IDs. */
export type ReviewDeliveryStageId =
  | "studio-working"
  | "work-ready-for-review"
  | "customer-reviewing"
  | "revision-submitted"
  | "revised-work-ready"
  | "approved-for-final-delivery"
  | "final-delivery"
  | "waiting-on-you"
  | "cancelled";

/** Campaign summary may add two aggregate-only ids. */
export type CampaignCustomerStageSummaryId =
  | ReviewDeliveryStageId
  | "project-in-progress"
  | "no-active-jobs";

export type StageActionOwner = "studio" | "customer" | "complete" | "none";

export type ReviewDeliveryStageDefinition = {
  stageId: ReviewDeliveryStageId;
  label: string;
  explanation: string;
  actionOwner: StageActionOwner;
  /** True when this job requires a customer move before progress continues. */
  blocksCampaignCustomerAction: boolean;
  terminal: boolean;
};

export const REVIEW_DELIVERY_STAGE_DEFINITIONS: Record<
  ReviewDeliveryStageId,
  ReviewDeliveryStageDefinition
> = {
  "studio-working": {
    stageId: "studio-working",
    label: "Studio Working",
    explanation: "The Studio owns the next move on this work.",
    actionOwner: "studio",
    blocksCampaignCustomerAction: false,
    terminal: false,
  },
  "work-ready-for-review": {
    stageId: "work-ready-for-review",
    label: "Work Ready for Review",
    explanation: "Work is available for your review.",
    actionOwner: "customer",
    blocksCampaignCustomerAction: true,
    terminal: false,
  },
  "customer-reviewing": {
    stageId: "customer-reviewing",
    label: "Customer Reviewing",
    explanation: "You have started reviewing this work but have not submitted a decision yet.",
    actionOwner: "customer",
    blocksCampaignCustomerAction: true,
    terminal: false,
  },
  "revision-submitted": {
    stageId: "revision-submitted",
    label: "Revision Submitted",
    explanation: "Your revision request is with the Studio.",
    actionOwner: "studio",
    blocksCampaignCustomerAction: false,
    terminal: false,
  },
  "revised-work-ready": {
    stageId: "revised-work-ready",
    label: "Revised Work Ready",
    explanation: "Revised work is ready for your review.",
    actionOwner: "customer",
    blocksCampaignCustomerAction: true,
    terminal: false,
  },
  "approved-for-final-delivery": {
    stageId: "approved-for-final-delivery",
    label: "Approved for Final Delivery",
    explanation: "This work is approved and the Studio is preparing final delivery.",
    actionOwner: "studio",
    blocksCampaignCustomerAction: false,
    terminal: false,
  },
  "final-delivery": {
    stageId: "final-delivery",
    label: "Final Delivery",
    explanation: "This work has been delivered.",
    actionOwner: "complete",
    blocksCampaignCustomerAction: false,
    terminal: true,
  },
  "waiting-on-you": {
    stageId: "waiting-on-you",
    label: "Waiting on You",
    explanation:
      "The Studio needs something from you before this work can continue.",
    actionOwner: "customer",
    blocksCampaignCustomerAction: true,
    terminal: false,
  },
  cancelled: {
    stageId: "cancelled",
    label: "Cancelled",
    explanation: "This work is no longer active.",
    actionOwner: "none",
    blocksCampaignCustomerAction: false,
    terminal: true,
  },
};

export const CAMPAIGN_SUMMARY_COPY = {
  "project-in-progress": {
    summaryId: "project-in-progress" as const,
    label: "Project in Progress",
    explanation: "Your project has work in multiple stages.",
  },
  "no-active-jobs": {
    summaryId: "no-active-jobs" as const,
    label: "No Active Work",
    explanation: "There is no active work on this project yet.",
  },
} as const;

/**
 * Spine → default stage (before review-draft / revision-cycle overlays).
 * Every JobSpineStatus is covered.
 */
export const SPINE_TO_DEFAULT_STAGE: Record<JobSpineStatus, ReviewDeliveryStageId> = {
  ready_for_queue: "studio-working",
  building_concepts: "studio-working",
  ready_for_review: "work-ready-for-review",
  revision_requested: "revision-submitted",
  approved: "approved-for-final-delivery",
  ready_for_delivery: "approved-for-final-delivery",
  delivered: "final-delivery",
  waiting_on_client: "waiting-on-you",
  refunded_cancelled: "cancelled",
};

/** Families used by campaign aggregation — same family may share one summary. */
export type ReviewDeliveryStageFamily =
  | "waiting"
  | "reviewing"
  | "studio-revision"
  | "studio-production"
  | "pre-delivery"
  | "delivered"
  | "cancelled";

export const STAGE_FAMILY: Record<ReviewDeliveryStageId, ReviewDeliveryStageFamily> = {
  "waiting-on-you": "waiting",
  "work-ready-for-review": "reviewing",
  "customer-reviewing": "reviewing",
  "revised-work-ready": "reviewing",
  "revision-submitted": "studio-revision",
  "studio-working": "studio-production",
  "approved-for-final-delivery": "pre-delivery",
  "final-delivery": "delivered",
  cancelled: "cancelled",
};
