/**
 * Route handler lives under src/app/api; Vitest includes src/lib/**.
 */
import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import type { StudioUser } from "@/lib/campaign-store/types";
import {
  createCustomerProjectMessage,
  createStudioProjectReply,
} from "@/lib/project-communication/actions";

const requireSession = vi.fn();
const readCampaignEnvelope = vi.fn();

vi.mock("@/lib/auth/require-session", () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
  isNextResponse: (value: unknown) => value instanceof NextResponse,
}));
vi.mock("@/lib/campaign-store/store", () => ({
  readCampaignEnvelope: (...args: unknown[]) => readCampaignEnvelope(...args),
}));

async function importRoute() {
  return import(
    "@/app/api/campaigns/[campaignId]/project-communication/acknowledgment/route"
  );
}

const NOW = "2026-07-27T21:00:00.000Z";
const CAMPAIGN_ID = "comm5-route-campaign";
const COMM_DIR = path.join(process.cwd(), "data", "project-communication");
const ACK_DIR = path.join(process.cwd(), "data", "project-communication-ack");

const client: StudioUser = {
  id: "client-a",
  email: "client-a@local.dev",
  displayName: "Client A",
  roles: ["client"],
  currentCampaignId: CAMPAIGN_ID,
  clientCampaignIds: [CAMPAIGN_ID],
};

const other: StudioUser = {
  id: "client-b",
  email: "client-b@local.dev",
  displayName: "Client B",
  roles: ["client"],
  currentCampaignId: "other",
  clientCampaignIds: ["other"],
};

const campaignEnvelope = {
  campaignId: CAMPAIGN_ID,
  clientUserId: "client-a",
  record: {
    campaignId: CAMPAIGN_ID,
    campaignName: "COMM-5",
    campaignStatus: "BUILDING_CONCEPTS" as const,
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "",
    createdAt: NOW,
    updatedAt: NOW,
  },
  syncedAt: NOW,
  syncVersion: 1,
};

function context() {
  return { params: Promise.resolve({ campaignId: CAMPAIGN_ID }) };
}

function getRequest() {
  return new Request(
    `http://localhost/api/campaigns/${CAMPAIGN_ID}/project-communication/acknowledgment`,
    { method: "GET", headers: { accept: "application/json" } },
  );
}

function postRequest(body: Record<string, unknown>) {
  return new Request(
    `http://localhost/api/campaigns/${CAMPAIGN_ID}/project-communication/acknowledgment`,
    {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("project-communication acknowledgment route", () => {
  beforeEach(() => {
    requireSession.mockReset();
    readCampaignEnvelope.mockReset();
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);
  });

  afterEach(async () => {
    await fs.rm(path.join(COMM_DIR, `${CAMPAIGN_ID}.json`), { force: true });
    const files = await fs.readdir(ACK_DIR).catch(() => [] as string[]);
    await Promise.all(
      files
        .filter((name) => name.startsWith(`${CAMPAIGN_ID}__`))
        .map((name) => fs.rm(path.join(ACK_DIR, name), { force: true })),
    );
  });

  it("rejects unauthenticated and cross-customer access", async () => {
    const { GET, POST } = await importRoute();
    requireSession.mockResolvedValue(
      NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    );
    expect((await GET(getRequest(), context())).status).toBe(401);

    requireSession.mockResolvedValue(other);
    expect((await GET(getRequest(), context())).status).toBe(403);
    expect(
      (
        await POST(
          postRequest({
            action: "acknowledge_studio_reply",
            studioReplyMessageId: "x",
          }),
          context(),
        )
      ).status,
    ).toBe(403);
  });

  it("returns notification state and acknowledges with session identity", async () => {
    const seeded = await createCustomerProjectMessage({
      campaignId: CAMPAIGN_ID,
      customerUserId: "client-a",
      senderUserId: "client-a",
      body: "Question",
      idempotencyKey: "q1",
    });
    expect(seeded.ok).toBe(true);
    if (!seeded.ok) return;
    const reply = await createStudioProjectReply({
      campaignId: CAMPAIGN_ID,
      customerUserId: "client-a",
      staffUserId: "tagia",
      body: "Answer",
      replyToMessageId: seeded.message.id,
      idempotencyKey: "r1",
    });
    expect(reply.ok).toBe(true);
    if (!reply.ok) return;

    requireSession.mockResolvedValue(client);
    const { GET, POST } = await importRoute();

    const listed = await GET(getRequest(), context());
    expect(listed.status).toBe(200);
    const listJson = (await listed.json()) as {
      notification: { hasNewStudioReply: boolean; newestStudioReplyId: string | null };
    };
    expect(listJson.notification.hasNewStudioReply).toBe(true);
    expect(JSON.stringify(listJson).toLowerCase()).not.toMatch(
      /unread|delivered|seen|email sent|live chat|read receipt/,
    );

    const ack = await POST(
      postRequest({
        action: "acknowledge_studio_reply",
        studioReplyMessageId: reply.message.id,
        customerUserId: "attacker",
      }),
      context(),
    );
    expect(ack.status).toBe(200);
    const ackJson = (await ack.json()) as {
      notification: { hasNewStudioReply: boolean };
      replayed: boolean;
    };
    expect(ackJson.notification.hasNewStudioReply).toBe(false);
    expect(ackJson.replayed).toBe(false);

    const replay = await POST(
      postRequest({
        action: "acknowledge_studio_reply",
        studioReplyMessageId: reply.message.id,
      }),
      context(),
    );
    expect(replay.status).toBe(200);
    const replayJson = (await replay.json()) as { replayed: boolean };
    expect(replayJson.replayed).toBe(true);
  });
});
