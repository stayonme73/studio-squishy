import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  ACKNOWLEDGMENT_VERSION,
  APPROVAL_ACKNOWLEDGMENT_TEXT,
} from "@/config/service-guide";
import {
  readCurrentCampaign,
  saveApprovedStudioPlan,
  saveCurrentCampaign,
} from "@/lib/studio-board-campaign";

const CAMPAIGN_KEY = "studio-squishy:current-campaign";

function mockCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId: "test-campaign",
    campaignName: "Test Campaign",
    campaignStatus: "DISCOVERY_COMPLETE",
    campaignDescription: "Test",
    estimatedCompletion: "Soon",
    packageId: "momentum",
    packageLabel: "Momentum Plan",
    paymentReceivedAt: null,
    targetCompletionDate: null,
    revisionRoundsIncluded: 2,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("saveApprovedStudioPlan", () => {
  beforeEach(() => {
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
    saveCurrentCampaign(mockCampaign());
  });

  it("persists full immutable line-item snapshot with scope fields", () => {
    const acknowledgment = {
      acknowledgmentVersion: ACKNOWLEDGMENT_VERSION,
      acknowledgmentText: APPROVAL_ACKNOWLEDGMENT_TEXT,
      acknowledgedAt: "2026-06-27T12:00:00.000Z",
    };

    const result = saveApprovedStudioPlan(["bf-001", "em-001"], acknowledgment);
    expect(result).not.toBeNull();

    const saved = readCurrentCampaign()!.approvedStudioPlan!;
    expect(saved.selectedServiceIds).toEqual(["bf-001", "em-001"]);
    expect(saved.oneTimeTotalCents).toBe(49500 + 32500);
    expect(saved.amountDueTodayCents).toBe(49500 + 32500);
    expect(saved.acknowledgmentVersion).toBe(ACKNOWLEDGMENT_VERSION);
    expect(saved.acknowledgmentText).toBe(APPROVAL_ACKNOWLEDGMENT_TEXT);
    expect(saved.acknowledgedAt).toBe(acknowledgment.acknowledgedAt);
    expect(saved.approvedAt).toBeTruthy();

    expect(saved.lineItems).toHaveLength(2);
    const brandLine = saved.lineItems[0];
    expect(brandLine.skuId).toBe("bf-001");
    expect(brandLine.serviceName).toBeTruthy();
    expect(brandLine.exactPriceCents).toBe(49500);
    expect(brandLine.deliverables.length).toBeGreaterThan(0);
    expect(brandLine.exclusions.length).toBeGreaterThan(0);
    expect(brandLine.timingWindowLabel).toBeTruthy();
    expect(brandLine.revisionRule).toBeTruthy();
    expect(brandLine.clientResponsibilities.length).toBeGreaterThan(0);
    expect(brandLine.executionResponsibility).toBeTruthy();
  });

  it("stores parent SKU on execution add-on line items", () => {
    const result = saveApprovedStudioPlan(["sm-001", "social_media-execution"]);
    expect(result).not.toBeNull();

    const executionLine = readCurrentCampaign()!.approvedStudioPlan!.lineItems.find(
      (line) => line.skuId === "social_media-execution",
    );
    expect(executionLine?.parentSkuId).toBe("sm-001");
  });

  it("rejects invalid plans with execution add-on missing parent", () => {
    const before = window.localStorage.getItem(CAMPAIGN_KEY);
    const result = saveApprovedStudioPlan(["social_media-execution"]);
    expect(result).toBeNull();
    expect(window.localStorage.getItem(CAMPAIGN_KEY)).toBe(before);
  });
});
