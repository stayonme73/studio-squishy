import type { CampaignRecord } from "@/config/studio-board";
import { resolveCampaignRevisionRounds } from "@/lib/approved-plan-display";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

import { mergeActivityEvents, deriveBaselineActivityEvents } from "./activity-log";
import {
  allRequiredDeliverablesPrepared,
  isDeliverablePrepared,
  resolveRequiredDeliverableKeys,
} from "./production-workspace-gates";
import {
  createEmptyJobReviewFeedback,
  type ClientReviewDeliverable,
  type JobReviewFeedback,
} from "./review-feedback-types";
import {
  canClientAccessJobReview,
  filterClientVisibleActivity,
} from "./review-room-access";
import {
  canApproveJobForDelivery,
  canRequestJobRevision,
  resolveReviewBlockedReasons,
} from "./review-room-gates";
import type { JobActivityEvent, PurchasedJobRecord } from "./types";
import { isApprovedReviewProofReference } from "@/lib/file-registry/job-files";
import { resolveClientFacingFileHref } from "@/lib/file-storage/routes";

export type ClientReviewView = {
  jobId: string;
  campaignId: string;
  serviceName: string;
  campaignName: string;
  spineStatus: PurchasedJobRecord["spineStatus"];
  deliverables: ClientReviewDeliverable[];
  revisionRoundsIncluded: number;
  revisionRoundsUsed: number;
  feedback: JobReviewFeedback;
  activity: readonly JobActivityEvent[];
  canRequestRevision: boolean;
  canApproveForDelivery: boolean;
  blockedReasons: readonly string[];
};

function lineSkuId(line: { skuId?: string; serviceId?: string }): string {
  return (line.skuId ?? line.serviceId)!;
}

export function findJobReviewFeedback(
  envelope: ServerTasksEnvelope,
  jobId: string,
): JobReviewFeedback | undefined {
  return (envelope.jobReviewFeedback ?? []).find((entry) => entry.jobId === jobId);
}

export function upsertJobReviewFeedback(
  envelope: ServerTasksEnvelope,
  feedback: JobReviewFeedback,
): ServerTasksEnvelope {
  const existing = envelope.jobReviewFeedback ?? [];
  const index = existing.findIndex((entry) => entry.jobId === feedback.jobId);
  const next =
    index >= 0
      ? existing.map((entry, i) => (i === index ? feedback : entry))
      : [...existing, feedback];

  return {
    ...envelope,
    jobReviewFeedback: next,
    updatedAt: feedback.updatedAt,
  };
}

export function resolveClientReviewView(input: {
  campaign: CampaignRecord;
  job: PurchasedJobRecord;
  envelope: ServerTasksEnvelope;
  materials?: readonly unknown[];
}): ClientReviewView | null {
  const { campaign, job, envelope } = input;

  if (!canClientAccessJobReview(job)) {
    return null;
  }

  const plan = campaign.approvedStudioPlan;
  const line = plan
    ? filterProductionPlanLineItems(plan).find(
        (item) => lineSkuId(item) === job.skuId,
      )
    : undefined;

  const requiredDefs = resolveRequiredDeliverableKeys(line?.deliverables ?? []);
  const deliverables: ClientReviewDeliverable[] = requiredDefs
    .filter((def) => isDeliverablePrepared(job, def.key))
    .map((def) => {
      const prep = (job.deliverablePrep ?? []).find((entry) => entry.deliverableKey === def.key);
      const proofFiles = (job.fileRegistry ?? [])
        .filter(
          (ref) => ref.deliverableKey === def.key && isApprovedReviewProofReference(ref),
        )
        .map((ref) => ({
          id: ref.id,
          filename: ref.filename,
          fileType: ref.fileType,
          accessHref:
            resolveClientFacingFileHref({
              registryFileId: ref.id,
              url: ref.storageRef.provider === "google_shared_drive" ? ref.storageRef.reference : undefined,
              storageRef: ref.storageRef,
              purpose: "proof",
            }) || null,
          versionLabel: ref.versionLabel,
          addedAt: ref.addedAt,
        }));
      return {
        key: def.key,
        label: def.label,
        prepared: true,
        preparedAt: prep?.preparedAt,
        proofFiles,
      };
    });

  const deliverableKeys = deliverables.map((entry) => entry.key);
  const existing = findJobReviewFeedback(envelope, job.jobId);
  const feedback =
    existing ?? createEmptyJobReviewFeedback(campaign.campaignId, job.jobId, deliverableKeys);

  const revisionRoundsIncluded = resolveCampaignRevisionRounds(campaign);
  const revisionRoundsUsed = campaign.revisionRoundsUsed ?? 0;

  const requiredDeliverableLabels = line?.deliverables ?? [];
  const allPrepared = allRequiredDeliverablesPrepared(job, requiredDeliverableLabels);

  const blockedReasons = resolveReviewBlockedReasons({
    job,
    feedback,
    allDeliverablesPrepared: allPrepared,
    deliverableCount: deliverables.length,
  });

  const activity = filterClientVisibleActivity(
    mergeActivityEvents(
      envelope.jobActivityEvents,
      deriveBaselineActivityEvents(
        campaign,
        [job],
        [],
        envelope.exceptionEvents,
      ),
    ),
    job.jobId,
  );

  return {
    jobId: job.jobId,
    campaignId: job.campaignId,
    serviceName: job.serviceName,
    campaignName: campaign.campaignName,
    spineStatus: job.spineStatus,
    deliverables,
    revisionRoundsIncluded,
    revisionRoundsUsed,
    feedback,
    activity,
    canRequestRevision: canRequestJobRevision({
      job,
      feedback,
      revisionRoundsUsed,
      revisionRoundsIncluded,
      allDeliverablesPrepared: allPrepared,
    }).allowed,
    canApproveForDelivery: canApproveJobForDelivery({
      job,
      feedback,
      allDeliverablesPrepared: allPrepared,
      deliverableCount: deliverables.length,
    }).allowed,
    blockedReasons,
  };
}

/** Jobs eligible for client Review Room for a campaign. */
export function findReviewReadyJobs(
  jobs: readonly PurchasedJobRecord[],
): PurchasedJobRecord[] {
  return jobs.filter((job) => canClientAccessJobReview(job));
}
