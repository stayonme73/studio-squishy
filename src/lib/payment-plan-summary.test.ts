import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActiveServices, getDerivedServicePricing, getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import { payment } from "@/config/payment";
import type { CampaignRecord } from "@/config/studio-board";
import {
  buildPlanLineItems,
  computePlanPricingTotals,
  formatUsdFromCents,
} from "@/lib/plan-pricing";
import {
  buildPaymentPlanSummary,
  buildPaymentPlanSummaryFromPlan,
} from "@/lib/payment-plan-summary";
import {
  readCurrentCampaign,
  saveApprovedStudioPlan,
  saveCurrentCampaign,
} from "@/lib/studio-board-campaign";
import { saveProjectSummaryPlanDraft } from "@/lib/project-summary-plan-draft";
import {
  addServiceToPlan,
  buildStudioPlanReview,
  computeAdditionalCostUsd,
  initialPlanState,
  removeServiceFromPlan,
  swapServiceInPlan,
} from "@/studio-plan-review";
import type { RecommendationResult } from "@/recommendation/types";

function mockRecommendation(serviceIds: ServiceId[]): RecommendationResult {
  return {
    brief: { answers: {} },
    recommendations: serviceIds.map((serviceId, index) => ({
      serviceId,
      score: 1,
      matchedRules: [],
      reasons: [],
      rank: index + 1,
    })),
    includedRecommendations: [],
    additionalStudioServices: [],
    considerNextRecommendations: [],
    primaryServiceId: serviceIds[0] ?? null,
    rationale: { summary: "Test", matchedSignals: [] },
    deliverablesSummary: [],
    estimatedInvestment: { items: [], totalAmountUsd: 0, hasQuotedItems: false },
    estimatedTimeline: { items: [], totalBusinessDays: 0, customerLabel: "Test" },
    warnings: [],
    requiresApproval: false,
    generatedAt: new Date().toISOString(),
    engineVersion: "test",
  };
}

describe("plan-pricing", () => {
  it("buildPlanLineItems preserves order and derives catalog prices", () => {
    const lines = buildPlanLineItems(["bf-001", "em-001"]);
    expect(lines).toHaveLength(2);
    expect(lines[0].serviceId).toBe("bf-001");
    expect(lines[0].priceCents).toBe(49500);
    expect(lines[0].priceDisplay).toBe("$495");
    expect(lines[1].serviceId).toBe("em-001");
    expect(lines[1].priceCents).toBe(32500);
  });

  it("computePlanPricingTotals splits one-time and monthly billing", () => {
    const totals = computePlanPricingTotals(["bf-001", "sm-001-monthly"]);
    expect(totals.oneTimeSubtotalCents).toBe(49500);
    expect(totals.monthlySubtotalCents).toBe(34900);
    expect(totals.amountDueTodayCents).toBe(49500);
    expect(totals.amountDueTodayCents).toBe(totals.oneTimeSubtotalCents);
  });

  it("includes execution add-on prices in totals when parent is present", () => {
    const totals = computePlanPricingTotals(["sm-001", "social_media-execution"]);
    expect(totals.oneTimeSubtotalCents).toBe(getServiceById("sm-001")!.priceCents + 10000);
    expect(totals.amountDueTodayCents).toBe(totals.oneTimeSubtotalCents);
  });

  it("formatUsdFromCents renders whole-dollar USD", () => {
    expect(formatUsdFromCents(49500)).toBe("$495");
  });

  it("starting fresh default foundation total is 138500 cents ($1,385)", () => {
    const foundationIds = ["bf-001", "sm-001", "ma-001"] as const;
    const totals = computePlanPricingTotals([...foundationIds]);
    expect(totals.oneTimeSubtotalCents).toBe(138500);
    expect(totals.amountDueTodayCents).toBe(138500);
    expect(formatUsdFromCents(totals.amountDueTodayCents)).toBe("$1,385");
  });

  it("price display labels match derived catalog pricing for active discovery services", () => {
    const discoveryIds = getActiveServices()
      .filter((service) => !service.routeMapPriceDisplay)
      .map((service) => service.id);

    for (const serviceId of discoveryIds) {
      const lines = buildPlanLineItems([serviceId]);
      expect(lines).toHaveLength(1);
      expect(lines[0].priceDisplay).toBe(getDerivedServicePricing(serviceId)?.display);
    }
  });

  it("computeAdditionalCostUsd matches catalog-derived amounts", () => {
    const additionalIds = ["em-001", "cc-001"] as ServiceId[];
    const expectedUsd = additionalIds.reduce((sum, serviceId) => {
      const derived = getDerivedServicePricing(serviceId);
      return sum + (derived?.amountUsd ?? getServiceById(serviceId)!.priceCents / 100);
    }, 0);

    expect(computeAdditionalCostUsd(additionalIds).amountUsd).toBe(expectedUsd);
  });
});

