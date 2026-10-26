/**
 * HARDEN #8 — SHORT VIDEO (STANDARD)
 *
 * STANDARD names engineering effort, not permission to lower quality.
 * Stills + captions + CTA. Owner does not finish the video.
 *
 * Authority: Tagia 2026-09-24 AUTHORIZE FINAL LAUNCH HARDEN — SHORT VIDEO STANDARD
 */

import { studioLaunchMenuProductionRuntimeV1 } from "./studio-launch-menu-production-runtime-v1";

export const STUDIO_SHORT_VIDEO_STANDARD_HARDEN_PACKAGE_ID =
  "STUDIO-OPERATING-SHORT-VIDEO-STANDARD-HARDEN-1" as const;

export const SHORT_VIDEO_STANDARD_HARDEN_SKU = "v2-rtu-short-video" as const;

export const SHORT_VIDEO_MP4_LABEL =
  "Final vertical MP4 1080×1920 — still photos, captions, and CTA" as const;

export const SHORT_VIDEO_HONEST_PROMISED_OUTPUT =
  "One 15–30 second vertical video (1080×1920) assembled from your still photos with on-screen captions and a CTA. You post it. Not footage editing, voice, music, extra sizes, or Studio posting." as const;

export const SHORT_VIDEO_PAYG_CENTS_PER_MINUTE = 30;

export const studioShortVideoStandardHardenV1 = {
  packageId: STUDIO_SHORT_VIDEO_STANDARD_HARDEN_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-24" as const,
  owner: "Tagia",
  skuId: SHORT_VIDEO_STANDARD_HARDEN_SKU,
  hardenClass: "STANDARD" as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  classification: "SELL_NOW" as const,
  frozenAt: "2026-09-24" as const,
  frozen: true as const,
  doNotReopenPriorSellNow: true as const,
  doNotRemintMaya: true as const,
  doNotBroadenToMakeThePriceWorthIt: true as const,
  ownerRescueIsNotTheCompletionPath: true as const,
  ownerConsoleParked: true as const,

  qualityLock: {
    standardMeansEngineeringEffortNotLowerQuality: true as const,
    reduceScopeBeforeReducingQuality: true as const,
    requiredCustomerStandard: [
      "pacing",
      "composition",
      "legibility",
      "transitions",
      "caption timing",
      "factual accuracy",
      "CTA clarity",
      "clean delivery",
    ] as const,
  },

  offer: {
    customerFacingName: "Make Me a Short Video",
    priceCents: 14900,
    promisedOutput: SHORT_VIDEO_HONEST_PROMISED_OUTPUT,
    durationSeconds: { min: 15, max: 30, target: 18 } as const,
    plate: { widthPx: 1080, heightPx: 1920 } as const,
    aspect: "vertical" as const,
    stillCount: { min: 1, max: 4 } as const,
    stillKinds: ["png", "jpg"] as const,
    files: ["mp4"] as const,
    captionsFromApprovedCustomerWords: true as const,
    oneCta: true as const,
    customerPosts: true as const,
    studioDoesNotPost: true as const,
    includedRevisions: 1 as const,
    narration: false as const,
    studioMusic: false as const,
    customerFootageEditing: false as const,
    studioCreatedFootage: false as const,
    stockFootage: false as const,
    landscape: false as const,
    square: false as const,
    extraVersions: false as const,
    failClosedDisposition: "refund_or_cannot_deliver" as const,
  },

  ceilings: {
    productionTime: "within 3–5 business days" as const,
    videoTransportAttempts:
      studioLaunchMenuProductionRuntimeV1.internalBudgets.videoTransportAttempts,
    videoCreativeAttempts:
      studioLaunchMenuProductionRuntimeV1.internalBudgets.videoCreativeAttempts,
    includedCustomerRevisions: 1 as const,
    toolCostWarningCents: 2235,
    toolCostFailCents: 4470,
    paygCentsPerMinute: SHORT_VIDEO_PAYG_CENTS_PER_MINUTE,
  },
} as const;

export function isShortVideoStandardHardenSku(
  skuId: string | null | undefined,
): boolean {
  return skuId === SHORT_VIDEO_STANDARD_HARDEN_SKU;
}

export function estimateShotstackPaygCents(input: {
  durationSeconds: number;
  renderCount?: number;
}): number {
  const renders = Math.max(1, input.renderCount ?? 1);
  const minutes = Math.max(0, input.durationSeconds) / 60;
  return Math.round(minutes * SHORT_VIDEO_PAYG_CENTS_PER_MINUTE * renders);
}
