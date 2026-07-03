import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import { resolveFileRoomListItemView } from "@/lib/file-room-view";
import type { OwnerConsoleCampaignBundle } from "@/lib/campaign-tasks/owner-console-view";

import { mergeActivityEvents, deriveBaselineActivityEvents } from "./activity-log";
import {
  resolveProductionLaneViews,
  type ProductionLaneView,
  type LaneCapacityInput,
} from "./capacity";
import { resolveOwnerDeskItems, type OwnerDeskInput, type OwnerDeskItem } from "./owner-desk";
import { syncJobRecordsFromCampaign } from "./resolve-jobs";
import {
  applyWaitingOnClientPolicies,
  buildWaitingOnClientTrayItem,
  type WaitingOnClientTrayItem,
} from "./waiting-on-client";
import type { JobActivityEvent, PurchasedJobRecord } from "./types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

export type OwnerControlRoomView = {
  ownerDesk: readonly OwnerDeskItem[];
  lanes: readonly ProductionLaneView[];
  waitingOnClient: readonly WaitingOnClientTrayItem[];
  activity: readonly JobActivityEvent[];
  jobs: readonly PurchasedJobRecord[];
  jobCount: number;
  campaignsWithJobs: number;
};

export function resolveOwnerControlRoomFromBundle(
  bundle: OwnerConsoleCampaignBundle,
  nowMs = Date.now(),
): {
  jobs: PurchasedJobRecord[];
  activity: JobActivityEvent[];
  laneInputs: LaneCapacityInput[];
  waitingTray: WaitingOnClientTrayItem[];
  deskInput: {
    campaignId: string;
    campaignName: string;
    jobs: PurchasedJobRecord[];
    exceptions: NonNullable<ServerTasksEnvelope["exceptionRecords"]>;
    laneViews: ProductionLaneView[];
  };
} {
  const listItem = resolveFileRoomListItemView(bundle.envelope);
  const tasks = bundle.tasksEnvelope.tasks ?? [];
  const materials = bundle.materials ?? [];
  const exceptions = bundle.tasksEnvelope.exceptionRecords ?? [];

  const synced = syncJobRecordsFromCampaign(
    bundle.envelope.record,
    tasks,
    materials,
    exceptions,
    bundle.tasksEnvelope.jobRecords,
  );

  const jobs = applyWaitingOnClientPolicies(synced, materials, nowMs);

  const activity = mergeActivityEvents(
    bundle.tasksEnvelope.jobActivityEvents,
    deriveBaselineActivityEvents(
      bundle.envelope.record,
      jobs,
      materials,
      bundle.tasksEnvelope.exceptionEvents,
    ),
  );

  const laneInputs: LaneCapacityInput[] = jobs.map((job) => ({
    campaignName: listItem.campaignName,
    job,
    tasks,
  }));

  const laneViews = resolveProductionLaneViews(laneInputs);

  const waitingTray = jobs
    .map((job) => buildWaitingOnClientTrayItem(job, listItem.campaignName, materials, nowMs))
    .filter((item): item is WaitingOnClientTrayItem => item !== null);

  return {
    jobs,
    activity,
    laneInputs,
    waitingTray,
    deskInput: {
      campaignId: listItem.campaignId,
      campaignName: listItem.campaignName,
      jobs,
      exceptions,
      laneViews,
    },
  };
}

export function resolveOwnerControlRoomView(
  bundles: readonly OwnerConsoleCampaignBundle[],
  nowMs = Date.now(),
): OwnerControlRoomView {
  const allJobs: PurchasedJobRecord[] = [];
  const allActivity: JobActivityEvent[] = [];
  const allLaneInputs: LaneCapacityInput[] = [];
  const allWaiting: WaitingOnClientTrayItem[] = [];
  const deskInputs: OwnerDeskInput[] = [];

  for (const bundle of bundles) {
    const resolved = resolveOwnerControlRoomFromBundle(bundle, nowMs);
    allJobs.push(...resolved.jobs);
    allActivity.push(...resolved.activity);
    allLaneInputs.push(...resolved.laneInputs);
    allWaiting.push(...resolved.waitingTray);
    deskInputs.push(resolved.deskInput);
  }

  const lanes = resolveProductionLaneViews(allLaneInputs);
  const ownerDesk = resolveOwnerDeskItems(deskInputs);
  const activity = mergeActivityEvents(undefined, allActivity);
  const campaignIds = new Set(allJobs.map((job) => job.campaignId));

  return {
    ownerDesk,
    lanes,
    waitingOnClient: allWaiting,
    activity,
    jobs: allJobs,
    jobCount: allJobs.length,
    campaignsWithJobs: campaignIds.size,
  };
}

/** Persisted job state to write back when policies auto-transition. */
export function collectJobRecordUpdates(
  bundles: readonly OwnerConsoleCampaignBundle[],
  nowMs = Date.now(),
): Map<string, PurchasedJobRecord[]> {
  const updates = new Map<string, PurchasedJobRecord[]>();
  for (const bundle of bundles) {
    const { jobs } = resolveOwnerControlRoomFromBundle(bundle, nowMs);
    const prior = bundle.tasksEnvelope.jobRecords ?? [];
    if (JSON.stringify(prior) !== JSON.stringify(jobs)) {
      updates.set(bundle.envelope.campaignId, jobs);
    }
  }
  return updates;
}

export function filterBundlesForControlRoom(
  bundles: readonly OwnerConsoleCampaignBundle[],
): OwnerConsoleCampaignBundle[] {
  return bundles.filter(
    (bundle) =>
      Boolean(bundle.envelope.record.approvedStudioPlan?.lineItems.length) &&
      Boolean(bundle.envelope.record.paymentReceivedAt),
  );
}
