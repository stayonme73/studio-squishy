import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  resolveBoardNextStepPanelMessage,
  toClientFacingActivityMessage,
} from "@/lib/studio-board-client-copy";

describe("toClientFacingActivityMessage", () => {
  it("rewrites internal studio-note phrasing for clients", () => {
    expect(toClientFacingActivityMessage("Route Map job selected: Make My Social Media Posts.")).toBe(
      "Your project has been created: Make My Social Media Posts",
    );
    expect(toClientFacingActivityMessage("Payment received.")).toBe("We received your payment");
    expect(toClientFacingActivityMessage("Discovery received.")).toBe(
      "We received your discovery answers",
    );
  });
});

describe("resolveBoardNextStepPanelMessage", () => {
  const baseCampaign = {
    campaignId: "test",
    campaignName: "Test",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    deliverablesDelivered: {},
    studioNotes: [],
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
  } satisfies CampaignRecord;

  it("prompts for destination link when that material is still needed", () => {
    expect(
      resolveBoardNextStepPanelMessage({
        campaign: baseCampaign,
        blockingRequiredCount: 1,
        stillNeededLabels: ["Destination link / CTA"],
      }),
    ).toBe("We still need your destination link.");
  });

  it("confirms receipt when blocking materials are complete during building", () => {
    expect(
      resolveBoardNextStepPanelMessage({
        campaign: {
          ...baseCampaign,
          campaignStatus: "BUILDING_CONCEPTS",
          projectDetailsSubmittedAt: "2026-07-04T01:00:00.000Z",
        },
        blockingRequiredCount: 0,
        stillNeededLabels: [],
      }),
    ).toBe("We have everything we need. We're building your concepts now.");
  });
});
