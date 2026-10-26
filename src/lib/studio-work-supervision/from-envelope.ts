import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { pendingCorrectionUseForJob } from "@/lib/job-control/revision-rework-escalation";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import { currentSequenceAttempts } from "@/lib/studio-production-correction/ledger";

import { evaluateWorkSupervision, latestSkuQaIsUnresolvedFail } from "./evaluate";
import type { JobSupervisionFacts, SupervisionEvaluation } from "./types";

function hasCustomerIncidentNotice(
  envelope: ServerTasksEnvelope,
  jobId: string,
): boolean {
  return (envelope.jobCommunicationRecords ?? []).some(
    (record) =>
      record.jobId === jobId &&
      (record.eventType === "revision_rework_in_progress" ||
        record.eventType === "owner_ask_client") &&
      record.deliveryStatus !== "cancelled",
  );
}

function lastActivityAt(job: PurchasedJobRecord, envelope: ServerTasksEnvelope): string | undefined {
  const events = (envelope.jobActivityEvents ?? [])
    .filter((event) => event.jobId === job.jobId)
    .map((event) => event.occurredAt);
  const candidates = [
    job.updatedAt,
    job.productionStartedAt,
    ...events,
  ].filter((value): value is string => Boolean(value));
  return candidates.sort().at(-1);
}

export function factsFromPurchasedJob(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  job: PurchasedJobRecord;
}): JobSupervisionFacts {
  const pending = pendingCorrectionUseForJob({
    campaign: input.campaign,
    envelope: input.envelope,
    jobId: input.job.jobId,
  });
  return {
    jobId: input.job.jobId,
    skuId: input.job.skuId,
    serviceName: input.job.serviceName,
    spineStatus: input.job.spineStatus,
    ownerApprovalPending: input.job.ownerApprovalPending ?? null,
    lastActivityAt: lastActivityAt(input.job, input.envelope),
    productionAttemptsUsed:
      input.campaign.internalProductionLoop?.jobId === input.job.jobId
        ? currentSequenceAttempts(input.campaign.internalProductionLoop)
        : 0,
    pendingCustomerRevision: Boolean(pending),
    unresolvedQaFail: latestSkuQaIsUnresolvedFail(
      input.envelope.qaRecords ?? [],
      input.job.skuId,
    ),
    customerInformedOfIncident: hasCustomerIncidentNotice(
      input.envelope,
      input.job.jobId,
    ),
    waitingOnCustomer:
      input.job.spineStatus === "waiting_on_client" ||
      input.job.intakeComplete === false,
    failedTransport: (input.envelope.jobCommunicationRecords ?? []).some(
      (record) =>
        record.jobId === input.job.jobId &&
        record.deliveryStatus === "delivery_failed",
    ),
    missingAuthorizedNotice: false,
  };
}

export function evaluateEnvelopeSupervision(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  nowMs?: number;
  ownerAvailable?: boolean;
}): SupervisionEvaluation {
  const jobs = (input.envelope.jobRecords ?? []).map((job) =>
    factsFromPurchasedJob({
      campaign: input.campaign,
      envelope: input.envelope,
      job,
    }),
  );
  return evaluateWorkSupervision({
    campaignId: input.campaign.campaignId,
    nowMs: input.nowMs ?? Date.now(),
    ownerAvailable: input.ownerAvailable ?? true,
    jobs,
  });
}
