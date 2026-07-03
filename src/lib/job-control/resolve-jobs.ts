import type {
  ApprovedStudioPlanLineItem,
  CampaignRecord,
} from "@/config/studio-board";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
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

function lineSkuId(line: ApprovedStudioPlanLineItem): string {
  return (line.skuId ?? line.serviceId)!;
}

export function isJobIntakeComplete(campaign: CampaignRecord): boolean {
  if (campaign.routeMapContext) {
    return Boolean(campaign.routeMapIntakeSubmittedAt);
  }
  return Boolean(campaign.projectDetailsSubmittedAt);
}

function tasksForSku(
  tasks: readonly CampaignTaskItem[],
  skuId: string,
): CampaignTaskItem[] {
  return tasks.filter((task) => task.relatedServiceIds.includes(skuId as never));
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
): CampaignMaterialItem[] {
  return materials.filter(
    (item) =>
      isBlockingMaterialItem(item) && item.relatedServiceIds.includes(skuId as never),
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

  if (persisted?.spineStatus === "waiting_on_client") {
    return "waiting_on_client";
  }

  if (isWaitingOnClientForSku(exceptions, materials, skuId, tasks)) {
    return "waiting_on_client";
  }

  if (!intakeComplete) {
    return mapCampaignStatusToSpine(campaign.campaignStatus);
  }

  if (hasRevisionRequested(tasks, skuId)) {
    return "revision_requested";
  }

  if (persisted?.spineStatus === "ready_for_queue") {
    return "ready_for_queue";
  }

  if (persisted?.spineStatus === "building_concepts") {
    return "building_concepts";
  }

  if (persisted?.spineStatus === "ready_for_review") {
    return "ready_for_review";
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
    waitingOnClientSince: persisted?.waitingOnClientSince ?? null,
    lastClientResponseAt: persisted?.lastClientResponseAt ?? null,
    lastReminderSentAt: persisted?.lastReminderSentAt ?? null,
    returnLane: persisted?.returnLane,
    ownerApprovalPending: persisted?.ownerApprovalPending ?? null,
    nonRefundable:
      persisted?.nonRefundable ??
      Boolean(productionStarted || persisted?.productionStartedAt),
    refundEligibleAt: persisted?.refundEligibleAt ?? null,
    laneQueuedAt: persisted?.laneQueuedAt ?? now,
    deliverablePrep: persisted?.deliverablePrep,
    internalNotes: persisted?.internalNotes,
    workingFileRefs: persisted?.workingFileRefs,
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
  if (isJobPaused(job, tasks)) return false;
  return true;
}

function occupiesLaneCapacity(status: JobSpineStatus): boolean {
  return ACTIVE_LANE_SPINE_STATUSES.has(status);
}
