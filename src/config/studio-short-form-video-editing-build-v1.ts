/**
 * BUILD #1 — Short-Form Video Editing.
 *
 * New SKU / footage lane. Not the frozen $149 stills Short Video.
 * Internally SELL NOW for the certified talking-head lane.
 * Public Launch Now menu stays unpublished until Tagia authorizes publish.
 */

export const STUDIO_SHORT_FORM_VIDEO_EDITING_BUILD_PACKAGE_ID =
  "STUDIO-OPERATING-SHORT-FORM-VIDEO-EDITING-BUILD-1" as const;

export const SHORT_FORM_VIDEO_EDITING_SKU =
  "v2-rtu-short-form-video-edit" as const;

export const SHORT_VIDEO_STILLS_SKU_DO_NOT_REUSE =
  "v2-rtu-short-video" as const;

export const studioShortFormVideoEditingBuildV1 = {
  packageId: STUDIO_SHORT_FORM_VIDEO_EDITING_BUILD_PACKAGE_ID,
  schemaVersion: 1 as const,
  phase: 2 as const,
  phase1Accepted: true as const,
  owner: "Tagia",
  authorizedAt: "2026-09-24" as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotRemintMaya: true as const,
  ownerConsoleParked: true as const,
  doNotTouchFrozenSellNow: true as const,
  doNotStartClipRepurposing: true as const,
  doNotStartCinematic: true as const,
  onLaunchMenu: true as const,
  publicMenuPublished: true as const,
  classification: "SELL_NOW" as const,
  certifiedAt: "2026-09-25" as const,
  certifiedBy: "Checkpoint 11 + certification freeze" as const,

  sku: {
    id: SHORT_FORM_VIDEO_EDITING_SKU,
    customerFacingName: "Short-Form Video Editing",
    priceCents: 34900,
    notTheStillsSku: SHORT_VIDEO_STILLS_SKU_DO_NOT_REUSE,
  },

  offer: {
    maxSourceSeconds: 180,
    outputMinSeconds: 15,
    outputMaxSeconds: 30,
    width: 1080,
    height: 1920,
    files: ["mp4"] as const,
    sourceExtensions: ["mp4", "mov"] as const,
    language: "en" as const,
    firstCertAspect: "vertical" as const,
    oneFile: true as const,
    captionsPreserveSpokenWords: true as const,
    ctaCustomerSupplied: true as const,
    customerPosts: true as const,
    includedRevisions: 1 as const,
    ownerDoesNotEdit: true as const,
  },

  certifiedScope: {
    source: "one_customer_owned_rights_cleared_native_vertical_english_talking_head" as const,
    studioFindsStrongestIdea: true as const,
    performanceAwareEditorial: true as const,
    finishedVerticalShort: true as const,
    speechCaptionsBurnedLocally: true as const,
    audioFinish: true as const,
    customerApprovedCtaEndCard: true as const,
    deliverable: "1080x1920_mp4" as const,
    includedMeaningfulRevision: 1 as const,
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
    "multiple_finished_versions",
    "clip_repurposing",
    "cinematic_or_video_generation",
  ] as const,

  factory: {
    machineOwnsEdl: true as const,
    videoProductionRenders: true as const,
    qualityWatchesWithSound: true as const,
    shotstackPromptForbidden: true as const,
    noGeneratedFootage: true as const,
    noStudioMusic: true as const,
    noHiddenStudioAssets: true as const,
    capCutClosed: true as const,
    firstCertRequiresNativeVertical: true as const,
    noLandscapeFaceFollow: true as const,
    sentenceIndexSelectOnly: true as const,
    noSpeechRewrite: true as const,
    multiSegmentEdit: true as const,
    multiSegmentIsNotEdited: true as const,
    storyRoleOrdering: true as const,
    ideaFirstPass: true as const,
    doNotIterateTranscriptSelector: true as const,
    performanceAwareBrain: "minimum_wired" as const,
    finishingPassOnly: true as const,
    doNotReplaceClaude: true as const,
    shotstackTypesetForbidden: true as const,
    localTextBurnIn: true as const,
    exactTextQaFailClose: true as const,
    deterministicIsFallbackNotCeiling: true as const,
    factoryPath: [
      "intake_rights",
      "deepgram_nova3_mip_opt_out",
      "idea_first_transcript_reasoning",
      "performance_aware_multimodal_review",
      "ordered_edl",
      "ffmpeg_audio_finish_remux",
      "local_sharp_ffmpeg_typography",
      "exact_text_qa",
      "shotstack_production_video_composite",
      "quality_watch_with_sound",
      "review",
      "one_included_revision",
      "final_delivery",
    ] as const,
  },

  frozenCherriesEditorial: {
    centralIdea: "favorite English word is cherries" as const,
    openingSourceSeconds: 83.505 as const,
    spokenExitSourceSeconds: 100.665 as const,
    holdExitSourceSeconds: 102.2 as const,
    leftoverStartsSourceSeconds: 102.745 as const,
    preserveCherriesPause: true as const,
    excludeLeftoverGoodbye: true as const,
  },

  finishing: {
    captionWordGap: "\u2002 " as const,
    ctaAfterPerformance: true as const,
    ctaHoldSeconds: 2.5 as const,
    noCaptionFade: true as const,
    noVideoFadeOverPerformance: true as const,
  },

  audioFinish: {
    method: "ffmpeg_loudnorm_ebu_r128_two_pass" as const,
    handoff: "ffmpeg_reencode_video_plus_loudnorm_aac" as const,
    targetIntegratedLufs: -14 as const,
    truePeakDbfs: -1.5 as const,
    loudnessRangeLu: 11 as const,
    sampleRateHz: 48000 as const,
    channels: 2 as const,
    audioBitrate: "192k" as const,
    doNotClaimDenoise: true as const,
    reusable: true as const,
  },

  captions: {
    family: "Open Sans",
    color: "#ffffff",
    stroke: "#111111",
    strokeWidth: 2,
    lineHeight: 1.2,
    wrap: true,
    scrimColor: "#111111",
    scrimOpacity: 0.78,
    scrimPadding: 20,
    scrimRadius: 12,
    speechWidth: 980,
    speechHeight: 240,
    ctaBackground: "#1F4A44",
    ctaOpacity: 1,
    ctaWidth: 980,
    ctaHeight: 180,
  },

  shotstack: {
    stageWatermarks: true as const,
    productionRemovesWatermark: true as const,
    productionEnv: "v1" as const,
    productionKeyEnv: "SHOTSTACK_PRODUCTION_API_KEY" as const,
    doNotSellWithWatermark: true as const,
  },

  deepgram: {
    provider: "deepgram" as const,
    model: "nova-3" as const,
    endpoint: "https://api.deepgram.com/v1/listen" as const,
    mode: "batch_prerecorded" as const,
    language: "en" as const,
    smartFormat: true as const,
    punctuate: true as const,
    utterances: true as const,
    mipOptOutRequired: true as const,
    mipOptOutQuery: "mip_opt_out=true" as const,
    termsCheckedAt: "2026-09-24" as const,
    termsSource:
      "https://developers.deepgram.com/docs/the-deepgram-model-improvement-partnership-program" as const,
    tosSource: "https://deepgram.com/terms" as const,
    wordTimestamps: "native_words_start_end" as const,
    listRateUsdPerMinute: 0.0043,
    optOutMayForgoMipDiscount: true as const,
    privacyBeatsDiscount: true as const,
    envKey: "DEEPGRAM_API_KEY" as const,
  },
  sourceAudioPreflightHardening: {
    packageId: "STUDIO-OPERATING-SOURCE-AUDIO-PREFLIGHT-AND-LIGHT-CLEANUP-1",
    addedAt: "2026-09-25",
    gateBeforePaidProduction: true,
    complimentaryLightCleanupMaxPasses: 2,
    priorCertificationNotSilentlyRecertified: true,
    doNotReopenCertifiedFactory: true,
    doNotDefineRefundPolicy: true,
  },
  endCueFinishing: {
    packageId: "STUDIO-OPERATING-TALKING-HEAD-END-CUE-1",
    addedAt: "2026-09-26",
    finishingEnhancementOnly: true,
    family: ["soft_snap", "airy_whoosh", "soft_pop_tick"] as const,
    priorCertificationNotSilentlyRecertified: true,
    doNotReopenEditorialOrShotstack: true,
    doNotApplyToStillsVideo: true,
  },
} as const;

export function isShortFormVideoEditingSku(
  skuId: string | null | undefined,
): boolean {
  return skuId === SHORT_FORM_VIDEO_EDITING_SKU;
}

export function isFrozenStillsShortVideoSku(
  skuId: string | null | undefined,
): boolean {
  return skuId === SHORT_VIDEO_STILLS_SKU_DO_NOT_REUSE;
}
