import { describe, expect, it } from "vitest";
import {
  deriveCompatibilityPricing,
  executionAddOnId,
  LEGACY_SERVICE_ID_ALIASES,
  resolveLegacyServiceId,
} from "@/catalog/compat";
import {
  getActiveLaunchServices,
  getServiceById,
  getServicePriceCents,
  sumPriceCentsForServices,
} from "@/catalog/accessors";
import { SERVICE_CATALOG } from "@/catalog/services";
import {
  canAttachExecutionAddOn,
  getActivePurchasableServices,
  validateExecutionAddOnsInPlan,
  validateServiceCatalog,
} from "@/catalog/validate";

const EXECUTION_ADDON_IDS = [
  "social_media-execution",
  "social_media-execution-monthly",
  "email_marketing-execution",
  "email_marketing-execution-monthly",
  "sms_marketing-execution",
  "sms_marketing-execution-monthly",
] as const;

describe("catalog slice 1 — v2 launch SKUs", () => {
  it("loads catalog without validation errors", () => {
    expect(() => validateServiceCatalog(SERVICE_CATALOG)).not.toThrow();
  });

  it("seeds exactly 28 active launch SKUs (22 base + 6 execution add-ons)", () => {
    const active = getActiveLaunchServices();
    expect(active).toHaveLength(28);
  });

  it("every active purchasable SKU has priceCents > 0", () => {
    for (const service of getActivePurchasableServices(SERVICE_CATALOG)) {
      expect(service.priceCents).toBeGreaterThan(0);
    }
  });

  it("every active purchasable SKU has required v2 fields", () => {
    for (const service of getActivePurchasableServices(SERVICE_CATALOG)) {
      expect(service.billingType).toBeTruthy();
      expect(service.productionLane).toBeTruthy();
      expect(service.firstReviewWindow.label).toBeTruthy();
      expect(
        service.finalDeliveryWindow?.label || service.monthlyCycleWindow?.label,
      ).toBeTruthy();
      expect(service.deliverables.length).toBeGreaterThan(0);
      expect(service.exclusions.length).toBeGreaterThan(0);
      expect(service.revisionRule.trim()).not.toBe("");
      expect(service.clientResponsibilities.length).toBeGreaterThan(0);
    }
  });

  it("no active catalog item exposes Quoted at checkout", () => {
    for (const service of getActivePurchasableServices(SERVICE_CATALOG)) {
      const derived = deriveCompatibilityPricing(service);
      expect(derived?.display.toLowerCase()).not.toContain("quoted at checkout");
      if (service.pricing?.display) {
        expect(service.pricing.display.toLowerCase()).not.toContain("quoted at checkout");
      }
    }
  });

  it("compatibility pricing is derived from priceCents, not duplicated in seeds", () => {
    const bf001 = getServiceById("bf-001");
    expect(bf001).toBeDefined();
    expect(bf001!.priceCents).toBe(49500);
    expect(bf001!.pricing).toEqual({
      display: "$495",
      amountUsd: 495,
      billing: "one-time",
    });
    expect(bf001!.pricing!.amountUsd).toBe(bf001!.priceCents / 100);

    const cp001 = getServiceById("cp-001");
    expect(cp001!.priceCents).toBe(89500);
    expect(cp001!.pricing).toEqual({
      display: "$895",
      amountUsd: 895,
      billing: "one-time",
    });

    const monthly = getServiceById("sm-001-monthly");
    expect(monthly!.pricing).toEqual({
      display: "$349/month",
      amountUsd: 349,
      billing: "monthly",
    });
  });

  it("all 28 active launch SKUs have approved priceCents", () => {
    const expectedPrices: Record<string, number> = {
      "bf-001": 49500,
      "bf-002": 59500,
      "cp-001": 89500,
      "cp-001-monthly": 34900,
      "sm-001": 39500,
      "sm-001-monthly": 34900,
      "em-001": 32500,
      "em-001-monthly": 22500,
      "sms-001": 17500,
      "sms-001-monthly": 14900,
      "cc-001": 22500,
      "cc-001-monthly": 24900,
      "cc-002": 42500,
      "cc-002-monthly": 59500,
      "vp-001": 79500,
      "vp-001-monthly": 99500,
      "ap-001": 17500,
      "lp-001": 89500,
      "mo-001": 39500,
      "mo-001-monthly": 34900,
      "ma-001": 49500,
      "ma-001-monthly": 44900,
      "social_media-execution": 10000,
      "social_media-execution-monthly": 15000,
      "email_marketing-execution": 7500,
      "email_marketing-execution-monthly": 10000,
      "sms_marketing-execution": 5000,
      "sms_marketing-execution-monthly": 7500,
    };

    const active = getActiveLaunchServices();
    expect(active).toHaveLength(Object.keys(expectedPrices).length);

    for (const service of active) {
      expect(service.priceCents).toBe(expectedPrices[service.id]);
      expect(deriveCompatibilityPricing(service)?.amountUsd).toBe(service.priceCents / 100);
    }
  });

  it("starting fresh foundation total is 238000 cents ($2,380)", () => {
    const foundationIds = ["bf-001", "bf-002", "cp-001", "sm-001"] as const;
    expect(sumPriceCentsForServices([...foundationIds])).toBe(238000);
  });

  it("legacy IDs resolve through alias map", () => {
    for (const [legacyId, canonicalId] of Object.entries(LEGACY_SERVICE_ID_ALIASES)) {
      expect(resolveLegacyServiceId(legacyId)).toBe(canonicalId);
      expect(getServiceById(legacyId)?.id).toBe(canonicalId);
    }
  });

  it("preserved one-time V1 IDs still resolve directly", () => {
    const preserved = [
      "bf-001",
      "bf-002",
      "cp-001",
      "sm-001",
      "em-001",
      "sms-001",
      "cc-001",
      "cc-002",
      "vp-001",
      "ap-001",
      "lp-001",
      "mo-001",
      "ma-001",
    ] as const;
    for (const id of preserved) {
      expect(getServiceById(id)?.id).toBe(id);
      expect(getServicePriceCents(id)).toBeGreaterThan(0);
    }
  });

  it("sumPriceCentsForServices totals selected SKUs", () => {
    const total = sumPriceCentsForServices(["bf-001", "em-001"]);
    expect(total).toBe(49500 + 32500);
  });

  it("retired services remain readable without aliasing", () => {
    expect(getServiceById("spark")?.id).toBe("spark");
    expect(getServiceById("email-marketing")?.id).toBe("email-marketing");
  });
});

