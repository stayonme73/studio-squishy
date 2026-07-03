import { describe, expect, it } from "vitest";

import {
  buildApprovedPlanFromRouteMapJob,
  createCampaignFromRouteMapJob,
  submitRouteMapIntake,
} from "@/lib/route-map-campaign";
import { getRouteMapJob } from "@/config/route-map-v1";
import {
  formatRouteMapProductionBriefForCopy,
  hasRouteMapProductionBrief,
  resolveRouteMapClientSummary,
  resolveRouteMapProductionBrief,
} from "@/lib/route-map-production-brief";
import { resolveCampaignDetailsView } from "@/lib/campaign-details-view";

function mockStorageCampaign(campaign: NonNullable<ReturnType<typeof createCampaignFromRouteMapJob>>) {
  const storage = new Map<string, string>();
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
      dispatchEvent: () => true,
    },
  });
  storage.set("studio-squishy:current-campaign", JSON.stringify(campaign));
  return () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  };
}

function mockPaidCampaign(
  jobId: Parameters<typeof createCampaignFromRouteMapJob>[0],
  options?: { postPublish?: boolean },
) {
  const job = getRouteMapJob(jobId)!;
  let campaign = createCampaignFromRouteMapJob(jobId, "random-exit", {
    includePostPublishAddon: options?.postPublish,
  })!;
  return {
    ...campaign,
    paymentReceivedAt: new Date().toISOString(),
    approvedStudioPlan: buildApprovedPlanFromRouteMapJob(job, {
      includePostPublishAddon: options?.postPublish,
    }),
    routeMapContext: options?.postPublish
      ? { ...campaign.routeMapContext!, postPublishAddon: true }
      : campaign.routeMapContext,
  };
}

