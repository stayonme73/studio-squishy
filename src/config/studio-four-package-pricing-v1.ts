/**
 * Four-package pricing recommendation. Unpublished. Does not change the live menu.
 */

export const STUDIO_FOUR_PACKAGE_PRICING_PACKAGE_ID =
  "STUDIO-FOUR-PACKAGE-PRICING-1" as const;

export const studioFourPackagePricingV1 = {
  packageId: STUDIO_FOUR_PACKAGE_PRICING_PACKAGE_ID,
  authorizedAt: "2026-10-03" as const,
  doNotPublish: true as const,
  doNotAdvertise: true as const,
  doNotChangeMenu: true as const,
  doNotChangeLivePrice: true as const,
  doNotChangeScope: true as const,
  doNotRedesign: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  liveCatalogUnchanged: true as const,
  extrasRemainCourtesy: true as const,
  supportRemainsIncludedAndSkippable: true as const,
  noSurpriseCheckoutFees: true as const,
  noFakeWasPrice: true as const,
  clipSourceMinutes: { min: 15, max: 60 } as const,
  stripeAssumption: {
    kind: "DERIVED" as const,
    percent: 0.029,
    flatUsd: 0.3,
    note: "Typical U.S. Stripe card rate. Not measured on a Studio payout in this package.",
  },
  classification: "B_PRICING_READY_WITH_EXPLICIT_OWNER_DECISION" as const,
  holdAnyPackageFromLaunch: false as const,
  stampDoc: "docs/launch/studio-four-package-pricing-1/STUDIO-FOUR-PACKAGE-PRICING-1.md" as const,
  proofJson: "docs/launch/studio-four-package-pricing-1/STUDIO-FOUR-PACKAGE-PRICING-1.json" as const,
} as const;

export const fourPackageProposedPricesUsd = {
  clip_repurposing: { launch: 499, standard: 549 },
  short_form_video_editing: { launch: 299, standard: 349 },
  social_and_promo_graphics: { launch: 249, standard: 299 },
  reputation_customer_proof: { launch: 149, standard: 199 },
} as const;

export const fourPackageEconomicFloorsUsd = {
  clip_repurposing: 79,
  short_form_video_editing: 49,
  social_and_promo_graphics: 39,
  reputation_customer_proof: 29,
} as const;
