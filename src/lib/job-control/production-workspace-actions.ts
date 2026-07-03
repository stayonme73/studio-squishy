import type { CampaignRecord } from "@/config/studio-board";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";

import { appendJobActivityEvent } from "./activity-log";
import { applyJobSpineStatusChange, requestOwnerApprovalBeforeReview } from "./actions";
import type { ProductionLaneView } from "./capacity";
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
  | "submit_for_owner_approval"
  | "owner_approve_for_review";

export type ProductionWorkspacePatchBody =
  | { action: "start_building_concepts" }
  | { action: "mark_deliverable_prepared"; deliverableKey: string }
  | { action: "add_internal_note"; content: string }
  | { action: "add_working_file_ref"; label: string; url: string }
  | { action: "submit_for_owner_approval" }
  | { action: "owner_approve_for_review" };

export type ProductionWorkspacePatchResult =
  | { ok: true; envelope: ServerTasksEnvelope; job: PurchasedJobRecord }
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
      };
      events = result.events;
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
