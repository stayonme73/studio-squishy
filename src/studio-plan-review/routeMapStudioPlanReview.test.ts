import { describe, expect, it } from "vitest";

import { addServiceToRouteMapPlanState } from "@/lib/route-map-campaign";
import { buildRouteMapStudioPlanReview } from "@/studio-plan-review/routeMapStudioPlanReview";
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
    expect(model.planTotals.amountDueTodayCents).toBe(16800);
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

  it("does not offer retired post/publish or rm-j001 commerce SKUs in availableToAdd", () => {
    const model = buildRouteMapStudioPlanReview({ selectedServiceIds: [] });
    const availableIds = model.availableToAdd.map((service) => service.serviceId);

    expect(availableIds).not.toContain("v2-addon-post-publish");
    expect(availableIds).not.toContain("rm-j001");
  });

  it("ignores attempts to add retired commerce SKUs to the Route Map plan", () => {
    const blocked = addServiceToRouteMapPlanState(
      { selectedServiceIds: ["v2-rtu-social-posts" as ServiceId] },
      "v2-addon-post-publish",
    );

    expect(blocked.selectedServiceIds).toEqual(["v2-rtu-social-posts"]);
  });
});
