import { describe, expect, it } from "vitest";

import { customerJourneyStepRoute } from "@/config/customer-journey-v1";
import { campaignJourneyMap } from "@/config/campaign-journey-map";
import { deliverables } from "@/config/deliverables";
import { studioBoard, studioBoardDraftRoomHref } from "@/config/studio-board";
import { utilityShell } from "@/config/utility-shell";
import { welcomeHallPhase1 } from "@/config/welcome-hall-phase1";

describe("navigation cleanup v1", () => {
  it("routes New Campaign directly to Route Map", () => {
    expect(studioBoard.routes.newCampaign).toBe("/route-map");
    expect(studioBoardDraftRoomHref()).toBe("/route-map");
  });

  it("routes lobby kiosk to Route Map", () => {
    expect(welcomeHallPhase1.routeToRouteMap).toBe("/route-map");
    expect(welcomeHallPhase1.routeToBusinessDiscoveryStudio).toBe("/route-map");
  });

  it("limits utility subnav to approved client items", () => {
    expect(utilityShell.nav.map((item) => item.id)).toEqual([
      "studio-board",
      "campaign-details",
      "review-room",
      "deliverables",
      "help-center",
    ]);
    expect(utilityShell.nav.map((item) => item.href)).not.toContain("/account");
    expect(utilityShell.nav.map((item) => item.href)).not.toContain("/past-campaigns");
    expect(utilityShell.nav.map((item) => item.href)).not.toContain("/file-room");
    expect(utilityShell.nav.map((item) => item.href)).not.toContain("/studio-kitchen");
  });

  it("uses /feedback-studio as canonical Review Room route", () => {
    expect(customerJourneyStepRoute("review-room")).toBe("/feedback-studio");
    expect(studioBoard.routes.feedbackStudio).toBe("/feedback-studio");
    expect(studioBoard.routes.reviewRoom).toBe("/feedback-studio");
    expect(deliverables.routes.reviewRoom).toBe("/feedback-studio");
    expect(campaignJourneyMap.steps.find((step) => step.id === "review-room")?.href).toBe(
      "/feedback-studio",
    );
  });

  it("hides placeholder routes from lobby mobile dock", () => {
    const hrefs = welcomeHallPhase1.mobileStudioNav.items.map((item) => item.href);
    expect(hrefs).not.toContain("/account");
    expect(hrefs).not.toContain("/past-campaigns");
    expect(hrefs).not.toContain("/creative-room");
  });
});
