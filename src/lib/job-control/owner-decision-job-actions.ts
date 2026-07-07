import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import {
  resolveRefundRequestInteractionOnOwnerDecision,
  transitionRefundRequestInteraction,
} from "@/lib/campaign-tasks/refund-request-actions";
import { appendJobActivityEvent } from "./activity-log";
import { applyJobSpineStatusChange } from "./actions";
import { enqueueJobCommunicationRecord } from "./communication";
import type { ProductionLaneView } from "./capacity";
import type { ProductionWorkspacePatchResult } from "./production-workspace-actions";
import type { PurchasedJobRecord } from "./types";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { CAMPAIGN_TASKS_SCHEMA_VERSION } from "@/lib/campaign-tasks/plan-change";

function actorFromUser(user: StudioUser) {
  return {
    role: isOwnerUser(user) ? ("owner" as const) : ("staff" as const),
    userId: user.id,
    displayName: user.displayName ?? user.email,
  };
}

function updateJobInEnvelope(
  envelope: ServerTasksEnvelope,
  job: PurchasedJobRecord,
  events: ServerTasksEnvelope["jobActivityEvents"],
): ServerTasksEnvelope {
  const jobRecords = (envelope.jobRecords ?? []).map((entry) =>
    entry.jobId === job.jobId ? job : entry,
  );
  return {
    ...envelope,
    jobRecords,
    jobActivityEvents: events,
    updatedAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
    version: CAMPAIGN_TASKS_SCHEMA_VERSION,
  };
}

function findJob(envelope: ServerTasksEnvelope, jobId: string): PurchasedJobRecord | undefined {
  return envelope.jobRecords?.find((entry) => entry.jobId === jobId);
}

function appendOwnerNote(
  job: PurchasedJobRecord,
  events: NonNullable<ServerTasksEnvelope["jobActivityEvents"]>,
  actor: ReturnType<typeof actorFromUser>,
  occurredAt: string,
  content: string,
) {
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
    reason: "Owner decision note",
    messageContent: content,
  });
  return { job: updatedJob, events: updatedEvents };
}

export function applyOwnerApproveRefund(
  envelope: ServerTasksEnvelope,
  campaign: CampaignRecord,
  jobId: string,
  payload: { reason: string; ownerNotes?: string },
  user: StudioUser,
  clientId: string,
): ProductionWorkspacePatchResult {
  if (!isOwnerUser(user)) {
    return { ok: false, error: "Owner role required.", status: 403 };
  }
  const job = findJob(envelope, jobId);
  if (!job) return { ok: false, error: "Job not found.", status: 404 };
  if (job.productionStartedAt || job.nonRefundable) {
    return {
      ok: false,
      error: "Production has started for this job, so it is nonrefundable.",
      status: 422,
    };
  }

  const reason = mergeNotes(payload.ownerNotes, payload.reason);
  if (!reason.trim()) {
    return { ok: false, error: "Refund reason is required.", status: 400 };
  }

  const actor = actorFromUser(user);
  const occurredAt = new Date().toISOString();
  let events = [...(envelope.jobActivityEvents ?? [])];

  const refundResult = applyJobSpineStatusChange(job, events, {
    job,
    nextStatus: "refunded_cancelled",
    actor,
    reason,
    occurredAt,
  });
  let updatedJob = {
    ...refundResult.job,
    refundEligibleAt: job.refundEligibleAt ?? occurredAt,
    refundOwnerDecisionAt: occurredAt,
  };
  events = refundResult.events;

  let nextEnvelope = enqueueJobCommunicationRecord(
    { ...envelope, jobActivityEvents: events },
    {
      campaign,
      clientId,
      job: updatedJob,
      eventType: "refund_issued",
      sender: actor,
      occurredAt,
      idempotencyKey: occurredAt,
      reason,
    },
  );
  events = nextEnvelope.jobActivityEvents ?? [];

  return {
    ok: true,
    envelope: resolveRefundRequestInteractionOnOwnerDecision(
      updateJobInEnvelope(nextEnvelope, updatedJob, events),
      job.jobId,
      reason,
    ),
    job: updatedJob,
    updatedCampaign: campaign,
  };
}