describe("catalog execution add-ons", () => {
  it("seeds all 6 execution add-ons with approved pricing", () => {
    expect(getServiceById("social_media-execution")!.priceCents).toBe(10000);
    expect(getServiceById("social_media-execution-monthly")!.priceCents).toBe(15000);
    expect(getServiceById("email_marketing-execution")!.priceCents).toBe(7500);
    expect(getServiceById("email_marketing-execution-monthly")!.priceCents).toBe(10000);
    expect(getServiceById("sms_marketing-execution")!.priceCents).toBe(5000);
    expect(getServiceById("sms_marketing-execution-monthly")!.priceCents).toBe(7500);
  });

  it("execution add-on IDs follow family and billing convention", () => {
    expect(executionAddOnId("social_media", "one_time")).toBe("social_media-execution");
    expect(executionAddOnId("social_media", "monthly")).toBe("social_media-execution-monthly");
    expect(executionAddOnId("email_marketing", "one_time")).toBe("email_marketing-execution");
    expect(executionAddOnId("sms_marketing", "monthly")).toBe("sms_marketing-execution-monthly");
  });

  it("execution add-ons are not recommendable or addable alone", () => {
    for (const id of EXECUTION_ADDON_IDS) {
      const service = getServiceById(id)!;
      expect(service.isExecutionAddOn).toBe(true);
      expect(service.isRecommendable).toBe(false);
      expect(service.isAddable).toBe(false);
      expect(service.eligibleParentFamilyIds?.length).toBeGreaterThan(0);
    }
  });

  it("execution add-ons require matching parent service and billing in plan", () => {
    expect(
      validateExecutionAddOnsInPlan(["social_media-execution"], SERVICE_CATALOG).valid,
    ).toBe(false);
    expect(
      validateExecutionAddOnsInPlan(["sm-001", "social_media-execution"], SERVICE_CATALOG).valid,
    ).toBe(true);
    expect(
      validateExecutionAddOnsInPlan(
        ["sm-001-monthly", "social_media-execution"],
        SERVICE_CATALOG,
      ).valid,
    ).toBe(false);
    expect(
      validateExecutionAddOnsInPlan(
        ["em-001", "social_media-execution"],
        SERVICE_CATALOG,
      ).valid,
    ).toBe(false);
    expect(
      canAttachExecutionAddOn("email_marketing-execution-monthly", ["em-001-monthly"], SERVICE_CATALOG),
    ).toBe(true);
    expect(
      canAttachExecutionAddOn("email_marketing-execution-monthly", ["em-001"], SERVICE_CATALOG),
    ).toBe(false);
  });

  it("derived pricing for execution add-ons has no Quoted at checkout", () => {
    for (const id of EXECUTION_ADDON_IDS) {
      const service = getServiceById(id)!;
      const derived = deriveCompatibilityPricing(service);
      expect(derived!.display.toLowerCase()).not.toContain("quoted at checkout");
      expect(derived!.amountUsd).toBeGreaterThan(0);
    }
  });
});
