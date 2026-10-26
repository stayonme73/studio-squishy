import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { escalateRevisionReworkToOwner } from "@/lib/job-control/revision-rework-escalation";

import { evaluateEnvelopeSupervision } from "./from-envelope";

/**
 * Apply supervisor-allowed recoveries that already exist.
 * Does not start production, call a provider, or invent Owner approval.
 */
export function applySupervisionRecovery(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  clientUserId?: string | null;
  nowMs?: number;
  ownerAvailable?: boolean;
}): {
  envelope: ServerTasksEnvelope;
  recoveredJobIds: readonly string[];
  heldBecauseOwnerUnavailable: readonly string[];
} {
  const evaluation = evaluateEnvelopeSupervision({
    campaign: input.campaign,
    envelope: input.envelope,
    nowMs: input.nowMs,
    ownerAvailable: input.ownerAvailable,
  });

  let envelope = input.envelope;
  const recoveredJobIds: string[] = [];
  const heldBecauseOwnerUnavailable = evaluation.ownerUnavailableHolds.map(
    (incident) => incident.jobId,
  );

  for (const incident of evaluation.incidents) {
    if (
      incident.recovery !== "enqueue_customer_notice" &&
      incident.recovery !== "escalate_owner" &&
      incident.recovery !== "hold_and_inform_customer"
    ) {
      continue;
    }
    const job = envelope.jobRecords?.find((entry) => entry.jobId === incident.jobId);
    if (!job) continue;
    const next = escalateRevisionReworkToOwner({
      campaign: input.campaign,
      envelope,
      job,
      clientUserId: input.clientUserId,
    });
    envelope = next.envelope;
    if (next.escalated) recoveredJobIds.push(incident.jobId);
  }

  return { envelope, recoveredJobIds, heldBecauseOwnerUnavailable };
}
