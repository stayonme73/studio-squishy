/**
 * Room 4B — Launch toolbox certification.
 * PARK for Manager. Do not auto-start the next toolbox certification.
 * Do not start Room 5. Do not reopen Resend/domain. Do not merge.
 *
 * Room 4A CLOSED at 9f9ac7c. Resend parked at d6974eb.
 */

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";
import { studioRoom4FullBusinessRehearsalV1 } from "@/config/studio-room-4-full-business-rehearsal-v1";

export const studioRoom4bLaunchToolboxCertificationV1 = {
  packageId: "STUDIO-OPERATING-ROOM-4B-LAUNCH-TOOLBOX-CERTIFICATION-1",
  schemaVersion: 1 as const,
  room: 4 as const,
  roomId: "full-business-rehearsal" as const,
  sectionId: "4b-launch-toolbox-certification" as const,
  merge: "separately_authorized" as const,
  doNotMerge: true as const,
  ownerRoutine: "NONE" as const,
  parkForManager: true as const,
  parkForManagerReview: true as const,
  sectionClosed: false as const,
  roomClosed: false as const,
  doNotAutoAdvance: true as const,
  doNotAutoStartNextCertification: true as const,
  doNotStartRoom5: true as const,
  doNotReopenResend: true as const,
  doNotReopenRoom1UnlessNewDefect: true as const,
  doNotReopenRoom2UnlessNewDefect: true as const,
  doNotReopenRoom3UnlessNewDefect: true as const,
  doNotReopenRoom4AUnlessNewDefect: true as const,
  visualRedesign: false as const,

  room4AClosedAt: "9f9ac7c" as const,
  room4APackageId: studioRoom4FullBusinessRehearsalV1.packageId,
  resendParkedAt: "d6974eb" as const,

  closeRule:
    "CUSTOMER USE → PRODUCE → BREAK → RECOVER → QA → REVIEW → REVISE → INSPECT → DELIVER → RETURN" as const,

  /** Close taxonomy — no vague NEEDS IMPROVEMENT when package closes. */
  classificationLabels: [
    "READY FOR LAUNCH",
    "READY WITH EXPLICIT LIMITS",
    "NOT ON LAUNCH MENU",
  ] as const,

  /** Manager-facing package state until continuation closes. */
  managerVerdict: "OPEN / PARKED WITH PRODUCT BLOCKERS" as const,
  authoritativeWorkTip: "e87b193" as const,
  hashNote: "7fdcefe" as const,

  /**
   * Campaign creative is NOT abandoned.
   * Text-led CERT plates remain accepted with limits.
   * Photo-led art direction stays OPEN.
   * CapCut lesson: own the capability; vendors are optional sockets.
   * Next: Machine-native production design — not another vendor trial.
   * Carousel stays off the Launch Now menu (Manager accepted).
   */
  campaignCreativeStatus: {
    abandoned: false as const,
    launchReady: false as const,
    posture: "OPEN_PENDING_MACHINE_NATIVE_BUILD_ACCEPTANCE" as const,
    textLedRenderer: "READY_WITH_EXPLICIT_LIMITS" as const,
    nextGate:
      "Manager accept A_BUILD_MACHINE_NATIVE then authorize next coherent build package" as const,
    nextGateKind: "build_acceptance_not_vendor_trial" as const,
    doNotOpenPlacidTrialYet: true as const,
    doNotBuyCanvaOrAdobeYet: true as const,
  },

  carouselDecision: {
    choice: "B_REMOVE_FROM_LAUNCH_NOW_MENU" as const,
    classification: "NOT ON LAUNCH MENU" as const,
    missing: [
      "renderer_multi_slide_capability",
      "multi_slide_service_contract",
      "carousel_sizing_export",
      "review_handling_per_slide",
      "delivery_handling",
      "qa_set_consistency",
    ] as const,
    doNotInventSku: true as const,
    catalogAlreadyExcludes: true as const,
    managerAcceptedOffMenu: true as const,
  },

  photoLedToolEvaluation: {
    packageDoc:
      "docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/STUDIO-OPERATING-ROOM-4B-PHOTO-LED-CAMPAIGN-PRODUCTION-TOOL-EVALUATION.md" as const,
    recommendation: "USE_TWO_STAGE_STACK" as const,
    purchase: false as const,
    integrate: false as const,
    candidates: [
      "adobe_firefly_photoshop_api",
      "canva_connect_autofill",
      "placid",
      "bannerbear",
    ] as const,
  },

  /**
   * CapCut-style live cert — access-first audition.
   * Two-stage = logical capabilities, not automatic dual subscriptions.
   */
  photoLedLiveCertification: {
    packageDoc:
      "docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/STUDIO-OPERATING-ROOM-4B-PHOTO-LED-CAMPAIGN-LIVE-CERTIFICATION-1-REPORT.md" as const,
    accessProbeScript:
      "scripts/studio-operating-room-4b-photo-led-access-probe.mts" as const,
    recommendation: "OWNER_PURCHASE_DECISION_REQUIRED" as const,
    adobe: "ACCESS_GATE_OWNER_DECISION" as const,
    canva: "ACCESS_GATE_OWNER_DECISION" as const,
    placid: "ACCESS_GATE_OWNER_DECISION" as const,
    twoStageProof: "NOT_RUN" as const,
    revisionProof: "NOT_RUN" as const,
    failureRecoveryProof: "NOT_RUN" as const,
    niaPhotoBinaries: "MISSING_PLACEHOLDERS_ONLY" as const,
    twoStageMeansTwoSubscriptions: false as const,
    purchase: false as const,
    integrate: false as const,
    parkForManager: true as const,
    supersededAsImmediateNextStep: true as const,
    supersessionNote:
      "Manager 2026-08-19: do not open Placid trial next; run Machine-native capability decomposition first." as const,
  },

  /**
   * Machine-native photo-led design package — parked with recommendation A.
   * CapCut parallel: own the capability; vendors optional sockets only.
   */
  machineNativePhotoLedDesign: {
    packageId:
      "STUDIO-OPERATING-ROOM-4B-MACHINE-NATIVE-PHOTO-LED-CAMPAIGN-PRODUCTION-DESIGN-1" as const,
    status: "PARKED_FOR_MANAGER" as const,
    recommendation: "A_BUILD_MACHINE_NATIVE" as const,
    smallestExternalDependencySet: [] as const,
    reportDoc:
      "docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/STUDIO-OPERATING-ROOM-4B-MACHINE-NATIVE-PHOTO-LED-CAMPAIGN-PRODUCTION-DESIGN-1-REPORT.md" as const,
    contractsModule: "src/lib/studio-campaign-creative/contracts.ts" as const,
    question:
      "Can we build a Machine-operated photo-led campaign workstation, with vendors only as replaceable engines where truly necessary?" as const,
    answer:
      "Yes — own Visual Prep + Campaign Renderer + QA; zero vendors required for Launch Now; sockets reserved for advanced ops." as const,
    customerFacingNames: [
      "Social Graphic",
      "Campaign Creative",
      "Short Promotional Video",
    ] as const,
    neverCustomerFacingProviderNames: [
      "Canva Graphic",
      "Adobe Firefly Creative",
      "Shotstack Video",
    ] as const,
    preferredArchitecture: [
      "Machine chooses creative recipe",
      "Studio Visual Prep",
      "Studio Campaign Renderer",
      "Studio QA",
      "Review / revision",
      "Delivery",
    ] as const,
    doNotRebuildCanvaOrPhotoshop: true as const,
    purchase: false as const,
    doNotOpenPlacidTrial: true as const,
    parkForManager: true as const,
  },


  customer: {
    customerName: "Nia Carter",
    businessName: "Rooted & Ready Wellness Studio",
    campaignName: "Fall Reset Launch Campaign",
  },

  requiredDeliverables: [
    "1 campaign visual direction",
    "1 vertical short-form promotional video, approximately 20–30 seconds",
    "2 static social graphics",
    "1 social carousel",
    "3 social captions",
    "1 promotional email",
    "1 printable one-page handout/poster",
    "coordinated messaging and visual identity across the campaign",
    "one included revision round within the defined scope",
  ] as const,

  /** Launch menu candidates under certification — carousel/Stories/Reels not advertised. */
  launchToolboxCandidates: [
    "Short-form promotional video",
    "Campaign creative / coordinated multi-format campaign",
    "Content repurposing / clipping",
    "Social graphics (static posts) — carousels, Stories, and Reels not offered at launch",
    "Level 1 ad creative",
    "Motion creative",
    "Marketing copy / email / SMS content",
    "Print-ready marketing collateral",
    "Brand refresh",
    "Landing-page content + creative",
  ] as const,

  honestSellableSkusTowardCampaign: [
    "v2-rtu-promotion-graphics",
    "v2-rtu-social-posts",
    "v2-rtu-flyer",
    "v2-rtu-email-kit",
    "v2-rtu-short-video",
  ] as const,

  cannotSellAtLaunch: {
    component: "carousel" as const,
    reason: "catalog_exclusion_on_social_posts" as const,
    note:
      "v2-rtu-social-posts exclusions include carousels; do not invent a carousel SKU.",
  },

  voiceBriefExact:
    "I really don't want this to look like one of those loud fitness challenges. My customers are mostly women in their thirties through fifties. I want it to feel calm but motivating. No neon colors and no before-and-after body pictures.",

  missingFact: {
    id: "enrollment_booking_method" as const,
    description:
      "How customers enroll or book (link, phone path, or in-studio method)",
  },

  deadlineTests: {
    nextFriday: true as const,
    tomorrowMorningMustRefuse: true as const,
  },

  ownerOutOfScopeAsk:
    "two extra short-video variations with different opening hooks for TikTok and Instagram",

  priorRooms: {
    room1Status: studioRoom1CustomerLifeCloseoutV1.status,
    room1AuthoritativeTip: "a49efd7" as const,
    room2Closed: true as const,
    room3Closed: true as const,
    room3CloseTip: "cd2a1e2" as const,
    room4AClosed: true as const,
    room4ACloseTip: "9f9ac7c" as const,
  },

  currentActiveRoom: studioLaunchReadinessExecutionOrderV1.currentActiveRoom,
  currentActiveRoomId: studioLaunchReadinessExecutionOrderV1.currentActiveRoomId,

  comeBackLaterEmail: {
    protectedCheckpoint: "d6974eb" as const,
    doesNotBlockRoom4: true as const,
    doNotReopenFromRoom4B: true as const,
  },

  outOfScope: [
    "room_5",
    "merge",
    "branded_sender_certification",
    "real_inbox_delivery_proof",
    "invented_carousel_sku",
    "capcut",
    "outside_human_contractors",
    "auto_start_next_toolbox_certification",
    "visual_redesign_spree",
  ] as const,
} as const;

export type StudioRoom4bClassificationLabel =
  (typeof studioRoom4bLaunchToolboxCertificationV1.classificationLabels)[number];