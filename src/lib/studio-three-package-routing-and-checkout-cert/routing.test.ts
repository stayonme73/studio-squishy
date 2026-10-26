import { describe, expect, it } from "vitest";

import { LAUNCH_MENU_FROZEN_PRICES_CENTS } from "@/config/studio-menu-readiness-and-demand-freeze-v1";
import { studioThreePackageRoutingAndCheckoutCertV1 as pack } from "@/config/studio-three-package-routing-and-checkout-cert-v1";
import { runThreePackageRoutingCert } from "./run-cert";

describe("STUDIO-THREE-PACKAGE-ROUTING-AND-CHECKOUT-CERT-1", () => {
  it("binds Owner-approved launch prices without publishing or changing the frozen catalog", () => {
    expect(pack.doNotPublish).toBe(true);
    expect(pack.doNotRedesignTheme).toBe(true);
    expect(pack.doNotChangeFinalDelivery).toBe(true);
    expect(pack.liveConversationRoomUnchanged).toBe(true);
    expect(pack.noSurpriseFees).toBe(true);
    expect(pack.noPaidSupportCharge).toBe(true);
    expect(pack.voiceAndHelpPageLevel).toBe(true);
    expect(pack.clipSourceMinutes).toEqual({ min: 15, max: 60 });
    expect(pack.launchPriceCents.clip_repurposing).toBe(37375);
    expect(pack.launchPriceCents.short_form_video_editing).toBe(18625);
    expect(pack.launchPriceCents.social_and_promo_graphics).toBe(19900);
    expect(LAUNCH_MENU_FROZEN_PRICES_CENTS["v2-rtu-clip-repurposing"]).toBe(54900);
  });

  it("certifies Clip, Short-Form, and Social journeys through fixture payment", () => {
    const cert = runThreePackageRoutingCert();
    expect(cert.clip.inspectedAll).toBe(true);
    expect(cert.clip.firstOtherTilesLocked).toBe(true);
    expect(cert.clip.changeReopenedTiles).toBe(true);
    expect(cert.clip.keptSharedName).toBe(true);
    expect(cert.clip.droppedIncompatibleFacts).toBe(true);
    expect(cert.clip.selectedSupport).toContain("ad_creative");
    expect(cert.clip.skippedSupport).toContain("reputation_customer_proof");
    expect(cert.clip.priceCents).toBe(29900);
    expect(cert.clip.paid).toBe(true);
    expect(cert.clip.myStudio.ok).toBe(true);
    expect(cert.clip.myStudio.headline).toBe("clip_repurposing");

    expect(cert.shortForm.priceCents).toBe(14900);
    expect(cert.shortForm.selectedSupport).toContain("reputation_customer_proof");
    expect(cert.shortForm.skippedSupport).toContain("ad_creative");
    expect(cert.shortForm.extras.flyer).toBe("DECLINE");
    expect(cert.shortForm.myStudio.ok).toBe(true);

    expect(cert.social.priceCents).toBe(15920);
    expect(cert.social.selectedSupport).toContain("ad_creative");
    expect(cert.social.skippedSupport.length).toBeGreaterThan(0);
    expect(cert.social.extras.business_card).toBe("DECLINE");
    expect(cert.social.paidLocksChange).toMatch(/locked/i);
    expect(cert.social.myStudio.ok).toBe(true);
    expect(cert.liveMoneyTouched).toBe(false);
  });

  it("fails closed on short Clip source, wrong support, and payment before review", () => {
    const cert = runThreePackageRoutingCert();
    expect(cert.failClosed.shortSourceBlocked).toBe(true);
    expect(cert.failClosed.menuOnClipBlocked).toBe(true);
    expect(cert.failClosed.payBeforeReviewBlocked).toBe(true);
    expect(cert.voiceHelpPageLevel).toBe(true);
    expect(cert.finalDeliveryUntouched).toBe(true);
  });
});
