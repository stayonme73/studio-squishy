/**
 * Room 3 Section 2 — hold / ask-team return without Tagia chasing.
 * Staff completes internal follow-up → Machine reevaluates → Owner desk only when judgment is still required.
 */

import { OWNER_HELD_EXCEPTION_KINDS } from "@/config/campaign-exceptions";
import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

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
import type {
  CampaignExceptionEvent,
  CampaignExceptionKind,
  CampaignExceptionRecord,
} from "./exceptions-types";
import type { OwnerDecisionInteractionRecord } from "./owner-decision-interaction-types";
import { CAMPAIGN_TASKS_SCHEMA_VERSION } from "./plan-change";
import type { ServerTasksEnvelope } from "./types";
import { userIsProducer } from "./capabilities";

const OWNER_HELD_KIND_SET = new Set<CampaignExceptionKind>(OWNER_HELD_EXCEPTION_KINDS);

export type InternalOwnerFollowUpOutcome =
  | "needs_owner_judgment"
  | "resolved_without_owner";

export type CompleteInternalOwnerFollowUpPayload = {
  exceptionId?: string;
  interactionId?: string;
  jobId?: string;
  note: string;
  outcome: InternalOwnerFollowUpOutcome;
  resolutionNotes?: string;
};

function withUpdatedEnvelope(
  envelope: ServerTasksEnvelope,
  partial: Partial<ServerTasksEnvelope>,
): ServerTasksEnvelope {
  const now = new Date().toISOString();
  return {
    ...envelope,
    ...partial,
    updatedAt: now,
    syncedAt: now,
    version: Math.max(envelope.version ?? CAMPAIGN_TASKS_SCHEMA_VERSION, CAMPAIGN_TASKS_SCHEMA_VERSION),
  };
}

export function latestOwnerPauseEvent(
  events: readonly CampaignExceptionEvent[] | undefined,
  exceptionId: string,
): CampaignExceptionEvent | null {
  const paused = (events ?? []).filter(
    (event) =>
      event.exceptionId === exceptionId &&
      (event.action === "held" || event.action === "assigned") &&
      event.statusAfter === "waiting_internal" &&
      event.actorRole === "owner",
  );
  if (paused.length === 0) return null;
  return paused.reduce((latest, event) =>
    event.createdAt.localeCompare(latest.createdAt) >= 0 ? event : latest,
  );
}

export function isOwnerPausedInternalException(
  record: CampaignExceptionRecord,
  events: readonly CampaignExceptionEvent[] | undefined,
): boolean {
  if (record.status !== "waiting_internal") return false;
  if (!OWNER_HELD_KIND_SET.has(record.kind)) return false;
  return latestOwnerPauseEvent(events, record.id) != null;
}

export function alreadyReturnedAfterOwnerPause(
  events: readonly CampaignExceptionEvent[] | undefined,
  exceptionId: string,
  pauseCreatedAt: string,
): boolean {
  return (events ?? []).some(
    (event) =>
      event.exceptionId === exceptionId &&
      event.action === "returned_to_owner" &&
      event.createdAt >= pauseCreatedAt,
  );
}

export function canResolveWithoutOwnerAfterInternalPause(
  record: CampaignExceptionRecord,
): boolean {
  return record.kind === "compliance_hold" || record.kind === "routine_internal";
}

function isOwnerPausedInternalInteraction(
  interaction: OwnerDecisionInteractionRecord,
): boolean {
  if (interaction.status !== "waiting_internal") return false;
  const notes = interaction.resolutionNotes ?? "";
  return /Owner hold|Owner ask-team/i.test(notes);
}

function requireStaffFollowUpActor(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): { ok: true } | { ok: false; error: string; status: number } {
  if (isOwnerUser(user) || userIsProducer(user, assignments)) return { ok: true };
  if (canAssignException(user, assignments)) return { ok: true };
  return { ok: false, error: "Forbidden", status: 403 };
}

