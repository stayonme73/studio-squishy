import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog";
import { ACTIVE_CUSTOMER_FACING_SKUS } from "@/lib/studio-kitchen-production/active-set";
import {
  getJobsForRoad,
  getRouteMapJob,
  getSelectableRouteMapRoads,
  ROUTE_MAP_V1,
} from "@/config/route-map-v1";
import {
  INTERNAL_SELL_NOW_SKUS,
  ORIGINAL_FROZEN_NINE_SELL_NOW_SKUS,
  studioInternalSellNowRegisterV1,
} from "@/config/studio-internal-sell-now-register-v1";
import {
  PUBLIC_SHELF_WITHHELD_ENTRIES,
  studioPublicShelfHonestyV1,
} from "@/config/studio-public-shelf-honesty-v1";
import { listCanonicalLaunchPackages } from "@/lib/studio-canonical-menu-enforcement/enforcement";

const EXPECTED_PRICES: Record<(typeof INTERNAL_SELL_NOW_SKUS)[number], number> = {
  "v2-rtu-flyer": 6900,
  "v2-rtu-promotion-graphics": 7900,
  "v2-rtu-social-posts": 9900,
  "v2-rtu-business-card": 6900,
  "v2-rtu-menu": 8900,
  "v2-rtu-service-sheet": 7900,
  "v2-rtu-email-kit": 12900,
  "v2-rtu-sms-kit": 6900,
  "v2-rtu-short-video": 14900,
  "v2-rtu-short-form-video-edit": 34900,
  "v2-rtu-clip-repurposing": 54900,
};

const EXPECTED_INTAKE: Record<(typeof INTERNAL_SELL_NOW_SKUS)[number], string> = {
  "v2-rtu-flyer": "rtu-flyer",
  "v2-rtu-promotion-graphics": "rtu-promotion-graphics",
  "v2-rtu-social-posts": "rtu-social-posts",
  "v2-rtu-business-card": "rtu-business-card",
  "v2-rtu-menu": "rtu-menu",
  "v2-rtu-service-sheet": "rtu-service-sheet",
  "v2-rtu-email-kit": "rtu-email-kit",
  "v2-rtu-sms-kit": "rtu-sms-kit",
  "v2-rtu-short-video": "rtu-short-video",
  "v2-rtu-short-form-video-edit": "rtu-short-form-video-edit",
  "v2-rtu-clip-repurposing": "rtu-clip-repurposing",
};

function uniquePublicIds(): string[] {
  return [...new Set(ROUTE_MAP_V1.jobs.map((job) => job.id))].sort();
}

describe("STUDIO-OPERATING-PUBLIC-SHELF-HONESTY-1", () => {
  it("explains the old 16-count as Voice plus four continuing V1 jobs", () => {
    expect(studioPublicShelfHonestyV1.beforeCustomerVisibleCount).toBe(16);
    expect(studioPublicShelfHonestyV1.afterCustomerVisibleCount).toBe(11);
    expect(PUBLIC_SHELF_WITHHELD_ENTRIES.map((entry) => entry.id)).toEqual([
      "v2-rtu-voice",
      "rm-j002",
      "rm-j005",
      "rm-j007",
      "rm-j008",
    ]);
  });

  it("exposes exactly the 11 certified public SELL NOW services to a stranger", () => {
    const ids = uniquePublicIds();
    expect(ids).toEqual([...INTERNAL_SELL_NOW_SKUS].sort());
    expect(ids).toHaveLength(11);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(studioPublicShelfHonestyV1.drivesCustomerFacingAvailability).toBe(false);
    expect(listCanonicalLaunchPackages()).toHaveLength(3);
  });

  it("does not leak unpublished, internal, or discontinued services onto customer roads", () => {
    for (const road of getSelectableRouteMapRoads()) {
      const ids = getJobsForRoad(road.id).map((job) => job.id);
      expect(ids).not.toContain("v2-rtu-voice");
      expect(ids).not.toContain("rm-j002");
      expect(ids).not.toContain("rm-j005");
      expect(ids).not.toContain("rm-j007");
      expect(ids).not.toContain("rm-j008");
      expect(ids).not.toContain("v2-rtu-handout");
      expect(ids).not.toContain("rm-j003");
      expect(ids).not.toContain("rm-j004");
      expect(ids).not.toContain("rm-j006");
      expect(ids.every((id) => INTERNAL_SELL_NOW_SKUS.includes(id as never))).toBe(true);
    }
  });

  it("keeps correct current prices and intake routes, including 349 and 549", () => {
    for (const sku of INTERNAL_SELL_NOW_SKUS) {
      const job = getRouteMapJob(sku);
      const catalog = getServiceById(sku);
      expect(job?.priceCents, sku).toBe(EXPECTED_PRICES[sku]);
      expect(catalog?.priceCents, sku).toBe(EXPECTED_PRICES[sku]);
      expect(job?.intakeType, sku).toBe(EXPECTED_INTAKE[sku]);
    }
    expect(getRouteMapJob("v2-rtu-short-form-video-edit")?.priceCents).toBe(34900);
    expect(getRouteMapJob("v2-rtu-clip-repurposing")?.priceCents).toBe(54900);
  });

  it("leaves the original nine prices unchanged", () => {
    for (const sku of ORIGINAL_FROZEN_NINE_SELL_NOW_SKUS) {
      expect(getRouteMapJob(sku)?.priceCents).toBe(EXPECTED_PRICES[sku]);
    }
  });

  it("does not destroy internal factory capability for the withheld five", () => {
    expect(ACTIVE_CUSTOMER_FACING_SKUS).toHaveLength(22);
    expect(getRouteMapJob("v2-rtu-voice")?.name).toBe("Make Me a Voice Announcement");
    expect(getRouteMapJob("rm-j002")?.intakeType).toBe("social-setup");
    expect(getRouteMapJob("rm-j005")?.intakeType).toBe("page");
    expect(getRouteMapJob("rm-j007")?.intakeType).toBe("update");
    expect(getRouteMapJob("rm-j008")?.intakeType).toBe("social-update");
    expect(getServiceById("v2-rtu-voice")?.id).toBe("v2-rtu-voice");
    expect(getServiceById("rm-j002")?.id).toBe("rm-j002");
  });
});
