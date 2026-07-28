/**
 * COMM-4 — Customer Studio Board project communication copy.
 * Truthful only — protected COMM-D4 strings.
 * COMM-5 notification strings live in PROJECT_COMMUNICATION_ACK_COPY.
 */

export const PROJECT_COMMUNICATION_CUSTOMER_V1 = {
  sectionTitle: "Project communication",
  sectionLead:
    "Messages about this project stay on your Studio Board. Replies from The Studio appear here when they are saved.",
  emptyState: "No project messages yet.",
  youLabel: "You",
  studioLabel: "The Studio",
  awaitingReplyLabel: "The Studio has not replied yet.",
  repliedLabel: "The Studio replied",
  composerLabel: "Message to The Studio",
  composerPlaceholder: "Write a plain-text message about this project.",
  submitLabel: "Send message",
  submitBusyLabel: "Sending…",
  successCopy: "Message sent to The Studio.",
  loadFailedFallback: "Could not load project messages.",
  sendFailedFallback: "Could not send the message.",
  authRequiredLead: "Sign in to send and view project messages.",
  /** COMM-5 — in-product notice only; not a read receipt. */
  newReplyIndicator: "New reply from The Studio",
  viewMessagesAction: "View project messages",
  neutralMessagesLabel: "Project messages",
  acknowledgeFailedFallback: "Could not update the reply notice.",
} as const;
