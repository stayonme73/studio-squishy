/**
 * Route handler lives under src/app/api; Vitest includes src/lib/**, so this
 * file imports the route dynamically (same pattern as refund-request-route.test.ts).
 */
import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import type { StudioUser } from "@/lib/campaign-store/types";
import { createCustomerProjectMessage } from "@/lib/project-communication/actions";

const requireSession = vi.fn();
const readCampaignEnvelope = vi.fn();
const readCampaignAssignments = vi.fn();

vi.mock("@/lib/auth/require-session", () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
  isNextResponse: (value: unknown) => value instanceof NextResponse,
}));
vi.mock("@/lib/campaign-store/store", () => ({
  readCampaignEnvelope: (...args: unknown[]) => readCampaignEnvelope(...args),
}));
vi.mock("@/lib/file-room/assignments", () => ({
  readCampaignAssignments: (...args: unknown[]) => readCampaignAssignments(...args),
}));

async function importRoute() {
  return import("@/app/api/campaigns/[campaignId]/project-communication/route");
}

const NOW = "2026-07-27T18:00:00.000Z";
const CAMPAIGN_ID = "comm3-route-campaign";
const COMM_DIR = path.join(process.cwd(), "data", "project-communication");

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@studio.local",
  displayName: "Owner Tagia",
  roles: ["owner"],
};

const client: StudioUser = {
  id: "client-1",
  email: "client@example.com",
  displayName: "Client",
  roles: ["client"],
  currentCampaignId: CAMPAIGN_ID,
  clientCampaignIds: [CAMPAIGN_ID],
};

const campaignEnvelope = {
  campaignId: CAMPAIGN_ID,
  clientUserId: "client-1",
  record: {
    campaignId: CAMPAIGN_ID,
    campaignName: "Route Campaign",
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

const assignments = {
  staffByUserId: {},
};

function context() {
  return { params: Promise.resolve({ campaignId: CAMPAIGN_ID }) };
}

function getRequest() {
  return new Request(`http://localhost/api/campaigns/${CAMPAIGN_ID}/project-communication`, {
    method: "GET",
    headers: { accept: "application/json" },
  });
}

function postRequest(body: Record<string, unknown>) {
  return new Request(`http://localhost/api/campaigns/${CAMPAIGN_ID}/project-communication`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
}

describe("project-communication staff route", () => {
  beforeEach(() => {
    requireSession.mockReset();
    readCampaignEnvelope.mockReset();
    readCampaignAssignments.mockReset();
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);
    readCampaignAssignments.mockResolvedValue(assignments);
  });

  afterEach(async () => {
    await fs.rm(path.join(COMM_DIR, `${CAMPAIGN_ID}.json`), { force: true });
  });

  it("rejects unauthenticated and client access", async () => {
    const { GET, POST } = await importRoute();

    requireSession.mockResolvedValue(NextResponse.json({ error: "Authentication required" }, { status: 401 }));
    const unauth = await GET(getRequest(), context());
    expect(unauth.status).toBe(401);

    requireSession.mockResolvedValue(client);
    const deniedGet = await GET(getRequest(), context());
    expect(deniedGet.status).toBe(403);

    const deniedPost = await POST(
      postRequest({
        action: "studio_reply",
        body: "Nope",
        replyToMessageId: "x",
        idempotencyKey: "k",
      }),
      context(),
    );
    expect(deniedPost.status).toBe(403);
  });

  it("lists messages and accepts a session-derived staff reply", async () => {
    const seeded = await createCustomerProjectMessage({
      campaignId: CAMPAIGN_ID,
      customerUserId: "client-1",
      senderUserId: "client-1",
      body: "Need an update on review timing.",
      idempotencyKey: "cust-seed-1",
    });
    expect(seeded.ok).toBe(true);
    if (!seeded.ok) return;

    requireSession.mockResolvedValue(owner);
    const { GET, POST } = await importRoute();

    const listed = await GET(getRequest(), context());
    expect(listed.status).toBe(200);
    const listJson = (await listed.json()) as {
      messages: Array<{ id: string; studioHasReplied: boolean; senderRole: string }>;
      clientUserId: string | null;
      campaignName: string;
    };
    expect(listJson.clientUserId).toBe("client-1");
    expect(listJson.campaignName).toContain("Route");
    expect(listJson.messages).toHaveLength(1);
    expect(listJson.messages[0]?.studioHasReplied).toBe(false);

    const reply = await POST(
      postRequest({
        action: "studio_reply",
        body: "Review opens after materials are complete.",
        replyToMessageId: seeded.message.id,
        idempotencyKey: "staff-reply-1",
        staffUserId: "spoofed-attacker",
      }),
      context(),
    );
    expect(reply.status).toBe(200);
    const replyJson = (await reply.json()) as {
      message: { senderUserId: string; senderRole: string };
      confirmation: string;
      messages: Array<{ studioHasReplied: boolean; senderRole: string }>;
      replayed: boolean;
    };
    expect(replyJson.message.senderUserId).toBe("owner-1");
    expect(replyJson.message.senderRole).toBe("studio_staff");
    expect(replyJson.confirmation).toBe("Reply saved to the project communication record.");
    expect(replyJson.replayed).toBe(false);
    expect(
      replyJson.messages.find((m) => m.senderRole === "customer")?.studioHasReplied,
    ).toBe(true);

    const replay = await POST(
      postRequest({
        action: "studio_reply",
        body: "Review opens after materials are complete.",
        replyToMessageId: seeded.message.id,
        idempotencyKey: "staff-reply-1",
      }),
      context(),
    );
    expect(replay.status).toBe(200);
    const replayJson = (await replay.json()) as { replayed: boolean; messages: unknown[] };
    expect(replayJson.replayed).toBe(true);
    expect(replayJson.messages).toHaveLength(2);

    const conflict = await POST(
      postRequest({
        action: "studio_reply",
        body: "Different body",
        replyToMessageId: seeded.message.id,
        idempotencyKey: "staff-reply-1",
      }),
      context(),
    );
    expect(conflict.status).toBe(409);
  });

  it("rejects empty body and spoofed delivery claims are absent", async () => {
    const seeded = await createCustomerProjectMessage({
      campaignId: CAMPAIGN_ID,
      customerUserId: "client-1",
      senderUserId: "client-1",
      body: "Hello",
      idempotencyKey: "cust-seed-2",
    });
    expect(seeded.ok).toBe(true);
    if (!seeded.ok) return;

    requireSession.mockResolvedValue(owner);
    const { POST } = await importRoute();
    const empty = await POST(
      postRequest({
        action: "studio_reply",
        body: "   ",
        replyToMessageId: seeded.message.id,
        idempotencyKey: "empty-reply",
      }),
      context(),
    );
    expect(empty.status).toBe(400);
    const json = (await empty.json()) as { error: string; delivered?: boolean };
    expect(json).not.toHaveProperty("delivered");
    expect(json).not.toHaveProperty("emailed");
    expect(JSON.stringify(json).toLowerCase()).not.toMatch(/delivered|notified|seen|email/);
  });
});
