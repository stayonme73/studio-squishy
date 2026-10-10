import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog";
import { ROUTE_MAP_REVISION_TEMPLATE } from "@/catalog/route-map-shared-copy";
import {
  getCheckoutTimingLabel,
  getRouteMapTurnaroundLabel,
} from "@/catalog/route-map-display";
import { ACTIVE_CUSTOMER_FACING_SKUS } from "@/lib/studio-kitchen-production/active-set";
import {
  getJobsForRoad,
  getRouteMapJob,
  getSelectableRouteMapRoads,
  ROUTE_MAP_V1,
} from "@/config/route-map-v1";
import {
  INTERNAL_SELL_NOW_SKUS,
  isInternalSellNowSku,
  studioInternalSellNowRegisterV1,
} from "@/config/studio-internal-sell-now-register-v1";
import { studioCustomerReadyOperatingGuideV1 as guide } from "@/config/studio-customer-ready-operating-guide-v1";
import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import {
  LAUNCH_MENU_FROZEN_PRICES_CENTS,
  LAUNCH_MENU_HONEST_TIMING_LABEL,
  studioMenuReadinessAndDemandFreezeV1 as stamp,
} from "@/config/studio-menu-readiness-and-demand-freeze-v1";
import { studioPreLaunchMasterCloseoutRegisterV1 } from "@/config/studio-pre-launch-master-closeout-register-v1";
import { PUBLIC_SHELF_WITHHELD_ENTRIES } from "@/config/studio-public-shelf-honesty-v1";
import { listCanonicalLaunchPackages } from "@/lib/studio-canonical-menu-enforcement/enforcement";
import { expandDrawerTimelineItems } from "@/lib/project-builder-drawer-timing";
import { buildProjectBuilderStudioPlanSummary } from "@/lib/project-builder-studio-plan-summary";

const REPO = path.resolve(__dirname, "../../..");

