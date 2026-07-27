import {
  PROJECT_COMMUNICATION_BODY_MAX_LENGTH,
  type ProjectCommunicationMessage,
  type ProjectCommunicationSenderRole,
} from "./types";

export type ProjectCommunicationValidationError = {
  ok: false;
  error: string;
  status: number;
};

export function normalizeCampaignId(campaignId: string): string | null {
  const trimmed = campaignId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeMessageBody(body: string): string | null {
  const trimmed = body.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateMessageBody(body: string): ProjectCommunicationValidationError | { ok: true; body: string } {
  const normalized = normalizeMessageBody(body);
  if (!normalized) {
    return { ok: false, error: "Message body is required.", status: 400 };
  }
  if (normalized.length > PROJECT_COMMUNICATION_BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `Message body must be at most ${PROJECT_COMMUNICATION_BODY_MAX_LENGTH} characters.`,
      status: 400,
    };
  }
  return { ok: true, body: normalized };
}

export function validateCampaignId(
  campaignId: string,
): ProjectCommunicationValidationError | { ok: true; campaignId: string } {
  const normalized = normalizeCampaignId(campaignId);
  if (!normalized) {
    return { ok: false, error: "Campaign id is required.", status: 400 };
  }
  return { ok: true, campaignId: normalized };
}

export function validateSenderRole(
  role: ProjectCommunicationSenderRole,
  expected: ProjectCommunicationSenderRole,
): ProjectCommunicationValidationError | { ok: true } {
  if (role !== expected) {
    return {
      ok: false,
      error: `Sender role must be ${expected}.`,
      status: 400,
    };
  }
  return { ok: true };
}

export function validateSenderUserId(
  senderUserId: string,
): ProjectCommunicationValidationError | { ok: true; senderUserId: string } {
  const trimmed = senderUserId.trim();
  if (!trimmed) {
    return { ok: false, error: "Sender id is required.", status: 400 };
  }
  return { ok: true, senderUserId: trimmed };
}

export function validateIdempotencyKey(
  idempotencyKey: string,
): ProjectCommunicationValidationError | { ok: true; idempotencyKey: string } {
  const trimmed = idempotencyKey.trim();
  if (!trimmed) {
    return { ok: false, error: "Idempotency key is required.", status: 400 };
  }
  return { ok: true, idempotencyKey: trimmed };
}

/** Customer-visible list — this domain stores only customer_visible messages. */
export function listCustomerVisibleMessages(
  messages: readonly ProjectCommunicationMessage[],
): ProjectCommunicationMessage[] {
  return messages
    .filter((message) => message.visibility === "customer_visible")
    .slice()
    .sort(compareMessagesAscending);
}

export function listStaffVisibleProjectCommunication(
  messages: readonly ProjectCommunicationMessage[],
): ProjectCommunicationMessage[] {
  // Same stream for now; internal notes are not stored in this domain.
  return listCustomerVisibleMessages(messages);
}

export function compareMessagesAscending(
  a: ProjectCommunicationMessage,
  b: ProjectCommunicationMessage,
): number {
  const byTime = a.createdAt.localeCompare(b.createdAt);
  if (byTime !== 0) return byTime;
  return a.id.localeCompare(b.id);
}

export function hasStudioReply(
  messages: readonly ProjectCommunicationMessage[],
  customerMessageId: string,
): boolean {
  return messages.some(
    (message) =>
      message.senderRole === "studio_staff" &&
      message.replyToMessageId === customerMessageId &&
      message.visibility === "customer_visible",
  );
}
