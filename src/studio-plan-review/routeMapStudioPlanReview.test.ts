import { describe, expect, it } from "vitest";

import { ROUTE_MAP_V2_POST_PUBLISH_ADDON } from "@/catalog/route-map-v2-launch";
import { addServiceToRouteMapPlanState } from "@/lib/route-map-campaign";
import { buildRouteMapStudioPlanReview } from "@/studio-plan-review/routeMapStudioPlanReview";
import { removeServiceFromPlan } from "@/studio-plan-review/planState";
import type { ServiceId } from "@/catalog/types";

describe("Route Map Studio Plan Review builder", () => {
  it("builds a Route Map plan model without Discovery recommendation data", () => {
    const model = buildRouteMapStudioPlanReview({
      selectedServiceIds: ["v2-rtu-flyer", "v2-rtu-social-posts"],
    });

    expect(model.recommendedServiceIds).toEqual([]);
    expect(model.considerNextServices).toEqual([]);
    expect(model.includedServices.map((service) => service.serviceId)).toEqual([
      "v2-rtu-flyer",
      "v2-rtu-social-posts",
    ]);
    expect(model.planTotals.amountDueTodayCents).toBe(75000);
    expect(model.canApprove).toBe(true);
  });

  it("blocks approval and shows plain-language copy for an empty Route Map plan", () => {
    const model = buildRouteMapStudioPlanReview({ selectedServiceIds: [] });

    expect(model.canApprove).toBe(false);
    expect(model.planValid).toBe(false);
    expect(model.emptyStateMessage).toBe(
      "Your Studio Plan is empty. Return to the Route Map to add a service.",
    );
    expect(model.planTotals.amountDueTodayCents).toBe(0);
  });

  it("shows the post/publish add-on only after an eligible parent is selected", () => {
    const emptyModel = buildRouteMapStudioPlanReview({ selectedServiceIds: [] });
    expect(emptyModel.availableToAdd.map((service) => service.serviceId)).not.toContain(
      ROUTE_MAP_V2_POST_PUBLISH_ADDON.id,
    );

    const selected = addServiceToRouteMapPlanState(
      { selectedServiceIds: ["v2-rtu-social-posts" as ServiceId] },
      ROUTE_MAP_V2_POST_PUBLISH_ADDON.id,
    );
    const model = buildRouteMapStudioPlanReview(selected);

    expect(model.selectedServiceIds).toEqual([
      "v2-rtu-social-posts",
      ROUTE_MAP_V2_POST_PUBLISH_ADDON.id,
    ]);
    expect(model.planTotals.amountDueTodayCents).toBe(55000);
  });

  it("reflects orphan add-on pruning from existing planState rules", () => {
    const withAddon = {
      selectedServiceIds: [
        "v2-rtu-social-posts",
        ROUTE_MAP_V2_POST_PUBLISH_ADDON.id,
      ] as ServiceId[],
    };
    const pruned = removeServiceFromPlan(withAddon, "v2-rtu-social-posts");
    const model = buildRouteMapStudioPlanReview(pruned);

    expect(model.selectedServiceIds).toEqual([]);
    expect(model.canApprove).toBe(false);
  });
});
