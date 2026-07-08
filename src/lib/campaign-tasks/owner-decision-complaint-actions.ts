import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import type { ExceptionActionResult } from "./exceptions-actions";
import {
  appendExceptionEvent,
  buildExceptionEvent,
  buildExceptionRecord,
  exceptionActorRole,
  upsertExceptionRecord,
} from "./exceptions";
import { CAMPAIGN_TASKS_SCHEMA_VERSION } from "./plan-change";
import { mergeOwnerNotes } from "./owner-decision-exception-shared";
import type { OwnerDecisionInteractionRecord } from "./owner-decision-interaction-types";
import type { ServerTasksEnvelope } from "./types";

export type ComplaintActionResult =
  | {
      ok: true;
      envelope: ServerTasksEnvelope;
      interaction: OwnerDecisionInteractionRecord;
    }
  | { ok: false; error: string; status: number };

function findInteraction(
  envelope: ServerTasksEnvelope,
  interactionId: string,
): OwnerDecisionInteractionRecord | undefined {
  return envelope.ownerDecisionInteractions?.find((entry) => entry.id === interactionId);
}

function requireOwnerComplaintGate(
  user: StudioUser,
  record: OwnerDecisionInteractionRecord,
): { ok: true } | { ok: false; error: string; status: number } {
  if (!isOwnerUser(user)) {
    return { ok: false, error: "Owner role required.", status: 403 };
  }
  if (record.interactionKind !== "complaint") {
    return { ok: false, error: "Interaction is not a complaint.", status: 422 };
  }
  if (record.status !== "waiting_owner") {
    return { ok: false, error: "Complaint is not waiting on Owner.", status: 422 };
  }
  return { ok: true };
}

function upsertInteraction(
  envelope: ServerTasksEnvelope,
  updated: OwnerDecisionInteractionRecord,
): OwnerDecisionInteractionRecord[] {
  const list = [...(envelope.ownerDecisionInteractions ?? [])];
  const index = list.findIndex((entry) => entry.id === updated.id);
  if (index === -1) {
    list.push(updated);
  } else {
    list[index] = updated;
  }
  return list;
}

function withInteractionEnvelope(
  envelope: ServerTasksEnvelope,
  interactions: OwnerDecisionInteractionRecord[],
  records = envelope.exceptionRecords,
  events = envelope.exceptionEvents,
): ServerTasksEnvelope {
  const now = new Date().toISOString();
  return {
    ...envelope,
    ownerDecisionInteractions: interactions,
    exceptionRecords: records,
    exceptionEvents: events,
    updatedAt: now,
    syncedAt: now,
    version: CAMPAIGN_TASKS_SCHEMA_VERSION,
  };
}

function resolveComplaint(
  envelope: ServerTasksEnvelope,
  interaction: OwnerDecisionInteractionRecord,
  resolutionNotes: string | undefined,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ComplaintActionResult {
  const now = new Date().toISOString();
  const updated: OwnerDecisionInteractionRecord = {
    ...interaction,
    status: "resolved",
    resolutionNotes,
    updatedAt: now,
  };
  const interactions = upsertInteraction(envelope, updated);
  const actorRole = exceptionActorRole(user, assignments);
  const event = buildExceptionEvent({
    exceptionId: interaction.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "resolved",
    notes: resolutionNotes,
    statusAfter: "resolved",
  });
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withInteractionEnvelope(envelope, interactions, envelope.exceptionRecords, events),
    interaction: updated,
  };
}