describe("STUDIO-OPERATING-MENU-READINESS-AND-DEMAND-FREEZE-1", () => {
  it("freezes public 11 to internal SELL NOW 11 with matching prices", () => {
    expect(stamp.publicLaunchCount).toBe(11);
    expect(stamp.internalSellNowCount).toBe(11);
    expect(stamp.frozenSkus).toEqual(INTERNAL_SELL_NOW_SKUS);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(stamp.definesCurrentLaunchCount).toBe(false);
    expect(stamp.definesCurrentLaunchPrices).toBe(false);
    expect([...new Set(ROUTE_MAP_V1.jobs.map((job) => job.id))].sort()).toEqual(
      [...INTERNAL_SELL_NOW_SKUS].sort(),
    );
    for (const sku of INTERNAL_SELL_NOW_SKUS) {
      expect(getRouteMapJob(sku)?.priceCents, sku).toBe(
        LAUNCH_MENU_FROZEN_PRICES_CENTS[sku],
      );
      expect(getServiceById(sku)?.priceCents, sku).toBe(
        LAUNCH_MENU_FROZEN_PRICES_CENTS[sku],
      );
    }
  });

  it("keeps withheld, kitchen-only, and carousel off the public launch menu", () => {
    const publicIds = new Set<string>(
      listCanonicalLaunchPackages().flatMap((pkg) => (pkg.factorySku ? [pkg.factorySku] : [])),
    );
    for (const entry of PUBLIC_SHELF_WITHHELD_ENTRIES) {
      expect(publicIds.has(entry.id)).toBe(false);
    }
    for (const road of getSelectableRouteMapRoads()) {
      for (const job of getJobsForRoad(road.id)) {
        expect(isInternalSellNowSku(job.id)).toBe(true);
      }
    }
    expect(publicIds.has("v2-rtu-handout")).toBe(false);
    expect(publicIds.has("v2-rtu-voice")).toBe(false);
    expect(stamp.carousel).toBe("NOT_ON_LAUNCH_MENU");
    expect(ACTIVE_CUSTOMER_FACING_SKUS).toHaveLength(stamp.kitchenFactoryCount);
    expect(ACTIVE_CUSTOMER_FACING_SKUS).toHaveLength(22);
  });

  it("gives each public service honest scope, materials, exclusions, and revision limits", () => {
    for (const sku of INTERNAL_SELL_NOW_SKUS) {
      const catalog = getServiceById(sku);
      expect(catalog, sku).toBeDefined();
      expect(catalog!.purpose.length, sku).toBeGreaterThan(20);
      expect(catalog!.deliverables.length, sku).toBeGreaterThan(0);
      expect(catalog!.exclusions.length, sku).toBeGreaterThan(0);
      expect(catalog!.revisionRule, sku).toBe(ROUTE_MAP_REVISION_TEMPLATE);
      expect(catalog!.clientResponsibilities.length, sku).toBeGreaterThan(0);
      expect(catalog!.purpose.toLowerCase(), sku).not.toMatch(/unlimited/);
    }
  });

  it("replaces dated public turnaround promises with honest slot-wait copy", () => {
    for (const sku of INTERNAL_SELL_NOW_SKUS) {
      const catalog = getServiceById(sku)!;
      const job = getRouteMapJob(sku);
      expect(getRouteMapTurnaroundLabel(catalog), sku).toBe(LAUNCH_MENU_HONEST_TIMING_LABEL);
      expect(getCheckoutTimingLabel(catalog), sku).toBe(LAUNCH_MENU_HONEST_TIMING_LABEL);
      expect(job?.timingLabel, sku).toBe(LAUNCH_MENU_HONEST_TIMING_LABEL);
      expect(job?.timingLabel, sku).not.toMatch(/\d+\s*[–-]\s*\d+\s+business days/i);
    }
    const drawer = expandDrawerTimelineItems(getRouteMapJob("v2-rtu-flyer")!.timingLabel);
    expect(drawer[0]).toBe(LAUNCH_MENU_HONEST_TIMING_LABEL);
    const plan = buildProjectBuilderStudioPlanSummary(
      ["v2-rtu-flyer", "v2-rtu-social-posts"],
      "i75",
    );
    expect(plan.overallTimelineDisplay).toBe(LAUNCH_MENU_HONEST_TIMING_LABEL);
    expect(plan.deliverableTimelines.every((item) => item.timingDisplay === stamp.honestTimingShortLabel)).toBe(
      true,
    );
  });

  it("does not treat this stamp as capacity certification or a license to grow the menu", () => {
    expect(stamp.capacityCertified).toBe(false);
    expect(stamp.doNotCapacityCertifyHere).toBe(true);
    expect(stamp.doNotAddService).toBe(true);
    expect(stamp.doNotLowerQuality).toBe(true);
    expect(stamp.doNotInventDemandOrMarginData).toBe(true);
    expect(stamp.economics.evidencedUnitEconomics).toBe(false);
    expect(stamp.allowedDuringFreeze).toEqual([
      "genuine_defect_fix",
      "legal_or_rights_correction",
      "factual_correction",
      "owner_approved_commercial_exception",
    ]);
    expect(stamp.forbiddenDuringFreeze).toContain("add_service_without_owner_decision");
    expect(stamp.forbiddenDuringFreeze).toContain("lower_quality_to_absorb_demand");
    expect(ROUTE_MAP_V1.roads.find((road) => road.id === "i20")?.tagline).toContain(
      "quickly",
    );
  });

  it("writes the freeze record and points next at Owner-as-Customer without starting it", () => {
    expect(stamp.verdict).toBe("PASS_WITH_EXPLICIT_LIMITS");
    expect(stamp.nextPackageId).toBe(
      "STUDIO-OPERATING-OWNER-AS-CUSTOMER-REAL-STUDIO-CAMPAIGN-1",
    );
    expect(stamp.nextPackageStarted).toBe(false);
    expect(stamp.doNotStartNextFromThisStamp).toBe(true);
    expect(guide.nextUnfinishedStepId).toBe("controlled_outside_customer_trial");
    expect(guide.nextUnfinishedStepStatus).toBe("NOT_STARTED");
    expect(
      studioPreLaunchMasterCloseoutRegisterV1.recommendedNextSinglePackage.packageId,
    ).toBe("STUDIO-OPERATING-FAILURE-RECOVERY-ESCALATION-CERTIFICATION-1");
    expect(
      studioPreLaunchMasterCloseoutRegisterV1.recommendedNextSinglePackage.status,
    ).toBe("NOT_STARTED");
    expect(
      studioLaunchReadinessExecutionOrderV1.preLaunchMasterCloseoutRegister
        .recommendedNextPackageId,
    ).toBe("STUDIO-OPERATING-FAILURE-RECOVERY-ESCALATION-CERTIFICATION-1");
    expect(existsSync(path.join(REPO, stamp.stampDoc))).toBe(true);
    expect(existsSync(path.join(REPO, stamp.proofJson))).toBe(true);
    const proof = JSON.parse(
      readFileSync(path.join(REPO, stamp.proofJson), "utf8"),
    ) as {
      publicLaunchCount: number;
      internalSellNowCount: number;
      mismatchFound: boolean;
      nextPackageStarted: boolean;
      october15NewBlocker: boolean;
      merge: boolean;
      push: boolean;
    };
    expect(proof.publicLaunchCount).toBe(11);
    expect(proof.internalSellNowCount).toBe(11);
    expect(proof.mismatchFound).toBe(false);
    expect(proof.nextPackageStarted).toBe(false);
    expect(proof.october15NewBlocker).toBe(false);
    expect(proof.merge).toBe(false);
    expect(proof.push).toBe(false);
  });
});
