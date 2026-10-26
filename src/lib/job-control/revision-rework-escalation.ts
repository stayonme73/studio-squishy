/**
 * Revision → Review round trip — what happens when the Studio rejects its own
 * revised work before the customer ever sees it.
 * Authority: STUDIO-OPERATING-REVISION-TO-REVIEW-ROUND-TRIP-CERTIFICATION-1
 *
 * Failing closed is correct: a hollow or broken artifact must not reach a paying
 * customer. Failing closed *silently* is the defect. The customer asked for a
 * change, the Studio decided its own answer was not good enough, and before this
 * the customer heard nothing while their revision sat spent.
 */

import { isFailClosedSoldSku } from "@/config/studio-copy-kit-light-harden-v1";
import { studioRevisionToReviewRoundTripV1 } from "@/config/studio-revision-to-review-round-trip-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { CampaignRecord } from "@/config/studio-board";

import { requestOwnerApprovalBeforeReview } from "./actions";
import { appendJobActivityEvent } from "./activity-log";
import {
  communicationRecordId,
  enqueueJobCommunicationRecord,
  resolveCampaignCommunicationClientId,
} from "./communication";
import { deriveCorrectionAccounting } from "./correction-round-ledger";
import type { CorrectionUseRecord } from "./correction-round-ledger";
import type { JobActivityEvent, PurchasedJobRecord } from "./types";

/** The revision this customer is still waiting on, if any. */
export function pendingCorrectionUseForJob(input: {
  campaign: CampaignRecord;
  envelope: Pick<
    ServerTasksEnvelope,
    "jobCorrectionUses" | "jobCorrectionExtraGrants" | "jobActivityEvents"
  >;
  jobId: string;
}): CorrectionUseRecord | null {
  const accounting = deriveCorrectionAccounting({
    campaign: input.campaign,
    envelope: input.envelope,
  });
  const pending = accounting.pending
    .filter((row) => row.jobId === input.jobId)
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  return pending[pending.length - 1] ?? null;
}

/**
 * Ask the Owner to look and tell the customer the truth. Idempotent per pending
 * revision so repeated internal attempts do not repeatedly notify the customer.
 *
 * Does not restore anything: under `on_review_open` consumption the round was
 * never spent, so there is nothing to give back.
 */
export function escalateRevisionReworkToOwner(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  job: PurchasedJobRecord;
  clientUserId?: string | null;
  occurredAt?: string;
}): {
  envelope: ServerTasksEnvelope;
  job: PurchasedJobRecord;
  escalated: boolean;
  pendingCorrectionUseId: string | null;
} {
  const pending = pendingCorrectionUseForJob({
    campaign: input.campaign,
    envelope: input.envelope,
    jobId: input.job.jobId,
  });
  if (!pending) {
    return {
      envelope: input.envelope,
      job: input.job,
      escalated: false,
      pendingCorrectionUseId: null,
    };
  }

  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const idempotencyKey = `revision-rework:${pending.id}`;
  const noticeId = communicationRecordId(
    "revision_rework_in_progress",
    input.job.jobId,
    idempotencyKey,
  );
  const already = (input.envelope.jobCommunicationRecords ?? []).some(
    (record) => record.id === noticeId,
  );
  if (already) {
    return {
      envelope: input.envelope,
      job: input.job,
      escalated: false,
      pendingCorrectionUseId: pending.id,
    };
  }

  const job = isFailClosedSoldSku(input.job.skuId)
    ? {
        ...input.job,
        ownerApprovalPending: null,
        internalQaReviewAuthorization: undefined,
        updatedAt: occurredAt,
      }
    : requestOwnerApprovalBeforeReview(input.job);

  let events: readonly JobActivityEvent[] = appendJobActivityEvent(
    input.envelope.jobActivityEvents ?? [],
    {
      campaignId: job.campaignId,
      jobId: job.jobId,
      kind: "internal_note",
      occurredAt,
      actor: { role: "system", displayName: "Studio Machine" },
      reason: studioRevisionToReviewRoundTripV1.ownerCopy.reworkEscalationDetail,
      messageRef: idempotencyKey,
    },
  );

  let envelope: ServerTasksEnvelope = {
    ...input.envelope,
    jobRecords: (input.envelope.jobRecords ?? []).map((entry) =>
      entry.jobId === job.jobId ? job : entry,
    ),
    jobActivityEvents: [...events],
    updatedAt: occurredAt,
  };

  envelope = enqueueJobCommunicationRecord(envelope, {
    campaign: input.campaign,
    clientId: resolveCampaignCommunicationClientId(
      input.clientUserId,
      input.campaign.campaignId,
    ),
    job,
    eventType: "revision_rework_in_progress",
    occurredAt,
    idempotencyKey,
  });
  events = envelope.jobActivityEvents ?? events;

  return { envelope, job, escalated: true, pendingCorrectionUseId: pending.id };
}