describe("card processing disclosure", () => {
  it("exposes the card processing disclosure note in payment config", () => {
    expect(payment.summary.cardProcessingDisclosureNote).toBe(
      "Taxes and standard processing costs are included in your total.",
    );
  });
});

describe("buildPaymentPlanSummaryFromPlan", () => {
  it("delegates to plan-pricing for live plan selections", () => {
    const planState = initialPlanState(["bf-001", "em-001"] as ServiceId[]);
    const plan = buildStudioPlanReview(
      mockRecommendation(["bf-001", "em-001"] as ServiceId[]),
      planState,
    );
    const summary = buildPaymentPlanSummaryFromPlan(plan);

    expect(summary.oneTimeSubtotalCents).toBe(49500 + 32500);
    expect(summary.amountDueTodayCents).toBe(49500 + 32500);
    expect(summary.amountDueTodayCents).toBe(summary.oneTimeSubtotalCents);
    expect(summary.lineItems).toHaveLength(2);
    expect(summary.investmentDisplay).toBe("$820");
    expect(summary.source).toBe("storage");
  });

  it("returns empty line items when no services are selected", () => {
    const plan = buildStudioPlanReview(mockRecommendation(["bf-001", "em-001"] as ServiceId[]), {
      selectedServiceIds: [],
    });
    const summary = buildPaymentPlanSummaryFromPlan(plan);

    expect(summary.lineItems).toHaveLength(0);
    expect(summary.services).toHaveLength(0);
    expect(summary.oneTimeSubtotalCents).toBe(0);
    expect(summary.monthlySubtotalCents).toBe(0);
    expect(summary.amountDueTodayCents).toBe(0);
    expect(summary.amountDueTodayDisplay).toBe("$0");
    expect(summary.source).toBe("empty");
  });

  it("matches planTotals after removing a one-time service", () => {
    const recommendation = mockRecommendation(["bf-001", "em-001"] as ServiceId[]);
    const planState = removeServiceFromPlan(initialPlanState(["bf-001", "em-001"] as ServiceId[]), "em-001");
    const plan = buildStudioPlanReview(recommendation, planState);
    const summary = buildPaymentPlanSummaryFromPlan(plan);

    expect(summary.lineItems.map((line) => line.serviceId)).toEqual(["bf-001"]);
    expect(summary.oneTimeSubtotalCents).toBe(plan.planTotals.oneTimeSubtotalCents);
    expect(summary.amountDueTodayCents).toBe(plan.planTotals.amountDueTodayCents);
    expect(summary.monthlySubtotalCents).toBe(plan.planTotals.monthlySubtotalCents);
  });

  it("matches planTotals after removing a monthly service", () => {
    const recommendation = mockRecommendation(["bf-001", "sm-001-monthly"] as ServiceId[]);
    const planState = removeServiceFromPlan(
      initialPlanState(["bf-001", "sm-001-monthly"] as ServiceId[]),
      "sm-001-monthly",
    );
    const plan = buildStudioPlanReview(recommendation, planState);
    const summary = buildPaymentPlanSummaryFromPlan(plan);

    expect(summary.lineItems.map((line) => line.serviceId)).toEqual(["bf-001"]);
    expect(summary.monthlySubtotalCents).toBe(0);
    expect(summary.amountDueTodayCents).toBe(plan.planTotals.amountDueTodayCents);
    expect(summary.amountDueTodayCents).toBe(summary.oneTimeSubtotalCents);
  });

  it("adds monthly consider-next service to monthly subtotal only", () => {
    const recommendation = mockRecommendation(["bf-001"] as ServiceId[]);
    const planState = addServiceToPlan(initialPlanState(["bf-001"] as ServiceId[]), "sm-001-monthly");
    const plan = buildStudioPlanReview(recommendation, planState);
    const summary = buildPaymentPlanSummaryFromPlan(plan);

    expect(summary.monthlySubtotalCents).toBe(plan.planTotals.monthlySubtotalCents);
    expect(summary.monthlySubtotalCents).toBeGreaterThan(0);
    expect(summary.amountDueTodayCents).toBe(plan.planTotals.amountDueTodayCents);
    expect(summary.amountDueTodayCents).toBe(summary.oneTimeSubtotalCents);
  });

  it("matches planTotals after swapping a selected service", () => {
    const recommendation = mockRecommendation(["bf-001", "sm-001"] as ServiceId[]);
    const planState = swapServiceInPlan(
      initialPlanState(["bf-001", "sm-001"] as ServiceId[]),
      "sm-001",
      "bf-002",
    );
    const plan = buildStudioPlanReview(recommendation, planState);
    const summary = buildPaymentPlanSummaryFromPlan(plan);

    expect(summary.lineItems.map((line) => line.serviceId)).toEqual(["bf-001", "bf-002"]);
    expect(summary.oneTimeSubtotalCents).toBe(plan.planTotals.oneTimeSubtotalCents);
    expect(summary.amountDueTodayCents).toBe(plan.planTotals.amountDueTodayCents);
  });
});

