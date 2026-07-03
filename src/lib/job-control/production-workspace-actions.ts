import type { CampaignRecord } from "@/config/studio-board";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";

import { appendJobActivityEvent } from "./activity-log";
import { applyJobSpineStatusChange, requestOwnerApprovalBeforeReview } from "./actions";
import { enqueueJobCommunicationRecord } from "./communication";
import type { ProductionLaneView } from "./capacity";
import { addClientDeliveryFile, syncCampaignStatusAfterDelivery } from "./final-delivery-actions";
import { canMarkJobDelivered, canOwnerFinalRelease } from "./final-delivery-gates";
import {
  canOwnerApproveForReview,
  canSubmitForOwnerApproval,
  canTransitionToBuildingConcepts,
  mergeDeliverablePrep,
  resolveRequiredDeliverableKeys,
} from "./production-workspace-gates";
import { parseJobId } from "./lane-map";
import type { JobActivityActor, JobActivityEvent, PurchasedJobRecord } from "./types";

export type ProductionWorkspacePatchAction =
  | "start_building_concepts"
  | "mark_deliverable_prepared"
  | "add_internal_note"
  | "add_working_file_ref"
  | "add_client_delivery_file"
  | "submit_for_owner_approval"
  | "owner_approve_for_review"
  | "owner_final_release"
  | "mark_delivered"
  | "issue_refund";

export type ProductionWorkspacePatchBody =
  | { action: "start_building_concepts" }
  | { action: "mark_deliverable_prepared"; deliverableKey: string }
  | { action: "add_internal_note"; content: string }
  | { action: "add_working_file_ref"; label: string; url: string }
  | {
      action: "add_client_delivery_file";
      deliverableKey: string;
      fileName: string;
      fileType: string;
      url: string;
      useInstructions?: string;
    }
  | { action: "submit_for_owner_approval" }
  | { action: "owner_approve_for_review" }
  | { action: "owner_final_release" }
  | { action: "mark_delivered" }
  | { action: "issue_refund"; reason: string };

export type ProductionWorkspacePatchResult =
  | { ok: true; envelope: ServerTasksEnvelope; job: PurchasedJobRecord; updatedCampaign?: CampaignRecord }
  | { ok: false; error: string; status: number };

function actorFromUser(user: StudioUser): JobActivityActor {
  return {
    role: isOwnerUser(user) ? "owner" : "staff",
    userId: user.id,
    displayName: user.displayName ?? user.email,
  };
}

function findJobRecord(envelope: ServerTasksEnvelope, jobId: string): PurchasedJobRecord | null {
  return (envelope.jobRecords ?? []).find((entry) => entry.jobId === jobId) ?? null;
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
    version: Math.max(envelope.version ?? 7, 7),
  };
}

