/**
 * Live Machine production must consult the same coded lane caps as the
 * workspace start gate. Overflow waits. It does not silently overcommit.
 */

import type { ServiceId } from "@/catalog/types";
import { isFixtureCampaignId } from "@/lib/campaign-store/fixture-guard";
import { listCampaignEnvelopes } from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";

import {
  resolveProductionLaneViews,
  type LaneCapacityInput,
  type ProductionLaneView,
} from "./capacity";
import { resolveControlLaneForSku } from "./lane-map";
import { reconcileQuickLaneReservations } from "./quick-lane-admission";
import { syncJobRecordsFromCampaign } from "./resolve-jobs";
import type { ProductionControlLane } from "./types";

export const LIVE_LANE_CAPACITY_SKIP_REASON = "waiting_for_production_slot" as const;

export type LiveLaneJobRef = {
  jobId: string;
  productionLane: ProductionControlLane;
  returnLane?: ProductionControlLane;
};

const COMPOSITE_BRANCH_MARKER = ":branch:";

/** Composite branches are parts of one purchased job and share its production slot. */
function capacityJobId(jobId: string): string {
  const index = jobId.indexOf(COMPOSITE_BRANCH_MARKER);
  return index > 0 ? jobId.slice(0, index) : jobId;
}

export function liveLaneForDispatchRecord(
  record: Pick<JobDispatchRecord, "jobId" | "skuId" | "controlLane">,
): LiveLaneJobRef {
  const lane =
    record.controlLane ?? resolveControlLaneForSku(record.skuId as ServiceId);
  return {
    jobId: capacityJobId(record.jobId),
    productionLane: lane,
  };
}

export async function loadStudioLaneViews(): Promise<ProductionLaneView[]> {
  const envelopes = await listCampaignEnvelopes();
  const inputs: LaneCapacityInput[] = [];

  for (const envelope of envelopes) {
    if (isFixtureCampaignId(envelope.campaignId)) continue;
    const [tasksEnv, materialsEnv] = await Promise.all([
      readTasksEnvelope(envelope.campaignId),
      readMaterialsEnvelope(envelope.campaignId),
    ]);
    const tasks = tasksEnv?.tasks ?? [];
    const jobs = syncJobRecordsFromCampaign(
      envelope.record,
      tasks,
      materialsEnv?.items ?? [],
      tasksEnv?.exceptionRecords ?? [],
      tasksEnv?.jobRecords,
    );
    for (const job of jobs) {
      inputs.push({
        campaignName: envelope.record.campaignName ?? envelope.campaignId,
        job,
        tasks,
      });
    }
  }

  const views = resolveProductionLaneViews(inputs);
  if (process.env.NODE_ENV !== "test") {
    const quick = views.find((view) => view.lane === "quick");
    reconcileQuickLaneReservations({
      evidenceJobIds: quick?.activeJobs.map((job) => job.jobId) ?? [],
    });
  }
  return views;
}

export function createLiveLaneCapacityTracker(
  views: readonly ProductionLaneView[],
) {
  const reserved: Record<ProductionControlLane, number> = {
    quick: 0,
    standard: 0,
    heavy: 0,
  };
  const reservedJobIds = new Set<string>();

  function laneOf(job: LiveLaneJobRef): ProductionControlLane {
    return job.returnLane ?? job.productionLane;
  }

  function allows(job: LiveLaneJobRef): boolean {
    const lane = laneOf(job);
    const view = views.find((entry) => entry.lane === lane);
    if (!view) return false;
    if (view.activeJobs.some((active) => active.jobId === job.jobId)) return true;
    if (reservedJobIds.has(job.jobId)) return true;
    return view.activeCount + reserved[lane] < view.capacity;
  }

  function occupy(job: LiveLaneJobRef): void {
    const lane = laneOf(job);
    const view = views.find((entry) => entry.lane === lane);
    if (!view) return;
    if (view.activeJobs.some((active) => active.jobId === job.jobId)) return;
    if (reservedJobIds.has(job.jobId)) return;
    reservedJobIds.add(job.jobId);
    reserved[lane] += 1;
  }

  return { allows, occupy };
}
