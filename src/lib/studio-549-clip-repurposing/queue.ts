import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import { studio549ClipRepurposingIoFreezeV1 as freeze } from "@/config/studio-549-clip-repurposing-io-freeze-v1";

export const CLIP_549_HEAVY_CAPACITY = OWNER_CONTROL_ROOM_SECTION.laneCapacity.heavy;

export type Clip549QueuePhase =
  | "waiting_heavy"
  | "shortfall_hold"
  | "heavy_producing"
  | "fulfilled"
  | "closed_refunded";

export type Clip549QueueJob = {
  jobId: string;
  phase: Clip549QueuePhase;
  queuePlace: number;
  shortfallDeclaredPlace: number | null;
};

export type Clip549HeavyLane = {
  producingJobId: string | null;
  jobs: Clip549QueueJob[];
};

export function createClip549HeavyLane(
  jobs: ReadonlyArray<Pick<Clip549QueueJob, "jobId" | "phase">>,
): Clip549HeavyLane {
  const ranked = jobs.map((job, index) => ({
    jobId: job.jobId,
    phase: job.phase,
    queuePlace: index + 1,
    shortfallDeclaredPlace: job.phase === "shortfall_hold" ? index + 1 : null,
  }));
  const producing = ranked.find((job) => job.phase === "heavy_producing");
  return {
    producingJobId: producing?.jobId ?? null,
    jobs: ranked,
  };
}

export function declareFirstSourceShortfall(
  lane: Clip549HeavyLane,
  jobId: string,
): Clip549HeavyLane {
  const jobs = lane.jobs.map((job) =>
    job.jobId === jobId
      ? {
          ...job,
          phase: "shortfall_hold" as const,
          shortfallDeclaredPlace: job.queuePlace,
        }
      : job,
  );
  return advanceHeavy({ ...lane, jobs });
}

export function acceptOnTimeReplacement(
  lane: Clip549HeavyLane,
  jobId: string,
): Clip549HeavyLane {
  const jobs = lane.jobs.map((job) => {
    if (job.jobId !== jobId) return job;
    return {
      ...job,
      phase: "waiting_heavy" as const,
      queuePlace: job.shortfallDeclaredPlace ?? job.queuePlace,
    };
  });
  const sorted = [...jobs].sort((left, right) => left.queuePlace - right.queuePlace);
  return advanceHeavy({ ...lane, jobs: sorted });
}

export function expireReplacementAndClose(
  lane: Clip549HeavyLane,
  jobId: string,
): Clip549HeavyLane {
  const jobs = lane.jobs.map((job) =>
    job.jobId === jobId
      ? { ...job, phase: "closed_refunded" as const, shortfallDeclaredPlace: null }
      : job,
  );
  return advanceHeavy({ ...lane, jobs });
}

export function finishProducing(lane: Clip549HeavyLane, jobId: string): Clip549HeavyLane {
  const jobs = lane.jobs.map((job) =>
    job.jobId === jobId ? { ...job, phase: "fulfilled" as const } : job,
  );
  return advanceHeavy({
    ...lane,
    producingJobId: lane.producingJobId === jobId ? null : lane.producingJobId,
    jobs,
  });
}

export function advanceHeavy(lane: Clip549HeavyLane): Clip549HeavyLane {
  const stillProducing = lane.jobs.find((job) => job.phase === "heavy_producing");
  if (stillProducing) {
    return {
      producingJobId: stillProducing.jobId,
      jobs: lane.jobs,
    };
  }
  const next = [...lane.jobs]
    .filter((job) => job.phase === "waiting_heavy")
    .sort((left, right) => left.queuePlace - right.queuePlace)[0];
  if (!next) {
    return { producingJobId: null, jobs: lane.jobs };
  }
  return {
    producingJobId: next.jobId,
    jobs: lane.jobs.map((job) =>
      job.jobId === next.jobId ? { ...job, phase: "heavy_producing" } : job,
    ),
  };
}

export function heavySlotIsIdleWhileShortfallHold(lane: Clip549HeavyLane): boolean {
  const hold = lane.jobs.some((job) => job.phase === "shortfall_hold");
  const waitingReady = lane.jobs.some((job) => job.phase === "waiting_heavy");
  return hold && waitingReady && lane.producingJobId === null;
}

export function onTimeReplacementBumpsProducing(lane: Clip549HeavyLane): boolean {
  return false;
}

export function preservedPriorityMeans(): string {
  return freeze.capacityReservation.preservedPriorityMeans;
}

export function finishingMayBegin(input: {
  acceptedSourceYieldsAtLeast3: boolean;
  heavySlotAvailable: boolean;
}): boolean {
  return input.acceptedSourceYieldsAtLeast3 && input.heavySlotAvailable;
}
