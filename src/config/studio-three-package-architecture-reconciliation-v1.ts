/**
 * Current offer architecture after Owner moved Reputation to included support.
 * Supersedes the four-headline target. Does not lock prices. Does not change scope.
 */

export const STUDIO_THREE_PACKAGE_ARCHITECTURE_RECONCILIATION_PACKAGE_ID =
  "STUDIO-THREE-PACKAGE-ARCHITECTURE-RECONCILIATION-1" as const;

export const THREE_PACKAGE_HEADLINE_IDS = [
  "clip_repurposing",
  "short_form_video_editing",
  "social_and_promo_graphics",
] as const;

export const THREE_PACKAGE_SUPPORT_IDS = [
  "reputation_customer_proof",
  "ad_creative",
  "email_and_text",
  "menu_price_list",
  "ai_local_visibility",
] as const;

export type ThreePackageHeadlineId = (typeof THREE_PACKAGE_HEADLINE_IDS)[number];
export type ThreePackageSupportId = (typeof THREE_PACKAGE_SUPPORT_IDS)[number];
export type SupportFit = "NATURAL_FIT" | "OPTIONAL_FIT" | "NOT_APPROPRIATE";

export const studioThreePackageArchitectureReconciliationV1 = {
  packageId: STUDIO_THREE_PACKAGE_ARCHITECTURE_RECONCILIATION_PACKAGE_ID,
  authorizedAt: "2026-10-03" as const,
  supersedesFourHeadlineTarget: true as const,
  currentArchitectureAuthority: true as const,
  doNotPublish: true as const,
  doNotAdvertise: true as const,
  doNotChangeMenu: true as const,
  doNotExpandScope: true as const,
  doNotLockPricing: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  reputationPlacement: "INCLUDED_SUPPORT_CAPABILITY" as const,
  reputationScopeUnchanged: true as const,
  skipAllowed: true as const,
  includedDoesNotMeanMandatory: true as const,
  doNotGenerateFiller: true as const,
  oneHeadlinePerOrder: true as const,
  clipSourceMinutes: { min: 15, max: 60 } as const,
  workingLaunchUsdNotLocked: {
    clip_repurposing: 399,
    short_form_video_editing: 249,
    social_and_promo_graphics: 199,
  },
  pricesLocked: false as const,
  classification: "A_THREE_PACKAGE_ARCHITECTURE_RECONCILED_READY_FOR_FINAL_PRICING_DECISION" as const,
  stampDoc:
    "docs/launch/studio-three-package-architecture-reconciliation-1/STUDIO-THREE-PACKAGE-ARCHITECTURE-RECONCILIATION-1.md" as const,
  proofJson:
    "docs/launch/studio-three-package-architecture-reconciliation-1/STUDIO-THREE-PACKAGE-ARCHITECTURE-RECONCILIATION-1.json" as const,
} as const;

export const threePackageSupportMatrix: Record<
  ThreePackageHeadlineId,
  Record<ThreePackageSupportId, SupportFit>
> = {
  clip_repurposing: {
    reputation_customer_proof: "OPTIONAL_FIT",
    ad_creative: "OPTIONAL_FIT",
    email_and_text: "OPTIONAL_FIT",
    menu_price_list: "NOT_APPROPRIATE",
    ai_local_visibility: "NOT_APPROPRIATE",
  },
  short_form_video_editing: {
    reputation_customer_proof: "OPTIONAL_FIT",
    ad_creative: "OPTIONAL_FIT",
    email_and_text: "OPTIONAL_FIT",
    menu_price_list: "NOT_APPROPRIATE",
    ai_local_visibility: "NOT_APPROPRIATE",
  },
  social_and_promo_graphics: {
    reputation_customer_proof: "NATURAL_FIT",
    ad_creative: "NATURAL_FIT",
    email_and_text: "NATURAL_FIT",
    menu_price_list: "OPTIONAL_FIT",
    ai_local_visibility: "OPTIONAL_FIT",
  },
};

export const reputationSupportScope = {
  placement: "INCLUDED_SUPPORT_CAPABILITY",
  standaloneHeadline: false,
  deliverables: [
    "review_request_text",
    "review_request_email",
    "thank_you_follow_up",
    "positive_neutral_negative_reply_templates",
    "qr_review_card",
    "square_quote_graphic",
    "portrait_quote_graphic",
    "matching_caption",
    "use_guide",
  ],
  revisionLimit: 1,
  requiresRealSuppliedTestimonial: true,
  rightsConfirmationRequired: true,
  accountAccess: false,
  sendingOrPosting: false,
  fakeReviews: false,
  testimonialVideo: false,
  rankingLeadSalesPromises: false,
} as const;
