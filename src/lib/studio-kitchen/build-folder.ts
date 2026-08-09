import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import {
  campaignTasksConfig,
  effectiveStatusLabel,
} from "@/config/campaign-tasks";
import { ownerConsoleCampaignRoute } from "@/config/owner-console";
import { studioKitchenFoundation } from "@/config/studio-kitchen-foundation-v1";
import type { KitchenCampaign } from "@/config/studio-kitchen";
import { resolveFolderPlacement } from "@/config/studio-kitchen-file-room";
import {
  resolveCampaignDisplayName,
  resolveVisionData,
} from "@/lib/campaign-record";
import { resolveCampaignCustomerName } from "@/lib/campaign-vision";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import { isOpenExceptionStatus } from "@/lib/campaign-tasks/exceptions";
import {
  resolveLatestHandoffForTask,
  resolveQaSummaryForTask,
} from "@/lib/campaign-tasks/file-room-controls";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { isBlockingMaterialItem } from "@/lib/materials/materials-view";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { summarizeProductionContractForSku } from "@/lib/studio-kitchen-production";

import { jobSpineStatusLabel, projectKitchenBucketFromSpine } from "./status-projection";
import type {
  KitchenDataSource,
  KitchenJobProjection,
  KitchenProductionFolder,
  KitchenQaState,
  KitchenTaskProjection,
} from "./types";

const unavailable = studioKitchenFoundation.page.unavailableLabel;

function fileRoomHref(campaignId: string): string {
  return `/file-room/${encodeURIComponent(campaignId)}`;
}

function qaStateFromTask(
  taskId: string,
  envelope: ServerTasksEnvelope,
): KitchenQaState {
  const summary = resolveQaSummaryForTask(envelope.qaRecords, taskId);
  if (summary.total === 0) return "not_started";
  if (summary.blocks > 0) return "blocked";
  if (summary.fails > 0) return "failed";
  if (summary.passes > 0) return "passed";
  return "not_started";
}

function pickPrimaryJob(jobs: readonly KitchenJobProjection[]): KitchenJobProjection | null {
  if (jobs.length === 0) return null;
  const active = jobs.find(
    (job) => job.spineStatus !== "delivered" && job.spineStatus !== "refunded_cancelled",
  );
  return active ?? jobs[0] ?? null;
}

function nextActionFromState(input: {
  primaryJob: KitchenJobProjection | null;
  tasksRecorded: boolean;
  jobsRecorded: boolean;
  openExceptionCount: number;
  blockingMaterialCount: number;
  pendingOutboxCount: number;
}): string {
  if (!input.jobsRecorded) return studioKitchenFoundation.page.noJobsTitle;
  if (!input.tasksRecorded) return studioKitchenFoundation.page.noTasksTitle;
  if (input.blockingMaterialCount > 0) {
    return `${input.blockingMaterialCount} blocking material item(s)`;
  }
  if (input.openExceptionCount > 0) {
    return `${input.openExceptionCount} open exception(s)`;
  }
  if (input.pendingOutboxCount > 0) {
    return `${input.pendingOutboxCount} communication(s) pending send`;
  }
  if (!input.primaryJob) return unavailable;
  return jobSpineStatusLabel(input.primaryJob.spineStatus);
}

function waitingOnFromState(input: {
  primaryJob: KitchenJobProjection | null;
  blockingMaterialCount: number;
  openExceptionCount: number;
}): string {
  if (input.blockingMaterialCount > 0) return "Client materials";
  if (input.primaryJob?.spineStatus === "waiting_on_client") return "Client";
  if (input.openExceptionCount > 0) return "Internal exception";
  if (!input.primaryJob) return unavailable;
  if (input.primaryJob.ownerApprovalPending) return "Owner decision";
  return "Production";
}

function resolveClientLabel(campaign: CampaignRecord): string {
  const vision = resolveVisionData(campaign);
  if (vision) {
    const name = resolveCampaignCustomerName(vision);
    if (name) return name;
  }
  return unavailable;
}

