import { describe, expect, it } from "vitest";

import { fourPackageProposedPricesUsd } from "@/config/studio-four-package-pricing-v1";
import {
  THREE_PACKAGE_HEADLINE_IDS,
  THREE_PACKAGE_SUPPORT_IDS,
  reputationSupportScope,
  studioThreePackageArchitectureReconciliationV1 as pack,
  threePackageSupportMatrix,
} from "@/config/studio-three-package-architecture-reconciliation-v1";
import { evaluateThreePackageCombination } from "./combinations";
import { customerTruthFieldIds, threeHeadlineCustomerTruth } from "./customer-truth";

describe("STUDIO-THREE-PACKAGE-ARCHITECTURE-RECONCILIATION-1", () => {
  it("makes Reputation included support and keeps three headlines", () => {
    expect(pack.supersedesFourHeadlineTarget).toBe(true);
    expect(pack.reputationPlacement).toBe("INCLUDED_SUPPORT_CAPABILITY");
    expect(pack.reputationScopeUnchanged).toBe(true);
    expect(pack.pricesLocked).toBe(false);
    expect(pack.doNotLockPricing).toBe(true);
    expect(pack.clipSourceMinutes).toEqual({ min: 15, max: 60 });
    expect(THREE_PACKAGE_HEADLINE_IDS).toEqual([
      "clip_repurposing",
      "short_form_video_editing",
      "social_and_promo_graphics",
    ]);
    expect(THREE_PACKAGE_SUPPORT_IDS).toContain("reputation_customer_proof");
    expect(reputationSupportScope.standaloneHeadline).toBe(false);
    expect(reputationSupportScope.testimonialVideo).toBe(false);
    expect(pack.classification).toBe(
      "A_THREE_PACKAGE_ARCHITECTURE_RECONCILED_READY_FOR_FINAL_PRICING_DECISION",
    );
    expect(pack.workingLaunchUsdNotLocked.clip_repurposing).toBe(399);
    expect(fourPackageProposedPricesUsd.clip_repurposing.launch).toBe(499);
  });

  it("classifies Reputation fit and refuses filler or a fourth headline", () => {
    expect(threePackageSupportMatrix.clip_repurposing.reputation_customer_proof).toBe(
      "OPTIONAL_FIT",
    );
    expect(threePackageSupportMatrix.short_form_video_editing.reputation_customer_proof).toBe(
      "OPTIONAL_FIT",
    );
    expect(threePackageSupportMatrix.social_and_promo_graphics.reputation_customer_proof).toBe(
      "NATURAL_FIT",
    );
    expect(
      evaluateThreePackageCombination({
        headline: "clip_repurposing",
        secondHeadline: "social_and_promo_graphics",
      }).ok,
    ).toBe(false);
    expect(
      evaluateThreePackageCombination({
        headline: "clip_repurposing",
        support: { menu_price_list: "SELECT" },
      }).ok,
    ).toBe(false);
    expect(
      evaluateThreePackageCombination({
        headline: "social_and_promo_graphics",
        support: { reputation_customer_proof: "SELECT" },
        missingReputationRights: true,
      }).ok,
    ).toBe(false);
    expect(
      evaluateThreePackageCombination({
        headline: "social_and_promo_graphics",
        support: { reputation_customer_proof: "SELECT", email_and_text: "SELECT" },
        duplicateReviewRequestCampaign: true,
      }).ok,
    ).toBe(false);
    expect(
      evaluateThreePackageCombination({
        headline: "social_and_promo_graphics",
        support: { reputation_customer_proof: "SKIP", ad_creative: "SELECT" },
      }).ok,
    ).toBe(true);
  });

  it("updates three headline truth blocks and does not sell Reputation as a public headline", () => {
    expect(Object.keys(threeHeadlineCustomerTruth)).toHaveLength(3);
    for (const id of THREE_PACKAGE_HEADLINE_IDS) {
      const block = threeHeadlineCustomerTruth[id];
      for (const field of customerTruthFieldIds) {
        const value = block[field];
        if (Array.isArray(value)) expect(value.length).toBeGreaterThan(0);
        else expect(String(value).length).toBeGreaterThan(20);
      }
      expect(block.includedSupportChoices.some((row) => row.startsWith("reputation_customer_proof"))).toBe(
        true,
      );
      expect(block.whatThisIs).not.toMatch(/standalone public package/i);
    }
    expect(threeHeadlineCustomerTruth.clip_repurposing.customerProvides.join(" ")).toContain(
      "15–60",
    );
  });
});
