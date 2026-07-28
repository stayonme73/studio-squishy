import type { ProjectCommunicationMessage } from "@/lib/project-communication/types";

import type {
  ProjectCommunicationAckEnvelope,
  StudioReplyNotificationState,
} from "./types";

/**
 * Newest customer-visible Studio staff reply in chronological stream order.
 * Deterministic: createdAt ascending, then id ascending; pick last.
 */
export function findNewestStudioStaffReply(
  messages: readonly ProjectCommunicationMessage[],
): ProjectCommunicationMessage | null {
  const studio = messages.filter(
    (message) =>
      message.senderRole === "studio_staff" && message.visibility === "customer_visible",
  );
  if (studio.length === 0) return null;
  const sorted = [...studio].sort((a, b) => {
    const byTime = a.createdAt.localeCompare(b.createdAt);
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
  return sorted[sorted.length - 1] ?? null;
}

export function deriveStudioReplyNotificationState(
  messages: readonly ProjectCommunicationMessage[],
  ack: ProjectCommunicationAckEnvelope | null,
): StudioReplyNotificationState {
  const newest = findNewestStudioStaffReply(messages);
  if (!newest) {
    return {
      hasNewStudioReply: false,
      newestStudioReplyId: null,
      newestStudioReplyCreatedAt: null,
      lastAcknowledgedStudioReplyId: ack?.lastAcknowledgedStudioReplyId ?? null,
      lastAcknowledgedAt: ack?.acknowledgedAt ?? null,
    };
  }

  const acknowledgedId = ack?.lastAcknowledgedStudioReplyId ?? null;
  const hasNewStudioReply = acknowledgedId !== newest.id;

  return {
    hasNewStudioReply,
    newestStudioReplyId: newest.id,
    newestStudioReplyCreatedAt: newest.createdAt,
    lastAcknowledgedStudioReplyId: acknowledgedId,
    lastAcknowledgedAt: ack?.acknowledgedAt ?? null,
  };
}
