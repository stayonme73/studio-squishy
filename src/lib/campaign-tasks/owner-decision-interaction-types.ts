import type { CustomerInteractionKind } from "@/decision-core";
import type { RefundRequestSourceChannel } from "@/config/refund-request-channels";

import type { CampaignExceptionStatus } from "./exceptions-types";

/** Structured client refund intake — required before Owner Desk folder. */
export type RefundRequestSnapshot = {
  reason: string;
  requestedOutcome: string;
  productionStarted: boolean;
  receivedConceptsOrFiles: boolean;
  supportingDetails?: string;
  sourceChannel?: RefundRequestSourceChannel;
  policyStatusLabel: string;
  timelineFacts: string;
  missingEvidence?: string;
  recommendedNextAction: string;
  submittedAt: string;
};

/** Owner decision desk — client interaction folders (complaint, refund request, etc.). */
export type OwnerDecisionInteractionRecord = {
  id: string;
  campaignId: string;
  jobId?: string;
  interactionKind: CustomerInteractionKind;
  status: Extract<
    CampaignExceptionStatus,
    "waiting_owner" | "waiting_internal" | "waiting_client" | "resolved"
  >;
  clientMessage: string;
  createdAt: string;
  updatedAt: string;
  resolutionNotes?: string;
  refundSnapshot?: RefundRequestSnapshot;
  /**
   * ISSUE-ENTRY-1 — client-supplied idempotency key for problem-report submission.
   * Scoped per campaignId; lets a resubmit-with-same-key replay safely instead of
   * creating a duplicate complaint record. Optional — refund_request and other
   * interaction kinds do not set this.
   */
  submissionIdempotencyKey?: string;
};
