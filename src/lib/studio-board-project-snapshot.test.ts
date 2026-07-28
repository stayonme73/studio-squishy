import { describe, expect, it } from "vitest";

import type { CampaignRecord, ApprovedStudioPlanLineItem } from "@/config/studio-board";
import {
  resolveDeliverablesRemaining,
  resolveDeliverablesRemainingSummary,
} from "@/lib/campaign-record";
import {
  PROJECT_SNAPSHOT_DELIVERABLES_UNAVAILABLE,
  resolveProjectSnapshotDeliverables,
} from "@/lib/studio-board-project-snapshot";
import {
  SOCIAL_POSTS_JOB_ID,
  SOCIAL_POSTS_LABEL,
  SOCIAL_POSTS_TOTAL,
} from "@/lib/route-map-social-posts";

function lineItem(
  skuId: string,
  overrides: Partial<ApprovedStudioPlanLineItem> = {},
): ApprovedStudioPlanLineItem {
  return {
    skuId: skuId as ApprovedStudioPlanLineItem["skuId"],
    serviceId: skuId as ApprovedStudioPlanLineItem["skuId"],
    serviceName: overrides.serviceName ?? skuId,
    billingType: "one_time",
    exactPriceCents: 30000,
    priceDisplay: "$300",
    deliverables: ["Primary deliverable"],
    exclusions: [],
    timingWindowLabel: "3–5 days",
    revisionRule: "2 rounds",
    clientResponsibilities: [],
    executionResponsibility: "Studio",
    ...overrides,
  };
}

function approvedPlan(lineItems: ApprovedStudioPlanLineItem[]) {
  return {
    selectedServiceIds: lineItems.map((line) => line.skuId),
    includedServiceIds: lineItems.map((line) => line.skuId),
    additionalServiceIds: [] as const,
    additionalCostUsd: 0,
    oneTimeTotalCents: 30000,
    monthlyTotalCents: 0,
    amountDueTodayCents: 30000,
    lineItems,
    approvedAt: "2026-07-01T09:00:00.000Z",
  };
}

function baseCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "board-truth-2-campaign",
    campaignName: "Board Truth Campaign",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Test",
    estimatedCompletion: "Approximately 7 business days",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: "2026-07-01T12:00:00.000Z",
    targetCompletionDate: null,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [],
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    ...overrides,
  } as CampaignRecord;
}

