/**
 * STUDIO-$549-CLIP-REPURPOSING-VALUE-DELIVERY-1
 * Customer-visible value layer around Owner-certified Clip video.
 * Does not reopen video engineering. Does not publish. Does not change the catalog.
 */

import { STUDIO_549_CLIP_VIDEO_QUALITY_ACCEPTED_IDS } from "@/config/studio-549-clip-repurposing-build-v1";

export const STUDIO_549_CLIP_REPURPOSING_VALUE_DELIVERY_PACKAGE_ID =
  "STUDIO-$549-CLIP-REPURPOSING-VALUE-DELIVERY-1" as const;

export const CLIP_549_VALUE_FORBIDDEN_SERVICES = [
  "ad_creative",
  "ai_local_visibility",
] as const;

export const CLIP_549_VALUE_PATHWAY_SKUS = [
  "v2-rtu-short-form-video-edit",
  "v2-rtu-social-posts",
  "v2-rtu-promotion-graphics",
  "v2-rtu-email-kit",
  "v2-rtu-sms-kit",
] as const;

export const studio549ClipRepurposingValueDeliveryV1 = {
  packageId: STUDIO_549_CLIP_REPURPOSING_VALUE_DELIVERY_PACKAGE_ID,
  authorizedAt: "2026-09-30" as const,
  prepared: true as const,
  started: true as const,
  authorizedToStart: true as const,
  videoQualityAuthority: "STUDIO-$549-CLIP-REPURPOSING-BUILD-1" as const,
  videoQualityClassification: "OWNER_CERTIFIED_WITH_EXPLICIT_LIMITS" as const,
  doNotReopenVideoEngineeringUnlessRegression: true as const,
  ioAuthority: "STUDIO-$549-CLIP-REPURPOSING-IO-FREEZE-1" as const,
  skuId: "v2-rtu-clip-repurposing" as const,
  customerFacingName: "Clip Repurposing" as const,
  publicPriceCents: 54900 as const,
  minDelivered: 3 as const,
  maxDelivered: 5 as const,
  extrasScaleToDeliveredCount: true as const,
  doNotPromiseFiveWhenFewerQualify: true as const,
  perDeliveredShort: [
    "matching_post_caption",
    "suggested_title_hook",
    "suggested_hashtag_keyword_set",
  ] as const,
  setLevelCompanion: true as const,
  designedCoverGraphics: false as const,
  studioWideUnboxingArchitecture: false as const,
  strategyConsulting: false as const,
  performancePromisesForbidden: true as const,
  pathwayEducationalOnly: true as const,
  pathwaySkus: CLIP_549_VALUE_PATHWAY_SKUS,
  forbiddenAvailableNowOffers: CLIP_549_VALUE_FORBIDDEN_SERVICES,
  doNotPublish: true as const,
  doNotChangePublicCatalog: true as const,
  doNotStartMenuCleanup: true as const,
  doNotStartAdCreative: true as const,
  doNotStartAiLocalVisibility: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  published: false as const,
  publicCatalogChanged: false as const,
  ownerResult: "CONTENT_ACCEPTED_PRESENTATION_REJECTED" as const,
  classification: "CONTENT_ACCEPTED_PRESENTATION_REJECTED" as const,
  contentAcceptedInPrinciple: true as const,
  presentationAccepted: false as const,
  currentPageIs: "content_structure_and_information_architecture_proof" as const,
  doNotTreatTanPageAsFinalExperience: true as const,
  doNotPolishTanPage: true as const,
  doNotDiscardContentPackageLogic: true as const,
  nextPresentationPackage: "STUDIO-FINAL-DELIVERY-ROOM-1" as const,
  finalDeliveryRoomAuthorizedToStart: true as const,
  acceptedClipIds: STUDIO_549_CLIP_VIDEO_QUALITY_ACCEPTED_IDS,
  stampDir: "docs/launch/studio-549-clip-repurposing-value-delivery-1" as const,
  customerPackageDir:
    "docs/launch/studio-549-clip-repurposing-value-delivery-1/customer-package" as const,
  ownerDesktopFolderName: "clip-repurposing-value-delivery" as const,
} as const;
