import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { appendJobActivityEvent } from "./activity-log";
import { blockingMaterialsForSku } from "./resolve-jobs";
import type {
  JobActivityActor,
  JobCommunicationDeliveryStatus,
  JobCommunicationEventType,
  JobCommunicationRecord,
  JobCommunicationTransportCode,
  PurchasedJobRecord,
} from "./types";

type CommunicationTemplate = {
  id: string;
  reason: string;
  message: (job: PurchasedJobRecord, campaign: CampaignRecord) => string;
};

export const JOB_COMMUNICATION_TEMPLATES = {
  payment_received: {
    id: "comm.payment_received.v1",
    reason: "Payment received",
    message: (job, campaign) =>
      `Payment is received for ${job.serviceName} on ${campaign.campaignName}. We will keep this job moving as intake and materials are complete.`,
  },
  intake_incomplete_materials_needed: {
    id: "comm.materials_needed.v1",
    reason: "Intake or required materials needed",
    message: (job) =>
      `We need a few required materials before ${job.serviceName} can move forward. Please open Project Intake and send the requested items.`,
  },
  waiting_on_client: {
    id: "comm.waiting_on_client.v2",
    reason: "Waiting on Client — materials needed",
    message: (job) =>
      `${job.serviceName} is waiting on required materials from you. Work on this service continues as soon as they arrive. Your other services can keep moving independently.`,
  },
  materials_received_returned_to_queue: {
    id: "comm.materials_received_returned_to_queue.v1",
    reason: "Materials received and job returned to queue",
    message: (job) =>
      `Thank you. We received the required materials for ${job.serviceName} and returned this job to the production queue.`,
  },
  production_started: {
    id: "comm.production_started.v1",
    reason: "Production started",
    message: (job) =>
      `Production has started on ${job.serviceName}. Because work has begun, this job is now nonrefundable.`,
  },
  ready_for_review: {
    id: "comm.ready_for_review.v1",
    reason: "Ready for review",
    message: (job) =>
      `${job.serviceName} is ready for your review. Open Review Room when you are ready to look it over.`,
  },
  revision_requested: {
    id: "comm.revision_requested.v1",
    reason: "Revision requested",
    message: (job) =>
      `We received your revision request for ${job.serviceName}. The job is back with the Studio team for updates.`,
  },
  revision_ready_again: {
    id: "comm.revision_ready_again.v1",
    reason: "Revision ready for review",
    message: (job) =>
      `The revised ${job.serviceName} is ready for another review. Open Review Room to check the updates.`,
  },
  revision_rework_in_progress: {
    id: "comm.revision_rework_in_progress.v1",
    reason: "Revised work held back for rework",
    message: (job) =>
      `The Studio reviewed the updated ${job.serviceName} and decided it was not good enough to send you, so it is being reworked. Your included revision has not been counted, and you will be notified when a new version is ready for your review.`,
  },
  approved_for_delivery: {
    id: "comm.approved_for_delivery.v1",
    reason: "Client approved for delivery",
    message: (job) =>
      `You approved ${job.serviceName} for final delivery. The Studio will prepare the final release.`,
  },
  final_delivery_available: {
    id: "comm.final_delivery_available.v1",
    reason: "Final delivery available",
    message: (job) =>
      `Final delivery is available for ${job.serviceName}. Open Final Delivery to access your files.`,
  },
  /** Queued only when Stripe reports the refund succeeded. */
  refund_issued: {
    id: "comm.refund_completed.v2",
    reason: "Refund completed",
    message: (job) =>
      `Refund completed for ${job.serviceName}. The amount you paid was returned to your original payment method. Your bank may take a few business days to show it. This service is closed.`,
  },
  refund_processing: {
    id: "comm.refund_processing.v1",
    reason: "Refund processing",
    message: (job) =>
      `Refund processing for ${job.serviceName}. The Studio approved your refund and the payment processor accepted it. It has not finished, so the money is not back yet. You will see Refund completed when the processor finishes.`,
  },
  refund_review_needed: {
    id: "comm.refund_review_needed.v1",
    reason: "Refund could not be completed",
    message: (job) =>
      `Refund could not be completed for ${job.serviceName}. The Studio is reviewing it.`,
  },
  owner_ask_client: {
    id: "comm.owner_ask_client.v1",
    reason: "The Studio needs something from you",
    message: (job) =>
      `The Studio needs a reply from you before ${job.serviceName} can continue. Open Studio Board to read the request and respond.`,
  },
  owner_decision_recorded: {
    id: "comm.owner_decision_recorded.v1",
    reason: "Owner decision recorded",
    message: (job) =>
      `The Studio recorded an Owner decision for ${job.serviceName}. Studio Board shows the current status.`,
  },
} satisfies Record<JobCommunicationEventType, CommunicationTemplate>;

