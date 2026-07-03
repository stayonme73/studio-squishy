import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";

import type { PurchasedJobRecord } from "./types";
import { jobCountsTowardLaneCapacity, isJobPaused } from "./resolve-jobs";
import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";
import type { ProductionControlLane } from "./types";

export type LaneJobView = {
  jobId: string;
  campaignId: string;
  campaignName: string;
  serviceName: string;
  spineStatus: PurchasedJobRecord["spineStatus"];
  isActive: boolean;
  isPaused: boolean;
  isNextUp: boolean;
  queuePosition: number;
};

export type ProductionLaneView = {
  lane: ProductionControlLane;
  label: string;
  capacity: number;
  activeCount: number;
  availableSlots: number;
  isFull: boolean;
  activeJobs: readonly LaneJobView[];
  nextUpJobs: readonly LaneJobView[];
};

const LANE_ORDER: readonly ProductionControlLane[] = ["quick", "standard", "heavy"];

export type LaneCapacityInput = {
  campaignName: string;
  job: PurchasedJobRecord;
  tasks: readonly CampaignTaskItem[];
};

export function resolveProductionLaneViews(
  inputs: readonly LaneCapacityInput[],
): ProductionLaneView[] {
  const byLane = new Map<ProductionControlLane, LaneCapacityInput[]>();
  for (const lane of LANE_ORDER) {
    byLane.set(lane, []);
  }

  for (const input of inputs) {
    const lane = input.job.returnLane ?? input.job.productionLane;
    const list = byLane.get(lane) ?? [];
    list.push(input);
    byLane.set(lane, list);
  }

  return LANE_ORDER.map((lane) => {
    const capacity = OWNER_CONTROL_ROOM_SECTION.laneCapacity[lane];
    const label = OWNER_CONTROL_ROOM_SECTION.laneLabels[lane];
    const laneInputs = [...(byLane.get(lane) ?? [])].sort((a, b) => {
      const aQueued = a.job.laneQueuedAt ?? "";
      const bQueued = b.job.laneQueuedAt ?? "";
      return aQueued.localeCompare(bQueued);
    });

    const activeJobs: LaneJobView[] = [];
    const nextUpJobs: LaneJobView[] = [];
    let activeCount = 0;

    for (let index = 0; index < laneInputs.length; index += 1) {
      const { job, campaignName, tasks } = laneInputs[index];
      const counts = jobCountsTowardLaneCapacity(job, tasks);
      const paused = isJobPaused(job, tasks);

      if (counts && activeCount < capacity) {
        activeCount += 1;
        activeJobs.push({
          jobId: job.jobId,
          campaignId: job.campaignId,
          campaignName,
          serviceName: job.serviceName,
          spineStatus: job.spineStatus,
          isActive: true,
          isPaused: paused,
          isNextUp: false,
          queuePosition: index + 1,
        });
      } else if (
        job.intakeComplete &&
        job.spineStatus !== "waiting_on_client" &&
        (job.spineStatus === "ready_for_queue" ||
          job.spineStatus === "building_concepts" ||
          job.spineStatus === "revision_requested" ||
          job.spineStatus === "approved")
      ) {
        nextUpJobs.push({
          jobId: job.jobId,
          campaignId: job.campaignId,
          campaignName,
          serviceName: job.serviceName,
          spineStatus: job.spineStatus,
          isActive: false,
          isPaused: paused,
          isNextUp: true,
          queuePosition: index + 1,
        });
      }
    }

    return {
      lane,
      label,
      capacity,
      activeCount,
      availableSlots: Math.max(0, capacity - activeCount),
      isFull: activeCount >= capacity,
      activeJobs,
      nextUpJobs,
    };
  });
}

export function isHeavyLaneFull(views: readonly ProductionLaneView[]): boolean {
  const heavy = views.find((entry) => entry.lane === "heavy");
  return heavy?.isFull ?? false;
}

export function findHeavyLaneNextUp(
  views: readonly ProductionLaneView[],
): LaneJobView | null {
  const heavy = views.find((entry) => entry.lane === "heavy");
  return heavy?.nextUpJobs[0] ?? null;
}
