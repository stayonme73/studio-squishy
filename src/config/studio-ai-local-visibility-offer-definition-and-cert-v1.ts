/**
 * AI + Local Visibility V1 — offer definition and cert.
 * Unpublished. No price. No menu. No account login. No ranking promises.
 */

export const STUDIO_AI_LOCAL_VISIBILITY_OFFER_DEFINITION_AND_CERT_PACKAGE_ID =
  "STUDIO-AI-LOCAL-VISIBILITY-OFFER-DEFINITION-AND-CERT-1" as const;

export const LOCAL_VISIBILITY_V1_CAMPAIGN_ID =
  "camp-local-visibility-v1-northside-bike-20261003" as const;

export const studioAiLocalVisibilityOfferDefinitionAndCertV1 = {
  packageId: STUDIO_AI_LOCAL_VISIBILITY_OFFER_DEFINITION_AND_CERT_PACKAGE_ID,
  authorizedAt: "2026-10-03" as const,
  doNotPublish: true as const,
  doNotAdvertise: true as const,
  doNotChangePrice: true as const,
  doNotChangeMenu: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotRedesign: true as const,
  placement: "included_support_only" as const,
  fourPackagePlacement: "INCLUDED_SUPPORT_CAPABILITY" as const,
  liveCatalogSku: null,
  priceCents: null,
  serviceName: "AI + Local Visibility",
  oneSentence:
    "The Studio turns your business facts into clear descriptions, FAQs, and a checklist you paste into your own profiles. You make the changes.",
  revisionLimit: 1,
  publicInformation: {
    allowed: [
      "customer_provided_facts",
      "customer_provided_screenshots_or_files",
      "customer_stated_website_url_as_label_only",
    ],
    forbidden: [
      "fetch_or_scrape_website",
      "google_business_login",
      "directory_login",
      "analytics_login",
      "unsupported_outside_research",
    ],
    conflictRule: "flag_and_ask_do_not_guess",
  },
  prohibitedPatterns: [
    /guaranteed/i,
    /\bbest\b/i,
    /\b#\s*1\b/i,
    /\brank(ing|ed|s)?\b/i,
    /\bpage\s*one\b/i,
    /\bleads?\b/i,
    /\bsales\b/i,
    /\bAI will recommend\b/i,
    /\bChatGPT will\b/i,
    /\bGoogle will (show|rank|recommend)\b/i,
    /\bsince\s+\d{4}\b/i,
    /\baward/i,
    /\b5\s*star/i,
  ],
  customerCopy: {
    included: [
      "A business clarity summary from the facts you supplied",
      "A short paste-ready business description",
      "Service wording taken only from your listed services",
      "A small FAQ set answered only from your facts",
      "A local consistency checklist and implementation guide you use yourself",
      "One included revision of the pack",
    ],
    notIncluded: [
      "Google Business, website, directory, social, or analytics login",
      "Publishing or profile changes made by The Studio",
      "Ranking, lead, sales, or AI-recommendation promises",
      "Live website or listing research",
      "Invented services, hours, reviews, awards, or years in business",
    ],
    customerMustProvide: [
      "Legal business name and what you want customers to call you",
      "City / service area you actually serve",
      "Address, phone, website, and hours if they should appear",
      "The services you actually offer",
      "Any required disclosures",
    ],
    revisionRule:
      "One included revision of the pack. It can correct a fact you supply. It is not a new business, a new city, or a research job.",
    accountBoundary:
      "The Studio does not log into Google Business Profile, your website, directories, or analytics. You paste the words and make the changes.",
  },
  stampDoc:
    "docs/launch/studio-ai-local-visibility-offer-definition-and-cert-1/STUDIO-AI-LOCAL-VISIBILITY-OFFER-DEFINITION-AND-CERT-1.md" as const,
  proofJson:
    "docs/launch/studio-ai-local-visibility-offer-definition-and-cert-1/STUDIO-AI-LOCAL-VISIBILITY-OFFER-DEFINITION-AND-CERT-1.json" as const,
} as const;
