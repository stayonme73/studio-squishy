/**
 * Standard end-cue finishing for talking-head video lanes.
 * Finishing enhancement only. Does not reopen editorial, ranking, or $149 stills.
 */

export const STUDIO_TALKING_HEAD_END_CUE_PACKAGE_ID =
  "STUDIO-OPERATING-TALKING-HEAD-END-CUE-1" as const;

export const TALKING_HEAD_END_CUE_IDS = [
  "soft_snap",
  "airy_whoosh",
  "soft_pop_tick",
] as const;

export type TalkingHeadEndCueId = (typeof TALKING_HEAD_END_CUE_IDS)[number];

export const studioTalkingHeadEndCueV1 = {
  packageId: STUDIO_TALKING_HEAD_END_CUE_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-26" as const,
  appliesTo: [
    "v2-rtu-short-form-video-edit",
    "v2-rtu-clip-repurposing",
  ] as const,
  doNotApplyToStillsVideo: true as const,
  doNotPublishCountChange: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  finishingEnhancementOnly: true as const,
  noMusicBed: true as const,
  noMemeOrComedyEffects: true as const,
  noCustomerVisibleRandomness: true as const,
  family: {
    soft_snap: {
      id: "soft_snap" as const,
      feel: "crisp_tiny_clean",
      maxSeconds: 0.1,
    },
    airy_whoosh: {
      id: "airy_whoosh" as const,
      feel: "very_short_smooth_modern",
      maxSeconds: 0.16,
    },
    soft_pop_tick: {
      id: "soft_pop_tick" as const,
      feel: "minimal_slightly_punchier",
      maxSeconds: 0.08,
    },
  },
  mix: {
    alignWithVisualEndCard: true as const,
    underLastSpeechMs: 70,
    cueMixDb: -18,
    underSpeechMixDb: -20,
    peakMustStayBelowSpeech: true as const,
  },
} as const;
