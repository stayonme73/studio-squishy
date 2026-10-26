/**
 * Prepared public-switch package for the Owner-certified $349 Short-Form Content Pack.
 * Owner authorized the coordinated public switch on 2026-09-28.
 * Do not merge. Do not push. Do not publish Clip price or unfinished Clip I/O.
 */

import { studioShortFormContentPackPublicSwitchV1 } from "@/config/studio-short-form-content-pack-public-switch-v1";

export const STUDIO_349_SHORT_FORM_CONTENT_PACK_PUBLIC_SWITCH_PACKAGE_ID =
  "STUDIO-349-SHORT-FORM-CONTENT-PACK-PUBLIC-SWITCH-1" as const;

export const studio349ShortFormContentPackPublicSwitchV1 = {
  packageId: STUDIO_349_SHORT_FORM_CONTENT_PACK_PUBLIC_SWITCH_PACKAGE_ID,
  authorizedAt: "2026-09-28" as const,
  prepared: true as const,
  authorizedToFlip: true as const,
  publicCatalogSwitched: true as const,
  doNotSwitchPublicSurfacesYet: false as const,
  flippedAt: "2026-09-28" as const,
  prerequisite:
    "STUDIO-349-SHORT-FORM-CONTENT-PACK-OWNER-UNUSUAL-CERT-1 OWNER_CERTIFIED_WITH_EXPLICIT_LIMITS" as const,
  livePublicName: "Short-Form Content Pack" as const,
  preparedPublicName: "Short-Form Content Pack" as const,
  publicPriceCentsUnchanged: 34900 as const,
  clipPriceCentsUnchanged: 54900 as const,
  coordinates: [
    "productCardOrLearnMore",
    "checkoutIntake",
    "helpCenter",
  ] as const,
  doNotPublishClipPrice: true as const,
  doNotPublishUnresolvedClipIo: true as const,
  boundary: {
    pack349:
      "You point to each moment. Mark each clip, or mark a source segment of 45 seconds or less. The Studio may look around that mark, up to 4 minutes total surrounding your mark, only to make the edit clean.",
    clipBoundary:
      "If you want The Studio to search a longer recording and find the moments for you, that is Clip Repurposing.",
    customerMarkedSegmentMaxSeconds: 45 as const,
    surroundingReviewMaxSeconds: 240 as const,
    surroundingReviewMeansTotalWindow: true as const,
  } as const,
  noUnsupportedClaimsOrGuarantees: true as const,
  doNotBuildClip: true as const,
  doNotChangeMenuHierarchy: true as const,
  doNotStartAdCreative: true as const,
  doNotStartAiLocalVisibility: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  switchPayload: studioShortFormContentPackPublicSwitchV1,
  stampDir:
    "docs/launch/studio-349-short-form-content-pack-public-switch-1" as const,
} as const;
