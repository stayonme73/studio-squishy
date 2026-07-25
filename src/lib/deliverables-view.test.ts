import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  allowsFullCompletionLanguage,
  HONEST_DELIVERY_COPY,
  resolveDeliverablesView,
} from "@/lib/deliverables-view";
import type { FinalDeliveryView } from "@/lib/job-control/final-delivery-view";
import { buildServiceScopeSnapshot } from "@/lib/plan-pricing";

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

function jobView(
  overrides: Partial<FinalDeliveryView["jobs"][number]> & { jobId: string; serviceName: string },
): FinalDeliveryView["jobs"][number] {
  return {
    spineStatus: "delivered",
    deliveredAt: "2026-06-28T12:00:00.000Z",
    completedDeliverables: ["Asset"],
    files: [],
    ...overrides,
  };
}

function delivery(overrides: Partial<FinalDeliveryView> = {}): FinalDeliveryView {
  return {
    state: "ready",
    campaignName: "Preview Test Campaign",
    jobs: [],
    hasDeliveredJobs: false,
    allJobsDelivered: false,
    ...overrides,
  };
}

describe("resolveDeliverablesView — Honest Final Files", () => {
  it("production DELIVERED with no finalDelivery does not build a mock package", () => {
    const campaign = campaignWithPlan(["bf-001", "sm-001"]);
    const view = resolveDeliverablesView(campaign);

    expect(view.state).toBe("delivered-no-files");
    expect(view.package).toBeNull();
    expect(view.useJobDelivery).toBe(false);
    expect(view.allowsFullCompletionLanguage).toBe(false);
  });

  it("production ignores previewDevelopmentOnly=false even when campaign is DELIVERED", () => {
    const campaign = campaignWithPlan(["bf-001"]);
    const view = resolveDeliverablesView(campaign, { previewDevelopmentOnly: false });

    expect(view.state).toBe("delivered-no-files");
    expect(view.package).toBeNull();
  });

  it("development preview still builds generated content when explicitly gated", () => {
    const campaign = campaignWithPlan(["bf-001", "sm-001"]);
    const view = resolveDeliverablesView(campaign, { previewDevelopmentOnly: true });

    expect(view.state).toBe("preview-development-only");
    expect(view.package).not.toBeNull();
    expect(view.package!.scopeSections.map((s) => s.sectionId)).toEqual(["brand-direction-assets"]);
    expect(view.package!.socialPosts.length).toBeGreaterThan(0);
    expect(view.allowsFullCompletionLanguage).toBe(false);
  });

  it("development preview without campaign returns no-campaign — no invented deliverables", () => {
    const view = resolveDeliverablesView(null, { previewDevelopmentOnly: true });

    expect(view.state).toBe("no-campaign");
    expect(view.package).toBeNull();
  });

  it("real released files render as files-ready with full completion when every active job has files", () => {
    const campaign = campaignWithPlan(["sm-001"]);
    const finalDelivery = delivery({
      allJobsDelivered: true,
      hasDeliveredJobs: true,
      jobs: [
        jobView({
          jobId: "job-1",
          serviceName: "Social",
          files: [
            {
              id: "f1",
              deliverableLabel: "Post set",
              fileName: "posts.zip",
              fileType: "zip",
              url: "/api/file-room/files/f1/download",
              useInstructions: null,
              addedAt: "2026-06-28T12:00:00.000Z",
              versionLabel: "v1",
              releasedAt: "2026-06-28T12:00:00.000Z",
            },
          ],
        }),
      ],
    });

    const view = resolveDeliverablesView(campaign, { finalDelivery });

    expect(view.state).toBe("files-ready");
    expect(view.package).toBeNull();
    expect(view.useJobDelivery).toBe(true);
    expect(view.allowsFullCompletionLanguage).toBe(true);
    expect(view.finalDelivery?.jobs[0]?.files).toHaveLength(1);
  });

  it("partial delivery uses truthful in-progress language when some jobs are not delivered", () => {
    const campaign = campaignWithPlan(["sm-001", "em-001"], {
      campaignStatus: "BUILDING_CONCEPTS",
    });
    const finalDelivery = delivery({
      allJobsDelivered: false,
      hasDeliveredJobs: true,
      jobs: [
        jobView({
          jobId: "job-1",
          serviceName: "Social",
          files: [
            {
              id: "f1",
              deliverableLabel: "Posts",
              fileName: "a.zip",
              fileType: "zip",
              url: "/files/a",
              useInstructions: null,
              addedAt: "2026-06-28T12:00:00.000Z",
              versionLabel: null,
              releasedAt: "2026-06-28T12:00:00.000Z",
            },
          ],
        }),
        jobView({
          jobId: "job-2",
          serviceName: "Email",
          spineStatus: "building_concepts",
          deliveredAt: null,
          files: [],
        }),
      ],
    });

    const view = resolveDeliverablesView(campaign, { finalDelivery });

    expect(view.state).toBe("partial-files-ready");
    expect(view.partialVariant).toBe("in-progress");
    expect(view.allowsFullCompletionLanguage).toBe(false);
    expect(view.statusLabel).toBe(HONEST_DELIVERY_COPY.partialInProgress.badge);
  });

  it("delivered jobs with some missing files use some-files-missing language", () => {
    const campaign = campaignWithPlan(["sm-001", "em-001"]);
    const finalDelivery = delivery({
      allJobsDelivered: true,
      hasDeliveredJobs: true,
      jobs: [
        jobView({
          jobId: "job-1",
          serviceName: "Social",
          files: [
            {
              id: "f1",
              deliverableLabel: "Posts",
              fileName: "a.zip",
              fileType: "zip",
              url: "/files/a",
              useInstructions: null,
              addedAt: "2026-06-28T12:00:00.000Z",
              versionLabel: null,
              releasedAt: "2026-06-28T12:00:00.000Z",
            },
          ],
        }),
        jobView({
          jobId: "job-2",
          serviceName: "Email",
          files: [],
        }),
      ],
    });

    const view = resolveDeliverablesView(campaign, { finalDelivery });

    expect(view.state).toBe("partial-files-ready");
    expect(view.partialVariant).toBe("some-files-missing");
    expect(view.allowsFullCompletionLanguage).toBe(false);
  });

  it("all delivered with zero released files is delivered-no-files — never completion", () => {
    const campaign = campaignWithPlan(["sm-001"]);
    const finalDelivery = delivery({
      allJobsDelivered: true,
      hasDeliveredJobs: true,
      jobs: [jobView({ jobId: "job-1", serviceName: "Social", files: [] })],
    });

    const view = resolveDeliverablesView(campaign, { finalDelivery });

    expect(view.state).toBe("delivered-no-files");
    expect(view.package).toBeNull();
    expect(view.allowsFullCompletionLanguage).toBe(false);
    expect(view.useJobDelivery).toBe(true);
  });

  it("BUILDING campaign without delivery jobs stays preparing — not delivered-no-files", () => {
    const campaign = campaignWithPlan(["sm-001"], {
      campaignStatus: "BUILDING_CONCEPTS",
    });
    const view = resolveDeliverablesView(campaign, {
      finalDelivery: {
        state: "preparing",
        campaignName: campaign.campaignName,
        jobs: [],
        hasDeliveredJobs: false,
        allJobsDelivered: false,
      },
    });

    expect(view.state).toBe("preparing");
    expect(view.package).toBeNull();
  });

  it("omits selected option when absent — does not invent Option A", () => {
    const campaign = campaignWithPlan(["sm-001"], {
      selectedCampaignOption: undefined,
    });
    const view = resolveDeliverablesView(campaign);

    expect(view.selectedOption).toBeNull();
  });

  it("preserves selected option when present", () => {
    const campaign = campaignWithPlan(["sm-001"], {
      selectedCampaignOption: "Option B (Balanced)",
    });
    const view = resolveDeliverablesView(campaign);

    expect(view.selectedOption).toBe("Option B (Balanced)");
  });

  it("real job delivery wins over development preview flag", () => {
    const campaign = campaignWithPlan(["sm-001"]);
    const finalDelivery = delivery({
      allJobsDelivered: true,
      hasDeliveredJobs: true,
      jobs: [
        jobView({
          jobId: "job-1",
          serviceName: "Social",
          files: [
            {
              id: "f1",
              deliverableLabel: "Posts",
              fileName: "a.zip",
              fileType: "zip",
              url: "/files/a",
              useInstructions: null,
              addedAt: "2026-06-28T12:00:00.000Z",
              versionLabel: null,
              releasedAt: "2026-06-28T12:00:00.000Z",
            },
          ],
        }),
      ],
    });

    const view = resolveDeliverablesView(campaign, {
      previewDevelopmentOnly: true,
      finalDelivery,
    });

    expect(view.state).toBe("files-ready");
    expect(view.package).toBeNull();
  });
});

