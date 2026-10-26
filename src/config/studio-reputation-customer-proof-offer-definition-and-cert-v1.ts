/**
 * Reputation & Customer Proof Kit V1 — offer definition and cert.
 * Unpublished. No price. No menu. Studio creates; customer sends and posts.
 */

export const STUDIO_REPUTATION_CUSTOMER_PROOF_OFFER_DEFINITION_AND_CERT_PACKAGE_ID =
  "STUDIO-REPUTATION-CUSTOMER-PROOF-OFFER-DEFINITION-AND-CERT-1" as const;

export const REPUTATION_PROOF_V1_CAMPAIGN_ID =
  "camp-reputation-proof-v1-marigold-grooming-20261003" as const;

export const studioReputationCustomerProofOfferDefinitionAndCertV1 = {
  packageId: STUDIO_REPUTATION_CUSTOMER_PROOF_OFFER_DEFINITION_AND_CERT_PACKAGE_ID,
  authorizedAt: "2026-10-03" as const,
  doNotPublish: true as const,
  doNotAdvertise: true as const,
  doNotChangePrice: true as const,
  doNotChangeMenu: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotRedesign: true as const,
  placement: "headline_package_candidate" as const,
  fourPackagePlacement: "HEADLINE_PACKAGE" as const,
  liveCatalogSku: null,
  priceCents: null,
  serviceName: "Reputation & Customer Proof Kit",
  oneSentence:
    "The Studio makes the review-request words, a QR card, response wording, and quote graphics from real praise you already have. You send, post, and reply yourself.",
  revisionLimit: 1,
  testimonialLimit: 1,
  graphics: {
    square: { widthPx: 1024, heightPx: 1024 },
    portrait: { widthPx: 1024, heightPx: 1536 },
    reviewCard: { widthPx: 1024, heightPx: 1536 },
  },
  publicInformation: {
    allowed: [
      "customer_provided_business_facts",
      "customer_provided_review_destination_url_as_label_only",
      "customer_provided_testimonial_with_rights_confirmation",
    ],
    forbidden: [
      "google_business_login",
      "review_platform_login",
      "social_account_login",
      "inbox_access",
      "fetch_or_scrape_reviews",
      "invented_reviews_or_customers",
    ],
    conflictRule: "preserve_original_meaning_ask_do_not_guess",
  },
  prohibitedStudioClaimPatterns: [
    /guaranteed/i,
    /\bbest\b/i,
    /\b#\s*1\b/i,
    /\brank(ing|ed|s)?\b/i,
    /\bleads?\b/i,
    /\bsales\b/i,
    /\b5\s*star/i,
    /\bfive[-\s]?star/i,
    /\breview count/i,
    /\bAI (customer|actor|reviewer)\b/i,
    /\bsince\s+\d{4}\b/i,
  ],
  customerCopy: {
    included: [
      "Paste-ready review-request text for email and text",
      "Thank-you / follow-up wording",
      "Positive, neutral, and negative review-response templates",
      "One printable / digital QR review card pointed at the link you supplied",
      "One square and one portrait quote graphic from one real supplied testimonial",
      "A matching caption and a simple use guide",
      "One included revision of the kit",
    ],
    notIncluded: [
      "Google Business, review-platform, social, or inbox login",
      "Sending review requests or posting replies for you",
      "Invented reviews, customers, star ratings, or outcomes",
      "Review-count, ranking, lead, or sales promises",
      "Video testimonials or AI-generated customers",
      "Ongoing reputation management",
    ],
    customerMustProvide: [
      "Business name",
      "The exact review destination link for the QR card",
      "One real customer review or testimonial you want used, in their words",
      "Confirmation you have permission to use that wording and name",
      "Preferred call to action if you have one",
      "Any required disclaimer",
    ],
    revisionRule:
      "One included revision of the kit. It can change the call to action or correct a fact or attribution you supply. It is not a new business, a new invented review, or a video job.",
    accountBoundary:
      "The Studio does not log into Google Business Profile, review platforms, social accounts, or your inbox. You send the requests, post the graphics, and reply yourself.",
    rightsBoundary:
      "The Studio only uses a review or testimonial you supplied with permission. It will not invent a customer or rewrite praise into a different claim.",
  },
  stampDoc:
    "docs/launch/studio-reputation-customer-proof-offer-definition-and-cert-1/STUDIO-REPUTATION-CUSTOMER-PROOF-OFFER-DEFINITION-AND-CERT-1.md" as const,
  proofJson:
    "docs/launch/studio-reputation-customer-proof-offer-definition-and-cert-1/STUDIO-REPUTATION-CUSTOMER-PROOF-OFFER-DEFINITION-AND-CERT-1.json" as const,
} as const;
