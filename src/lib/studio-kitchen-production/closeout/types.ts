/**
 * KITCHEN-PRODUCTION-READINESS-CLOSEOUT-1 — final launch disposition types.
 */

export const LAUNCH_DISPOSITIONS = [
  "SELL",
  "SELL WITH LIMITS",
  "DO NOT SELL",
  "REMOVE / RESTRUCTURE REQUIRED",
] as const;

export type LaunchDisposition = (typeof LAUNCH_DISPOSITIONS)[number];

export const NORMALIZED_READINESS_STATUSES = [
  "CUSTOMER READY",
  "CUSTOMER READY WITH LIMITS",
  "CUSTOMER READY WITH LIMITS — COPY",
  "CUSTOMER READY WITH LIMITS — DESIGN",
  "CUSTOMER READY WITH LIMITS — MP3",
  "CUSTOMER READY WITH LIMITS — MP4",
  "CUSTOMER READY WITH LIMITS — PROFILE KIT",
  "CUSTOMER READY WITH LIMITS — METHOD COVERED",
  "NOT CUSTOMER READY",
  "BLOCKED",
  "INTEGRATION REQUIRED",
] as const;

export type NormalizedReadinessStatus =
  (typeof NORMALIZED_READINESS_STATUSES)[number];

export type OwnerIndependence = "NONE" | "OWNER-INDEPENDENCE DEFECT";

export type EngineeringIndependence =
  | "NONE"
  | "ROUTINE ENGINEERING DEPENDENCY";

export type FinalActiveSkuLedgerRow = {
  skuId: string;
  customerFacingName: string;
  exactDeliverable: string;
  priceDisplay: string;
  productionRole: string;
  productionMechanismTool: string;
  requiredCustomerInputs: readonly string[];
  customerResponsibility: string;
  ownerRoutineResponsibility: OwnerIndependence;
  engineeringIndependence: EngineeringIndependence;
  readinessStatus: NormalizedReadinessStatus;
  readinessLimitations: readonly string[];
  certificationEvidencePackage: string;
  unresolvedDependency: string | null;
  launchDisposition: LaunchDisposition;
};

export type ProductionToolLedgerRow = {
  tool: string;
  studioJob: string;
  status: string;
  accountRequired: string;
  credentialType: string;
  costPlanStatus: string;
  productionDependency: string;
  replacementHistoryStatus: string;
  currentLimitation: string;
};

export type RedFlagCategory =
  | "LAUNCH BLOCKER"
  | "LAUNCH LIMIT"
  | "POST-LAUNCH ENHANCEMENT";

export type RedFlag = {
  category: RedFlagCategory;
  item: string;
  notes: string;
};

export const CLOSEOUT_PACKAGE_ID =
  "KITCHEN-PRODUCTION-READINESS-CLOSEOUT-1" as const;

export const CLOSEOUT_STARTING_COMMIT =
  "2c8b40f9cf1668adc47fb13de0aa38b7918a4c04" as const;

export const CLOSEOUT_VERDICTS = [
  "KITCHEN PRODUCTION READY FOR LAUNCH WITH DOCUMENTED LIMITS",
  "KITCHEN PRODUCTION NOT READY — LAUNCH BLOCKERS REMAIN",
] as const;

export type CloseoutVerdict = (typeof CLOSEOUT_VERDICTS)[number];
