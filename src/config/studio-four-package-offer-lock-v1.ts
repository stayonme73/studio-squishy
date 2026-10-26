/**
 * Four-package offer lock — architecture before pricing.
 * Unpublished. No price. No menu change. No journey rebuild.
 */

import { threePackageRevisionRule } from "@/config/studio-three-package-revision-truth-v1";

export const STUDIO_FOUR_PACKAGE_OFFER_LOCK_PACKAGE_ID =
  "STUDIO-FOUR-PACKAGE-OFFER-LOCK-1" as const;

export const FOUR_PACKAGE_HEADLINE_IDS = [
  "clip_repurposing",
  "short_form_video_editing",
  "social_and_promo_graphics",
  "reputation_customer_proof",
] as const;

export const FOUR_PACKAGE_SUPPORT_IDS = [
  "ad_creative",
  "email_and_text",
  "menu_price_list",
  "ai_local_visibility",
] as const;

export const FOUR_PACKAGE_EXTRA_IDS = ["flyer", "business_card"] as const;

export type FourPackageHeadlineId = (typeof FOUR_PACKAGE_HEADLINE_IDS)[number];
export type FourPackageSupportId = (typeof FOUR_PACKAGE_SUPPORT_IDS)[number];
export type FourPackageExtraId = (typeof FOUR_PACKAGE_EXTRA_IDS)[number];
export type SupportFit = "NATURAL_FIT" | "OPTIONAL_FIT" | "NOT_APPROPRIATE";
export type SupportChoice = "SELECT" | "SKIP";
export type ExtraChoice = "INCLUDE" | "DECLINE";

export const studioFourPackageOfferLockV1 = {
  packageId: STUDIO_FOUR_PACKAGE_OFFER_LOCK_PACKAGE_ID,
  authorizedAt: "2026-10-03" as const,
  doNotPublish: true as const,
  doNotAdvertise: true as const,
  doNotChangePrice: true as const,
  doNotChangeMenu: true as const,
  doNotRedesign: true as const,
  doNotRebuildJourney: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  priceCents: null,
  liveCatalogChanged: false,
  includedDoesNotMeanMandatory: true as const,
  skipAllowed: true as const,
  oneHeadlinePerOrder: true as const,
  noAccountAccess: true as const,
  noPasswords: true as const,
  noPosting: true as const,
  noAdManagement: true as const,
  noInboxManagement: true as const,
  noGoogleBusinessLogin: true as const,
  noSocialLogin: true as const,
  doNotGenerateUselessFiller: true as const,
  classification: "A_FOUR_PACKAGE_OFFER_LOCKED_READY_FOR_PRICING" as const,
  fourPackagePlacementLocked: true as const,
  capacityImpact: "no_material_impact" as const,
  capacityNote:
    "Clip and Short-Form stay Heavy = 1. Support and extras stay Standard / copy / static and do not occupy Heavy. The 100-order Heavy certification is not reopened.",
  stampDoc:
    "docs/launch/studio-four-package-offer-lock-1/STUDIO-FOUR-PACKAGE-OFFER-LOCK-1.md" as const,
  proofJson:
    "docs/launch/studio-four-package-offer-lock-1/STUDIO-FOUR-PACKAGE-OFFER-LOCK-1.json" as const,
} as const;

export const fourPackageHeadlines = {
  clip_repurposing: {
    id: "clip_repurposing",
    name: "Clip Repurposing",
    factorySku: "v2-rtu-clip-repurposing",
    lane: "heavy",
    certification:
      "B. CUSTOMER-CERTIFIED WITH EXPLICIT LIMITS — sold-contract recert 2026-10-03",
    revisionRule: threePackageRevisionRule("Clip Repurposing"),
    productionProblemIfCombinedWithOtherHeadline: true,
  },
  short_form_video_editing: {
    id: "short_form_video_editing",
    name: "Short-Form Video Editing",
    factorySku: "v2-rtu-short-form-video-edit",
    lane: "heavy",
    certification:
      "Owner-certified Short-Form Content Pack / talking-head finish — READY WITH EXPLICIT LIMITS",
    revisionRule: threePackageRevisionRule("Short-Form Video Editing"),
    productionProblemIfCombinedWithOtherHeadline: true,
  },
  social_and_promo_graphics: {
    id: "social_and_promo_graphics",
    name: "Social & Promo Graphics",
    factorySku: ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"],
    lane: "standard",
    certification:
      "Social posts STANDARD harden + promotion graphics LIGHT harden — SELL NOW factories, unpublished as this combined headline",
    revisionRule: threePackageRevisionRule("Social & Promo Graphics"),
    productionProblemIfCombinedWithOtherHeadline: true,
  },
  reputation_customer_proof: {
    id: "reputation_customer_proof",
    name: "Reputation & Customer Proof Kit",
    factorySku: null,
    lane: "standard",
    certification:
      "B. READY WITH EXPLICIT LIMITS — STUDIO-REPUTATION-CUSTOMER-PROOF-OFFER-DEFINITION-AND-CERT-1",
    revisionRule:
      "One included kit revision. It can change the call to action or correct a supplied fact or attribution. It is not a new invented review or a video job.",
    productionProblemIfCombinedWithOtherHeadline: true,
  },
} as const;

