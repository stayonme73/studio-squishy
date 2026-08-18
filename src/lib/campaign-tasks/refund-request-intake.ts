import { JOB_CONTROL_POLICY } from "@/config/job-control";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import type { RefundRequestSourceChannel } from "@/config/refund-request-channels";

import type { RefundRequestSnapshot } from "./owner-decision-interaction-types";

export const REFUND_INTAKE_CASUAL_PROMPT =
  "I can help start a refund review. I need the reason for the request before it can go to owner review.";

export const REFUND_INTAKE_MISSING_OUTCOME =
  "I need to know what outcome you want from this refund review before it can go to owner review.";

export type RefundIntakePayload = {
  reason?: string;
  requestedOutcome?: string;
  supportingDetails?: string;
  sourceChannel?: RefundRequestSourceChannel;
};

export function isRefundIntakeComplete(payload: RefundIntakePayload): boolean {
  return Boolean(payload.reason?.trim() && payload.requestedOutcome?.trim());
}

export function resolveRefundIntakePrompt(payload: RefundIntakePayload): string {
  if (!payload.reason?.trim()) return REFUND_INTAKE_CASUAL_PROMPT;
  if (!payload.requestedOutcome?.trim()) return REFUND_INTAKE_MISSING_OUTCOME;
  return REFUND_INTAKE_CASUAL_PROMPT;
}

export function resolveProductionStartedReadOnly(job: PurchasedJobRecord): boolean {
  return Boolean(job.productionStartedAt || job.nonRefundable);
}

export function resolveReceivedConceptsOrFilesReadOnly(job: PurchasedJobRecord): boolean {
  const hasPreparedDeliverables = (job.deliverablePrep ?? []).some((entry) => entry.preparedAt);
  const reviewVisibleStatuses = new Set([
    "ready_for_review",
    "revision_requested",
    "approved",
    "ready_for_delivery",
    "delivered",
  ]);
  return hasPreparedDeliverables || reviewVisibleStatuses.has(job.spineStatus);
}

export function resolveRefundPolicyStatusLabel(job: PurchasedJobRecord): string {
  if (resolveProductionStartedReadOnly(job)) {
    return "Non-refundable — production has started for this job.";
  }
  if (job.refundEligibleAt) {
    return `May be eligible per ${JOB_CONTROL_POLICY.refundEligibleDays}-day waiting-on-client policy — Owner approval required.`;
  }
  return "Refund review — policy facts recorded; Owner approval required.";
}

/** Job-grain timeline only — campaign payment truth stays on CampaignRecord. */
export function resolveRefundTimelineFacts(job: PurchasedJobRecord): string {
  const parts: string[] = [];
  if (job.waitingOnClientSince) {
    parts.push(`Waiting on client since ${formatFactDate(job.waitingOnClientSince)}.`);
  }
  if (job.refundEligibleAt) {
    parts.push(`Internal refund-eligibility signal recorded ${formatFactDate(job.refundEligibleAt)}.`);
  }
  if (job.lastClientResponseAt) {
    parts.push(`Last client response ${formatFactDate(job.lastClientResponseAt)}.`);
  }
  return parts.length ? parts.join(" ") : "Timeline facts are on the job activity record.";
}

export function resolveRefundMissingEvidence(
  job: PurchasedJobRecord,
  payload: RefundIntakePayload,
): string | undefined {
  const gaps: string[] = [];
  if (!payload.supportingDetails?.trim()) {
    gaps.push("No supporting details from the client.");
  }
  if (!job.refundEligibleAt && !resolveProductionStartedReadOnly(job)) {
    gaps.push("14-day eligibility signal not yet recorded — review timeline before deciding.");
  }
  return gaps.length ? gaps.join(" ") : undefined;
}

export function resolveRefundRecommendedNextAction(snapshot: RefundRequestSnapshot): string {
  if (snapshot.productionStarted) {
    return "Deny refund — production has started; use approved client messaging if needed.";
  }
  if (snapshot.policyStatusLabel.includes("May be eligible")) {
    return "Review client reason and timeline, then approve or deny — do not auto-refund.";
  }
  return "Review client reason, policy status, and timeline before approve, deny, or hold.";
}

function formatFactDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function buildRefundRequestSnapshot(
  job: PurchasedJobRecord,
  payload: Required<Pick<RefundIntakePayload, "reason" | "requestedOutcome">> &
    Pick<RefundIntakePayload, "supportingDetails" | "sourceChannel">,
): RefundRequestSnapshot {
  const productionStarted = resolveProductionStartedReadOnly(job);
  const receivedConceptsOrFiles = resolveReceivedConceptsOrFilesReadOnly(job);
  const policyStatusLabel = resolveRefundPolicyStatusLabel(job);
  const timelineFacts = resolveRefundTimelineFacts(job);
  const missingEvidence = resolveRefundMissingEvidence(job, payload);
  const snapshot: RefundRequestSnapshot = {
    reason: payload.reason.trim(),
    requestedOutcome: payload.requestedOutcome.trim(),
    productionStarted,
    receivedConceptsOrFiles,
    supportingDetails: payload.supportingDetails?.trim() || undefined,
    sourceChannel: payload.sourceChannel,
    policyStatusLabel,
    timelineFacts,
    missingEvidence,
    recommendedNextAction: "",
    submittedAt: new Date().toISOString(),
  };
  snapshot.recommendedNextAction = resolveRefundRecommendedNextAction(snapshot);
  return snapshot;
}

export function isCompleteRefundSnapshot(
  snapshot: RefundRequestSnapshot | undefined,
): snapshot is RefundRequestSnapshot {
  return Boolean(snapshot?.reason?.trim() && snapshot?.requestedOutcome?.trim());
}

export function refundIntakeFromFacts(
  facts: Record<string, unknown> | undefined,
): RefundIntakePayload {
  return {
    reason:
      typeof facts?.refundReason === "string"
        ? facts.refundReason
        : typeof facts?.reason === "string"
          ? facts.reason
          : undefined,
    requestedOutcome:
      typeof facts?.requestedOutcome === "string" ? facts.requestedOutcome : undefined,
    supportingDetails:
      typeof facts?.supportingDetails === "string" ? facts.supportingDetails : undefined,
    sourceChannel:
      typeof facts?.sourceChannel === "string"
        ? (facts.sourceChannel as RefundRequestSourceChannel)
        : undefined,
  };
}