/** Authorized Resend lifecycle kinds. Routine notices are Machine mail, not Owner send chores. */
export const AUTHORIZED_LIFECYCLE_EMAIL_EVENT_TYPES = [
  "payment_received",
  "intake_incomplete_materials_needed",
  "waiting_on_client",
  "materials_received_returned_to_queue",
  "production_started",
  "ready_for_review",
  "revision_requested",
  "revision_ready_again",
  "approved_for_delivery",
  "final_delivery_available",
  "refund_processing",
  "refund_issued",
  "refund_review_needed",
] as const satisfies readonly JobCommunicationEventType[];

/** In-app Board notices — recorded immediately; not an Owner send chore and not a customer email. */
const IN_APP_IMMEDIATE_EVENT_TYPES = new Set<JobCommunicationEventType>([
  "owner_ask_client",
  "owner_decision_recorded",
  // Silence is the failure mode this notice exists to prevent — do not queue it
  // behind an Owner send chore.
  "revision_rework_in_progress",
]);

function defaultDeliveryStatus(
  eventType: JobCommunicationEventType,
): JobCommunicationDeliveryStatus {
  return IN_APP_IMMEDIATE_EVENT_TYPES.has(eventType) ? "sent" : "pending_owner_send";
}

export type EnqueueJobCommunicationInput = {
  campaign?: CampaignRecord;
  clientId: string;
  job: PurchasedJobRecord;
  eventType: JobCommunicationEventType;
  sender?: JobActivityActor;
  occurredAt?: string;
  idempotencyKey?: string;
  deliveryStatus?: JobCommunicationDeliveryStatus;
  reason?: string;
  messageContent?: string;
};

export type NeedsCommunicationQueueItem = {
  id: string;
  campaignId: string;
  clientId: string;
  jobId: string;
  serviceName: string;
  eventType: JobCommunicationEventType;
  eventLabel: string;
  reason: string;
  messageContent: string;
  deliveryStatus: JobCommunicationDeliveryStatus;
  statusLabel: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
  testSentAt?: string;
};

function systemSender(): JobActivityActor {
  return { role: "system", displayName: "System" };
}

export function communicationRecordId(
  eventType: JobCommunicationEventType,
  jobId: string,
  idempotencyKey: string,
): string {
  return `comm:${eventType}:${jobId}:${idempotencyKey}`;
}

function activityEventId(recordId: string): string {
  return `client_communication:${recordId}`;
}

function stableMaterialKey(materials: readonly CampaignMaterialItem[]): string {
  return materials
    .map((item) => `${item.id}:${item.promotionApprovedAt ?? item.submittedAt ?? "open"}`)
    .sort()
    .join("|");
}

function firstMaterialRequestAt(materials: readonly CampaignMaterialItem[]): string | null {
  return (
    materials
      .map((item) => item.promotionApprovedAt ?? item.submittedAt)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null
  );
}

function communicationLabel(eventType: JobCommunicationEventType): string {
  return eventType.replace(/_/g, " ");
}

function deliveryStatusLabel(status: JobCommunicationDeliveryStatus): string {
  switch (status) {
    case "pending_owner_send":
      return "Queued in Studio";
    case "sent":
      return "Sent";
    case "delivery_failed":
      return "Delivery failed";
    case "test_sent":
      return "Test sent";
    case "cancelled":
      return "Cancelled";
  }
}

export function resolveCampaignCommunicationClientId(
  clientUserId: string | null | undefined,
  campaignId: string,
): string {
  return clientUserId?.trim() || `unclaimed-client:${campaignId}`;
}

