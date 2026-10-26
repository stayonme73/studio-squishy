import type {
  ApprovedStudioPlanLineItem,
  CampaignRecord,
} from "@/config/studio-board";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import { lineSkuId } from "@/lib/approved-plan-line";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { isBlockingMaterialItem } from "@/lib/materials/materials-view";
import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";
import { isOpenExceptionStatus } from "@/lib/campaign-tasks/exceptions";
import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";

import { buildJobId, resolveControlLaneForSku } from "./lane-map";
import {
  ACTIVE_LANE_SPINE_STATUSES,
  isTerminalSpineStatus,
  mapCampaignStatusToSpine,
} from "./status-spine";
import type { JobSpineStatus, PurchasedJobRecord } from "./types";

export function isJobIntakeComplete(campaign: CampaignRecord): boolean {
  return Boolean(
    campaign.routeMapIntakeSubmittedAt || campaign.projectDetailsSubmittedAt,
  );
}

function tasksForSku(
  tasks: readonly CampaignTaskItem[],
  skuId: string,
): CampaignTaskItem[] {
  return tasks.filter((task) => task.relatedServiceIds.includes(skuId as never));
}

/**
 * Production execution already underway. A copied Building Concepts label,
 * payment, and intake are not evidence. Incomplete start metadata still counts
 * when tasks, files, QA authorization, or the start action itself are present.
 */
export function jobHasProductionExecutionEvidence(
  job: Pick<
    PurchasedJobRecord,
    | "skuId"
    | "productionStartedAt"
    | "spineStatusReason"
    | "workPackets"
    | "clientDeliveryFiles"
    | "deliverablePrep"
    | "internalQaReviewAuthorization"
    | "fileRegistry"
  >,
  tasks: readonly CampaignTaskItem[],
): boolean {
  if (job.productionStartedAt) return true;
  if (hasProductionStartedForSku(tasks, job.skuId)) return true;
  if ((job.workPackets ?? []).some((packet) => packet.assignmentEvents.length > 0 || packet.returnedFileRefs.length > 0)) {
    return true;
  }
  if ((job.clientDeliveryFiles ?? []).length > 0) return true;
  if ((job.deliverablePrep ?? []).some((item) => Boolean(item.preparedAt))) return true;
  if (job.internalQaReviewAuthorization?.status === "ELIGIBLE_FOR_REVIEW") return true;
  if ((job.fileRegistry ?? []).length > 0) return true;
  return /started building concepts/i.test(job.spineStatusReason ?? "");
}

export function hasProductionStartedForSku(
  tasks: readonly CampaignTaskItem[],
  skuId: string,
): boolean {
  return tasksForSku(tasks, skuId).some((task) => {
    const state = task.workflowState ?? "unstarted";
    return (
      state === "in_progress" ||
      state === "ready_for_qa" ||
      state === "needs_revision" ||
      state === "complete"
    );
  });
}

function hasRevisionRequested(
  tasks: readonly CampaignTaskItem[],
  skuId: string,
): boolean {
  return tasksForSku(tasks, skuId).some((task) => task.workflowState === "needs_revision");
}

function isSkuBlocked(
  tasks: readonly CampaignTaskItem[],
  skuId: string,
): boolean {
  return tasksForSku(tasks, skuId).some(
    (task) => task.workflowState === "blocked" || task.status === "blocked",
  );
}

export function blockingMaterialsForSku(
  materials: readonly CampaignMaterialItem[],
  skuId: string,
  campaignId = "unknown-campaign",
): CampaignMaterialItem[] {
  return materials.filter(
    (item) =>
      isBlockingMaterialItem(item, campaignId) &&
      item.relatedServiceIds.includes(skuId as never),
  );
}

function isWaitingOnClientForSku(
  exceptions: readonly CampaignExceptionRecord[],
  materials: readonly CampaignMaterialItem[],
  skuId: string,
  tasks: readonly CampaignTaskItem[],
): boolean {
  const taskIds = new Set(tasksForSku(tasks, skuId).map((t) => t.id));
  for (const record of exceptions) {
    if (!isOpenExceptionStatus(record.status)) continue;
    if (record.status !== "waiting_client") continue;
    if (record.taskId && taskIds.has(record.taskId)) return true;
  }
  return blockingMaterialsForSku(materials, skuId).length > 0;
}

