import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { createCampaignFromRouteMapJob } from "@/lib/route-map-campaign";
import {
  ROUTE_MAP_INTAKE_HREF,
  isIntakeEditable,
  isIntakeEditableForCustomer,
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
    expect(resolveIntakeEditHref(campaign)).toBe(
      `/studio-conversation-room?stage=intake&campaignId=${campaign.campaignId}`,
    );
    expect(resolvePostPaymentIntakeHref(campaign)).toBe(
      `/studio-conversation-room?stage=intake&campaignId=${campaign.campaignId}`,
    );
    expect(projectDetailsEditHref(undefined, campaign)).toBe(
      `/studio-conversation-room?stage=intake&campaignId=${campaign.campaignId}`,
    );
  });

  it("keeps non–Route Map campaigns on quarantined Route Map intake", () => {
    const campaign = {
      campaignId: "discovery-test",
      campaignStatus: "PAYMENT_RECEIVED",
      packageId: "spark",
    } as CampaignRecord;

    expect(isRouteMapCampaign(campaign)).toBe(false);
    expect(resolveIntakeEditHref(campaign, "spark")).toBe(
      "/studio-conversation-room?stage=intake&campaignId=discovery-test",
    );
    expect(resolvePostPaymentIntakeHref(campaign, "spark")).toBe(
      "/studio-conversation-room?stage=intake&campaignId=discovery-test",
    );
  });

  it("locks pre-production intake copy once the live status is Final Delivery ready", () => {
    expect(isIntakeEditable("PAYMENT_RECEIVED")).toBe(true);
    expect(
      isIntakeEditableForCustomer("PAYMENT_RECEIVED", "Final Delivery ready"),
    ).toBe(false);
    expect(isIntakeEditableForCustomer("PAYMENT_RECEIVED", "Ready for Review")).toBe(
      false,
    );
    expect(isIntakeEditableForCustomer("PAYMENT_RECEIVED", "Payment received")).toBe(
      true,
    );
  });
});
