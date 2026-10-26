/**
 * Room 3 Section 2 — what happens after Tagia decides.
 * Records stay durable. Machine carries the next step. Tagia is not the dispatcher.
 */

import type { StudioUser } from "@/lib/campaign-store/types";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import { enqueueJobCommunicationRecord } from "@/lib/job-control/communication";
import type { JobActivityActor, JobSpineStatus, PurchasedJobRecord } from "@/lib/job-control/types";
import {
  extractAskClientWording,
  latestAskedClientMessage,
  ownerAskCustomerStalls,
  ownerAskReturnKind,
  shouldReturnOwnerAskException,
} from "@/lib/campaign-tasks/owner-ask-customer-stalls";

import {
  appendExceptionEvent,
  buildExceptionEvent,
  upsertExceptionRecord,
} from "./exceptions";
import type {
  CampaignExceptionEvent,
  CampaignExceptionRecord,
} from "./exceptions-types";

export { extractAskClientWording, ownerAskCustomerStalls };
import type { OwnerDecisionInteractionRecord } from "./owner-decision-interaction-types";
import { CAMPAIGN_TASKS_SCHEMA_VERSION } from "./plan-change";
import type { ServerTasksEnvelope } from "./types";

const STUDIO_MACHINE_USER: StudioUser = {
  id: "studio-machine",
  email: "studio-machine@studio.local",
  displayName: "The Studio",
  roles: [],
};

export type OwnerDecisionRecordProof = {
  choice: string;
  decidedByUserId: string;
  decidedByDisplayName: string;
  decidedAt: string;
  reason: string | null;
  status: string;
};

export function isFinalRefundDecisionRecorded(
  job: Pick<PurchasedJobRecord, "refundOwnerDecisionAt"> | null | undefined,
): boolean {
  return Boolean(job?.refundOwnerDecisionAt?.trim());
}

export function pendingRefundInteraction(
  envelope: ServerTasksEnvelope,
  jobId: string,
): OwnerDecisionInteractionRecord | undefined {
  const matches = (envelope.ownerDecisionInteractions ?? []).filter(
    (entry) =>
      entry.interactionKind === "refund_request" &&
      entry.jobId === jobId &&
      entry.status !== "resolved",
  );
  if (matches.length === 0) return undefined;
  return matches.reduce((latest, entry) =>
    entry.updatedAt.localeCompare(latest.updatedAt) >= 0 ? entry : latest,
  );
}

export function clientIdForAftermath(envelope: ServerTasksEnvelope): string {
  return (
    envelope.jobCommunicationRecords?.find((record) => record.clientId.trim())?.clientId ??
    `unclaimed-client:${envelope.campaignId}`
  );
}

export function resolveJobForException(
  envelope: ServerTasksEnvelope,
  exception: Pick<CampaignExceptionRecord, "taskId">,
): PurchasedJobRecord | undefined {
  const jobs = envelope.jobRecords ?? [];
  if (exception.taskId) {
    const task = envelope.tasks.find((entry) => entry.id === exception.taskId);
    if (task) {
      const match = jobs.find((job) => task.relatedServiceIds.includes(job.skuId));
      if (match) return match;
    }
  }
  return jobs[0];
}

function actorFromUser(user: StudioUser): JobActivityActor {
  return {
    role: "owner",
    userId: user.id,
    displayName: user.displayName ?? user.email,
  };
}

function withUpdatedJob(
  envelope: ServerTasksEnvelope,
  job: PurchasedJobRecord,
  events: ServerTasksEnvelope["jobActivityEvents"],
): ServerTasksEnvelope {
  const now = new Date().toISOString();
  return {
    ...envelope,
    jobRecords: (envelope.jobRecords ?? []).map((entry) =>
      entry.jobId === job.jobId ? job : entry,
    ),
    jobActivityEvents: events,
    updatedAt: now,
    syncedAt: now,
    version: Math.max(envelope.version ?? CAMPAIGN_TASKS_SCHEMA_VERSION, CAMPAIGN_TASKS_SCHEMA_VERSION),
  };
}