function mergeNotes(ownerNotes: string | undefined, note: string): string {
  const parts = [ownerNotes?.trim(), note.trim()].filter(Boolean);
  return parts.join(" — ");
}

export function applyOwnerDenyRefund(
  envelope: ServerTasksEnvelope,
  jobId: string,
  payload: { ownerNotes?: string; reason?: string },
  user: StudioUser,
): ProductionWorkspacePatchResult {
  if (!isOwnerUser(user)) {
    return { ok: false, error: "Owner role required.", status: 403 };
  }
  const job = findJob(envelope, jobId);
  if (!job) return { ok: false, error: "Job not found.", status: 404 };

  const actor = actorFromUser(user);
  const occurredAt = new Date().toISOString();
  let events = [...(envelope.jobActivityEvents ?? [])];
  const reason = mergeNotes(payload.ownerNotes, payload.reason ?? "Owner denied refund");

  let updatedJob: PurchasedJobRecord = {
    ...job,
    refundEligibleAt: null,
    refundOwnerDecisionAt: occurredAt,
    updatedAt: occurredAt,
  };

  const noted = appendOwnerNote(updatedJob, events, actor, occurredAt, reason);
  updatedJob = noted.job;
  events = noted.events;

  events = appendJobActivityEvent(events, {
    campaignId: job.campaignId,
    jobId: job.jobId,
    kind: "refund",
    occurredAt,
    actor,
    reason: "Owner denied refund",
    messageContent: reason,
  });

  return {
    ok: true,
    envelope: resolveRefundRequestInteractionOnOwnerDecision(
      updateJobInEnvelope(envelope, updatedJob, events),
      job.jobId,
      reason,
    ),
    job: updatedJob,
  };
}

export function applyOwnerHoldRefund(
  envelope: ServerTasksEnvelope,
  jobId: string,
  payload: { note: string; ownerNotes?: string },
  user: StudioUser,
): ProductionWorkspacePatchResult {
  if (!isOwnerUser(user)) {
    return { ok: false, error: "Owner role required.", status: 403 };
  }
  const job = findJob(envelope, jobId);
  if (!job) return { ok: false, error: "Job not found.", status: 404 };
  const note = payload.note.trim();
  if (!note) return { ok: false, error: "A hold note is required.", status: 400 };

  const actor = actorFromUser(user);
  const occurredAt = new Date().toISOString();
  let events = [...(envelope.jobActivityEvents ?? [])];
  const combined = mergeNotes(payload.ownerNotes, `Owner hold (refund): ${note}`);

  let updatedJob: PurchasedJobRecord = {
    ...job,
    refundOwnerDecisionAt: occurredAt,
    updatedAt: occurredAt,
  };
  const noted = appendOwnerNote(updatedJob, events, actor, occurredAt, combined);
  updatedJob = noted.job;
  events = noted.events;

  return {
    ok: true,
    envelope: transitionRefundRequestInteraction(
      updateJobInEnvelope(envelope, updatedJob, events),
      job.jobId,
      "waiting_internal",
      combined,
    ),
    job: updatedJob,
  };
}

export function applyOwnerAskTeamRefund(
  envelope: ServerTasksEnvelope,
  jobId: string,
  payload: { note: string; ownerNotes?: string },
  user: StudioUser,
): ProductionWorkspacePatchResult {
  return applyOwnerHoldRefund(envelope, jobId, payload, user);
}

