/**
 * STUDIO-OPERATING-DESIGN-PRODUCTION-CREATIVE-INTELLIGENCE-1
 *
 * Visual knowledge for Design Production — not a deck of customer templates.
 * Design Production must reason from customer facts. “Choose for me” is valid.
 * Do not copy copyrighted commercial work as reusable customer templates.
 */

export const studioDesignIntelligenceV1 = {
  packageId: "STUDIO-OPERATING-DESIGN-PRODUCTION-CREATIVE-INTELLIGENCE-1",
  schemaVersion: 1 as const,
  intelligenceVersion: "design-intelligence-v1.2.1" as const,
  room: 4 as const,
  doNotMerge: true as const,
  skuId: "v2-rtu-flyer" as const,
  customerRevisionPolicyUnchanged: true as const,
  scoutMayNotHandDrawCustomerArt: true as const,

  customerEffort: {
    brandColorsOptional: true as const,
    logoOptionalUnlessPurchasedServiceRequires: true as const,
    chooseForMeIsValid: true as const,
    doNotInterrogateDesignerJargon: true as const,
  },

  customerMoodChoices: [
    "modern_minimal",
    "bold_energetic",
    "elegant_premium",
    "warm_welcoming",
    "professional_polished",
    "creative_edgy",
    "choose_for_me",
  ] as const,

  antiCopy: {
    newCustomerMustNotInheritPriorSignature: true as const,
    mayaLikeDefaultForbidden: true as const,
    blockedDefaultPaletteId: "navy_gold_house" as const,
    blockedDefaultGeometryId: "centered_circle" as const,
    blockedDefaultLayoutId: "centered_promotional_plate" as const,
  },

  rendererCapability: {
    htmlCssCanPaintArbitraryGeometry: true as const,
    typographyLimitedToStudioSafeStacks: true as const,
    licensedDisplayFontsNotIncluded: true as const,
    bottleneckWasReasonerNotPaint: true as const,
  },
} as const;

export type StudioCustomerMoodId =
  (typeof studioDesignIntelligenceV1.customerMoodChoices)[number];

export const DESIGN_INTELLIGENCE_VERSION =
  studioDesignIntelligenceV1.intelligenceVersion;
