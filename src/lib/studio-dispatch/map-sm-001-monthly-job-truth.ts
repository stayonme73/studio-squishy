/**
 * Map campaign + explicit monthly cycle target → Sm001MonthlyProjectTruth.
 * Consumes locked N and cycle identity — never selects or repairs them.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_SM_001_MONTHLY_SKU,
  DESIGN_RENDERER_SM_001_SKU,
  assignSm001MembersForCount,
  sanitizeProductionCycleIdForPath,
} from "@/lib/studio-design-renderer";
import type { Sm001MonthlyProjectTruth } from "@/lib/studio-design-renderer";
import {
  evaluateSm001MonthlyDispatchTargetReadiness,
  findProductionCycleById,
  listSm001MonthlyProductionCycles,
} from "@/lib/studio-monthly-production-cycle";

import { mapSm001ProjectTruthFromJob } from "./map-sm-001-job-truth";
import type { JobDispatchRecord } from "./types";

export const SM_001_MONTHLY_DISPATCH_WIRING_SCOPE_NOTE =
  "STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-HOOK-1 — Owner-independent Machine path. " +
  "Consumes explicit machineDispatchTarget productionCycleId + locked per-cycle plannedPostCount. " +
  "Pay-per-cycle; no automatic renewal; Canva not on the fulfillment spine; Make not required; " +
  "Owner routine production NONE. Renderer does not mint cycles or select N.";

export type Sm001MonthlyTruthMapResult =
  | { ok: true; truth: Sm001MonthlyProjectTruth }
  | {
      ok: false;
      code: string;
      message: string;
    };

export function customerMonthlyCycleArtifactRootRel(
  campaignId: string,
  productionCycleId: string,
): string {
  const camp = sanitizeProductionCycleIdForPath(campaignId);
  const cyc = sanitizeProductionCycleIdForPath(productionCycleId);
  return `data/campaign-design-artifacts/${camp}/cycles/${cyc}`;
}

/**
 * Build customer monthly truth from the named targeted cycle only.
 */