export function applyOwnerAskClientRefund(
  envelope: ServerTasksEnvelope,
  campaign: CampaignRecord,
  jobId: string,
  payload: { clientMessage: string; ownerNotes?: string },
  user: StudioUser,
  clientId: string,
): ProductionWorkspacePatchResult {
  if (!isOwnerUser(user)) {
    return { ok: false, error: "Owner role required.", status: 403 };
  }
  const job = findJob(envelope, jobId);
  if (!job) return { ok: false, error: "Job not found.", status: 404 };
  const clientMessage = payload.clientMessage.trim();
  if (!clientMessage) {
    return { ok: false, error: "Approved client-facing wording is required.", status: 400 };
  }

  const actor = actorFromUser(user);
  const occurredAt = new Date().toISOString();
  let events = [...(envelope.jobActivityEvents ?? [])];

  const spineResult = applyJobSpineStatusChange(job, events, {
    job,
    nextStatus: "waiting_on_client",
    actor,
    reason: "Owner requested documentation before refund decision",
    occurredAt,
  });
  let updatedJob = {
    ...spineResult.job,
    refundOwnerDecisionAt: occurredAt,
  };
  events = spineResult.events;

  const noted = appendOwnerNote(
    updatedJob,
    events,
    actor,
    occurredAt,
    mergeNotes(payload.ownerNotes, `Owner ask-client (refund): ${clientMessage}`),
  );
  updatedJob = noted.job;
  events = noted.events;

  let nextEnvelope = enqueueJobCommunicationRecord(
    { ...envelope, jobActivityEvents: events },
    {
      campaign,
      clientId,
      job: updatedJob,
      eventType: "reminder_48_hour",
      sender: actor,
      occurredAt,
      idempotencyKey: occurredAt,
      reason: clientMessage,
    },
  );
  events = nextEnvelope.jobActivityEvents ?? [];

  return {
    ok: true,
    envelope: transitionRefundRequestInteraction(
      updateJobInEnvelope(nextEnvelope, updatedJob, events),
      job.jobId,
      "waiting_client",
      mergeNotes(payload.ownerNotes, `Owner ask-client (refund): ${clientMessage}`),
    ),
    job: updatedJob,
  };
}

export function applyOwnerResolveHeavyLane(
  envelope: ServerTasksEnvelope,
  jobId: string,
  payload: { decision: "wait" | "bump"; ownerNotes?: string },
  user: StudioUser,
  tasks: readonly CampaignTaskItem[],
): ProductionWorkspacePatchResult {
  if (!isOwnerUser(user)) {
    return { ok: false, error: "Owner role required.", status: 403 };
  }
  const job = findJob(envelope, jobId);
  if (!job) return { ok: false, error: "Job not found.", status: 404 };

  const actor = actorFromUser(user);
  const occurredAt = new Date().toISOString();
  let events = [...(envelope.jobActivityEvents ?? [])];
  const note = mergeNotes(
    payload.ownerNotes,
    `Owner heavy lane decision (${payload.decision})`,
  );

  let updatedJob: PurchasedJobRecord = {
    ...job,
    heavyLaneOwnerDecision: payload.decision,
    updatedAt: occurredAt,
  };

  if (payload.decision === "bump") {
    const skuTasks = tasks.filter(
      (task) => task.relatedServiceIds.includes(job.skuId) && task.workflowState !== "complete",
    );
    const blockedTasks = skuTasks.map((task) => ({
      ...task,
      workflowState: "blocked" as const,
      workflowBlockedReason: "owner_escalation: heavy lane bump — Owner paused active job",
    }));
    const taskMap = new Map(blockedTasks.map((task) => [task.id, task]));
    const nextTasks = envelope.tasks.map(
      (task) => taskMap.get(task.id) ?? task,
    );
    envelope = { ...envelope, tasks: nextTasks };
  }

  const noted = appendOwnerNote(updatedJob, events, actor, occurredAt, note);
  updatedJob = noted.job;
  events = noted.events;

  events = appendJobActivityEvent(events, {
    campaignId: job.campaignId,
    jobId: job.jobId,
    kind: "internal_note",
    occurredAt,
    actor,
    reason: `Heavy lane ${payload.decision}`,
    messageContent: note,
  });

  return {
    ok: true,
    envelope: updateJobInEnvelope(envelope, updatedJob, events),
    job: updatedJob,
  };
}

export function applyOwnerAssignHeavyLane(
  envelope: ServerTasksEnvelope,
  jobId: string,
  payload: { note: string; ownerNotes?: string },
  user: StudioUser,
): ProductionWorkspacePatchResult {
  return applyOwnerResolveHeavyLane(
    envelope,
    jobId,
    { decision: "wait", ownerNotes: mergeNotes(payload.ownerNotes, payload.note) },
    user,
    envelope.tasks,
  );
}
