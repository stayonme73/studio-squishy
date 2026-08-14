/**
 * STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-HOOK-1
 *
 * Thin dd:{jobId} invoke for sm-001-monthly only.
 * Consumes explicit machineDispatchTarget productionCycleId + locked N.
 * Never selects cycles, mints cycles, or chooses N.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_SM_001_MONTHLY_SKU,
  runSm001MonthlyRendererPipeline,
} from "@/lib/studio-design-renderer";
import type {
  Sm001MonthlyPipelineResult,
  Sm001SetIdentity,
} from "@/lib/studio-design-renderer";

import {
  customerMonthlyCycleArtifactRootRel,
  mapSm001MonthlyProjectTruthFromJob,
} from "./map-sm-001-monthly-job-truth";
import type { JobDispatchRecord } from "./types";

export const SM_001_MONTHLY_DISPATCH_HOOK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-HOOK-1" as const;

export type Sm001MonthlyDispatchInvocationOutcome =
  | "RENDERED"
  | "ALREADY_RENDERED";

export type Sm001MonthlyDispatchHookResult =
  | {
      ok: true;
      packageId: typeof SM_001_MONTHLY_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: Sm001MonthlyDispatchInvocationOutcome;
      dispatchId: string;
      skuId: typeof DESIGN_RENDERER_SM_001_MONTHLY_SKU;
      productionCycleId: string;
      plannedPostCount: number;
      pipeline: Extract<Sm001MonthlyPipelineResult, { ok: true }>;
      identity: Sm001SetIdentity;
      artifactRootRel: string;
      receiptRelativePath: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    }
  | {
      ok: false;
      packageId: typeof SM_001_MONTHLY_DISPATCH_HOOK_PACKAGE_ID;
      dispatchId?: string;
      skuId?: string;
      productionCycleId?: string;
      failureCode: string;
      message: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    };

function baseMeta() {
  return {
    packageId: SM_001_MONTHLY_DISPATCH_HOOK_PACKAGE_ID,
    ownerRoutineProduction: "NONE" as const,
    canvaRequired: false as const,
    makeRequired: false as const,
  };
}

/** Exact locked N — never shrink, never partial set. */
function completeSetFailure(
  identity: Sm001SetIdentity,
  plannedPostCount: number,
): string | null {
  if (identity.plannedPostCount !== plannedPostCount) {
    return `Rendered set declares plannedPostCount ${identity.plannedPostCount} but the cycle locked ${plannedPostCount}`;
  }
  if (identity.assets.length !== plannedPostCount) {
    return `Rendered ${identity.assets.length}/${plannedPostCount} posts`;
  }
  if (identity.captions.length !== plannedPostCount) {
    return `Rendered ${identity.captions.length}/${plannedPostCount} captions`;
  }
  if (identity.postingOrder.length !== plannedPostCount) {
    return `Rendered ${identity.postingOrder.length}/${plannedPostCount} posting-order entries`;
  }
  if (identity.calendar?.entries?.length !== plannedPostCount) {
    return `Rendered ${identity.calendar?.entries?.length ?? 0}/${plannedPostCount} schedule-manifest entries`;
  }
  return null;
}

function calendarOutsideCycle(
  identity: Sm001SetIdentity,
  cycleStartDate: string,
  cycleEndDate: string,
): string | null {
  const entries = identity.calendar?.entries ?? [];
  for (const entry of entries) {
    const d = entry.suggestedDate;
    if (!d) continue;
    if (d < cycleStartDate || d > cycleEndDate) {
      return `Calendar date ${d} falls outside cycle window ${cycleStartDate}–${cycleEndDate}`;
    }
  }
  return null;
}

/**
 * Invoke the proven sm-001-monthly cycle wrapper for one ready dispatch record.
 */
export async function invokeSm001MonthlyDispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  forceInvalidPlate?: boolean;
  forceDateOutsideWindow?: boolean;
}): Promise<Sm001MonthlyDispatchHookResult> {
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_SM_001_MONTHLY_SKU) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SKU_NOT_SUPPORTED",
      message: `sm-001-monthly dispatch hook refuses SKU ${record.skuId}`,
    };
  }

  if (!record.executionIdentityReady || record.status !== "EXECUTION_IDENTITY_READY") {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "DISPATCH_NOT_READY",
      message: `Dispatch ${record.dispatchId} is not EXECUTION_IDENTITY_READY`,
    };
  }

  const toolId = record.requirements?.primaryTool.toolId;
  if (toolId !== "studio_design_renderer") {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "EXECUTOR_MISMATCH",
      message: `Expected primaryTool studio_design_renderer, got ${toolId ?? "none"}`,
    };
  }

  const mapped = mapSm001MonthlyProjectTruthFromJob({
    repoRoot: input.repoRoot,
    campaign: input.campaign,
    dispatchRecord: record,
    materials: input.materials,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  });
  if (!mapped.ok) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      productionCycleId: record.productionCycleId,
      failureCode: mapped.code,
      message: mapped.message,
    };
  }

  const { truth } = mapped;
  const plannedPostCount = truth.plannedPostCount;
  const artifactRootRel = customerMonthlyCycleArtifactRootRel(
    truth.campaignId,
    truth.cycle.productionCycleId,
  );

  const pipeline = await runSm001MonthlyRendererPipeline({
    repoRoot: input.repoRoot,
    truth,
    artifactRootRel,
    forceInvalidPlate: input.forceInvalidPlate,
    forceDateOutsideWindow: input.forceDateOutsideWindow,
  });

  if (!pipeline.ok) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      productionCycleId: truth.cycle.productionCycleId,
      failureCode: pipeline.failureCode,
      message: pipeline.message,
    };
  }

  const incomplete = completeSetFailure(pipeline.identity, plannedPostCount);
  if (incomplete) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      productionCycleId: truth.cycle.productionCycleId,
      failureCode: "PARTIAL_SET_FAILURE",
      message: `Fail closed — monthly set is complete or it is not delivered: ${incomplete}`,
    };
  }

  const calendarFail = calendarOutsideCycle(
    pipeline.identity,
    truth.cycle.cycleStartDate,
    truth.cycle.cycleEndDate,
  );
  if (calendarFail) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      productionCycleId: truth.cycle.productionCycleId,
      failureCode: "DATE_GOVERNANCE_FAILURE",
      message: calendarFail,
    };
  }

  return {
    ok: true,
    ...baseMeta(),
    invocationOutcome: pipeline.invocationOutcome,
    dispatchId: record.dispatchId,
    skuId: DESIGN_RENDERER_SM_001_MONTHLY_SKU,
    productionCycleId: truth.cycle.productionCycleId,
    plannedPostCount,
    pipeline,
    identity: pipeline.identity,
    artifactRootRel,
    receiptRelativePath: `${artifactRootRel}/monthly-cycle-receipt.json`,
  };
}
