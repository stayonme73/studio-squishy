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
    "your-challenge": "I am not sure what to say about my business",
    "your-current-tools": "None yet / starting from scratch",
    "your-focus": "Promote an offer, event, or launch",
    "success-looks-like": "A successful launch, event, sale, or promotion",
    "whats-slowing-you-down": "I am not visible enough online",
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

const DEFAULT_FOUNDATION_IDS = ["bf-001", "sm-001", "ma-001"] as const;

describe("recommendFromDiscovery — Slice 4 closeout", () => {
  it("starting fresh → 3 default green foundation SKUs only (not yellow/red legacy)", () => {
    const result = recommendFromDiscovery(buildDiscoveryBrief(answersFor({})));
    const ids = result.recommendations.map((entry) => entry.serviceId);

    expect(ids).toEqual([...DEFAULT_FOUNDATION_IDS]);

    const hidden = ["bf-002", "cp-001", "sms-001", "mo-001", "em-001", "cc-001", "ap-001"] as const;
    for (const serviceId of hidden) {
      expect(ids).not.toContain(serviceId);
    }

    expect(ids.every((id) => !getServiceById(id)?.isExecutionAddOn)).toBe(true);
  });

  it("starting fresh with email tools → em-001 in consider next, not auto-selected", () => {
    const result = recommendFromDiscovery(
      buildDiscoveryBrief(
        answersFor({
          "your-current-tools": "Email list or email platform",
        }),
      ),
    );
    const ids = result.recommendations.map((entry) => entry.serviceId);
    const considerNextIds = result.considerNextRecommendations.map((entry) => entry.serviceId);

    expect(ids).toEqual([...DEFAULT_FOUNDATION_IDS]);
    expect(considerNextIds).toContain("em-001");
    expect(ids).not.toContain("em-001");
  });

  it("all scored recommendations visible in summary — consider next separate from recommended", () => {
    const { recommendation, summary } = runDiscoveryRecommendation(
      answersFor({ "your-current-tools": "Email list or email platform" }),
    );
    const engineIds = recommendation.recommendations.map((entry) => entry.serviceId);
    const summaryIds = summary.recommendedServices.map((service) => service.serviceId);
    const considerNextIds = summary.considerNextServices.map((service) => service.serviceId);

    expect(summaryIds).toEqual(engineIds);
    expect(considerNextIds).toEqual(
      recommendation.considerNextRecommendations.map((entry) => entry.serviceId),
    );
    expect(summary.additionalStudioServices).toHaveLength(0);
    expect(engineIds).toHaveLength(3);
    expect(considerNextIds.length).toBeGreaterThan(0);
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
          "your-situation": "Trying to stay visible more consistently",
          "your-challenge": "I need help promoting something",
          "your-focus": "Create social media content",
          "success-looks-like":
            "Spending less time creating and posting marketing, More consistent social media visibility",
          "whats-slowing-you-down":
            "I do not have time to create or post content, I am not visible enough online",
        }),
      ),
    );

    expect(result.estimatedTimeline.oneTimeLabel).toBeTruthy();
    expect(result.estimatedTimeline.monthlyLabel).toBeTruthy();
    expect(result.estimatedTimeline.customerLabel).toContain("One-time projects:");
    expect(result.estimatedTimeline.customerLabel).toContain("Ongoing monthly:");
  });

  it("technology/tools challenge keeps 3-service default foundation; limited mo-001 stays hidden", () => {
    const foundationResult = recommendFromDiscovery(
      buildDiscoveryBrief(
        answersFor({
          "your-challenge": "My business does not look polished or consistent",
          "your-current-tools": "None yet / starting from scratch",
        }),
      ),
    );
    const foundationIds = foundationResult.recommendations.map((entry) => entry.serviceId);
    expect(foundationIds).toEqual([...DEFAULT_FOUNDATION_IDS]);
    expect(foundationIds).not.toContain("mo-001");
    expect(foundationIds).not.toContain("sms-001");

    const outdatedResult = recommendFromDiscovery(
      buildDiscoveryBrief(
        answersFor({
          "your-situation": "Trying to stay visible more consistently",
          "your-challenge": "My business does not look polished or consistent",
          "your-current-tools": "Website, Email list or email platform",
          "whats-slowing-you-down":
            "My branding looks inconsistent, I am not visible enough online",
        }),
      ),
    );
    expect(outdatedResult.recommendations.map((entry) => entry.serviceId)).not.toContain("mo-001");
  });

  it("growing WITHOUT recurring signals → one-time recommendations, not monthly auto", () => {
    const ids = includedIds(
      answersFor({
        "your-situation": "Trying to stay visible more consistently",
        "your-challenge": "I need help promoting something",
        "your-focus": "Promote an offer, event, or launch",
        "success-looks-like": "A successful launch, event, sale, or promotion",
        "whats-slowing-you-down": "I am not visible enough online",
      }),
    );

    expect(ids.length).toBeGreaterThan(0);
    expect(ids.some((id) => getServiceById(id)?.billingType === "monthly")).toBe(false);
    expect(ids.some((id) => getServiceById(id)?.billingType === "one_time")).toBe(true);
  });

  it("growing WITH recurring/limited time → includes monthly variants", () => {
    const ids = includedIds(
      answersFor({
        "your-situation": "Trying to stay visible more consistently",
        "your-challenge": "I need help promoting something",
        "your-focus": "Create social media content",
        "success-looks-like":
          "Spending less time creating and posting marketing, More consistent social media visibility",
        "whats-slowing-you-down":
          "I do not have time to create or post content, I am not visible enough online",
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

  it("starting fresh → 3 default SKUs sync to initial plan and checkout totals ($1,385)", () => {
    const answers = answersFor({});
    const recommendation = recommendFromDiscovery(buildDiscoveryBrief(answers));
    const recommendedIds = getRecommendedServiceIds(recommendation);

    expect(recommendedIds).toEqual([...DEFAULT_FOUNDATION_IDS]);

    const planState = initialPlanState(recommendedIds);
    expect(planState.selectedServiceIds).toEqual(recommendedIds);

    const plan = buildStudioPlanReview(recommendation, planState);
    expect(plan.selectedServiceIds).toEqual(recommendedIds);
    expect(plan.includedServices.map((service) => service.serviceId)).toEqual(recommendedIds);
    expect(plan.considerNextServices.map((service) => service.serviceId)).toEqual([]);
    expect(plan.additionalStudioServices).toHaveLength(0);
    expect(plan.addedToPlanServices).toHaveLength(0);
    expect(plan.additionalCost.amountUsd).toBe(0);
    expect(plan.planTotals.amountDueTodayCents).toBe(
      computePlanPricingTotals(recommendedIds).amountDueTodayCents,
    );
    expect(plan.planTotals.amountDueTodayCents).toBe(138500);
    expect(plan.planTotals.amountDueTodayDisplay).toBe("$1,385");
  });

  it("starting fresh Why? copy avoids service IDs and rule traces", () => {
    const { summary } = runDiscoveryRecommendation(answersFor({}));

    for (const service of summary.recommendedServices) {
      expect(service.explanation).not.toMatch(/\b[a-z]{2}-\d{3}\b/i);
      expect(service.explanation.toLowerCase()).not.toContain("aligns with");
    }
  });

  it("email tools Why? copy uses natural language for Email Campaign Build in consider next", () => {
    const { summary } = runDiscoveryRecommendation(
      answersFor({ "your-current-tools": "Email list or email platform" }),
    );
    const email = summary.considerNextServices.find((service) => service.serviceId === "em-001");
    expect(email?.explanation).toBe(
      "Email gives you a direct way to reach customers with updates, offers, or announcements.",
    );
    expect(email?.explanation).not.toBe("Email Campaign Build");
  });

  it("does not surface platform access warning without execution add-on selected", () => {
    const { summary, recommendation } = runDiscoveryRecommendation(
      answersFor({ "your-current-tools": "Email list or email platform" }),
    );
    expect(recommendation.considerNextRecommendations.map((entry) => entry.serviceId)).toContain(
      "em-001",
    );
    expect(summary.warnings.some((warning) => warning.kind === "requires-client-access")).toBe(
      false,
    );
  });
});
