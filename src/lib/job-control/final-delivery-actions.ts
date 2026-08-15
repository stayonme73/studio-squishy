import type { CampaignRecord } from "@/config/studio-board";
import { requiredClientDeliveryFileLabelsForJob } from "@/lib/approved-plan-line";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { isOwnerUser, isStaffUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import {
  addJobFileReference,
  createReferenceOnlyStorageRef,
  releaseFinalDeliveryFiles,
} from "@/lib/file-registry/job-files";

import { applyJobSpineStatusChange } from "./actions";
import { appendJobActivityEvent } from "./activity-log";
import { enqueueJobCommunicationRecord } from "./communication";
import {
  buildFinalDeliveryAuthorizationRecord,
  stampClientDeliveryFilesWithApproval,
} from "@/lib/studio-approved-delivery";

import type { CampaignMaterialItem } from "@/lib/materials/types";

import {
  canMarkJobDelivered,
  canOwnerFinalRelease,
  canSystemAuthorizeFinalDelivery,
  materialContextFromLedger,
  materialContextUnavailable,
  type SystemReleaseMaterialContext,
} from "./final-delivery-gates";
import type { JobActivityActor, JobActivityEvent, JobClientDeliveryFile, PurchasedJobRecord } from "./types";

const SYSTEM_RELEASE_ACTOR: JobActivityActor = {
  role: "system",
  displayName: "Studio",
};

export type { SystemReleaseMaterialContext };

/**
 * Routine Final Delivery open — exact approved identity match, no Owner hold.
 * Does not require Tagia. Owner `owner_final_release` remains exception-only.
 * Requires authoritative material-use ledger context (never omit / never invent empty).
 */
export function applySystemFinalDeliveryAuthorization(
  job: PurchasedJobRecord,
  events: readonly JobActivityEvent[],
  requiredDeliverables: readonly string[],
  input: {
    actor?: JobActivityActor;
    occurredAt?: string;
    materialUse: SystemReleaseMaterialContext;
  },
): { applied: boolean; job: PurchasedJobRecord; events: JobActivityEvent[]; reason?: string } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const actor = input.actor ?? SYSTEM_RELEASE_ACTOR;

  let nextJob = stampClientDeliveryFilesWithApproval(job);
  const gate = canSystemAuthorizeFinalDelivery(
    nextJob,
    requiredDeliverables,
    input.materialUse,
  );
  if (!gate.allowed) {
    return {
      applied: false,
      job: nextJob,
      events: [...events],
      reason: gate.reasons.map((entry) => entry.message).join(" "),
    };
  }

  const statusResult = applyJobSpineStatusChange(nextJob, events, {
    job: nextJob,
    nextStatus: "ready_for_delivery",
    actor,
    reason: "System authorized Final Delivery — approved identity matches delivery candidate",
    occurredAt,
  });
  nextJob = statusResult.job;

  const fileReleaseResult = releaseFinalDeliveryFiles(
    nextJob,
    statusResult.events,
    actor,
    occurredAt,
  );
  nextJob = fileReleaseResult.job;

  // LEGACY kind name `owner_final_release` — when actor is system this is routine
  // system authorization, not Owner participation (see studioApprovedDeliveryV1).
  const nextEvents = appendJobActivityEvent(fileReleaseResult.events, {
    campaignId: nextJob.campaignId,
    jobId: nextJob.jobId,
    kind: "owner_final_release",
    occurredAt,
    actor,
    reason: "System authorized Final Delivery (routine — Owner action not required)",
    spineStatus: "ready_for_delivery",
  });

  return { applied: true, job: nextJob, events: nextEvents };
}

/**
 * After material-use holds clear, re-attempt system Final Delivery for jobs
 * already customer-approved. Does not require re-approval unless artifacts change.
 */
export function reevaluateSystemFinalDeliveryAfterMaterialChange(input: {
  envelope: ServerTasksEnvelope;
  campaign: CampaignRecord;
  materials: readonly CampaignMaterialItem[];
  clientId?: string;
  occurredAt?: string;
}): { envelope: ServerTasksEnvelope; releasedJobIds: string[] } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const clientId =
    input.clientId ?? `unclaimed-client:${input.campaign.campaignId}`;
  const materialUse = materialContextFromLedger(input.materials);
  let envelope = input.envelope;
  let events = [...(envelope.jobActivityEvents ?? [])];
  const releasedJobIds: string[] = [];

  for (const job of envelope.jobRecords ?? []) {
    if (job.spineStatus !== "approved") continue;
    if (job.customerApprovedArtifactAuthorization?.status !== "CUSTOMER_APPROVED") {
      continue;
    }

    const release = applySystemFinalDeliveryAuthorization(
      job,
      events,
      requiredClientDeliveryFileLabelsForJob(input.campaign, job),
      { occurredAt, materialUse },
    );
    if (!release.applied) {
      events = release.events;
      continue;
    }

    releasedJobIds.push(job.jobId);
    events = release.events;
    envelope = updateJobInEnvelope(envelope, release.job, events);
    envelope = enqueueJobCommunicationRecord(
      { ...envelope, jobActivityEvents: events },
      {
        campaign: input.campaign,
        clientId,
        job: release.job,
        eventType: "final_delivery_available",
        sender: SYSTEM_RELEASE_ACTOR,
        occurredAt,
        idempotencyKey: `material-clear-release:${job.jobId}:${occurredAt}`,
      },
    );
    events = envelope.jobActivityEvents ?? [];
  }

  return { envelope, releasedJobIds };
}

