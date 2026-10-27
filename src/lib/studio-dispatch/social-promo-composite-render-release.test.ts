import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { shouldObserveDesignRenderer } from "@/lib/studio-dispatch/design-renderer-observer";
import { disposableSocialPromoCertMarker } from "@/lib/studio-payment/disposable-social-promo-cert-isolation";

import {
  ensureSocialPromoCompositeRenderRelease,
  socialPromoCompositeRenderStillHeld,
} from "./social-promo-composite-render-release";

function baseCampaign(campaignId: string): CampaignRecord {
  return {
    campaignId,
    campaignName: "Cert Co",
    paymentReceivedAt: "2026-10-27T00:00:00.000Z",
    routeMapIntakeSubmittedAt: "2026-10-27T00:00:00.000Z",
    paymentTruth: {
      status: "confirmed",
      sandbox: true,
      selectedServiceIds: ["social_and_promo_graphics"],
    },
    condensedOffer: { packageId: "social_and_promo_graphics" },
  } as CampaignRecord;
}

describe("Social & Promo composite render release", () => {
  it("auto-releases for ordinary paying customers after intake", () => {
    const id = "disposable-hosted-sp-final-cert-a1b2c3d4";
    const released = ensureSocialPromoCompositeRenderRelease(baseCampaign(id));
    expect(released.socialPromoRenderRelease?.authorizedBy).toBe("owner");
    expect(released.socialPromoRenderRelease?.releasedAt).toBeTruthy();
    expect(socialPromoCompositeRenderStillHeld(released)).toBe(false);
  });

  it("keeps machine-cert campaigns held until explicit owner stamp", () => {
    const id = "disposable-social-promo-machine-cert-9";
    const cert = {
      ...baseCampaign(id),
      testPaymentIsolation: disposableSocialPromoCertMarker("armed"),
    };
    expect(socialPromoCompositeRenderStillHeld(cert)).toBe(true);
    expect(ensureSocialPromoCompositeRenderRelease(cert).socialPromoRenderRelease).toBeUndefined();
  });

  it("allows observer invoke after automatic release", () => {
    const record = {
      jobId: `${baseCampaign("x").campaignId}:social_and_promo_graphics:branch:social_posts`,
      skuId: "v2-rtu-social-posts",
      status: "EXECUTION_IDENTITY_READY",
      executionIdentityReady: true,
      requirements: { primaryTool: { toolId: "studio_design_renderer" } },
    } as never;
    const campaign = ensureSocialPromoCompositeRenderRelease(
      baseCampaign("disposable-hosted-sp-final-cert-abc"),
    );
    expect(shouldObserveDesignRenderer(record, campaign)).toEqual({ invoke: true });
  });
});