function productionSpineAfterOwnerAskReply(job: PurchasedJobRecord): JobSpineStatus {
  if (job.ownerAskResumeGate === "before_delivery") return "approved";
  if (job.productionStartedAt) return "building_concepts";
  return "ready_for_queue";
}

function hasOwnerAskQueued(
  envelope: ServerTasksEnvelope,
  jobId: string,
  key: string,
  clientMessage?: string,
): boolean {
  return (envelope.jobCommunicationRecords ?? []).some(
    (record) =>
      record.eventType === "owner_ask_client" &&
      record.jobId === jobId &&
      (record.id.includes(key) ||
        (clientMessage != null && record.messageContent === clientMessage)),
  );
}

export function queueOwnerAskOnJob(
  envelope: ServerTasksEnvelope,
  job: PurchasedJobRecord,
  followUpKey: string,
  clientMessage: string,
  user: StudioUser,
  occurredAt: string,
  reason = "Owner asked the client for information before deciding",
): ServerTasksEnvelope {
  if (hasOwnerAskQueued(envelope, job.jobId, followUpKey, clientMessage)) {
    return envelope;
  }

  const actor = actorFromUser(user);
  let next = envelope;
  let workingJob = job;
  if (job.spineStatus !== "waiting_on_client") {
    const spine = applyJobSpineStatusChange(job, envelope.jobActivityEvents ?? [], {
      job,
      nextStatus: "waiting_on_client",
      actor,
      reason,
      occurredAt,
    });
    workingJob = spine.job;
    next = withUpdatedJob(envelope, workingJob, spine.events);
  }

  return enqueueJobCommunicationRecord(next, {
    clientId: clientIdForAftermath(next),
    job: workingJob,
    eventType: "owner_ask_client",
    sender: actor,
    occurredAt,
    idempotencyKey: followUpKey,
    reason: "The Studio needs something from you",
    messageContent: clientMessage,
  });
}

export function applyOwnerAskClientAftermath(
  envelope: ServerTasksEnvelope,
  exception: CampaignExceptionRecord,
  clientMessage: string,
  user: StudioUser,
): ServerTasksEnvelope {
  const job = resolveJobForException(envelope, exception);
  if (!job) return envelope;
  const occurredAt = exception.updatedAt;
  return queueOwnerAskOnJob(
    envelope,
    job,
    `owner-ask-client:${exception.id}:${occurredAt}`,
    clientMessage,
    user,
    occurredAt,
  );
}

export function applyOwnerAskClientInteractionAftermath(
  envelope: ServerTasksEnvelope,
  interaction: OwnerDecisionInteractionRecord,
  clientMessage: string,
  user: StudioUser,
): ServerTasksEnvelope {
  const job =
    (interaction.jobId
      ? envelope.jobRecords?.find((entry) => entry.jobId === interaction.jobId)
      : undefined) ?? envelope.jobRecords?.[0];
  if (!job) return envelope;
  const occurredAt = interaction.updatedAt;
  return queueOwnerAskOnJob(
    envelope,
    job,
    `owner-ask-client:${interaction.id}:${occurredAt}`,
    clientMessage,
    user,
    occurredAt,
  );
}

export function applyOwnerResolvedDecisionAftermath(
  envelope: ServerTasksEnvelope,
  exception: CampaignExceptionRecord,
  user: StudioUser,
  customerMessage: string,
): ServerTasksEnvelope {
  const job = resolveJobForException(envelope, exception);
  if (!job) return envelope;

  const occurredAt = exception.resolvedAt ?? exception.updatedAt;
  return enqueueJobCommunicationRecord(envelope, {
    clientId: clientIdForAftermath(envelope),
    job,
    eventType: "owner_decision_recorded",
    sender: actorFromUser(user),
    occurredAt,
    idempotencyKey: `owner-decision:${exception.id}`,
    reason: "Owner decision recorded",
    messageContent: customerMessage,
  });
}

