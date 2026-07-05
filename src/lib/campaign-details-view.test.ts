import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ProjectDetailsFormValues } from "@/config/project-details";
import { resolveCampaignDetailsView } from "@/lib/campaign-details-view";
import {
  RECORD_EMPTY_ANSWER,
  RECORD_MISSING_SECTION_TITLE,
} from "@/lib/project-record-client-copy";

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

  it("represents an empty Project Record archive with plan but no submitted sections", () => {
    const campaign = mockCampaign({
      campaignStatus: "PAYMENT_RECEIVED",
      projectDetails: undefined,
      visionData: undefined,
    });

    const view = resolveCampaignDetailsView(campaign);
    expect(view.hasCampaign).toBe(true);
    expect(view.packageIncludes.length).toBeGreaterThan(0);
    expect(view.hasProjectDetailsSummary).toBe(false);
    expect(view.hasVisionSummary).toBe(false);
    expect(view.hasRouteMapClientSummary).toBe(false);
  });

  it("represents a complete Project Record archive without missing-at-submission rows", () => {
    const campaign = mockCampaign({
      campaignStatus: "PAYMENT_RECEIVED",
      projectDetails: {
        form: {
          workingOn: "Summer launch social posts",
          mainOffer: "Fresh pastries every morning",
          importantDates: "July 2026",
          callToAction: "Visit the shop",
          destinationLink: "https://example.local/launch",
          mustIncludeExactly: "Include opening-week dates",
          primaryApproverName: "Client",
          primaryApproverEmail: "client@local.dev",
          marketingPieces: "Make My Social Media Posts",
        } as ProjectDetailsFormValues,
        files: [],
        submittedAt: "2026-06-28T12:00:00.000Z",
      },
      approvedStudioPlan: {
        selectedServiceIds: ["v2-rtu-social-posts"],
        includedServiceIds: ["v2-rtu-social-posts"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 45000,
        monthlyTotalCents: 0,
        amountDueTodayCents: 45000,
        lineItems: [
          {
            skuId: "v2-rtu-social-posts",
            serviceName: "Make My Social Media Posts",
            billingType: "one_time",
            exactPriceCents: 45000,
            priceDisplay: "$450",
            deliverables: ["Social posts"],
            exclusions: [],
            timingWindowLabel: "2 weeks",
            revisionRule: "1 round",
            clientResponsibilities: [],
            executionResponsibility: "studio",
          },
        ],
        approvedAt: "2026-06-28T12:00:00.000Z",
      },
    });

    const view = resolveCampaignDetailsView(campaign);
    const items = view.projectDetailsSummary.flatMap((section) => section.items);

    expect(view.hasProjectDetailsSummary).toBe(true);
    expect(view.projectDetailsSummary.some((section) => section.title === RECORD_MISSING_SECTION_TITLE)).toBe(
      false,
    );
    expect(items.some((item) => item.value === RECORD_EMPTY_ANSWER)).toBe(false);
    expect(items.some((item) => item.value === "Summer launch social posts")).toBe(true);
  });

  it("represents a partial Project Record archive without internal placeholders", () => {
    const campaign = mockCampaign({
      campaignStatus: "PAYMENT_RECEIVED",
      projectDetails: {
        form: {
          workingOn: "Client-led Social Posts walkthrough",
          mainOffer: "",
          importantDates: "July 2026 internal walkthrough window",
          primaryApproverName: "Client",
          primaryApproverEmail: "client@local.dev",
          marketingPieces: "Make My Social Media Posts",
        } as ProjectDetailsFormValues,
        files: [],
        submittedAt: "2026-06-28T12:00:00.000Z",
      },
      approvedStudioPlan: {
        selectedServiceIds: ["v2-rtu-social-posts"],
        includedServiceIds: ["v2-rtu-social-posts"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 45000,
        monthlyTotalCents: 0,
        amountDueTodayCents: 45000,
        lineItems: [
          {
            skuId: "v2-rtu-social-posts",
            serviceName: "Make My Social Media Posts",
            billingType: "one_time",
            exactPriceCents: 45000,
            priceDisplay: "$450",
            deliverables: ["Social posts"],
            exclusions: [],
            timingWindowLabel: "2 weeks",
            revisionRule: "1 round",
            clientResponsibilities: [],
            executionResponsibility: "studio",
          },
        ],
        approvedAt: "2026-06-28T12:00:00.000Z",
      },
    });

    const view = resolveCampaignDetailsView(campaign);
    const items = view.projectDetailsSummary.flatMap((section) => section.items);

    expect(view.hasProjectDetailsSummary).toBe(true);
    expect(items.some((item) => item.value === "Client-led Social Posts walkthrough")).toBe(true);
    expect(items.some((item) => item.value === RECORD_EMPTY_ANSWER)).toBe(false);
    expect(items.some((item) => item.value === "Required")).toBe(false);
    expect(items.some((item) => item.value === "NA")).toBe(false);
  });

  it("represents a locked Project Record archive with full submitted content", () => {
    const campaign = mockCampaign({
      campaignStatus: "BUILDING_CONCEPTS",
      approvedStudioPlan: {
        selectedServiceIds: ["v2-rtu-social-posts"],
        includedServiceIds: ["v2-rtu-social-posts"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 45000,
        monthlyTotalCents: 0,
        amountDueTodayCents: 45000,
        lineItems: [
          {
            skuId: "v2-rtu-social-posts",
            serviceName: "Make My Social Media Posts",
            billingType: "one_time",
            exactPriceCents: 45000,
            priceDisplay: "$450",
            deliverables: ["Social posts"],
            exclusions: [],
            timingWindowLabel: "2 weeks",
            revisionRule: "1 round",
            clientResponsibilities: [],
            executionResponsibility: "studio",
          },
        ],
        approvedAt: "2026-06-28T12:00:00.000Z",
      },
      projectDetails: {
        form: {
          workingOn: "Summer launch social posts",
          mainOffer: "Fresh pastries every morning",
          importantDates: "July 2026",
          callToAction: "Visit the shop",
          destinationLink: "https://example.local/launch",
          mustIncludeExactly: "Include opening-week dates",
          primaryApproverName: "Client",
          primaryApproverEmail: "client@local.dev",
          marketingPieces: "Make My Social Media Posts",
          socialPlatforms: "Instagram feed, square 1080 x 1080 px",
          socialAccountLinks: "@tagiabakery",
        } as ProjectDetailsFormValues,
        files: [],
        submittedAt: "2026-06-28T12:00:00.000Z",
      },
    });

    const view = resolveCampaignDetailsView(campaign);
    expect(view.status).toBe("BUILDING_CONCEPTS");
    expect(view.hasProjectDetailsSummary).toBe(true);
    expect(
      view.projectDetailsSummary.some((section) => section.title === RECORD_MISSING_SECTION_TITLE),
    ).toBe(false);
  });

  it("uses client-friendly copy for missing project details and internal placeholders", () => {
    const campaign = mockCampaign({
      projectDetails: {
        form: {
          workingOn: "NA",
          mainOffer: "Spring launch",
          primaryApproverName: "Client",
          primaryApproverEmail: "client@local.dev",
        } as ProjectDetailsFormValues,
        files: [],
        submittedAt: "2026-06-28T12:00:00.000Z",
      },
    });

    const view = resolveCampaignDetailsView(campaign);
    const items = view.projectDetailsSummary.flatMap((section) => section.items);

    expect(items.some((item) => item.value === "NA")).toBe(false);
    expect(items.some((item) => item.value === RECORD_EMPTY_ANSWER)).toBe(true);
    expect(items.some((item) => item.value === "Spring launch")).toBe(true);

    const missingSection = view.projectDetailsSummary.find(
      (section) => section.title === RECORD_MISSING_SECTION_TITLE,
    );
    if (missingSection) {
      expect(missingSection.items.every((item) => item.value === RECORD_EMPTY_ANSWER)).toBe(true);
      expect(missingSection.items.some((item) => item.value === "Required")).toBe(false);
    }
  });
});
