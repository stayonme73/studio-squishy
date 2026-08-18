import { JOB_CONTROL_POLICY } from "@/config/job-control";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { blockingMaterialsForSku } from "./resolve-jobs";
import type { PurchasedJobRecord } from "./types";

export type WaitingOnClientReminderStatus =
  | "none"
  | "reminder_due"
  | "move_to_tray_due"
  | "refund_eligible";

export type WaitingOnClientTrayItem = {
  jobId: string;
  campaignId: string;
  campaignName: string;
  serviceName: string;
  missingItems: readonly string[];
  requestedAt: string;
  reminderStatus: WaitingOnClientReminderStatus;
  lastClientResponseAt: string | null;
  returnLane: PurchasedJobRecord["productionLane"];
  waitingSince: string;
};

function hoursSince(iso: string, nowMs: number): number {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return 0;
  return (nowMs - ms) / (60 * 60 * 1000);
}

function daysSince(iso: string, nowMs: number): number {
  return hoursSince(iso, nowMs) / 24;
}

export function resolveWaitingOnClientReminderStatus(
  waitingSince: string,
  lastClientResponseAt: string | null,
  nowMs = Date.now(),
): WaitingOnClientReminderStatus {
  const anchor = lastClientResponseAt ?? waitingSince;
  const hours = hoursSince(anchor, nowMs);
  const days = daysSince(anchor, nowMs);

  if (days >= JOB_CONTROL_POLICY.refundEligibleDays) {
    return "refund_eligible";
  }
  if (hours >= JOB_CONTROL_POLICY.moveToWaitingOnClientHours) {
    return "move_to_tray_due";
  }
  if (hours >= JOB_CONTROL_POLICY.reminderDueHours) {
    return "reminder_due";
  }
  return "none";
}

export function shouldMoveJobToWaitingOnClient(
  job: PurchasedJobRecord,
  materials: readonly CampaignMaterialItem[],
  _nowMs = Date.now(),
): boolean {
  if (job.spineStatus === "waiting_on_client") return false;
  const blocking = blockingMaterialsForSku(materials, job.skuId);
  if (blocking.length === 0) return false;

  const requestedAt = blocking
    .map((item) => item.promotionApprovedAt ?? item.submittedAt)
    .filter(Boolean)
    .sort()[0];

  if (!requestedAt) return false;

  return true;
}

export function buildWaitingOnClientTrayItem(
  job: PurchasedJobRecord,
  campaignName: string,
  materials: readonly CampaignMaterialItem[],
  nowMs = Date.now(),
): WaitingOnClientTrayItem | null {
  if (job.spineStatus !== "waiting_on_client") return null;

  const blocking = blockingMaterialsForSku(materials, job.skuId);
  const missingItems = blocking.map((item) => item.label);
  const requestedAt =
    job.waitingOnClientSince ??
    blocking
      .map((item) => item.promotionApprovedAt ?? item.submittedAt)
      .filter(Boolean)
      .sort()[0] ??
    job.updatedAt;

  return {
    jobId: job.jobId,
    campaignId: job.campaignId,
    campaignName,
    serviceName: job.serviceName,
    missingItems,
    requestedAt,
    reminderStatus: resolveWaitingOnClientReminderStatus(
      requestedAt,
      job.lastClientResponseAt ?? null,
      nowMs,
    ),
    lastClientResponseAt: job.lastClientResponseAt ?? null,
    returnLane: job.returnLane ?? job.productionLane,
    waitingSince: requestedAt,
  };
}

export function applyWaitingOnClientPolicies(
  jobs: PurchasedJobRecord[],
  materials: readonly CampaignMaterialItem[],
  nowMs = Date.now(),
): PurchasedJobRecord[] {
  return jobs.map((job) => {
    if (shouldMoveJobToWaitingOnClient(job, materials, nowMs)) {
      return {
        ...job,
        spineStatus: "waiting_on_client" as const,
        waitingOnClientSince: job.waitingOnClientSince ?? new Date(nowMs).toISOString(),
        returnLane: job.returnLane ?? job.productionLane,
        updatedAt: new Date(nowMs).toISOString(),
      };
    }
    return job;
  });
}

/** Re-entry queue position — returning jobs land behind ready jobs in their lane. */
export function requeueReturnedJob(
  job: PurchasedJobRecord,
  now = new Date().toISOString(),
): PurchasedJobRecord {
  return {
    ...job,
    spineStatus: "building_concepts",
    waitingOnClientSince: null,
    laneQueuedAt: now,
    returnLane: job.returnLane ?? job.productionLane,
    updatedAt: now,
  };
}