describe("allowsFullCompletionLanguage", () => {
  it("requires active jobs, all delivered, and released files on every job", () => {
    expect(
      allowsFullCompletionLanguage(
        delivery({
          allJobsDelivered: true,
          jobs: [jobView({ jobId: "j1", serviceName: "A", files: [] })],
        }),
      ),
    ).toBe(false);

    expect(
      allowsFullCompletionLanguage(
        delivery({
          allJobsDelivered: false,
          jobs: [
            jobView({
              jobId: "j1",
              serviceName: "A",
              files: [
                {
                  id: "f1",
                  deliverableLabel: "X",
                  fileName: "x.zip",
                  fileType: "zip",
                  url: "/x",
                  useInstructions: null,
                  addedAt: "2026-06-28T12:00:00.000Z",
                  versionLabel: null,
                  releasedAt: "2026-06-28T12:00:00.000Z",
                },
              ],
            }),
          ],
        }),
      ),
    ).toBe(false);

    expect(
      allowsFullCompletionLanguage(
        delivery({
          allJobsDelivered: true,
          jobs: [
            jobView({
              jobId: "j1",
              serviceName: "A",
              files: [
                {
                  id: "f1",
                  deliverableLabel: "X",
                  fileName: "x.zip",
                  fileType: "zip",
                  url: "/x",
                  useInstructions: null,
                  addedAt: "2026-06-28T12:00:00.000Z",
                  versionLabel: null,
                  releasedAt: "2026-06-28T12:00:00.000Z",
                },
              ],
            }),
          ],
        }),
      ),
    ).toBe(true);
  });
});