describe("route-map production brief", () => {
  it("maps V2 flyer intake to client summary and production brief", () => {
    const campaign = mockPaidCampaign("v2-rtu-flyer");
    const restore = mockStorageCampaign(campaign);
    try {
      const submitted = submitRouteMapIntake({
        flyerPurpose: "Grand opening",
        mustInclude: "June 15 — 10% off",
        materials: "Logo PNG",
        intendedUse: "Print",
        sizeNotes: "8.5x11",
      })!;

      const client = resolveRouteMapClientSummary(submitted);
      expect(client?.title).toBe("Flyer Intake");
      expect(client?.items.some((item) => item.value.includes("Grand opening"))).toBe(true);
      expect(client?.clientNote).toContain("print");

      const brief = resolveRouteMapProductionBrief(submitted);
      expect(brief?.skuId).toBe("v2-rtu-flyer");
      expect(brief?.sections.some((s) => s.title === "Flyer")).toBe(true);
      expect(
        brief?.sections
          .flatMap((s) => s.items)
          .some((item) => item.label === "Purpose" && item.value === "Grand opening"),
      ).toBe(true);
      expect(brief?.sections.some((s) => s.title === "Job context")).toBe(true);
      expect(brief?.sections.some((s) => s.title === "Client responsibilities")).toBe(true);

      const copy = formatRouteMapProductionBriefForCopy(submitted);
      expect(copy).toContain("PRODUCTION BRIEF");
      expect(copy).toContain("Purpose: Grand opening");
    } finally {
      restore();
    }
  });

  it("maps social posts + Post/Publish add-on production fields", () => {
    const campaign = mockPaidCampaign("v2-rtu-social-posts", { postPublish: true });
    const restore = mockStorageCampaign(campaign);
    try {
      const submitted = submitRouteMapIntake({
        postsAbout: "Summer launch",
        callToAction: "Shop now",
        platform: "Instagram",
        materials: "Product photos",
        publishPlatform: "Instagram",
        publishAccess: "Admin invite sent",
        publishTiming: "ASAP after approval",
      })!;

      const brief = resolveRouteMapProductionBrief(submitted);
      expect(brief?.postPublishIncluded).toBe(true);
      expect(brief?.sections.some((s) => s.title === "Post / Publish")).toBe(true);
      expect(
        brief?.sections
          .flatMap((s) => s.items)
          .some((item) => item.label === "Publish platform" && item.value === "Instagram"),
      ).toBe(true);
      expect(brief?.sections.some((s) => s.title === "Add-on")).toBe(true);
    } finally {
      restore();
    }
  });

  it("maps email kit client sending responsibilities for production only", () => {
    const campaign = mockPaidCampaign("v2-rtu-email-kit");
    const restore = mockStorageCampaign(campaign);
    try {
      const submitted = submitRouteMapIntake({
        campaignGoal: "Summer promo",
        mustInclude: "Code SAVE10",
        callToAction: "Shop",
        materials: "Logo",
        listConsent: "Yes — I own the list and have consent",
        sendingAccount: "Mailchimp",
      })!;

      const client = resolveRouteMapClientSummary(submitted)!;
      expect(client.items.some((item) => item.label.includes("consent"))).toBe(true);

      const brief = resolveRouteMapProductionBrief(submitted)!;
      expect(brief.sections.some((s) => s.title === "Client sending responsibilities")).toBe(true);
      expect(
        brief.sections
          .flatMap((s) => s.items)
          .some((item) => item.label === "Sending account / platform" && item.value === "Mailchimp"),
      ).toBe(true);
    } finally {
      restore();
    }
  });

  it("maps short video intake to format, assets, and CTA fields", () => {
    const campaign = mockPaidCampaign("v2-rtu-short-video");
    const restore = mockStorageCampaign(campaign);
    try {
      const submitted = submitRouteMapIntake({
        videoPurpose: "Service spotlight",
        format: "Vertical",
        footageMaterials: "Client phone footage + logo",
        onScreenText: "Book today — link in bio",
        brandStyle: "Warm, earthy tones",
      })!;

      const brief = resolveRouteMapProductionBrief(submitted)!;
      const videoItems = brief.sections.find((s) => s.title === "Short video")?.items ?? [];
      expect(videoItems.some((item) => item.label === "Format" && item.value === "Vertical")).toBe(
        true,
      );
      expect(videoItems.some((item) => item.label === "On-screen text & CTA")).toBe(true);
    } finally {
      restore();
    }
  });

  it("wires client summary into Campaign Record view model", () => {
    const campaign = mockPaidCampaign("v2-rtu-flyer");
    const restore = mockStorageCampaign(campaign);
    try {
      const submitted = submitRouteMapIntake({
        flyerPurpose: "Sale",
        mustInclude: "20% off",
        materials: "Logo",
        intendedUse: "Digital",
      })!;

      const view = resolveCampaignDetailsView(submitted);
      expect(view.hasRouteMapClientSummary).toBe(true);
      expect(view.routeMapClientSummary?.items.length).toBeGreaterThan(0);
      expect(hasRouteMapProductionBrief(submitted)).toBe(true);
    } finally {
      restore();
    }
  });

  it("defines production sections for all nine V2 RTU intake types", () => {
    const v2Types = [
      "rtu-flyer",
      "rtu-menu",
      "rtu-service-sheet",
      "rtu-social-posts",
      "rtu-promotion-graphics",
      "rtu-email-kit",
      "rtu-sms-kit",
      "rtu-voice",
      "rtu-short-video",
    ] as const;

    for (const sku of [
      "v2-rtu-flyer",
      "v2-rtu-menu",
      "v2-rtu-service-sheet",
      "v2-rtu-social-posts",
      "v2-rtu-promotion-graphics",
      "v2-rtu-email-kit",
      "v2-rtu-sms-kit",
      "v2-rtu-voice",
      "v2-rtu-short-video",
    ] as const) {
      const job = getRouteMapJob(sku)!;
      expect(v2Types).toContain(job.intakeType);
    }
  });
});