export function applyOwnerResolvedInteractionAftermath(
  envelope: ServerTasksEnvelope,
  interaction: OwnerDecisionInteractionRecord,
  user: StudioUser,
  customerMessage: string,
): ServerTasksEnvelope {
  const job =
    (interaction.jobId
      ? envelope.jobRecords?.find((entry) => entry.jobId === interaction.jobId)
      : undefined) ?? envelope.jobRecords?.[0];
  if (!job) return envelope;
  const occurredAt = interaction.updatedAt;
  return enqueueJobCommunicationRecord(envelope, {
    clientId: clientIdForAftermath(envelope),
    job,
    eventType: "owner_decision_recorded",
    sender: actorFromUser(user),
    occurredAt,
    idempotencyKey: `owner-decision:${interaction.id}`,
    reason: "Owner decision recorded",
    messageContent: customerMessage,
  });
}

export function ensureOwnerAskClientFollowUp(
  envelope: ServerTasksEnvelope,
  exception: CampaignExceptionRecord,
  clientMessage: string,
  user: StudioUser,
): ServerTasksEnvelope {
  const job = resolveJobForException(envelope, exception);
  if (!job) return envelope;
  const askEvent = [...(envelope.exceptionEvents ?? [])]
    .reverse()
    .find((event) => event.exceptionId === exception.id && event.action === "asked_client");
  const occurredAt = askEvent?.createdAt ?? exception.updatedAt;
  const key = `owner-ask-client:${exception.id}:${occurredAt}`;
  if (hasOwnerAskQueued(envelope, job.jobId, key, clientMessage)) return envelope;
  return applyOwnerAskClientAftermath(
    { ...envelope, exceptionRecords: upsertExceptionRecord(envelope.exceptionRecords, exception) },
    exception,
    clientMessage,
    user,
  );
}

const RECENT_RESOLVED_RECOVERY_MS = 14 * 24 * 60 * 60 * 1000;

export function recoverOwnerDecisionAftermath(
  envelope: ServerTasksEnvelope,
  user: StudioUser = STUDIO_MACHINE_USER,
): { envelope: ServerTasksEnvelope; recoveredIds: readonly string[] } {
  let next = envelope;
  const recoveredIds: string[] = [];

  for (const record of envelope.exceptionRecords ?? []) {
    if (record.status === "waiting_client" && shouldReturnOwnerAskException(record)) {
      const wording =
        latestAskedClientMessage(next, record.id) ??
        extractAskClientWording(record.resolutionNotes) ??
        "The Studio needs a reply from you before this work can continue.";
      const before = next.jobCommunicationRecords?.length ?? 0;
      next = ensureOwnerAskClientFollowUp(next, record, wording, user);
      if ((next.jobCommunicationRecords?.length ?? 0) > before) {
        recoveredIds.push(record.id);
      }
    }

    if (
      record.status === "resolved" &&
      ownerAskReturnKind(record.kind) &&
      record.resolvedAt &&
      Date.now() - Date.parse(record.resolvedAt) <= RECENT_RESOLVED_RECOVERY_MS
    ) {
      const before = next.jobCommunicationRecords?.length ?? 0;
      next = applyOwnerResolvedDecisionAftermath(
        next,
        record,
        user,
        customerMessageForResolvedOwnerDecision(record),
      );
      if ((next.jobCommunicationRecords?.length ?? 0) > before) {
        recoveredIds.push(record.id);
      }
    }
  }

  for (const interaction of next.ownerDecisionInteractions ?? []) {
    if (interaction.status !== "waiting_client") continue;
    const wording =
      extractAskClientWording(interaction.resolutionNotes) ??
      "The Studio needs a little more information from you before this request can continue.";
    const before = next.jobCommunicationRecords?.length ?? 0;
    next = applyOwnerAskClientInteractionAftermath(next, interaction, wording, user);
    if ((next.jobCommunicationRecords?.length ?? 0) > before) {
      recoveredIds.push(interaction.id);
    }
  }

  for (const job of next.jobRecords ?? []) {
    if (!job.ownerAskResumeGate) continue;
    const wording =
      [...(next.jobCommunicationRecords ?? [])]
        .reverse()
        .find((record) => record.jobId === job.jobId && record.eventType === "owner_ask_client")
        ?.messageContent ??
      "The Studio needs a reply from you before this work can continue.";
    const key = `owner-ask-client:review-gate:${job.jobId}`;
    const before = next.jobCommunicationRecords?.length ?? 0;
    next = queueOwnerAskOnJob(next, job, key, wording, user, job.updatedAt);
    if ((next.jobCommunicationRecords?.length ?? 0) > before) {
      recoveredIds.push(job.jobId);
    }
  }

  return { envelope: next, recoveredIds };
}

