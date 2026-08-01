/**
 * REFUND-REQUEST-1 — Customer Refund Request intake copy.
 * Intake only. No money-returned, amount, provider, settlement, or timeline claims.
 * Help Center “may be eligible” / “may be approved” language must stay soft.
 */

export const REFUND_REQUEST_CUSTOMER_V1 = {
  sectionTitle: "REFUND REQUEST",
  sectionLead:
    "You can request a refund review for a job on this project. Requests are reviewed by the owner. A refund may be eligible or may be approved only when policy conditions are met and production has not started on that job.",

  jobLabel: "Which job is this request about?",
  jobLoading: "Loading your jobs…",
  jobLoadFailed: "Could not load jobs for this project.",
  jobEmpty: "No jobs are available for a refund request on this project.",

  reasonLabel: "Reason for this request",
  reasonPlaceholder: "Describe why you are requesting a refund review.",

  outcomeLabel: "What outcome are you requesting?",
  outcomePlaceholder: "For example: a full refund review for this job.",

  detailsLabel: "Supporting details (optional)",
  detailsPlaceholder: "Add any details that help the owner review your request.",

  submitLabel: "Submit refund request",
  submitBusyLabel: "Submitting…",

  policyNote:
    "Refund eligibility is determined per job. If production has not started on that job and the requirements of the Refund Policy are met, a refund may be approved.",

  productionStartedNote:
    "This request cannot be approved under the current project status. Production has started on this job, so payment for that job is non-refundable. You may still submit a request for owner review.",

  submittedForReview: "Your request was submitted for review.",
  ownerReviewing: "The owner is reviewing your request.",
  alreadySubmitted: "Your request has already been submitted.",
  alreadyDecided: "A refund decision has already been recorded for this job.",
  unavailable: "A refund request is not available for this project right now.",
  missingFields: "A reason and requested outcome are required.",
  submitFailedFallback: "Could not submit the refund request.",
  forbidden: "You do not have access to submit a refund request for this project.",
  jobNotFound: "That job could not be found for this project.",

  helpCenterHint: "Read the Refund Policy in the Help Center for full eligibility details.",
  helpCenterHref: "/help-center",
} as const;