export type FinalDeliveryPatchAction = "owner_final_release" | "mark_delivered";

export type FinalDeliveryPatchBody =
  | { action: "owner_final_release" }
  | { action: "mark_delivered" };

export type FinalDeliveryPatchResult =
  | {
      ok: true;
      envelope: ServerTasksEnvelope;
      job: PurchasedJobRecord;
      updatedCampaign?: CampaignRecord;
    }
  | { ok: false; error: string; status: number };

function actorFromUser(user: StudioUser): JobActivityActor {
  return {
    role: isOwnerUser(user) ? "owner" : "staff",
    userId: user.id,
    displayName: user.displayName ?? user.email,
  };
}

function updateJobInEnvelope(
  envelope: ServerTasksEnvelope,
  job: PurchasedJobRecord,
  events: JobActivityEvent[],
): ServerTasksEnvelope {
  const jobRecords = [...(envelope.jobRecords ?? [])];
  const index = jobRecords.findIndex((entry) => entry.jobId === job.jobId);
  if (index >= 0) {
    jobRecords[index] = job;
  } else {
    jobRecords.push(job);
  }

  return {
    ...envelope,
    jobRecords,
    jobActivityEvents: events,
    updatedAt: new Date().toISOString(),
    version: Math.max(envelope.version ?? 10, 10),
  };
}

export function allJobsDelivered(jobs: readonly PurchasedJobRecord[]): boolean {
  if (jobs.length === 0) return false;
  return jobs.every((job) => job.spineStatus === "delivered");
}

export function syncCampaignStatusAfterDelivery(
  campaign: CampaignRecord,
  jobs: readonly PurchasedJobRecord[],
  occurredAt: string,
): CampaignRecord | undefined {
  if (!allJobsDelivered(jobs)) return undefined;
  if (campaign.campaignStatus === "DELIVERED") return undefined;

  return {
    ...campaign,
    campaignStatus: "DELIVERED",
    updatedAt: occurredAt,
  };
}

export function applyFinalDeliveryPatch(
  envelope: ServerTasksEnvelope,
  campaign: CampaignRecord,
  job: PurchasedJobRecord,
  body: FinalDeliveryPatchBody,
  user: StudioUser,
  clientId = `unclaimed-client:${campaign.campaignId}`,
  materials: readonly CampaignMaterialItem[] | null = null,
): FinalDeliveryPatchResult {
  const actor = actorFromUser(user);
  const occurredAt = new Date().toISOString();
  let events = [...(envelope.jobActivityEvents ?? [])];
  let currentJob = job;
  const requiredDeliverables = requiredClientDeliveryFileLabelsForJob(campaign, job);
  const materialUse =
    materials == null
      ? materialContextUnavailable()
      : materialContextFromLedger(materials);

  switch (body.action) {
    case "owner_final_release": {
      if (!isOwnerUser(user)) {
        return {
          ok: false,
          error: "Owner release exception requires owner role.",
          status: 403,
        };
      }

      currentJob = stampClientDeliveryFilesWithApproval(currentJob);

      const gate = canOwnerFinalRelease(currentJob, materialUse);
      if (!gate.allowed) {
        return {
          ok: false,
          error: gate.reasons.map((reason) => reason.message).join(" "),
          status: 422,
        };
      }

      const statusResult = applyJobSpineStatusChange(currentJob, events, {
        job: currentJob,
        nextStatus: "ready_for_delivery",
        actor,
        reason: "Owner final release — ready for client delivery",
        occurredAt,
      });
      currentJob = {
        ...statusResult.job,
        ownerApprovalPending: null,
      };
      events = statusResult.events;

      const fileReleaseResult = releaseFinalDeliveryFiles(currentJob, events, actor, occurredAt);
      currentJob = fileReleaseResult.job;
      events = fileReleaseResult.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "owner_final_release",
        occurredAt,
        actor,
        reason: "Owner approved final release",
        spineStatus: "ready_for_delivery",
      });
      envelope = enqueueJobCommunicationRecord(
        { ...envelope, jobActivityEvents: events },
        {
          campaign,
          clientId,
          job: currentJob,
          eventType: "final_delivery_available",
          sender: actor,
          occurredAt,
          idempotencyKey: occurredAt,
        },
      );
      events = envelope.jobActivityEvents ?? [];
      break;
    }

    case "mark_delivered": {
      // Bookkeeping after Final Delivery is open — staff or Owner; not Tagia-only.
      if (!isOwnerUser(user) && !isStaffUser(user)) {
        return { ok: false, error: "Staff or owner role required.", status: 403 };
      }

      currentJob = stampClientDeliveryFilesWithApproval(currentJob);

      const gate = canMarkJobDelivered(currentJob, requiredDeliverables);
      if (!gate.allowed) {
        return {
          ok: false,
          error: gate.reasons.map((reason) => reason.message).join(" "),
          status: 422,
        };
      }

      const deliveryRecord = buildFinalDeliveryAuthorizationRecord({
        job: currentJob,
        deliveredAt: occurredAt,
      });
      if (!deliveryRecord) {
        return {
          ok: false,
          error: "Final delivery requires a durable customer-approved artifact authorization.",
          status: 422,
        };
      }

      const statusResult = applyJobSpineStatusChange(currentJob, events, {
        job: currentJob,
        nextStatus: "delivered",
        actor,
        reason: "Delivered to client",
        occurredAt,
      });
      currentJob = {
        ...statusResult.job,
        deliveredAt: occurredAt,
        finalDeliveryAuthorization: deliveryRecord,
      };
      events = statusResult.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "delivery_completed",
        occurredAt,
        actor,
        reason: "Job delivered to client",
        spineStatus: "delivered",
      });

      const allJobs = (envelope.jobRecords ?? []).map((entry) =>
        entry.jobId === currentJob.jobId ? currentJob : entry,
      );
      const updatedCampaign = syncCampaignStatusAfterDelivery(campaign, allJobs, occurredAt);

      const nextEnvelope = updateJobInEnvelope(envelope, currentJob, events);
      return {
        ok: true,
        envelope: nextEnvelope,
        job: currentJob,
        updatedCampaign,
      };
    }

    default:
      return { ok: false, error: "Unknown action.", status: 400 };
  }

  return {
    ok: true,
    envelope: updateJobInEnvelope(envelope, currentJob, events),
    job: currentJob,
  };
}

