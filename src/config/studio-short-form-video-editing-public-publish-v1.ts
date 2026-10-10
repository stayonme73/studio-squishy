/**
 * Public publication of certified $349 Short-Form Video Editing.
 * Does not reopen the factory. Does not touch $149 stills. Does not wire Clip Repurposing.
 *
 * HISTORICAL — SUPERSEDED FOR LAUNCH (owner ruling 2026-10-10). Launch offer is $249 on
 * the three-package door, unpublished. Launch truth: `studio-canonical-launch-truth-v1.ts`.
 */

import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";

export const STUDIO_SHORT_FORM_VIDEO_EDITING_PUBLIC_PUBLISH_PACKAGE_ID =
  "STUDIO-OPERATING-SHORT-FORM-VIDEO-EDITING-PUBLIC-PUBLISH-1" as const;

export const studioShortFormVideoEditingPublicPublishV1 = {
  packageId: STUDIO_SHORT_FORM_VIDEO_EDITING_PUBLIC_PUBLISH_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-25" as const,
  skuId: SHORT_FORM_VIDEO_EDITING_SKU,
  priceCents: 34900,
  publicMenuPublished: true as const,
  publicLaunchNowPublishedCount: 10 as const,
  internalSellNowCount: 11 as const,
  preserveCertifiedOffer: true as const,
  preserveSourceAudioPreflight: true as const,
  preserveLightCleanup: true as const,
  preserveFootageEditingDispatch: true as const,
  preserveReviewRevisionDelivery: true as const,
  doNotAlterCertifiedFactory: true as const,
  doNotAlterStillsShortVideo: true as const,
  doNotTouchClipRepurposing: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
} as const;
