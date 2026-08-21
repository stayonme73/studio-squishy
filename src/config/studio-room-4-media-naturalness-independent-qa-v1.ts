/**
 * ROOM-4-MEDIA-NATURALNESS-INDEPENDENT-QA
 *
 * Named carry-forward. Not certified. Do not mark complete.
 * Required before external launch or before removing the listening-approval limit.
 */

export const ROOM_4_MEDIA_NATURALNESS_INDEPENDENT_QA_ID =
  "ROOM-4-MEDIA-NATURALNESS-INDEPENDENT-QA" as const;

export const studioRoom4MediaNaturalnessIndependentQaV1 = {
  requirementId: ROOM_4_MEDIA_NATURALNESS_INDEPENDENT_QA_ID,
  packageId: "STUDIO-OPERATING-ROOM-4-MEDIA-NATURALNESS-INDEPENDENT-QA-1" as const,
  schemaVersion: 1 as const,
  room: 4 as const,
  status: "REQUIRED_NOT_CERTIFIED" as const,
  closed: false as const,
  doNotFalselyMarkComplete: true as const,
  requiredBefore: [
    "external_launch",
    "removing_customer_listening_approval_limit",
  ] as const,
  evidenceDoc:
    "docs/launch/studio-operating-room-4-media-naturalness-independent-qa-1/ROOM-4-MEDIA-NATURALNESS-INDEPENDENT-QA.md" as const,

  alreadyAutomated: [
    "clipping_peak_levels",
    "narration_transcript",
    "sentence_timing",
    "semantic_beat_alignment",
    "no_mid_sentence_cuts",
    "rendered_frame_text_safety",
    "cta_hold",
    "correct_facts",
    "product_visibility",
    "blank_edge_detection",
    "multiple_scene_consistency",
  ] as const,

  notYetFullyAutomated: [
    "independent_ai_listener_synthetic_narration_naturalness",
  ] as const,

  listeningRule: {
    customerListeningApprovalMandatory: true as const,
    routineAudioApprovalRequiresTagia: false as const,
    choppyOrRoboticSpeechIsStudioDefect: true as const,
    chargedRevision: false as const,
    consumesRevisionAllowance: false as const,
    silentReleaseOfUnresolvedVoiceQualityFailureForbidden: true as const,
  },
} as const;

export const STUDIO_DEFECT_CORRECTION_DOCTRINE_V1 = {
  studioMistakesAreNotCustomerRevisions: true as const,
  noCharge: true as const,
  doesNotConsumeRevisionAllowance: true as const,
  voiceQualityExamples: [
    "choppy narration",
    "robotic narration",
    "unusable synthetic speech reported by the customer",
  ] as const,
  motionSafetyExamples: [
    "type leaving the phone-safe area",
    "baked text moving with a Ken Burns plate",
  ] as const,
  unresolvedStudioDefectMustNotSilentlyRelease: true as const,
} as const;
