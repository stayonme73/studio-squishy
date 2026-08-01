/**
 * REFUND-REQUEST-1 — Map existing refund-request API outcomes to customer-safe intake copy.
 * Does not invent amount, provider, settlement, or money-returned claims.
 */

import { REFUND_REQUEST_CUSTOMER_V1 as copy } from "@/config/refund-request-customer-v1";

export type RefundRequestCustomerOutcome =
  | { kind: "submitted_for_review"; message: string }
  | { kind: "pending_owner_review"; message: string }
  | { kind: "already_submitted"; message: string }
  | { kind: "already_decided"; message: string }
  | { kind: "unavailable"; message: string }
  | { kind: "validation"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "error"; message: string };

export function mapRefundRequestSubmitSuccess(): RefundRequestCustomerOutcome {
  return { kind: "submitted_for_review", message: copy.submittedForReview };
}

/**
 * Map HTTP failures from POST …/refund-request.
 * 409 = open waiting_owner interaction (already on desk).
 * 422 = refundOwnerDecisionAt already set.
 */
export function mapRefundRequestSubmitFailure(
  status: number,
  apiError?: string | null,
): RefundRequestCustomerOutcome {
  if (status === 409) {
    return {
      kind: "pending_owner_review",
      message: `${copy.alreadySubmitted} ${copy.ownerReviewing}`,
    };
  }
  if (status === 422) {
    const text = (apiError ?? "").toLowerCase();
    if (text.includes("already decided")) {
      return { kind: "already_decided", message: copy.alreadyDecided };
    }
    return {
      kind: "error",
      message: apiError?.trim() || copy.submitFailedFallback,
    };
  }
  if (status === 400) {
    return {
      kind: "validation",
      message: apiError?.trim() || copy.missingFields,
    };
  }
  if (status === 403) {
    return { kind: "forbidden", message: copy.forbidden };
  }
  if (status === 404) {
    return { kind: "unavailable", message: copy.jobNotFound };
  }
  return {
    kind: "error",
    message: apiError?.trim() || copy.submitFailedFallback,
  };
}

/** Customer-safe notice when project-status reports production has started. */
export function refundProductionStartedCustomerNote(): string {
  return copy.productionStartedNote;
}
