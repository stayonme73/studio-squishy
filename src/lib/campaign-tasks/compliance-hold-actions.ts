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

/** The only grounds on which a routine compliance hold may reach the Owner Desk. */
export type ComplianceHoldEscalationCriterion =
  | "client_refuses_safe_revision"
  | "policy_exception_requested"
  | "unresolved_legal_or_business_risk"
  | "missing_proof_affects_delivery_commitment"
  | "refund_scope_deadline_or_relationship_risk";

const COMPLIANCE_HOLD_ESCALATION_CRITERION_LABELS: Record<ComplianceHoldEscalationCriterion, string> = {
  client_refuses_safe_revision: "Client refuses to remove or revise risky content",
  policy_exception_requested: "Client requests a policy exception",
  unresolved_legal_or_business_risk: "Unresolved legal or business risk remains",
  missing_proof_affects_delivery_commitment:
    "Missing proof or release affects a client delivery commitment",
  refund_scope_deadline_or_relationship_risk:
    "Compliance issue creates refund, scope, deadline, or client relationship risk",
};

export type EscalateComplianceHoldPayload = {
  exceptionId: string;
  criterion: ComplianceHoldEscalationCriterion;
  note: string;
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
    action: "held",
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

function requireEscalatableComplianceHoldGate(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  record: CampaignExceptionRecord,
): { ok: true } | { ok: false; error: string; status: number } {
  if (record.kind !== "compliance_hold") {
    return { ok: false, error: "Exception is not a compliance hold.", status: 422 };
  }
  if (!isOpenExceptionStatus(record.status)) {
    return { ok: false, error: "Exception is not open.", status: 422 };
  }
  if (record.status === "waiting_owner") {
    return { ok: false, error: "Compliance hold is already routed to Owner.", status: 422 };
  }
  if (!canAssignException(user, assignments)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }
  return { ok: true };
}

/**
 * Routine compliance holds start with QA/Producer. This is the only path onto the Owner
 * Desk — it requires naming which of the five escalation criteria applies, so every
 * folder that reaches Tagia carries a stated reason it needed executive judgment.
 */
export function applyEscalateComplianceHoldToOwner(
  envelope: ServerTasksEnvelope,
  payload: EscalateComplianceHoldPayload,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  const gate = requireEscalatableComplianceHoldGate(user, assignments, existing);
  if (!gate.ok) return gate;

  const note = payload.note.trim();
  if (!note) {
    return {
      ok: false,
      error: "A reason is required to route a compliance hold to the Owner.",
      status: 400,
    };
  }

  const actorRole = exceptionActorRole(user, assignments);
  const now = new Date().toISOString();
  const updated: CampaignExceptionRecord = {
    ...existing,
    status: "waiting_owner",
    updatedAt: now,
  };

  const event = buildExceptionEvent({
    exceptionId: updated.id,
    campaignId: envelope.campaignId,
    user,
    actorRole,
    action: "assigned",
    notes: `Escalated to Owner (compliance): ${COMPLIANCE_HOLD_ESCALATION_CRITERION_LABELS[payload.criterion]} — ${note}`,
    statusAfter: "waiting_owner",
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, updated);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withExceptionEnvelope(envelope, records, events),
    exception: updated,
  };
}
