/**
 * Authoritative fulfillment contract for the current Social & Promo Graphics door.
 * The historical $99 social-posts shelf and $79 campaign-graphics shelf stay
 * understandable on their own rows. They are not this package's commercial contract.
 */

import { STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1 } from "@/config/studio-three-package-revision-truth-v1";
import { studioThankYouAmount } from "@/config/studio-thank-you-discount-v1";
import { CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU } from "@/config/studio-campaign-graphics-light-harden-v1";
import { SOCIAL_POSTS_STANDARD_HARDEN_SKU } from "@/config/studio-social-posts-standard-harden-v1";
import { studioCampaignGraphicsLightHardenV1 } from "@/config/studio-campaign-graphics-light-harden-v1";
import { studioSocialPostsStandardHardenV1 } from "@/config/studio-social-posts-standard-harden-v1";

const DOOR = STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.packages.social_and_promo_graphics;
const THANK_YOU = studioThankYouAmount(DOOR.priceCents);

export const SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID = "social_and_promo_graphics" as const;

export const studioSocialPromoCurrentDoorContractV1 = {
  packageId: SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID,
  customerFacingName: DOOR.name,
  listPriceCents: DOOR.priceCents,
  priceDisplay: DOOR.priceDisplay,
  thankYouDiscountCents: THANK_YOU.discountCents,
  thankYouDisplay: "$39.80" as const,
  amountDueCents: THANK_YOU.amountDueCents,
  amountDueDisplay: "$159.20" as const,
  revisionRounds: DOOR.revisionRounds,
  revisionScope: "purchased_package" as const,
  oneTheme: true as const,
  ctaOptional: true as const,
  blankCtaMeans: "none" as const,
  doNotInventCta: true as const,
  preserveSuppliedCta: true as const,
  lane: "standard" as const,
  customerOrderCount: 1 as const,
  revisionLedgerCount: 1 as const,
  requiredIntake: ["purpose", "rights"] as const,
  optionalIntake: ["cta", "facts", "logo", "photos", "prices"] as const,
  branches: {
    socialPosts: {
      branchId: "social_posts" as const,
      capabilitySku: SOCIAL_POSTS_STANDARD_HARDEN_SKU,
      toolId: "studio_design_renderer" as const,
      family: "social" as const,
      catalogFamilyId: "social_media" as const,
      posts: 4 as const,
      postWidth: 1024 as const,
      postHeight: 1024 as const,
      captions: 4 as const,
      postingOrder: 1 as const,
    },
    campaignGraphics: {
      branchId: "campaign_graphics" as const,
      capabilitySku: CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU,
      toolId: "studio_design_renderer" as const,
      family: "marketing_assets" as const,
      catalogFamilyId: "marketing_assets" as const,
      graphics: 2 as const,
      square: { width: 1024 as const, height: 1024 as const },
      portrait: { width: 1024 as const, height: 1536 as const },
    },
  },
  completionLanguage:
    "Four square posts, matching captions, a suggested posting order, and two campaign graphics arrive together. You post them. Three revision rounds are included." as const,
} as const;

/** Historical factory values. Not used in current-door customer messaging. */
export const studioSocialPromoObsoleteFactoriesIsolatedV1 = {
  socialPosts: {
    skuId: studioSocialPostsStandardHardenV1.skuId,
    customerFacingName: studioSocialPostsStandardHardenV1.offer.customerFacingName,
    priceCents: studioSocialPostsStandardHardenV1.offer.priceCents,
    includedRevisions: studioSocialPostsStandardHardenV1.offer.includedRevisions,
    ctaRequired: true as const,
  },
  promotionGraphics: {
    skuId: studioCampaignGraphicsLightHardenV1.skuId,
    customerFacingName: studioCampaignGraphicsLightHardenV1.offer.customerFacingName,
    priceCents: studioCampaignGraphicsLightHardenV1.offer.priceCents,
    includedRevisions: studioCampaignGraphicsLightHardenV1.offer.includedRevisions,
  },
  notTheCurrentDoorCommercialContract: true as const,
} as const;

export function socialPromoCustomerDeliverableLabels(): readonly string[] {
  return [
    "Four coordinated square posts, 1024×1024",
    "Four matching captions",
    "Suggested posting order",
    "Campaign graphic, 1024×1024",
    "Campaign graphic, 1024×1536",
  ];
}

export function socialPromoCurrentDoorCustomerFacingText(): string {
  const contract = studioSocialPromoCurrentDoorContractV1;
  return [
    contract.customerFacingName,
    contract.priceDisplay,
    contract.thankYouDisplay,
    contract.amountDueDisplay,
    contract.completionLanguage,
    `${contract.revisionRounds} revision rounds`,
    ...socialPromoCustomerDeliverableLabels(),
    "Call-to-action wording, if you have one",
  ].join(" ");
}
