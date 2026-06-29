import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ProjectDetailsFormValues } from "@/config/project-details";
import { resolveCampaignDetailsView } from "@/lib/campaign-details-view";

function mockCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = "2026-06-28T12:00:00.000Z";
  return {
    campaignId: "partial-details-test",
    campaignName: "Partial Details Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Test",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: ["bf-001", "bf-002"],
      includedServiceIds: ["bf-001", "bf-002"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 100000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 100000,
      lineItems: [],
      approvedAt: now,
    },
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: {
        workingOn: "Only working-on filled",
        primaryApproverName: "Client",
        primaryApproverEmail: "client@local.dev",
      } as ProjectDetailsFormValues,
      files: [],
      submittedAt: now,
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("resolveCampaignDetailsView", () => {
  it("does not throw when projectDetails.form has missing optional fields", () => {
    const campaign = mockCampaign();

    expect(() => resolveCampaignDetailsView(campaign)).not.toThrow();

    const view = resolveCampaignDetailsView(campaign);
    expect(view.hasCampaign).toBe(true);
    expect(view.projectDetailsSummary.length).toBeGreaterThan(0);
    expect(view.projectDetailsSummary.every((section) => section.items.length > 0)).toBe(true);
    expect(
      view.projectDetailsSummary.flatMap((section) => section.items).every((item) => item.value.trim()),
    ).toBe(true);
  });

  it("returns empty project details summary when record is absent", () => {
    const campaign = mockCampaign({ projectDetails: undefined });

    const view = resolveCampaignDetailsView(campaign);
    expect(view.hasProjectDetailsSummary).toBe(false);
    expect(view.projectDetailsSummary).toEqual([]);
  });
});
