import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import type { JobInternalNote } from "@/lib/job-control/types";

import {
  createCustomerProjectMessage,
  createStudioProjectReply,
  hasStudioReply,
  listProjectCommunicationForCustomer,
  PROJECT_COMMUNICATION_BODY_MAX_LENGTH,
  PROJECT_COMMUNICATION_COPY,
  readProjectCommunicationEnvelope,
} from "./index";

const COMM_DIR = path.join(process.cwd(), "data", "project-communication");

async function removeCampaignFiles(...campaignIds: string[]): Promise<void> {
  await Promise.all(
    campaignIds.map((campaignId) =>
      fs.rm(path.join(COMM_DIR, `${campaignId}.json`), { force: true }),
    ),
  );
}

describe("COMM-2 project communication data contract", () => {
  const campaignA = "comm2-camp-a";
  const campaignB = "comm2-camp-b";

  afterEach(async () => {
    await removeCampaignFiles(campaignA, campaignB, "comm2-restart", "comm2-empty");
  });

  it("creates a customer message with accepted status and real customer attribution", async () => {
    const result = await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      senderDisplayName: "Ada",
      body: "  Need a deadline update.  ",
      idempotencyKey: "cust-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.replayed).toBe(false);
    expect(result.message.body).toBe("Need a deadline update.");
    expect(result.message.status).toBe("accepted");
    expect(result.message.senderRole).toBe("customer");
    expect(result.message.senderUserId).toBe("customer-1");
    expect(result.message.customerUserId).toBe("customer-1");
    expect(result.message.replyToMessageId).toBeNull();
    expect(result.message.visibility).toBe("customer_visible");
    expect(result.message.creationChannel).toBe("customer_board_form");
    expect(result.message.sourceContext).toBe("project_communication");
    expect(result.message).not.toHaveProperty("attachments");
    expect(result.message.senderRole === "customer" || result.message.senderRole === "studio_staff").toBe(
      true,
    );
    expect(["host", "voice", "ai", "ai_staff"]).not.toContain(result.message.senderRole);
  });

  it("creates a studio staff reply with real staff attribution", async () => {
    const customer = await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      body: "Question about review timing.",
      idempotencyKey: "cust-reply-parent",
    });
    expect(customer.ok).toBe(true);
    if (!customer.ok) return;

    const reply = await createStudioProjectReply({
      campaignId: campaignA,
      customerUserId: "customer-1",
      staffUserId: "staff-9",
      staffDisplayName: "Tagia",
      body: "We will post when review opens.",
      replyToMessageId: customer.message.id,
      idempotencyKey: "staff-1",
    });

    expect(reply.ok).toBe(true);
    if (!reply.ok) return;
    expect(reply.message.senderRole).toBe("studio_staff");
    expect(reply.message.senderUserId).toBe("staff-9");
    expect(reply.message.replyToMessageId).toBe(customer.message.id);
    expect(reply.message.creationChannel).toBe("studio_staff_reply");
    expect(hasStudioReply(reply.envelope.messages, customer.message.id)).toBe(true);
  });

  it("rejects empty or whitespace-only bodies", async () => {
    const empty = await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      body: "   ",
      idempotencyKey: "empty",
    });
    expect(empty.ok).toBe(false);
    if (empty.ok) return;
    expect(empty.status).toBe(400);
  });

  it("rejects over-limit bodies", async () => {
    const over = await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      body: "x".repeat(PROJECT_COMMUNICATION_BODY_MAX_LENGTH + 1),
      idempotencyKey: "over",
    });
    expect(over.ok).toBe(false);
    if (over.ok) return;
    expect(over.status).toBe(400);
  });

  it("rejects invalid campaign identifiers", async () => {
    const invalid = await createCustomerProjectMessage({
      campaignId: "  ",
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      body: "Hello",
      idempotencyKey: "bad-camp",
    });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.status).toBe(400);
  });

  it("keeps campaign streams isolated", async () => {
    await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-a",
      senderUserId: "customer-a",
      body: "Message for A",
      idempotencyKey: "a-1",
    });
    await createCustomerProjectMessage({
      campaignId: campaignB,
      customerUserId: "customer-b",
      senderUserId: "customer-b",
      body: "Message for B",
      idempotencyKey: "b-1",
    });

    const listA = await listProjectCommunicationForCustomer(campaignA);
    const listB = await listProjectCommunicationForCustomer(campaignB);
    expect(listA.ok && listB.ok).toBe(true);
    if (!listA.ok || !listB.ok) return;

    expect(listA.messages).toHaveLength(1);
    expect(listB.messages).toHaveLength(1);
    expect(listA.messages[0]?.campaignId).toBe(campaignA);
    expect(listB.messages[0]?.campaignId).toBe(campaignB);
    expect(listA.messages.some((m) => m.body.includes("B"))).toBe(false);
    expect(listB.messages.some((m) => m.body.includes("A"))).toBe(false);
  });

  it("customer-visible retrieval never includes internal note shapes", async () => {
    await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      body: "Visible only",
      idempotencyKey: "vis-1",
    });

    const listed = await listProjectCommunicationForCustomer(campaignA);
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;

    const smuggled: JobInternalNote = {
      id: "note-1",
      content: "Secret staff note",
      createdAt: new Date().toISOString(),
      author: { role: "owner", userId: "owner-1" },
    };

    for (const message of listed.messages) {
      expect(message.visibility).toBe("customer_visible");
      expect(message).not.toMatchObject({ content: smuggled.content });
      expect("author" in message).toBe(false);
    }
  });

  it("returns messages in deterministic ascending order", async () => {
    const first = await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      body: "First",
      idempotencyKey: "order-1",
    });
    const second = await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      body: "Second",
      idempotencyKey: "order-2",
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    const listed = await listProjectCommunicationForCustomer(campaignA);
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.messages.map((m) => m.body)).toEqual(["First", "Second"]);
  });

  it("replays the same idempotency key without duplicating", async () => {
    const first = await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      body: "Same payload",
      idempotencyKey: "idem-same",
    });
    const second = await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      body: "Same payload",
      idempotencyKey: "idem-same",
    });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.replayed).toBe(true);
    expect(second.message.id).toBe(first.message.id);
    expect(second.envelope.messages).toHaveLength(1);
  });

  it("rejects conflicting idempotency replay", async () => {
    const first = await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      body: "Original",
      idempotencyKey: "idem-conflict",
    });
    expect(first.ok).toBe(true);

    const conflict = await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      body: "Different",
      idempotencyKey: "idem-conflict",
    });
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.status).toBe(409);
  });

  it("survives persistence restart via fresh disk read", async () => {
    const created = await createCustomerProjectMessage({
      campaignId: "comm2-restart",
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      body: "Durable across restart",
      idempotencyKey: "restart-1",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const reread = await readProjectCommunicationEnvelope("comm2-restart");
    expect(reread?.messages).toHaveLength(1);
    expect(reread?.messages[0]?.id).toBe(created.message.id);
    expect(reread?.messages[0]?.body).toBe("Durable across restart");
  });

  it("does not use complaint, refund, intake, or host/voice attribution", async () => {
    const result = await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-1",
      senderUserId: "customer-1",
      body: "Domain check",
      idempotencyKey: "domain-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const serialized = JSON.stringify(result.message);
    expect(serialized).not.toMatch(/complaint|refund|intake|host|voice|ai_staff|ownerDecision/i);
    expect(result.message.senderRole).not.toBe("host" as never);
    expect(PROJECT_COMMUNICATION_COPY.messageSent).toBe("Message sent to The Studio.");
    expect(PROJECT_COMMUNICATION_COPY.awaitingReply).toBe("The Studio has not replied yet.");
  });

  it("rejects studio reply that targets another campaign message id", async () => {
    const foreign = await createCustomerProjectMessage({
      campaignId: campaignB,
      customerUserId: "customer-b",
      senderUserId: "customer-b",
      body: "Foreign",
      idempotencyKey: "foreign-1",
    });
    expect(foreign.ok).toBe(true);
    if (!foreign.ok) return;

    await createCustomerProjectMessage({
      campaignId: campaignA,
      customerUserId: "customer-a",
      senderUserId: "customer-a",
      body: "Local",
      idempotencyKey: "local-1",
    });

    const reply = await createStudioProjectReply({
      campaignId: campaignA,
      customerUserId: "customer-a",
      staffUserId: "staff-1",
      body: "Wrong project",
      replyToMessageId: foreign.message.id,
      idempotencyKey: "bad-reply",
    });
    expect(reply.ok).toBe(false);
    if (reply.ok) return;
    expect(reply.status).toBe(404);
  });
});