function shouldReturnOwnerAskInteraction(
  interaction: OwnerDecisionInteractionRecord,
): boolean {
  return interaction.status === "waiting_client";
}

export function applyReturnOwnerAsksOnCustomerReply(
  envelope: ServerTasksEnvelope,
): { envelope: ServerTasksEnvelope; resumedIds: readonly string[] } {
  const now = new Date().toISOString();
  const resumedIds: string[] = [];
  let records = [...(envelope.exceptionRecords ?? [])];
  let events = [...(envelope.exceptionEvents ?? [])];
  let interactions = [...(envelope.ownerDecisionInteractions ?? [])];
  let jobRecords = [...(envelope.jobRecords ?? [])];
  let jobEvents = [...(envelope.jobActivityEvents ?? [])];

  for (const record of records) {
    if (!shouldReturnOwnerAskException(record)) continue;
    const alreadyReturned = events.some(
      (event) =>
        event.exceptionId === record.id &&
        event.action === "returned_to_owner" &&
        event.createdAt >= record.updatedAt,
    );
    if (alreadyReturned) continue;

    const updated: CampaignExceptionRecord = {
      ...record,
      status: "waiting_owner",
      updatedAt: now,
    };
    records = upsertExceptionRecord(records, updated);
    events = appendExceptionEvent(
      events,
      buildExceptionEvent({
        exceptionId: record.id,
        campaignId: envelope.campaignId,
        user: STUDIO_MACHINE_USER,
        actorRole: "producer_dispatcher",
        action: "returned_to_owner",
        notes: "Client replied. This folder is ready for Owner judgment again.",
        statusAfter: "waiting_owner",
      }),
    );
    resumedIds.push(record.id);

    const job = resolveJobForException({ ...envelope, jobRecords }, record);
    if (job && job.spineStatus === "waiting_on_client") {
      const spine = applyJobSpineStatusChange(job, jobEvents, {
        job,
        nextStatus: productionSpineAfterOwnerAskReply(job),
        actor: { role: "system", displayName: "The Studio" },
        reason: "Client replied to the Owner ask",
        occurredAt: now,
      });
      jobRecords = jobRecords.map((entry) =>
        entry.jobId === spine.job.jobId ? spine.job : entry,
      );
      jobEvents = spine.events;
    }
  }

  interactions = interactions.map((interaction) => {
    if (!shouldReturnOwnerAskInteraction(interaction)) return interaction;
    resumedIds.push(interaction.id);
    return {
      ...interaction,
      status: "waiting_owner" as const,
      updatedAt: now,
      resolutionNotes: [
        interaction.resolutionNotes,
        "Client replied. This folder is ready for Owner judgment again.",
      ]
        .filter(Boolean)
        .join(" — "),
    };
  });

  for (const job of jobRecords) {
    if (!job.ownerAskResumeGate) continue;
    resumedIds.push(`gate:${job.jobId}`);
    const resumeGate = job.ownerAskResumeGate;
    let updated: PurchasedJobRecord = {
      ...job,
      ownerApprovalPending: resumeGate,
      ownerAskResumeGate: null,
      updatedAt: now,
    };
    if (updated.spineStatus === "waiting_on_client") {
      const spine = applyJobSpineStatusChange(updated, jobEvents, {
        job: updated,
        nextStatus: productionSpineAfterOwnerAskReply({ ...job, ownerAskResumeGate: resumeGate }),
        actor: { role: "system", displayName: "The Studio" },
        reason: "Client replied to the Owner ask",
        occurredAt: now,
      });
      updated = {
        ...spine.job,
        ownerApprovalPending: resumeGate,
        ownerAskResumeGate: null,
      };
      jobEvents = spine.events;
    }
    jobRecords = jobRecords.map((entry) => (entry.jobId === updated.jobId ? updated : entry));
  }

  if (resumedIds.length === 0) {
    return { envelope, resumedIds };
  }

  return {
    envelope: {
      ...envelope,
      exceptionRecords: records,
      exceptionEvents: events,
      ownerDecisionInteractions: interactions,
      jobRecords,
      jobActivityEvents: jobEvents,
      updatedAt: now,
      syncedAt: now,
      version: Math.max(envelope.version ?? CAMPAIGN_TASKS_SCHEMA_VERSION, CAMPAIGN_TASKS_SCHEMA_VERSION),
    },
    resumedIds,
  };
}