export function addClientDeliveryFile(
  job: PurchasedJobRecord,
  events: readonly JobActivityEvent[],
  input: {
    clientId?: string;
    deliverableKey: string;
    deliverableLabel: string;
    fileName: string;
    fileType: string;
    url: string;
    useInstructions?: string;
    contentSha256?: string;
    artifactId?: string;
    approvedWorkVersionId?: string;
    approvedAuthorizationDecisionId?: string;
    actor: JobActivityActor;
    occurredAt?: string;
  },
): { job: PurchasedJobRecord; events: JobActivityEvent[] } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const storageRef = createReferenceOnlyStorageRef({
    reference: input.url,
    displayLabel: input.fileName,
  });
  const registryResult = addJobFileReference(job, events, {
    clientId: input.clientId ?? `unclaimed-client:${job.campaignId}`,
    category: "final_delivery",
    filename: input.fileName,
    fileType: input.fileType,
    storageRef,
    visibility: "client_visible",
    status: "approved_for_release",
    actor: input.actor,
    occurredAt,
    deliverableKey: input.deliverableKey,
    deliverableLabel: input.deliverableLabel,
    idPrefix: "final-file",
  });
  const approval = job.customerApprovedArtifactAuthorization;
  const file: JobClientDeliveryFile = {
    id: `cdf:${job.jobId}:${input.deliverableKey}:${occurredAt}`,
    registryFileId: registryResult.file.id,
    deliverableKey: input.deliverableKey,
    deliverableLabel: input.deliverableLabel,
    fileName: input.fileName.trim(),
    fileType: input.fileType.trim(),
    url: input.url.trim(),
    storageRef,
    versionLabel: registryResult.file.versionLabel,
    visibility: "client_visible",
    releaseStatus: "pending_release",
    useInstructions: input.useInstructions?.trim() || undefined,
    addedAt: occurredAt,
    addedBy: input.actor,
    contentSha256: input.contentSha256?.trim() || undefined,
    artifactId: input.artifactId?.trim() || undefined,
    approvedWorkVersionId:
      input.approvedWorkVersionId?.trim() ||
      approval?.workVersionId ||
      undefined,
    approvedAuthorizationDecisionId:
      input.approvedAuthorizationDecisionId?.trim() ||
      approval?.decisionId ||
      undefined,
  };

  const nextJob: PurchasedJobRecord = {
    ...registryResult.job,
    clientDeliveryFiles: [...(registryResult.job.clientDeliveryFiles ?? []), file],
    updatedAt: occurredAt,
  };

  const nextEvents = appendJobActivityEvent(registryResult.events, {
    campaignId: job.campaignId,
    jobId: job.jobId,
    kind: "client_delivery_file_added",
    occurredAt,
    actor: input.actor,
    reason: `Client file: ${file.fileName}`,
    messageRef: file.url,
  });

  return { job: nextJob, events: nextEvents };
}
