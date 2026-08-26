import { describe, expect, it, vi } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import {
  getJobsForRoad,
  getRouteMapIntakeTypeForSku,
  getRouteMapJob,
  getRouteMapGuidance,
  getSelectableRouteMapRoads,
  resolveRouteMapShelfJobId,
  ROUTE_MAP_V1,
  type RouteMapJobId,
} from "@/config/route-map-v1";
import { getRouteMapIntakeSchema } from "@/config/route-map-intake-v1";
import { buildRouteMapTimingLabel } from "@/catalog/route-map-shared-copy";
import {
  addRouteMapServiceToPlan,
  addServiceToRouteMapPlanState,
  buildApprovedPlanFromRouteMapJob,
  buildRouteMapPaymentSummaryFromServices,
  buildRouteMapPaymentSummary,
  createCampaignFromRouteMapJob,
  removeRouteMapServiceFromPlan,
  resolveRouteMapRestoredJourney,
  releaseRouteMapForMapView,
  saveApprovedRouteMapPlan,
  saveRouteMapPlanState,
  saveRouteMapJourneyStep,
  selectRouteMapJob,
  submitRouteMapIntake,
} from "@/lib/route-map-campaign";
import { resolveCustomerJourneySteps } from "@/lib/customer-journey";
import { hasCampaignCreativeBrief } from "@/lib/campaign-brief-source";
import { hasRouteMapProductionBrief, resolveRouteMapClientSummary } from "@/lib/route-map-production-brief";
import { ensureConceptsReadyForReview } from "@/lib/studio-board-campaign";
import type { ServiceId } from "@/catalog/types";

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

  it("lists activated V2 + continuing V1 shelf jobs (retired rm-j003/004/006 excluded)", () => {
    const ids = ROUTE_MAP_V1.jobs.map((job) => job.id);
    expect(ids).toContain("v2-rtu-flyer");
    expect(ids).toContain("v2-rtu-social-posts");
    expect(ids).toContain("rm-j005");
    expect(ids).not.toContain("rm-j003");
    expect(ids).not.toContain("rm-j004");
    expect(ids).not.toContain("rm-j006");
    expect(ROUTE_MAP_V1.jobs.length).toBe(14);
  });

  it("I-285 perimeter has no assigned lane jobs — visual loop only", () => {
    const jobs = getJobsForRoad("i285");
    expect(jobs).toHaveLength(0);
  });

  it("filters Update interchange jobs without Route Start", () => {
    const jobs = getJobsForRoad("update");
    expect(jobs.map((job) => job.id).sort()).toEqual(
      [
        "rm-j007",
        "rm-j008",
        "v2-rtu-flyer",
        "v2-rtu-menu",
        "v2-rtu-promotion-graphics",
        "v2-rtu-service-sheet",
        "v2-rtu-social-posts",
      ].sort(),
    );
  });

  it("excludes Route Start from numbered lane stops", () => {
    for (const roadId of ["i75", "i20", "update", "random-exit"] as const) {
      const jobs = getJobsForRoad(roadId);
      expect(jobs.some((job) => job.isRouteStart)).toBe(false);
    }
  });

  it("exposes free Squishy guidance instead of a purchasable Route Start job", () => {
    const guidance = getRouteMapGuidance();
    expect(guidance.prompt).toBe("Not sure where to start?");
    expect(guidance.cta).toBe("Let Squishy help you choose the right project.");
  });

  it("Random Exit shelf excludes Route Start", () => {
    const jobs = getJobsForRoad("random-exit");
    expect(jobs.some((job) => job.isRouteStart)).toBe(false);
    expect(jobs.length).toBe(13);
  });

  it("email/SMS kits appear on I-20 and Random Exit only — not I-75 or Update", () => {
    const i75Ids = getJobsForRoad("i75").map((job) => job.id);
    const i20Ids = getJobsForRoad("i20").map((job) => job.id);
    const updateIds = getJobsForRoad("update").map((job) => job.id);

    expect(i75Ids).toHaveLength(10);
    expect(i75Ids[0]).toBe("v2-rtu-flyer");
    expect(i75Ids[1]).toBe("v2-rtu-business-card");
    expect(i75Ids).not.toContain("v2-rtu-email-kit");
    expect(i75Ids).not.toContain("v2-rtu-sms-kit");
    expect(updateIds).not.toContain("v2-rtu-email-kit");
    expect(i20Ids).toContain("v2-rtu-email-kit");
    expect(i20Ids).toContain("v2-rtu-sms-kit");
  });

  it("Promote Something Now offers Launch Now social posts and does not offer carousel", () => {
    const jobs = getJobsForRoad("i20");
    expect(jobs.some((job) => job.id === "v2-rtu-social-posts")).toBe(true);
    expect(jobs.some((job) => job.name === "Make My Social Media Posts")).toBe(
      true,
    );
    expect(
      jobs.some(
        (job) =>
          /carousel/i.test(job.id) ||
          /carousel/i.test(job.name) ||
          job.deliverables.some((item) => /carousel/i.test(item)),
      ),
    ).toBe(false);
  });

  it("redirects retired rm-j003/004/006 shelf IDs to V2 replacements", () => {
    expect(resolveRouteMapShelfJobId("rm-j003")).toBe("v2-rtu-social-posts");
    expect(resolveRouteMapShelfJobId("rm-j004")).toBe("v2-rtu-short-video");
    expect(resolveRouteMapShelfJobId("rm-j006")).toBe("v2-rtu-voice");
  });
});

