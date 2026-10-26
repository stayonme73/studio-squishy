/**
 * $349 Short-Form Content Pack factory.
 * Does not flip the public one-video promise. Does not start Clip.
 */

export const STUDIO_SHORT_FORM_CONTENT_PACK_FACTORY_PACKAGE_ID =
  "STUDIO-SHORT-FORM-CONTENT-PACK-FACTORY-1" as const;

export const studioShortFormContentPackFactoryV1 = {
  packageId: STUDIO_SHORT_FORM_CONTENT_PACK_FACTORY_PACKAGE_ID,
  authorizedAt: "2026-09-27" as const,
  skuId: "v2-rtu-short-form-video-edit" as const,
  customerFacingName: "Short-Form Content Pack" as const,
  publicPriceCentsUnchanged: 34900 as const,
  maxClips: 3 as const,
  minClips: 1 as const,
  identifiedSegmentMaxSeconds: 45 as const,
  outputMinSeconds: 15 as const,
  outputMaxSeconds: 30 as const,
  includedSetRevisions: 1 as const,
  customerIdentifiesClips: true as const,
  studioDoesNotSearchLongRecordings: true as const,
  longRecordingSearchBelongsToClip: true as const,
  discovery: {
    customerMustIdentifyEachClipOrMarkSegment: true as const,
    surroundingReviewMaxSeconds: 240 as const,
    preferredLookbackSeconds: 20 as const,
    preferredLookaheadSeconds: 20 as const,
    onlyToFindCleanOpening: true as const,
    onlyToFindCompleteEnding: true as const,
    onlyToPreserveIntendedThought: true as const,
    onlyToAvoidAwkwardSentenceCuts: true as const,
    notLongFormContentDiscovery: true as const,
    doNotSearchEntireRecording: true as const,
    doNotHuntBestMoments: true as const,
    doNotRankCandidateClips: true as const,
    doNotExtractFromUnmarkedLongForm: true as const,
    deeperDiscoveryBelongsToClip: true as const,
  },
  publicCatalogSwitched: false as const,
  doNotPublishPromiseFromThisStamp: true as const,
  doNotStartClip: true as const,
  doNotChangeMenuHierarchy: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  publicHttpsTunnel: "down" as const,
  factoryReviewLoop: {
    qualityInspectsRenderedMp4: true as const,
    scoutIsNotRoutineEditor: true as const,
    ownerIsNotFirstLineQa: true as const,
    maxInternalCorrectionLoops: 2 as const,
    brollIsOptional: true as const,
  },
  standaloneShortQa: {
    beginOnCleanThought: true as const,
    endOnCompleteThought: true as const,
    synchronizeStoryBrollToSpokenIdea: true as const,
    brollFollowsCompleteSemanticThought: true as const,
    doNotTriggerBrollOnlyOnKeyword: true as const,
    doNotRemoveBrollBeforeThoughtFinishes: true as const,
    doNotLeaveBrollIntoNextThought: true as const,
    maxCompletionPadSeconds: 8 as const,
  },
  endingAudio: {
    endCueIsOptional: true as const,
    doNotStampSameCueOnEveryShort: true as const,
    decideFromFinishedAudioEnding: true as const,
    brollDoesNotDecideCue: true as const,
    fadeOnlyWhenMusicLands: true as const,
    fadePlusSubtleCueWhenEndingEmpty: true as const,
    emptyFadeMeanDb: -54 as const,
    subtleCueMixDb: -3 as const,
    subtleCueAfterSpeechSeconds: 0.4 as const,
    subtleCueDurationSeconds: 0.15 as const,
    subtleCueFromSameBed: false as const,
    subtleCueUsesDedicatedSting: true as const,
    stingRel:
      "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/music/pack-end-sting-eleven.mp3" as const,
    stingPrompt:
      "Original short instrumental sting for the last beat of a social-video reel. Upbeat, quick, playful but adult, bright, modern, satisfying punctuation. Soft clap plus bright keys bounce. No vocals, no lyrics, no recognizable melody, no trending song, no trailer drums, no EDM drop, no choir, no sentimental piano, no cartoon, no corporate jingle. One tight hit, then done." as const,
  },
  visual: {
    captionBackground: "transparent" as const,
    captionStroke: "#1A1714" as const,
    ctaFill: "#2E2B28" as const,
    ctaBackground: "#C8B59B" as const,
  },
  stampDir:
    "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack" as const,
} as const;
