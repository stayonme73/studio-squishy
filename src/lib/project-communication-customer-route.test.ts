/**
 * Route handler lives under src/app/api; Vitest includes src/lib/**, so this
 * file imports the route dynamically (same pattern as staff route test).
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
import { PROJECT_COMMUNICATION_BODY_MAX_LENGTH } from "@/lib/project-communication/types";

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
  return import("@/app/api/campaigns/[campaignId]/project-communication/customer/route");
}

const NOW = "2026-07-27T20:00:00.000Z";
const CAMPAIGN_ID = "comm4-route-campaign";
const OTHER_CAMPAIGN_ID = "comm4-other-campaign";
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
  displayName: "Client One",
  roles: ["client"],
  currentCampaignId: CAMPAIGN_ID,
  clientCampaignIds: [CAMPAIGN_ID],
};

const otherClient: StudioUser = {
  id: "client-2",
  email: "other@example.com",
  displayName: "Other Client",
  roles: ["client"],
  currentCampaignId: OTHER_CAMPAIGN_ID,
  clientCampaignIds: [OTHER_CAMPAIGN_ID],
};

const campaignEnvelope = {
  campaignId: CAMPAIGN_ID,
  clientUserId: "client-1",
  record: {
    campaignId: CAMPAIGN_ID,
    campaignName: "COMM-4 Campaign",
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

function context(campaignId = CAMPAIGN_ID) {
  return { params: Promise.resolve({ campaignId }) };
}

function getRequest(campaignId = CAMPAIGN_ID) {
  return new Request(
    `http://localhost/api/campaigns/${campaignId}/project-communication/customer`,
    {
      method: "GET",
      headers: { accept: "application/json" },
    },
  );
}

function postRequest(body: Record<string, unknown>, campaignId = CAMPAIGN_ID) {
  return new Request(
    `http://localhost/api/campaigns/${campaignId}/project-communication/customer`,
    {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("project-communication customer route", () => {
  beforeEach(() => {
    requireSession.mockReset();
    readCampaignEnvelope.mockReset();
    readCampaignEnvelope.mockResolvedValue(campaignEnvelope);
  });

  afterEach(async () => {
    await fs.rm(path.join(COMM_DIR, `${CAMPAIGN_ID}.json`), { force: true });
  });

  it("rejects unauthenticated access", async () => {
    const { GET, POST } = await importRoute();
    requireSession.mockResolvedValue(
      NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    );

    expect((await GET(getRequest(), context())).status).toBe(401);
    expect(
      (
        await POST(
          postRequest({
            action: "customer_message",
            body: "Hello",
            idempotencyKey: "u1",
          }),
          context(),
        )
      ).status,
    ).toBe(401);
  });

  it("rejects staff/owner on the customer route and cross-campaign clients", async () => {
    const { GET, POST } = await importRoute();

    requireSession.mockResolvedValue(owner);
    expect((await GET(getRequest(), context())).status).toBe(403);
    expect(
      (
        await POST(
          postRequest({
            action: "customer_message",
            body: "Staff should not post here",
            idempotencyKey: "staff-deny",
          }),
          context(),
        )
      ).status,
    ).toBe(403);

    requireSession.mockResolvedValue(otherClient);
    expect((await GET(getRequest(), context())).status).toBe(403);
    expect(
      (
        await POST(
          postRequest({
            action: "customer_message",
            body: "Cross campaign",
            idempotencyKey: "cross-deny",
          }),
          context(),
        )
      ).status,
    ).toBe(403);
  });

  it("lists and creates with session-derived customer identity", async () => {
    requireSession.mockResolvedValue(client);
    const { GET, POST } = await importRoute();

    const empty = await GET(getRequest(), context());
    expect(empty.status).toBe(200);
    const emptyJson = (await empty.json()) as { messages: unknown[] };
    expect(emptyJson.messages).toEqual([]);

    const created = await POST(
      postRequest({
        action: "customer_message",
        body: "Need clarity on the first draft.",
        idempotencyKey: "cust-1",
        customerUserId: "spoofed-attacker",
        senderUserId: "spoofed-attacker",
        senderRole: "studio_staff",
      }),
      context(),
    );
    expect(created.status).toBe(200);
    const createdJson = (await created.json()) as {
      confirmation: string;
      message: {
        senderRole: string;
        body: string;
        idempotencyKey?: string;
        senderUserId?: string;
      };
      messages: Array<{
        senderRole: string;
        body: string;
        studioHasReplied: boolean | null;
      }>;
      replayed: boolean;
    };
    expect(createdJson.confirmation).toBe("Message sent to The Studio.");
    expect(createdJson.message.senderRole).toBe("customer");
    expect(createdJson.message).not.toHaveProperty("senderUserId");
    expect(createdJson.message).not.toHaveProperty("idempotencyKey");
    expect(createdJson.replayed).toBe(false);
    expect(createdJson.messages).toHaveLength(1);
    expect(createdJson.messages[0]?.studioHasReplied).toBe(false);

    const listed = await GET(getRequest(), context());
    const listJson = (await listed.json()) as {
      messages: Array<{ senderRole: string; body: string }>;
    };
    expect(listJson.messages).toHaveLength(1);
    expect(listJson.messages[0]?.body).toBe("Need clarity on the first draft.");
    expect(JSON.stringify(listJson).toLowerCase()).not.toMatch(
      /delivered|read receipt|seen|email sent|live chat|host|voice|ai /,
    );
  });

  it("rejects whitespace, over-limit, and staff-reply action from customer route", async () => {
    requireSession.mockResolvedValue(client);
    const { POST } = await importRoute();

    const empty = await POST(
      postRequest({
        action: "customer_message",
        body: "   ",
        idempotencyKey: "ws",
      }),
      context(),
    );
    expect(empty.status).toBe(400);

    const over = await POST(
      postRequest({
        action: "customer_message",
        body: "x".repeat(PROJECT_COMMUNICATION_BODY_MAX_LENGTH + 1),
        idempotencyKey: "over",
      }),
      context(),
    );
    expect(over.status).toBe(400);

    const staffAction = await POST(
      postRequest({
        action: "studio_reply",
        body: "Pretend staff",
        replyToMessageId: "x",
        idempotencyKey: "staff-action",
      }),
      context(),
    );
    expect(staffAction.status).toBe(400);
  });

  it("supports idempotent replay and 409 conflicts", async () => {
    requireSession.mockResolvedValue(client);
    const { POST } = await importRoute();

    const first = await POST(
      postRequest({
        action: "customer_message",
        body: "Same body",
        idempotencyKey: "idem-1",
      }),
      context(),
    );
    expect(first.status).toBe(200);

    const replay = await POST(
      postRequest({
        action: "customer_message",
        body: "Same body",
        idempotencyKey: "idem-1",
      }),
      context(),
    );
    expect(replay.status).toBe(200);
    const replayJson = (await replay.json()) as { replayed: boolean; messages: unknown[] };
    expect(replayJson.replayed).toBe(true);
    expect(replayJson.messages).toHaveLength(1);

    const conflict = await POST(
      postRequest({
        action: "customer_message",
        body: "Different body",
        idempotencyKey: "idem-1",
      }),
      context(),
    );
    expect(conflict.status).toBe(409);
  });

  it("shows studio replies in the customer-visible stream without staff ids", async () => {
    const seeded = await createCustomerProjectMessage({
      campaignId: CAMPAIGN_ID,
      customerUserId: "client-1",
      senderUserId: "client-1",
      body: "Question from customer",
      idempotencyKey: "seed-q",
    });
    expect(seeded.ok).toBe(true);
    if (!seeded.ok) return;

    const reply = await createStudioProjectReply({
      campaignId: CAMPAIGN_ID,
      customerUserId: "client-1",
      staffUserId: "owner-1",
      staffDisplayName: "Owner Tagia",
      body: "Here is the Studio answer.",
      replyToMessageId: seeded.message.id,
      idempotencyKey: "seed-reply",
    });
    expect(reply.ok).toBe(true);

    requireSession.mockResolvedValue(client);
    const { GET } = await importRoute();
    const listed = await GET(getRequest(), context());
    expect(listed.status).toBe(200);
    const json = (await listed.json()) as {
      messages: Array<{
        senderRole: string;
        body: string;
        studioHasReplied: boolean | null;
        senderUserId?: string;
      }>;
    };
    expect(json.messages).toHaveLength(2);
    expect(json.messages[0]?.senderRole).toBe("customer");
    expect(json.messages[0]?.studioHasReplied).toBe(true);
    expect(json.messages[1]?.senderRole).toBe("studio_staff");
    expect(json.messages[1]?.body).toBe("Here is the Studio answer.");
    expect(json.messages.every((m) => !("senderUserId" in m))).toBe(true);
  });
});
