import { describe, expect, it } from "vitest";

import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import { resolveCustomerJourneySteps } from "@/lib/customer-journey";
import {
  PROJECT_SUMMARY_PLAN_DRAFT_KEY_PREFIX,
  type ProjectSummaryPlanDraft,
} from "@/lib/project-summary-plan-draft";
import {
  hasActiveStudioPlanState,
  resolveStudioGuideRedirectHref,
  STUDIO_GUIDE_DISCOVERY_HREF,
  STUDIO_GUIDE_PROJECT_SUMMARY_HREF,
} from "@/lib/studio-guide-redirect";
import { resolveCampaignProgressSteps } from "@/lib/studio-board-view";

const CAMPAIGN_KEY = "studio-squishy:current-campaign";

function createStorage() {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

function mockReviewCampaign(): CampaignRecord {
  const now = "2026-06-28T12:00:00.000Z";
  return {
    campaignId: "owner-qa-dev",
    campaignName: "Tagia Bakery Campaign",
    campaignStatus: "READY_FOR_REVIEW",
    campaignDescription: "Concepts ready",
    estimatedCompletion: "Review open",
    packageId: "momentum",
    packageLabel: "Momentum Plan",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [],
    createdAt: now,
    updatedAt: now,
  };
}

describe("journey surface consolidation", () => {
  it("keeps Review Concepts as status-only in customer journey", () => {
    const steps = resolveCustomerJourneySteps(mockReviewCampaign());
    const review = steps.find((step) => step.id === "review");

    expect(review?.state).toBe("current");
    expect(review?.actionLabel).toBeUndefined();
    expect(review?.actionHref).toBeUndefined();
  });

  it("does not emit review CTAs in production timeline steps", () => {
    const steps = resolveCampaignProgressSteps(mockReviewCampaign());
    const review = steps.find((step) => step.id === "READY_FOR_REVIEW");

    expect(review?.state).toBe("current");
    expect(review?.actionLabel).toBeUndefined();
    expect(review?.href).toBeNull();
  });

  it("does not mark Project Intake complete on the production timeline before Intake submit", () => {
    const now = "2026-07-13T12:00:00.000Z";
    const paidIncompleteIntake: CampaignRecord = {
      campaignId: "pkg1b-progress",
      campaignName: "Social Posts",
      campaignStatus: "PAYMENT_RECEIVED",
      campaignDescription: "Paid",
      estimatedCompletion: "",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      paymentReceivedAt: now,
      projectDetailsSubmittedAt: undefined,
      deliverablesDelivered: {},
      studioNotes: [{ date: "Today", message: "Payment received." }],
      createdAt: now,
      updatedAt: now,
    };

    const steps = resolveCampaignProgressSteps(paidIncompleteIntake);
    const intake = steps.find((step) => step.id === "DRAFT_RECEIVED");
    const payment = steps.find((step) => step.id === "PAYMENT_RECEIVED");

    expect(intake?.label).toBe("Project Intake");
    expect(intake?.state).not.toBe("complete");
    expect(payment?.state).toBe("current");
  });
});

describe("studio guide redirect", () => {
  it("redirects to Discovery when no draft or approved plan exists", () => {
    const localStorage = createStorage();
    const originalWindow = globalThis.window;

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage },
    });

    try {
      expect(resolveStudioGuideRedirectHref()).toBe(STUDIO_GUIDE_DISCOVERY_HREF);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it("redirects to Route Map when an approved plan exists", () => {
    const localStorage = createStorage();
    const originalWindow = globalThis.window;
    const campaign = {
      ...mockReviewCampaign(),
      approvedStudioPlan: {
        selectedServiceIds: ["bf-001"] as ServiceId[],
        includedServiceIds: ["bf-001"] as ServiceId[],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 49_500,
        monthlyTotalCents: 0,
        amountDueTodayCents: 49_500,
        lineItems: [],
        approvedAt: "2026-06-28T12:00:00.000Z",
      },
    };

    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage },
    });

    try {
      expect(resolveStudioGuideRedirectHref()).toBe(STUDIO_GUIDE_PROJECT_SUMMARY_HREF);
      expect(hasActiveStudioPlanState(campaign)).toBe(true);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it("redirects to Route Map when a project-summary plan draft exists", () => {
    const localStorage = createStorage();
    const originalWindow = globalThis.window;
    const campaign = mockReviewCampaign();
    const draft: ProjectSummaryPlanDraft = {
      selectedServiceIds: ["bf-001"],
      updatedAt: "2026-06-28T12:00:00.000Z",
    };

    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
    localStorage.setItem(
      `${PROJECT_SUMMARY_PLAN_DRAFT_KEY_PREFIX}${campaign.campaignId}`,
      JSON.stringify(draft),
    );

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage },
    });

    try {
      expect(resolveStudioGuideRedirectHref()).toBe(STUDIO_GUIDE_PROJECT_SUMMARY_HREF);
      expect(hasActiveStudioPlanState(campaign)).toBe(true);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });
});