export function applyProductionWorkspacePatch(
  envelope: ServerTasksEnvelope,
  campaign: CampaignRecord,
  jobId: string,
  body: ProductionWorkspacePatchBody,
  user: StudioUser,
  materials: readonly CampaignMaterialItem[],
  laneViews: readonly ProductionLaneView[],
  clientId = `unclaimed-client:${campaign.campaignId}`,
): ProductionWorkspacePatchResult {
  const parsed = parseJobId(jobId);
  if (!parsed || parsed.campaignId !== campaign.campaignId) {
    return { ok: false, error: "Job not found for this campaign.", status: 404 };
  }

  let job = findJobRecord(envelope, jobId);
  if (!job) {
    return { ok: false, error: "Job record not found — sync from Owner Console first.", status: 404 };
  }

  const actor = actorFromUser(user);
  const occurredAt = new Date().toISOString();
  let events = [...(envelope.jobActivityEvents ?? [])];
  const requiredDeliverables = requiredDeliverablesForJob(campaign, job);

  switch (body.action) {
    case "start_building_concepts": {
      const gate = canTransitionToBuildingConcepts(job, materials, laneViews);
      if (!gate.allowed) {
        return {
          ok: false,
          error: gate.reasons.map((reason) => reason.message).join(" "),
          status: 422,
        };
      }

      const result = applyJobSpineStatusChange(job, events, {
        job,
        nextStatus: "building_concepts",
        actor,
        reason: "Started Building Concepts — lane capacity available",
        occurredAt,
      });
      job = {
        ...result.job,
        productionStartedAt: job.productionStartedAt ?? occurredAt,
        laneQueuedAt: occurredAt,
        nonRefundable: true,
        refundEligibleAt: null,
      };
      events = result.events;
      envelope = enqueueJobCommunicationRecord(
        { ...envelope, jobActivityEvents: events },
        {
          campaign,
          clientId,
          job,
          eventType: "production_started",
          sender: actor,
          occurredAt,
          idempotencyKey: occurredAt,
        },
      );
      events = envelope.jobActivityEvents ?? [];
      break;
    }

    case "mark_deliverable_prepared": {
      const def = resolveRequiredDeliverableKeys(requiredDeliverables).find(
        (entry) => entry.key === body.deliverableKey,
      );
      if (!def) {
        return { ok: false, error: "Unknown deliverable.", status: 400 };
      }

      job = {
        ...job,
        deliverablePrep: mergeDeliverablePrep(
          job.deliverablePrep,
          def.key,
          def.label,
          true,
          actor,
          occurredAt,
        ),
        updatedAt: occurredAt,
      };

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "deliverable_prepared",
        occurredAt,
        actor,
        reason: `Prepared: ${def.label}`,
      });
      break;
    }

    case "add_internal_note": {
      const content = body.content.trim();
      if (!content) {
        return { ok: false, error: "Note content is required.", status: 400 };
      }

      const note = {
        id: `note:${job.jobId}:${occurredAt}`,
        content,
        createdAt: occurredAt,
        author: actor,
      };

      job = {
        ...job,
        internalNotes: [...(job.internalNotes ?? []), note],
        updatedAt: occurredAt,
      };

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "internal_note",
        occurredAt,
        actor,
        reason: "Internal note added",
        messageContent: content,
      });
      break;
    }

    case "add_working_file_ref": {
      const label = body.label.trim();
      const url = body.url.trim();
      if (!label || !url) {
        return { ok: false, error: "Label and URL are required.", status: 400 };
      }

      const ref = {
        id: `ref:${job.jobId}:${occurredAt}`,
        label,
        url,
        addedAt: occurredAt,
        author: actor,
      };

      job = {
        ...job,
        workingFileRefs: [...(job.workingFileRefs ?? []), ref],
        updatedAt: occurredAt,
      };

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "working_file_ref",
        occurredAt,
        actor,
        reason: `Working file: ${label}`,
        messageRef: url,
      });
      break;
    }

    case "submit_for_owner_approval": {
      const gate = canSubmitForOwnerApproval(job, requiredDeliverables);
      if (!gate.allowed) {
        return {
          ok: false,
          error: gate.reasons.map((reason) => reason.message).join(" "),
          status: 422,
        };
      }

      job = requestOwnerApprovalBeforeReview(job);
      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "approval",
        occurredAt,
        actor,
        reason: "Submitted for Owner approval before client review",
      });
      break;
    }

    case "owner_approve_for_review": {
      if (!isOwnerUser(user)) {
        return { ok: false, error: "Owner approval requires owner role.", status: 403 };
      }

      const gate = canOwnerApproveForReview(job);
      if (!gate.allowed) {
        return {
          ok: false,
          error: gate.reasons.map((reason) => reason.message).join(" "),
          status: 422,
        };
      }

      const previousSpineStatus = job.spineStatus;
      job = {
        ...job,
        ownerApprovalPending: null,
        updatedAt: occurredAt,
      };

      const result = applyJobSpineStatusChange(job, events, {
        job,
        nextStatus: "ready_for_review",
        actor,
        reason: "Owner approved — ready for client review",
        occurredAt,
      });
      job = result.job;
      events = result.events;
      envelope = enqueueJobCommunicationRecord(
        { ...envelope, jobActivityEvents: events },
        {
          campaign,
          clientId,
          job,
          eventType:
            previousSpineStatus === "revision_requested"
              ? "revision_ready_again"
              : "ready_for_review",
          sender: actor,
          occurredAt,
          idempotencyKey: occurredAt,
        },
      );
      events = envelope.jobActivityEvents ?? [];
      break;
    }

    case "add_client_delivery_file": {
      const def = resolveRequiredDeliverableKeys(requiredDeliverables).find(
        (entry) => entry.key === body.deliverableKey,
      );
      if (!def) {
        return { ok: false, error: "Unknown deliverable.", status: 400 };
      }

      const fileName = body.fileName.trim();
      const fileType = body.fileType.trim();
      const url = body.url.trim();
      if (!fileName || !fileType || !url) {
        return { ok: false, error: "File name, type, and URL are required.", status: 400 };
      }

      const fileResult = addClientDeliveryFile(job, events, {
        deliverableKey: def.key,
        deliverableLabel: def.label,
        fileName,
        fileType,
        url,
        useInstructions: body.useInstructions,
        actor,
        occurredAt,
      });
      job = fileResult.job;
      events = fileResult.events;
      break;
    }

    case "owner_final_release": {
      if (!isOwnerUser(user)) {
        return { ok: false, error: "Owner approval requires owner role.", status: 403 };
      }

      const releaseGate = canOwnerFinalRelease(job);
      if (!releaseGate.allowed) {
        return {
          ok: false,
          error: releaseGate.reasons.map((reason) => reason.message).join(" "),
          status: 422,
        };
      }

      job = {
        ...job,
        ownerApprovalPending: null,
        updatedAt: occurredAt,
      };

      const releaseResult = applyJobSpineStatusChange(job, events, {
        job,
        nextStatus: "ready_for_delivery",
        actor,
        reason: "Owner final release — ready for client delivery",
        occurredAt,
      });
      job = releaseResult.job;
      events = releaseResult.events;

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
          job,
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
      if (!isOwnerUser(user)) {
        return { ok: false, error: "Owner approval requires owner role.", status: 403 };
      }

      const deliverGate = canMarkJobDelivered(job, requiredDeliverables);
      if (!deliverGate.allowed) {
        return {
          ok: false,
          error: deliverGate.reasons.map((reason) => reason.message).join(" "),
          status: 422,
        };
      }

      const deliverResult = applyJobSpineStatusChange(job, events, {
        job,
        nextStatus: "delivered",
        actor,
        reason: "Delivered to client",
        occurredAt,
      });
      const deliveredJob: PurchasedJobRecord = {
        ...deliverResult.job,
        deliveredAt: occurredAt,
      };
      job = deliveredJob;
      events = deliverResult.events;

      events = appendJobActivityEvent(events, {
        campaignId: deliveredJob.campaignId,
        jobId: deliveredJob.jobId,
        kind: "delivery_completed",
        occurredAt,
        actor,
        reason: "Job delivered to client",
        spineStatus: "delivered",
      });

      const productionSkuIds = new Set(
        filterProductionPlanLineItems(campaign.approvedStudioPlan!).map(
          (line) => (line.skuId ?? line.serviceId)!,
        ),
      );
      const allJobs = (envelope.jobRecords ?? [])
        .filter((entry) => productionSkuIds.has(entry.skuId))
        .map((entry) => (entry.jobId === deliveredJob.jobId ? deliveredJob : entry));
      const updatedCampaign = syncCampaignStatusAfterDelivery(campaign, allJobs, occurredAt);

      return {
        ok: true,
        envelope: updateJobInEnvelope(envelope, deliveredJob, events),
        job: deliveredJob,
        updatedCampaign,
      };
    }

    case "issue_refund": {
      if (!isOwnerUser(user)) {
        return { ok: false, error: "Owner role required.", status: 403 };
      }
      if (job.productionStartedAt || job.nonRefundable) {
        return {
          ok: false,
          error: "Production has started for this job, so it is nonrefundable.",
          status: 422,
        };
      }

      const reason = body.reason.trim();
      if (!reason) {
        return { ok: false, error: "Refund reason is required.", status: 400 };
      }

      const refundResult = applyJobSpineStatusChange(job, events, {
        job,
        nextStatus: "refunded_cancelled",
        actor,
        reason,
        occurredAt,
      });
      job = {
        ...refundResult.job,
        refundEligibleAt: job.refundEligibleAt ?? occurredAt,
      };
      events = refundResult.events;
      envelope = enqueueJobCommunicationRecord(
        { ...envelope, jobActivityEvents: events },
        {
          campaign,
          clientId,
          job,
          eventType: "refund_issued",
          sender: actor,
          occurredAt,
          idempotencyKey: occurredAt,
          reason,
        },
      );
      events = envelope.jobActivityEvents ?? [];
      break;
    }

    default:
      return { ok: false, error: "Unknown action.", status: 400 };
  }

  return {
    ok: true,
    envelope: updateJobInEnvelope(envelope, job, events),
    job,
  };
}