describe("route-map catalog SKUs", () => {
  it("maps continuing rm-j* and activated V2 RTU SKUs in Service Catalog", () => {
    for (const id of [
      "rm-j002",
      "rm-j005",
      "rm-j007",
      "rm-j008",
      "v2-rtu-flyer",
      "v2-rtu-social-posts",
      "v2-rtu-email-kit",
      "v2-rtu-short-video",
    ] as const) {
      const catalog = getServiceById(id);
      const job = getRouteMapJob(id);
      expect(catalog).toBeDefined();
      expect(job?.priceCents).toBe(catalog?.priceCents);
      expect(job?.name).toBe(catalog?.name);
    }
  });

  it("keeps retired rm-j003 in catalog for checkout history", () => {
    const catalog = getServiceById("rm-j003");
    expect(catalog?.launchStatus).toBe("retired");
    expect(getRouteMapJob("rm-j003")).toBeDefined();
  });

  it("keeps retired rm-j001 in catalog for historical campaign reads only", () => {
    const catalog = getServiceById("rm-j001");
    expect(catalog?.launchStatus).toBe("retired");
    expect(createCampaignFromRouteMapJob("rm-j001", "i75")).toBeNull();
  });

  it("rm-j008 uses updated profile/platform name at $99 per platform on update + random-exit", () => {
    const job = getRouteMapJob("rm-j008");
    expect(job?.name).toBe("Make Me a Social Profile Update Kit");
    expect(job?.priceCents).toBe(9900);
    expect(job?.priceDisplay).toBe("$99 / platform");
    expect(job?.roads).toEqual(["update", "random-exit"]);
  });

  it("V2 RTU jobs read turnaround from V2 draft — not global 7-day copy", () => {
    const flyer = getRouteMapJob("v2-rtu-flyer");
    expect(flyer?.timingLabel.toLowerCase()).toContain("2–3 business days");
    expect(flyer?.timingLabel.toLowerCase()).not.toContain("7 business");
  });

  it("uses job-specific timing for continuing V1 jobs", () => {
    const job = getRouteMapJob("rm-j005");
    expect(job?.timingLabel).toBe(buildRouteMapTimingLabel("within 5 business days"));
    expect(ROUTE_MAP_V1.promiseFooter.toLowerCase()).not.toContain("7 business");
  });

  it("reads per-platform price display from catalog — byte-for-byte", () => {
    expect(getRouteMapJob("rm-j002")?.priceDisplay).toBe("$99 / platform");
    expect(getRouteMapJob("rm-j003")?.priceDisplay).toBe("$450 / platform");
    expect(getRouteMapJob("rm-j004")?.priceDisplay).toBe("$650 / platform");
    expect(getRouteMapJob("rm-j006")?.priceDisplay).toBe("$400 / platform");
    expect(getRouteMapJob("rm-j008")?.priceDisplay).toBe("$99 / platform");
  });

  it("reads intake template from catalog for active shelf SKUs", () => {
    expect(getServiceById("rm-j002")?.intakeTemplate).toBe("social-setup");
    expect(getServiceById("v2-rtu-flyer")?.intakeTemplate).toBe("rtu-flyer");
    expect(getRouteMapJob("rm-j007")?.intakeType).toBe("update");
    expect(getRouteMapIntakeTypeForSku("v2-rtu-sms-kit")).toBe("rtu-sms-kit");
  });
});

