/**
 * STUDIO-OPERATING-COPY-REVIEW-BIND-1
 *
 * Package E: present QA-authorized email-kit / SMS-kit copy in Review Room.
 * Does not redesign Review Room. Does not touch Maya. Review is not Final Delivery.
 * cc-001 and Voice remain HOLD. Do not expand the launch copy menu.
 */

import { LAUNCH_MENU_COPY_SKUS } from "@/config/studio-launch-menu-production-runtime-v1";

export const studioCopyReviewBindV1 = {
  packageId: "STUDIO-OPERATING-COPY-REVIEW-BIND-1",
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
  proofKeyPrefix: "copy-review",
} as const;

export const COPY_REVIEW_BIND_SKUS = LAUNCH_MENU_COPY_SKUS;

export const COPY_REVIEW_HOLD_SKUS = [
  "cc-001",
  "em-001",
  "em-001-monthly",
  "sms-001",
  "v2-rtu-voice",
] as const;

export const COPY_REVIEW_CUSTOMER_LABELS = {
  email: (n: number) => `Email ${n}`,
  sms: (n: number) => `Text message ${n}`,
  subject: "Subject",
  preview: "Preview text",
  body: "Body",
  cta: "Call to action",
  message: "Message",
} as const;

/** Customer-facing leak — FAIL if these appear in Review labels, filenames, or proof copy. */
export const COPY_REVIEW_CUSTOMER_LEAK_PATTERNS: readonly RegExp[] = [
  /copy-hook-receipt/i,
  /copy-v\d+\.json/i,
  /factsFingerprint/i,
  /studio_copy_producer/i,
  /CERTIFICATION FIXTURE/i,
  /INTERNAL TEST/i,
  /Harbor\s*&\s*Oak/i,
  /harbor-oak/i,
  /Cedar\s+Lane/i,
  /\bNia\b/,
  /sha256:/i,
  /copySha256/i,
  /rendererVersion/i,
  /cert-email/i,
  /cert-sms/i,
];
