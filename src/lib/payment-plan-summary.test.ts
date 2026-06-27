import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServiceById } from "@/catalog/accessors";
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
import { buildStudioPlanReview, initialPlanState } from "@/studio-plan-review";
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

  it("starting fresh foundation total is 238000 cents ($2,380)", () => {
    const foundationIds = ["bf-001", "bf-002", "cp-001", "sm-001"] as const;
    const totals = computePlanPricingTotals([...foundationIds]);
    expect(totals.oneTimeSubtotalCents).toBe(238000);
    expect(totals.amountDueTodayCents).toBe(238000);
    expect(formatUsdFromCents(totals.amountDueTodayCents)).toBe("$2,380");
  });
});

describe("card processing disclosure", () => {
  it("exposes the card processing disclosure note in payment config", () => {
    expect(payment.summary.cardProcessingDisclosureNote).toBe(
      "A credit-card processing fee may apply. Any applicable fee and your final total are shown before payment.",
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
});
