/**
 * STUDIO-OPERATING-PRODUCTION-TEAM-WORKFORCE-1
 *
 * Put the Production Team behind the launch menu. Machine assigns work.
 * Scout is factory engineer, not a customer producer.
 * Maya stays frozen. Do not merge. Do not push. Do not Approve.
 */

import {
  LAUNCH_MENU_COPY_SKUS,
  LAUNCH_MENU_DESIGN_SKUS,
  LAUNCH_MENU_PRINT_OUTPUT_SKUS,
  LAUNCH_MENU_VIDEO_SKU,
} from "@/config/studio-launch-menu-production-runtime-v1";

export const studioProductionTeamWorkforceV1 = {
  packageId: "STUDIO-OPERATING-PRODUCTION-TEAM-WORKFORCE-1",
  schemaVersion: 1 as const,
  room: 4 as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotApprove: true as const,
  doNotStartFinalApproval: true as const,
  doNotStartFinalDelivery: true as const,
  doNotReopenRefunds: true as const,
  doNotStartRoom5: true as const,
  doNotTouchMaya: true as const,
  doNotMintMayaVersion17: true as const,
  mayaFrozenVersion: 16 as const,
  mayaRevisionUsed: 1 as const,
  mayaRevisionRemaining: 0 as const,
  scoutIsNotCustomerProducer: true as const,
  ownerRoutineProduction: "NONE" as const,
  printFulfillment: "DIGITAL_FILES_ONLY" as const,
  voiceOnLaunchMenu: "HOLD" as const,
  carousel: "NOT_ON_LAUNCH_MENU" as const,
  internalRetryBudget: {
    design: 3,
    copy: 2,
    videoTransport: 2,
    videoCreative: 2,
    printFile: 2,
  },
} as const;

export const MAYA_PROTECTED_CAMPAIGN_ID =
  "716a15b6-d8d6-436c-8f84-9e8b40d2f959" as const;

export const PRODUCTION_TEAM_CAPABILITY_IDS = [
  "DESIGN_PRODUCTION",
  "COPY_PRODUCTION",
  "VIDEO_PRODUCTION",
  "PRINT_FILE_PRODUCTION",
  "QUALITY_TEAM",
] as const;

export type ProductionTeamCapabilityId =
  (typeof PRODUCTION_TEAM_CAPABILITY_IDS)[number];

export type ProductionTeamLaunchClassification =
  | "READY"
  | "READY_WITH_LIMITS"
  | "HOLD"
  | "NOT_ON_LAUNCH_MENU";

export type ProductionAttemptKind =
  | "customer_revision"
  | "studio_correction"
  | "internal_retry";

export const launchMenuSkuCapabilityMap = {
  "v2-rtu-flyer": {
    capability: "DESIGN_PRODUCTION" as const,
    supporting: ["PRINT_FILE_PRODUCTION", "QUALITY_TEAM"] as const,
    classification: "READY_WITH_LIMITS" as const,
    runtime: "studio_design_renderer + FlyerDesignSpec reasoner (Anthropic when keyed, deterministic fallback) + Package A QA loop",
  },
  "v2-rtu-promotion-graphics": {
    capability: "DESIGN_PRODUCTION" as const,
    supporting: ["QUALITY_TEAM"] as const,
    classification: "READY_WITH_LIMITS" as const,
    runtime: "studio_design_renderer promo set + creative refine when keyed + general-design QA loop",
  },
  "v2-rtu-social-posts": {
    capability: "DESIGN_PRODUCTION" as const,
    supporting: ["QUALITY_TEAM"] as const,
    classification: "READY_WITH_LIMITS" as const,
    runtime: "studio_design_renderer social four-post set + creative refine when keyed + general-design QA loop",
  },
  "v2-rtu-business-card": {
    capability: "DESIGN_PRODUCTION" as const,
    supporting: ["PRINT_FILE_PRODUCTION", "QUALITY_TEAM"] as const,
    classification: "READY_WITH_LIMITS" as const,
    runtime: "studio_design_renderer double-sided card + creative refine when keyed",
  },
  "v2-rtu-menu": {
    capability: "DESIGN_PRODUCTION" as const,
    supporting: ["PRINT_FILE_PRODUCTION", "QUALITY_TEAM"] as const,
    classification: "READY_WITH_LIMITS" as const,
    runtime: "studio_design_renderer menu plate + creative refine when keyed + general-design QA loop",
  },
  "v2-rtu-service-sheet": {
    capability: "DESIGN_PRODUCTION" as const,
    supporting: ["PRINT_FILE_PRODUCTION", "QUALITY_TEAM"] as const,
    classification: "READY_WITH_LIMITS" as const,
    runtime: "studio_design_renderer service-sheet + creative refine when keyed + general-design QA loop",
  },
  "v2-rtu-email-kit": {
    capability: "COPY_PRODUCTION" as const,
    supporting: ["QUALITY_TEAM"] as const,
    classification: "READY_WITH_LIMITS" as const,
    runtime: "studio_copy_producer writer (Anthropic when keyed, structured writer fallback) + copy QA",
  },
  "v2-rtu-sms-kit": {
    capability: "COPY_PRODUCTION" as const,
    supporting: ["QUALITY_TEAM"] as const,
    classification: "READY_WITH_LIMITS" as const,
    runtime: "studio_copy_producer writer (Anthropic when keyed, structured writer fallback) + copy QA",
  },
  "v2-rtu-short-video": {
    capability: "VIDEO_PRODUCTION" as const,
    supporting: ["QUALITY_TEAM"] as const,
    classification: "READY_WITH_LIMITS" as const,
    runtime: "Shotstack stills+captions pipeline. Missing footage = customer-material blocker. Voice/narration HOLD.",
  },
  "v2-rtu-voice": {
    capability: null,
    supporting: [] as const,
    classification: "HOLD" as const,
    runtime: "No launch-menu Voice SKU is sold. ElevenLabs exists; Machine does not invoke it.",
  },
  "cc-001": {
    capability: null,
    supporting: [] as const,
    classification: "HOLD" as const,
    runtime: "Campaign Creative general is not a Machine-owned launch producer.",
  },
  carousel: {
    capability: null,
    supporting: [] as const,
    classification: "NOT_ON_LAUNCH_MENU" as const,
    runtime: "Carousel is not on the Launch Now menu.",
  },
} as const;

export const WORKFORCE_LAUNCH_SKUS = [
  ...LAUNCH_MENU_DESIGN_SKUS,
  ...LAUNCH_MENU_COPY_SKUS,
  LAUNCH_MENU_VIDEO_SKU,
] as const;

export const WORKFORCE_PRINT_SKUS = LAUNCH_MENU_PRINT_OUTPUT_SKUS;

export function designCreativeReasoningAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function copyCreativeWritingAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}
