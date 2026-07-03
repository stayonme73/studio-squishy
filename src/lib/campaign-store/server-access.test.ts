import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";

import { requireReadableCampaign } from "./server-access";
import { upsertCampaignRecord } from "./store";

const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const CAMPAIGN_A = "client-access-route-a";
const CAMPAIGN_B = "client-access-route-b";
const CAMPAIGN_C = "client-access-route-c";

function record(campaignId: string, campaignName: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName,
    campaignStatus: "READY_FOR_REVIEW",
    campaignDescription: "Private description",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    targetCompletionDate: null,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
  };
}

async function requestFor(user?: StudioUser): Promise<Request> {
  const headers = new Headers();
  if (user) {
    const token = await createSessionToken(user);
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`);
  }
  return new Request("http://localhost/api/campaigns/test", { headers });
}

describe("server campaign access", () => {
  beforeEach(async () => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret-value");
    await upsertCampaignRecord(record(CAMPAIGN_A, "Client A Private Campaign"), "client-a");
    await upsertCampaignRecord(record(CAMPAIGN_B, "Client B Private Campaign"), "client-b");
    await upsertCampaignRecord(record(CAMPAIGN_C, "Client A Second Campaign"), "client-a");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all(
      [CAMPAIGN_A, CAMPAIGN_B, CAMPAIGN_C].map((campaignId) =>
        fs.rm(path.join(CAMPAIGNS_DIR, `${campaignId}.json`), { force: true }),
      ),
    );
  });

  it("allows a client to access their own campaign", async () => {
    const response = await requireReadableCampaign(
      await requestFor({
        id: "client-a",
        email: "client-a@example.com",
        displayName: "Client A",
        roles: ["client"],
        clientCampaignIds: [CAMPAIGN_A],
      }),
      CAMPAIGN_A,
      "/api/campaigns/test",
    );

    expect(response).not.toBeInstanceOf(Response);
    if (!(response instanceof Response)) {
      expect(response.campaignEnvelope.record.campaignName).toBe("Client A Private Campaign");
    }
  });

  it("denies another client's campaign without leaking project details", async () => {
    const response = await requireReadableCampaign(
      await requestFor({
        id: "client-a",
        email: "client-a@example.com",
        displayName: "Client A",
        roles: ["client"],
        clientCampaignIds: [CAMPAIGN_A],
      }),
      CAMPAIGN_B,
      "/api/campaigns/test",
    );

    expect(response).toBeInstanceOf(Response);
    if (response instanceof Response) {
      expect(response.status).toBe(403);
      const body = await response.text();
      expect(body).toContain("Access denied");
      expect(body).not.toContain("Client B Private Campaign");
      expect(body).not.toContain("Private description");
    }
  });

  it("allows one client to access multiple owned campaigns only", async () => {
    const user: StudioUser = {
      id: "client-a",
      email: "client-a@example.com",
      displayName: "Client A",
      roles: ["client"],
      clientCampaignIds: [CAMPAIGN_A, CAMPAIGN_C],
    };

    const ownA = await requireReadableCampaign(await requestFor(user), CAMPAIGN_A, "/api/campaigns/test");
    const ownC = await requireReadableCampaign(await requestFor(user), CAMPAIGN_C, "/api/campaigns/test");
    const other = await requireReadableCampaign(await requestFor(user), CAMPAIGN_B, "/api/campaigns/test");

    expect(ownA).not.toBeInstanceOf(Response);
    expect(ownC).not.toBeInstanceOf(Response);
    expect(other).toBeInstanceOf(Response);
    if (other instanceof Response) expect(other.status).toBe(403);
  });

  it("handles unauthenticated access safely", async () => {
    const response = await requireReadableCampaign(
      await requestFor(),
      CAMPAIGN_A,
      "/api/campaigns/test",
    );

    expect(response).toBeInstanceOf(Response);
    if (response instanceof Response) expect(response.status).toBe(401);
  });
});
