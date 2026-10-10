/**
 * Public publication of certified $549 Clip Repurposing.
 * Does not reopen the set factory. Does not alter $349 or $149.
 *
 * HISTORICAL — SUPERSEDED FOR LAUNCH (owner ruling 2026-10-10). For launch, Clip is
 * UNPUBLISHED; its launch offer is $399 on the three-package door.
 * Launch truth: `studio-canonical-launch-truth-v1.ts`.
 */

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";

export const STUDIO_CLIP_REPURPOSING_PUBLIC_PUBLISH_PACKAGE_ID =
  "STUDIO-OPERATING-CLIP-REPURPOSING-PUBLIC-PUBLISH-1" as const;

export const studioClipRepurposingPublicPublishV1 = {
  packageId: STUDIO_CLIP_REPURPOSING_PUBLIC_PUBLISH_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-26" as const,
  skuId: CLIP_REPURPOSING_SKU,
  priceCents: 54900,
  publicMenuPublished: true as const,
  publicLaunchNowPublishedCount: 11 as const,
  internalSellNowCount: 11 as const,
  preserveCertifiedOffer: true as const,
  preserveRemedyEconomics: true as const,
  preserveSourceAudioPreflight: true as const,
  preserveLightCleanup: true as const,
  preserveEndCueFinishing: true as const,
  preserveClipDispatch: true as const,
  preserveSetReviewRevisionDelivery: true as const,
  doNotAlterCertifiedFactory: true as const,
  doNotAlterShortFormVideoEditing: true as const,
  doNotAlterStillsShortVideo: true as const,
  doNotTouchOriginalNine: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
} as const;
