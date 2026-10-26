/**
 * Pre-payment source-audio quality gate + complimentary light cleanup.
 * Applies to published $349 Short-Form Video Editing and unpublished $549 Clip Repurposing.
 * Does not reopen those factories. Does not define refund policy.
 */

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";

export const STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID =
  "STUDIO-OPERATING-SOURCE-AUDIO-PREFLIGHT-AND-LIGHT-CLEANUP-1" as const;

export const SOURCE_AUDIO_PREFLIGHT_SKUS = [
  SHORT_FORM_VIDEO_EDITING_SKU,
  CLIP_REPURPOSING_SKU,
] as const;

export const SOURCE_AUDIO_CUSTOMER_NOTICE =
  "We noticed background noise in your source recording. We can make up to two light cleanup attempts at no additional charge, but we cannot guarantee the noise will be completely removed. You may proceed with this source or upload a cleaner recording." as const;

export const studioSourceAudioPreflightV1 = {
  packageId: STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-25" as const,
  appliesToSkus: SOURCE_AUDIO_PREFLIGHT_SKUS,
  publicMenuPublished: false as const,
  doNotPublish: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotReopenEditorial: true as const,
  doNotReopenCaptions: true as const,
  doNotReopenShotstack: true as const,
  doNotReopenReviewDelivery: true as const,
  doNotReopenClipSetLogic: true as const,
  doNotDefineRefundPolicy: true as const,
  maxLightCleanupPasses: 2 as const,
  complimentary: true as const,
  noPromiseOfFullRemoval: true as const,
  noHeavyRestoration: true as const,
  revertIfSpeechWorse: true as const,
  gateBeforePaidProduction: true as const,
  customerNotice: SOURCE_AUDIO_CUSTOMER_NOTICE,
  outcomes: ["PASS", "NOTICE_AND_CHOICE", "REPLACEMENT_REQUIRED"] as const,
  voicePass: "Your source recording is acceptable for production.",
  voiceNotice: SOURCE_AUDIO_CUSTOMER_NOTICE,
  voiceReplacement:
    "This recording cannot be used as-is. Please upload a clearer talking-head before we continue. The Studio will not reconstruct broken speech.",
  clippingMaterialGate: {
    packageId: "STUDIO-CLIP-SOURCE-AUDIO-GATE-HARDENING-1" as const,
    authorizedAt: "2026-10-03" as const,
    replacesWholeFilePeakReject: true as const,
    doNotWhitelistAFile: true as const,
    doNotUseSttAsSoleJudge: true as const,
    rejectMaterialDamage: true as const,
    allowIsolatedNonMaterialPeaks: true as const,
    sampleThreshold: 0.999 as const,
    clusterGapSeconds: 0.25 as const,
    analysisSampleRate: 48000 as const,
    needleMaxClusterDurationMs: 40 as const,
    plateauMinDurationMs: 50 as const,
    plateauMinClippedDensity: 0.15 as const,
    maxIsolatedClusters: 4 as const,
    maxClustersPerMinuteAfter60s: 0.5 as const,
    maxClippedSampleRatio: 0.0001 as const,
    customerReason:
      "This recording has damaged or flattened speech. The Studio cannot reconstruct broken speech." as const,
  },
} as const;

export function isSourceAudioPreflightSku(
  skuId: string | null | undefined,
): boolean {
  return SOURCE_AUDIO_PREFLIGHT_SKUS.some((sku) => sku === skuId);
}