export const fourPackageSupports = {
  ad_creative: {
    id: "ad_creative",
    name: "Ad Creative",
    certification:
      "B. READY WITH EXPLICIT LIMITS — included support only. Square + portrait + headline / primary / CTA.",
    requiredInputs: ["business name", "one offer", "factual ad wording", "CTA"],
    skipIfMissingInputs: true,
  },
  email_and_text: {
    id: "email_and_text",
    name: "Email & Text Campaign",
    certification:
      "Copy-kit LIGHT harden — up to 2 emails and up to 4 texts. Studio does not send.",
    requiredInputs: ["business name", "campaign purpose", "factual offer or announcement"],
    skipIfMissingInputs: true,
  },
  menu_price_list: {
    id: "menu_price_list",
    name: "Menu / Price List",
    certification:
      "Menu LIGHT harden — one single-page menu, up to 5 sections and 30 items. Customer verifies prices and allergen wording.",
    requiredInputs: ["business name", "items", "prices"],
    skipIfMissingInputs: true,
  },
  ai_local_visibility: {
    id: "ai_local_visibility",
    name: "AI + Local Visibility",
    certification:
      "B. READY WITH EXPLICIT LIMITS — included support. Customer-facts pack only. No fetch. No ranking promises.",
    requiredInputs: ["business name", "city or service area", "real services"],
    skipIfMissingInputs: true,
  },
} as const;

export const fourPackageSupportMatrix: Record<
  FourPackageHeadlineId,
  Record<FourPackageSupportId, SupportFit>
> = {
  clip_repurposing: {
    ad_creative: "OPTIONAL_FIT",
    email_and_text: "OPTIONAL_FIT",
    menu_price_list: "NOT_APPROPRIATE",
    ai_local_visibility: "NOT_APPROPRIATE",
  },
  short_form_video_editing: {
    ad_creative: "OPTIONAL_FIT",
    email_and_text: "OPTIONAL_FIT",
    menu_price_list: "NOT_APPROPRIATE",
    ai_local_visibility: "NOT_APPROPRIATE",
  },
  social_and_promo_graphics: {
    ad_creative: "NATURAL_FIT",
    email_and_text: "NATURAL_FIT",
    menu_price_list: "OPTIONAL_FIT",
    ai_local_visibility: "OPTIONAL_FIT",
  },
  reputation_customer_proof: {
    ad_creative: "OPTIONAL_FIT",
    email_and_text: "OPTIONAL_FIT",
    menu_price_list: "NOT_APPROPRIATE",
    ai_local_visibility: "NATURAL_FIT",
  },
};

export const fourPackageExtras = {
  flyer: {
    id: "flyer",
    name: "Flyer",
    role: "studio_thank_you_extra",
    paidAddOn: false,
    customerMayDecline: true,
    skipWhen:
      "Skip when the customer has no print or handout use, or when they cannot supply a real offer, event, or contact route.",
    usefulWhen:
      "Useful when they will print or hand something out for one offer, event, or location.",
    requiredInputs: ["business name", "one message", "a real contact or conversion route"],
    lane: "standard",
    printCertified300Dpi: false,
    studioPrintsOrShips: false,
  },
  business_card: {
    id: "business_card",
    name: "Business Card",
    role: "studio_thank_you_extra",
    paidAddOn: false,
    customerMayDecline: true,
    skipWhen:
      "Skip when they do not meet people in person, or when name and contact facts are missing.",
    usefulWhen: "Useful when they hand a card to a real person.",
    requiredInputs: ["person name", "business name", "at least one contact method"],
    lane: "standard",
    printCertified300Dpi: false,
    studioPrintsOrShips: false,
  },
} as const;

export const fourPackageChoiceFlow = [
  "Choose one headline package",
  "Choose included support options that fit, or mark SKIP / N/A",
  "Choose or decline Studio thank-you extras",
  "Confirm required inputs for the selected items only",
  "Proceed to the project",
] as const;

export const fourPackageForbiddenPromises = [
  /grow your (business|sales|revenue)/i,
  /\d+\s*%/,
  /\bleads?\b/i,
  /\brank/i,
  /\bbookings?\b/i,
  /\bviews\b/i,
  /\bengagement\b/i,
  /\breview counts?\b/i,
  /\bguaranteed\b/i,
] as const;