export function mapSm001MonthlyProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): Sm001MonthlyTruthMapResult {
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_SM_001_MONTHLY_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `sm-001-monthly dispatch mapper refuses SKU ${record.skuId}`,
    };
  }

  const productionCycleId = record.productionCycleId?.trim();
  if (!productionCycleId) {
    return {
      ok: false,
      code: "MISSING_PRODUCTION_CYCLE_ID",
      message:
        "JobDispatchRecord.productionCycleId mirror is required — no implicit cycle selection",
    };
  }

  const targetedCount = listSm001MonthlyProductionCycles(input.campaign).filter(
    (row) => row.machineDispatchTarget === true,
  ).length;
  if (targetedCount > 1) {
    return {
      ok: false,
      code: "DUAL_TARGET",
      message: "Exactly one machineDispatchTarget cycle is allowed per campaign+SKU",
    };
  }

  const readiness = evaluateSm001MonthlyDispatchTargetReadiness(
    input.campaign,
    productionCycleId,
  );
  if (!readiness.ready) {
    return {
      ok: false,
      code: readiness.error.toUpperCase(),
      message: readiness.message,
    };
  }

  const cycle = findProductionCycleById(input.campaign, productionCycleId);
  if (!cycle) {
    return {
      ok: false,
      code: "CYCLE_NOT_FOUND",
      message: "Targeted productionCycleId is missing from campaign cycle records",
    };
  }
  if (
    !cycle.plannedPostCount ||
    !cycle.plannedPostCountSelection ||
    cycle.plannedPostCountSelection.plannedPostCount !== cycle.plannedPostCount
  ) {
    return {
      ok: false,
      code: "INVALID_PLANNED_POST_COUNT",
      message: "Targeted cycle must carry a durable locked plannedPostCount ∈ {4,5,6}",
    };
  }

  const focus = cycle.monthlyContentFocus.trim();
  const priorAnswers = input.campaign.routeMapIntake?.answers ?? {};
  const postsAbout = String(
    priorAnswers.postsAbout ?? priorAnswers.socialPostsPurposeChoice ?? "",
  ).trim();
  const augmentedPostsAbout = [
    postsAbout,
    `${cycle.cycleStartDate} – ${cycle.cycleEndDate}`,
    focus,
  ]
    .filter(Boolean)
    .join(". ");

  const campaignForMap: CampaignRecord = {
    ...input.campaign,
    routeMapIntake: {
      submittedAt: input.campaign.routeMapIntake?.submittedAt ?? new Date().toISOString(),
      answers: {
        ...priorAnswers,
        postsAbout: augmentedPostsAbout,
      },
    },
  };

  // Reuse sealed sm-001 intake parsing for creative fields only — N comes from cycle lock.
  const syntheticRecord: JobDispatchRecord = {
    ...record,
    skuId: DESIGN_RENDERER_SM_001_SKU,
  };
  const mapped = mapSm001ProjectTruthFromJob({
    repoRoot: input.repoRoot,
    campaign: campaignForMap,
    dispatchRecord: syntheticRecord,
    materials: input.materials,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  });
  if (!mapped.ok) {
    return {
      ok: false,
      code: mapped.code,
      message: mapped.message,
    };
  }

  const plannedPostCount = cycle.plannedPostCount;
  const assets = assignSm001MembersForCount(plannedPostCount);
  if (assets.length !== plannedPostCount) {
    return {
      ok: false,
      code: "COUNT_MISMATCH",
      message: `Assigned ${assets.length} members for locked plannedPostCount ${plannedPostCount}`,
    };
  }

  const dateWindow = `${cycle.cycleStartDate} – ${cycle.cycleEndDate}`;
  const headline = mapped.truth.headline.includes(focus)
    ? mapped.truth.headline
    : `${mapped.truth.headline} — ${focus}`.slice(0, 160);
  const body = mapped.truth.body.includes(focus)
    ? mapped.truth.body
    : `${mapped.truth.body} Cycle focus: ${focus}`.slice(0, 400);

  const {
    campaignId: _c,
    jobId: _j,
    dispatchId: _d,
    skuId: _s,
    plannedPostCount: _n,
    plannedPostCountSelection: _sel,
    timingConstraints: campaignTiming,
    assets: _a,
    proofScopeNote: _p,
    ...creativeBase
  } = mapped.truth;
  void _c;
  void _j;
  void _d;
  void _s;
  void _n;
  void _sel;
  void _a;
  void _p;

  const truth: Sm001MonthlyProjectTruth = {
    campaignId: input.campaign.campaignId,
    jobId: record.jobId,
    dispatchId: record.dispatchId,
    skuId: DESIGN_RENDERER_SM_001_MONTHLY_SKU,
    cycle: {
      productionCycleId: cycle.productionCycleId,
      cycleStartDate: cycle.cycleStartDate,
      cycleEndDate: cycle.cycleEndDate,
      monthlyContentFocus: focus,
    },
    plannedPostCount,
    plannedPostCountSelection: cycle.plannedPostCountSelection,
    creative: {
      ...creativeBase,
      headline,
      body,
      dateWindow,
      timingConstraints: {
        startDate: cycle.cycleStartDate,
        endDate: cycle.cycleEndDate,
      },
      campaignTimingConstraints: campaignTiming,
      assets,
      proofScopeNote: SM_001_MONTHLY_DISPATCH_WIRING_SCOPE_NOTE,
      label: `CUSTOMER JOB — sm-001-monthly cycle ${cycle.productionCycleId} N=${plannedPostCount}`,
      outputMode: "customer",
    },
    outputMode: "customer",
    proofScopeNote: SM_001_MONTHLY_DISPATCH_WIRING_SCOPE_NOTE,
  };

  return { ok: true, truth };
}
