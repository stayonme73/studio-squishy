import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import type { ExceptionActionResult } from "./exceptions-actions";
import { findExceptionById } from "./exceptions";
import {
  applyOwnerAskClientExceptionDecision,
  applyOwnerAskTeamExceptionDecision,
  applyOwnerAssignExceptionDecision,
  applyOwnerHoldExceptionDecision,
  applyOwnerResolveExceptionDecision,
} from "./owner-decision-exception-shared";

const DEADLINE_KINDS = ["deadline_commitment", "deadline_risk"] as const;
type DeadlineKind = (typeof DEADLINE_KINDS)[number];

function isDeadlineKind(kind: string): kind is DeadlineKind {
  return DEADLINE_KINDS.includes(kind as DeadlineKind);
}

function requireDeadlineException(
  envelope: Parameters<typeof applyOwnerResolveExceptionDecision>[0],
  exceptionId: string,
):
  | { ok: true; kind: DeadlineKind }
  | { ok: false; error: string; status: number } {
  const existing = findExceptionById(envelope.exceptionRecords, exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }
  if (!isDeadlineKind(existing.kind)) {
    return { ok: false, error: "Exception is not a deadline decision.", status: 422 };
  }
  return { ok: true, kind: existing.kind };
}

// --- Deadline ---

