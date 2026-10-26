/**
 * STUDIO-$549-CLIP-REPURPOSING-IO-FREEZE-1
 * Scope / contract only. Does not build Clip. Does not publish.
 * Supersedes historical 3-clip Shotstack Clip I/O for any future $549 factory work.
 */

import {
  assertProductInputOutputContract,
  type ProductInputOutputContract,
} from "@/config/studio-product-input-output-contract-v1";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";

export const STUDIO_549_CLIP_REPURPOSING_IO_FREEZE_PACKAGE_ID =
  "STUDIO-$549-CLIP-REPURPOSING-IO-FREEZE-1" as const;

const SURFACES = {
  productCardShort: true as const,
  checkoutIntakeBeforePayment: true as const,
  helpCenterFull: true as const,
};

export const clipRepurposingIoFreezeContractV1: ProductInputOutputContract = {
  skuId: CLIP_REPURPOSING_SKU,
  customerFacingName: "Clip Repurposing",
  priceCents: 54900,
  youProvide: [
    "One eligible recording The Studio is asked to search: 2–60 minutes, native vertical, English talking-head, one primary speaker on camera, speech intelligible enough to follow, in MP4 or MOV.",
    "Rights and likeness clearance for everyone who appears.",
    "Exact CTA wording. The Studio will not invent a marketing line.",
    "Optional goal, intended audience, and keep / cut notes through the Creative-Direction Contract.",
  ],
  studioDelivers: [
    "The Studio searches that one recording, ranks standalone moments, and selects the strongest distinct clips.",
    "Up to 5 polished 15–30 second vertical shorts, 1080×1920 MP4.",
    "Complete-thought editing, word-synced captions, relevant B-roll where appropriate, music where appropriate, pacing, audio finish, punch-in where appropriate, and CTA / ending treatment through the shared $349 finishing lane.",
    "Quality review of each rendered MP4 and the existing 2-loop internal correction.",
    "One included revision round for the set.",
  ],
  whatsIncluded: [
    "Studio discovery and selection from one eligible long-form source. You do not mark the moments.",
    "Up to 5 finished standalone shorts. 5 is the maximum, not a guarantee.",
    "If only 3 or 4 genuinely strong standalone moments exist, The Studio delivers those and does not manufacture weak filler.",
    "If more than 5 qualify, The Studio delivers the strongest 5.",
    "If fewer than 3 qualify, The Studio stops before finishing and offers one replacement-source window. It does not invent filler and it does not charge $549 for a short set.",
    "The supported $349 finish, not a second video factory.",
  ],
  whatsNotIncluded: [
    "5 guaranteed clips.",
    "Weak filler manufactured to reach 5.",
    "A second finishing factory, or three-to-five independent $349 Content Packs.",
    "Kinetic captions, multi-aspect reframing, a customer video brand kit, meaning-tied sound effects, or Studio posting.",
    "A sold denoise guarantee, open-world B-roll, or business / performance results.",
    "Post captions, cover graphics, or a use guide. Those belong to the $349 Short-Form Content Pack.",
    "Landscape, multi-camera, multi-guest interview cuts, narration, or non-English editing.",
    "Unlimited conversational recutting.",
    "Automatic routing to the $349 Short-Form Content Pack merely because the source is short. $349 is only for recordings where you point to the moments.",
  ],
  important:
    "The $349 Short-Form Content Pack is the service where you point to the moments. Clip Repurposing is the service where you ask The Studio to search the recording and find the moments. Source length does not choose the product. Up to 5 means 5 maximum, not 5 guaranteed. If the first source yields fewer than 3 strong standalone shorts, The Studio stops before finishing and you may send one replacement recording within 2 business days. If the replacement also falls short, or no replacement arrives within those 2 business days, The Studio closes the job and refunds you in full. A later recording is a new Clip Repurposing order. It will not manufacture weak filler.",
  surfaces: SURFACES,
};

