import type { CampaignRecord } from "@/config/studio-board";
import { requiredDeliverablesForJob } from "@/lib/approved-plan-line";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import {
  addJobFileReference,
  createReferenceOnlyStorageRef,
  releaseFinalDeliveryFiles,
} from "@/lib/file-registry/job-files";

import { appendJobActivityEvent } from "./activity-log";
import { applyJobSpineStatusChange, requestOwnerApprovalBeforeReview } from "./actions";
import { enqueueJobCommunicationRecord } from "./communication";
import type { ProductionLaneView } from "./capacity";
import { addClientDeliveryFile, syncCampaignStatusAfterDelivery } from "./final-delivery-actions";
import { canMarkJobDelivered, canOwnerActOnReleaseGate, canOwnerFinalRelease } from "./final-delivery-gates";
import {
  canOwnerActOnReviewGate,
  canOwnerApproveForReview,
  canSubmitForOwnerApproval,
  canTransitionToBuildingConcepts,
  mergeDeliverablePrep,
  resolveRequiredDeliverableKeys,
} from "./production-workspace-gates";
import { parseJobId } from "./lane-map";
import {
  isJobWorkPacketRole,
  resolveWorkPacketRolesForJob,
  resolveWorkPacketTasksForRole,
  workPacketId,
} from "./work-packets";
import type {
  JobActivityActor,
  JobActivityEvent,
  JobWorkPacket,
  JobWorkPacketFileKind,
  JobWorkPacketRole,
  PurchasedJobRecord,
} from "./types";

export type ProductionWorkspacePatchAction =
  | "start_building_concepts"
  | "assign_work_packet"
  | "return_work_packet_file"
  | "mark_deliverable_prepared"
  | "add_internal_note"
  | "add_working_file_ref"
  | "add_client_delivery_file"
  | "submit_for_owner_approval"
  | "owner_approve_for_review"
  | "owner_send_back_for_review"
  | "owner_hold_review_gate"
  | "owner_ask_team_review_gate"
  | "owner_ask_client_review_gate"
  | "owner_send_back_for_release"
  | "owner_hold_release_gate"
  | "owner_ask_team_release_gate"
  | "owner_final_release"
  | "mark_delivered"
  | "issue_refund";

export type ProductionWorkspacePatchBody =
  | { action: "start_building_concepts" }
  | { action: "assign_work_packet"; role: JobWorkPacketRole; note?: string }
  | {
      action: "return_work_packet_file";
      packetId: string;
      fileKind: JobWorkPacketFileKind;
      label: string;
      url: string;
      deliverableKey?: string;
      note?: string;
    }
  | { action: "mark_deliverable_prepared"; deliverableKey: string }
  | { action: "add_internal_note"; content: string }
  | {
      action: "add_working_file_ref";
      label: string;
      url: string;
      category?: "internal_draft" | "internal_only_source";
    }
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
  | { action: "owner_send_back_for_review"; note: string }
  | { action: "owner_hold_review_gate"; note: string }
  | { action: "owner_ask_team_review_gate"; note: string }
  | { action: "owner_ask_client_review_gate"; clientMessage: string }
  | { action: "owner_send_back_for_release"; note: string }
  | { action: "owner_hold_release_gate"; note: string }
  | { action: "owner_ask_team_release_gate"; note: string }
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

function clearOwnerReviewGatePending(
  job: PurchasedJobRecord,
  occurredAt: string,
): PurchasedJobRecord {
  return {
    ...job,
    ownerApprovalPending: null,
    updatedAt: occurredAt,
  };
}

function clearDeliverablePrepFlags(job: PurchasedJobRecord): PurchasedJobRecord {
  return {
    ...job,
    deliverablePrep: (job.deliverablePrep ?? []).map((entry) => ({
      ...entry,
      preparedAt: undefined,
      preparedBy: undefined,
    })),
  };
}

function appendOwnerInternalNote(
  job: PurchasedJobRecord,
  events: JobActivityEvent[],
  actor: JobActivityActor,
  occurredAt: string,
  content: string,
): { job: PurchasedJobRecord; events: JobActivityEvent[] } {
  const note = {
    id: `note:${job.jobId}:${occurredAt}`,
    content,
    createdAt: occurredAt,
    author: actor,
  };

  const updatedJob = {
    ...job,
    internalNotes: [...(job.internalNotes ?? []), note],
    updatedAt: occurredAt,
  };

  const updatedEvents = appendJobActivityEvent(events, {
    campaignId: job.campaignId,
    jobId: job.jobId,
    kind: "internal_note",
    occurredAt,
    actor,
    reason: "Owner review gate note",
    messageContent: content,
  });

  return { job: updatedJob, events: updatedEvents };
}

