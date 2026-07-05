import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  SOCIAL_POSTS_JOB_ID,
  SOCIAL_POSTS_LABEL,
  SOCIAL_POSTS_TOTAL,
  isSocialPostsCampaign,
  resolveSocialPostsDeliveredCount,
} from "@/lib/route-map-social-posts";

const now = "2026-06-01T12:00:00.000Z";

function baseCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "social-posts-test",
    campaignName: "Social Posts Test",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("route-map-social-posts helpers", () => {
  it("detects social posts via routeMapContext job id", () => {
    expect(
      isSocialPostsCampaign(
        baseCampaign({
          routeMapContext: {
            jobId: SOCIAL_POSTS_JOB_ID,
            roadId: "social",
            selectedAt: now,
          },
        }),
      ),
    ).toBe(true);
  });

  it("detects social posts via approved plan line item sku", () => {
    expect(
      isSocialPostsCampaign(
        baseCampaign({
          approvedStudioPlan: {
            selectedServiceIds: [SOCIAL_POSTS_JOB_ID],
            includedServiceIds: [SOCIAL_POSTS_JOB_ID],
            additionalServiceIds: [],
            additionalCostUsd: 0,
            oneTimeTotalCents: 40000,
            monthlyTotalCents: 0,
            amountDueTodayCents: 40000,
            approvedAt: now,
            lineItems: [
              {
                skuId: SOCIAL_POSTS_JOB_ID,
                serviceName: SOCIAL_POSTS_LABEL,
                billingType: "one_time",
                exactPriceCents: 40000,
                priceDisplay: "$400",
                deliverables: ["Posts"],
                exclusions: [],
                timingWindowLabel: "2 days",
                revisionRule: "1 round",
                clientResponsibilities: [],
                executionResponsibility: "studio",
              },
            ],
          },
        }),
      ),
    ).toBe(true);
  });

  it("resolveSocialPostsDeliveredCount caps at SOCIAL_POSTS_TOTAL", () => {
    expect(
      resolveSocialPostsDeliveredCount(
        baseCampaign({
          deliverablesDelivered: { [SOCIAL_POSTS_JOB_ID]: 99 },
        }),
      ),
    ).toBe(SOCIAL_POSTS_TOTAL);
  });
});