describe("route-map intake template routing", () => {
  it("maps each activated V2 RTU SKU to a service-specific short intake", () => {
    const v2Expectations: Record<string, string> = {
      "v2-rtu-flyer": "rtu-flyer",
      "v2-rtu-menu": "rtu-menu",
      "v2-rtu-service-sheet": "rtu-service-sheet",
      "v2-rtu-social-posts": "rtu-social-posts",
      "v2-rtu-promotion-graphics": "rtu-promotion-graphics",
      "v2-rtu-email-kit": "rtu-email-kit",
      "v2-rtu-sms-kit": "rtu-sms-kit",
      "v2-rtu-voice": "rtu-voice",
      "v2-rtu-short-video": "rtu-short-video",
      "v2-rtu-business-card": "rtu-business-card",
    };

    for (const [sku, intakeType] of Object.entries(v2Expectations)) {
      expect(getRouteMapIntakeTypeForSku(sku as keyof typeof v2Expectations)).toBe(intakeType);
      expect(getRouteMapJob(sku as keyof typeof v2Expectations)?.intakeType).toBe(intakeType);
      const schema = getRouteMapIntakeSchema(intakeType as keyof typeof v2Expectations);
      expect(schema.type).toBe(intakeType);
      expect(schema.fields.length).toBeGreaterThan(0);
      expect(schema.fields.length).toBeLessThan(12);
    }
  });

  it("keeps Route Start on discovery intake and continuing V1 jobs unchanged", () => {
    expect(getRouteMapIntakeTypeForSku("rm-j001")).toBe("discovery");
    expect(getRouteMapJob("rm-j002")?.intakeType).toBe("social-setup");
    expect(getRouteMapJob("rm-j005")?.intakeType).toBe("page");
    expect(getRouteMapJob("rm-j007")?.intakeType).toBe("update");
    expect(getRouteMapJob("rm-j008")?.intakeType).toBe("social-update");
  });

  it("redirects retired shelf IDs to V2 intake templates", () => {
    expect(resolveRouteMapShelfJobId("rm-j003")).toBe("v2-rtu-social-posts");
    expect(getRouteMapJob("v2-rtu-social-posts")?.intakeType).toBe("rtu-social-posts");
    expect(resolveRouteMapShelfJobId("rm-j004")).toBe("v2-rtu-short-video");
    expect(getRouteMapJob("v2-rtu-short-video")?.intakeType).toBe("rtu-short-video");
    expect(resolveRouteMapShelfJobId("rm-j006")).toBe("v2-rtu-voice");
    expect(getRouteMapJob("v2-rtu-voice")?.intakeType).toBe("rtu-voice");
  });

  it("supports historical Post/Publish intake schema reads only when explicitly requested", () => {
    const base = getRouteMapIntakeSchema("rtu-social-posts");
    const withAddon = getRouteMapIntakeSchema("rtu-social-posts", { includePostPublish: true });
    expect(base.fields.some((field) => field.id === "publishPlatform")).toBe(false);
    expect(withAddon.fields.length).toBe(base.fields.length + 3);
    expect(withAddon.fields.some((field) => field.id === "publishPlatform")).toBe(true);
  });

  it("does not route V2 RTU jobs to project-details or discovery schemas", () => {
    for (const sku of [
      "v2-rtu-flyer",
      "v2-rtu-email-kit",
      "v2-rtu-sms-kit",
    ] as const) {
      const intakeType = getRouteMapJob(sku)?.intakeType;
      expect(intakeType).not.toBe("discovery");
      expect(getRouteMapIntakeSchema(intakeType!).title.toLowerCase()).not.toContain("discovery");
    }
  });
});

