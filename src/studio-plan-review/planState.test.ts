import { describe, expect, it } from "vitest";
import {
  getDerivedServicePricing,
  getServiceById,
  getServicePriceCents,
} from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import {
  addServiceToPlan,
  computeAdditionalCostUsd,
  getAvailableServicesToAdd,
  initialPlanState,
  removeServiceFromPlan,
  swapServiceInPlan,
  type StudioPlanState,
} from "@/studio-plan-review/planState";

describe("planState — execution add-ons", () => {
  it("getAvailableServicesToAdd excludes hidden execution add-ons without a matching parent", () => {
    const available = getAvailableServicesToAdd(["bf-001"]);
    expect(available).not.toContain("social_media-execution");
    expect(available).toContain("em-001");
  });

  it("getAvailableServicesToAdd keeps execution add-ons hidden even when parent family matches", () => {
    const available = getAvailableServicesToAdd(["sm-001"]);
    expect(available).not.toContain("social_media-execution");
    expect(available).not.toContain("social_media-execution-monthly");
  });

  it("addServiceToPlan rejects hidden execution add-on without parent", () => {
    const state = initialPlanState(["bf-001"]);
    const next = addServiceToPlan(state, "social_media-execution");
    expect(next.selectedServiceIds).toEqual(["bf-001"]);
  });

  it("addServiceToPlan rejects hidden execution add-on even when parent is present", () => {
    const state = initialPlanState(["sm-001"]);
    const next = addServiceToPlan(state, "social_media-execution");
    expect(next.selectedServiceIds).toEqual(["sm-001"]);
  });

  it("removeServiceFromPlan cascades orphaned execution add-ons when present in saved state", () => {
    const state: StudioPlanState = {
      selectedServiceIds: ["sm-001", "social_media-execution"] as ServiceId[],
    };
    const next = removeServiceFromPlan(state, "sm-001");
    expect(next.selectedServiceIds).toEqual([]);
  });

  it("swapServiceInPlan removes incompatible execution add-ons from saved state", () => {
    const state: StudioPlanState = {
      selectedServiceIds: ["sm-001", "social_media-execution"] as ServiceId[],
    };
    const bf001 = getServiceById("bf-001")!;
    const sm001 = getServiceById("sm-001")!;
    expect(bf001.serviceClass).toBe(sm001.serviceClass);

    const next = swapServiceInPlan(state, "sm-001", "bf-001");
    expect(next.selectedServiceIds).toEqual(["bf-001"]);
  });
});

describe("planState — additional cost", () => {
  it("computeAdditionalCostUsd uses catalog accessors instead of legacy pricing fields", () => {
    const additionalIds = ["em-001", "cc-002"] as ServiceId[];
    const expectedUsd = additionalIds.reduce((sum, serviceId) => {
      const derived = getDerivedServicePricing(serviceId);
      return sum + (derived?.amountUsd ?? getServicePriceCents(serviceId) / 100);
    }, 0);

    expect(computeAdditionalCostUsd(additionalIds)).toEqual({
      amountUsd: expectedUsd,
      hasQuotedItems: false,
    });
  });
});
