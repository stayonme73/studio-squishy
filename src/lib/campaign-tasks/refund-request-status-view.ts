/**
 * REFUND-STATUS — truthful, customer-safe refund-request status.
 * Uses OwnerDecisionInteractionRecord + job spine only. No money-returned,
 * amount, provider, settlement, or internal-note exposure.
 */

import type { PurchasedJobRecord } from "@/lib/job-control/types";

import type { OwnerDecisionInteractionRecord } from "./owner-decision-interaction-types";

export type RefundRequestCustomerStatus =
  | "received"
  | "additional_information_requested"
  | "decision_recorded";

export type RefundRequestDecisionOutcome = "approved" | "not_approved";

export type RefundRequestCustomerView = {
  status: RefundRequestCustomerStatus;
  statusLabel: string;
  /** Present only when status is decision_recorded — from job spine, not owner notes. */
  decisionOutcome: RefundRequestDecisionOutcome | null;
  submittedAt: string;
  updatedAt: string;
  jobId: string;
};

const STATUS_LABELS: Record<RefundRequestCustomerStatus, string> = {
  received: "Your request was received and is pending owner review.",
  additional_information_requested:
    "Additional information has been requested for this refund request.",
  decision_recorded: "An owner decision has been recorded for this refund request.",
};

const DECISION_LABELS: Record<RefundRequestDecisionOutcome, string> = {
  approved:
    "An owner decision was recorded: a refund was approved for this job. This does not confirm that money has been returned.",
  not_approved:
    "An owner decision was recorded: a refund was not approved for this job.",
};

/**
 * Maps Owner Desk refund interaction status to the smallest truthful customer state.
 * waiting_internal stays "received" — no stronger "under review" claim is available.
 */
export function toRefundRequestCustomerStatus(
  status: OwnerDecisionInteractionRecord["status"],
): RefundRequestCustomerStatus {
  if (status === "waiting_client") return "additional_information_requested";
  if (status === "resolved") return "decision_recorded";
  return "received";
}

export function toRefundRequestDecisionOutcome(
  interaction: OwnerDecisionInteractionRecord,
  job: PurchasedJobRecord | undefined,
): RefundRequestDecisionOutcome | null {
  if (interaction.status !== "resolved") return null;
  if (job?.spineStatus === "refunded_cancelled") return "approved";
  return "not_approved";
}

export function toRefundRequestCustomerView(
  interaction: OwnerDecisionInteractionRecord,
  job: PurchasedJobRecord | undefined,
): RefundRequestCustomerView {
  const status = toRefundRequestCustomerStatus(interaction.status);
  const decisionOutcome = toRefundRequestDecisionOutcome(interaction, job);
  const statusLabel =
    decisionOutcome != null ? DECISION_LABELS[decisionOutcome] : STATUS_LABELS[status];

  return {
    status,
    statusLabel,
    decisionOutcome,
    submittedAt: interaction.createdAt,
    updatedAt: interaction.updatedAt,
    jobId: interaction.jobId ?? job?.jobId ?? "",
  };
}
