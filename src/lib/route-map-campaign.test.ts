import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import {
  getJobsForRoad,
  getRouteMapJob,
  getRouteStartJob,
  getSelectableRouteMapRoads,
  ROUTE_MAP_V1,
} from "@/config/route-map-v1";
import {
  buildApprovedPlanFromRouteMapJob,
  buildRouteMapPaymentSummary,
  createCampaignFromRouteMapJob,
  submitRouteMapIntake,
} from "@/lib/route-map-campaign";
import { resolveCustomerJourneySteps } from "@/lib/customer-journey";
import { hasCampaignCreativeBrief } from "@/lib/campaign-brief-source";
import { ensureConceptsReadyForReview } from "@/lib/studio-board-campaign";

describe("route-map-v1 config", () => {
  it("defines five roads internally including I-285 perimeter loop", () => {
    expect(ROUTE_MAP_V1.roads.map((road) => road.id)).toEqual([
      "i75",
      "i20",
      "i285",
      "update",
      "random-exit",
    ]);
  });

  it("exposes four customer-selectable lanes — I-285 is perimeter only", () => {
    expect(getSelectableRouteMapRoads().map((road) => road.id)).toEqual([
      "i75",
      "i20",
      "update",
      "random-exit",
    ]);
    const loop = ROUTE_MAP_V1.roads.find((road) => road.id === "i285");
    expect(loop?.selectable).toBe(false);
  });

  it("I-285 loop is not labeled Update What I Already Have", () => {
    const loop = ROUTE_MAP_V1.roads.find((road) => road.id === "i285");
    const update = ROUTE_MAP_V1.roads.find((road) => road.id === "update");
    expect(loop?.customerLabel).not.toBe("Update What I Already Have");
    expect(update?.customerLabel).toBe("Update What I Already Have");
  });

  it("lists eight launch jobs on the shelf", () => {
    expect(ROUTE_MAP_V1.jobs).toHaveLength(8);
  });

  it("I-285 perimeter has no assigned lane jobs — visual loop only", () => {
    const jobs = getJobsForRoad("i285");
    expect(jobs).toHaveLength(0);
  });

  it("filters Update interchange jobs without Route Start", () => {
    const jobs = getJobsForRoad("update");
    expect(jobs.map((job) => job.id).sort()).toEqual(["rm-j007", "rm-j008"]);
  });

  it("excludes Route Start from numbered lane stops", () => {
    for (const roadId of ["i75", "i20", "update", "random-exit"] as const) {
      const jobs = getJobsForRoad(roadId);
      expect(jobs.some((job) => job.isRouteStart)).toBe(false);
    }
  });

  it("exposes Route Start as separate advisory job", () => {
    const routeStart = getRouteStartJob();
    expect(routeStart?.id).toBe("rm-j001");
    expect(routeStart?.isRouteStart).toBe(true);
    expect(routeStart?.roads).toEqual(["i75", "i20", "update", "random-exit"]);
  });

  it("Random Exit shelf excludes Route Start (seven named jobs)", () => {
    const jobs = getJobsForRoad("random-exit");
    expect(jobs.some((job) => job.isRouteStart)).toBe(false);
    expect(jobs.length).toBe(7);
  });
});

describe("route-map catalog SKUs", () => {
  it("maps rm-j001 through rm-j008 in Service Catalog", () => {
    for (const id of [
      "rm-j001",
      "rm-j002",
      "rm-j003",
      "rm-j004",
      "rm-j005",
      "rm-j006",
      "rm-j007",
      "rm-j008",
    ] as const) {
      const catalog = getServiceById(id);
      const job = getRouteMapJob(id);
      expect(catalog).toBeDefined();
      expect(job?.priceCents).toBe(catalog?.priceCents);
      expect(job?.name).toBe(catalog?.name);
    }
  });

  it("rm-j008 uses updated profile/platform name at $400", () => {
    const job = getRouteMapJob("rm-j008");
    expect(job?.name).toBe("Update My Facebook, Instagram, or TikTok");
    expect(job?.priceCents).toBe(40000);
    expect(job?.priceDisplay).toBe("$400");
  });

  it("uses job-specific timing — no global 7-business-day copy", () => {
    const expectedTiming: Record<
      "rm-j001" | "rm-j002" | "rm-j003" | "rm-j004" | "rm-j005" | "rm-j006" | "rm-j007" | "rm-j008",
      string
    > = {
      "rm-j001": "Route recommendation within 2 business days after intake is complete.",
      "rm-j002": "First draft within 3 business days after intake is complete.",
      "rm-j003": "First draft within 3 business days after intake is complete.",
      "rm-j004": "First draft within 5 business days after intake is complete.",
      "rm-j005": "First draft within 5 business days after intake is complete.",
      "rm-j006": "First draft within 3 business days after intake is complete.",
      "rm-j007": "First draft within 2 business days after intake is complete.",
      "rm-j008": "First draft within 3 business days after intake is complete.",
    };

    for (const [id, timing] of Object.entries(expectedTiming)) {
      const job = getRouteMapJob(id as keyof typeof expectedTiming);
      expect(job?.timingLabel).toBe(timing);
      expect(job?.timingLabel.toLowerCase()).not.toContain("7 business");
      expect(job?.timingLabel.toLowerCase()).not.toContain("first concepts");
    }
    expect(ROUTE_MAP_V1.promiseFooter.toLowerCase()).not.toContain("7 business");
    expect(ROUTE_MAP_V1.promiseFooter.toLowerCase()).not.toContain("first concepts");
  });
});

