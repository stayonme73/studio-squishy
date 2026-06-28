import { describe, expect, it } from "vitest";
import type { ServiceId } from "@/catalog/types";
import {
  addServiceToPlan,
  buildStudioPlanReview,
  initialPlanState,
  removeServiceFromPlan,
} from "@/studio-plan-review";
import type { RecommendationResult } from "@/recommendation/types";

function mockRecommendation(
  serviceIds: ServiceId[],
  considerNextIds: ServiceId[] = [],
): RecommendationResult {
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
    considerNextRecommendations: considerNextIds.map((serviceId, index) => ({
      serviceId,
      score: 0.5,
      matchedRules: [],
      reasons: [],
      rank: index + 1,
    })),
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

describe("buildStudioPlanReview — live plan sync", () => {
  it("Included Services lists every selected service once", () => {
    const recommendation = mockRecommendation(
      ["bf-001", "sm-001", "ma-001"] as ServiceId[],
      ["sm-001-monthly"] as ServiceId[],
    );
    const planState = addServiceToPlan(
      initialPlanState(["bf-001", "sm-001", "ma-001"] as ServiceId[]),
      "sm-001-monthly",
    );
    const plan = buildStudioPlanReview(recommendation, planState);

    expect(plan.includedServices.map((service) => service.serviceId)).toEqual([
      "bf-001",
      "sm-001",
      "ma-001",
      "sm-001-monthly",
    ]);
    expect(plan.additionalStudioServices).toHaveLength(0);
    expect(plan.considerNextServices.map((service) => service.serviceId)).toEqual([]);
  });

  it("drops removed recommended services from Included Services", () => {
    const recommendation = mockRecommendation(["bf-001", "sm-001", "ma-001"] as ServiceId[]);
    const planState = removeServiceFromPlan(
      initialPlanState(["bf-001", "sm-001", "ma-001"] as ServiceId[]),
      "bf-001",
    );
    const plan = buildStudioPlanReview(recommendation, planState);

    expect(plan.includedServices.map((service) => service.serviceId)).toEqual(["sm-001", "ma-001"]);
    expect(plan.selectedServiceIds).not.toContain("bf-001");
  });
});
