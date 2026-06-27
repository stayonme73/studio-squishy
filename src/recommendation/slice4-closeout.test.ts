import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { buildDiscoverySummary } from "@/discovery-summary/buildDiscoverySummary";
import { buildDiscoveryBrief } from "@/lib/discovery-brief";
import { runDiscoveryRecommendation } from "@/lib/run-discovery-recommendation";
import { recommendFromDiscovery, getRecommendedServiceIds } from "@/recommendation";
import { computePlanPricingTotals } from "@/lib/plan-pricing";
import { buildStudioPlanReview, initialPlanState } from "@/studio-plan-review";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";
import type { ServiceId } from "@/catalog/types";

function answersFor(overrides: Partial<DiscoveryAnswers>): DiscoveryAnswers {
  return {
    "your-business": "Test Co",
    "your-situation": "Starting fresh",
    "your-challenge": "Lack of clarity or direction",
    "your-current-tools": "None yet / starting from scratch",
    "your-focus": "Marketing & growth",
    "success-looks-like": "More leads or customers, Launching something new",
    "whats-slowing-you-down": "Low visibility or reach",
    ...overrides,
  };
}

function recommendedIds(answers: DiscoveryAnswers): ServiceId[] {
  const brief = buildDiscoveryBrief(answers);
  return recommendFromDiscovery(brief).recommendations.map((entry) => entry.serviceId);
}

function includedIds(answers: DiscoveryAnswers): ServiceId[] {
  const brief = buildDiscoveryBrief(answers);
  return recommendFromDiscovery(brief).includedRecommendations.map((entry) => entry.serviceId);
}

const FOUNDATION_IDS = ["bf-001", "bf-002", "cp-001", "sm-001"] as const;

