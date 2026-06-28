import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { buildServiceScopeSnapshot } from "@/lib/plan-pricing";
import { resolveDeliverablesView } from "@/lib/deliverables-view";

function campaignWithPlan(
  serviceIds: readonly string[],
  overrides: Partial<CampaignRecord> = {},
): CampaignRecord {
  const lineItems = buildServiceScopeSnapshot(serviceIds as never);
  const oneTimeTotalCents = lineItems.reduce((sum, line) => sum + line.exactPriceCents, 0);
  const now = "2026-06-28T12:00:00.000Z";
  return {
    campaignId: "preview-test",
    campaignName: "Preview Test Campaign",
    campaignStatus: "DELIVERED",
    campaignDescription: "Test",
    estimatedCompletion: "Soon",
    packageId: "spark",
    packageLabel: "Spark Plan",
    approvedStudioPlan: {
      selectedServiceIds: [...serviceIds] as never,
      includedServiceIds: [...serviceIds] as never,
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: oneTimeTotalCents,
      lineItems,
      approvedAt: now,
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("resolveDeliverablesView", () => {
  it("preview without campaign returns no-campaign — no invented deliverables", () => {
    const view = resolveDeliverablesView(null, { previewDelivered: true });

    expect(view.state).toBe("no-campaign");
    expect(view.package).toBeNull();
  });

  it("preview with frozen approved plan scopes deliverables to purchased services", () => {
    const campaign = campaignWithPlan(["bf-001", "sm-001"]);
    const view = resolveDeliverablesView(campaign, { previewDelivered: true });

    expect(view.state).toBe("ready");
    expect(view.package).not.toBeNull();
    expect(view.package!.scopeSections.map((s) => s.sectionId)).toEqual(["brand-direction-assets"]);
    expect(view.package!.socialPosts.length).toBeGreaterThan(0);
    expect(view.package!.emails).toEqual([]);
    expect(view.package!.smsMessages).toEqual([]);
    expect(view.package!.videoScripts).toEqual([]);
    expect(view.package!.calendar).toEqual([]);
  });
});
