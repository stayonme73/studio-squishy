import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { DESIGN_RENDERER_PROOF_SKU } from "@/lib/studio-design-renderer";
import { disposableSocialPromoCertMarker } from "./disposable-social-promo-cert-isolation";
import {
  DISPOSABLE_SP_CERT_RENDERER_LANE_BLOCKED,
  disposableSpCertDesignRendererSkuGate,
} from "./disposable-test-isolation-guards";

function certCampaign(): CampaignRecord {
  return {
    campaignId: "disposable-social-promo-machine-cert-1",
    testPaymentIsolation: {
      ...disposableSocialPromoCertMarker("armed"),
      armedAt: "2026-10-24T13:00:00.000Z",
      armedBy: "owner" as const,
    },
  } as CampaignRecord;
}

describe("Social & Promo cert design-renderer SKU gate", () => {
  it("blocks flyer and other SKUs for cert-marked campaigns", () => {
    const campaign = certCampaign();
    expect(disposableSpCertDesignRendererSkuGate(campaign, DESIGN_RENDERER_PROOF_SKU)).toEqual({
      allowed: false,
      skipReason: DISPOSABLE_SP_CERT_RENDERER_LANE_BLOCKED,
    });
  });

  it("allows social-posts and promotion-graphics SKUs", () => {
    const campaign = certCampaign();
    expect(disposableSpCertDesignRendererSkuGate(campaign, "v2-rtu-social-posts").allowed).toBe(
      true,
    );
    expect(
      disposableSpCertDesignRendererSkuGate(campaign, "v2-rtu-promotion-graphics").allowed,
    ).toBe(true);
  });

  it("does not restrict ordinary customer campaigns", () => {
    const ordinary = { campaignId: "thank-you-social_and_promo_graphics-1" } as CampaignRecord;
    expect(disposableSpCertDesignRendererSkuGate(ordinary, DESIGN_RENDERER_PROOF_SKU).allowed).toBe(
      true,
    );
  });
});
