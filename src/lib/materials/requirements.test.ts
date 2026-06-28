import { describe, expect, it } from "vitest";

import type { ApprovedStudioPlanLineItem, CampaignRecord } from "@/config/studio-board";

import { resolveMaterialSlotsFromCampaign } from "./requirements";

const now = "2026-06-01T12:00:00.000Z";

function buildCampaign(lineItems: ApprovedStudioPlanLineItem[]): CampaignRecord {
  return {
    campaignId: "materials-test",
    campaignName: "Materials Test",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: lineItems.map((item) => item.skuId),
      includedServiceIds: lineItems.map((item) => item.skuId),
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 50000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 50000,
      lineItems,
      approvedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

describe("resolveMaterialSlotsFromCampaign", () => {
  it("returns no slots when approved plan is missing", () => {
    const campaign: CampaignRecord = {
      campaignId: "empty",
      campaignName: "Empty",
      campaignStatus: "DISCOVERY_COMPLETE",
      campaignDescription: "",
      estimatedCompletion: "",
      packageId: "custom-studio-plan",
      packageLabel: "",
      createdAt: now,
      updatedAt: now,
    };
    expect(resolveMaterialSlotsFromCampaign(campaign)).toEqual([]);
  });

  it("creates logo-brand slot from Brand Foundation line item", () => {
    const slots = resolveMaterialSlotsFromCampaign(
      buildCampaign([
        {
          skuId: "bf-001",
          serviceName: "Brand Foundation",
          billingType: "one_time",
          exactPriceCents: 50000,
          priceDisplay: "$500",
          deliverables: ["Brand guide PDF"],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: ["Existing logo files if available"],
          executionResponsibility: "studio",
        },
      ]),
    );

    expect(slots.some((slot) => slot.category === "logo-brand")).toBe(true);
    expect(slots.find((slot) => slot.category === "logo-brand")?.reason).toBe("Brand Foundation");
    expect(slots.find((slot) => slot.category === "logo-brand")?.requirementLevel).toBe("required");
  });

  it("dedupes categories per service and ties reason to service name", () => {
    const slots = resolveMaterialSlotsFromCampaign(
      buildCampaign([
        {
          skuId: "sm-001",
          serviceName: "Social Media Management",
          billingType: "monthly",
          exactPriceCents: 0,
          priceDisplay: "$0/mo",
          deliverables: ["Posts"],
          exclusions: [],
          timingWindowLabel: "Monthly",
          revisionRule: "1 round",
          clientResponsibilities: ["Photos and social account access"],
          executionResponsibility: "shared",
        },
      ]),
    );

    const categories = slots.map((slot) => slot.category);
    expect(new Set(categories).size).toBe(categories.length);
    expect(slots.every((slot) => slot.reason === "Social Media Management")).toBe(true);
    expect(categories).toContain("photo-video");
    expect(categories).toContain("access-instructions");
  });

  it("resolves slots from multiple approved line items", () => {
    const slots = resolveMaterialSlotsFromCampaign(
      buildCampaign([
        {
          skuId: "bf-001",
          serviceName: "Brand Foundation",
          billingType: "one_time",
          exactPriceCents: 50000,
          priceDisplay: "$500",
          deliverables: [],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: [],
          executionResponsibility: "studio",
        },
        {
          skuId: "cc-001",
          serviceName: "Content Creation",
          billingType: "one_time",
          exactPriceCents: 30000,
          priceDisplay: "$300",
          deliverables: [],
          exclusions: [],
          timingWindowLabel: "1 week",
          revisionRule: "1 round",
          clientResponsibilities: ["Required wording and factual claims"],
          executionResponsibility: "studio",
        },
      ]),
    );

    const reasons = new Set(slots.map((slot) => slot.reason));
    expect(reasons.has("Brand Foundation")).toBe(true);
    expect(reasons.has("Content Creation")).toBe(true);
  });
});
