import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  createCampaignFromDiscovery,
  saveCurrentCampaign,
  saveApprovedStudioPlan,
  markPaymentReceived,
  submitProjectDetails,
} from "@/lib/studio-board-campaign";
import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import { promises as fs } from "fs";
import path from "path";

const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const CAMPAIGN_ID = "dual-write-integration-campaign";

describe("dual-write idempotency (server store)", () => {
  beforeEach(() => {
    vi.stubEnv("ALLOW_FIXTURE_SYNC", "0");
    vi.stubGlobal("window", {
      localStorage: {
        store: {} as Record<string, string>,
        getItem(key: string) {
          return this.store[key] ?? null;
        },
        setItem(key: string, value: string) {
          this.store[key] = value;
        },
        removeItem(key: string) {
          delete this.store[key];
        },
      },
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  afterEach(async () => {
    await fs.rm(path.join(process.cwd(), "data", "campaigns", `${CAMPAIGN_ID}.json`), {
      force: true,
    });
  });

  it("persists discovery → plan → payment → project details in one server record", async () => {
    const discovery = createCampaignFromDiscovery({
      "your-business": "Dual Write Bakery",
      "your-focus": "Promote an offer, event, or launch",
    });
    discovery.campaignId = CAMPAIGN_ID;
    saveCurrentCampaign(discovery);
    await upsertCampaignRecord(discovery, "tagia");

    saveApprovedStudioPlan(["bf-001", "em-001"]);
    const afterPlan = JSON.parse(window.localStorage.getItem(CAMPAIGN_KEY)!) as CampaignRecord;
    await upsertCampaignRecord(afterPlan, "tagia");

    markPaymentReceived();
    const afterPayment = JSON.parse(window.localStorage.getItem(CAMPAIGN_KEY)!) as CampaignRecord;
    await upsertCampaignRecord(afterPayment, "tagia");

    submitProjectDetails({
      form: {
        ...EMPTY_PROJECT_DETAILS_FORM,
        primaryApproverName: "Tagia",
        primaryApproverEmail: "tagia@example.com",
      },
      files: [],
      submittedAt: new Date().toISOString(),
    });
    const afterDetails = JSON.parse(window.localStorage.getItem(CAMPAIGN_KEY)!) as CampaignRecord;
    const envelope = await upsertCampaignRecord(afterDetails, "tagia");

    expect(envelope.syncVersion).toBe(4);
    expect(envelope.record.discoverySubmittedAt).toBeTruthy();
    expect(envelope.record.approvedStudioPlan).toBeTruthy();
    expect(envelope.record.paymentReceivedAt).toBeTruthy();
    expect(envelope.record.projectDetailsSubmittedAt).toBeTruthy();

    const reread = await readCampaignEnvelope(CAMPAIGN_ID);
    expect(reread?.campaignId).toBe(CAMPAIGN_ID);
  });
});
