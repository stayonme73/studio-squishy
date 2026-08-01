import type { OwnerDecisionInteractionRecord } from "./owner-decision-interaction-types";

/**
 * ISSUE-ENTRY-1 — truthful, customer-safe problem-report status.
 * Only states the current implementation can prove — no assigned / under-review /
 * escalated / SLA / human-review claims. See SCOUT ISSUE-ENTRY-1 boundary.
 */
export type ProblemReportCustomerStatus = "received" | "additional_information_requested" | "closed";

export type ProblemReportCustomerView = {
  status: ProblemReportCustomerStatus;
  statusLabel: string;
  submittedAt: string;
  updatedAt: string;
};

const STATUS_LABELS: Record<ProblemReportCustomerStatus, string> = {
  received: "Received by the Studio system",
  additional_information_requested: "Additional information requested",
  closed: "Closed",
};

/**
 * Maps the internal Owner Desk complaint status to the smallest truthful customer-facing
 * state. "waiting_internal" intentionally still reads as "received" — the customer has not
 * been asked anything and nothing has been posted back to them yet, so no stronger claim
 * (e.g. "under review") is truthful to make.
 */
export function toProblemReportCustomerStatus(
  status: OwnerDecisionInteractionRecord["status"],
): ProblemReportCustomerStatus {
  if (status === "waiting_client") return "additional_information_requested";
  if (status === "resolved") return "closed";
  return "received";
}

export function toProblemReportCustomerView(
  interaction: OwnerDecisionInteractionRecord,
): ProblemReportCustomerView {
  const status = toProblemReportCustomerStatus(interaction.status);
  return {
    status,
    statusLabel: STATUS_LABELS[status],
    submittedAt: interaction.createdAt,
    updatedAt: interaction.updatedAt,
  };
}
