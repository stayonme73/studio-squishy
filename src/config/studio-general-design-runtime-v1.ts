/**
 * STUDIO-OPERATING-GENERAL-DESIGN-RUNTIME-1
 *
 * Package C: certify the general Design Production runtime for non-flyer
 * launch-menu design SKUs. Does not rebuild the Production Team.
 * Does not expand the launch menu. Does not touch Maya.
 */

export const studioGeneralDesignRuntimeV1 = {
  packageId: "STUDIO-OPERATING-GENERAL-DESIGN-RUNTIME-1",
  schemaVersion: 1 as const,
  room: 4 as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotTouchMaya: true as const,
  packageAUnchanged: true as const,
  packageBBaselineAccepted: true as const,
  customerRevisionPolicyUnchanged: true as const,
  refundPolicyUnchanged: true as const,
  doNotExpandLaunchMenu: true as const,
  ownerRoutineProduction: "NONE" as const,
  printFulfillment: "DIGITAL_FILES_ONLY" as const,
  certificationVisualSystemsAreNotRuntimeIdentities: true as const,

  maxInternalProductionAttempts: 3 as const,
  maxCorrectionCycles: 2 as const,

  /**
   * Social posts contract is four square posts for one platform.
   * There is no launch social-vertical SKU. Related formats for Package C
   * are promotion-graphics Square + Portrait when the customer selects them.
   */
  socialPostsPlate: "square_only" as const,
  crossFormatAuthoritySku: "v2-rtu-promotion-graphics" as const,
} as const;

/** Customer-facing launch design SKUs in this package (flyer is Package A). */
export const GENERAL_DESIGN_LAUNCH_SKUS = [
  "v2-rtu-promotion-graphics",
  "v2-rtu-social-posts",
  "v2-rtu-business-card",
  "v2-rtu-menu",
  "v2-rtu-service-sheet",
] as const;

export type GeneralDesignLaunchSku =
  (typeof GENERAL_DESIGN_LAUNCH_SKUS)[number];

export const GENERAL_DESIGN_SKU_LAUNCH_ROLE = {
  "v2-rtu-promotion-graphics": "customer_facing_launch",
  "v2-rtu-social-posts": "customer_facing_launch",
  "v2-rtu-business-card": "customer_facing_launch",
  "v2-rtu-menu": "customer_facing_launch",
  "v2-rtu-service-sheet": "customer_facing_launch",
  "v2-rtu-handout": "held_from_launch",
  "v2-rtu-flyer": "package_a_not_in_scope",
} as const;

export const GENERAL_DESIGN_SUPPORTING_INTERNAL_SKUS = [
  "sm-001",
  "sm-001-monthly",
  "ma-001",
  "rm-j002",
  "rm-j008",
  "bf-001",
  "rm-j007",
] as const;

export const GENERAL_DESIGN_CERTIFICATION_ONLY_SYSTEMS = [
  "nia",
  "harbor",
  "harbor-oak",
  "cedar-lane",
  "rooted-ready-wellness-v1",
  "harbor-roast-coffee-v1",
  "cedar-lane-home-organizing-v1",
] as const;

export type GeneralDesignClassification =
  | "AUTONOMOUSLY_PRODUCTION_READY"
  | "READY_WITH_EXPLICIT_LIMITS"
  | "HOLD_NOT_AUTONOMOUS"
  | "NOT_ON_LAUNCH_MENU";

export const CERTIFICATION_VISUAL_LEAK_PATTERNS: readonly RegExp[] = [
  /Harbor\s*&\s*Oak/i,
  /harborandoak\.example/i,
  /Cedar\s+Lane/i,
  /cedarlane\.example/i,
  /saltandcedar\.example/i,
  /Nia\b/i,
  /rooted-ready-wellness-v1/i,
  /harbor-roast-coffee-v1/i,
  /cedar-lane-home-organizing-v1/i,
  /CERTIFICATION FIXTURE/i,
  /INTERNAL TEST/i,
];

export type GeneralDesignInternalAttempt = {
  attemptNumber: number;
  triggeredBy: "initial_dispatch" | "qa_correction";
  qaResult: "pass" | "fail" | "not_run";
  failureCode: string | null;
  message: string | null;
  pngContentSha256: string | null;
  startedAt: string;
  completedAt: string;
};

export type GeneralDesignInternalLoopRecord = {
  packageId: typeof studioGeneralDesignRuntimeV1.packageId;
  skuId: string;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  status: "in_progress" | "passed" | "escalated" | "fail_closed";
  maxAttempts: typeof studioGeneralDesignRuntimeV1.maxInternalProductionAttempts;
  attempts: readonly GeneralDesignInternalAttempt[];
  ownerEscalation: { required: true; reason: string; at: string } | null;
  updatedAt: string;
};
