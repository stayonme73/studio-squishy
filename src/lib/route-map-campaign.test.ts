import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import {
  getJobsForRoad,
  getRouteMapIntakeTypeForSku,
  getRouteMapJob,
  getRouteStartJob,
  getSelectableRouteMapRoads,
  resolveRouteMapShelfJobId,
  ROUTE_MAP_V1,
} from "@/config/route-map-v1";
import { getRouteMapIntakeSchema } from "@/config/route-map-intake-v1";
import {
  buildApprovedPlanFromRouteMapJob,
  buildRouteMapPaymentSummary,
  createCampaignFromRouteMapJob,
  isRouteMapPostPublishAddonEligible,
  submitRouteMapIntake,
} from "@/lib/route-map-campaign";
import { resolveCustomerJourneySteps } from "@/lib/customer-journey";
import { hasCampaignCreativeBrief } from "@/lib/campaign-brief-source";
import { hasRouteMapProductionBrief, resolveRouteMapClientSummary } from "@/lib/route-map-production-brief";
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

  it("lists activated V2 + continuing V1 shelf jobs (retired rm-j003/004/006 excluded)", () => {
    const ids = ROUTE_MAP_V1.jobs.map((job) => job.id);
    expect(ids).toContain("v2-rtu-flyer");
    expect(ids).toContain("v2-rtu-social-posts");
    expect(ids).toContain("rm-j005");
    expect(ids).not.toContain("rm-j003");
    expect(ids).not.toContain("rm-j004");
    expect(ids).not.toContain("rm-j006");
    expect(ROUTE_MAP_V1.jobs.length).toBe(13);
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

  it("exposes Route Start as separate advisory job", () => {
    const routeStart = getRouteStartJob();
    expect(routeStart?.id).toBe("rm-j001");
    expect(routeStart?.isRouteStart).toBe(true);
    expect(routeStart?.roads).toEqual(["i75", "i20", "update", "random-exit"]);
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

    expect(i75Ids).not.toContain("v2-rtu-email-kit");
    expect(i75Ids).not.toContain("v2-rtu-sms-kit");
    expect(updateIds).not.toContain("v2-rtu-email-kit");
    expect(i20Ids).toContain("v2-rtu-email-kit");
    expect(i20Ids).toContain("v2-rtu-sms-kit");
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
      "rm-j001",
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

  it("rm-j008 uses updated profile/platform name at $400 on update + random-exit", () => {
    const job = getRouteMapJob("rm-j008");
    expect(job?.name).toBe("Update My Facebook, Instagram, or TikTok");
    expect(job?.priceCents).toBe(40000);
    expect(job?.priceDisplay).toBe("$400");
    expect(job?.roads).toEqual(["update", "random-exit"]);
  });

  it("V2 RTU jobs read turnaround from V2 draft — not global 7-day copy", () => {
    const flyer = getRouteMapJob("v2-rtu-flyer");
    expect(flyer?.timingLabel.toLowerCase()).toContain("2–3 business days");
    expect(flyer?.timingLabel.toLowerCase()).not.toContain("7 business");
  });

  it("uses job-specific timing for continuing V1 jobs", () => {
    const job = getRouteMapJob("rm-j005");
    expect(job?.timingLabel).toBe("First draft within 5 business days after intake is complete.");
    expect(ROUTE_MAP_V1.promiseFooter.toLowerCase()).not.toContain("7 business");
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
    expect(getRouteMapJob("rm-j008")?.intakeType).toBe("social-setup");
  });

  it("redirects retired shelf IDs to V2 intake templates", () => {
    expect(resolveRouteMapShelfJobId("rm-j003")).toBe("v2-rtu-social-posts");
    expect(getRouteMapJob("v2-rtu-social-posts")?.intakeType).toBe("rtu-social-posts");
    expect(resolveRouteMapShelfJobId("rm-j004")).toBe("v2-rtu-short-video");
    expect(getRouteMapJob("v2-rtu-short-video")?.intakeType).toBe("rtu-short-video");
    expect(resolveRouteMapShelfJobId("rm-j006")).toBe("v2-rtu-voice");
    expect(getRouteMapJob("v2-rtu-voice")?.intakeType).toBe("rtu-voice");
  });

  it("appends Post/Publish fields when add-on purchased at checkout", () => {
    const base = getRouteMapIntakeSchema("rtu-social-posts");
    const withAddon = getRouteMapIntakeSchema("rtu-social-posts", { includePostPublish: true });
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
  it("builds approved plan from V2 social posts catalog pricing", () => {
    const job = getRouteMapJob("v2-rtu-social-posts");
    expect(job).toBeDefined();
    const plan = buildApprovedPlanFromRouteMapJob(job!);
    expect(plan.amountDueTodayCents).toBe(45000);
    expect(plan.lineItems[0]?.serviceName).toBe("Make My Social Media Posts");
    expect(plan.lineItems[0]?.skuId).toBe("v2-rtu-social-posts");
  });

  it("adds post/publish add-on line item when requested for eligible parent", () => {
    const job = getRouteMapJob("v2-rtu-social-posts")!;
    expect(isRouteMapPostPublishAddonEligible(job.id)).toBe(true);
    const plan = buildApprovedPlanFromRouteMapJob(job, { includePostPublishAddon: true });
    expect(plan.amountDueTodayCents).toBe(55000);
    expect(plan.lineItems).toHaveLength(2);
    expect(plan.lineItems[1]?.skuId).toBe("v2-addon-post-publish");
  });

  it("does not offer post/publish add-on for voice RTU", () => {
    const job = getRouteMapJob("v2-rtu-voice")!;
    expect(isRouteMapPostPublishAddonEligible(job.id)).toBe(false);
  });

  it("creates campaign for continuing V1 job", () => {
    const campaign = createCampaignFromRouteMapJob("rm-j005", "i20");
    expect(campaign?.campaignName).toBe(
      "Make Me a Page for My Sale, Event, Opening, Service, or Offer",
    );
    expect(campaign?.approvedStudioPlan?.amountDueTodayCents).toBe(65000);
    expect(campaign?.routeMapContext?.roadId).toBe("i20");
  });

  it("creates campaign for V2 RTU job", () => {
    const campaign = createCampaignFromRouteMapJob("v2-rtu-flyer", "random-exit");
    expect(campaign?.campaignName).toBe("Make Me a Flyer");
    expect(campaign?.approvedStudioPlan?.amountDueTodayCents).toBe(30000);
    expect(campaign?.routeMapContext?.jobId).toBe("v2-rtu-flyer");
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
          accountAccess: "Admin invite sent",
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
      expect(getRouteMapIntakeSchema("rtu-flyer").title).toBe("Flyer Intake");
      expect(resolveRouteMapClientSummary(submitted)).not.toBeNull();
      expect(hasRouteMapProductionBrief(submitted)).toBe(true);
    } finally {
      restore();
    }
  });

  it("path 2: V2 social posts + Post/Publish add-on → intake with publish fields", () => {
    const job = getRouteMapJob("v2-rtu-social-posts")!;
    const plan = buildApprovedPlanFromRouteMapJob(job, { includePostPublishAddon: true });
    expect(plan.lineItems).toHaveLength(2);
    let campaign = createCampaignFromRouteMapJob("v2-rtu-social-posts", "i20", {
      includePostPublishAddon: true,
    })!;
    campaign = {
      ...campaign,
      paymentReceivedAt: new Date().toISOString(),
      approvedStudioPlan: plan,
      routeMapContext: { ...campaign.routeMapContext!, postPublishAddon: true },
    };
    const schema = getRouteMapIntakeSchema("rtu-social-posts", { includePostPublish: true });
    expect(schema.fields.some((f) => f.id === "publishPlatform")).toBe(true);
    const restore = mockStorageCampaign(campaign);
    try {
      const submitted = submitRouteMapIntake({
        postsAbout: "Launch",
        callToAction: "Shop",
        platform: "Instagram",
        materials: "Photos",
        publishPlatform: "Instagram",
        publishAccess: "Invite sent",
        publishTiming: "ASAP",
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
        accountAccess: "Admin invite",
      });
      expect(submitted?.campaignStatus).toBe("BUILDING_CONCEPTS");
      expect(getRouteMapIntakeSchema("social-setup").title).toBe("Social Profile Setup");
    } finally {
      restore();
    }
  });
});