describe("recommendFromDiscovery — Slice 4 closeout", () => {
  it("starting fresh → foundation SKUs bf-001, bf-002, cp-001, sm-001 (not copy/assets/email/sms primary)", () => {
    const result = recommendFromDiscovery(buildDiscoveryBrief(answersFor({})));
    const ids = result.recommendations.map((entry) => entry.serviceId);

    for (const foundationId of FOUNDATION_IDS) {
      expect(ids).toContain(foundationId);
    }

    const supporting = ["cc-001", "ma-001", "em-001", "sms-001"] as const;
    for (const serviceId of supporting) {
      expect(ids).not.toContain(serviceId);
    }

    expect(ids.every((id) => !getServiceById(id)?.isExecutionAddOn)).toBe(true);
  });

  it("all scored recommendations visible in summary — not hidden in additional", () => {
    const { recommendation, summary } = runDiscoveryRecommendation(answersFor({}));
    const engineIds = recommendation.recommendations.map((entry) => entry.serviceId);
    const summaryIds = summary.recommendedServices.map((service) => service.serviceId);

    expect(summaryIds).toEqual(engineIds);
    expect(summary.additionalStudioServices).toHaveLength(0);
    expect(engineIds.length).toBeGreaterThan(1);
  });

  it("timeline derives from catalog windows for one-time foundation services", () => {
    const result = recommendFromDiscovery(buildDiscoveryBrief(answersFor({})));

    expect(result.estimatedTimeline.customerLabel).toContain("business days");
    expect(result.estimatedTimeline.customerLabel).not.toBe("");
    expect(result.estimatedTimeline.totalBusinessDays).toBeGreaterThan(0);
    expect(result.estimatedTimeline.items.length).toBeGreaterThan(0);
    expect(result.estimatedTimeline.items.every((item) => item.customerLabel.length > 0)).toBe(true);
  });

  it("mixed plan timeline distinguishes one-time and monthly", () => {
    const result = recommendFromDiscovery(
      buildDiscoveryBrief(
        answersFor({
          "your-situation": "Growing an existing business",
          "your-challenge": "Marketing and visibility",
          "your-focus": "Content & creative",
          "success-looks-like": "Saving time on marketing, Better engagement online",
          "whats-slowing-you-down": "Limited time or resources, Low visibility or reach",
        }),
      ),
    );

    expect(result.estimatedTimeline.oneTimeLabel).toBeTruthy();
    expect(result.estimatedTimeline.monthlyLabel).toBeTruthy();
    expect(result.estimatedTimeline.customerLabel).toContain("One-time projects:");
    expect(result.estimatedTimeline.customerLabel).toContain("Ongoing monthly:");
  });

  it("technology/tools challenge + no tools strengthens foundation; outdated tools → mo-001", () => {
    const foundationResult = recommendFromDiscovery(
      buildDiscoveryBrief(
        answersFor({
          "your-challenge": "Technology and tools",
          "your-current-tools": "None yet / starting from scratch",
        }),
      ),
    );
    const foundationIds = foundationResult.recommendations.map((entry) => entry.serviceId);
    for (const foundationId of FOUNDATION_IDS) {
      expect(foundationIds).toContain(foundationId);
    }
    expect(foundationIds).not.toContain("em-001");
    expect(foundationIds).not.toContain("sms-001");

    const outdatedResult = recommendFromDiscovery(
      buildDiscoveryBrief(
        answersFor({
          "your-situation": "Growing an existing business",
          "your-challenge": "Technology and tools",
          "your-current-tools": "Website / landing page, Email marketing",
          "whats-slowing-you-down": "Outdated tools or technology, Low visibility or reach",
        }),
      ),
    );
    expect(outdatedResult.recommendations.map((entry) => entry.serviceId)).toContain("mo-001");
  });

  it("growing WITHOUT recurring signals → one-time recommendations, not monthly auto", () => {
    const ids = includedIds(
      answersFor({
        "your-situation": "Growing an existing business",
        "your-challenge": "Marketing and visibility",
        "your-focus": "Marketing & growth",
        "success-looks-like": "More leads or customers",
        "whats-slowing-you-down": "Low visibility or reach",
      }),
    );

    expect(ids.length).toBeGreaterThan(0);
    expect(ids.some((id) => getServiceById(id)?.billingType === "monthly")).toBe(false);
    expect(ids.some((id) => getServiceById(id)?.billingType === "one_time")).toBe(true);
  });

  it("growing WITH recurring/limited time → includes monthly variants", () => {
    const ids = includedIds(
      answersFor({
        "your-situation": "Growing an existing business",
        "your-challenge": "Marketing and visibility",
        "your-focus": "Content & creative",
        "success-looks-like": "Saving time on marketing, Better engagement online",
        "whats-slowing-you-down": "Limited time or resources, Low visibility or reach",
      }),
    );

    expect(ids.some((id) => getServiceById(id)?.billingType === "monthly")).toBe(true);
  });

  it("never recommends execution add-ons in the scoring pool", () => {
    const brief = buildDiscoveryBrief(answersFor({}));
    const result = recommendFromDiscovery(brief);
    const allIds = [
      ...result.recommendations,
      ...result.includedRecommendations,
      ...result.additionalStudioServices,
    ].map((entry) => entry.serviceId);

    expect(allIds.every((id) => !getServiceById(id)?.isExecutionAddOn)).toBe(true);
  });

  it("summary timeline populated from engine catalog windows", () => {
    const { recommendation, summary } = runDiscoveryRecommendation(answersFor({}));
    const built = buildDiscoverySummary(recommendation);

    expect(summary.estimatedTimeline.customerLabel).toBe(built.estimatedTimeline.customerLabel);
    expect(summary.estimatedTimeline.customerLabel.length).toBeGreaterThan(0);
    expect(summary.estimatedTimeline.customerLabel.toLowerCase()).toContain("first review");
    expect(summary.estimatedTimeline.customerLabel.toLowerCase()).toContain("final delivery");
  });

  it("starting fresh → all 4 foundation SKUs sync to initial plan and checkout totals", () => {
    const answers = answersFor({});
    const recommendation = recommendFromDiscovery(buildDiscoveryBrief(answers));
    const recommendedIds = getRecommendedServiceIds(recommendation);

    expect(recommendedIds).toEqual(expect.arrayContaining([...FOUNDATION_IDS]));
    expect(recommendedIds).toHaveLength(FOUNDATION_IDS.length);

    const planState = initialPlanState(recommendedIds);
    expect(planState.selectedServiceIds).toEqual(recommendedIds);

    const plan = buildStudioPlanReview(recommendation, planState);
    expect(plan.selectedServiceIds).toEqual(recommendedIds);
    expect(plan.includedServices.map((service) => service.serviceId)).toEqual(recommendedIds);
    expect(plan.additionalStudioServices).toHaveLength(0);
    expect(plan.addedToPlanServices).toHaveLength(0);
    expect(plan.additionalCost.amountUsd).toBe(0);
    expect(plan.planTotals.amountDueTodayCents).toBe(
      computePlanPricingTotals(recommendedIds).amountDueTodayCents,
    );
    expect(plan.planTotals.amountDueTodayCents).toBe(238000);
    expect(plan.planTotals.amountDueTodayDisplay).toBe("$2,380");
  });

  it("starting fresh Why? copy avoids service IDs and rule traces", () => {
    const { summary } = runDiscoveryRecommendation(answersFor({}));

    for (const service of summary.recommendedServices) {
      expect(service.explanation).not.toMatch(/\b[a-z]{2}-\d{3}\b/i);
      expect(service.explanation.toLowerCase()).not.toContain("aligns with");
    }
  });
});
