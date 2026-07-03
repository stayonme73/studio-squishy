import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";

import { FixtureCampaignBlockedError } from "./fixture-guard";
import {
  listCampaignEnvelopes,
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "./store";

const CAMPAIGN_ID = "store-test-campaign-id";
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const CAMPAIGN_FILE = path.join(CAMPAIGNS_DIR, `${CAMPAIGN_ID}.json`);

function mockRecord(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "Store Test Campaign",
    campaignStatus: "DISCOVERY_COMPLETE",
    campaignDescription: "Test",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "",
    discoverySubmittedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("campaign store", () => {
  beforeEach(async () => {
    vi.unstubAllEnvs();
    await fs.mkdir(CAMPAIGNS_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(CAMPAIGN_FILE, { force: true });
  });

  it("upserts one file per campaignId (idempotent)", async () => {
    const first = await upsertCampaignRecord(mockRecord(), "client-1");
    expect(first.syncVersion).toBe(1);

    const second = await upsertCampaignRecord(
      mockRecord({ campaignStatus: "PAYMENT_RECEIVED", paymentReceivedAt: new Date().toISOString() }),
      "client-1",
    );
    expect(second.syncVersion).toBe(2);
    expect(second.record.campaignStatus).toBe("PAYMENT_RECEIVED");

    const files = (await fs.readdir(CAMPAIGNS_DIR)).filter((file) => file === `${CAMPAIGN_ID}.json`);
    expect(files).toHaveLength(1);

    const listed = await listCampaignEnvelopes();
    expect(listed.some((entry) => entry.campaignId === CAMPAIGN_ID)).toBe(true);
    expect(await readCampaignEnvelope(CAMPAIGN_ID)).toMatchObject({
      campaignId: CAMPAIGN_ID,
      syncVersion: 2,
    });
  });

  it("preserves the original client owner on later upserts", async () => {
    await upsertCampaignRecord(mockRecord(), "client-1");

    const second = await upsertCampaignRecord(
      mockRecord({ campaignStatus: "PAYMENT_RECEIVED" }),
      "client-2",
    );

    expect(second.clientUserId).toBe("client-1");
    expect((await readCampaignEnvelope(CAMPAIGN_ID))?.clientUserId).toBe("client-1");
  });

  it("blocks fixture campaigns by default", async () => {
    await expect(
      upsertCampaignRecord(mockRecord({ campaignId: "test-campaign" })),
    ).rejects.toBeInstanceOf(FixtureCampaignBlockedError);
  });

  it("allows fixture campaigns when ALLOW_FIXTURE_SYNC=1", async () => {
    vi.stubEnv("ALLOW_FIXTURE_SYNC", "1");
    const fixtureId = "test-fixture-once";
    const fixtureFile = path.join(CAMPAIGNS_DIR, `${fixtureId}.json`);
    try {
      await upsertCampaignRecord(mockRecord({ campaignId: fixtureId }));
      expect(await readCampaignEnvelope(fixtureId)).not.toBeNull();
    } finally {
      await fs.rm(fixtureFile, { force: true });
    }
  });
});
