import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import {
  resolveProjectDetailsReviewServiceNames,
} from "@/config/project-details";
import type { CampaignRecord } from "@/config/studio-board";
import {
  CUSTOM_STUDIO_PLAN_LABEL,
  resolveCampaignPlanIncludes,
  resolveCampaignPlanLabel,
  resolveCampaignAmountPaidDisplay,
  resolveCampaignRevisionRounds,
} from "@/lib/approved-plan-display";
import { resolveRevisionTracker } from "@/lib/campaign-record";
import { buildProjectDetailsPrefill } from "@/lib/project-details-prefill";
import { resolveActivityFeed } from "@/lib/campaign-record";
import { resolveCustomerJourneySteps } from "@/lib/customer-journey";
import { resolveAccountPackageView, resolveStudioBoardView } from "@/lib/studio-board-view";
import { buildServiceScopeSnapshot } from "@/lib/plan-pricing";

const GREEN_PLAN_IDS = ["bf-001", "sm-001", "ma-001"] as const satisfies readonly ServiceId[];

function buildGreenApprovedPlan() {
  const lineItems = buildServiceScopeSnapshot(GREEN_PLAN_IDS);
  const oneTimeTotalCents = lineItems.reduce((sum, line) => sum + line.exactPriceCents, 0);

  return {
    selectedServiceIds: [...GREEN_PLAN_IDS],
    includedServiceIds: [...GREEN_PLAN_IDS],
    additionalServiceIds: [] as ServiceId[],
    additionalCostUsd: 0,
    oneTimeTotalCents,
    monthlyTotalCents: 0,
    amountDueTodayCents: oneTimeTotalCents,
    lineItems,
    approvedAt: "2026-06-27T12:00:00.000Z",
  };
}

function mockPaidCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = "2026-06-27T12:00:00.000Z";
  const approvedStudioPlan = buildGreenApprovedPlan();

  return {
    campaignId: "integration-campaign",
    campaignName: "Tagia Bakery Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Building concepts",
    estimatedCompletion: "2 days remaining",
    packageId: "momentum",
    packageLabel: "Momentum Plan",
    approvedStudioPlan,
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: {
        workingOn: "Summer launch",
        mainOffer: "Seasonal pastries",
        importantDates: "July 4",
        callToAction: "Visit us",
        destinationLink: "https://example.com",
        mustIncludeExactly: "",
        brandColorsFonts: "",
        inspirationLinks: "",
        brandDoNotUse: "",
        brandOutdatedParts: "Old chalkboard logo",
        brandPartsToKeep: "Keep the teal accent",
        socialPlatforms: "Instagram",
        socialAccountLinks: "@tagia",
        socialPostingWindow: "",
        emailPlatform: "",
        emailSender: "",
        emailSendTiming: "",
        emailListReady: "",
        conceptIntendedUse: "",
        conceptAudience: "",
        conceptRequiredWording: "",
        marketingPieces: "Flyer, social, email, poster",
        marketingPieceUsage: "In-store and online",
        marketingFormats: "",
        adScript: "",
        adIntendedUse: "",
        adVoiceStyle: "",
        adPronunciation: "",
        primaryApproverName: "Tagia",
        primaryApproverEmail: "tagia@example.com",
        hasSecondaryApprover: "",
        secondaryApproverName: "",
        secondaryApproverEmail: "",
      },
      files: [],
      submittedAt: now,
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: "Project Details received." }],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Project Details + Studio Board integration", () => {
  it("prefill and final review use catalog service names, never SKU IDs or category labels", () => {
    const campaign = mockPaidCampaign({ campaignStatus: "PAYMENT_RECEIVED" });
    const prefill = buildProjectDetailsPrefill(campaign);
    const reviewNames = resolveProjectDetailsReviewServiceNames(
      campaign.approvedStudioPlan,
      GREEN_PLAN_IDS,
    );

    const expectedNames = GREEN_PLAN_IDS.map((id) => getServiceById(id)!.name);

    expect(prefill.selectedServices.map((service) => service.serviceName)).toEqual(expectedNames);
    expect(reviewNames).toEqual(expectedNames);
    for (const name of [...expectedNames, ...reviewNames]) {
      expect(name).not.toMatch(/^[a-z]+-\d{3}/);
      expect(name).not.toBe("Brand Foundation");
      expect(name).not.toBe("Social Media");
    }
  });

  it("board renders frozen approved plan after Project Details submit", () => {
    const campaign = mockPaidCampaign();
    const board = resolveStudioBoardView(campaign);
    const account = resolveAccountPackageView(campaign);
    const includes = resolveCampaignPlanIncludes(campaign);
    const feed = resolveActivityFeed(campaign);

    expect(board.status).toBe("BUILDING_CONCEPTS");
    expect(board.packageLabel).toBe(CUSTOM_STUDIO_PLAN_LABEL);
    expect(resolveCampaignPlanLabel(campaign)).toBe(CUSTOM_STUDIO_PLAN_LABEL);
    expect(account.packagePurchased).toBe(CUSTOM_STUDIO_PLAN_LABEL);
    expect(account.packagePrice).toBe("$1,385");
    expect(resolveCampaignAmountPaidDisplay(campaign)).toBe("$1,385");
    expect(includes).toEqual([
      "Brand Identity Refresh",
      "Social Media Launch Set",
      "Promotion Pack",
    ]);
    expect(includes.some((item) => item.includes("SMS"))).toBe(false);
    expect(includes.some((item) => item.includes("Video Scripts"))).toBe(false);
    expect(includes.some((item) => item.includes("Marketing Calendar"))).toBe(false);
    expect(feed.some((entry) => entry.message === "Project Details received")).toBe(true);
  });

  it("shows Project Details Complete as checked after submit, not in progress", () => {
    const paidAwaitingDetails = mockPaidCampaign({
      campaignStatus: "PAYMENT_RECEIVED",
      projectDetailsSubmittedAt: undefined,
      projectDetails: undefined,
    });
    const afterSubmit = mockPaidCampaign();

    const awaitingSteps = resolveCustomerJourneySteps(paidAwaitingDetails);
    const submittedSteps = resolveCustomerJourneySteps(afterSubmit);

    const awaitingIntake = awaitingSteps.find((step) => step.id === "intake");
    const submittedIntake = submittedSteps.find((step) => step.id === "intake");

    expect(awaitingIntake?.label).toBe("Project Details Complete");
    expect(awaitingIntake?.state).toBe("current");
    expect(submittedIntake?.label).toBe("Project Details Complete");
    expect(submittedIntake?.state).toBe("complete");
  });

  it("shows Building Concepts in progress after Project Details submit, not Review Concepts", () => {
    const afterSubmit = mockPaidCampaign();
    const steps = resolveCustomerJourneySteps(afterSubmit);

    expect(steps.map((step) => step.id)).toEqual([
      "payment",
      "intake",
      "building",
      "review",
      "direction",
      "delivery",
    ]);
    expect(steps.find((step) => step.id === "payment")?.state).toBe("complete");
    expect(steps.find((step) => step.id === "intake")?.state).toBe("complete");
    expect(steps.find((step) => step.id === "building")?.state).toBe("current");
    expect(steps.find((step) => step.id === "review")?.state).toBe("upcoming");
    expect(steps.find((step) => step.id === "direction")?.state).toBe("upcoming");
    expect(steps.find((step) => step.id === "delivery")?.state).toBe("upcoming");
  });

  it("uses frozen approved plan revision terms instead of package fallback", () => {
    const campaign = mockPaidCampaign({
      packageId: "growth",
      packageLabel: "Growth Plan",
      revisionRoundsIncluded: undefined,
    });

    expect(resolveCampaignRevisionRounds(campaign)).toBe(1);
    expect(resolveRevisionTracker(campaign).included).toBe(1);
    expect(resolveCampaignPlanIncludes(campaign).some((item) => item.includes("Momentum"))).toBe(
      false,
    );
  });
});
