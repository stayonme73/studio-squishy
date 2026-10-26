/**
 * Clip Repurposing — certified unpublished SELL NOW.
 * Hitchhikes the frozen $349 Short-Form Video Editing factory.
 * Do not rebuild per-clip machinery. Do not publish. Do not wire Launch Now.
 */

import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";

export const STUDIO_CLIP_REPURPOSING_BUILD_PACKAGE_ID =
  "STUDIO-OPERATING-CLIP-REPURPOSING-BUILD-1" as const;

export const CLIP_REPURPOSING_SKU = "v2-rtu-clip-repurposing" as const;

export const studioClipRepurposingBuildV1 = {
  packageId: STUDIO_CLIP_REPURPOSING_BUILD_PACKAGE_ID,
  schemaVersion: 1 as const,
  phase: 2 as const,
  phaseKind: "set_level_factory_build" as const,
  owner: "Tagia",
  authorizedAt: "2026-09-25" as const,
  certifiedAt: "2026-09-25" as const,
  certifiedBy: "Owner Samsung caption-baseline accept + certification freeze" as const,
  phase1Verdict: "BUILD" as const,
  doNotImplementPhase2: false as const,
  doNotStartPhase3FromThisStamp: true as const,
  doNotPublish: false as const,
  doNotWireLaunchNow: false as const,
  doNotRunPaidProduction: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotRemintMaya: true as const,
  ownerConsoleParked: true as const,
  doNotTouchFrozenSellNow: true as const,
  doNotModifyCertifiedShortFormEditing: true as const,
  hitchhikesSku: SHORT_FORM_VIDEO_EDITING_SKU,
  onLaunchMenu: true as const,
  publicMenuPublished: true as const,
  classification: "SELL_NOW" as const,
  verdict: "SELL_NOW" as const,
  doNotPurchaseVendor: true as const,

  sku: {
    id: CLIP_REPURPOSING_SKU,
    customerFacingName: "Clip Repurposing",
    priceCents: 54900,
    priceFrozen: true as const,
    priceNotFrozen: false as const,
    recommendedPriceCents: 54900,
  },

  proposedOffer: {
    sourceCount: 1 as const,
    finishedClipCount: 3 as const,
    minSourceSeconds: 15 * 60,
    maxSourceSeconds: 60 * 60,
    outputMinSeconds: 15,
    outputMaxSeconds: 30,
    width: 1080,
    height: 1920,
    files: ["mp4"] as const,
    sourceExtensions: ["mp4", "mov"] as const,
    language: "en" as const,
    firstCertAspect: "native_vertical" as const,
    nativeVerticalMandatory: true as const,
    landscapeBelongsOutsideFirstLane: true as const,
    customerPosts: true as const,
    includedSetRevisions: 1 as const,
    ownerDoesNotWatchTheHour: true as const,
  },

  certifiedScope: {
    source:
      "one_customer_owned_rights_cleared_native_vertical_english_talking_head" as const,
    minSourceMinutes: 15 as const,
    maxSourceMinutes: 60 as const,
    studioFindsThreeDistinctShorts: true as const,
    performanceAwareEditorialPerClip: true as const,
    finishedVerticalShorts: 3 as const,
    speechCaptionsBurnedLocally: true as const,
    sharedCaptionBaseline: true as const,
    audioFinish: true as const,
    customerApprovedSharedCtaEndCard: true as const,
    deliverable: "three_1080x1920_mp4" as const,
    includedSetRevision: 1 as const,
    customerPosts: true as const,
    noCapCutRequired: true as const,
  },

  notInThisService: [
    "landscape_to_vertical_intelligent_reframe",
    "multi_camera_editing",
    "b_roll_sourcing",
    "stock_footage",
    "ai_generated_footage",
    "music_selection_or_licensing",
    "narration",
    "noise_restoration_or_advanced_audio_repair",
    "non_english_editing",
    "studio_posting",
    "additional_aspect_ratios",
    "monthly_clipping_retainer",
    "three_independent_349_jobs",
    "transcript_chunking",
    "cinematic_or_video_generation",
  ] as const,

  reuseUnchangedFromShortFormEditing: [
    "intake_rights",
    "deepgram_nova3_mip_opt_out",
    "transcript_timestamps",
    "idea_first_reasoning_per_window",
    "performance_aware_multimodal_review_per_window",
    "edl_construction",
    "ffmpeg_audio_finish_remux",
    "local_sharp_ffmpeg_typography",
    "exact_text_qa",
    "shotstack_production_video_composite",
    "quality_watch_with_sound",
    "review",
    "revision_spine",
    "final_delivery",
  ] as const,

  newCapabilityRequired: [
    "long_source_ingest_and_segmentation",
    "whole_recording_candidate_topic_discovery",
    "short_form_value_ranking_across_candidates",
    "anti_cannibalization_distinctness",
    "per_topic_performance_watch",
    "complete_beginning_and_ending_per_clip",
    "set_coherence_qa",
    "fail_close_when_fewer_than_three_sellable_clips",
  ] as const,

  failClose: {
    fewerThanThreeDistinctSellableClips: "do_not_manufacture_filler" as const,
    doNotBeginProductionForFakeThird: true as const,
    detectCounts: [0, 1, 2, "3+"] as const,
    customerRemediesFrozen: true as const,
    customerRemediesNotFrozen: false as const,
    customerRemedies: {
      0: "cannot_complete_as_sold" as const,
      1: "convert_to_frozen_349_short_form_video_editing" as const,
      2: "two_clip_outcome_at_449" as const,
      "3+": "fulfill_clip_repurposing_at_549" as const,
    },
    customerRemedyPriceCents: {
      1: 34900,
      2: 44900,
      "3+": 54900,
    },
    customerChoiceCandidates: [
      "cannot_complete_three_clip_service_as_sold",
      "convert_strongest_to_certified_349_short_form_editing",
      "offer_two_clip_outcome_at_449",
    ] as const,
  },

  revision: {
    model: "one_set_revision" as const,
    included: 1 as const,
    frozen: true as const,
    notPerClipRedesignDesk: true as const,
    notThreeIndependentAllowances: true as const,
    supported: [
      "replace_one_selected_with_ranked_alternate",
      "approved_cta_change",
      "end_card_hold_adjustment",
    ] as const,
  },

  setQuestion:
    "If the customer posted these three clips separately, would each feel like a distinct piece worth publishing?" as const,

  economics: {
    frozen: true as const,
    priceUsd: 549 as const,
    priorPriceUsd: 599 as const,
    twoClipOutcomeUsd: 449 as const,
    oneClipConvertsUsd: 349 as const,
    deepgramUsdList: 0.0847,
    performanceReviewUsd: 0.0624,
    shotstackFulfillmentRenders: 4 as const,
    shotstackReportedCredits: 1.19,
    shotstackUnreportedRenders: 1 as const,
    captionBaselineProofCredits: 0.46,
    toolCostDoesNotSetPrice: true as const,
  },

  launchNowDependencies: [
    "public_menu_publish_authorization",
    "live_catalog_launch_now_offer_wiring",
    "long_source_intake_and_rights",
    "paid_dispatch_observer_for_set_lane",
    "three_file_final_delivery",
    "set_revision_desk",
    "under_three_customer_remedy_surface",
  ] as const,

  liveGates: {
    requirePositive15to40MinuteSource: true as const,
    requireNegativeFewerThanThreeSource: true as const,
    doNotPayRenderBeforeSetQa: true as const,
    setLogicCheckpointAt: "2026-09-25" as const,
    authorizedAt: "2026-09-25" as const,
    pendingUntilAuthorizedSourcesExist: false as const,
    doNotStartLiveGatesFromThisStamp: false as const,
    sourcesMissing: false as const,
    sourcesDesignatedByOwner: true as const,
    liveCertificationRanAt: "2026-09-25" as const,
    positiveYieldedThree: true as const,
    negativeRefusedFakeThird: true as const,
    paidProduction: true as const,
    exactGap: "none" as const,
    captionBaselineAcceptedByOwner: true as const,
    captionBaselineAcceptedAt: "2026-09-25" as const,
    semanticRankingCheckpointAt: "2026-09-25" as const,
    positiveSemanticYieldedThree: true as const,
    readyForResumedPositiveLiveCertification: false as const,
    positiveLiveCertificationAt: "2026-09-25" as const,
    setRevisionRan: true as const,
    doNotResumeProductionFromThisStamp: true as const,
    doNotUsePhoneCameraRollWithoutDesignation: true as const,
    doNotStretchShortFormCherriesSource: true as const,
    doNotFabricateFixturesAsLive: true as const,
    positiveSourceMustHaveCompetingMaterial: true as const,
  },

  priceCorrection: {
    packageId: "STUDIO-OPERATING-CLIP-REPURPOSING-PRICE-CORRECTION-1",
    correctedAt: "2026-09-25",
    priorFullPackageCents: 59900,
    priorTwoClipCents: 49900,
    scopeUnchanged: true as const,
  },

  sourceAudioPreflightHardening: {
    packageId: "STUDIO-OPERATING-SOURCE-AUDIO-PREFLIGHT-AND-LIGHT-CLEANUP-1",
    addedAt: "2026-09-25",
    gateBeforePaidProduction: true,
    complimentaryLightCleanupMaxPasses: 2,
    priorCertificationNotSilentlyRecertified: true,
    doNotReopenCertifiedFactory: true,
    doNotReopenClipSetLogic: true as const,
    doNotDefineRefundPolicy: true,
  },
  endCueFinishing: {
    packageId: "STUDIO-OPERATING-TALKING-HEAD-END-CUE-1",
    addedAt: "2026-09-26",
    hitchhikesSharedCaptionBurn: true,
    finishingEnhancementOnly: true,
    family: ["soft_snap", "airy_whoosh", "soft_pop_tick"] as const,
    priorCertificationNotSilentlyRecertified: true,
    doNotReopenSetLogic: true,
  },
} as const;

export function isClipRepurposingSku(skuId: string | null | undefined): boolean {
  return skuId === CLIP_REPURPOSING_SKU;
}