describe("BOARD-TRUTH-2 project snapshot deliverables honesty", () => {
  it("non-Social-Posts campaign with no real deliverable data does not invent Social Posts", () => {
    const campaign = baseCampaign();
    const view = resolveProjectSnapshotDeliverables(campaign, []);

    expect(view.kind).toBe("unavailable");
    if (view.kind !== "unavailable") return;
    expect(view.message).toBe(PROJECT_SNAPSHOT_DELIVERABLES_UNAVAILABLE);
    expect(JSON.stringify(view)).not.toContain(SOCIAL_POSTS_LABEL);
    expect(JSON.stringify(view)).not.toContain("0 of 4");
  });

  it("non-Social-Posts campaign does not invent a progress bar from empty progress", () => {
    const view = resolveProjectSnapshotDeliverables(baseCampaign(), []);
    expect(view.kind).toBe("unavailable");
  });

  it("package-quota progress alone does not invent snapshot progress without approved plan", () => {
    const campaign = baseCampaign({ packageId: "momentum" });
    const packageProgress = resolveDeliverablesRemaining(campaign);
    const view = resolveProjectSnapshotDeliverables(campaign, packageProgress);
    expect(view.kind).toBe("unavailable");
  });

  it("missing plan data does not produce All deliverables complete", () => {
    const campaign = baseCampaign({
      approvedStudioPlan: approvedPlan([]),
    });
    expect(resolveDeliverablesRemaining(campaign)).toEqual([]);
    expect(resolveDeliverablesRemainingSummary(campaign)).toBeNull();
  });

  it("empty deliverable definition does not produce All deliverables complete", () => {
    const campaign = baseCampaign({
      packageId: "custom-studio-plan",
      approvedStudioPlan: undefined,
    });
    expect(resolveDeliverablesRemaining(campaign)).toEqual([]);
    expect(resolveDeliverablesRemainingSummary(campaign)).toBeNull();
  });

  it("real incomplete deliverables produce truthful remaining state", () => {
    const campaign = baseCampaign({
      approvedStudioPlan: approvedPlan([
        lineItem("ma-flyer-v2", { serviceName: "Flyer Design" }),
      ]),
      deliverablesDelivered: {},
    });
    const progress = resolveDeliverablesRemaining(campaign);
    expect(progress[0]?.remaining).toBeGreaterThan(0);
    expect(resolveDeliverablesRemainingSummary(campaign)).toMatch(/Flyer/i);

    const view = resolveProjectSnapshotDeliverables(campaign, progress);
    expect(view.kind).toBe("progress");
    if (view.kind !== "progress") return;
    expect(view.delivered).toBe(0);
    expect(view.total).toBe(1);
    expect(view.showViewDeliverables).toBe(false);
    expect(view.label).not.toBe(SOCIAL_POSTS_LABEL);
  });

  it("real completed deliverables may produce truthful completion state", () => {
    const campaign = baseCampaign({
      approvedStudioPlan: approvedPlan([
        lineItem("ma-flyer-v2", { serviceName: "Flyer Design" }),
      ]),
      deliverablesDelivered: { "ma-flyer-v2": 1 } as CampaignRecord["deliverablesDelivered"],
    });
    const progress = resolveDeliverablesRemaining(campaign);
    expect(resolveDeliverablesRemainingSummary(campaign)).toBe("All deliverables complete");

    const view = resolveProjectSnapshotDeliverables(campaign, progress);
    expect(view.kind).toBe("progress");
    if (view.kind !== "progress") return;
    expect(view.delivered).toBe(1);
    expect(view.total).toBe(1);
    expect(view.showViewDeliverables).toBe(true);
  });

  it("real Social Posts data displays correct label and real counts", () => {
    const campaign = baseCampaign({
      routeMapContext: {
        roadId: "i20",
        jobId: "v2-rtu-social-posts",
        selectedServiceIds: ["v2-rtu-social-posts"],
        selectedAt: "2026-07-01T12:00:00.000Z",
      },
      deliverablesDelivered: {
        [SOCIAL_POSTS_JOB_ID]: 2,
      },
    });
    const view = resolveProjectSnapshotDeliverables(campaign, []);
    expect(view.kind).toBe("progress");
    if (view.kind !== "progress") return;
    expect(view.label).toBe(SOCIAL_POSTS_LABEL);
    expect(view.delivered).toBe(2);
    expect(view.total).toBe(SOCIAL_POSTS_TOTAL);
    expect(view.showViewDeliverables).toBe(true);
  });

  it("does not use Social Posts total of 4 without Social Posts campaign evidence", () => {
    const view = resolveProjectSnapshotDeliverables(baseCampaign(), [
      {
        id: "logo" as never,
        label: "Something else",
        total: 4,
        delivered: 0,
        remaining: 4,
      },
    ]);
    expect(view.kind).toBe("unavailable");
  });

  it("View deliverables appears only when released or complete counts exist", () => {
    const incomplete = resolveProjectSnapshotDeliverables(
      baseCampaign({
        approvedStudioPlan: approvedPlan([
          lineItem("ma-flyer-v2", { serviceName: "Flyer Design" }),
        ]),
      }),
      [
        {
          id: "ma-flyer-v2" as never,
          label: "Flyer Design",
          total: 1,
          delivered: 0,
          remaining: 1,
        },
      ],
    );
    expect(incomplete.kind).toBe("progress");
    if (incomplete.kind === "progress") {
      expect(incomplete.showViewDeliverables).toBe(false);
    }

    const complete = resolveProjectSnapshotDeliverables(
      baseCampaign({
        routeMapContext: {
          roadId: "i20",
          jobId: "v2-rtu-social-posts",
          selectedServiceIds: ["v2-rtu-social-posts"],
          selectedAt: "2026-07-01T12:00:00.000Z",
        },
        deliverablesDelivered: {
          [SOCIAL_POSTS_JOB_ID]: SOCIAL_POSTS_TOTAL,
        },
      }),
      [],
    );
    expect(complete.kind).toBe("progress");
    if (complete.kind === "progress") {
      expect(complete.showViewDeliverables).toBe(true);
    }
  });
});
