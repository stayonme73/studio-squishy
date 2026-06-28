import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { buildProjectDetailsPrefill } from "@/lib/project-details-prefill";
import { BUSINESS_OFFER_DELIMITER } from "@/lib/business-discovery-completion";

describe("buildProjectDetailsPrefill", () => {
  it("maps discovery answers and approved plan services", () => {
    const campaign: CampaignRecord = {
      campaignId: "c1",
      campaignName: "Test Co Campaign",
      campaignStatus: "PAYMENT_RECEIVED",
      campaignDescription: "",
      estimatedCompletion: "",
      packageId: "momentum",
      packageLabel: "Momentum Plan",
      paymentReceivedAt: "2026-06-27T12:00:00.000Z",
      createdAt: "2026-06-27T12:00:00.000Z",
      updatedAt: "2026-06-27T12:00:00.000Z",
      discoveryAnswers: {
        "your-business": `Tagia Bakery${BUSINESS_OFFER_DELIMITER}Fresh pastries daily`,
        "your-situation": "Growing local awareness",
      },
      approvedStudioPlan: {
        selectedServiceIds: ["bf-001", "sm-001"],
        includedServiceIds: ["bf-001", "sm-001"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 100,
        monthlyTotalCents: 0,
        amountDueTodayCents: 100,
        lineItems: [
          {
            skuId: "bf-001",
            serviceName: "Brand Foundation",
            billingType: "one_time",
            exactPriceCents: 49500,
            priceDisplay: "$495",
            deliverables: [],
            exclusions: [],
            timingWindowLabel: "2 weeks",
            revisionRule: "1 round",
            clientResponsibilities: [],
            executionResponsibility: "studio",
          },
          {
            skuId: "sm-001",
            serviceName: "Social Media",
            billingType: "one_time",
            exactPriceCents: 32500,
            priceDisplay: "$325",
            deliverables: [],
            exclusions: [],
            timingWindowLabel: "2 weeks",
            revisionRule: "1 round",
            clientResponsibilities: [],
            executionResponsibility: "studio",
          },
        ],
        approvedAt: "2026-06-27T12:00:00.000Z",
      },
    };

    const prefill = buildProjectDetailsPrefill(campaign);
    expect(prefill.businessName).toBe("Tagia Bakery");
    expect(prefill.businessOffer).toBe("Fresh pastries daily");
    expect(prefill.selectedServices.map((s) => s.serviceName)).toEqual([
      "Brand Identity Refresh",
      "Social Media Launch Set",
    ]);
    expect(prefill.discoverySummary.length).toBeGreaterThan(0);
  });
});
