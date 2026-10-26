/**
 * $349 Short-Form Content Pack — factory review loop.
 * Quality watches the rendered MP4. Machine routes. Production corrects.
 * Scout is not the routine editor. Owner is not first-line QA.
 */

export const STUDIO_SHORT_FORM_CONTENT_PACK_FACTORY_REVIEW_LOOP_ID =
  "STUDIO-SHORT-FORM-CONTENT-PACK-FACTORY-REVIEW-LOOP-1" as const;

export const studioShortFormContentPackFactoryReviewLoopV1 = {
  packageId: STUDIO_SHORT_FORM_CONTENT_PACK_FACTORY_REVIEW_LOOP_ID,
  authorizedAt: "2026-09-27" as const,
  skuId: "v2-rtu-short-form-video-edit" as const,
  publicPriceCentsUnchanged: 34900 as const,
  publicCatalogSwitched: false as const,
  doNotPublishPromiseFromThisStamp: true as const,
  doNotStartClip: true as const,
  doNotChangeMenuHierarchy: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,

  roles: {
    machineRoutes: true as const,
    videoProductionCorrects: true as const,
    qualityInspectsRenderedMp4: true as const,
    scoutIsFactoryEngineer: true as const,
    scoutIsNotRoutineEditor: true as const,
    scoutIsNotRoutineQuality: true as const,
    ownerIsNotFirstLineQa: true as const,
  },

  qualityMustInspect: ["rendered_mp4"] as const,
  qualityDoesNotAcceptAlone: [
    "transcript_timestamps",
    "unit_tests",
    "frame_captures_without_mp4",
    "audio_meters_without_mp4",
    "configuration_values",
  ] as const,

  rules: {
    completeThoughts: true as const,
    brollIsOptional: true as const,
    doNotInsertBrollForKeywordAlone: true as const,
    brollMustImproveViewing: true as const,
    brollSemanticAlignment: true as const,
    brollPresentationReviewed: true as const,
    doNotEnforceOneBrollTreatment: true as const,
    musicReviewed: true as const,
    brollVisualMatchFromPixels: true as const,
    preferOmitOverWeakBroll: true as const,
    musicToneFitReviewed: true as const,
    endingReviewed: true as const,
    captionsReviewed: true as const,
  },

  allowedBrollTreatments: [
    "none",
    "stable_pip",
    "short_fullframe",
  ] as const,

  maxInternalCorrectionLoops: 2 as const,
  doNotRouteOrdinaryCorrectionsToOwner: true as const,
  doNotHaveScoutPickTimestamps: true as const,

  escalateToOwnerOnlyFor: [
    "subjective_brand_direction_ambiguity",
    "conflicting_acceptable_creative_choices",
    "exhausted_revision",
    "rights_ambiguity",
    "unusual_customer_exception",
    "factory_cannot_resolve_after_allowed_loop",
  ] as const,

  scoutIntervenesOnlyWhen: [
    "machine_cannot_express_correction",
    "production_lacks_capability",
    "quality_cannot_detect_defect_class",
    "routing_broken",
    "engineering_defect",
  ] as const,

  fixtureClips: [
    {
      id: "clip-01-intro",
      sourceRelativePath:
        "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack/delivery/clip-01-intro.mp4",
      ownerFindingClasses: [
        "end_not_complete_thought",
        "trailing_fragment",
      ],
    },
    {
      id: "clip-02-cherries",
      sourceRelativePath:
        "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack/delivery/clip-02-cherries.mp4",
      ownerFindingClasses: [
        "end_not_complete_thought",
        "trailing_fragment",
        "broll_not_aligned_to_thought",
        "broll_left_before_thought_finished",
      ],
    },
    {
      id: "clip-03-learned",
      sourceRelativePath:
        "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack/delivery/clip-03-learned.mp4",
      ownerFindingClasses: [
        "broll_left_before_thought_finished",
        "broll_keyword_only",
      ],
    },
  ],

  stampDir:
    "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack" as const,
} as const;
