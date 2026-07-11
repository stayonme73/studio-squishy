import type { StudioUser } from "@/lib/campaign-store/types";
import type { ExceptionActionResult } from "@/lib/campaign-tasks/exceptions-actions";
import {
  appendExceptionEvent,
  buildExceptionEvent,
  findExceptionById,
  isOpenExceptionStatus,
  upsertExceptionRecord,
} from "@/lib/campaign-tasks/exceptions";
import { withOwnerDecisionEnvelope } from "@/lib/campaign-tasks/owner-decision-exception-shared";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

export function applyCustomerDeclineProjectChangeConsent(
  envelope: ServerTasksEnvelope,
  payload: { exceptionId: string },
  user: StudioUser,
): ExceptionActionResult {
  if (!user.roles.includes("client")) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  if (existing.kind !== "scope_change") {
    return { ok: false, error: "Exception is not a scope change.", status: 422 };
  }

  if (!isOpenExceptionStatus(existing.status)) {
    if (existing.status === "resolved") {
      return { ok: true, envelope, exception: existing };
    }
    return { ok: false, error: "Exception is not open.", status: 422 };
  }

  if (existing.status !== "waiting_client") {
    return { ok: false, error: "Owner Desk is not awaiting client consent.", status: 422 };
  }

  const now = new Date().toISOString();
  const resolutionNotes = "Customer declined project change approval.";
  const updated = {
    ...existing,
    status: "resolved" as const,
    resolutionNotes,
    resolvedAt: now,
    resolvedByUserId: user.id,
    resolvedByDisplayName: user.displayName,
    updatedAt: now,
  };

  const event = buildExceptionEvent({
    exceptionId: updated.id,
    campaignId: envelope.campaignId,
    user,
    actorRole: "client_input",
    action: "resolved",
    resolutionNotes,
    statusAfter: "resolved",
    notes: "Customer declined project change consent.",
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, updated);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withOwnerDecisionEnvelope(envelope, records, events),
    exception: updated,
  };
}

export function applyCustomerGrantProjectChangeConsent(
  envelope: ServerTasksEnvelope,
  payload: { exceptionId: string },
  user: StudioUser,
): ExceptionActionResult {
  if (!user.roles.includes("client")) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
  if (!existing) {
    return { ok: false, error: "Exception not found.", status: 404 };
  }

  if (existing.kind !== "scope_change") {
    return { ok: false, error: "Exception is not a scope change.", status: 422 };
  }

  if (!isOpenExceptionStatus(existing.status)) {
    if (existing.status === "resolved") {
      return { ok: true, envelope, exception: existing };
    }
    return { ok: false, error: "Exception is not open.", status: 422 };
  }

  if (existing.status === "waiting_owner") {
    return { ok: true, envelope, exception: existing };
  }

  if (existing.status !== "waiting_client") {
    return {
      ok: false,
      error: "Owner Desk is not awaiting client consent.",
      status: 422,
    };
  }

  const now = new Date().toISOString();
  const notes = "Customer granted project change consent.";
  const updated = {
    ...existing,
    status: "waiting_owner" as const,
    updatedAt: now,
  };

  const event = buildExceptionEvent({
    exceptionId: updated.id,
    campaignId: envelope.campaignId,
    user,
    actorRole: "client_input",
    action: "assigned",
    notes,
    statusAfter: "waiting_owner",
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, updated);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withOwnerDecisionEnvelope(envelope, records, events),
    exception: updated,
  };
}
