import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { buildJobId } from "@/lib/job-control/lane-map";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import {
  findProductionPlanLineForJob,
  lineSkuId,
  requiredDeliverablesForJob,
} from "./approved-plan-line";

function lineItem(
  skuId: string,
  deliverables: string[],
  overrides: Partial<{ serviceId: string; serviceName: string }> = {},
) {
  return {
    skuId,
    serviceId: overrides.serviceId ?? skuId,
    serviceName: overrides.serviceName ?? skuId,
    billingType: "one_time" as const,
    exactPriceCents: 30000,
    priceDisplay: "$300",
    deliverables,
    exclusions: [],
    timingWindowLabel: "3–5 days",
    revisionRule: "2 rounds",
    clientResponsibilities: [],
    executionResponsibility: "Studio",
  };
}

function campaign(lineItems: ReturnType<typeof lineItem>[]): CampaignRecord {
  return {
    campaignId: "apl-test",
    campaignName: "APL Test",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "July 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    approvedStudioPlan: {
      selectedServiceIds: lineItems.map((line) => line.skuId),
      includedServiceIds: lineItems.map((line) => line.skuId),
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 30000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 30000,
      lineItems,
      approvedAt: "2026-07-01T09:00:00.000Z",
    },
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
  } as CampaignRecord;
}

function job(skuId: string): PurchasedJobRecord {
  return {
    jobId: buildJobId("apl-test", skuId),
    campaignId: "apl-test",
    skuId,
    serviceName: skuId,
    spineStatus: "ready_for_review",
    productionLane: "quick",
    intakeComplete: true,
    updatedAt: "2026-07-03T12:00:00.000Z",
  };
}

describe("approved-plan-line helpers", () => {
  it("lineSkuId prefers skuId over legacy serviceId", () => {
    expect(lineSkuId({ skuId: "sm-001", serviceId: "legacy" })).toBe("sm-001");
    expect(lineSkuId({ serviceId: "sm-001" })).toBe("sm-001");
  });

  it("findProductionPlanLineForJob matches frozen line by job skuId", () => {
    const record = campaign([
      lineItem("sm-001", ["Post concepts"], { serviceName: "Social Launch" }),
    ]);
    const matched = findProductionPlanLineForJob(record, job("sm-001"));
    expect(matched?.serviceName).toBe("Social Launch");
    expect(matched?.deliverables).toEqual(["Post concepts"]);
  });

  it("findProductionPlanLineForJob returns undefined when plan or line missing", () => {
    const record = campaign([lineItem("sm-001", ["Post concepts"])]);
    expect(findProductionPlanLineForJob(record, job("unknown"))).toBeUndefined();
    expect(
      findProductionPlanLineForJob(
        { ...record, approvedStudioPlan: undefined } as CampaignRecord,
        job("sm-001"),
      ),
    ).toBeUndefined();
  });

  it("findProductionPlanLineForJob excludes execution add-on lines", () => {
    const record = campaign([
      lineItem("sm-001", ["Post concepts"]),
      lineItem("social_media-execution", ["Monthly posts"]),
    ]);
    expect(findProductionPlanLineForJob(record, job("social_media-execution"))).toBeUndefined();
    expect(findProductionPlanLineForJob(record, job("sm-001"))?.deliverables).toEqual([
      "Post concepts",
    ]);
  });

  it("requiredDeliverablesForJob returns frozen deliverables only", () => {
    const record = campaign([
      lineItem("sm-001", ["Post concepts", "Caption copy"]),
      lineItem("ma-flyer-v2", ["Print-ready flyer"]),
    ]);
    expect(requiredDeliverablesForJob(record, job("sm-001"))).toEqual([
      "Post concepts",
      "Caption copy",
    ]);
    expect(requiredDeliverablesForJob(record, job("ma-flyer-v2"))).toEqual(["Print-ready flyer"]);
    expect(requiredDeliverablesForJob(record, job("missing"))).toEqual([]);
  });

  it("lineSkuId matches legacy serviceId fallback used by deliverable-scope consumers", () => {
    const legacyLine = {
      serviceId: "sm-001",
      serviceName: "Legacy Social",
      billingType: "one_time" as const,
      exactPriceCents: 30000,
      priceDisplay: "$300",
      deliverables: ["Post concepts"],
      exclusions: [],
      timingWindowLabel: "3–5 days",
      revisionRule: "1 round",
      clientResponsibilities: [],
      executionResponsibility: "Studio",
    };
    expect(lineSkuId(legacyLine)).toBe("sm-001");
    expect(findProductionPlanLineForJob(campaign([lineItem("sm-001", ["Post concepts"])]), job("sm-001"))).toBeDefined();
  });
});