export function ownerDecisionRecordProof(
  record: CampaignExceptionRecord,
  events: readonly CampaignExceptionEvent[] | undefined,
): OwnerDecisionRecordProof | null {
  const related = (events ?? []).filter((event) => event.exceptionId === record.id);
  const latest = related.length
    ? related.reduce((current, event) =>
        event.createdAt.localeCompare(current.createdAt) >= 0 ? event : current,
      )
    : null;

  if (record.status === "resolved") {
    return {
      choice: record.resolutionNotes?.trim() || "resolved",
      decidedByUserId: record.resolvedByUserId ?? latest?.actorUserId ?? "",
      decidedByDisplayName: record.resolvedByDisplayName ?? latest?.actorDisplayName ?? "",
      decidedAt: record.resolvedAt ?? latest?.createdAt ?? record.updatedAt,
      reason: record.resolutionNotes ?? latest?.notes ?? null,
      status: record.status,
    };
  }

  if (!latest) return null;
  return {
    choice: latest.action,
    decidedByUserId: latest.actorUserId,
    decidedByDisplayName: latest.actorDisplayName,
    decidedAt: latest.createdAt,
    reason: latest.resolutionNotes ?? latest.notes ?? null,
    status: record.status,
  };
}

export function customerMessageForResolvedOwnerDecision(
  exception: CampaignExceptionRecord,
): string {
  const notes = exception.resolutionNotes ?? "";
  if (/approved pricing exception/i.test(notes)) {
    return "The Studio recorded an Owner pricing decision for this project. Work continues from that decision.";
  }
  if (/declined pricing exception/i.test(notes)) {
    return "The Studio recorded an Owner pricing decision. Quoted or purchased pricing stays as recorded. Studio Board shows the current status.";
  }
  if (/approved scope change/i.test(notes)) {
    return "The Studio recorded an Owner scope decision. Work continues from the approved boundary.";
  }
  if (/declined scope change/i.test(notes)) {
    return "The Studio recorded an Owner scope decision. Work stays within the approved plan.";
  }
  if (/granted one extra revision/i.test(notes) || /extra revision/i.test(notes)) {
    return "The Studio recorded an extra revision allowance for this work. Production will continue from that decision.";
  }
  if (/held Studio boundary/i.test(notes)) {
    return "The Studio is holding the current project boundary. Studio Board shows the current status.";
  }
  if (/committed timeline/i.test(notes)) {
    return "The Studio recorded an Owner timeline decision. Production will continue from that date.";
  }
  return "The Studio recorded an Owner decision for this project. Studio Board shows the current status.";
}
