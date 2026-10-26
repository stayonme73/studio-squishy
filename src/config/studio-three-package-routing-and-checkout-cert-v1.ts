/**
 * Three-package routing and checkout cert.
 * Owner-approved launch prices. No theme redesign. No Final Delivery change.
 */

import {
  THREE_PACKAGE_HEADLINE_IDS,
  type ThreePackageHeadlineId,
  type ThreePackageSupportId,
} from "@/config/studio-three-package-architecture-reconciliation-v1";
import { threePackageRevisionRule } from "@/config/studio-three-package-revision-truth-v1";

export const STUDIO_THREE_PACKAGE_ROUTING_AND_CHECKOUT_CERT_PACKAGE_ID =
  "STUDIO-THREE-PACKAGE-ROUTING-AND-CHECKOUT-CERT-1" as const;

export const THREE_PACKAGE_LAUNCH_PRICE_CENTS = {
  clip_repurposing: 37375,
  short_form_video_editing: 18625,
  social_and_promo_graphics: 19900,
} as const;

export const THREE_PACKAGE_STEPS = [
  "your_package",
  "tell_us",
  "included_support",
  "studio_thank_you",
  "final_review",
  "payment",
] as const;

export type ThreePackageStepId = (typeof THREE_PACKAGE_STEPS)[number];
export type StepStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" | "ACTION_NEEDED";
export type ExtraId = "flyer" | "business_card";

export const studioThreePackageRoutingAndCheckoutCertV1 = {
  packageId: STUDIO_THREE_PACKAGE_ROUTING_AND_CHECKOUT_CERT_PACKAGE_ID,
  authorizedAt: "2026-10-03" as const,
  doNotPublish: true as const,
  doNotAdvertise: true as const,
  doNotRedesignTheme: true as const,
  doNotChangeFinalDelivery: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  liveConversationRoomUnchanged: true as const,
  oneHeadlinePerOrder: true as const,
  noSurpriseFees: true as const,
  noPaidSupportCharge: true as const,
  skipAllowed: true as const,
  voiceAndHelpPageLevel: true as const,
  clipSourceMinutes: { min: 15, max: 60 } as const,
  launchPriceCents: THREE_PACKAGE_LAUNCH_PRICE_CENTS,
  headlineIds: THREE_PACKAGE_HEADLINE_IDS,
  steps: THREE_PACKAGE_STEPS,
  stepStatuses: ["NOT_STARTED", "IN_PROGRESS", "COMPLETE", "ACTION_NEEDED"] as const,
  afterPaymentHandoff: "/studio-board" as const,
  paymentFixtureOnly: true as const,
  stampDoc:
    "docs/launch/studio-three-package-routing-and-checkout-cert-1/STUDIO-THREE-PACKAGE-ROUTING-AND-CHECKOUT-CERT-1.md" as const,
  proofJson:
    "docs/launch/studio-three-package-routing-and-checkout-cert-1/STUDIO-THREE-PACKAGE-ROUTING-AND-CHECKOUT-CERT-1.json" as const,
} as const;

export const threePackageHeadlineCopy = {
  clip_repurposing: {
    name: "Clip Repurposing",
    description:
      "You give us one eligible longer video. We find the strongest moments and turn them into short videos you post yourself.",
    priceUsd: 399,
    limits: "Eligible video is 15–60 minutes. Five shorts is the maximum, not a promise. We do not post.",
    revision: threePackageRevisionRule("Clip Repurposing"),
  },
  short_form_video_editing: {
    name: "Short-Form Video Editing",
    description:
      "You mark the short moments you want used. We polish them into a small set with captions and covers. You post them.",
    priceUsd: 249,
    limits: "You must mark each moment. Three videos are not guaranteed. We do not search a long recording.",
    revision: threePackageRevisionRule("Short-Form Video Editing"),
  },
  social_and_promo_graphics: {
    name: "Social & Promo Graphics",
    description:
      "We make a coordinated set of social posts and promo graphics from the facts you give us. You post them.",
    priceUsd: 199,
    limits: "One theme. No carousel, Stories, Reels, or video ads. We do not post.",
    revision: threePackageRevisionRule("Social & Promo Graphics"),
  },
} as const;

export type RoutingHeadlineId = ThreePackageHeadlineId;
export type RoutingSupportId = ThreePackageSupportId;
