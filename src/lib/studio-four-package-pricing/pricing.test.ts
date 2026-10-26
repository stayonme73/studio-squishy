import { describe, expect, it } from "vitest";

import { LAUNCH_MENU_FROZEN_PRICES_CENTS } from "@/config/studio-menu-readiness-and-demand-freeze-v1";
import { studioFourPackageOfferLockV1 } from "@/config/studio-four-package-offer-lock-v1";
import {
  fourPackageEconomicFloorsUsd,
  fourPackageProposedPricesUsd,
  studioFourPackagePricingV1 as pack,
} from "@/config/studio-four-package-pricing-v1";
import { mixGrossUsd, monthlyGrossUsd, stripeFeeUsd } from "./economics";

describe("STUDIO-FOUR-PACKAGE-PRICING-1", () => {
  it("proposes prices without changing the live menu or package scope", () => {
    expect(pack.doNotPublish).toBe(true);
    expect(pack.doNotChangeMenu).toBe(true);
    expect(pack.doNotChangeLivePrice).toBe(true);
    expect(pack.doNotChangeScope).toBe(true);
    expect(pack.liveCatalogUnchanged).toBe(true);
    expect(pack.clipSourceMinutes).toEqual({ min: 15, max: 60 });
    expect(pack.extrasRemainCourtesy).toBe(true);
    expect(pack.noSurpriseCheckoutFees).toBe(true);
    expect(pack.noFakeWasPrice).toBe(true);
    expect(pack.classification).toBe("B_PRICING_READY_WITH_EXPLICIT_OWNER_DECISION");
    expect(pack.holdAnyPackageFromLaunch).toBe(false);
    expect(LAUNCH_MENU_FROZEN_PRICES_CENTS["v2-rtu-clip-repurposing"]).toBe(54900);
    expect(LAUNCH_MENU_FROZEN_PRICES_CENTS["v2-rtu-short-form-video-edit"]).toBe(34900);
    expect(studioFourPackageOfferLockV1.doNotChangeMenu).toBe(true);
  });

  it("keeps launch above the economic floor and below a jump that would make standard absurd", () => {
    for (const id of Object.keys(fourPackageProposedPricesUsd) as Array<
      keyof typeof fourPackageProposedPricesUsd
    >) {
      const { launch, standard } = fourPackageProposedPricesUsd[id];
      expect(launch).toBeGreaterThanOrEqual(fourPackageEconomicFloorsUsd[id]);
      expect(standard).toBeGreaterThan(launch);
      expect(standard - launch).toBeLessThanOrEqual(60);
    }
    expect(fourPackageProposedPricesUsd.clip_repurposing.standard).toBe(549);
    expect(fourPackageProposedPricesUsd.short_form_video_editing.standard).toBe(349);
  });

  it("computes gross revenue tables without calling them profit", () => {
    expect(monthlyGrossUsd(499, 100)).toBe(49900);
    expect(stripeFeeUsd(499)).toBe(14.77);
    expect(
      mixGrossUsd(
        {
          clip_repurposing: 40,
          short_form_video_editing: 30,
          social_and_promo_graphics: 20,
          reputation_customer_proof: 10,
        },
        "launch",
      ),
    ).toBe(40 * 499 + 30 * 299 + 20 * 249 + 10 * 149);
  });
});
