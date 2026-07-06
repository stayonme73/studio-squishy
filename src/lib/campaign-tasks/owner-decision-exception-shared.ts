import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import type { ExceptionActionResult } from "./exceptions-actions";
import { applyResolveException } from "./exceptions-actions";
import {
  appendExceptionEvent,
  buildExceptionEvent,
  canAssignException,
  exceptionActorRole,
  findExceptionById,
  isOpenExceptionStatus,
  upsertExceptionRecord,
} from "./exceptions";
import type { CampaignExceptionKind, CampaignExceptionRecord } from "./exceptions-types";
import { CAMPAIGN_TASKS_SCHEMA_VERSION } from "./plan-change";
import type { ServerTasksEnvelope } from "./types";

export function mergeOwnerNotes(
  ownerNotes: string | undefined,
  note: string | undefined,
): string | undefined {
  const parts = [ownerNotes?.trim(), note?.trim()].filter(Boolean);
  return parts.length ? parts.join(" — ") : undefined;
}

export function withOwnerDecisionEnvelope(
  envelope: ServerTasksEnvelope,
  records: CampaignExceptionRecord[],
  events: ReturnType<typeof appendExceptionEvent>,
): ServerTasksEnvelope {
  const now = new Date().toISOString();
  return {
    ...envelope,
    exceptionRecords: records,
    exceptionEvents: events,
    updatedAt: now,
    syncedAt: now,
    version: CAMPAIGN_TASKS_SCHEMA_VERSION,
  };
}

export function requireOwnerExceptionGate(
  user: StudioUser,
  record: CampaignExceptionRecord,
  kind: CampaignExceptionKind,
  waitingLabel: string,
): { ok: true } | { ok: false; error: string; status: number } {
  if (!isOwnerUser(user)) {
    return { ok: false, error: "Owner role required.", status: 403 };
  }
  if (record.kind !== kind) {
    return { ok: false, error: `Exception is not a ${waitingLabel}.`, status: 422 };
  }
  if (!isOpenExceptionStatus(record.status)) {
    return { ok: false, error: "Exception is not open.", status: 422 };
  }
  if (record.status !== "waiting_owner" && record.status !== "open") {
    return { ok: false, error: `${waitingLabel} is not waiting on Owner.`, status: 422 };
  }
  return { ok: true };
}