function requireOwnerReleaseGateAction(
  job: PurchasedJobRecord,
  user: StudioUser,
): { ok: true } | { ok: false; error: string; status: number } {
  if (!isOwnerUser(user)) {
    return { ok: false, error: "Owner role required.", status: 403 };
  }

  const gate = canOwnerActOnReleaseGate(job);
  if (!gate.allowed) {
    return {
      ok: false,
      error: gate.reasons.map((reason) => reason.message).join(" "),
      status: 422,
    };
  }

  return { ok: true };
}

function requireOwnerReviewGateAction(
  job: PurchasedJobRecord,
  user: StudioUser,
): { ok: true } | { ok: false; error: string; status: number } {
  if (!isOwnerUser(user)) {
    return { ok: false, error: "Owner role required.", status: 403 };
  }

  const gate = canOwnerActOnReviewGate(job);
  if (!gate.allowed) {
    return {
      ok: false,
      error: gate.reasons.map((reason) => reason.message).join(" "),
      status: 422,
    };
  }

  return { ok: true };
}

function findJobRecord(envelope: ServerTasksEnvelope, jobId: string): PurchasedJobRecord | null {
  return (envelope.jobRecords ?? []).find((entry) => entry.jobId === jobId) ?? null;
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

export function applyProductionWorkspacePatch(
  envelope: ServerTasksEnvelope,
  campaign: CampaignRecord,
  jobId: string,
  body: ProductionWorkspacePatchBody,
  user: StudioUser,
  materials: readonly CampaignMaterialItem[],
  laneViews: readonly ProductionLaneView[],
  clientId = `unclaimed-client:${campaign.campaignId}`,
  tasks: readonly CampaignTaskItem[] = [],
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

    case "assign_work_packet": {
      if (!isJobWorkPacketRole(body.role)) {
        return { ok: false, error: "Unknown Team Office role.", status: 400 };
      }

      const allowedRoles = resolveWorkPacketRolesForJob(tasks, job);
      if (!allowedRoles.includes(body.role)) {
        return { ok: false, error: "Role is not part of this job's production pipeline.", status: 400 };
      }

      const roleTasks = resolveWorkPacketTasksForRole(tasks, job, body.role);
      const packetId = workPacketId(job.jobId, body.role);
      const assignment = {
        id: `assign:${packetId}:${occurredAt}`,
        assignedAt: occurredAt,
        assignedBy: actor,
        role: body.role,
        note: body.note?.trim() || undefined,
      };
      const existingPackets = [...(job.workPackets ?? [])];
      const existingIndex = existingPackets.findIndex((packet) => packet.id === packetId);
      const existing = existingPackets[existingIndex];
      const packet: JobWorkPacket = {
        id: packetId,
        jobId: job.jobId,
        campaignId: job.campaignId,
        role: body.role,
        taskIds: roleTasks.map((task) => task.id),
        status: "assigned",
        createdAt: existing?.createdAt ?? occurredAt,
        updatedAt: occurredAt,
        assignmentEvents: [...(existing?.assignmentEvents ?? []), assignment],
        returnedFileRefs: existing?.returnedFileRefs ?? [],
        returnLocation: "production_workspace",
        ownerApprovalRequired: true,
      };

      if (existingIndex >= 0) {
        existingPackets[existingIndex] = packet;
      } else {
        existingPackets.push(packet);
      }

      job = {
        ...job,
        workPackets: existingPackets,
        updatedAt: occurredAt,
      };

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "work_packet_assigned",
        occurredAt,
        actor,
        reason: `Assigned Work Packet to ${body.role}`,
        messageRef: packetId,
      });
      break;
    }

    case "return_work_packet_file": {
      const label = body.label.trim();
      const url = body.url.trim();
      if (!label || !url) {
        return { ok: false, error: "Returned file label and URL are required.", status: 400 };
      }
      if (body.fileKind !== "draft" && body.fileKind !== "final") {
        return { ok: false, error: "Returned file kind must be draft or final.", status: 400 };
      }

      const packets = [...(job.workPackets ?? [])];
      const packetIndex = packets.findIndex((packet) => packet.id === body.packetId);
      if (packetIndex === -1) {
        return { ok: false, error: "Work Packet not found for this job.", status: 404 };
      }

      const deliverableDef = body.deliverableKey
        ? resolveRequiredDeliverableKeys(requiredDeliverables).find(
            (entry) => entry.key === body.deliverableKey,
          )
        : undefined;
      if (body.deliverableKey && !deliverableDef) {
        return { ok: false, error: "Unknown deliverable.", status: 400 };
      }

      const storageRef = createReferenceOnlyStorageRef({
        reference: url,
        displayLabel: label,
      });
      const registryResult = addJobFileReference(job, events, {
        clientId,
        category: "internal_draft",
        filename: label,
        fileType: body.fileKind,
        storageRef,
        visibility: "internal_only",
        status: "draft",
        actor,
        occurredAt,
        deliverableKey: deliverableDef?.key,
        deliverableLabel: deliverableDef?.label,
        idPrefix: "wpr-file",
      });
      job = registryResult.job;
      events = registryResult.events;

      const returnedFile = {
        id: `wpr:${body.packetId}:${occurredAt}`,
        kind: body.fileKind,
        label,
        url,
        returnedAt: occurredAt,
        returnedBy: actor,
        registryFileId: registryResult.file.id,
        storageRef,
        deliverableKey: deliverableDef?.key,
        deliverableLabel: deliverableDef?.label,
        note: body.note?.trim() || undefined,
      };
      const packet = packets[packetIndex]!;
      packets[packetIndex] = {
        ...packet,
        status: "returned",
        updatedAt: occurredAt,
        returnedFileRefs: [...packet.returnedFileRefs, returnedFile],
      };

      job = {
        ...job,
        workPackets: packets,
        workingFileRefs: [
          ...(job.workingFileRefs ?? []),
          {
            id: `ref:${job.jobId}:work-packet:${occurredAt}`,
            label: `${body.fileKind === "final" ? "Final" : "Draft"} return: ${label}`,
            url,
            addedAt: occurredAt,
            author: actor,
            registryFileId: registryResult.file.id,
            storageRef,
          },
        ],
        deliverablePrep:
          body.fileKind === "final" && deliverableDef
            ? mergeDeliverablePrep(
                job.deliverablePrep,
                deliverableDef.key,
                deliverableDef.label,
                true,
                actor,
                occurredAt,
              )
            : job.deliverablePrep,
        updatedAt: occurredAt,
      };

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "work_packet_returned",
        occurredAt,
        actor,
        reason: `Returned ${body.fileKind} file: ${label}`,
        messageRef: returnedFile.id,
      });
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
      const category =
        body.category === "internal_only_source" ? "internal_only_source" : "internal_draft";

      const storageRef = createReferenceOnlyStorageRef({
        reference: url,
        displayLabel: label,
      });
      const registryResult = addJobFileReference(job, events, {
        clientId,
        category,
        filename: label,
        fileType: category === "internal_only_source" ? "source reference" : "reference",
        storageRef,
        visibility: "internal_only",
        status: "draft",
        actor,
        occurredAt,
        idPrefix: "working-file",
      });
      job = registryResult.job;
      events = registryResult.events;

      const ref = {
        id: `ref:${job.jobId}:${occurredAt}`,
        label,
        url,
        addedAt: occurredAt,
        author: actor,
        registryFileId: registryResult.file.id,
        storageRef,
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

    case "owner_send_back_for_review": {
      const gateCheck = requireOwnerReviewGateAction(job, user);
      if (!gateCheck.ok) {
        return { ok: false, error: gateCheck.error, status: gateCheck.status };
      }

      const note = body.note.trim();
      if (!note) {
        return { ok: false, error: "A note for production is required.", status: 400 };
      }

      job = clearOwnerReviewGatePending(clearDeliverablePrepFlags(job), occurredAt);

      const spineResult = applyJobSpineStatusChange(job, events, {
        job,
        nextStatus: "building_concepts",
        actor,
        reason: "Owner sent work back for revision before client review",
        occurredAt,
      });
      job = spineResult.job;
      events = spineResult.events;

      const noted = appendOwnerInternalNote(
        job,
        events,
        actor,
        occurredAt,
        `Owner send-back (pre-review): ${note}`,
      );
      job = noted.job;
      events = noted.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "approval",
        occurredAt,
        actor,
        reason: "Owner sent work back to production before client review",
      });
      break;
    }

    case "owner_hold_review_gate": {
      const gateCheck = requireOwnerReviewGateAction(job, user);
      if (!gateCheck.ok) {
        return { ok: false, error: gateCheck.error, status: gateCheck.status };
      }

      const note = body.note.trim();
      if (!note) {
        return { ok: false, error: "A hold note is required.", status: 400 };
      }

      job = clearOwnerReviewGatePending(job, occurredAt);

      const noted = appendOwnerInternalNote(
        job,
        events,
        actor,
        occurredAt,
        `Owner hold (pre-review): ${note}`,
      );
      job = noted.job;
      events = noted.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "approval",
        occurredAt,
        actor,
        reason: "Owner held review gate for internal clarification",
      });
      break;
    }

    case "owner_ask_team_review_gate": {
      const gateCheck = requireOwnerReviewGateAction(job, user);
      if (!gateCheck.ok) {
        return { ok: false, error: gateCheck.error, status: gateCheck.status };
      }

      const note = body.note.trim();
      if (!note) {
        return { ok: false, error: "A note for the team is required.", status: 400 };
      }

      job = clearOwnerReviewGatePending(job, occurredAt);

      const noted = appendOwnerInternalNote(
        job,
        events,
        actor,
        occurredAt,
        `Owner ask-team (pre-review): ${note}`,
      );
      job = noted.job;
      events = noted.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "approval",
        occurredAt,
        actor,
        reason: "Owner asked the team for follow-up before client review",
      });
      break;
    }

    case "owner_ask_client_review_gate": {
      const gateCheck = requireOwnerReviewGateAction(job, user);
      if (!gateCheck.ok) {
        return { ok: false, error: gateCheck.error, status: gateCheck.status };
      }

      const clientMessage = body.clientMessage.trim();
      if (!clientMessage) {
        return { ok: false, error: "Approved client-facing wording is required.", status: 400 };
      }

      job = clearOwnerReviewGatePending(job, occurredAt);

      const spineResult = applyJobSpineStatusChange(job, events, {
        job,
        nextStatus: "waiting_on_client",
        actor,
        reason: "Owner requested client input before review can continue",
        occurredAt,
      });
      job = spineResult.job;
      events = spineResult.events;

      const noted = appendOwnerInternalNote(
        job,
        events,
        actor,
        occurredAt,
        `Owner client ask (approved, pre-review): ${clientMessage}`,
      );
      job = noted.job;
      events = noted.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "client_communication",
        occurredAt,
        actor,
        reason: "Owner requested client input before review",
        messageContent: clientMessage,
      });
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
        clientId,
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

    case "owner_send_back_for_release": {
      const gateCheck = requireOwnerReleaseGateAction(job, user);
      if (!gateCheck.ok) {
        return { ok: false, error: gateCheck.error, status: gateCheck.status };
      }

      const note = body.note.trim();
      if (!note) {
        return { ok: false, error: "A note for production is required.", status: 400 };
      }

      job = clearOwnerReviewGatePending(job, occurredAt);

      const spineResult = applyJobSpineStatusChange(job, events, {
        job,
        nextStatus: "building_concepts",
        actor,
        reason: "Owner sent final package back for revision before delivery",
        occurredAt,
      });
      job = spineResult.job;
      events = spineResult.events;

      const noted = appendOwnerInternalNote(
        job,
        events,
        actor,
        occurredAt,
        `Owner send-back (pre-delivery): ${note}`,
      );
      job = noted.job;
      events = noted.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "approval",
        occurredAt,
        actor,
        reason: "Owner sent final package back to production before delivery",
      });
      break;
    }

    case "owner_hold_release_gate": {
      const gateCheck = requireOwnerReleaseGateAction(job, user);
      if (!gateCheck.ok) {
        return { ok: false, error: gateCheck.error, status: gateCheck.status };
      }

      const note = body.note.trim();
      if (!note) {
        return { ok: false, error: "A hold note is required.", status: 400 };
      }

      job = clearOwnerReviewGatePending(job, occurredAt);

      const noted = appendOwnerInternalNote(
        job,
        events,
        actor,
        occurredAt,
        `Owner hold (pre-delivery): ${note}`,
      );
      job = noted.job;
      events = noted.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "approval",
        occurredAt,
        actor,
        reason: "Owner held final release for internal clarification",
      });
      break;
    }

    case "owner_ask_team_release_gate": {
      const gateCheck = requireOwnerReleaseGateAction(job, user);
      if (!gateCheck.ok) {
        return { ok: false, error: gateCheck.error, status: gateCheck.status };
      }

      const note = body.note.trim();
      if (!note) {
        return { ok: false, error: "A note for the team is required.", status: 400 };
      }

      job = clearOwnerReviewGatePending(job, occurredAt);

      const noted = appendOwnerInternalNote(
        job,
        events,
        actor,
        occurredAt,
        `Owner ask-team (pre-delivery): ${note}`,
      );
      job = noted.job;
      events = noted.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "approval",
        occurredAt,
        actor,
        reason: "Owner asked the team for final QA follow-up before delivery",
      });
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

      const fileReleaseResult = releaseFinalDeliveryFiles(job, events, actor, occurredAt);
      job = fileReleaseResult.job;
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