export const studio549ClipRepurposingIoFreezeV1 = {
  packageId: STUDIO_549_CLIP_REPURPOSING_IO_FREEZE_PACKAGE_ID,
  authorizedAt: "2026-09-28" as const,
  ownerFrozenAt: "2026-09-28" as const,
  ownerResult: "OWNER_FROZEN" as const,
  classification: "OWNER_FROZEN" as const,
  kind: "io_freeze" as const,
  ownerAuthorizedFreeze: true as const,
  nextPackagePrepared: "STUDIO-$549-CLIP-REPURPOSING-BUILD-1" as const,
  nextPackageAuthorizedToStart: false as const,
  doNotBuildClip: true as const,
  doNotPublish: true as const,
  doNotChangePublicCatalog: true as const,
  doNotReopen349: true as const,
  doNotCreateSecondFinishingFactory: true as const,
  doNotStartMenuCleanup: true as const,
  doNotStartAdCreative: true as const,
  doNotStartAiLocalVisibility: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  publicPriceCents: 54900 as const,
  customerFacingName: "Clip Repurposing" as const,
  skuId: CLIP_REPURPOSING_SKU,
  hitchhikesFinishingLane: "v2-rtu-short-form-video-edit" as const,
  historicalThreeClipFactoryRemainsHistorical: true as const,
  supersedesHistoricalIoForFutureBuild: true as const,
  contract: clipRepurposingIoFreezeContractV1,

  distinction: {
    decidedBy: "who_identifies_the_moments" as const,
    notDecidedBy: "source_duration" as const,
    pack349:
      "Customer identifies the desired moments or marked segments. Studio may use only the certified short lookaround around those marks, then finishes.",
    clip549:
      "The Studio is asked to search the source and find the moments. Studio ranks, selects, and finishes through the shared $349 finishing lane.",
    tenMinuteFindTheBestIsClip: true as const,
    unmarkedSourceIsNever349BecauseItIsShort: true as const,
  },

  sourceEligibility: {
    sourceCount: 1 as const,
    minSourceMinutes: 2 as const,
    maxSourceMinutes: 60 as const,
    minSourceRationale:
      "Whole-source search of 2 minutes is cheap enough to run, and 2 minutes is the shortest runtime that can realistically hold more than one 15–30 second complete thought. The Studio can economically search a 10-minute unmarked recording; that is Clip, not the $349 pack. The old 15-minute floor was product-identity, not economics." as const,
    belowMinimumUnmarked:
      "Decline as ineligible for Clip set-discovery. Do not send it to the $349 pack unless the customer now points to each moment." as const,
    formats: ["mp4", "mov"] as const,
    orientation: "native_vertical" as const,
    outputWidth: 1080 as const,
    outputHeight: 1920 as const,
    language: "en" as const,
    speakerRule: "one_primary_on_camera_speaker" as const,
    interviewsPodcastsWebinars:
      "qualify_only_when_one_primary_speaker_is_on_camera_addressing_the_recording" as const,
    multiGuestCutsOut: true as const,
    landscapeOut: true as const,
    multiCameraOut: true as const,
    speechMustBeIntelligible: true as const,
    sourceAudioPreflightApplies: true as const,
    complimentaryLightCleanupMaxPasses: 2 as const,
    noSoldDenoiseGuarantee: true as const,
    rightsClearedRequired: true as const,
    likenessClearedRequired: true as const,
    durationDoesNotAssignTheProduct: true as const,
    underFifteenMinutesDoesNotBelongTo349: true as const,
  },

  discovery: {
    studioFindsTheMoments: true as const,
    customerDoesNotMarkMoments: true as const,
    transcribeWholeEligibleSource: true as const,
    candidateWindowsSeconds: { min: 15, max: 30 } as const,
    eligibleMoment:
      "A complete standalone thought with a clean opening and a landed ending, intelligible English, one primary speaker, and enough specific value that it is worth posting by itself." as const,
    reject: [
      "lead_in_or_trailing_fragment",
      "incomplete_thought",
      "admin_thanks_or_filler",
      "same_idea_as_a_stronger_candidate",
      "overlapping_window_loser",
      "unintelligible_or_off_camera_primary",
    ] as const,
    ranking:
      "Semantic editorial value already proven on Clip discovery: specific, useful, self-contained, distinct. Hook words are a weak bonus, never a requirement." as const,
    setQuestion:
      "If the customer posted these clips separately, would each feel like a distinct piece worth publishing?" as const,
  },

  upToFive: {
    maximumDelivered: 5 as const,
    notAGuarantee: true as const,
    fulfillAt549WhenCount: [3, 4, 5] as const,
    ifMoreThanFiveQualifySelectStrongest: 5 as const,
  },

  antiFiller: {
    doNotManufactureWeakFiller: true as const,
    doNotBeginProductionForFakeClip: true as const,
  },

  antiCannibalization: {
    overlappingWindowsKeepTheStronger: true as const,
    sameSpokenIdeaCannotAppearTwice: true as const,
    setMustPassDistinctnessQuestion: true as const,
  },

  shortfall: {
    doNotReuseHistorical349or449: true as const,
    historicalOneClipCentsNotUsed: 34900 as const,
    historicalTwoClipCentsNotUsed: 44900 as const,
    doNotCharge549ForFewerThan3: true as const,
    doNotLowerQualityToPreserveAPrice: true as const,
    noPublishedOneOrTwoClipPrice: true as const,
    stopBeforeProductionWhenBelow3: true as const,
    checkoutTruth:
      "If a source yields fewer than 3 strong standalone shorts, The Studio stops before finishing. You get one replacement-source opportunity. If that also falls short, The Studio refunds you in full. It does not invent filler and it does not charge $549 for a short set." as const,
    outcomes: {
      firstSource0: "stop_before_finishing_offer_one_replacement_source" as const,
      firstSource1: "stop_before_finishing_offer_one_replacement_source" as const,
      firstSource2: "stop_before_finishing_offer_one_replacement_source" as const,
      replacement0: "stop_and_full_refund" as const,
      replacement1: "stop_and_full_refund" as const,
      replacement2: "stop_and_full_refund" as const,
      3: "fulfill_clip_repurposing_at_549" as const,
      4: "fulfill_clip_repurposing_at_549" as const,
      5: "fulfill_clip_repurposing_at_549" as const,
      over5: "select_strongest_5_fulfill_at_549" as const,
    },
    ownerExceptionToFinishOneOrTwoAtAOneOffAuthorizedPrice: true as const,
    ownerExceptionIsNotAPublishedSku: true as const,
  },

  sourceQualityResubmission: {
    enabled: true as const,
    oneReplacementSource: true as const,
    replacementReplacesFirstSource: true as const,
    notAnAdditionalSource: true as const,
    noSecondResubmission: true as const,
    windowBusinessDays: 2 as const,
    windowIsHard: true as const,
    windowBasis:
      "Two business days is a customer-response window, not a finishing SLA. It is long enough to send a replacement recording and short enough that queue priority does not become an open ticket. It is not inherited from the stale 3–5 business-day draft phrase." as const,
    historicalThreeToFiveDaysAfterIntake: "stale_superseded_not_capacity_proven" as const,
    honestTimingForbidsInventedDeliveryDate: true as const,
    doNotPromiseOriginalDeliveryDateAfterReplacement: true as const,
    paymentHeldDuringWindow: true as const,
    doNotRefundThenRechargeDuringWindow: true as const,
    refundIfWindowExpiresWithNoReplacement: true as const,
    refundIfCustomerDeclinesReplacement: true as const,
    refundIfReplacementAlsoBelow3: true as const,
    lateSourceOnClosedOrder: "refused_must_place_new_order" as const,
    noInheritedPriorityAfterRefund: true as const,
    prePurchaseWarning:
      "The Studio will search your recording for strong standalone shorts. Not every recording contains enough. We do not invent weak clips to reach 3. If the first source yields fewer than 3, we stop before finishing and you may send one replacement recording within 2 business days. Payment stays on the job during that window. If we do not receive a replacement in those 2 business days, we close the job and refund you. A later recording is a new order. Finishing begins when the accepted source is ready and a Heavy production slot is available. The Studio does not invent a start date or a delivery date. If you have a hard event or launch date, send your best recording early enough to allow for discovery, a possible 2-business-day replacement window, and waiting for a Heavy slot. A replacement can change when finishing begins." as const,
    firstSourceFailsNotice:
      "We searched your recording and did not find 3 strong standalone shorts we can finish. We will not invent weak clips. We have not started finishing. You may send one replacement eligible recording within 2 business days. That recording replaces the first source; it is not added on. If it yields 3 to 5 strong shorts, this $549 job continues. If it still falls short, we close the job and refund you in full. If we do not receive a replacement within 2 business days, we close the job and refund you. We cannot accept a late recording on this order. A later recording would be a new Clip Repurposing order." as const,
    truthfulTimingCopy:
      "Finishing begins when The Studio has accepted a source that yields at least 3 strong standalone shorts and a Heavy production slot is available. The Studio will not invent a start date, a delivery date, or a queue number. Source quality can add one 2-business-day replacement window before finishing can begin." as const,
  },

  capacityReservation: {
    jobRemainsActiveDuringWindow: true as const,
    doNotOccupyHeavyProducingSlotWhileWaiting: true as const,
    reserved: "heavy_queue_priority_only" as const,
    reservedCapacity: "none_of_the_heavy_producing_slot" as const,
    reservationExpiresAtEndOfReplacementWindow: true as const,
    otherCustomerWorkContinues: true as const,
    doNotDisplaceAlreadyCommittedDeadlines: true as const,
    doNotOverbookToKeepOriginalDate: true as const,
    onTimeReplacement: "same_job_payment_held_queue_priority_preserved_no_idle_heavy_slot" as const,
    lateReplacement: "job_closed_full_refund_no_late_source_on_this_order" as const,
    preservedPriorityMeans:
      "Among jobs that have not yet begun Heavy Production, this job keeps the queue place it held when the first-source shortfall was declared. It never interrupts a job already producing. It does not idle the Heavy slot. If Heavy is occupied when the replacement is accepted, it waits in that preserved place. Already-committed producing work is not bumped." as const,
    onTimeReplacementCanDisplaceAnotherCustomer: false as const,
    currentCapacityCertSupportsThis: "partial" as const,
    currentCapacityCertCannotSupportIdleHeavyLock: true as const,
    currentCapacityCertForbidsInventedDeliveryDate: true as const,
    ownerExceptionPaths: [
      "heavy_lane_full",
      "one_off_finish_of_1_or_2_clips_not_a_public_sku",
      "hard_deadline_queue_jump_never_automatic",
    ] as const,
  },

  creativeDirection: {
    usesWiredStudioVideoCreativeDirectionV1: true as const,
    customerMaySupply: [
      "customerGoal",
      "intendedAudience",
      "purpose",
      "keep",
      "cut",
      "broll",
      "music",
      "captions",
      "visualEmphasis",
      "cta",
      "customerRevisionInstructions",
    ] as const,
    ctaWordingRequired: true as const,
    unknownInstructionFailsClosed: true as const,
    captionsBiggerNotExecutable: true as const,
  },

  revision: {
    included: 1 as const,
    model: "one_set_revision" as const,
    notUnlimitedConversationalEditing: true as const,
    notPerClipRedesignDesk: true as const,
    supported: [
      "replace_one_selected_with_next_ranked_distinct_alternate",
      "change_set_cta_with_replacement_wording",
      "remove_the_music",
      "remove_broll",
      "tighten_the_ending",
    ] as const,
    notSupported: [
      "try_different_moments_on_every_clip",
      "rewrite_speech",
      "add_a_clip_to_reach_five",
      "make_the_captions_bigger",
      "use_a_different_opening",
      "landscape_or_extra_aspects",
      "studio_posting",
    ] as const,
  },

  finishingInheritance: {
    shared349Lane: true as const,
    secondFactoryForbidden: true as const,
    inherit: [
      "complete_thought_editing",
      "word_synced_captions",
      "relevant_broll_where_appropriate",
      "music_where_appropriate",
      "pacing_and_cuts",
      "audio_finish",
      "hook_punch_in_where_appropriate",
      "cta_and_ending_treatment",
      "quality_review_of_rendered_mp4",
      "two_loop_internal_correction",
    ] as const,
    doNotInheritPackExtras: [
      "post_captions",
      "cover_graphics",
      "use_guide",
    ] as const,
  },

  remainingOut: [
    "kinetic_captions",
    "multi_aspect_reframing",
    "customer_video_brand_kit",
    "meaning_tied_sfx_package",
    "posting_or_publishing",
    "sold_denoise_guarantee",
    "open_world_broll_promises",
    "business_or_performance_guarantees",
    "landscape_to_vertical_reframe",
    "narration",
    "non_english_editing",
    "monthly_clipping_retainer",
  ] as const,

  economicsToProveDuringBuild: [
    "whole_source_deepgram_up_to_60_minutes",
    "discovery_and_ranking_cost_and_time",
    "worst_case_five_finishes_through_349_lane_including_music_and_quality_loops",
    "549_still_covers_five_clip_worst_case",
    "two_to_sixty_minute_search_cost",
    "do_not_prove_or_reuse_349_449_shortfall_prices_from_this_stamp",
    "anti_cannibalization_on_repetitive_talks",
    "do_not_use_owner_as_routine_qa",
  ] as const,

  laterTestsAndFixtures: [
    "2_minute_floor_10_minute_unmarked_discovery_and_60_minute_ceiling",
    "positive_source_with_more_than_five_strong_moments",
    "positive_source_with_exactly_three_or_four",
    "negative_source_with_zero_one_or_two",
    "overlapping_same_idea_cannibalization",
    "unintelligible_audio_preflight",
    "landscape_and_multi_guest_refusal",
    "cta_required_and_unknown_revision_fail_closed",
    "each_delivered_mp4_quality_rewatch",
  ] as const,

  stampDir: "docs/launch/studio-549-clip-repurposing-io-freeze-1" as const,
} as const;

export function clipRepurposingIoFreezeFindings(): string[] {
  return assertProductInputOutputContract(clipRepurposingIoFreezeContractV1);
}