export function applyOwnerResolveExceptionDecision(
  envelope: ServerTasksEnvelope,
  payload: { exceptionId: string; ownerNotes?: string; resolutionSuffix: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  return applyResolveException(
    envelope,
    {
      exceptionId: payload.exceptionId,
      resolutionNotes: mergeOwnerNotes(payload.ownerNotes, payload.resolutionSuffix),
    },
    user,
    assignments,
  );
}

export function applyOwnerHoldExceptionDecision(
  envelope: ServerTasksEnvelope,
  payload: { exceptionId: string; note: string; ownerNotes?: string; eventPrefix: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  kind: CampaignExceptionKind,
  waitingLabel: string,
): ExceptionActionResult {
  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  const gate = requireOwnerExceptionGate(user, existing, kind, waitingLabel);
  if (!gate.ok) return gate;

  const note = payload.note.trim();
  if (!note) {
    return { ok: false, error: "A hold note is required.", status: 400 };
  }

  if (!canAssignException(user, assignments)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const actorRole = exceptionActorRole(user, assignments);
  const now = new Date().toISOString();
  const combinedNotes = mergeOwnerNotes(payload.ownerNotes, `${payload.eventPrefix}: ${note}`);
  const updated: CampaignExceptionRecord = {
    ...existing,
    status: "waiting_internal",
    updatedAt: now,
  };

  const event = buildExceptionEvent({
    exceptionId: updated.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "assigned",
    notes: combinedNotes,
    statusAfter: "waiting_internal",
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, updated);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withOwnerDecisionEnvelope(envelope, records, events),
    exception: updated,
  };
}

export function applyOwnerAskTeamExceptionDecision(
  envelope: ServerTasksEnvelope,
  payload: {
    exceptionId: string;
    note: string;
    ownerNotes?: string;
    eventPrefix: string;
  },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  kind: CampaignExceptionKind,
  waitingLabel: string,
  assignee?: StudioUser,
): ExceptionActionResult {
  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  const gate = requireOwnerExceptionGate(user, existing, kind, waitingLabel);
  if (!gate.ok) return gate;

  const note = payload.note.trim();
  if (!note) {
    return { ok: false, error: "A note for the team is required.", status: 400 };
  }

  if (!canAssignException(user, assignments)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const actorRole = exceptionActorRole(user, assignments);
  const now = new Date().toISOString();
  const combinedNotes = mergeOwnerNotes(payload.ownerNotes, `${payload.eventPrefix}: ${note}`);
  const updated: CampaignExceptionRecord = {
    ...existing,
    status: "waiting_internal",
    assignedToUserId: assignee?.id,
    assignedToDisplayName: assignee?.displayName,
    updatedAt: now,
  };

  const event = buildExceptionEvent({
    exceptionId: updated.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "assigned",
    notes: combinedNotes,
    assignToUserId: assignee?.id,
    assignToDisplayName: assignee?.displayName,
    statusAfter: "waiting_internal",
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, updated);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withOwnerDecisionEnvelope(envelope, records, events),
    exception: updated,
  };
}

export function applyOwnerAssignExceptionDecision(
  envelope: ServerTasksEnvelope,
  payload: {
    exceptionId: string;
    assignToUserId: string;
    ownerNotes?: string;
    note?: string;
  },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  kind: CampaignExceptionKind,
  waitingLabel: string,
  assignee: StudioUser,
): ExceptionActionResult {
  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  const gate = requireOwnerExceptionGate(user, existing, kind, waitingLabel);
  if (!gate.ok) return gate;

  if (!canAssignException(user, assignments)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const actorRole = exceptionActorRole(user, assignments);
  const now = new Date().toISOString();
  const combinedNotes = mergeOwnerNotes(payload.ownerNotes, payload.note?.trim());
  const updated: CampaignExceptionRecord = {
    ...existing,
    status: "waiting_internal",
    assignedToUserId: assignee.id,
    assignedToDisplayName: assignee.displayName,
    updatedAt: now,
  };

  const event = buildExceptionEvent({
    exceptionId: updated.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "assigned",
    notes: combinedNotes,
    assignToUserId: assignee.id,
    assignToDisplayName: assignee.displayName,
    statusAfter: "waiting_internal",
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, updated);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withOwnerDecisionEnvelope(envelope, records, events),
    exception: updated,
  };
}

export function applyOwnerAskClientExceptionDecision(
  envelope: ServerTasksEnvelope,
  payload: {
    exceptionId: string;
    clientMessage: string;
    ownerNotes?: string;
    eventPrefix: string;
  },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  kind: CampaignExceptionKind,
  waitingLabel: string,
): ExceptionActionResult {
  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  const gate = requireOwnerExceptionGate(user, existing, kind, waitingLabel);
  if (!gate.ok) return gate;

  const clientMessage = payload.clientMessage.trim();
  if (!clientMessage) {
    return { ok: false, error: "Approved client-facing wording is required.", status: 400 };
  }

  if (!canAssignException(user, assignments)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const actorRole = exceptionActorRole(user, assignments);
  const now = new Date().toISOString();
  const combinedNotes = mergeOwnerNotes(
    payload.ownerNotes,
    `${payload.eventPrefix}: ${clientMessage}`,
  );
  const updated: CampaignExceptionRecord = {
    ...existing,
    status: "waiting_client",
    updatedAt: now,
  };

  const event = buildExceptionEvent({
    exceptionId: updated.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "assigned",
    notes: combinedNotes,
    statusAfter: "waiting_client",
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, updated);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withOwnerDecisionEnvelope(envelope, records, events),
    exception: updated,
  };
}