function hasPresentedClientReviewProofs(
  job: PurchasedJobRecord | undefined,
): boolean {
  return Boolean(
    job?.fileRegistry?.some(
      (ref) =>
        ref.category === "review_proof" && ref.visibility === "client_visible",
    ),
  );
}

function deriveSpineStatus(
  campaign: CampaignRecord,
  skuId: string,
  tasks: readonly CampaignTaskItem[],
  materials: readonly CampaignMaterialItem[],
  exceptions: readonly CampaignExceptionRecord[],
  persisted: PurchasedJobRecord | undefined,
  intakeComplete: boolean,
): JobSpineStatus {
  if (persisted && isTerminalSpineStatus(persisted.spineStatus)) {
    return persisted.spineStatus;
  }

  if (hasPresentedClientReviewProofs(persisted)) {
    if (persisted?.spineStatus === "revision_requested") {
      return "revision_requested";
    }
    if (
      persisted?.spineStatus === "approved" ||
      persisted?.spineStatus === "ready_for_delivery" ||
      persisted?.spineStatus === "delivered"
    ) {
      return persisted.spineStatus;
    }
    return "ready_for_review";
  }

  if (isWaitingOnClientForSku(exceptions, materials, skuId, tasks)) {
    return "waiting_on_client";
  }

  if (persisted?.spineStatus === "waiting_on_client") {
    if (persisted.productionStartedAt || hasProductionStartedForSku(tasks, skuId)) {
      return "building_concepts";
    }
    return "ready_for_queue";
  }

  if (!intakeComplete) {
    return mapCampaignStatusToSpine(campaign.campaignStatus);
  }

  if (hasRevisionRequested(tasks, skuId)) {
    const qaReady =
      persisted?.spineStatus === "ready_for_review" &&
      persisted.internalQaReviewAuthorization?.status === "ELIGIBLE_FOR_REVIEW";
    if (!qaReady) {
      return "revision_requested";
    }
  }

  if (persisted?.spineStatus === "ready_for_queue") {
    return "ready_for_queue";
  }

  if (persisted?.spineStatus === "building_concepts") {
    if (jobHasProductionExecutionEvidence(persisted, tasks)) return "building_concepts";
    return "ready_for_queue";
  }

  if (persisted?.spineStatus === "ready_for_review") {
    return "ready_for_review";
  }

  if (persisted?.spineStatus === "revision_requested") {
    return "revision_requested";
  }

  if (persisted?.spineStatus === "approved") {
    return "approved";
  }

  if (persisted?.spineStatus === "ready_for_delivery") {
    return "ready_for_delivery";
  }

  if (campaign.selectedCampaignOption?.trim()) {
    if (campaign.campaignStatus === "DELIVERED") return "delivered";
    if (campaign.campaignStatus === "READY_FOR_REVIEW") return "ready_for_review";
    return "approved";
  }

  if (!hasProductionStartedForSku(tasks, skuId) && !persisted?.productionStartedAt) {
    return "ready_for_queue";
  }

  return mapCampaignStatusToSpine(campaign.campaignStatus);
}

