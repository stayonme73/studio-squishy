/**
 * Owner-as-Customer Real Studio Campaign.
 * Tagia hires the Studio on the frozen public menu. Not a Customer-One remint.
 */

import { SOCIAL_POSTS_STANDARD_HARDEN_SKU } from "@/config/studio-social-posts-standard-harden-v1";

export const STUDIO_OWNER_AS_CUSTOMER_REAL_STUDIO_CAMPAIGN_PACKAGE_ID =
  "STUDIO-OPERATING-OWNER-AS-CUSTOMER-REAL-STUDIO-CAMPAIGN-1" as const;

export const studioOwnerAsCustomerRealStudioCampaignV1 = {
  packageId: STUDIO_OWNER_AS_CUSTOMER_REAL_STUDIO_CAMPAIGN_PACKAGE_ID,
  authorizedAt: "2026-09-27" as const,
  verdict: "PASS_WITH_EXPLICIT_LIMITS" as const,
  skuId: SOCIAL_POSTS_STANDARD_HARDEN_SKU,
  skuName: "Make My Social Media Posts" as const,
  priceCents: 9900 as const,
  whyThisSku: [
    "Not the easiest one-plate flyer.",
    "Four coordinated posts + captions + posting order exercises Design, QA, Review, revision, and delivery.",
    "Register intent is Tagia hiring the Studio for genuine pre-launch campaign creative.",
    "Live dd:{jobId} social-posts hook already exists. Does not require invented talking-head footage.",
  ] as const,
  customer: {
    displayName: "Tagia" as const,
    businessName: "The Studio" as const,
    email: "thestudio7273@gmail.com" as const,
    website: "thestudiocompany7.com" as const,
    publicPhone: null,
    offer: "Ready-to-use Studio work from $69" as const,
    priceDisplay: "$69" as const,
    dateWindow: "October 1 – October 15, 2026" as const,
    cta: "Start at thestudiocompany7.com" as const,
    revisionCta: "Visit thestudiocompany7.com" as const,
    platform: "Instagram Post" as const,
    mustNotSay: [
      "Do not say The Studio is open now.",
      "Do not invent a phone number, testimonial, result, or guarantee.",
    ] as const,
  },
  paymentPath: "existing_confirmed_payment_truth" as const,
  liveStripeUsed: false as const,
  sharedJobTruthOnLiveSpine: false as const,
  browserRouteMapWalked: false as const,
  doNotRemintMaya: true as const,
  mayaCampaignId: "716a15b6-d8d6-436c-8f84-9e8b40d2f959" as const,
  customerOneFlyerCampaignId: "849c793b-88c1-48cd-9194-5ed95554635a" as const,
  ownerConsoleParked: true as const,
  room3Closed: true as const,
  doNotAddService: true as const,
  doNotChangePriceOrScope: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  nextPackageId: "STUDIO-OPERATING-CONTROLLED-OUTSIDE-CUSTOMER-TRIAL-1" as const,
  nextPackageStarted: false as const,
  doNotStartNextFromThisStamp: true as const,
  stampDoc:
    "docs/launch/studio-operating-owner-as-customer-real-studio-campaign-1/STUDIO-OPERATING-OWNER-AS-CUSTOMER-REAL-STUDIO-CAMPAIGN.md" as const,
  proofJson:
    "docs/launch/studio-operating-owner-as-customer-real-studio-campaign-1/proof.json" as const,
} as const;
