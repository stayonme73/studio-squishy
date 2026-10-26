import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { OwnerDecisionInteractionRecord } from "@/lib/campaign-tasks/owner-decision-interaction-types";
import { resolveRefundRequestInteractionOnOwnerDecision } from "@/lib/campaign-tasks/refund-request-actions";
import {
  mapStripeRefundStatus,
  type RefundProviderOutcome,
} from "@/lib/studio-payment/refund-execution";

import { appendJobActivityEvent } from "./activity-log";
import { applyJobSpineStatusChange } from "./actions";
import { enqueueJobCommunicationRecord } from "./communication";
import type {
  JobActivityActor,
  JobRefundExecution,
  JobRefundExecutionStage,
  PurchasedJobRecord,
} from "./types";

export const STUDIO_REFUND_SYSTEM_ACTOR: JobActivityActor = {
  role: "system",
  displayName: "Studio refunds",
};

export type ApplyRefundOutcomeResult =
  | {
      ok: true;
      changed: boolean;
      envelope: ServerTasksEnvelope;
      job: PurchasedJobRecord;
      stage: JobRefundExecutionStage;
    }
  | { ok: false; error: string; status: number };

function replaceJob(
  envelope: ServerTasksEnvelope,
  job: PurchasedJobRecord,
  events: ServerTasksEnvelope["jobActivityEvents"],
): ServerTasksEnvelope {
  return {
    ...envelope,
    jobRecords: (envelope.jobRecords ?? []).map((entry) => (entry.jobId === job.jobId ? job : entry)),
    jobActivityEvents: events,
    updatedAt: job.updatedAt,
    syncedAt: job.updatedAt,
  };
}

function reopenLatestRefundRequest(
  envelope: ServerTasksEnvelope,
  jobId: string,
  note: string,
  at: string,
): ServerTasksEnvelope {
  const requests = (envelope.ownerDecisionInteractions ?? []).filter(
    (entry) => entry.interactionKind === "refund_request" && entry.jobId === jobId,
  );
  if (requests.length === 0) return envelope;
  const latest = requests.reduce((a, b) => (b.updatedAt.localeCompare(a.updatedAt) >= 0 ? b : a));
  const reopened: OwnerDecisionInteractionRecord = {
    ...latest,
    status: "waiting_owner",
    updatedAt: at,
    resolutionNotes: note,
  };
  return {
    ...envelope,
    ownerDecisionInteractions: (envelope.ownerDecisionInteractions ?? []).map((entry) =>
      entry.id === latest.id ? reopened : entry,
    ),
  };
}

/**
 * Applies Stripe refund truth to a job that the Owner already approved.
 * The job closes only once Stripe accepts; a provider failure reopens it for Owner review.
 */
