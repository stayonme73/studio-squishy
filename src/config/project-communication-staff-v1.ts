/**
 * COMM-3 — Staff File Room project communication copy.
 * Truthful only — no delivered / notified / seen / email claims.
 */

export const PROJECT_COMMUNICATION_STAFF_V1 = {
  sectionTitle: "Project communication",
  sectionLead:
    "Customer messages for this project. Replies are saved to the project communication record. The customer is not notified by email yet.",
  emptyState: "No customer messages for this project yet.",
  customerLabel: "Customer",
  studioLabel: "Studio staff",
  awaitingReplyLabel: "The Studio has not replied yet.",
  repliedLabel: "Studio reply on record",
  replyComposerLabel: "Reply to this customer message",
  replyPlaceholder: "Write a plain-text reply for this project.",
  replySubmitLabel: "Save Studio reply",
  replyBusyLabel: "Saving reply…",
  replySuccess: "Reply saved to the project communication record.",
  replyFailedFallback: "Could not save the reply.",
  loadFailedFallback: "Could not load project communication.",
  campaignContextLabel: "Campaign",
  accountIdLabel: "Customer account",
  selectMessageHint: "Choose a customer message to reply.",
} as const;
