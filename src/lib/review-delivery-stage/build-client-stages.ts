/**
 * Package 7B1 — build customer-safe Review & Delivery stages payload.
 * Owns redaction: internal spine, feedback, communications, and files never leave.
 */

import type {
  CampaignCustomerStageSummaryId,
  ReviewDeliveryStageId,
  StageActionOwner,
} from "@/config/review-delivery-stage-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { findJobReviewFeedback } from "@/lib/job-control/review-room-view";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import { deriveCampaignCustomerStageSummary } from "./derive-campaign-summary";
import { deriveJobCustomerStage } from "./derive-job-stage";
import { hasUnsubmittedReviewDraft } from "./draft-progress";
import type { JobCustomerStageFacts } from "./types";

export type ClientStagesSummary = {
  summaryId: CampaignCustomerStageSummaryId;
  label: string;
  explanation: string;
};

export type ClientStagesJobItem = {
  jobId: string;
  serviceName: string;
  stageId: ReviewDeliveryStageId;
  label: string;
  explanation: string;
  actionOwner: StageActionOwner;
  blocksCampaignCustomerAction: boolean;
  terminal: boolean;
};

export type ClientStagesResponse = {
  summary: ClientStagesSummary;
  jobs: readonly ClientStagesJobItem[];
};

export function buildJobCustomerStageFacts(
  job: PurchasedJobRecord,
  envelope: Pick<ServerTasksEnvelope, "jobReviewFeedback" | "jobCommunicationRecords">,
): JobCustomerStageFacts {
  const feedback = findJobReviewFeedback(
    envelope as ServerTasksEnvelope,
    job.jobId,
  );
  const hasPriorRevisionCycle = (envelope.jobCommunicationRecords ?? []).some(
    (record) =>
      record.jobId === job.jobId && record.eventType === "revision_ready_again",
  );

  return {
    spineStatus: job.spineStatus,
    ownerApprovalPending: job.ownerApprovalPending ?? null,
    hasUnsubmittedReviewDraft: hasUnsubmittedReviewDraft(feedback),
    hasPriorRevisionCycle,
  };
}

function toClientJobItem(
  job: PurchasedJobRecord,
  envelope: Pick<ServerTasksEnvelope, "jobReviewFeedback" | "jobCommunicationRecords">,
): ClientStagesJobItem {
  const stage = deriveJobCustomerStage(buildJobCustomerStageFacts(job, envelope));
  return {
    jobId: job.jobId,
    serviceName: job.serviceName,
    stageId: stage.stageId,
    label: stage.label,
    explanation: stage.explanation,
    actionOwner: stage.actionOwner,
    blocksCampaignCustomerAction: stage.blocksCampaignCustomerAction,
    terminal: stage.terminal,
  };
}

/**
 * Derives Package 7A stages and projects the customer-safe wire shape.
 * Call only after campaign ownership and job sync are established.
 */
export function buildClientStagesResponse(
  jobs: readonly PurchasedJobRecord[],
  envelope: Pick<ServerTasksEnvelope, "jobReviewFeedback" | "jobCommunicationRecords">,
): ClientStagesResponse {
  const derived = jobs.map((job) =>
    deriveJobCustomerStage(buildJobCustomerStageFacts(job, envelope)),
  );
  const summary = deriveCampaignCustomerStageSummary(derived);
  const clientJobs = jobs.map((job) => toClientJobItem(job, envelope));

  return {
    summary: {
      summaryId: summary.summaryId,
      label: summary.label,
      explanation: summary.explanation,
    },
    jobs: clientJobs,
  };
}

/** Forbidden keys that must never appear in the customer-safe JSON. */
export const CLIENT_STAGES_FORBIDDEN_KEYS = [
  "spineStatus",
  "JobSpineStatus",
  "ownerApprovalPending",
  "skuId",
  "serviceId",
  "internalNotes",
  "workingFileRefs",
  "clientDeliveryFiles",
  "fileRegistry",
  "deliverablePrep",
  "jobReviewFeedback",
  "jobCommunicationRecords",
  "storageRef",
  "storagePath",
  "staff",
] as const;