export function applyRefundProviderOutcome(
  envelope: ServerTasksEnvelope,
  campaign: CampaignRecord,
  jobId: string,
  outcome: RefundProviderOutcome,
  context: { clientId: string; actor?: JobActivityActor; occurredAt?: string },
): ApplyRefundOutcomeResult {
  const job = envelope.jobRecords?.find((entry) => entry.jobId === jobId);
  if (!job) return { ok: false, error: "Job not found.", status: 404 };
  const execution = job.refundExecution;
  if (!execution) return { ok: false, error: "No approved refund is recorded for this job.", status: 409 };

  const actor = context.actor ?? STUDIO_REFUND_SYSTEM_ACTOR;
  const at = context.occurredAt ?? new Date().toISOString();
  const unchanged = { ok: true as const, changed: false, envelope, job, stage: execution.stage };

  if (outcome.kind === "rejected" && !outcome.definitive) {
    return unchanged;
  }
  if (
    outcome.kind === "provider_refund" &&
    execution.stripeRefundId &&
    execution.stripeRefundId !== outcome.refundId
  ) {
    return unchanged;
  }

  const stage: JobRefundExecutionStage =
    outcome.kind === "provider_refund" ? mapStripeRefundStatus(outcome.status) : "failed";
  const providerStatus = outcome.kind === "provider_refund" ? outcome.status : `rejected:${outcome.code}`;

  if (execution.stage === stage && execution.providerStatus === providerStatus) return unchanged;
  if (execution.stage === "completed" && stage === "processing") return unchanged;

  let events = [...(envelope.jobActivityEvents ?? [])];
  let nextEnvelope = envelope;

  if (stage === "processing" || stage === "completed") {
    const refundId = (outcome as Extract<RefundProviderOutcome, { kind: "provider_refund" }>).refundId;
    const priorSpineStatus =
      execution.priorSpineStatus ??
      (job.spineStatus === "refunded_cancelled" ? null : job.spineStatus);
    let updatedJob: PurchasedJobRecord = job;
    if (job.spineStatus !== "refunded_cancelled") {
      const closed = applyJobSpineStatusChange(job, events, {
        job,
        nextStatus: "refunded_cancelled",
        actor,
        reason: "Refund accepted by Stripe",
        occurredAt: at,
      });
      updatedJob = closed.job;
      events = closed.events;
    }
    const nextExecution: JobRefundExecution = {
      ...execution,
      stage,
      stripeRefundId: refundId,
      providerStatus,
      providerCreatedAt:
        (outcome.kind === "provider_refund" ? outcome.createdAt : null) ?? execution.providerCreatedAt ?? null,
      updatedAt: at,
      completedAt: stage === "completed" ? execution.completedAt ?? at : null,
      failedAt: null,
      failureCode: null,
      failureReason: null,
      priorSpineStatus,
    };
    updatedJob = {
      ...updatedJob,
      refundOwnerDecisionAt: updatedJob.refundOwnerDecisionAt ?? at,
      refundApprovedAmountCents: execution.requestedAmountCents,
      refundExecution: nextExecution,
      updatedAt: at,
    };
    events = appendJobActivityEvent(events, {
      campaignId: job.campaignId,
      jobId: job.jobId,
      kind: "refund",
      occurredAt: at,
      actor,
      reason: stage === "completed" ? "Refund completed" : "Refund processing",
      messageContent: `Stripe refund ${refundId} is ${providerStatus}.`,
    });
    nextEnvelope = enqueueJobCommunicationRecord(replaceJob(envelope, updatedJob, events), {
      campaign,
      clientId: context.clientId,
      job: updatedJob,
      eventType: stage === "completed" ? "refund_issued" : "refund_processing",
      sender: STUDIO_REFUND_SYSTEM_ACTOR,
      occurredAt: at,
      idempotencyKey: `refund:${refundId}:${stage}`,
    });
    nextEnvelope = resolveRefundRequestInteractionOnOwnerDecision(
      nextEnvelope,
      job.jobId,
      stage === "completed" ? "Refund completed at Stripe." : "Refund accepted by Stripe and processing.",
    );
    const savedJob = nextEnvelope.jobRecords?.find((entry) => entry.jobId === jobId) ?? updatedJob;
    return { ok: true, changed: true, envelope: nextEnvelope, job: savedJob, stage };
  }

  const failureCode =
    outcome.kind === "provider_refund" ? outcome.failureReason ?? outcome.status : outcome.code;
  let updatedJob: PurchasedJobRecord = job;
  if (job.spineStatus === "refunded_cancelled" && execution.priorSpineStatus) {
    const reopened = applyJobSpineStatusChange(job, events, {
      job,
      nextStatus: execution.priorSpineStatus,
      actor,
      reason: "Refund could not be completed — reopened for Owner review",
      occurredAt: at,
    });
    updatedJob = reopened.job;
    events = reopened.events;
  }
  updatedJob = {
    ...updatedJob,
    refundOwnerDecisionAt: null,
    refundApprovedAmountCents: null,
    refundExecution: {
      ...execution,
      stage: "failed",
      stripeRefundId:
        outcome.kind === "provider_refund" ? outcome.refundId : execution.stripeRefundId ?? null,
      providerStatus,
      updatedAt: at,
      completedAt: null,
      failedAt: at,
      failureCode,
      failureReason: outcome.kind === "rejected" ? outcome.message : "Stripe reported the refund failed.",
    },
    updatedAt: at,
  };
  events = appendJobActivityEvent(events, {
    campaignId: job.campaignId,
    jobId: job.jobId,
    kind: "refund",
    occurredAt: at,
    actor,
    reason: "Refund could not be completed",
    messageContent: `Stripe refund failed (${failureCode}). No money was returned. Owner review required.`,
  });
  nextEnvelope = enqueueJobCommunicationRecord(replaceJob(envelope, updatedJob, events), {
    campaign,
    clientId: context.clientId,
    job: updatedJob,
    eventType: "refund_review_needed",
    sender: STUDIO_REFUND_SYSTEM_ACTOR,
    occurredAt: at,
    idempotencyKey: `refund:${execution.idempotencyKey}:failed`,
  });
  nextEnvelope = reopenLatestRefundRequest(
    nextEnvelope,
    job.jobId,
    `Refund could not be completed at Stripe (${failureCode}). Owner review required.`,
    at,
  );
  const savedJob = nextEnvelope.jobRecords?.find((entry) => entry.jobId === jobId) ?? updatedJob;
  return { ok: true, changed: true, envelope: nextEnvelope, job: savedJob, stage: "failed" };
}
