import { randomUUID } from "crypto";

import {
  getOrInitializeProjectCommunication,
  readProjectCommunicationEnvelope,
  writeProjectCommunicationEnvelope,
} from "./store";
import type {
  ProjectCommunicationEnvelope,
  ProjectCommunicationMessage,
} from "./types";
import {
  hasStudioReply,
  listCustomerVisibleMessages,
  listStaffVisibleProjectCommunication,
  validateCampaignId,
  validateIdempotencyKey,
  validateMessageBody,
  validateSenderUserId,
} from "./validation";

function nowIso(): string {
  return new Date().toISOString();
}

function findByIdempotency(
  envelope: ProjectCommunicationEnvelope,
  senderUserId: string,
  idempotencyKey: string,
): ProjectCommunicationMessage | undefined {
  return envelope.messages.find(
    (message) =>
      message.senderUserId === senderUserId && message.idempotencyKey === idempotencyKey,
  );
}

function findMessageById(
  envelope: ProjectCommunicationEnvelope,
  messageId: string,
): ProjectCommunicationMessage | undefined {
  return envelope.messages.find((message) => message.id === messageId);
}

export type CreateCustomerMessageInput = {
  campaignId: string;
  customerUserId: string;
  senderUserId: string;
  senderDisplayName?: string;
  body: string;
  idempotencyKey: string;
};

export type CreateStudioReplyInput = {
  campaignId: string;
  /** Owning customer for the project — required for ownership binding. */
  customerUserId: string;
  staffUserId: string;
  staffDisplayName?: string;
  body: string;
  replyToMessageId: string;
  idempotencyKey: string;
};

export type ProjectCommunicationActionResult =
  | {
      ok: true;
      message: ProjectCommunicationMessage;
      envelope: ProjectCommunicationEnvelope;
      replayed: boolean;
    }
  | { ok: false; error: string; status: number };

/**
 * Persist a customer-authored project message.
 * Status `accepted` means durable storage accepted the record — not that a human read it.
 */
export async function createCustomerProjectMessage(
  input: CreateCustomerMessageInput,
): Promise<ProjectCommunicationActionResult> {
  const campaign = validateCampaignId(input.campaignId);
  if (!campaign.ok) return campaign;

  const sender = validateSenderUserId(input.senderUserId);
  if (!sender.ok) return sender;

  const customerId = validateSenderUserId(input.customerUserId);
  if (!customerId.ok) {
    return { ok: false, error: "Customer id is required.", status: 400 };
  }

  const key = validateIdempotencyKey(input.idempotencyKey);
  if (!key.ok) return key;

  const body = validateMessageBody(input.body);
  if (!body.ok) return body;

  if (sender.senderUserId !== customerId.senderUserId) {
    return {
      ok: false,
      error: "Customer message sender must match the owning customer id.",
      status: 400,
    };
  }

  let envelope = await getOrInitializeProjectCommunication(campaign.campaignId);
  if (envelope.campaignId !== campaign.campaignId) {
    return { ok: false, error: "Campaign identity mismatch.", status: 500 };
  }

  const existing = findByIdempotency(envelope, sender.senderUserId, key.idempotencyKey);
  if (existing) {
    if (existing.body !== body.body || existing.senderRole !== "customer") {
      return {
        ok: false,
        error: "Idempotency key already used with a different payload.",
        status: 409,
      };
    }
    return { ok: true, message: existing, envelope, replayed: true };
  }

  const createdAt = nowIso();
  const message: ProjectCommunicationMessage = {
    id: randomUUID(),
    campaignId: campaign.campaignId,
    customerUserId: customerId.senderUserId,
    senderRole: "customer",
    senderUserId: sender.senderUserId,
    senderDisplayName: input.senderDisplayName?.trim() || undefined,
    body: body.body,
    createdAt,
    status: "accepted",
    visibility: "customer_visible",
    replyToMessageId: null,
    idempotencyKey: key.idempotencyKey,
    creationChannel: "customer_board_form",
    sourceContext: "project_communication",
  };

  envelope = {
    ...envelope,
    messages: [...envelope.messages, message],
    updatedAt: createdAt,
    version: envelope.version + 1,
  };

  const written = await writeProjectCommunicationEnvelope(envelope);
  return { ok: true, message, envelope: written, replayed: false };
}

/**
 * Persist a Studio staff reply to a customer message.
 * Requires a real staff actor id — never Voice, Host, or AI attribution.
 */
