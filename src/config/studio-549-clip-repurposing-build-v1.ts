/**
 * STUDIO-$549-CLIP-REPURPOSING-BUILD-1
 * Factory build against OWNER-FROZEN Clip I/O. Does not publish. Does not change the public catalog.
 * Authority: studio-549-clip-repurposing-io-freeze-v1. Historical 3-clip factory remains historical.
 *
 * 2026-09-29 Owner: VIDEO QUALITY lane is OWNER CERTIFIED WITH EXPLICIT LIMITS.
 * The broader PRODUCT VALUE / DELIVERY PACKAGE remains open. Do not start it from this stamp.
 */

export const STUDIO_549_CLIP_REPURPOSING_BUILD_PACKAGE_ID =
  "STUDIO-$549-CLIP-REPURPOSING-BUILD-1" as const;

export const STUDIO_549_CLIP_VIDEO_QUALITY_ACCEPTED_IDS = [
  "c-56-423",
  "c-17-127",
  "c-82-641",
  "c-97-723",
  "c-50-377",
] as const;

export const studio549ClipRepurposingBuildV1 = {
  packageId: STUDIO_549_CLIP_REPURPOSING_BUILD_PACKAGE_ID,
  preparedAt: "2026-09-28" as const,
  authorizedAt: "2026-09-29" as const,
  videoQualityOwnerClosedAt: "2026-09-29" as const,
  prepared: true as const,
  started: true as const,
  authorizedToStart: true as const,
  ioAuthority: "STUDIO-$549-CLIP-REPURPOSING-IO-FREEZE-1" as const,
  ioStatus: "OWNER_FROZEN" as const,
  publicPriceCents: 54900 as const,
  customerFacingName: "Clip Repurposing" as const,
  skuId: "v2-rtu-clip-repurposing" as const,
  hitchhikesFinishingLane: "v2-rtu-short-form-video-edit" as const,
  doNotCreateSecondFinishingFactory: true as const,
  doNotPublish: true as const,
  doNotChangePublicCatalog: true as const,
  doNotStartMenuCleanup: true as const,
  doNotStartAdCreative: true as const,
  doNotStartAiLocalVisibility: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  historicalOperatingBuildRemainsHistorical: true as const,
  laneCertified: "VIDEO_QUALITY" as const,
  ownerResult: "VIDEO_QUALITY_PASS" as const,
  classification: "VIDEO_QUALITY_OWNER_CERTIFIED_WITH_EXPLICIT_LIMITS" as const,
  videoQualityClassification: "OWNER_CERTIFIED_WITH_EXPLICIT_LIMITS" as const,
  videoQualitySectionClosed: true as const,
  readyForOwnerUnusualCertification: false as const,
  provenAt: "2026-09-29" as const,
  published: false as const,
  publicCatalogChanged: false as const,
  livePaidFiveClipRender: false as const,
  acceptedClipIds: STUDIO_549_CLIP_VIDEO_QUALITY_ACCEPTED_IDS,
  openingsStable: true as const,
  noAutomaticZoomTreatment: true as const,
  punchInOnlyWhenIntentionallyChosen: true as const,
  clip5ReplacementAccepted: true as const,
  clip3EndingCueAcceptedAsRendered: true as const,
  customerDeliveryQualityAccepted: true as const,
  productValueDeliveryPackage: {
    status: "STARTED" as const,
    packageId: "STUDIO-$549-CLIP-REPURPOSING-VALUE-DELIVERY-1" as const,
    authorizedToStart: true as const,
    doNotStartTonight: false as const,
    pendingLater: [
      "owner_value_certification",
    ] as const,
  },
  doNotAlterFactoryUnlessRegression: true as const,
  mustProve: [
    "2_minute_and_60_minute_discovery",
    "0_1_2_first_source_shortfall_and_one_replacement_path",
    "hard_2_business_day_replacement_window",
    "3_4_5_fulfillment_at_549",
    "more_than_5_select_strongest_distinct",
    "anti_cannibalization",
    "shared_349_finishing_lane",
    "worst_case_five_clip_economics",
    "heavy_capacity_priority_without_idle_slot",
    "rendered_mp4_quality_and_2_loop_correction",
  ] as const,
  stampDir: "docs/launch/studio-549-clip-repurposing-build-1" as const,
  videoQualityCloseout:
    "docs/launch/studio-549-clip-repurposing-build-1/VIDEO-QUALITY-OWNER-CERT-CLOSEOUT.md" as const,
} as const;