function escalateComplaint(
  envelope: ServerTasksEnvelope,
  interaction: OwnerDecisionInteractionRecord,
  payload: {
    ownerNotes?: string;
    handoffSuffix: string;
    kind: "scope_change";
    title: string;
    description: string;
    taskId?: string;
  },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ComplaintActionResult {
  const gate = requireOwnerComplaintGate(user, interaction);
  if (!gate.ok) return gate;

  const resolutionNotes = mergeOwnerNotes(payload.ownerNotes, payload.handoffSuffix);
  const resolved = resolveComplaint(envelope, interaction, resolutionNotes, user, assignments);
  if (!resolved.ok) return resolved;

  const actorRole = exceptionActorRole(user, assignments);
  const record = buildExceptionRecord({
    campaignId: envelope.campaignId,
    kind: payload.kind,
    title: payload.title,
    description: payload.description,
    user,
    actorRole,
    taskId: payload.taskId,
  });

  const raiseEvent = buildExceptionEvent({
    exceptionId: record.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "raised",
    statusAfter: record.status,
    notes: payload.description,
  });

  const records = upsertExceptionRecord(resolved.envelope.exceptionRecords, record);
  const events = appendExceptionEvent(resolved.envelope.exceptionEvents, raiseEvent);

  return {
    ok: true,
    envelope: withInteractionEnvelope(resolved.envelope, resolved.envelope.ownerDecisionInteractions ?? [], records, events),
    interaction: resolved.interaction,
  };
}

function waitingInteraction(
  envelope: ServerTasksEnvelope,
  interaction: OwnerDecisionInteractionRecord,
  status: OwnerDecisionInteractionRecord["status"],
  notes: string | undefined,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ComplaintActionResult {
  const gate = requireOwnerComplaintGate(user, interaction);
  if (!gate.ok) return gate;

  const now = new Date().toISOString();
  const updated: OwnerDecisionInteractionRecord = {
    ...interaction,
    status,
    resolutionNotes: notes,
    updatedAt: now,
  };
  const interactions = upsertInteraction(envelope, updated);
  const actorRole = exceptionActorRole(user, assignments);
  const event = buildExceptionEvent({
    exceptionId: interaction.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "assigned",
    notes,
    statusAfter: status,
  });
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withInteractionEnvelope(envelope, interactions, envelope.exceptionRecords, events),
    interaction: updated,
  };
}

export function applyOwnerResolveComplaint(
  envelope: ServerTasksEnvelope,
  payload: { interactionId: string; clientReply: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ComplaintActionResult {
  const existing = findInteraction(envelope, payload.interactionId);
  if (!existing) return { ok: false, error: "Interaction not found.", status: 404 };

  const gate = requireOwnerComplaintGate(user, existing);
  if (!gate.ok) return gate;

  const clientReply = payload.clientReply.trim();
  if (!clientReply) {
    return { ok: false, error: "Approved client reply is required.", status: 400 };
  }

  const notes = mergeOwnerNotes(payload.ownerNotes, `Owner resolve (complaint): ${clientReply}`);
  return resolveComplaint(envelope, existing, notes, user, assignments);
}

export function applyOwnerEscalateComplaintRefund(
  envelope: ServerTasksEnvelope,
  payload: { interactionId: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ComplaintActionResult {
  const existing = findInteraction(envelope, payload.interactionId);
  if (!existing) return { ok: false, error: "Interaction not found.", status: 404 };

  const gate = requireOwnerComplaintGate(user, existing);
  if (!gate.ok) return gate;

  const notes = mergeOwnerNotes(
    payload.ownerNotes,
    "Owner escalate (complaint → refund folder)",
  );
  const resolved = resolveComplaint(envelope, existing, notes, user, assignments);
  if (!resolved.ok) return resolved;

  if (existing.jobId) {
    const now = new Date().toISOString();
    const jobRecords = (resolved.envelope.jobRecords ?? []).map((job) =>
      job.jobId === existing.jobId
        ? { ...job, refundEligibleAt: job.refundEligibleAt ?? now, updatedAt: now }
        : job,
    );
    return {
      ok: true,
      envelope: { ...resolved.envelope, jobRecords },
      interaction: resolved.interaction,
    };
  }

  return resolved;
}

export function applyOwnerEscalateComplaintScope(
  envelope: ServerTasksEnvelope,
  payload: { interactionId: string; ownerNotes?: string; taskId?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ComplaintActionResult {
  const existing = findInteraction(envelope, payload.interactionId);
  if (!existing) return { ok: false, error: "Interaction not found.", status: 404 };

  return escalateComplaint(
    envelope,
    existing,
    {
      ownerNotes: payload.ownerNotes,
      handoffSuffix: "Owner escalate (complaint → scope folder)",
      kind: "scope_change",
      title: "Scope change — escalated from complaint",
      description: existing.clientMessage,
      taskId: payload.taskId,
    },
    user,
    assignments,
  );
}

export function applyOwnerEscalateComplaintRevision(
  envelope: ServerTasksEnvelope,
  payload: { interactionId: string; ownerNotes?: string; taskId?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ComplaintActionResult {
  const existing = findInteraction(envelope, payload.interactionId);
  if (!existing) return { ok: false, error: "Interaction not found.", status: 404 };

  return escalateComplaint(
    envelope,
    existing,
    {
      ownerNotes: payload.ownerNotes,
      handoffSuffix: "Owner escalate (complaint -> client boundary review)",
      kind: "scope_change",
      title: "Client Boundary Review - escalated from complaint",
      description: existing.clientMessage,
      taskId: payload.taskId,
    },
    user,
    assignments,
  );
}

export function applyOwnerHoldComplaint(
  envelope: ServerTasksEnvelope,
  payload: { interactionId: string; note: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ComplaintActionResult {
  const existing = findInteraction(envelope, payload.interactionId);
  if (!existing) return { ok: false, error: "Interaction not found.", status: 404 };

  const note = payload.note.trim();
  if (!note) return { ok: false, error: "A hold note is required.", status: 400 };

  return waitingInteraction(
    envelope,
    existing,
    "waiting_internal",
    mergeOwnerNotes(payload.ownerNotes, `Owner hold (complaint): ${note}`),
    user,
    assignments,
  );
}

export function applyOwnerAskTeamComplaint(
  envelope: ServerTasksEnvelope,
  payload: { interactionId: string; note: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ComplaintActionResult {
  const existing = findInteraction(envelope, payload.interactionId);
  if (!existing) return { ok: false, error: "Interaction not found.", status: 404 };

  const note = payload.note.trim();
  if (!note) return { ok: false, error: "A note for the team is required.", status: 400 };

  return waitingInteraction(
    envelope,
    existing,
    "waiting_internal",
    mergeOwnerNotes(payload.ownerNotes, `Owner ask-team (complaint): ${note}`),
    user,
    assignments,
  );
}

export function applyOwnerAskClientComplaint(
  envelope: ServerTasksEnvelope,
  payload: { interactionId: string; clientMessage: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ComplaintActionResult {
  const existing = findInteraction(envelope, payload.interactionId);
  if (!existing) return { ok: false, error: "Interaction not found.", status: 404 };

  const clientMessage = payload.clientMessage.trim();
  if (!clientMessage) {
    return { ok: false, error: "Approved client-facing wording is required.", status: 400 };
  }

  return waitingInteraction(
    envelope,
    existing,
    "waiting_client",
    mergeOwnerNotes(payload.ownerNotes, `Owner ask-client (complaint): ${clientMessage}`),
    user,
    assignments,
  );
}

export function applyOwnerAssignComplaint(
  envelope: ServerTasksEnvelope,
  payload: { interactionId: string; ownerNotes?: string; note?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ComplaintActionResult {
  const existing = findInteraction(envelope, payload.interactionId);
  if (!existing) return { ok: false, error: "Interaction not found.", status: 404 };

  return waitingInteraction(
    envelope,
    existing,
    "waiting_internal",
    mergeOwnerNotes(payload.ownerNotes, payload.note?.trim()),
    user,
    assignments,
  );
}

export function applyOwnerDeclineComplaintEscalation(
  envelope: ServerTasksEnvelope,
  payload: { interactionId: string; clientReply: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ComplaintActionResult {
  const existing = findInteraction(envelope, payload.interactionId);
  if (!existing) return { ok: false, error: "Interaction not found.", status: 404 };

  const gate = requireOwnerComplaintGate(user, existing);
  if (!gate.ok) return gate;

  const clientReply = payload.clientReply.trim();
  if (!clientReply) {
    return { ok: false, error: "Policy-bound client reply is required.", status: 400 };
  }

  const notes = mergeOwnerNotes(
    payload.ownerNotes,
    `Owner decline escalation (complaint): ${clientReply}`,
  );
  return resolveComplaint(envelope, existing, notes, user, assignments);
}