describe("route-map campaign handoff", () => {
  function withMockedBrowserStorage(run: (storage: Map<string, string>) => void) {
    const storage = new Map<string, string>();
    const originalWindow = globalThis.window;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ syncedAt: "2026-07-10T12:00:00.000Z" }),
    } as Response);

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
      run(storage);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
      fetchSpy.mockRestore();
    }
  }

  it("builds approved plan from V2 social posts catalog pricing", () => {
    const job = getRouteMapJob("v2-rtu-social-posts");
    expect(job).toBeDefined();
    const plan = buildApprovedPlanFromRouteMapJob(job!);
    expect(plan.amountDueTodayCents).toBe(9900);
    expect(plan.lineItems[0]?.serviceName).toBe("Make My Social Media Posts");
    expect(plan.lineItems[0]?.skuId).toBe("v2-rtu-social-posts");
  });

  it("blocks retired post/publish add-on from new Route Map plans", () => {
    const withAddon = addServiceToRouteMapPlanState(
      { selectedServiceIds: ["v2-rtu-social-posts" as ServiceId] },
      "v2-addon-post-publish",
    );
    expect(withAddon.selectedServiceIds).toEqual(["v2-rtu-social-posts"]);
  });

  it("creates campaign for continuing V1 job", () => {
    const campaign = createCampaignFromRouteMapJob("rm-j005", "i20");
    expect(campaign?.campaignName).toBe(
      "Make Me a Page for My Sale, Event, Opening, Service, or Offer",
    );
    expect(campaign?.approvedStudioPlan?.amountDueTodayCents).toBe(34900);
    expect(campaign?.routeMapContext?.roadId).toBe("i20");
  });

  it("creates campaign for V2 RTU job", () => {
    const campaign = createCampaignFromRouteMapJob("v2-rtu-flyer", "random-exit");
    expect(campaign?.campaignName).toBe("Make Me a Flyer");
    expect(campaign?.approvedStudioPlan?.amountDueTodayCents).toBe(6900);
    expect(campaign?.routeMapContext?.jobId).toBe("v2-rtu-flyer");
  });

  it("blocks new campaigns for retired rm-j001 Route Start commerce", () => {
    expect(createCampaignFromRouteMapJob("rm-j001", "i75")).toBeNull();
  });

  it("reuses the active Route Map campaign when selecting the restored job again", () => {
    withMockedBrowserStorage(() => {
      const first = selectRouteMapJob("v2-rtu-flyer", "random-exit");
      expect(first?.campaignId).toBeTruthy();

      const checkout = saveRouteMapJourneyStep("checkout");
      expect(checkout?.campaignId).toBe(first?.campaignId);
      expect(checkout?.routeMapContext?.currentStep).toBe("checkout");

      const second = selectRouteMapJob("v2-rtu-flyer", "random-exit");
      expect(second?.campaignId).toBe(first?.campaignId);
      expect(second?.routeMapContext?.currentStep).toBe("job");
    });
  });

  it("clears in-progress journey step so Route Map can display without redirecting away", () => {
    withMockedBrowserStorage(() => {
      addRouteMapServiceToPlan("v2-rtu-flyer", "i75");
      addRouteMapServiceToPlan("v2-rtu-social-posts", "i75");
      saveRouteMapJourneyStep("studio-plan");

      const released = releaseRouteMapForMapView();
      expect(released?.routeMapContext?.currentStep).toBeUndefined();
      expect(released?.routeMapContext?.selectedServiceIds).toEqual([
        "v2-rtu-flyer",
        "v2-rtu-social-posts",
      ]);
      expect(
        resolveRouteMapRestoredJourney(released?.routeMapContext, null),
      ).toBeNull();
    });
  });

  it("keeps browsing a different Route Map job in the existing campaign without adding it", () => {
    withMockedBrowserStorage(() => {
      const first = selectRouteMapJob("v2-rtu-flyer", "random-exit");
      expect(first?.campaignId).toBeTruthy();

      const second = selectRouteMapJob("v2-rtu-social-posts", "random-exit");
      expect(second?.campaignId).toBeTruthy();
      expect(second?.campaignId).toBe(first?.campaignId);
      expect(second?.routeMapContext?.jobId).toBe("v2-rtu-social-posts");
      expect(second?.routeMapContext?.roadId).toBe("random-exit");
      expect(second?.routeMapContext?.selectedServiceIds).toEqual([]);
    });
  });

  it("keeps browsing the same job from a different road without adding it", () => {
    withMockedBrowserStorage(() => {
      const first = selectRouteMapJob("v2-rtu-flyer", "random-exit");
      expect(first?.campaignId).toBeTruthy();

      const second = selectRouteMapJob("v2-rtu-flyer", "update");
      expect(second?.campaignId).toBeTruthy();
      expect(second?.campaignId).toBe(first?.campaignId);
      expect(second?.routeMapContext?.jobId).toBe("v2-rtu-flyer");
      expect(second?.routeMapContext?.roadId).toBe("update");
      expect(second?.routeMapContext?.selectedServiceIds).toEqual([]);
    });
  });

  it("adds multiple Route Map services from different roads to one campaign plan", () => {
    withMockedBrowserStorage(() => {
      const first = addRouteMapServiceToPlan("v2-rtu-flyer", "random-exit");
      const second = addRouteMapServiceToPlan("v2-rtu-social-posts", "i20");

      expect(first?.campaignId).toBeTruthy();
      expect(second?.campaignId).toBe(first?.campaignId);
      expect(second?.routeMapContext?.selectedServiceIds).toEqual([
        "v2-rtu-flyer",
        "v2-rtu-social-posts",
      ]);
      expect(second?.routeMapContext?.jobId).toBe("v2-rtu-flyer");
      expect(second?.approvedStudioPlan?.selectedServiceIds).toEqual([
        "v2-rtu-flyer",
        "v2-rtu-social-posts",
      ]);
    });
  });

  it("prevents duplicate Route Map services in the Studio Plan", () => {
    withMockedBrowserStorage(() => {
      const first = addRouteMapServiceToPlan("v2-rtu-flyer", "random-exit");
      const second = addRouteMapServiceToPlan("v2-rtu-flyer", "i75");

      expect(second?.campaignId).toBe(first?.campaignId);
      expect(second?.routeMapContext?.selectedServiceIds).toEqual(["v2-rtu-flyer"]);
    });
  });

  it("removes one service while preserving other selected Route Map services", () => {
    withMockedBrowserStorage(() => {
      addRouteMapServiceToPlan("v2-rtu-flyer", "random-exit");
      addRouteMapServiceToPlan("v2-rtu-social-posts", "i20");

      const updated = removeRouteMapServiceFromPlan("v2-rtu-flyer");

      expect(updated?.routeMapContext?.selectedServiceIds).toEqual(["v2-rtu-social-posts"]);
      expect(updated?.routeMapContext?.jobId).toBe("v2-rtu-social-posts");
      expect(updated?.approvedStudioPlan?.selectedServiceIds).toEqual(["v2-rtu-social-posts"]);
    });
  });

  it("removing the final service leaves a stable empty Route Map plan", () => {
    withMockedBrowserStorage(() => {
      addRouteMapServiceToPlan("v2-rtu-flyer", "random-exit");

      const updated = removeRouteMapServiceFromPlan("v2-rtu-flyer");

      expect(updated?.routeMapContext?.selectedServiceIds).toEqual([]);
      expect(updated?.approvedStudioPlan).toBeUndefined();
    });
  });

  it("builds Route Map payment totals from every selected service", () => {
    const summary = buildRouteMapPaymentSummaryFromServices([
      "v2-rtu-flyer",
      "v2-rtu-social-posts",
    ]);

    expect(summary.services).toEqual(["Make Me a Flyer", "Make My Social Media Posts"]);
    expect(summary.amountDueTodayCents).toBe(16800);
    expect(summary.amountDueTodayDisplay).toBe("$168");
  });

  it("ignores invalid or stale Route Map restoration context", () => {
    const validContext = {
      jobId: "v2-rtu-flyer",
      roadId: "random-exit",
      selectedAt: "2026-07-10T12:00:00.000Z",
      currentStep: "checkout",
    } as const;

    expect(
      resolveRouteMapRestoredJourney(
        { ...validContext, jobId: "missing-job" as typeof validContext.jobId },
        null,
      ),
    ).toBeNull();
    expect(
      resolveRouteMapRestoredJourney(
        { ...validContext, currentStep: "receipt" as typeof validContext.currentStep },
        null,
      ),
    ).toBeNull();
    expect(
      resolveRouteMapRestoredJourney(
        { ...validContext, roadId: "ghost-road" as typeof validContext.roadId },
        null,
      ),
    ).toBeNull();
  });

  it("restores a valid multi-service Route Map Studio Plan step", () => {
    const restored = resolveRouteMapRestoredJourney(
      {
        jobId: "v2-rtu-flyer",
        roadId: "random-exit",
        selectedAt: "2026-07-10T12:00:00.000Z",
        currentStep: "studio-plan",
        selectedServiceIds: ["v2-rtu-flyer", "v2-rtu-social-posts"],
      },
      null,
    );

    expect(restored?.step).toBe("studio-plan");
    expect(restored?.selectedServiceIds).toEqual(["v2-rtu-flyer", "v2-rtu-social-posts"]);
    expect(restored?.jobId).toBe("v2-rtu-flyer");
  });

  it("rejects invalid persisted Route Map service lists during restoration", () => {
    const restored = resolveRouteMapRestoredJourney(
      {
        jobId: "v2-rtu-flyer",
        roadId: "random-exit",
        selectedAt: "2026-07-10T12:00:00.000Z",
        currentStep: "studio-plan",
        selectedServiceIds: ["not-a-route-map-service" as ServiceId],
      },
      null,
    );

    expect(restored).toBeNull();
  });

  it("restores legacy singular jobId Route Map campaigns as one-service plans", () => {
    const restored = resolveRouteMapRestoredJourney(
      {
        jobId: "v2-rtu-flyer",
        roadId: "random-exit",
        selectedAt: "2026-07-10T12:00:00.000Z",
        currentStep: "checkout",
      },
      null,
    );

    expect(restored?.selectedServiceIds).toEqual(["v2-rtu-flyer"]);
    expect(restored?.step).toBe("checkout");
  });

  it("lets the intake query restore intake over another persisted Route Map step", () => {
    const restored = resolveRouteMapRestoredJourney(
      {
        jobId: "v2-rtu-flyer",
        roadId: "random-exit",
        selectedAt: "2026-07-10T12:00:00.000Z",
        currentStep: "checkout",
      },
      "intake",
    );

    expect(restored).toEqual({
      step: "intake",
      jobId: "v2-rtu-flyer",
      roadId: "random-exit",
      selectedServiceIds: ["v2-rtu-flyer"],
    });
  });

  it("builds checkout summary display", () => {
    const job = getRouteMapJob("rm-j007")!;
    const summary = buildRouteMapPaymentSummary(job);
    expect(summary.amountDueTodayDisplay).toBe("$69");
  });

  it("builds I-20 final calibrated prices in multi-service payment summary", () => {
    const summary = buildRouteMapPaymentSummaryFromServices([
      "v2-rtu-email-kit",
      "v2-rtu-sms-kit",
      "v2-rtu-voice",
      "rm-j007",
    ]);
    expect(summary.amountDueTodayCents).toBe(34600);
    expect(summary.amountDueTodayDisplay).toBe("$346");
  });

  it("lands on Building Concepts after V2 intake — not review-ready", () => {
    const paidAt = "2026-07-01T12:00:00.000Z";
    const intakeAt = "2026-07-01T12:05:00.000Z";
    let campaign = createCampaignFromRouteMapJob("v2-rtu-flyer", "random-exit")!;
    campaign = {
      ...campaign,
      paymentReceivedAt: paidAt,
      approvedStudioPlan: buildApprovedPlanFromRouteMapJob(getRouteMapJob("v2-rtu-flyer")!),
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
          flyerPurpose: "Grand opening flyer",
          mustInclude: "June 15 opening, 10% off",
          materials: "Logo PNG attached",
          intendedUse: "Print",
          sizeNotes: "8.5x11",
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

  it("lands on Building Concepts after continuing V1 intake", () => {
    const paidAt = "2026-07-01T12:00:00.000Z";
    const intakeAt = "2026-07-01T12:05:00.000Z";
    let campaign = createCampaignFromRouteMapJob("rm-j002", "i75")!;
    campaign = {
      ...campaign,
      paymentReceivedAt: paidAt,
      approvedStudioPlan: buildApprovedPlanFromRouteMapJob(getRouteMapJob("rm-j002")!),
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
          platform: "Instagram",
          businessName: "Sunrise Bakery",
          profileGoal: "Show daily specials",
          currentProfileNotes: "Current bio needs clearer offer wording",
          brandNotes: "Warm tones",
        },
        intakeAt,
      );

      expect(submitted?.campaignStatus).toBe("BUILDING_CONCEPTS");
      expect(hasCampaignCreativeBrief(submitted)).toBe(true);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it("does not expose a creative brief before Route Map intake is submitted", () => {
    const campaign = createCampaignFromRouteMapJob("v2-rtu-social-posts", "random-exit")!;
    expect(hasCampaignCreativeBrief(campaign)).toBe(false);
  });

  it("approves a Route Map plan from a singular legacy job id", () => {
    withMockedBrowserStorage(() => {
      selectRouteMapJob("v2-rtu-flyer", "random-exit");

      const updated = saveApprovedRouteMapPlan("v2-rtu-flyer");

      expect(updated?.approvedStudioPlan?.selectedServiceIds).toEqual(["v2-rtu-flyer"]);
      expect(updated?.routeMapContext?.jobId).toBe("v2-rtu-flyer");
      expect(updated?.routeMapContext?.currentStep).toBe("checkout");
    });
  });

  it("approves a Route Map plan from a multi-service selected list", () => {
    withMockedBrowserStorage(() => {
      addRouteMapServiceToPlan("v2-rtu-flyer", "random-exit");
      addRouteMapServiceToPlan("v2-rtu-social-posts", "i20");

      const updated = saveApprovedRouteMapPlan(["v2-rtu-flyer", "v2-rtu-social-posts"]);

      expect(updated?.approvedStudioPlan?.selectedServiceIds).toEqual([
        "v2-rtu-flyer",
        "v2-rtu-social-posts",
      ]);
      expect(updated?.approvedStudioPlan?.amountDueTodayCents).toBe(16800);
      expect(updated?.routeMapContext?.currentStep).toBe("checkout");
    });
  });

  it("rejects an empty selected-service list on approval", () => {
    withMockedBrowserStorage(() => {
      selectRouteMapJob("v2-rtu-flyer", "random-exit");

      const updated = saveApprovedRouteMapPlan([]);

      expect(updated).toBeNull();
    });
  });

  it("rejects an invalid legacy job id on approval", () => {
    withMockedBrowserStorage(() => {
      selectRouteMapJob("v2-rtu-flyer", "random-exit");

      const updated = saveApprovedRouteMapPlan("not-a-real-job" as RouteMapJobId);

      expect(updated).toBeNull();
    });
  });

  it("returns null when approving with no current campaign", () => {
    withMockedBrowserStorage(() => {
      expect(saveApprovedRouteMapPlan("v2-rtu-flyer")).toBeNull();
      expect(saveApprovedRouteMapPlan(["v2-rtu-flyer"])).toBeNull();
    });
  });

  describe("paid-plan mutation guards (Phase 1 defensive boundary)", () => {
    const CAMPAIGN_KEY = "studio-squishy:current-campaign";

    function seedPaidCampaign(storage: Map<string, string>) {
      addRouteMapServiceToPlan("v2-rtu-flyer", "random-exit");
      const raw = storage.get(CAMPAIGN_KEY);
      if (!raw) throw new Error("expected a seeded campaign in storage");
      const campaign = JSON.parse(raw);
      campaign.paymentReceivedAt = "2026-07-01T12:00:00.000Z";
      storage.set(CAMPAIGN_KEY, JSON.stringify(campaign));
      return campaign;
    }

    it("addRouteMapServiceToPlan refuses to change a paid campaign", () => {
      withMockedBrowserStorage((storage) => {
        const paid = seedPaidCampaign(storage);
        const before = storage.get(CAMPAIGN_KEY);

        const result = addRouteMapServiceToPlan("v2-rtu-menu", "random-exit");

        expect(result?.approvedStudioPlan).toEqual(paid.approvedStudioPlan);
        expect(result?.routeMapContext?.selectedServiceIds).toEqual(
          paid.routeMapContext.selectedServiceIds,
        );
        expect(storage.get(CAMPAIGN_KEY)).toBe(before);
      });
    });

    it("removeRouteMapServiceFromPlan refuses to change a paid campaign", () => {
      withMockedBrowserStorage((storage) => {
        seedPaidCampaign(storage);
        const before = storage.get(CAMPAIGN_KEY);

        const result = removeRouteMapServiceFromPlan("v2-rtu-flyer");

        expect(result).toBeNull();
        expect(storage.get(CAMPAIGN_KEY)).toBe(before);
      });
    });

    it("saveApprovedRouteMapPlan refuses to overwrite a paid campaign", () => {
      withMockedBrowserStorage((storage) => {
        seedPaidCampaign(storage);
        const before = storage.get(CAMPAIGN_KEY);

        const result = saveApprovedRouteMapPlan(["v2-rtu-menu"]);

        expect(result).toBeNull();
        expect(storage.get(CAMPAIGN_KEY)).toBe(before);
      });
    });

    it("keeps approvedStudioPlan byte-for-byte unchanged after every blocked attempt", () => {
      withMockedBrowserStorage((storage) => {
        const paid = seedPaidCampaign(storage);

        addRouteMapServiceToPlan("v2-rtu-menu", "random-exit");
        removeRouteMapServiceFromPlan("v2-rtu-flyer");
        saveApprovedRouteMapPlan(["v2-rtu-menu"]);

        const after = JSON.parse(storage.get(CAMPAIGN_KEY)!);
        expect(after.approvedStudioPlan).toEqual(paid.approvedStudioPlan);
      });
    });

    it("keeps selectedServiceIds unchanged after every blocked attempt", () => {
      withMockedBrowserStorage((storage) => {
        const paid = seedPaidCampaign(storage);

        addRouteMapServiceToPlan("v2-rtu-menu", "random-exit");
        removeRouteMapServiceFromPlan("v2-rtu-flyer");

        const after = JSON.parse(storage.get(CAMPAIGN_KEY)!);
        expect(after.routeMapContext.selectedServiceIds).toEqual(
          paid.routeMapContext.selectedServiceIds,
        );
      });
    });

    it("unpaid campaigns continue to support add, remove, and approve exactly as before", () => {
      withMockedBrowserStorage(() => {
        const added = addRouteMapServiceToPlan("v2-rtu-flyer", "random-exit");
        expect(added?.routeMapContext?.selectedServiceIds).toEqual(["v2-rtu-flyer"]);

        const alsoAdded = addRouteMapServiceToPlan("v2-rtu-menu", "random-exit");
        expect(alsoAdded?.routeMapContext?.selectedServiceIds).toEqual([
          "v2-rtu-flyer",
          "v2-rtu-menu",
        ]);

        const removed = removeRouteMapServiceFromPlan("v2-rtu-flyer");
        expect(removed?.routeMapContext?.selectedServiceIds).toEqual(["v2-rtu-menu"]);

        const approved = saveApprovedRouteMapPlan(["v2-rtu-menu"]);
        expect(approved?.approvedStudioPlan?.selectedServiceIds).toEqual(["v2-rtu-menu"]);
      });
    });

    it("the existing paid campaign can still be read and restored normally", () => {
      withMockedBrowserStorage((storage) => {
        const paid = seedPaidCampaign(storage);

        const restored = resolveRouteMapRestoredJourney(paid.routeMapContext, null);

        expect(restored?.jobId).toBe("v2-rtu-flyer");
        expect(restored?.selectedServiceIds).toEqual(paid.routeMapContext.selectedServiceIds);
      });
    });
  });
});

describe("route-map intake E2E paths (programmatic)", () => {
  function mockStorageCampaign(campaign: ReturnType<typeof createCampaignFromRouteMapJob>) {
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

  it("path 1: V2 ready-to-use flyer → short intake → Building Concepts", () => {
    const job = getRouteMapJob("v2-rtu-flyer")!;
    expect(job.intakeType).toBe("rtu-flyer");
    const plan = buildApprovedPlanFromRouteMapJob(job);
    let campaign = createCampaignFromRouteMapJob("v2-rtu-flyer", "random-exit")!;
    campaign = { ...campaign!, paymentReceivedAt: new Date().toISOString(), approvedStudioPlan: plan };
    const restore = mockStorageCampaign(campaign);
    try {
      const submitted = submitRouteMapIntake({
        flyerPurpose: "Summer sale",
        mustInclude: "20% off",
        materials: "Logo",
        intendedUse: "Print",
      });
      expect(submitted?.campaignStatus).toBe("BUILDING_CONCEPTS");
      expect(submitted).not.toBeNull();
      if (!submitted) throw new Error("Expected Route Map intake submission");
      expect(getRouteMapIntakeSchema("rtu-flyer").title).toBe("Flyer Intake");
      expect(resolveRouteMapClientSummary(submitted)).not.toBeNull();
      expect(hasRouteMapProductionBrief(submitted)).toBe(true);
    } finally {
      restore();
    }
  });

  it("path 2: V2 social posts → intake without retired post/publish add-on", () => {
    const job = getRouteMapJob("v2-rtu-social-posts")!;
    const plan = buildApprovedPlanFromRouteMapJob(job);
    expect(plan.lineItems).toHaveLength(1);
    let campaign = createCampaignFromRouteMapJob("v2-rtu-social-posts", "i20")!;
    campaign = {
      ...campaign,
      paymentReceivedAt: new Date().toISOString(),
      approvedStudioPlan: plan,
    };
    const schema = getRouteMapIntakeSchema("rtu-social-posts");
    expect(schema.fields.some((f) => f.id === "publishPlatform")).toBe(false);
    const restore = mockStorageCampaign(campaign);
    try {
      const submitted = submitRouteMapIntake({
        postsAbout: "Launch",
        callToAction: "Shop",
        platform: "Instagram",
        materials: "Photos",
      });
      expect(submitted?.campaignStatus).toBe("BUILDING_CONCEPTS");
      expect(hasRouteMapProductionBrief(submitted)).toBe(true);
    } finally {
      restore();
    }
  });

  it("path 3: V2 email kit → client-responsibility intake → Building Concepts", () => {
    const job = getRouteMapJob("v2-rtu-email-kit")!;
    expect(job.intakeType).toBe("rtu-email-kit");
    const schema = getRouteMapIntakeSchema("rtu-email-kit");
    expect(schema.clientResponsibilityNote).toContain("list");
    let campaign = createCampaignFromRouteMapJob("v2-rtu-email-kit", "i20")!;
    campaign = {
      ...campaign!,
      paymentReceivedAt: new Date().toISOString(),
      approvedStudioPlan: buildApprovedPlanFromRouteMapJob(job),
    };
    const restore = mockStorageCampaign(campaign);
    try {
      const submitted = submitRouteMapIntake({
        campaignGoal: "Promo",
        mustInclude: "Code SAVE10",
        callToAction: "Shop",
        materials: "Logo",
        listConsent: "Yes — I own the list and have consent",
        sendingAccount: "Mailchimp",
      });
      expect(submitted?.campaignStatus).toBe("BUILDING_CONCEPTS");
      expect(hasRouteMapProductionBrief(submitted)).toBe(true);
    } finally {
      restore();
    }
  });

  it("path 4: V2 short video → intake → Building Concepts + production brief", () => {
    const job = getRouteMapJob("v2-rtu-short-video")!;
    expect(job.intakeType).toBe("rtu-short-video");
    let campaign = createCampaignFromRouteMapJob("v2-rtu-short-video", "i20")!;
    campaign = {
      ...campaign!,
      paymentReceivedAt: new Date().toISOString(),
      approvedStudioPlan: buildApprovedPlanFromRouteMapJob(job),
    };
    const restore = mockStorageCampaign(campaign);
    try {
      const submitted = submitRouteMapIntake({
        videoPurpose: "Promo reel",
        format: "Vertical",
        footageMaterials: "Logo + b-roll",
        onScreenText: "Book now",
      });
      expect(submitted?.campaignStatus).toBe("BUILDING_CONCEPTS");
      expect(hasRouteMapProductionBrief(submitted)).toBe(true);
      expect(getRouteMapIntakeSchema("rtu-short-video").title).toBe("Short Video Intake");
    } finally {
      restore();
    }
  });

  it("path 5: continuing V1 rm-j002 → social-setup intake unchanged", () => {
    const job = getRouteMapJob("rm-j002")!;
    expect(job.intakeType).toBe("social-setup");
    let campaign = createCampaignFromRouteMapJob("rm-j002", "i75")!;
    campaign = {
      ...campaign!,
      paymentReceivedAt: new Date().toISOString(),
      approvedStudioPlan: buildApprovedPlanFromRouteMapJob(job),
    };
    const restore = mockStorageCampaign(campaign);
    try {
      const submitted = submitRouteMapIntake({
        platform: "Facebook",
        businessName: "Acme",
        profileGoal: "Visibility",
        currentProfileNotes: "New Page — need full setup kit",
      });
      expect(submitted?.campaignStatus).toBe("BUILDING_CONCEPTS");
      expect(getRouteMapIntakeSchema("social-setup").title).toBe(
        "Social Profile Kit Intake",
      );
      expect(job.name).toBe("Make Me a Social Profile Setup Kit");
    } finally {
      restore();
    }
  });
});
