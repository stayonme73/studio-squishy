import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import type { ExceptionActionResult } from "@/lib/campaign-tasks/exceptions-actions";
import {
  appendExceptionEvent,
  buildExceptionEvent,
  exceptionActorRole,
  findExceptionById,
  isOpenExceptionStatus,
  upsertExceptionRecord,
} from "@/lib/campaign-tasks/exceptions";
import { withOwnerDecisionEnvelope } from "@/lib/campaign-tasks/owner-decision-exception-shared";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

export function applyProjectChangeAppliedDesk(
  envelope: ServerTasksEnvelope,
  payload: { exceptionId: string },
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
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

  const actorRole = exceptionActorRole(user, assignments);
  const now = new Date().toISOString();
  const resolutionNotes = "Approved project change applied to the Studio Plan.";
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
    actorRole,
    action: "resolved",
    resolutionNotes,
    statusAfter: "resolved",
    notes: "Project change applied.",
  });

  const records = upsertExceptionRecord(envelope.exceptionRecords, updated);
  const events = appendExceptionEvent(envelope.exceptionEvents, event);

  return {
    ok: true,
    envelope: withOwnerDecisionEnvelope(envelope, records, events),
    exception: updated,
  };
}
