import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import {
  appendExceptionEvent,
  buildExceptionEvent,
  canAssignException,
  exceptionActorRole,
  findExceptionById,
  isOpenExceptionStatus,
  upsertExceptionRecord,
} from "./exceptions";
import type { ExceptionActionResult } from "./exceptions-actions";
import { applyResolveException } from "./exceptions-actions";
import type { CampaignExceptionRecord } from "./exceptions-types";
import type { ServerTasksEnvelope } from "./types";

export type OwnerClearComplianceHoldPayload = {
  exceptionId: string;
  ownerNotes?: string;
};

export type OwnerHoldComplianceHoldPayload = {
  exceptionId: string;
  note: string;
  ownerNotes?: string;
};

export type OwnerAskTeamComplianceHoldPayload = {
  exceptionId: string;
  note: string;
  ownerNotes?: string;
  assignToUserId?: string;
};

function withExceptionEnvelope(
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
  };
}

function requireOwnerComplianceHoldGate(
  user: StudioUser,
  record: CampaignExceptionRecord,
): { ok: true } | { ok: false; error: string; status: number } {
  if (!isOwnerUser(user)) {
    return { ok: false, error: "Owner role required.", status: 403 };
  }
  if (record.kind !== "compliance_hold") {
    return { ok: false, error: "Exception is not a compliance hold.", status: 422 };
  }
  if (!isOpenExceptionStatus(record.status)) {
    return { ok: false, error: "Exception is not open.", status: 422 };
  }
  if (record.status !== "waiting_owner" && record.status !== "open") {
    return { ok: false, error: "Compliance hold is not waiting on Owner.", status: 422 };
  }
  return { ok: true };
}

function mergeOwnerNotes(ownerNotes: string | undefined, note: string | undefined): string | undefined {
  const parts = [ownerNotes?.trim(), note?.trim()].filter(Boolean);
  return parts.length ? parts.join(" — ") : undefined;
}

export function applyOwnerClearComplianceHold(
  envelope: ServerTasksEnvelope,
  payload: OwnerClearComplianceHoldPayload,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  const gate = requireOwnerComplianceHoldGate(user, existing);
  if (!gate.ok) return gate;

  return applyResolveException(
    envelope,
    {
      exceptionId: payload.exceptionId,
      resolutionNotes: mergeOwnerNotes(payload.ownerNotes, "Owner cleared compliance hold"),
    },
    user,
    assignments,
  );
}

export function applyOwnerHoldComplianceHold(
  envelope: ServerTasksEnvelope,
  payload: OwnerHoldComplianceHoldPayload,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  const gate = requireOwnerComplianceHoldGate(user, existing);
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
  const combinedNotes = mergeOwnerNotes(payload.ownerNotes, `Owner hold (compliance): ${note}`);
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
    envelope: withExceptionEnvelope(envelope, records, events),
    exception: updated,
  };
}

export function applyOwnerAskTeamComplianceHold(
  envelope: ServerTasksEnvelope,
  payload: OwnerAskTeamComplianceHoldPayload,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  assignee?: StudioUser,
): ExceptionActionResult {
  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  const gate = requireOwnerComplianceHoldGate(user, existing);
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
  const combinedNotes = mergeOwnerNotes(payload.ownerNotes, `Owner ask-team (compliance): ${note}`);
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
    envelope: withExceptionEnvelope(envelope, records, events),
    exception: updated,
  };
}

export function applyOwnerAssignComplianceHold(
  envelope: ServerTasksEnvelope,
  payload: {
    exceptionId: string;
    assignToUserId: string;
    ownerNotes?: string;
    note?: string;
  },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  assignee: StudioUser,
): ExceptionActionResult {
  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  const gate = requireOwnerComplianceHoldGate(user, existing);
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
    envelope: withExceptionEnvelope(envelope, records, events),
    exception: updated,
  };
}
