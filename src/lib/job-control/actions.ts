import type { JobActivityActor, JobSpineStatus, PurchasedJobRecord } from "./types";
import { recordJobStatusChange } from "./activity-log";
import { releaseQuickLaneReservation } from "./quick-lane-admission";
import { occupiesLaneCapacity } from "./status-spine";
import type { JobActivityEvent } from "./types";

export type SetJobSpineStatusInput = {
  job: PurchasedJobRecord;
  nextStatus: JobSpineStatus;
  actor: JobActivityActor;
  reason: string;
  occurredAt?: string;
  repoRoot?: string;
};

/** Apply an explicit spine transition — always logged; no silent changes. */
export function applyJobSpineStatusChange(
  job: PurchasedJobRecord,
  events: readonly JobActivityEvent[],
  input: SetJobSpineStatusInput,
): { job: PurchasedJobRecord; events: JobActivityEvent[] } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const updated: PurchasedJobRecord = {
    ...job,
    spineStatus: input.nextStatus,
    spineStatusSetAt: occurredAt,
    spineStatusSetBy: input.actor,
    spineStatusReason: input.reason,
    updatedAt: occurredAt,
    ...(input.nextStatus === "waiting_on_client"
      ? {
          waitingOnClientSince: job.waitingOnClientSince ?? occurredAt,
          returnLane: job.returnLane ?? job.productionLane,
        }
      : {}),
    ...(job.spineStatus === "waiting_on_client" && input.nextStatus !== "waiting_on_client"
      ? {
          waitingOnClientSince: null,
          ...(input.nextStatus === "building_concepts" ? { laneQueuedAt: occurredAt } : {}),
        }
      : {})
  };

  const nextEvents = recordJobStatusChange(
    events,
    updated,
    input.actor,
    input.reason,
    occurredAt,
  );

  const lane = job.returnLane ?? job.productionLane;
  if (lane === "quick" && !occupiesLaneCapacity(input.nextStatus)) {
    releaseQuickLaneReservation({ jobId: job.jobId, repoRoot: input.repoRoot });
  }

  return { job: updated, events: nextEvents };
}

export function requestOwnerApprovalBeforeReview(
  job: PurchasedJobRecord,
): PurchasedJobRecord {
  return {
    ...job,
    ownerApprovalPending: "before_review",
    updatedAt: new Date().toISOString(),
  };
}

export function requestOwnerApprovalBeforeDelivery(
  job: PurchasedJobRecord,
): PurchasedJobRecord {
  return {
    ...job,
    ownerApprovalPending: "before_delivery",
    updatedAt: new Date().toISOString(),
  };
}
