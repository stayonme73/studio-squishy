import { describe, expect, it } from "vitest";

import type { ApprovedStudioPlanLineItem, CampaignRecord } from "@/config/studio-board";

import {
  consolidatedRequestId,
  resolveConsolidatedClientRequests,
  resolveOptionalClientRequests,
  resolveUnderlyingItemIdsForConsolidated,
} from "./client-requests";
import { buildMaterialsRecordFromCampaign } from "./migrate-from-project-details";
import type { CampaignMaterialItem } from "./types";

const now = "2026-06-01T12:00:00.000Z";

function buildCampaign(lineItems: ApprovedStudioPlanLineItem[]): CampaignRecord {
  return {
    campaignId: "consolidation-test",
    campaignName: "Consolidation Test",
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
      oneTimeTotalCents: 150000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 150000,
      lineItems,
      approvedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function lineItem(
  skuId: ApprovedStudioPlanLineItem["skuId"],
  serviceName: string,
): ApprovedStudioPlanLineItem {
  return {
    skuId,
    serviceName,
    billingType: "one_time",
    exactPriceCents: 50000,
    priceDisplay: "$500",
    deliverables: [],
    exclusions: [],
    timingWindowLabel: "2 weeks",
    revisionRule: "1 round",
    clientResponsibilities: ["Existing logo files if available"],
    executionResponsibility: "studio",
  };
}

describe("resolveConsolidatedClientRequests", () => {
  it("consolidates three logo-brand slots into one client request", () => {
    const record = buildMaterialsRecordFromCampaign(
      buildCampaign([
        lineItem("bf-001", "Brand Identity Refresh"),
        lineItem("bf-002", "Marketing Video Project"),
        lineItem("sm-001", "Social Media Launch Set"),
      ]),
    );

    const logoItems = record.items.filter(
      (item) => item.category === "logo-brand" && item.requirementLevel === "required",
    );
    expect(logoItems.length).toBeGreaterThanOrEqual(3);

    const consolidated = resolveConsolidatedClientRequests(record);
    const logoRequest = consolidated.find((request) => request.id === "logo-brand:file-metadata");

    expect(logoRequest).toBeDefined();
    expect(consolidated.filter((request) => request.category === "logo-brand")).toHaveLength(1);
    expect(logoRequest?.underlyingItemIds.length).toBeGreaterThanOrEqual(3);
    expect(logoRequest?.reason).toContain("Brand Identity Refresh");
    expect(logoRequest?.reason).toContain("Marketing Video Project");
    expect(logoRequest?.reason).toContain("Social Media Launch Set");
    expect(logoRequest?.prompt).toMatch(/logo file/i);
  });

  it("maps consolidated submit back to all underlying blocking slots", () => {
    const items: CampaignMaterialItem[] = [
      {
        id: "logo-brand-bf-001-slot",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Logo & brand assets",
        reason: "Brand Foundation",
        relatedServiceIds: ["bf-001"],
        uploadStatus: "none",
      },
      {
        id: "logo-brand-bf-002-slot",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Logo & brand assets",
        reason: "Brand Refresh",
        relatedServiceIds: ["bf-002"],
        uploadStatus: "none",
      },
    ];

    const record = {
      campaignId: "c-1",
      items,
      updatedAt: now,
      version: 1,
    };

    const consolidatedId = consolidatedRequestId("logo-brand", "file-metadata");
    expect(resolveUnderlyingItemIdsForConsolidated(record, consolidatedId)).toEqual([
      "logo-brand-bf-001-slot",
      "logo-brand-bf-002-slot",
    ]);
  });
});

describe("resolveOptionalClientRequests", () => {
  it("returns only optional missing-like items", () => {
    const record = {
      campaignId: "c-2",
      items: [
        {
          id: "opt-1",
          category: "other" as const,
          requirementLevel: "optional" as const,
          reviewStatus: "missing" as const,
          contentKind: "text" as const,
          label: "Extra reference",
          reason: "Content Creation",
          relatedServiceIds: ["cc-001"] as const,
          uploadStatus: "none" as const,
        },
        {
          id: "req-1",
          category: "logo-brand" as const,
          requirementLevel: "required" as const,
          reviewStatus: "missing" as const,
          contentKind: "file-metadata" as const,
          label: "Logo",
          reason: "Brand Foundation",
          relatedServiceIds: ["bf-001"] as const,
          uploadStatus: "none" as const,
        },
      ],
      updatedAt: now,
      version: 1,
    };

    expect(resolveOptionalClientRequests(record)).toHaveLength(1);
    expect(resolveOptionalClientRequests(record)[0]?.itemId).toBe("opt-1");
  });
});
