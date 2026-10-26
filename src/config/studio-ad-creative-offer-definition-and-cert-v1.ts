/**
 * Ad Creative V1 — offer definition and cert.
 * Unpublished. No price. No menu. Studio creates; customer runs the ads.
 */

export const STUDIO_AD_CREATIVE_OFFER_DEFINITION_AND_CERT_PACKAGE_ID =
  "STUDIO-AD-CREATIVE-OFFER-DEFINITION-AND-CERT-1" as const;

export const AD_CREATIVE_V1_CAMPAIGN_ID = "camp-ad-creative-v1-maple-wick-20261003" as const;

export const studioAdCreativeOfferDefinitionAndCertV1 = {
  packageId: STUDIO_AD_CREATIVE_OFFER_DEFINITION_AND_CERT_PACKAGE_ID,
  authorizedAt: "2026-10-03" as const,
  doNotPublish: true as const,
  doNotAdvertise: true as const,
  doNotChangePrice: true as const,
  doNotChangeMenu: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotRedesign: true as const,
  doNotChangeTheme: true as const,
  placement: "included_support_only" as const,
  liveCatalogSku: null,
  priceCents: null,
  serviceName: "Ad Creative",
  oneSentence:
    "The Studio makes the ad graphics and paste-ready ad text. You run the ads in your own account.",
  revisionLimit: 1,
  graphics: {
    square: { widthPx: 1024, heightPx: 1024 },
    portrait: { widthPx: 1024, heightPx: 1536 },
    factory: "v2-rtu-promotion-graphics",
  },
  customerCopy: {
    included: [
      "One square ad graphic (1024×1024 PNG)",
      "One portrait ad graphic (1024×1536 PNG)",
      "Paste-ready ad text: headline, primary text, and call to action",
      "One included revision of the set",
    ],
    notIncluded: [
      "Ad account access, login, or setup",
      "Budgets, bidding, targeting, or campaign management",
      "Publishing, boosting, or spending your money",
      "Performance, results, or ranking promises",
      "Video ads, carousels, Stories, or extra platform sizes",
      "Legal or compliance approval of your claims",
    ],
    customerMustProvide: [
      "Business name and one offer",
      "Exact wording you want on the ads, including required disclosures",
      "Price, dates, phone or website if they must appear",
      "Logo and photos you have the right to use",
      "Your own ad account and budget",
    ],
    revisionRule:
      "One included revision of the whole set. It can change headline, call to action, or a factual correction you supply. It is not a new offer or a new campaign.",
    accountBoundary:
      "The Studio does not log into your ad accounts, spend your budget, or manage targeting. You upload the files and run the ads.",
  },
  prohibitedStudioClaimPatterns: [
    /guaranteed/i,
    /\b#\s*1\b/i,
    /\bbest\b/i,
    /\bresults\b/i,
    /\bROI\b/i,
    /\bgoing viral\b/i,
    /\bwe will get you\b/i,
    /\bincrease (sales|revenue|traffic)\b/i,
  ],
  stampDoc:
    "docs/launch/studio-ad-creative-offer-definition-and-cert-1/STUDIO-AD-CREATIVE-OFFER-DEFINITION-AND-CERT-1.md" as const,
  proofJson:
    "docs/launch/studio-ad-creative-offer-definition-and-cert-1/STUDIO-AD-CREATIVE-OFFER-DEFINITION-AND-CERT-1.json" as const,
} as const;
