import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { buildDiscoverySummary } from "@/discovery-summary/buildDiscoverySummary";
import { validateDiscoverySummaryModel } from "@/discovery-summary/validate";
import { runDiscoveryRecommendation } from "@/lib/run-discovery-recommendation";
import { computePlanPricingTotals, formatUsdFromCents } from "@/lib/plan-pricing";
import type { RecommendationResult, ServiceRecommendation } from "@/recommendation/types";
import type { ServiceId } from "@/catalog/types";

function mockRecommendation(
  included: ServiceId[],
  additional: ServiceId[] = [],
): RecommendationResult {
  const all = [...included, ...additional];
  const toRec = (serviceId: ServiceId, rank: number): ServiceRecommendation => ({
    serviceId,
    score: 1,
    matchedRules: [],
    reasons: [],
    rank,
  });

  return {
    brief: { answers: {} },
    recommendations: all.map((serviceId, index) => toRec(serviceId, index + 1)),
    includedRecommendations: included.map((serviceId, index) => toRec(serviceId, index + 1)),
    additionalStudioServices: additional.map((serviceId, index) =>
      toRec(serviceId, included.length + index + 1),
    ),
    primaryServiceId: included[0] ?? null,
    rationale: { summary: "Test", matchedSignals: [] },
    deliverablesSummary: [],
    estimatedInvestment: {
      items: included.map((serviceId) => ({
        serviceId,
        display: "Quoted at checkout",
        amountUsd: 0,
        billing: "one-time" as const,
      })),
      totalAmountUsd: 0,
      hasQuotedItems: true,
    },
    estimatedTimeline: {
      items: [],
      totalBusinessDays: 14,
      customerLabel: "About 2 weeks",
    },
    warnings: [],
    requiresApproval: false,
    generatedAt: new Date().toISOString(),
    engineVersion: "test",
  };
}

describe("buildDiscoverySummary — active catalog pricing", () => {
  it("does not surface Quoted at checkout for service or total investment", () => {
    const result = mockRecommendation(["bf-001", "em-001"]);
    const summary = buildDiscoverySummary(result);

    expect(summary.recommendedServices[0].investment.display).toBe("$495");
    expect(summary.recommendedServices[1].investment.display).toBe("$325");
    expect(summary.totalInvestment.display.toLowerCase()).not.toContain("quoted");
    expect(summary.totalInvestment.hasQuotedItems).toBe(false);
    expect(() => validateDiscoverySummaryModel(summary)).not.toThrow();
  });

  it("totals match plan-pricing for all recommended services", () => {
    const included = ["bf-001", "sm-001-monthly"] as ServiceId[];
    const all = [...included, "cc-001"] as ServiceId[];
    const result = mockRecommendation(included, []);
    result.recommendations = all.map((serviceId, index) => ({
      serviceId,
      score: 1,
      matchedRules: [],
      reasons: [],
      rank: index + 1,
    }));
    result.includedRecommendations = included.map((serviceId, index) => ({
      serviceId,
      score: 1,
      matchedRules: [],
      reasons: [],
      rank: index + 1,
    }));
    result.additionalStudioServices = [];
    const summary = buildDiscoverySummary(result);
    const totals = computePlanPricingTotals(all);

    expect(summary.recommendedServices.map((s) => s.serviceId)).toEqual(all);
    expect(summary.totalInvestment.oneTimeSubtotalDisplay).toBe(
      formatUsdFromCents(totals.oneTimeSubtotalCents),
    );
    expect(summary.totalInvestment.monthlySubtotalDisplay).toBe(
      formatUsdFromCents(totals.monthlySubtotalCents),
    );
    expect(summary.totalInvestment.amountDueTodayDisplay).toBe(
      formatUsdFromCents(totals.amountDueTodayCents),
    );
    expect(summary.totalInvestment.monthlySubtotalCents).toBe(totals.monthlySubtotalCents);
    expect(summary.additionalStudioServices).toHaveLength(0);
  });

  it("uses real catalog pricing from the discovery pipeline without mock fallback", () => {
    const { summary, recommendation } = runDiscoveryRecommendation({
      "your-business": "Acme Coffee Co.",
      "your-situation": "Starting fresh",
      "your-challenge": "I am not sure what to say about my business",
      "your-current-tools": "None yet / starting from scratch",
      "your-focus": "Promote an offer, event, or launch",
      "success-looks-like": "A successful launch, event, sale, or promotion",
      "whats-slowing-you-down": "I am not visible enough online",
    });

    expect(recommendation.includedRecommendations.length).toBeGreaterThan(0);
    expect(summary.recommendedServices.length).toBeGreaterThan(0);
    expect(summary.recommendedServices[0].investment.display).not.toContain("Quoted");
    expect(summary.totalInvestment.hasQuotedItems).toBe(false);

    const allIds = recommendation.recommendations.map((entry) => entry.serviceId);
    const totals = computePlanPricingTotals(allIds);
    expect(summary.totalInvestment.amountDueTodayDisplay).toBe(
      formatUsdFromCents(totals.amountDueTodayCents),
    );
  });

  it("starting fresh Why? copy is plain language without service IDs or rule traces", () => {
    const { summary } = runDiscoveryRecommendation({
      "your-business": "Acme Coffee Co.",
      "your-situation": "Starting fresh",
      "your-challenge": "I am not sure what to say about my business",
      "your-current-tools": "None yet / starting from scratch",
      "your-focus": "Promote an offer, event, or launch",
      "success-looks-like": "A successful launch, event, sale, or promotion",
      "whats-slowing-you-down": "I am not visible enough online",
    });

    for (const service of summary.recommendedServices) {
      expect(service.explanation).not.toMatch(/\bbf-\d{3}\b/);
      expect(service.explanation).not.toMatch(/\bcp-\d{3}\b/);
      expect(service.explanation).not.toMatch(/\bsm-\d{3}\b/);
      expect(service.explanation.toLowerCase()).not.toContain("aligns with");
      expect(service.explanation).not.toContain("Starting fresh");
    }

    expect(summary.recommendedServices.find((s) => s.serviceId === "bf-001")?.explanation).toBe(
      "A clearer, more consistent visual foundation helps your business look ready before you begin promoting it.",
    );
  });
});