export function enqueueJobCommunicationRecord(
  envelope: ServerTasksEnvelope,
  input: EnqueueJobCommunicationInput,
): ServerTasksEnvelope {
  const template = JOB_COMMUNICATION_TEMPLATES[input.eventType];
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const key = input.idempotencyKey ?? occurredAt;
  const id = communicationRecordId(input.eventType, input.job.jobId, key);
  const existing = envelope.jobCommunicationRecords ?? [];
  if (existing.some((record) => record.id === id)) return envelope;

  const sender = input.sender ?? systemSender();
  const reason = input.reason ?? template.reason;
  const messageContent =
    input.messageContent ??
    (input.campaign ? template.message(input.job, input.campaign) : template.reason);
  const record: JobCommunicationRecord = {
    id,
    campaignId: input.job.campaignId,
    clientId: input.clientId,
    jobId: input.job.jobId,
    skuId: input.job.skuId,
    serviceName: input.job.serviceName,
    eventType: input.eventType,
    templateId: template.id,
    channel: "in_app_outbox",
    sender,
    reason,
    messageContent,
    deliveryStatus: input.deliveryStatus ?? defaultDeliveryStatus(input.eventType),
    createdAt: occurredAt,
    updatedAt: occurredAt,
    activityEventId: activityEventId(id),
  };

  const events = appendJobActivityEvent(envelope.jobActivityEvents ?? [], {
    campaignId: input.job.campaignId,
    jobId: input.job.jobId,
    kind: "client_communication",
    occurredAt,
    actor: sender,
    spineStatus: input.job.spineStatus,
    reason,
    messageContent,
    messageRef: id,
    communicationEventType: input.eventType,
    communicationDeliveryStatus: record.deliveryStatus,
    communicationChannel: record.channel,
  });

  return {
    ...envelope,
    jobCommunicationRecords: [...existing, record],
    jobActivityEvents: events,
    updatedAt: occurredAt,
    version: Math.max(envelope.version ?? 9, 9),
  };
}

export function applyJobCommunicationTransportResult(
  envelope: ServerTasksEnvelope,
  communicationId: string,
  result: {
    ok: boolean;
    code?: JobCommunicationTransportCode;
    providerMessageId?: string;
    occurredAt?: string;
  },
): ServerTasksEnvelope {
  const records = envelope.jobCommunicationRecords ?? [];
  const index = records.findIndex((record) => record.id === communicationId);
  if (index === -1) return envelope;

  const current = records[index];
  const occurredAt = result.occurredAt ?? new Date().toISOString();
  const record: JobCommunicationRecord = {
    ...current,
    deliveryStatus: result.ok ? "sent" : "delivery_failed",
    transportAttempts: (current.transportAttempts ?? 0) + 1,
    lastTransportAt: occurredAt,
    lastTransportCode: result.ok ? "ok" : result.code ?? "delivery_failed",
    transportProviderMessageId: result.ok
      ? result.providerMessageId
      : current.transportProviderMessageId,
    updatedAt: occurredAt,
  };
  const nextRecords = [...records];
  nextRecords[index] = record;
  return {
    ...envelope,
    jobCommunicationRecords: nextRecords,
    updatedAt: occurredAt,
    version: Math.max(envelope.version ?? 9, 9),
  };
}

export function markJobCommunicationTestSent(
  envelope: ServerTasksEnvelope,
  communicationId: string,
  actor: JobActivityActor,
  occurredAt = new Date().toISOString(),
  testRecipient = "test-recipient@studio.local",
): { ok: true; envelope: ServerTasksEnvelope; record: JobCommunicationRecord } | { ok: false; error: string } {
  const records = envelope.jobCommunicationRecords ?? [];
  const index = records.findIndex((record) => record.id === communicationId);
  if (index === -1) return { ok: false, error: "Communication record not found." };

  const current = records[index];
  const record: JobCommunicationRecord = {
    ...current,
    channel: "test_email",
    deliveryStatus: "test_sent",
    testSentAt: occurredAt,
    testSentBy: actor,
    testRecipient,
    updatedAt: occurredAt,
  };
  const nextRecords = [...records];
  nextRecords[index] = record;

  const events = appendJobActivityEvent(envelope.jobActivityEvents ?? [], {
    campaignId: record.campaignId,
    jobId: record.jobId,
    kind: "client_communication",
    occurredAt,
    actor,
    reason: `Safe test-send completed: ${record.reason}`,
    messageContent: record.messageContent,
    messageRef: `${record.id}:test-send:${occurredAt}`,
    communicationEventType: record.eventType,
    communicationDeliveryStatus: "test_sent",
    communicationChannel: "test_email",
  });

  return {
    ok: true,
    record,
    envelope: {
      ...envelope,
      jobCommunicationRecords: nextRecords,
      jobActivityEvents: events,
      updatedAt: occurredAt,
      version: Math.max(envelope.version ?? 9, 9),
    },
  };
}