export function buildKitchenProductionFolderFromLive(input: {
  envelope: ServerCampaignEnvelope;
  tasksEnvelope: ServerTasksEnvelope | null;
  materials: readonly CampaignMaterialItem[];
}): KitchenProductionFolder {
  const campaign = input.envelope.record;
  const tasks = input.tasksEnvelope?.tasks ?? [];
  const exceptions = input.tasksEnvelope?.exceptionRecords ?? [];
  const communications = input.tasksEnvelope?.jobCommunicationRecords ?? [];

  // In-memory sync only — viewing Kitchen must not persist a new production record.
  const jobs = input.tasksEnvelope
    ? syncJobRecordsFromCampaign(
        campaign,
        tasks,
        input.materials,
        exceptions,
        input.tasksEnvelope.jobRecords,
      )
    : [];

  const jobProjections: KitchenJobProjection[] = jobs.map((job) => ({
    jobId: job.jobId,
    skuId: job.skuId,
    serviceName: job.serviceName,
    spineStatus: job.spineStatus,
    spineStatusLabel: jobSpineStatusLabel(job.spineStatus),
    lane: job.productionLane ?? null,
    ownerApprovalPending: job.ownerApprovalPending ?? null,
    intakeComplete: job.intakeComplete,
    productionContract: summarizeProductionContractForSku(job.skuId),
  }));

  const primaryJob = pickPrimaryJob(jobProjections);

  const taskProjections: KitchenTaskProjection[] = input.tasksEnvelope
    ? tasks.map((task) => {
        const handoff = resolveLatestHandoffForTask(
          input.tasksEnvelope!.handoffs,
          task.id,
        );
        const role = task.assignedRole ?? task.responsibleRole ?? null;
        return {
          id: task.id,
          title: task.title,
          effectiveStatus: task.effectiveStatus ?? null,
          effectiveStatusLabel: task.effectiveStatus
            ? effectiveStatusLabel(task.effectiveStatus)
            : unavailable,
          workflowState: task.workflowState ?? null,
          responsibleRole: role,
          responsibleRoleLabel: role
            ? campaignTasksConfig.productionRoleLabels[role]
            : null,
          claimedByDisplayName: task.claimedByDisplayName ?? null,
          blockedReason: task.blockedReason ?? null,
          qaState: qaStateFromTask(task.id, input.tasksEnvelope!),
          latestHandoffSummary: handoff.latestSummary,
        };
      })
    : [];

  const openExceptionCount = exceptions.filter((record) =>
    isOpenExceptionStatus(record.status),
  ).length;
  const blockingMaterialCount = input.materials.filter(isBlockingMaterialItem).length;
  const pendingOutboxCount = communications.filter(
    (record) => record.deliveryStatus === "pending_owner_send",
  ).length;

  const hasBlockingMaterials = blockingMaterialCount > 0;
  const placement = primaryJob
    ? projectKitchenBucketFromSpine({
        spineStatus: primaryJob.spineStatus,
        ownerApprovalPending: primaryJob.ownerApprovalPending,
        intakeComplete: primaryJob.intakeComplete,
        hasBlockingMaterials,
      })
    : {
        folderLocation: "bucket" as const,
        homeBucketId: "intake-received" as const,
        trayId: null,
        projectionKind: "job_spine" as const,
      };

  const assignee =
    taskProjections.find((task) => task.claimedByDisplayName)?.claimedByDisplayName ??
    taskProjections.find((task) => task.responsibleRoleLabel)?.responsibleRoleLabel ??
    null;

  const honesty = {
    tasksRecorded: Boolean(input.tasksEnvelope),
    jobsRecorded: jobProjections.length > 0,
    dueDateRecorded: false,
    assigneeRecorded: Boolean(assignee),
    materialsRecorded: input.materials.length > 0,
  };

  return {
    source: "live_production",
    campaignId: campaign.campaignId,
    campaignName: resolveCampaignDisplayName(campaign),
    clientLabel: resolveClientLabel(campaign),
    campaignStatusLabel:
      studioBoard.statusContent[campaign.campaignStatus]?.statusLabel ??
      campaign.campaignStatus,
    fileRoomHref: fileRoomHref(campaign.campaignId),
    ownerConsoleHref: ownerConsoleCampaignRoute(campaign.campaignId),
    jobs: jobProjections,
    primaryJob,
    tasks: taskProjections,
    openExceptionCount,
    blockingMaterialCount,
    pendingOutboxCount,
    placement,
    nextActionLabel: nextActionFromState({
      primaryJob,
      tasksRecorded: honesty.tasksRecorded,
      jobsRecorded: honesty.jobsRecorded,
      openExceptionCount,
      blockingMaterialCount,
      pendingOutboxCount,
    }),
    waitingOnLabel: waitingOnFromState({
      primaryJob,
      blockingMaterialCount,
      openExceptionCount,
    }),
    assignedToLabel: assignee ?? unavailable,
    dueLabel: unavailable,
    honesty,
    updatedAt: input.envelope.syncedAt ?? input.tasksEnvelope?.syncedAt ?? null,
  };
}

/** Fixture adapter — labeled demo only; never selected when live data exists. */
export function buildKitchenProductionFolderFromFixture(
  campaign: KitchenCampaign,
): KitchenProductionFolder {
  const placement = resolveFolderPlacement(campaign);
  return {
    source: "fixture_demo",
    campaignId: campaign.id,
    campaignName: campaign.campaignName,
    clientLabel: campaign.clientName,
    campaignStatusLabel: campaign.statusLabel,
    fileRoomHref: fileRoomHref(campaign.id),
    ownerConsoleHref: ownerConsoleCampaignRoute(campaign.id),
    jobs: [],
    primaryJob: null,
    tasks: [],
    openExceptionCount: 0,
    blockingMaterialCount: 0,
    pendingOutboxCount: 0,
    placement: {
      folderLocation: placement.folderLocation,
      homeBucketId: placement.homeBucketId,
      trayId: placement.trayId,
      projectionKind: "fixture",
    },
    nextActionLabel: campaign.nextAction,
    waitingOnLabel: campaign.waitingOn,
    assignedToLabel: campaign.assignedTo,
    dueLabel: unavailable,
    honesty: {
      tasksRecorded: false,
      jobsRecorded: false,
      dueDateRecorded: false,
      assigneeRecorded: Boolean(campaign.assignedTo),
      materialsRecorded: false,
    },
    updatedAt: null,
  };
}

export function kitchenDataSourceLabel(source: KitchenDataSource): string {
  return source === "live_production"
    ? studioKitchenFoundation.page.liveBadge
    : studioKitchenFoundation.page.fixtureBadge;
}