export async function createStudioProjectReply(
  input: CreateStudioReplyInput,
): Promise<ProjectCommunicationActionResult> {
  const campaign = validateCampaignId(input.campaignId);
  if (!campaign.ok) return campaign;

  const staff = validateSenderUserId(input.staffUserId);
  if (!staff.ok) return staff;

  const customerId = validateSenderUserId(input.customerUserId);
  if (!customerId.ok) {
    return { ok: false, error: "Customer id is required.", status: 400 };
  }

  const key = validateIdempotencyKey(input.idempotencyKey);
  if (!key.ok) return key;

  const body = validateMessageBody(input.body);
  if (!body.ok) return body;

  const replyTo = input.replyToMessageId.trim();
  if (!replyTo) {
    return { ok: false, error: "Reply target message id is required.", status: 400 };
  }

  let envelope = await getOrInitializeProjectCommunication(campaign.campaignId);
  const targetCustomerMessage = findMessageById(envelope, replyTo);
  if (!targetCustomerMessage) {
    return { ok: false, error: "Reply target message was not found.", status: 404 };
  }
  if (targetCustomerMessage.campaignId !== campaign.campaignId) {
    return { ok: false, error: "Reply target belongs to a different project.", status: 400 };
  }
  if (targetCustomerMessage.senderRole !== "customer") {
    return {
      ok: false,
      error: "Studio replies must target a customer message.",
      status: 400,
    };
  }

  const existing = findByIdempotency(envelope, staff.senderUserId, key.idempotencyKey);
  if (existing) {
    if (
      existing.body !== body.body ||
      existing.senderRole !== "studio_staff" ||
      existing.replyToMessageId !== replyTo
    ) {
      return {
        ok: false,
        error: "Idempotency key already used with a different payload.",
        status: 409,
      };
    }
    return { ok: true, message: existing, envelope, replayed: true };
  }

  const createdAt = nowIso();
  const message: ProjectCommunicationMessage = {
    id: randomUUID(),
    campaignId: campaign.campaignId,
    customerUserId: customerId.senderUserId,
    senderRole: "studio_staff",
    senderUserId: staff.senderUserId,
    senderDisplayName: input.staffDisplayName?.trim() || undefined,
    body: body.body,
    createdAt,
    status: "accepted",
    visibility: "customer_visible",
    replyToMessageId: replyTo,
    idempotencyKey: key.idempotencyKey,
    creationChannel: "studio_staff_reply",
    sourceContext: "project_communication",
  };

  envelope = {
    ...envelope,
    messages: [...envelope.messages, message],
    updatedAt: createdAt,
    version: envelope.version + 1,
  };

  const written = await writeProjectCommunicationEnvelope(envelope);
  return { ok: true, message, envelope: written, replayed: false };
}

export async function listProjectCommunicationForCustomer(
  campaignId: string,
): Promise<
  | { ok: true; messages: ProjectCommunicationMessage[]; envelope: ProjectCommunicationEnvelope }
  | { ok: false; error: string; status: number }
> {
  const campaign = validateCampaignId(campaignId);
  if (!campaign.ok) return campaign;

  const envelope =
    (await readProjectCommunicationEnvelope(campaign.campaignId)) ??
    ({
      campaignId: campaign.campaignId,
      messages: [],
      updatedAt: nowIso(),
      version: 0,
    } satisfies ProjectCommunicationEnvelope);

  if (envelope.campaignId !== campaign.campaignId) {
    return { ok: false, error: "Campaign identity mismatch.", status: 500 };
  }

  return {
    ok: true,
    messages: listCustomerVisibleMessages(envelope.messages),
    envelope,
  };
}

export async function listProjectCommunicationForStaff(
  campaignId: string,
): Promise<
  | { ok: true; messages: ProjectCommunicationMessage[]; envelope: ProjectCommunicationEnvelope }
  | { ok: false; error: string; status: number }
> {
  const campaign = validateCampaignId(campaignId);
  if (!campaign.ok) return campaign;

  const envelope =
    (await readProjectCommunicationEnvelope(campaign.campaignId)) ??
    ({
      campaignId: campaign.campaignId,
      messages: [],
      updatedAt: nowIso(),
      version: 0,
    } satisfies ProjectCommunicationEnvelope);

  return {
    ok: true,
    messages: listStaffVisibleProjectCommunication(envelope.messages),
    envelope,
  };
}

export {
  hasStudioReply,
  listCustomerVisibleMessages,
  listStaffVisibleProjectCommunication,
  validateMessageBody,
  validateCampaignId,
};
