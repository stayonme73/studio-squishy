import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { appendCorrectionExtraGrant } from "@/lib/job-control/correction-round-ledger";

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
  const resolved = applyOwnerResolveExceptionDecision(
    envelope,
    {
      exceptionId: payload.exceptionId,
      ownerNotes: payload.ownerNotes,
      resolutionSuffix: "Owner approved business exception",
    },
    user,
    assignments,
  );
  if (!resolved.ok) return resolved;

  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  const approvedAt = new Date().toISOString();
  const grantId = `correction-extra:${payload.exceptionId}`;
  const nextEnvelope = appendCorrectionExtraGrant(resolved.envelope, {
    id: grantId,
    campaignId: resolved.envelope.campaignId,
    jobId: existing?.taskId,
    quantity: 1,
    approvedByUserId: user.id,
    approvedByDisplayName: user.displayName ?? "Owner",
    approvedAt,
    reason:
      payload.ownerNotes?.trim() ||
      "Owner approved one additional correction use",
    exceptionId: payload.exceptionId,
  });

  return {
    ok: true,
    envelope: nextEnvelope,
    exception: resolved.exception,
    materialsEnvelope: resolved.materialsEnvelope,
  };
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

export function applyOwnerApprovePricingException(
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
      resolutionSuffix: "Owner approved pricing exception",
    },
    user,
    assignments,
  );
}

export function applyOwnerDeclinePricingException(
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
      resolutionSuffix: "Owner declined pricing exception",
    },
    user,
    assignments,
  );
}

export function applyOwnerHoldPricingException(
  envelope: Parameters<typeof applyOwnerHoldExceptionDecision>[0],
  payload: { exceptionId: string; note: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  return applyOwnerHoldExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner hold (pricing)" },
    user,
    assignments,
    "pricing_exception",
    "Pricing exception decision",
  );
}

export function applyOwnerAskTeamPricingException(
  envelope: Parameters<typeof applyOwnerAskTeamExceptionDecision>[0],
  payload: { exceptionId: string; note: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  assignee?: StudioUser,
): ExceptionActionResult {
  return applyOwnerAskTeamExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner ask-team (pricing)" },
    user,
    assignments,
    "pricing_exception",
    "Pricing exception decision",
    assignee,
  );
}

export function applyOwnerAskClientInfoPricingException(
  envelope: Parameters<typeof applyOwnerAskClientExceptionDecision>[0],
  payload: { exceptionId: string; clientMessage: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  return applyOwnerAskClientExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner ask-client information (pricing)" },
    user,
    assignments,
    "pricing_exception",
    "Pricing exception decision",
  );
}

export function applyOwnerAskClientApprovalPricingException(
  envelope: Parameters<typeof applyOwnerAskClientExceptionDecision>[0],
  payload: { exceptionId: string; clientMessage: string; ownerNotes?: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  return applyOwnerAskClientExceptionDecision(
    envelope,
    { ...payload, eventPrefix: "Owner ask-client approval (pricing)" },
    user,
    assignments,
    "pricing_exception",
    "Pricing exception decision",
  );
}

export function applyOwnerAssignPricingException(
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
    "pricing_exception",
    "Pricing exception decision",
    assignee,
  );
}