function mockCampaign(): CampaignRecord {
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
  };
}

describe("buildPaymentPlanSummary", () => {
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

  it("uses frozen snapshot totals even if live catalog prices differ", () => {
    saveApprovedStudioPlan(["bf-001"]);

    const approved = readCurrentCampaign()!.approvedStudioPlan!;
    const frozenCents = approved.oneTimeTotalCents;
    expect(frozenCents).toBe(49500);

    approved.lineItems[0].exactPriceCents = 999;
    approved.oneTimeTotalCents = 999;
    approved.amountDueTodayCents = 999;
    saveCurrentCampaign({
      ...readCurrentCampaign()!,
      approvedStudioPlan: approved,
    });

    const liveCents = getServiceById("bf-001")!.priceCents;
    expect(liveCents).toBe(49500);

    const summary = buildPaymentPlanSummary();
    expect(summary.oneTimeSubtotalCents).toBe(999);
    expect(summary.amountDueTodayCents).toBe(999);
    expect(summary.lineItems[0].priceCents).toBe(999);
    expect(summary.source).toBe("storage");
  });

  it("reads the same pre-payment draft as Project Summary embedded checkout", () => {
    saveProjectSummaryPlanDraft(["bf-001", "sm-001-monthly"] as ServiceId[]);

    const fromPlan = buildPaymentPlanSummaryFromPlan(
      buildStudioPlanReview(mockRecommendation(["bf-001"] as ServiceId[]), {
        selectedServiceIds: ["bf-001", "sm-001-monthly"] as ServiceId[],
      }),
    );
    const fromPaymentRoute = buildPaymentPlanSummary();

    expect(fromPaymentRoute.lineItems.map((line) => line.serviceId)).toEqual(
      fromPlan.lineItems.map((line) => line.serviceId),
    );
    expect(fromPaymentRoute.oneTimeSubtotalCents).toBe(fromPlan.oneTimeSubtotalCents);
    expect(fromPaymentRoute.monthlySubtotalCents).toBe(fromPlan.monthlySubtotalCents);
    expect(fromPaymentRoute.amountDueTodayCents).toBe(fromPlan.amountDueTodayCents);
  });

  it("prefers frozen approved totals after payment over draft", () => {
    saveProjectSummaryPlanDraft(["bf-001"] as ServiceId[]);
    saveApprovedStudioPlan(["bf-001", "em-001"] as ServiceId[]);
    const campaign = readCurrentCampaign()!;
    saveCurrentCampaign({
      ...campaign,
      paymentReceivedAt: new Date().toISOString(),
    });

    const summary = buildPaymentPlanSummary();
    expect(summary.lineItems.map((line) => line.serviceId)).toEqual(["bf-001", "em-001"]);
    expect(summary.amountDueTodayCents).toBe(49500 + 32500);
  });
});
