/**
 * PROJECT ALPHA — Design Quality, Creative Tool Chest & AI Oversight
 *
 * Preserve Design Intelligence Phase 1. This package adds full-canvas
 * composition, hybrid tool routing, Creative Director rejection, and
 * Machine → AI Studio Manager / Scout recovery lanes.
 *
 * Customer revision policy is unchanged. Scout may not hand-draw
 * customer artwork. No merge unless separately authorized.
 */

export const studioProjectAlphaV1 = {
  packageId: "STUDIO-OPERATING-PROJECT-ALPHA-DESIGN-QUALITY-1",
  schemaVersion: 1 as const,
  intelligenceVersion: "design-intelligence-v1.2.1" as const,
  room: 4 as const,
  doNotMerge: true as const,
  skuId: "v2-rtu-flyer" as const,
  customerRevisionPolicyUnchanged: true as const,
  scoutMayNotHandDrawCustomerArt: true as const,
  ownerIsNotFirstLineCreativeQa: true as const,
  routineLaunchAttemptBudget: 3 as const,

  customerEffort: {
    brandColorsOptional: true as const,
    logoOptionalUnlessPurchasedServiceRequires: true as const,
    chooseForMeIsValid: true as const,
    doNotInterrogateDesignerJargon: true as const,
  },

  canvasDoctrine: {
    solidColorBackgroundDoesNotCountAsUsingCanvas: true as const,
    negativeSpaceMustBeIntentional: true as const,
    accidentalDeadSpaceIsAFail: true as const,
    topHeavyCopyHuddleIsAFail: true as const,
    wordsOnABackgroundIsNotProfessionalDesign: true as const,
    blandButTechnicallyCorrectIsAQaFailure: true as const,
    differentColorsAloneDoNotEqualDifferentDesign: true as const,
  },

  hybridProduction: {
    rendererIsNotTheEntireDesignDepartment: true as const,
    imageGenerationMayNotOwnCriticalCustomerText: true as const,
    exactFactsAreDeterministic: true as const,
  },

  guidance: {
    machineMayAskAiStudioManager: true as const,
    aiMayNotInventCustomerFacts: true as const,
    aiMayNotMakeOwnerOnlyBusinessDecisions: true as const,
    engineeringDefectsAreNotOwnerTickets: true as const,
  },
} as const;

export const PROJECT_ALPHA_INTELLIGENCE_VERSION =
  studioProjectAlphaV1.intelligenceVersion;

export type StudioProductionMethod =
  | "renderer_first"
  | "image_plus_renderer"
  | "customer_assets_plus_renderer"
  | "video_certified";

export type StudioManagerAction =
  | "continue_production"
  | "reroute_design"
  | "use_image_generation"
  | "research_references"
  | "request_missing_customer_information"
  | "studio_correction_required"
  | "engineering_recovery_required"
  | "owner_judgment_required";

export type StudioLearningLevel =
  | "customer_preference"
  | "studio_quality_lesson"
  | "owner_quality_doctrine";
