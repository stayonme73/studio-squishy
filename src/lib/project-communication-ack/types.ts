/**
 * COMM-5 — Durable customer acknowledgment of Studio replies.
 * Acknowledgment ≠ read / seen / delivered.
 */

export const PROJECT_COMMUNICATION_ACK_ENVELOPE_VERSION = 1;

export type ProjectCommunicationAckChannel =
  | "customer_board_view_messages"
  | "customer_board_communication_section";

export type ProjectCommunicationAckEnvelope = {
  version: number;
  campaignId: string;
  customerUserId: string;
  /** Newest Studio reply the customer has acknowledged for this campaign. */
  lastAcknowledgedStudioReplyId: string | null;
  lastAcknowledgedStudioReplyCreatedAt: string | null;
  acknowledgedAt: string | null;
  channel: ProjectCommunicationAckChannel | null;
  updatedAt: string;
};

export type StudioReplyNotificationState = {
  hasNewStudioReply: boolean;
  newestStudioReplyId: string | null;
  newestStudioReplyCreatedAt: string | null;
  lastAcknowledgedStudioReplyId: string | null;
  lastAcknowledgedAt: string | null;
};

export const PROJECT_COMMUNICATION_ACK_COPY = {
  newReplyIndicator: "New reply from The Studio",
  viewMessagesAction: "View project messages",
  neutralSectionLabel: "Project messages",
  acknowledgeBusyLabel: "Opening…",
  acknowledgeFailedFallback: "Could not update the reply notice.",
  notificationLoadNeutralFallback: "Project messages",
} as const;