function returnExceptionToOwner(
  envelope: ServerTasksEnvelope,
  record: CampaignExceptionRecord,
  staffNote: string,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ExceptionActionResult {
  const pause = latestOwnerPauseEvent(envelope.exceptionEvents, record.id);
  if (!pause) {
    return {
      ok: false,
      error: "This folder is not waiting on an Owner hold or ask-team follow-up.",
      status: 422,
    };
  }
  if (alreadyReturnedAfterOwnerPause(envelope.exceptionEvents, record.id, pause.createdAt)) {
    if (record.status === "waiting_owner") {
      return { ok: true, envelope, exception: record };
    }
    return {
      ok: false,
      error: "This folder is already back on the Owner desk.",
      status: 422,
    };
  }

  const now = new Date().toISOString();
  const updated: CampaignExceptionRecord = {
    ...record,
    status: "waiting_owner",
    updatedAt: now,
  };
  const records = upsertExceptionRecord(envelope.exceptionRecords, updated);
  const events = appendExceptionEvent(
    envelope.exceptionEvents,
    buildExceptionEvent({
      exceptionId: updated.id,
      campaignId: envelope.campaignId,
      user,
      actorRole: exceptionActorRole(user, assignments),
      action: "returned_to_owner",
      notes: `Team supplied new information — Owner judgment still required. ${staffNote}`,
      statusAfter: "waiting_owner",
    }),
  );

  return {
    ok: true,
    envelope: withUpdatedEnvelope(envelope, { exceptionRecords: records, exceptionEvents: events }),
    exception: updated,
  };
}

function returnInteractionToOwner(
  envelope: ServerTasksEnvelope,
  interaction: OwnerDecisionInteractionRecord,
  staffNote: string,
): ServerTasksEnvelope {
  const now = new Date().toISOString();
  const interactions = (envelope.ownerDecisionInteractions ?? []).map((entry) =>
    entry.id === interaction.id
      ? {
          ...entry,
          status: "waiting_owner" as const,
          updatedAt: now,
          resolutionNotes: [
            entry.resolutionNotes,
            `Team supplied new information — Owner judgment still required. ${staffNote}`,
          ]
            .filter(Boolean)
            .join(" — "),
        }
      : entry,
  );
  return withUpdatedEnvelope(envelope, { ownerDecisionInteractions: interactions });
}

export function returnJobInternalGateToOwner(
  job: PurchasedJobRecord,
  staffNote: string,
): PurchasedJobRecord | null {
  const resumeGate = job.ownerInternalResumeGate;
  if (!resumeGate) return null;
  const now = new Date().toISOString();
  return {
    ...job,
    ownerApprovalPending: resumeGate,
    ownerInternalResumeGate: null,
    updatedAt: now,
    internalNotes: [
      ...(job.internalNotes ?? []),
      {
        id: `note:${job.jobId}:${now}:internal-return`,
        content: `Team follow-up complete — returned to Owner desk. ${staffNote}`,
        createdAt: now,
        author: { role: "system", displayName: "The Studio" },
      },
    ],
  };
}

export function clearJobInternalGateWithoutOwner(
  job: PurchasedJobRecord,
  staffNote: string,
): PurchasedJobRecord | null {
  if (!job.ownerInternalResumeGate) return null;
  const now = new Date().toISOString();
  return {
    ...job,
    ownerInternalResumeGate: null,
    updatedAt: now,
    internalNotes: [
      ...(job.internalNotes ?? []),
      {
        id: `note:${job.jobId}:${now}:internal-resolved`,
        content: `Team resolved internal follow-up without Owner judgment. ${staffNote}`,
        createdAt: now,
        author: { role: "system", displayName: "The Studio" },
      },
    ],
  };
}

export function applyCompleteInternalOwnerFollowUp(
  envelope: ServerTasksEnvelope,
  payload: CompleteInternalOwnerFollowUpPayload,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  materials: readonly CampaignMaterialItem[] = [],
): ExceptionActionResult & { job?: PurchasedJobRecord } {
  const actorGate = requireStaffFollowUpActor(user, assignments);
  if (!actorGate.ok) return actorGate;

  const note = payload.note.trim();
  if (!note) {
    return { ok: false, error: "An internal follow-up note is required.", status: 400 };
  }

  const targets = [
    payload.exceptionId ? "exception" : null,
    payload.interactionId ? "interaction" : null,
    payload.jobId ? "job" : null,
  ].filter(Boolean);
  if (targets.length !== 1) {
    return {
      ok: false,
      error: "Provide exactly one of exceptionId, interactionId, or jobId.",
      status: 400,
    };
  }

  if (payload.exceptionId) {
    const existing = findExceptionById(envelope.exceptionRecords, payload.exceptionId);
    if (!existing) return { ok: false, error: "Exception not found.", status: 404 };
    if (!isOpenExceptionStatus(existing.status)) {
      return { ok: false, error: "Exception is not open.", status: 422 };
    }
    if (existing.status !== "waiting_internal") {
      if (
        existing.status === "waiting_owner" &&
        latestOwnerPauseEvent(envelope.exceptionEvents, existing.id)
      ) {
        const pause = latestOwnerPauseEvent(envelope.exceptionEvents, existing.id)!;
        if (alreadyReturnedAfterOwnerPause(envelope.exceptionEvents, existing.id, pause.createdAt)) {
          return { ok: true, envelope, exception: existing };
        }
      }
      return {
        ok: false,
        error: "This folder is not waiting on internal follow-up.",
        status: 422,
      };
    }
    if (!isOwnerPausedInternalException(existing, envelope.exceptionEvents)) {
      return {
        ok: false,
        error: "This internal wait was not created by an Owner hold or ask-team decision.",
        status: 422,
      };
    }

    if (payload.outcome === "resolved_without_owner") {
      if (!canResolveWithoutOwnerAfterInternalPause(existing)) {
        return {
          ok: false,
          error: "This decision type still requires Owner judgment. Choose needs_owner_judgment instead.",
          status: 422,
        };
      }
      return applyResolveException(
        envelope,
        {
          exceptionId: existing.id,
          resolutionNotes:
            payload.resolutionNotes?.trim() ||
            `Team resolved internal follow-up without Owner judgment. ${note}`,
        },
        user,
        assignments,
        materials,
      );
    }

    return returnExceptionToOwner(envelope, existing, note, user, assignments);
  }

  if (payload.interactionId) {
    const interaction = (envelope.ownerDecisionInteractions ?? []).find(
      (entry) => entry.id === payload.interactionId,
    );
    if (!interaction) {
      return { ok: false, error: "Owner decision interaction not found.", status: 404 };
    }
    if (!isOwnerPausedInternalInteraction(interaction)) {
      return {
        ok: false,
        error: "This interaction is not waiting on an Owner hold or ask-team follow-up.",
        status: 422,
      };
    }
    if (payload.outcome === "resolved_without_owner") {
      return {
        ok: false,
        error: "Refund and complaint decisions still require Owner judgment.",
        status: 422,
      };
    }
    if (interaction.status === "waiting_owner") {
      return { ok: true, envelope, exception: undefined };
    }
    return {
      ok: true,
      envelope: returnInteractionToOwner(envelope, interaction, note),
    };
  }

  const job = (envelope.jobRecords ?? []).find((entry) => entry.jobId === payload.jobId);
  if (!job) return { ok: false, error: "Job not found.", status: 404 };
  if (!job.ownerInternalResumeGate) {
    return {
      ok: false,
      error: "This job is not waiting on an Owner hold or ask-team gate follow-up.",
      status: 422,
    };
  }

  const updatedJob =
    payload.outcome === "needs_owner_judgment"
      ? returnJobInternalGateToOwner(job, note)
      : clearJobInternalGateWithoutOwner(job, note);
  if (!updatedJob) {
    return { ok: false, error: "Unable to update internal gate state.", status: 422 };
  }

  return {
    ok: true,
    envelope: withUpdatedEnvelope(envelope, {
      jobRecords: (envelope.jobRecords ?? []).map((entry) =>
        entry.jobId === updatedJob.jobId ? updatedJob : entry,
      ),
    }),
    job: updatedJob,
  };
}