export function applyOwnerCommitDeadline(
  envelope: Parameters<typeof applyOwnerResolveExceptionDecision>[0],
  payload: { exceptionId: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  const gate = requireDeadlineException(envelope, payload.exceptionId);
  if (!gate.ok) return gate;
  return applyOwnerResolveExceptionDecision(
    envelope,
    {
      exceptionId: payload.exceptionId,
      ownerNotes: payload.ownerNotes,
      resolutionSuffix: "Owner committed timeline",
    },
    user,
    assignments,
  );
}

export function applyOwnerHoldDeadline(
  envelope: Parameters<typeof applyOwnerHoldExceptionDecision>[0],
  payload: { exceptionId: string; note: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  const gate = requireDeadlineException(envelope, payload.exceptionId);
  if (!gate.ok) return gate;
  return applyOwnerHoldExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner hold (deadline)" },
    user,
    assignments,
    gate.kind,
    "Deadline decision",
  );
}

export function applyOwnerAskTeamDeadline(
  envelope: Parameters<typeof applyOwnerAskTeamExceptionDecision>[0],
  payload: { exceptionId: string; note: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  assignee?: StudioUser,
): ExceptionActionResult {
  const gate = requireDeadlineException(envelope, payload.exceptionId);
  if (!gate.ok) return gate;
  return applyOwnerAskTeamExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner ask-team (deadline)" },
    user,
    assignments,
    gate.kind,
    "Deadline decision",
    assignee,
  );
}

export function applyOwnerAskClientDeadline(
  envelope: Parameters<typeof applyOwnerAskClientExceptionDecision>[0],
  payload: { exceptionId: string; clientMessage: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  const gate = requireDeadlineException(envelope, payload.exceptionId);
  if (!gate.ok) return gate;
  return applyOwnerAskClientExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner ask-client approval (deadline)" },
    user,
    assignments,
    gate.kind,
    "Deadline decision",
  );
}

export function applyOwnerAssignDeadline(
  envelope: Parameters<typeof applyOwnerAssignExceptionDecision>[0],
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
  const gate = requireDeadlineException(envelope, payload.exceptionId);
  if (!gate.ok) return gate;
  return applyOwnerAssignExceptionDecision(
    envelope,
    payload,
    user,
    assignments,
    gate.kind,
    "Deadline decision",
    assignee,
  );
}

// --- Revision ---

export function applyOwnerAllowRevision(
  envelope: Parameters<typeof applyOwnerResolveExceptionDecision>[0],
  payload: { exceptionId: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  return applyOwnerResolveExceptionDecision(
    envelope,
    {
      exceptionId: payload.exceptionId,
      ownerNotes: payload.ownerNotes,
      resolutionSuffix: "Owner approved business exception",
    },
    user,
    assignments,
  );
}

export function applyOwnerHoldFirmRevision(
  envelope: Parameters<typeof applyOwnerResolveExceptionDecision>[0],
  payload: { exceptionId: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  return applyOwnerResolveExceptionDecision(
    envelope,
    {
      exceptionId: payload.exceptionId,
      ownerNotes: payload.ownerNotes,
      resolutionSuffix: "Owner held Studio boundary",
    },
    user,
    assignments,
  );
}

export function applyOwnerHoldRevision(
  envelope: Parameters<typeof applyOwnerHoldExceptionDecision>[0],
  payload: { exceptionId: string; note: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  return applyOwnerHoldExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner hold (revision)" },
    user,
    assignments,
    "revision_exhausted",
    "Client boundary review",
  );
}

export function applyOwnerAskTeamRevision(
  envelope: Parameters<typeof applyOwnerAskTeamExceptionDecision>[0],
  payload: { exceptionId: string; note: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  assignee?: StudioUser,
): ExceptionActionResult {
  return applyOwnerAskTeamExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner ask-team (revision)" },
    user,
    assignments,
    "revision_exhausted",
    "Client boundary review",
    assignee,
  );
}

export function applyOwnerAskClientRevision(
  envelope: Parameters<typeof applyOwnerAskClientExceptionDecision>[0],
  payload: { exceptionId: string; clientMessage: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  return applyOwnerAskClientExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner ask-client approval (revision)" },
    user,
    assignments,
    "revision_exhausted",
    "Client boundary review",
  );
}

export function applyOwnerAssignRevision(
  envelope: Parameters<typeof applyOwnerAssignExceptionDecision>[0],
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
  return applyOwnerAssignExceptionDecision(
    envelope,
    payload,
    user,
    assignments,
    "revision_exhausted",
    "Client boundary review",
    assignee,
  );
}

// --- Scope ---

export function applyOwnerApproveScopeChange(
  envelope: Parameters<typeof applyOwnerResolveExceptionDecision>[0],
  payload: { exceptionId: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  return applyOwnerResolveExceptionDecision(
    envelope,
    {
      exceptionId: payload.exceptionId,
      ownerNotes: payload.ownerNotes,
      resolutionSuffix: "Owner approved scope change",
    },
    user,
    assignments,
  );
}

export function applyOwnerDeclineScopeChange(
  envelope: Parameters<typeof applyOwnerResolveExceptionDecision>[0],
  payload: { exceptionId: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  return applyOwnerResolveExceptionDecision(
    envelope,
    {
      exceptionId: payload.exceptionId,
      ownerNotes: payload.ownerNotes,
      resolutionSuffix: "Owner declined scope change",
    },
    user,
    assignments,
  );
}

export function applyOwnerHoldScopeChange(
  envelope: Parameters<typeof applyOwnerHoldExceptionDecision>[0],
  payload: { exceptionId: string; note: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  return applyOwnerHoldExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner hold (scope)" },
    user,
    assignments,
    "scope_change",
    "Scope change decision",
  );
}

export function applyOwnerAskTeamScopeChange(
  envelope: Parameters<typeof applyOwnerAskTeamExceptionDecision>[0],
  payload: { exceptionId: string; note: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  assignee?: StudioUser,
): ExceptionActionResult {
  return applyOwnerAskTeamExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner ask-team (scope)" },
    user,
    assignments,
    "scope_change",
    "Scope change decision",
    assignee,
  );
}

export function applyOwnerAskClientInfoScopeChange(
  envelope: Parameters<typeof applyOwnerAskClientExceptionDecision>[0],
  payload: { exceptionId: string; clientMessage: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  return applyOwnerAskClientExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner ask-client information (scope)" },
    user,
    assignments,
    "scope_change",
    "Scope change decision",
  );
}

export function applyOwnerAskClientApprovalScopeChange(
  envelope: Parameters<typeof applyOwnerAskClientExceptionDecision>[0],
  payload: { exceptionId: string; clientMessage: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  return applyOwnerAskClientExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner ask-client approval (scope)" },
    user,
    assignments,
    "scope_change",
    "Scope change decision",
  );
}

export function applyOwnerAssignScopeChange(
  envelope: Parameters<typeof applyOwnerAssignExceptionDecision>[0],
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
  return applyOwnerAssignExceptionDecision(
    envelope,
    payload,
    user,
    assignments,
    "scope_change",
    "Scope change decision",
    assignee,
  );
}
