/**
 * Quiet-failure findings for Room 1 lifecycle notices.
 * Detects waiting transport, failed retry, and missing authorized notices.
 * Never classifies routine transport as an Owner duty.
 */

import { studioResendLifecycleAndWatchdogV1 as cfg } from "@/config/studio-resend-lifecycle-and-watchdog-v1";
import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  enqueueJobCommunicationRecord,
  resolveCampaignCommunicationClientId,
  syncJobCommunicationRecords,
} from "@/lib/job-control/communication";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import type { JobCommunicationEventType } from "@/lib/job-control/types";

import { isAuthorizedLifecycleNotice } from "./deliver";

export type LifecycleWatchdogFinding = {
  kind: "notice_waiting" | "failed_transport_retryable" | "expected_notice_missing";
  campaignId: string;
  communicationId?: string;
  eventType?: JobCommunicationEventType;
  ownerActionRequired: false;
  recovery: "retry_transport" | "enqueue_authorized_notice";
};

function hasEvent(
  envelope: ServerTasksEnvelope,
  eventType: JobCommunicationEventType,
): boolean {
  return (envelope.jobCommunicationRecords ?? []).some(
    (record) => record.eventType === eventType && record.deliveryStatus !== "cancelled",
  );
}

export function evaluateLifecycleWatchdogFindings(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  nowMs?: number;
}): LifecycleWatchdogFinding[] {
  const nowMs = input.nowMs ?? Date.now();
  const findings: LifecycleWatchdogFinding[] = [];
  const campaignId = input.campaign.campaignId;
  const jobs = input.envelope.jobRecords ?? [];
  const flyer = jobs.find((job) => job.skuId === "v2-rtu-flyer") ?? jobs[0];

  for (const record of input.envelope.jobCommunicationRecords ?? []) {
    if (!isAuthorizedLifecycleNotice(record)) continue;
    if (record.deliveryStatus === "delivery_failed") {
      findings.push({
        kind: "failed_transport_retryable",
        campaignId,
        communicationId: record.id,
        eventType: record.eventType,
        ownerActionRequired: false,
        recovery: "retry_transport",
      });
    }
    if (record.deliveryStatus === "pending_owner_send") {
      const created = new Date(record.createdAt).getTime();
      if (Number.isFinite(created) && nowMs - created >= cfg.noticeWaitingMs) {
        findings.push({
          kind: "notice_waiting",
          campaignId,
          communicationId: record.id,
          eventType: record.eventType,
          ownerActionRequired: false,
          recovery: "retry_transport",
        });
      }
    }
  }

  if (
    (input.campaign.paymentTruth?.status === "confirmed" || input.campaign.paymentReceivedAt) &&
    !hasEvent(input.envelope, "payment_received")
  ) {
    findings.push({
      kind: "expected_notice_missing",
      campaignId,
      eventType: "payment_received",
      ownerActionRequired: false,
      recovery: "enqueue_authorized_notice",
    });
  }
  if (flyer?.productionStartedAt && !hasEvent(input.envelope, "production_started")) {
    findings.push({
      kind: "expected_notice_missing",
      campaignId,
      eventType: "production_started",
      ownerActionRequired: false,
      recovery: "enqueue_authorized_notice",
    });
  }
  if (
    flyer?.spineStatus === "ready_for_review" &&
    !hasEvent(input.envelope, "ready_for_review") &&
    !hasEvent(input.envelope, "revision_ready_again")
  ) {
    findings.push({
      kind: "expected_notice_missing",
      campaignId,
      eventType: "ready_for_review",
      ownerActionRequired: false,
      recovery: "enqueue_authorized_notice",
    });
  }
  if (flyer && !flyer.intakeComplete && !hasEvent(input.envelope, "intake_incomplete_materials_needed")) {
    findings.push({
      kind: "expected_notice_missing",
      campaignId,
      eventType: "intake_incomplete_materials_needed",
      ownerActionRequired: false,
      recovery: "enqueue_authorized_notice",
    });
  }

  return findings;
}

export function recoverMissingAuthorizedNotices(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  clientUserId?: string | null;
  materials?: readonly CampaignMaterialItem[];
}): ServerTasksEnvelope {
  const jobs = syncJobRecordsFromCampaign(
    input.campaign,
    input.envelope.tasks ?? [],
    input.materials ?? [],
    input.envelope.exceptionRecords ?? [],
    input.envelope.jobRecords,
  );
  const synced = syncJobCommunicationRecords({
    envelope: input.envelope,
    campaign: input.campaign,
    clientId: resolveCampaignCommunicationClientId(
      input.clientUserId,
      input.campaign.campaignId,
    ),
    jobs,
    materials: input.materials ?? [],
  });
  let envelope = synced.envelope;
  const flyer = synced.jobs.find((job) => job.skuId === "v2-rtu-flyer");
  const decisionId = flyer?.internalQaReviewAuthorization?.decisionId;
  if (
    flyer?.spineStatus === "ready_for_review" &&
    decisionId &&
    !hasEvent(envelope, "ready_for_review") &&
    !hasEvent(envelope, "revision_ready_again")
  ) {
    envelope = enqueueJobCommunicationRecord(envelope, {
      campaign: input.campaign,
      clientId: resolveCampaignCommunicationClientId(
        input.clientUserId,
        input.campaign.campaignId,
      ),
      job: flyer,
      eventType: "ready_for_review",
      idempotencyKey: decisionId,
    });
  }
  return envelope;
}

export function isResendLifecycleConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.TRANSACTIONAL_EMAIL_FROM?.trim(),
  );
}
