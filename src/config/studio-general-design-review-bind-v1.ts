/**
 * STUDIO-OPERATING-GENERAL-DESIGN-REVIEW-BIND-1
 *
 * Package D: present QA-authorized non-flyer Design Production artifacts
 * in Review Room. Does not redesign Review Room. Does not touch Maya.
 * Review proof is not Final Delivery.
 */

import { GENERAL_DESIGN_LAUNCH_SKUS } from "@/config/studio-general-design-runtime-v1";

export const studioGeneralDesignReviewBindV1 = {
  packageId: "STUDIO-OPERATING-GENERAL-DESIGN-REVIEW-BIND-1",
  schemaVersion: 1 as const,
  room: 4 as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotTouchMaya: true as const,
  doNotRedesignReviewRoom: true as const,
  doNotModifyRefundPolicy: true as const,
  doNotModifyCustomerRevisionPolicy: true as const,
  reviewIsNotFinalDelivery: true as const,
  ownerRoutineBinding: "NONE" as const,
  proofKeyPrefix: "gd-review",
} as const;

export const GENERAL_DESIGN_REVIEW_BIND_SKUS = GENERAL_DESIGN_LAUNCH_SKUS;

export const GENERAL_DESIGN_REVIEW_HOLD_SKUS = [
  "v2-rtu-handout",
] as const;

export const GENERAL_DESIGN_CUSTOMER_FORMAT_LABELS = {
  square: "Square graphic",
  portrait: "Portrait graphic",
  front: "Front",
  back: "Back",
  post: (n: number) => `Post ${n}`,
  menu: "Menu design",
  serviceSheet: "Service sheet",
} as const;

/** Customer-facing leak — FAIL if these appear in Review labels, filenames, or alt text. */
export const GENERAL_DESIGN_REVIEW_CUSTOMER_LEAK_PATTERNS: readonly RegExp[] = [
  /cert-square/i,
  /cert-portrait/i,
  /cert-landscape/i,
  /CERTIFICATION FIXTURE/i,
  /INTERNAL TEST/i,
  /Harbor\s*&\s*Oak/i,
  /Cedar\s+Lane/i,
  /\bNia\b/,
  /rooted-ready-wellness-v1/i,
  /harbor-roast-coffee-v1/i,
  /cedar-lane-home-organizing-v1/i,
  /sha256:/i,
  /dispatch-hook-receipt/i,
  /rendererVersion/i,
];