export function resolveNeedsCommunicationQueue(
  records: readonly JobCommunicationRecord[] | undefined,
): NeedsCommunicationQueueItem[] {
  const lifecycleSet = new Set<string>(AUTHORIZED_LIFECYCLE_EMAIL_EVENT_TYPES);
  return (records ?? [])
    .filter((record) => record.deliveryStatus !== "cancelled")
    .filter((record) => lifecycleSet.has(record.eventType))
    .filter((record) => !IN_APP_IMMEDIATE_EVENT_TYPES.has(record.eventType))
    .map((record) => ({
      id: record.id,
      campaignId: record.campaignId,
      clientId: record.clientId,
      jobId: record.jobId,
      serviceName: record.serviceName,
      eventType: record.eventType,
      eventLabel: communicationLabel(record.eventType),
      reason: record.reason,
      messageContent: record.messageContent,
      deliveryStatus: record.deliveryStatus,
      statusLabel: deliveryStatusLabel(record.deliveryStatus),
      templateId: record.templateId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      testSentAt: record.testSentAt,
    }))
    .sort((a, b) => {
      if (a.deliveryStatus !== b.deliveryStatus) {
        return a.deliveryStatus === "pending_owner_send" ? -1 : 1;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

export function syncJobCommunicationRecords(input: {
  envelope: ServerTasksEnvelope;
  campaign: CampaignRecord;
  clientId: string;
  jobs: readonly PurchasedJobRecord[];
  materials: readonly CampaignMaterialItem[];
  nowMs?: number;
}): { envelope: ServerTasksEnvelope; jobs: PurchasedJobRecord[] } {
  const nowMs = input.nowMs ?? Date.now();
  const now = new Date(nowMs).toISOString();
  const previousJobs = new Map((input.envelope.jobRecords ?? []).map((job) => [job.jobId, job]));
  let envelope: ServerTasksEnvelope = { ...input.envelope };
  const jobs: PurchasedJobRecord[] = [];

  for (const originalJob of input.jobs) {
    const previous = previousJobs.get(originalJob.jobId);
    const blocking = blockingMaterialsForSku(input.materials, originalJob.skuId);
    let job: PurchasedJobRecord = originalJob;

    if (job.productionStartedAt && !job.nonRefundable) {
      job = { ...job, nonRefundable: true, refundEligibleAt: null, updatedAt: now };
    }

    if (input.campaign.paymentReceivedAt) {
      envelope = enqueueJobCommunicationRecord(envelope, {
        campaign: input.campaign,
        clientId: input.clientId,
        job,
        eventType: "payment_received",
        occurredAt: input.campaign.paymentReceivedAt,
        idempotencyKey: input.campaign.paymentReceivedAt,
      });
    }

    if (!job.intakeComplete || blocking.length > 0) {
      const requestAt =
        firstMaterialRequestAt(blocking) ?? input.campaign.paymentReceivedAt ?? job.updatedAt;
      envelope = enqueueJobCommunicationRecord(envelope, {
        campaign: input.campaign,
        clientId: input.clientId,
        job,
        eventType: "intake_incomplete_materials_needed",
        occurredAt: requestAt,
        idempotencyKey: `${requestAt}:${stableMaterialKey(blocking) || "intake"}`,
      });
    }

    if (previous?.spineStatus === "waiting_on_client" && job.spineStatus !== "waiting_on_client") {
      envelope = enqueueJobCommunicationRecord(envelope, {
        campaign: input.campaign,
        clientId: input.clientId,
        job,
        eventType: "materials_received_returned_to_queue",
        occurredAt: job.updatedAt,
        idempotencyKey: `${previous.waitingOnClientSince ?? previous.updatedAt}:returned`,
      });
    }

    if (job.productionStartedAt) {
      envelope = enqueueJobCommunicationRecord(envelope, {
        campaign: input.campaign,
        clientId: input.clientId,
        job,
        eventType: "production_started",
        occurredAt: job.productionStartedAt,
        idempotencyKey: job.productionStartedAt,
      });
    }

    if (job.spineStatus === "waiting_on_client") {
      const waitingSince = job.waitingOnClientSince ?? job.updatedAt;
      envelope = enqueueJobCommunicationRecord(envelope, {
        campaign: input.campaign,
        clientId: input.clientId,
        job,
        eventType: "waiting_on_client",
        occurredAt: waitingSince,
        idempotencyKey: `${waitingSince}:waiting`,
      });
    }

    jobs.push(job);
  }

  return {
    envelope: {
      ...envelope,
      jobRecords: jobs,
      version: Math.max(envelope.version ?? 9, 9),
    },
    jobs,
  };
}

