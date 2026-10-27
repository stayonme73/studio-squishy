import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { condensedServiceSku } from "@/config/studio-customer-journey-condense-v1";

import { campaignLaunchKitCompositeRoutingDecisions } from "./campaign-launch-kit-composite-dispatch";

describe("campaignLaunchKitCompositeRoutingDecisions", () => {
  const campaign = {
    campaignId: "cert-kit-factory-sku",
    routeMapIntake: {
      submittedAt: "2026-10-27T00:00:00.000Z",
      answers: {
        "shared:businessName": "Kit Co",
        "campaign_launch_kit:purpose": "Spring tune-up",
        "campaign_launch_kit:facts": "Open house weekend",
        "campaign_launch_kit:prices": "$189",
        "campaign_launch_kit:dates": "March 10 – April 15",
        "campaign_launch_kit:cta": "Book now",
        "campaign_launch_kit:phone": "555-0100",
        "campaign_launch_kit:website": "https://example.com/book",
        "campaign_launch_kit:rights": "I have permission.",
      },
    },
  } as CampaignRecord;

  it("expands condensed factory SKU parent jobs into four branch routing decisions", () => {
    const factorySku = condensedServiceSku("campaign_launch_kit");
    const decisions = campaignLaunchKitCompositeRoutingDecisions({
      campaign,
      job: {
        jobId: `${campaign.campaignId}:${factorySku}`,
        campaignId: campaign.campaignId,
        skuId: factorySku,
        intakeComplete: true,
        ownerApprovalPending: null,
      },
      materials: [],
    });
    expect(decisions).not.toBeNull();
    expect(decisions).toHaveLength(4);
    expect(decisions!.every((d) => d.skuId !== factorySku)).toBe(true);
    expect(decisions!.some((d) => d.blocker === "unknown_sku")).toBe(false);
  });
});
