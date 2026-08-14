/**
 * STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PROOF-1
 * Cycle-keyed identity wrapper types. Consumes authoritative cycle truth —
 * never mints productionCycleId. Sealed sm-001 engine unchanged.
 */

import type {
  Sm001PlannedPostCount,
  Sm001PlannedPostCountSelection,
  Sm001ProjectTruth,
  Sm001SetIdentity,
  Sm001TimingConstraints,
} from "./sm-001-types";

export const DESIGN_RENDERER_SM_001_MONTHLY_SKU = "sm-001-monthly" as const;
export type DesignRendererSm001MonthlySku =
  typeof DESIGN_RENDERER_SM_001_MONTHLY_SKU;

export const SM_001_MONTHLY_PROOF_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PROOF-1" as const;

export const SM_001_MONTHLY_WRAPPER_VERSION =
  "design-renderer-sm-001-monthly-wrapper-1.0.0" as const;

/**
 * Authoritative service production period — must exist before production.
 * Renderer consumes; never invents.
 */
export type Sm001MonthlyCycleIdentity = {
  productionCycleId: string;
  cycleStartDate: string;
  cycleEndDate: string;
  /** This cycle's one monthly content focus. */
  monthlyContentFocus: string;
};

export type Sm001MonthlyProjectTruth = {
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererSm001MonthlySku;
  /** Authoritative cycle — required; never minted by the wrapper. */
  cycle: Sm001MonthlyCycleIdentity;
  /** Locked per-cycle N — required before execution. */
  plannedPostCount: Sm001PlannedPostCount;
  plannedPostCountSelection: Sm001PlannedPostCountSelection;
  /**
   * Creative truth for the sealed sm-001 engine (skuId remapped only inside
   * the wrapper call). Focus/offer fields must match this cycle — not prior.
   */
  creative: Omit<
    Sm001ProjectTruth,
    "skuId" | "plannedPostCount" | "plannedPostCountSelection" | "campaignId" | "jobId" | "dispatchId"
  > & {
    /** Optional narrower campaign timing; intersected with cycle window. */
    campaignTimingConstraints?: Sm001TimingConstraints;
  };
  outputMode: "certification_fixture" | "customer";
  proofScopeNote: string;
};

export type Sm001MonthlyFailureCode =
  | "MISSING_PRODUCTION_CYCLE_ID"
  | "MISSING_CYCLE_START"
  | "MISSING_CYCLE_END"
  | "INVALID_CYCLE_DATE_RANGE"
  | "MISSING_CYCLE_FOCUS"
  | "MISSING_PLANNED_POST_COUNT"
  | "INVALID_PLANNED_POST_COUNT"
  | "CYCLE_IDENTITY_IMMUTABLE"
  | "PRIOR_CYCLE_REUSE_FORBIDDEN"
  | "CYCLE_WINDOW_CONFLICT"
  | "STALE_CYCLE_TRUTH"
  | "SKU_NOT_SUPPORTED"
  | "WRAPPER_REFUSED_CYCLE_MINT"
  | "ENGINE_FAILURE"
  | "INVALID_PLATE";

export type Sm001MonthlyCycleReceipt = {
  packageId: typeof SM_001_MONTHLY_PROOF_PACKAGE_ID;
  wrapperVersion: typeof SM_001_MONTHLY_WRAPPER_VERSION;
  skuId: DesignRendererSm001MonthlySku;
  campaignId: string;
  productionCycleId: string;
  cycleStartDate: string;
  cycleEndDate: string;
  monthlyContentFocus: string;
  plannedPostCount: Sm001PlannedPostCount;
  productionFingerprint: string;
  artifactRootRel: string;
  campaignSetRenderVersion: number;
  sm001Identity: Sm001SetIdentity;
  renderedAt: string;
};

export type Sm001MonthlyPipelineResult =
  | {
      ok: true;
      verdict: "SM_001_MONTHLY_RENDERER_PROOF_PASS" | "SM_001_MONTHLY_RENDERER_JOB_PASS";
      invocationOutcome: "RENDERED" | "ALREADY_RENDERED";
      outputMode: Sm001MonthlyProjectTruth["outputMode"];
      productionFingerprint: string;
      receipt: Sm001MonthlyCycleReceipt;
      identity: Sm001SetIdentity;
      artifactRootRel: string;
    }
  | {
      ok: false;
      verdict: "SM_001_MONTHLY_RENDERER_PROOF_FAIL" | "SM_001_MONTHLY_RENDERER_JOB_FAIL";
      failureCode: Sm001MonthlyFailureCode;
      message: string;
      outputMode: Sm001MonthlyProjectTruth["outputMode"];
      productionCycleId?: string;
      plannedPostCount?: Sm001PlannedPostCount;
    };
