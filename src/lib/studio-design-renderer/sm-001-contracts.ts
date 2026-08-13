/**
 * sm-001 proof contract — square-only executable plate for this proof.
 * Product contract plate remains deferred; technical fulfillment is square.
 */

import {
  DESIGN_RENDERER_SM_001_SKU,
  SM_001_PLANNED_POST_COUNTS,
  SM_001_SQUARE_PLATE,
  type DesignRendererSm001Sku,
  type Sm001PlateId,
  type Sm001PlannedPostCount,
} from "./sm-001-types";

export const SM_001_PROOF_CONTRACT = {
  skuId: DESIGN_RENDERER_SM_001_SKU,
  plannedPostCounts: SM_001_PLANNED_POST_COUNTS,
  squareOnlyExecutable: true,
  squarePlate: {
    plateId: SM_001_SQUARE_PLATE.plateId,
    widthPx: SM_001_SQUARE_PLATE.widthPx,
    heightPx: SM_001_SQUARE_PLATE.heightPx,
  },
  portraitVariantsAuthorized: false,
  tiktokVariantsAuthorized: false,
  captionsRequired: true,
  postingOrderRequired: true,
  calendarManifestRequired: true,
  wholeSetVersionsTogether: true,
  setIncompleteUnlessAllPass: true,
  plannedPostCountSelectedBeforeExecution: true,
  qaCannotShrinkPlannedPostCount: true,
  layoutTemplatesAreCustomerContract: false,
  /**
   * INTAKE-TRUTH-1: live campaign truth resolves the full Launch Set structure
   * — Studio-selected plannedPostCount ∈ {4,5,6}, member assignment, square
   * plate, posting order + calendar requirement, campaign timing constraints.
   * Structure only; dispatch stays closed.
   */
  liveIntakeSetStructureResolved: true,
  layoutTemplatesAreCustomerIntakeFields: false,
  plannedPostCountIsCustomerIntakeField: false,
  customerPostingDateQuestionsAuthorized: false,
  /**
   * SM-001-DISPATCH-HOOK-1 (Owner-authorized): sm-001 `primaryTool` is remapped
   * to the Studio Design Renderer and the dd:{jobId} hook + observer lane are
   * wired for sm-001 only. `sm-001-monthly` stays on the Canva baseline.
   */
  primaryToolRemapAuthorized: true,
  dispatchHookAuthorized: true,
  canvaUsedInProof: false,
  makeUsedInProof: false,
  ownerRoutineResponsibility: "NONE",
  dimensionTolerancePx: 40,
  note:
    "sm-001: plannedPostCount ∈ {4,5,6} selected before execution; square-only executable plate; Studio captions; posting order; advisory schedule manifest with date governance; Canva not on the fulfillment spine for this SKU; Make unused; Owner routine NONE. INTAKE-TRUTH-1 resolves live set structure — layout templates, plate, and N stay Studio production decisions. DISPATCH-HOOK-1 wires the Owner-independent Machine path for sm-001 only; sm-001-monthly remains on Canva.",
} as const;

export function isDesignRendererSm001Sku(
  skuId: string,
): skuId is DesignRendererSm001Sku {
  return skuId === DESIGN_RENDERER_SM_001_SKU;
}

export function isSm001PlannedPostCount(
  n: number,
): n is Sm001PlannedPostCount {
  return (SM_001_PLANNED_POST_COUNTS as readonly number[]).includes(n);
}

export function resolveSm001ExecutablePlate(plateId: string): {
  plateId: Sm001PlateId;
  widthPx: number;
  heightPx: number;
} {
  if (plateId === SM_001_SQUARE_PLATE.plateId) {
    return { ...SM_001_SQUARE_PLATE };
  }
  throw new Error(
    `INVALID_PLATE: sm-001 proof executable path is square-only (${SM_001_SQUARE_PLATE.plateId}); got ${plateId}. Portrait/TikTok not authorized in this proof.`,
  );
}
