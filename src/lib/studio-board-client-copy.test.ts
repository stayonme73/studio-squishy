import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  resolveBoardNextStepPanelMessage,
  toClientFacingActivityMessage,
} from "@/lib/studio-board-client-copy";

describe("toClientFacingActivityMessage", () => {
  it("rewrites internal studio-note phrasing for clients", () => {
    expect(toClientFacingActivityMessage("Route Map job selected: Make My Social Media Posts.")).toBe(
      "Added to your Studio Plan: Make My Social Media Posts",
    );
    expect(toClientFacingActivityMessage("Payment received.")).toBe("We received your payment");
    expect(toClientFacingActivityMessage("Discovery received.")).toBe(
      "We received your discovery answers",
    );
    expect(toClientFacingActivityMessage("Vision Intake received.")).toBe(
      "We received your Project Intake",
    );
    expect(toClientFacingActivityMessage("Project Details received.")).toBe(
      "We received your Project Intake",
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

  it("prompts for destination link when that material is still needed after Intake", () => {
    expect(
      resolveBoardNextStepPanelMessage({
        campaign: {
          ...baseCampaign,
          projectDetailsSubmittedAt: "2026-07-04T01:00:00.000Z",
        },
        blockingRequiredCount: 1,
        stillNeededLabels: ["Destination link / CTA"],
      }),
    ).toBe("We still need your destination link.");
  });

  it("reinforces Project Intake without a competing Complete CTA when Intake is incomplete", () => {
    expect(
      resolveBoardNextStepPanelMessage({
        campaign: baseCampaign,
        blockingRequiredCount: 0,
        stillNeededLabels: [],
      }),
    ).toBe("Finish Project Intake first. Material requests will appear here afterward.");
  });

  it("keeps incomplete Intake reinforcement ahead of materials prompts", () => {
    expect(
      resolveBoardNextStepPanelMessage({
        campaign: baseCampaign,
        blockingRequiredCount: 1,
        stillNeededLabels: ["Campaign goal / message"],
      }),
    ).toBe("Finish Project Intake first. Material requests will appear here afterward.");
  });

  it("confirms receipt when blocking materials are complete only after the production gate", () => {
    expect(
      resolveBoardNextStepPanelMessage({
        campaign: {
          ...baseCampaign,
          campaignStatus: "BUILDING_CONCEPTS",
          projectDetailsSubmittedAt: "2026-07-04T01:00:00.000Z",
        },
        blockingRequiredCount: 0,
        stillNeededLabels: [],
        movedToProduction: false,
      }),
    ).toBe(
      "We've received your Project Intake and are preparing your project for the next stage.",
    );

    expect(
      resolveBoardNextStepPanelMessage({
        campaign: {
          ...baseCampaign,
          campaignStatus: "BUILDING_CONCEPTS",
          projectDetailsSubmittedAt: "2026-07-04T01:00:00.000Z",
          paymentReceivedAt: "2026-07-04T00:30:00.000Z",
        },
        blockingRequiredCount: 0,
        stillNeededLabels: [],
        movedToProduction: true,
        productionGatePassed: true,
      }),
    ).toBe("We have everything we need. We're building your concepts now.");
  });
});
