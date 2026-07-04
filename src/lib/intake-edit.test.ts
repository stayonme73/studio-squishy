import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { createCampaignFromRouteMapJob } from "@/lib/route-map-campaign";
import {
  ROUTE_MAP_INTAKE_HREF,
  isRouteMapCampaign,
  projectDetailsEditHref,
  resolveIntakeEditHref,
  resolvePostPaymentIntakeHref,
  routeMapIntakeHref,
} from "@/lib/intake-edit";

describe("intake edit routing", () => {
  it("routes Route Map campaigns to Route Map intake", () => {
    const campaign = createCampaignFromRouteMapJob("v2-rtu-social-posts", "random-exit")!;
    expect(isRouteMapCampaign(campaign)).toBe(true);
    expect(routeMapIntakeHref()).toBe(ROUTE_MAP_INTAKE_HREF);
    expect(resolveIntakeEditHref(campaign)).toBe("/route-map?step=intake");
    expect(resolvePostPaymentIntakeHref(campaign)).toBe("/route-map?step=intake");
    expect(projectDetailsEditHref(undefined, campaign)).toBe("/route-map?step=intake");
  });

  it("keeps Discovery campaigns on legacy Project Details", () => {
    const campaign = {
      campaignId: "discovery-test",
      campaignStatus: "PAYMENT_RECEIVED",
      packageId: "spark",
    } as CampaignRecord;

    expect(isRouteMapCampaign(campaign)).toBe(false);
    expect(resolveIntakeEditHref(campaign, "spark")).toBe("/project-details?package=spark");
    expect(resolvePostPaymentIntakeHref(campaign, "spark")).toBe("/project-details?package=spark");
  });
});