describe("route-map campaign handoff", () => {
  it("builds approved plan from catalog job pricing", () => {
    const job = getRouteMapJob("rm-j003");
    expect(job).toBeDefined();
    const plan = buildApprovedPlanFromRouteMapJob(job!);
    expect(plan.amountDueTodayCents).toBe(45000);
    expect(plan.lineItems[0]?.serviceName).toBe("Make and Post My Social Media Promotion");
    expect(plan.lineItems[0]?.skuId).toBe("rm-j003");
  });

  it("creates campaign for purchasable job", () => {
    const campaign = createCampaignFromRouteMapJob("rm-j005", "i20");
    expect(campaign?.campaignName).toBe(
      "Make Me a Page for My Sale, Event, Opening, Service, or Offer",
    );
    expect(campaign?.approvedStudioPlan?.amountDueTodayCents).toBe(65000);
    expect(campaign?.routeMapContext?.roadId).toBe("i20");
  });

  it("creates campaign for Route Start job at $650", () => {
    const campaign = createCampaignFromRouteMapJob("rm-j001", "i75");
    expect(campaign?.campaignName).toBe("Help Me Figure Out What I Need");
    expect(campaign?.approvedStudioPlan?.amountDueTodayCents).toBe(65000);
    expect(campaign?.routeMapContext?.jobId).toBe("rm-j001");
  });

  it("builds checkout summary display", () => {
    const job = getRouteMapJob("rm-j007")!;
    const summary = buildRouteMapPaymentSummary(job);
    expect(summary.amountDueTodayDisplay).toBe("$250");
  });

  it("builds Route Start checkout at $650", () => {
    const job = getRouteMapJob("rm-j001")!;
    const summary = buildRouteMapPaymentSummary(job);
    expect(summary.amountDueTodayCents).toBe(65000);
    expect(summary.amountDueTodayDisplay).toBe("$650");
  });

  it("lands on Building Concepts after intake — not review-ready", () => {
    const paidAt = "2026-07-01T12:00:00.000Z";
    const intakeAt = "2026-07-01T12:05:00.000Z";
    let campaign = createCampaignFromRouteMapJob("rm-j003", "random-exit")!;
    campaign = {
      ...campaign,
      paymentReceivedAt: paidAt,
      approvedStudioPlan: buildApprovedPlanFromRouteMapJob(getRouteMapJob("rm-j003")!),
    };

    const storage = new Map<string, string>();
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => {
            storage.set(key, value);
          },
          removeItem: (key: string) => {
            storage.delete(key);
          },
        },
        dispatchEvent: () => true,
      },
    });

    try {
      storage.set("studio-squishy:current-campaign", JSON.stringify(campaign));
      const submitted = submitRouteMapIntake(
        {
          promoting: "Summer pastry box",
          mustInclude: "15% off through July 15",
          callToAction: "Order online",
          platform: "Instagram",
          accountControl: "Yes",
          materials: "Logo PNG attached",
        },
        intakeAt,
      );

      expect(submitted?.campaignStatus).toBe("BUILDING_CONCEPTS");
      expect(submitted?.routeMapIntakeSubmittedAt).toBe(intakeAt);
      expect(hasCampaignCreativeBrief(submitted)).toBe(true);

      const advanced = ensureConceptsReadyForReview();
      expect(advanced?.campaignStatus).toBe("BUILDING_CONCEPTS");

      const steps = resolveCustomerJourneySteps(submitted);
      expect(steps.find((step) => step.id === "payment")?.state).toBe("complete");
      expect(steps.find((step) => step.id === "intake")?.state).toBe("complete");
      expect(steps.find((step) => step.id === "building")?.state).toBe("current");
      expect(steps.find((step) => step.id === "review")?.state).toBe("upcoming");
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it("does not expose a creative brief before Route Map intake is submitted", () => {
    const campaign = createCampaignFromRouteMapJob("rm-j003", "random-exit")!;
    expect(hasCampaignCreativeBrief(campaign)).toBe(false);
  });
});
