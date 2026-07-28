import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import {
  createCustomerProjectMessage,
  createStudioProjectReply,
} from "@/lib/project-communication/actions";

import {
  acknowledgeStudioReply,
  deriveStudioReplyNotificationState,
  findNewestStudioStaffReply,
  getStudioReplyNotificationState,
} from "./actions";
import { emptyProjectCommunicationAckEnvelope } from "./store";

const CAMPAIGN_A = "comm5-ack-campaign-a";
const CAMPAIGN_B = "comm5-ack-campaign-b";
const COMM_DIR = path.join(process.cwd(), "data", "project-communication");
const ACK_DIR = path.join(process.cwd(), "data", "project-communication-ack");

async function cleanup(campaignId: string) {
  await fs.rm(path.join(COMM_DIR, `${campaignId}.json`), { force: true });
  const files = await fs.readdir(ACK_DIR).catch(() => [] as string[]);
  await Promise.all(
    files
      .filter((name) => name.startsWith(`${campaignId}__`))
      .map((name) => fs.rm(path.join(ACK_DIR, name), { force: true })),
  );
}

afterEach(async () => {
  await cleanup(CAMPAIGN_A);
  await cleanup(CAMPAIGN_B);
});

describe("studio reply notification derivation", () => {
  it("shows no indicator without a Studio reply", async () => {
    await createCustomerProjectMessage({
      campaignId: CAMPAIGN_A,
      customerUserId: "client-a",
      senderUserId: "client-a",
      body: "Customer only",
      idempotencyKey: "cust-only",
    });
    const state = await getStudioReplyNotificationState(CAMPAIGN_A, "client-a");
    expect(state.ok).toBe(true);
    if (!state.ok) return;
    expect(state.notification.hasNewStudioReply).toBe(false);
    expect(findNewestStudioStaffReply(state.messages)).toBeNull();
  });

  it("shows indicator for a Studio reply and clears after acknowledgment", async () => {
    const customer = await createCustomerProjectMessage({
      campaignId: CAMPAIGN_A,
      customerUserId: "client-a",
      senderUserId: "client-a",
      body: "Need help",
      idempotencyKey: "need-help",
    });
    expect(customer.ok).toBe(true);
    if (!customer.ok) return;

    const reply = await createStudioProjectReply({
      campaignId: CAMPAIGN_A,
      customerUserId: "client-a",
      staffUserId: "tagia",
      body: "Studio first reply",
      replyToMessageId: customer.message.id,
      idempotencyKey: "studio-1",
    });
    expect(reply.ok).toBe(true);
    if (!reply.ok) return;

    const before = await getStudioReplyNotificationState(CAMPAIGN_A, "client-a");
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(before.notification.hasNewStudioReply).toBe(true);
    expect(before.notification.newestStudioReplyId).toBe(reply.message.id);

    const ack = await acknowledgeStudioReply({
      campaignId: CAMPAIGN_A,
      customerUserId: "client-a",
      studioReplyMessageId: reply.message.id,
      channel: "customer_board_view_messages",
    });
    expect(ack.ok).toBe(true);
    if (!ack.ok) return;
    expect(ack.notification.hasNewStudioReply).toBe(false);

    const afterReload = await getStudioReplyNotificationState(CAMPAIGN_A, "client-a");
    expect(afterReload.ok).toBe(true);
    if (!afterReload.ok) return;
    expect(afterReload.notification.hasNewStudioReply).toBe(false);

    const second = await createStudioProjectReply({
      campaignId: CAMPAIGN_A,
      customerUserId: "client-a",
      staffUserId: "tagia",
      body: "Studio second reply",
      replyToMessageId: customer.message.id,
      idempotencyKey: "studio-2",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const again = await getStudioReplyNotificationState(CAMPAIGN_A, "client-a");
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.notification.hasNewStudioReply).toBe(true);
    expect(again.notification.newestStudioReplyId).toBe(second.message.id);
  });

  it("rejects acknowledging a customer message or nonexistent id", async () => {
    const customer = await createCustomerProjectMessage({
      campaignId: CAMPAIGN_A,
      customerUserId: "client-a",
      senderUserId: "client-a",
      body: "Hello",
      idempotencyKey: "hello",
    });
    expect(customer.ok).toBe(true);
    if (!customer.ok) return;

    const asCustomer = await acknowledgeStudioReply({
      campaignId: CAMPAIGN_A,
      customerUserId: "client-a",
      studioReplyMessageId: customer.message.id,
      channel: "customer_board_view_messages",
    });
    expect(asCustomer.ok).toBe(false);
    if (asCustomer.ok) return;
    expect(asCustomer.status).toBe(400);

    const missing = await acknowledgeStudioReply({
      campaignId: CAMPAIGN_A,
      customerUserId: "client-a",
      studioReplyMessageId: "does-not-exist",
      channel: "customer_board_view_messages",
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.status).toBe(404);
  });

  it("keeps acknowledgment campaign-scoped", async () => {
    const aCust = await createCustomerProjectMessage({
      campaignId: CAMPAIGN_A,
      customerUserId: "client-a",
      senderUserId: "client-a",
      body: "A question",
      idempotencyKey: "a-q",
    });
    const bCust = await createCustomerProjectMessage({
      campaignId: CAMPAIGN_B,
      customerUserId: "client-a",
      senderUserId: "client-a",
      body: "B question",
      idempotencyKey: "b-q",
    });
    expect(aCust.ok && bCust.ok).toBe(true);
    if (!aCust.ok || !bCust.ok) return;

    const aReply = await createStudioProjectReply({
      campaignId: CAMPAIGN_A,
      customerUserId: "client-a",
      staffUserId: "tagia",
      body: "A reply",
      replyToMessageId: aCust.message.id,
      idempotencyKey: "a-r",
    });
    const bReply = await createStudioProjectReply({
      campaignId: CAMPAIGN_B,
      customerUserId: "client-a",
      staffUserId: "tagia",
      body: "B reply",
      replyToMessageId: bCust.message.id,
      idempotencyKey: "b-r",
    });
    expect(aReply.ok && bReply.ok).toBe(true);
    if (!aReply.ok || !bReply.ok) return;

    await acknowledgeStudioReply({
      campaignId: CAMPAIGN_A,
      customerUserId: "client-a",
      studioReplyMessageId: aReply.message.id,
      channel: "customer_board_view_messages",
    });

    const aState = await getStudioReplyNotificationState(CAMPAIGN_A, "client-a");
    const bState = await getStudioReplyNotificationState(CAMPAIGN_B, "client-a");
    expect(aState.ok && bState.ok).toBe(true);
    if (!aState.ok || !bState.ok) return;
    expect(aState.notification.hasNewStudioReply).toBe(false);
    expect(bState.notification.hasNewStudioReply).toBe(true);

    const cross = await acknowledgeStudioReply({
      campaignId: CAMPAIGN_A,
      customerUserId: "client-a",
      studioReplyMessageId: bReply.message.id,
      channel: "customer_board_view_messages",
    });
    expect(cross.ok).toBe(false);
  });

  it("does not treat an empty ack as clearing a real Studio reply", () => {
    const messages = [
      {
        id: "s1",
        campaignId: CAMPAIGN_A,
        customerUserId: "client-a",
        senderRole: "studio_staff" as const,
        senderUserId: "tagia",
        body: "Hi",
        createdAt: "2026-07-27T21:00:00.000Z",
        status: "accepted" as const,
        visibility: "customer_visible" as const,
        replyToMessageId: "c1",
        idempotencyKey: "k",
        creationChannel: "studio_staff_reply" as const,
        sourceContext: "project_communication" as const,
      },
    ];
    const state = deriveStudioReplyNotificationState(
      messages,
      emptyProjectCommunicationAckEnvelope(CAMPAIGN_A, "client-a"),
    );
    expect(state.hasNewStudioReply).toBe(true);
  });
});
