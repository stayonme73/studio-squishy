/**
 * STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PROOF-1 contract +
 * SM-001-MONTHLY-DISPATCH-HOOK-1 remap/dispatch authorization.
 */

import { DESIGN_RENDERER_SM_001_MONTHLY_SKU } from "./sm-001-monthly-types";
import { SM_001_PLANNED_POST_COUNTS } from "./sm-001-types";

export const SM_001_MONTHLY_PROOF_CONTRACT = {
  skuId: DESIGN_RENDERER_SM_001_MONTHLY_SKU,
  deltaClass: "A",
  plannedPostCounts: SM_001_PLANNED_POST_COUNTS,
  reusesSealedSm001Engine: true,
  forksMonthlyRendererFamily: false,
  rendererMintsProductionCycleId: false,
  cycleIdentityRequiredBeforeProduction: true,
  productionCycleIdInFingerprint: true,
  productionCycleIdImmutableOnceProductionBegins: true,
  metadataChangeRequiresNewCycleRecord: true,
  currentCycleLabelNeverAuthoritative: true,
  priorCyclesImmutable: true,
  cycleScopedAlreadyRendered: true,
  cycleScopedWholeSetVersioning: true,
  calendarConstrainedToCycleWindow: true,
  stalePriorCycleTruthForbidden: true,
  lateBackfillRequiresNewCycle: true,
  /** Authorized by SM-001-MONTHLY-DISPATCH-HOOK-1 (after PROOF-1 wrapper). */
  primaryToolRemapAuthorized: true,
  dispatchHookAuthorized: true,
  canvaUsedInProof: false,
  makeUsedInProof: false,
  ownerRoutineResponsibility: "NONE",
  note:
    "sm-001-monthly: cycle-keyed wrapper around sealed sm-001. Consumes authoritative productionCycleId; never mints. Studio Design Renderer is the fulfillment spine (DISPATCH-HOOK-1). Make unused. Owner routine NONE.",
} as const;

export function isDesignRendererSm001MonthlySku(
  skuId: string,
): skuId is typeof DESIGN_RENDERER_SM_001_MONTHLY_SKU {
  return skuId === DESIGN_RENDERER_SM_001_MONTHLY_SKU;
}