export function buildPurchasedJobRecord(
  campaign: CampaignRecord,
  line: ApprovedStudioPlanLineItem,
  tasks: readonly CampaignTaskItem[],
  materials: readonly CampaignMaterialItem[],
  exceptions: readonly CampaignExceptionRecord[],
  persisted: PurchasedJobRecord | undefined,
  now = new Date().toISOString(),
): PurchasedJobRecord {
  const skuId = lineSkuId(line) as PurchasedJobRecord["skuId"];
  const jobId = buildJobId(campaign.campaignId, skuId);
  const intakeComplete = isJobIntakeComplete(campaign);
  const productionStarted = hasProductionStartedForSku(tasks, skuId);
  const spineStatus = deriveSpineStatus(
    campaign,
    skuId,
    tasks,
    materials,
    exceptions,
    persisted,
    intakeComplete,
  );

  const wasWaitingOnClient = persisted?.spineStatus === "waiting_on_client";
  const leftWaitingTray = wasWaitingOnClient && spineStatus !== "waiting_on_client";

  return {
    jobId,
    campaignId: campaign.campaignId,
    skuId,
    serviceName: line.serviceName ?? line.name ?? skuId,
    spineStatus,
    productionLane: persisted?.returnLane ?? resolveControlLaneForSku(skuId),
    spineStatusSetAt: persisted?.spineStatusSetAt,
    spineStatusSetBy: persisted?.spineStatusSetBy,
    spineStatusReason: persisted?.spineStatusReason,
    intakeComplete,
    productionStartedAt:
      persisted?.productionStartedAt ??
      (productionStarted ? now : null),
    waitingOnClientSince:
      spineStatus === "waiting_on_client" ? persisted?.waitingOnClientSince ?? null : null,
    lastClientResponseAt: persisted?.lastClientResponseAt ?? null,
    lastReminderSentAt: persisted?.lastReminderSentAt ?? null,
    returnLane: leftWaitingTray ? undefined : persisted?.returnLane,
    ownerApprovalPending: persisted?.ownerApprovalPending ?? null,
    ownerAskResumeGate: persisted?.ownerAskResumeGate ?? null,
    ownerInternalResumeGate: persisted?.ownerInternalResumeGate ?? null,
    nonRefundable:
      persisted?.nonRefundable ??
      Boolean(productionStarted || persisted?.productionStartedAt),
    refundEligibleAt: persisted?.refundEligibleAt ?? null,
    refundOwnerDecisionAt: persisted?.refundOwnerDecisionAt ?? null,
    refundApprovedAmountCents: persisted?.refundApprovedAmountCents ?? null,
    refundExecution: persisted?.refundExecution ?? null,
    heavyLaneOwnerDecision: persisted?.heavyLaneOwnerDecision ?? null,
    heavyLaneBumpRequested: persisted?.heavyLaneBumpRequested ?? false,
    laneQueuedAt: leftWaitingTray ? now : persisted?.laneQueuedAt ?? now,
    deliverablePrep: persisted?.deliverablePrep,
    internalNotes: persisted?.internalNotes,
    workingFileRefs: persisted?.workingFileRefs,
    workPackets: persisted?.workPackets,
    acceptanceReview: persisted?.acceptanceReview,
    internalQaReviewAuthorization: persisted?.internalQaReviewAuthorization,
    customerApprovedArtifactAuthorization: persisted?.customerApprovedArtifactAuthorization,
    finalDeliveryAuthorization: persisted?.finalDeliveryAuthorization,
    fileRegistry: persisted?.fileRegistry,
    clientDeliveryFiles: persisted?.clientDeliveryFiles,
    deliveredAt: persisted?.deliveredAt ?? null,
    clientDeadline: persisted?.clientDeadline ?? null,
    updatedAt: now,
  };
}

export function syncJobRecordsFromCampaign(
  campaign: CampaignRecord,
  tasks: readonly CampaignTaskItem[],
  materials: readonly CampaignMaterialItem[],
  exceptions: readonly CampaignExceptionRecord[],
  existing: readonly PurchasedJobRecord[] | undefined,
  now = new Date().toISOString(),
): PurchasedJobRecord[] {
  const plan = campaign.approvedStudioPlan;
  if (!plan?.lineItems.length) return [...(existing ?? [])];

  const existingByJobId = new Map((existing ?? []).map((job) => [job.jobId, job]));
  const productionLines = filterProductionPlanLineItems(plan);

  return productionLines.map((line) =>
    buildPurchasedJobRecord(
      campaign,
      line,
      tasks,
      materials,
      exceptions,
      existingByJobId.get(buildJobId(campaign.campaignId, lineSkuId(line) as never)),
      now,
    ),
  );
}

export function isJobPaused(job: PurchasedJobRecord, tasks: readonly CampaignTaskItem[]): boolean {
  return isSkuBlocked(tasks, job.skuId);
}

export function jobCountsTowardLaneCapacity(
  job: PurchasedJobRecord,
  tasks: readonly CampaignTaskItem[],
): boolean {
  if (!job.intakeComplete) return false;
  if (job.spineStatus === "waiting_on_client") return false;
  if (!occupiesLaneCapacity(job.spineStatus)) return false;
  if (job.spineStatus === "building_concepts" && !jobHasProductionExecutionEvidence(job, tasks)) {
    return false;
  }
  if (isJobPaused(job, tasks)) return false;
  return true;
}

function occupiesLaneCapacity(status: JobSpineStatus): boolean {
  return ACTIVE_LANE_SPINE_STATUSES.has(status);
}
