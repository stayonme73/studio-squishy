import type { CampaignRecord } from "@/config/studio-board";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { isOwnerUser } from "@/lib/campaign-store/access";
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
  canMarkJobDelivered,
  canOwnerFinalRelease,
} from "./final-delivery-gates";
import type { JobActivityActor, JobActivityEvent, JobClientDeliveryFile, PurchasedJobRecord } from "./types";

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

function requiredDeliverablesForJob(
  campaign: CampaignRecord,
  job: PurchasedJobRecord,
): string[] {
  const plan = campaign.approvedStudioPlan;
  if (!plan) return [];
  const line = filterProductionPlanLineItems(plan).find(
    (item) => (item.skuId ?? item.serviceId) === job.skuId,
  );
  return line?.deliverables ? [...line.deliverables] : [];
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
): FinalDeliveryPatchResult {
  if (!isOwnerUser(user)) {
    return { ok: false, error: "Owner role required.", status: 403 };
  }

  const actor = actorFromUser(user);
  const occurredAt = new Date().toISOString();
  let events = [...(envelope.jobActivityEvents ?? [])];
  let currentJob = job;
  const requiredDeliverables = requiredDeliverablesForJob(campaign, job);

  switch (body.action) {
    case "owner_final_release": {
      const gate = canOwnerFinalRelease(currentJob);
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
      const gate = canMarkJobDelivered(currentJob, requiredDeliverables);
      if (!gate.allowed) {
        return {
          ok: false,
          error: gate.reasons.map((reason) => reason.message).join(" "),
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
