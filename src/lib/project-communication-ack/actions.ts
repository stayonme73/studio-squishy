import { listProjectCommunicationForCustomer } from "@/lib/project-communication/actions";
import type { ProjectCommunicationMessage } from "@/lib/project-communication/types";

import { deriveStudioReplyNotificationState, findNewestStudioStaffReply } from "./derive";
import {
  emptyProjectCommunicationAckEnvelope,
  getOrInitializeProjectCommunicationAck,
  readProjectCommunicationAckEnvelope,
  writeProjectCommunicationAckEnvelope,
} from "./store";
import type {
  ProjectCommunicationAckChannel,
  ProjectCommunicationAckEnvelope,
  StudioReplyNotificationState,
} from "./types";

function validateIds(campaignId: string, customerUserId: string): string | null {
  if (!campaignId.trim()) return "Campaign id is required.";
  if (!customerUserId.trim()) return "Customer id is required.";
  return null;
}

export type AcknowledgeStudioReplyInput = {
  campaignId: string;
  customerUserId: string;
  studioReplyMessageId: string;
  channel: ProjectCommunicationAckChannel;
};

export type AcknowledgeStudioReplyResult =
  | {
      ok: true;
      envelope: ProjectCommunicationAckEnvelope;
      notification: StudioReplyNotificationState;
      replayed: boolean;
    }
  | { ok: false; error: string; status: number };

export async function getStudioReplyNotificationState(
  campaignId: string,
  customerUserId: string,
): Promise<
  | { ok: true; notification: StudioReplyNotificationState; messages: ProjectCommunicationMessage[] }
  | { ok: false; error: string; status: number }
> {
  const invalid = validateIds(campaignId, customerUserId);
  if (invalid) return { ok: false, error: invalid, status: 400 };

  const listed = await listProjectCommunicationForCustomer(campaignId.trim());
  if (!listed.ok) return listed;

  const ack = await readProjectCommunicationAckEnvelope(
    campaignId.trim(),
    customerUserId.trim(),
  );
  return {
    ok: true,
    notification: deriveStudioReplyNotificationState(listed.messages, ack),
    messages: listed.messages,
  };
}

/**
 * Persist that the customer intentionally entered project messages for this Studio reply.
 * Does not claim the reply was read.
 */
export async function acknowledgeStudioReply(
  input: AcknowledgeStudioReplyInput,
): Promise<AcknowledgeStudioReplyResult> {
  const invalid = validateIds(input.campaignId, input.customerUserId);
  if (invalid) return { ok: false, error: invalid, status: 400 };

  const studioReplyMessageId = input.studioReplyMessageId.trim();
  if (!studioReplyMessageId) {
    return { ok: false, error: "studioReplyMessageId is required.", status: 400 };
  }

  const listed = await listProjectCommunicationForCustomer(input.campaignId.trim());
  if (!listed.ok) return listed;

  const target = listed.messages.find((message) => message.id === studioReplyMessageId);
  if (!target) {
    return { ok: false, error: "Studio reply was not found.", status: 404 };
  }
  if (target.campaignId !== input.campaignId.trim()) {
    return { ok: false, error: "Reply belongs to a different project.", status: 400 };
  }
  if (target.senderRole !== "studio_staff") {
    return {
      ok: false,
      error: "Only a Studio reply can be acknowledged.",
      status: 400,
    };
  }

  const newest = findNewestStudioStaffReply(listed.messages);
  if (!newest || newest.id !== target.id) {
    return {
      ok: false,
      error: "Acknowledge the newest Studio reply for this project.",
      status: 409,
    };
  }

  let envelope = await getOrInitializeProjectCommunicationAck(
    input.campaignId.trim(),
    input.customerUserId.trim(),
  );

  if (envelope.lastAcknowledgedStudioReplyId === target.id) {
    return {
      ok: true,
      envelope,
      notification: deriveStudioReplyNotificationState(listed.messages, envelope),
      replayed: true,
    };
  }

  const now = new Date().toISOString();
  envelope = {
    ...envelope,
    lastAcknowledgedStudioReplyId: target.id,
    lastAcknowledgedStudioReplyCreatedAt: target.createdAt,
    acknowledgedAt: now,
    channel: input.channel,
    updatedAt: now,
  };

  const written = await writeProjectCommunicationAckEnvelope(envelope);
  return {
    ok: true,
    envelope: written,
    notification: deriveStudioReplyNotificationState(listed.messages, written),
    replayed: false,
  };
}

export {
  deriveStudioReplyNotificationState,
  findNewestStudioStaffReply,
  emptyProjectCommunicationAckEnvelope,
  readProjectCommunicationAckEnvelope,
  writeProjectCommunicationAckEnvelope,
};
