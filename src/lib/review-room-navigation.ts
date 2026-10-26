import type { CampaignRecord } from "@/config/studio-board";
import { studioBoard } from "@/config/studio-board";
import type { ReviewDeliveryStageId } from "@/config/review-delivery-stage-v1";
import type { ClientStagesJobItem } from "@/lib/review-delivery-stage/build-client-stages";
import { buildJobId } from "@/lib/job-control/lane-map";
import type { ServiceId } from "@/catalog/types";

export const REVIEW_OPENABLE_STAGES = [
  "work-ready-for-review",
  "customer-reviewing",
  "revised-work-ready",
] as const satisfies readonly ReviewDeliveryStageId[];

const STILL_WORKING_STAGES = [
  "studio-working",
  "revision-submitted",
  "waiting-on-you",
] as const satisfies readonly ReviewDeliveryStageId[];

export type ReviewRoomEntry =
  | { kind: "direct-proof"; jobId: string }
  | { kind: "chooser" };

export function isReviewOpenableStage(
  stageId: ReviewDeliveryStageId,
): boolean {
  return (REVIEW_OPENABLE_STAGES as readonly string[]).includes(stageId);
}

export function isStillWorkingStage(stageId: ReviewDeliveryStageId): boolean {
  return (STILL_WORKING_STAGES as readonly string[]).includes(stageId);
}

export function reviewProofHref(jobId: string) {
  return `${studioBoard.routes.feedbackStudio}?jobId=${encodeURIComponent(jobId)}`;
}

/** One purchased job can open Review without a stages round-trip. */
export function singleCampaignJobId(
  jobIds: readonly string[] | undefined,
): string | null {
  if (!jobIds || jobIds.length !== 1) return null;
  const jobId = jobIds[0]?.trim();
  return jobId ? jobId : null;
}

/**
 * Final / Delivery unified room must name the owned job even when Board
 * opened `/deliverables` without `?jobId`. Empty history is not “no activity.”
 */
export function resolveUnifiedRoomJobId(
  campaign: Pick<
    CampaignRecord,
    "campaignId" | "postPayActivation" | "approvedStudioPlan" | "routeMapContext"
  >,
  jobIdParam?: string | null,
): string | null {
  const fromParam = jobIdParam?.trim();
  if (fromParam) return fromParam;
  const fromActivation = singleCampaignJobId(campaign.postPayActivation?.jobIds);
  if (fromActivation) return fromActivation;
  const sku =
    campaign.approvedStudioPlan?.selectedServiceIds?.[0] ??
    campaign.routeMapContext?.jobId;
  if (!sku || !campaign.campaignId) return null;
  return buildJobId(campaign.campaignId, sku as ServiceId);
}

export function partitionReviewRoomJobs(
  jobs: readonly ClientStagesJobItem[],
): {
  ready: ClientStagesJobItem[];
  stillWorking: ClientStagesJobItem[];
  other: ClientStagesJobItem[];
} {
  const ready: ClientStagesJobItem[] = [];
  const stillWorking: ClientStagesJobItem[] = [];
  const other: ClientStagesJobItem[] = [];

  for (const job of jobs) {
    if (job.stageId === "cancelled") continue;
    if (isReviewOpenableStage(job.stageId)) {
      ready.push(job);
      continue;
    }
    if (isStillWorkingStage(job.stageId)) {
      stillWorking.push(job);
      continue;
    }
    other.push(job);
  }

  return { ready, stillWorking, other };
}

/**
 * One review-ready job on a one-job campaign opens the proof.
 * Multiple jobs stay in the same Review Room so the customer can choose
 * ready work without a second Open Review doorway.
 */
export function resolveReviewRoomEntry(
  jobs: readonly ClientStagesJobItem[],
): ReviewRoomEntry {
  const active = jobs.filter((job) => job.stageId !== "cancelled");
  const ready = active.filter((job) => isReviewOpenableStage(job.stageId));
  if (active.length === 1 && ready.length === 1) {
    return { kind: "direct-proof", jobId: ready[0].jobId };
  }
  return { kind: "chooser" };
}

export function pickDefaultJobId(
  jobs: readonly ClientStagesJobItem[],
  requestedJobId: string | null,
): { jobId: string | null; requestedUnavailable: boolean } {
  if (jobs.length === 0) {
    return { jobId: null, requestedUnavailable: Boolean(requestedJobId) };
  }

  if (requestedJobId) {
    const match = jobs.find((job) => job.jobId === requestedJobId);
    if (match) {
      return { jobId: match.jobId, requestedUnavailable: false };
    }
    return { jobId: null, requestedUnavailable: true };
  }

  const active = jobs.filter((job) => job.stageId !== "cancelled");
  const pool = active.length > 0 ? active : jobs;

  const blocking = pool.find((job) => job.blocksCampaignCustomerAction);
  if (blocking) return { jobId: blocking.jobId, requestedUnavailable: false };

  const nonCancelled = pool.find((job) => job.stageId !== "cancelled");
  if (nonCancelled) return { jobId: nonCancelled.jobId, requestedUnavailable: false };

  return { jobId: pool[0]?.jobId ?? null, requestedUnavailable: false };
}
