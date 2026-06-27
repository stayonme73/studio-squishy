import { describe, expect, it } from "vitest";
import { getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import {
  addServiceToPlan,
  getAvailableServicesToAdd,
  initialPlanState,
  removeServiceFromPlan,
  swapServiceInPlan,
  type StudioPlanState,
} from "@/studio-plan-review/planState";

describe("planState — execution add-ons", () => {
  it("getAvailableServicesToAdd excludes execution add-ons without a matching parent", () => {
    const available = getAvailableServicesToAdd(["bf-001"]);
    expect(available).not.toContain("social_media-execution");
    expect(available).toContain("em-001");
  });

  it("getAvailableServicesToAdd includes execution add-ons when parent family matches", () => {
    const available = getAvailableServicesToAdd(["sm-001"]);
    expect(available).toContain("social_media-execution");
    expect(available).not.toContain("social_media-execution-monthly");
  });

  it("addServiceToPlan rejects execution add-on without parent", () => {
    const state = initialPlanState(["bf-001"]);
    const next = addServiceToPlan(state, "social_media-execution");
    expect(next.selectedServiceIds).toEqual(["bf-001"]);
  });

  it("addServiceToPlan attaches execution add-on when parent is present", () => {
    const state = initialPlanState(["sm-001"]);
    const next = addServiceToPlan(state, "social_media-execution");
    expect(next.selectedServiceIds).toEqual(["sm-001", "social_media-execution"]);
  });

  it("removeServiceFromPlan cascades orphaned execution add-ons", () => {
    const state: StudioPlanState = {
      selectedServiceIds: ["sm-001", "social_media-execution"] as ServiceId[],
    };
    const next = removeServiceFromPlan(state, "sm-001");
    expect(next.selectedServiceIds).toEqual([]);
  });

  it("swapServiceInPlan removes incompatible execution add-ons", () => {
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
