import { describe, expect, it } from "vitest";

import {
  FOUR_PACKAGE_HEADLINE_IDS,
  FOUR_PACKAGE_SUPPORT_IDS,
  fourPackageChoiceFlow,
  fourPackageForbiddenPromises,
  fourPackageSupportMatrix,
  studioFourPackageOfferLockV1 as pack,
} from "@/config/studio-four-package-offer-lock-v1";
import { evaluateFourPackageCombination, supportOptionsForHeadline } from "./combinations";
import {
  customerTruthFieldIds,
  fourPackageCustomerTruth,
} from "./customer-truth";
import { draftPackageSummary } from "./summaries";

describe("STUDIO-FOUR-PACKAGE-OFFER-LOCK-1", () => {
  it("locks four headlines, skippable support, and unpaid extras without prices", () => {
    expect(pack.doNotPublish).toBe(true);
    expect(pack.doNotChangePrice).toBe(true);
    expect(pack.doNotChangeMenu).toBe(true);
    expect(pack.priceCents).toBeNull();
    expect(pack.includedDoesNotMeanMandatory).toBe(true);
    expect(pack.skipAllowed).toBe(true);
    expect(pack.oneHeadlinePerOrder).toBe(true);
    expect(pack.classification).toBe("A_FOUR_PACKAGE_OFFER_LOCKED_READY_FOR_PRICING");
    expect(pack.capacityImpact).toBe("no_material_impact");
    expect(FOUR_PACKAGE_HEADLINE_IDS).toHaveLength(4);
    expect(FOUR_PACKAGE_SUPPORT_IDS).toHaveLength(4);
    expect(fourPackageChoiceFlow[0]).toContain("one headline");
  });

  it("keeps support optional and refuses inappropriate pairings", () => {
    expect(fourPackageSupportMatrix.clip_repurposing.menu_price_list).toBe(
      "NOT_APPROPRIATE",
    );
    expect(fourPackageSupportMatrix.clip_repurposing.ai_local_visibility).toBe(
      "NOT_APPROPRIATE",
    );
    expect(fourPackageSupportMatrix.social_and_promo_graphics.ad_creative).toBe(
      "NATURAL_FIT",
    );
    expect(fourPackageSupportMatrix.reputation_customer_proof.ai_local_visibility).toBe(
      "NATURAL_FIT",
    );
    expect(supportOptionsForHeadline("clip_repurposing").every((row) => row.defaultChoice === "SKIP")).toBe(
      true,
    );
    expect(
      evaluateFourPackageCombination({
        headline: "clip_repurposing",
        support: { menu_price_list: "SELECT" },
      }).ok,
    ).toBe(false);
    expect(
      evaluateFourPackageCombination({
        headline: "clip_repurposing",
        secondHeadline: "short_form_video_editing",
      }).ok,
    ).toBe(false);
    expect(
      evaluateFourPackageCombination({
        headline: "social_and_promo_graphics",
        wantsVideoAds: true,
      }).ok,
    ).toBe(false);
    expect(
      evaluateFourPackageCombination({
        headline: "reputation_customer_proof",
        wantsWebsiteFetch: true,
      }).ok,
    ).toBe(false);
    expect(
      evaluateFourPackageCombination({
        headline: "social_and_promo_graphics",
        support: { ad_creative: "SELECT", email_and_text: "SKIP" },
      }).ok,
    ).toBe(true);
  });

  it("returns a complete truthful customer block for every headline", () => {
    for (const headlineId of FOUR_PACKAGE_HEADLINE_IDS) {
      const block = fourPackageCustomerTruth[headlineId];
      for (const field of customerTruthFieldIds) {
        const value = block[field];
        if (Array.isArray(value)) expect(value.length).toBeGreaterThan(0);
        else expect(String(value).length).toBeGreaterThan(20);
      }
      const benefitVoice = [block.whatThisIs, block.problemItHelpsSolve, ...block.howThisCanHelp].join(
        "\n",
      );
      for (const pattern of fourPackageForbiddenPromises) {
        expect(benefitVoice).not.toMatch(pattern);
      }
      expect(block.studioWillNotAccess.join(" ")).toMatch(/Google Business|social|ad/i);
      const summary = draftPackageSummary(headlineId);
      expect(summary.doNotPublish).toBe(true);
      expect(summary.packageName).toBe(block.packageName);
    }
  });
});
