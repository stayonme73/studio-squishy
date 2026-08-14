/**
 * STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PROOF-1
 * Cycle-keyed wrapper around sealed sm-001. Consumes cycle identity; never mints.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { DESIGN_RENDERER_SM_001_SKU } from "./sm-001-types";
import type { Sm001ProjectTruth, Sm001SetIdentity } from "./sm-001-types";
import { runSm001RendererPipeline } from "./sm-001-pipeline";
import { isDesignRendererSm001MonthlySku } from "./sm-001-monthly-contracts";
import {
  assertNeverMintsCycleId,
  intersectCycleWindowWithCampaignTiming,
  sanitizeProductionCycleIdForPath,
  validateSm001MonthlyCycleIdentity,
  validateSm001MonthlyPlannedPostCount,
} from "./sm-001-monthly-cycle";
import { fingerprintSm001MonthlyFromTruth } from "./sm-001-monthly-fingerprint";
import { SM_001_MONTHLY_PROOF_ARTIFACT_ROOT } from "./sm-001-monthly-fixtures";
import {
  SM_001_MONTHLY_PROOF_PACKAGE_ID,
  SM_001_MONTHLY_WRAPPER_VERSION,
  type Sm001MonthlyCycleReceipt,
  type Sm001MonthlyPipelineResult,
  type Sm001MonthlyProjectTruth,
} from "./sm-001-monthly-types";

function fail(
  mode: Sm001MonthlyProjectTruth["outputMode"],
  code: Extract<Sm001MonthlyPipelineResult, { ok: false }>["failureCode"],
  message: string,
  extra?: Partial<Extract<Sm001MonthlyPipelineResult, { ok: false }>>,
): Sm001MonthlyPipelineResult {
  return {
    ok: false,
    verdict:
      mode === "customer"
        ? "SM_001_MONTHLY_RENDERER_JOB_FAIL"
        : "SM_001_MONTHLY_RENDERER_PROOF_FAIL",
    failureCode: code,
    message,
    outputMode: mode,
    ...extra,
  };
}

export function resolveSm001MonthlyCycleArtifactRoot(input: {
  campaignId: string;
  productionCycleId: string;
  baseRootRel?: string;
}): string {
  const base = input.baseRootRel ?? SM_001_MONTHLY_PROOF_ARTIFACT_ROOT;
  const camp = sanitizeProductionCycleIdForPath(input.campaignId);
  const cyc = sanitizeProductionCycleIdForPath(input.productionCycleId);
  return `${base}/campaigns/${camp}/cycles/${cyc}`;
}

function receiptPath(repoRoot: string, artifactRootRel: string): string {
  return path.join(repoRoot, artifactRootRel, "monthly-cycle-receipt.json");
}

function readReceipt(
  repoRoot: string,
  artifactRootRel: string,
): Sm001MonthlyCycleReceipt | null {
  const p = receiptPath(repoRoot, artifactRootRel);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Sm001MonthlyCycleReceipt;
  } catch {
    return null;
  }
}

function writeReceipt(
  repoRoot: string,
  artifactRootRel: string,
  receipt: Sm001MonthlyCycleReceipt,
): void {
  mkdirSync(path.join(repoRoot, artifactRootRel), { recursive: true });
  writeFileSync(
    receiptPath(repoRoot, artifactRootRel),
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );
}

function mapToSealedSm001Truth(
  truth: Sm001MonthlyProjectTruth,
  timing: {
    startDate?: string;
    endDate?: string;
    eventDate?: string;
    blackoutDates?: readonly string[];
  },
): Sm001ProjectTruth {
  const { campaignTimingConstraints: _drop, ...creative } = truth.creative;
  void _drop;
  return {
    ...creative,
    campaignId: truth.campaignId,
    jobId: truth.jobId,
    dispatchId: truth.dispatchId,
    skuId: DESIGN_RENDERER_SM_001_SKU,
    plannedPostCount: truth.plannedPostCount,
    plannedPostCountSelection: truth.plannedPostCountSelection,
    timingConstraints: timing,
    outputMode: truth.outputMode,
    proofScopeNote: truth.proofScopeNote,
  };
}

/**
 * Run the monthly cycle-keyed wrapper.
 * Does not mint productionCycleId. Does not remap catalog primaryTool.
 */
export async function runSm001MonthlyRendererPipeline(input: {
  repoRoot: string;
  truth: Sm001MonthlyProjectTruth;
  artifactRootRel?: string;
  /**
   * Proof-only: ask the wrapper to mint a cycle id — must FAIL CLOSED.
   * Never used in the success path.
   */
  requestedMint?: {
    fromCurrentMonth?: boolean;
    fromToday?: boolean;
    fromBillingMetadata?: boolean;
    fromCurrentCycleLabel?: boolean;
    fromPriorCycleId?: string;
  };
  /** Proof-only: attempt to treat another cycle's id as this cycle after render. */
  forceReusePriorCycleIdAsCurrent?: string;
  forceInvalidPlate?: boolean;
  forceDateOutsideWindow?: boolean;
}): Promise<Sm001MonthlyPipelineResult> {
  const mode = input.truth.outputMode;

  if (!isDesignRendererSm001MonthlySku(input.truth.skuId)) {
    return fail(
      mode,
      "SKU_NOT_SUPPORTED",
      `SKU ${input.truth.skuId} not in sm-001-monthly wrapper scope`,
    );
  }

  const mintGate = assertNeverMintsCycleId({
    requestedMint: input.requestedMint,
  });
  if (!mintGate.ok) {
    return fail(mode, mintGate.code, mintGate.message);
  }

  if (input.forceReusePriorCycleIdAsCurrent) {
    return fail(
      mode,
      "PRIOR_CYCLE_REUSE_FORBIDDEN",
      `Refusing to reuse prior-cycle identity ${input.forceReusePriorCycleIdAsCurrent} as the current cycle`,
      { productionCycleId: input.forceReusePriorCycleIdAsCurrent },
    );
  }

  const cycleGate = validateSm001MonthlyCycleIdentity(input.truth.cycle);
  if (!cycleGate.ok) {
    return fail(mode, cycleGate.code, cycleGate.message);
  }
  const cycle = cycleGate.cycle;

  const nGate = validateSm001MonthlyPlannedPostCount(
    input.truth.plannedPostCount,
  );
  if (!nGate.ok) {
    return fail(mode, nGate.code, nGate.message, {
      productionCycleId: cycle.productionCycleId,
    });
  }

  if (
    input.truth.plannedPostCountSelection?.plannedPostCount !==
    input.truth.plannedPostCount
  ) {
    return fail(
      mode,
      "INVALID_PLANNED_POST_COUNT",
      "plannedPostCountSelection must match locked per-cycle plannedPostCount",
      {
        productionCycleId: cycle.productionCycleId,
        plannedPostCount: input.truth.plannedPostCount,
      },
    );
  }

  // Stale-truth: creative focus must bind to this cycle's focus (no silent A→B carry).
  if (
    !input.truth.creative.body.includes(cycle.monthlyContentFocus) &&
    !input.truth.creative.headline.includes(cycle.monthlyContentFocus)
  ) {
    return fail(
      mode,
      "STALE_CYCLE_TRUTH",
      "Creative truth does not carry this cycle's monthlyContentFocus — refuse silent prior-cycle carry-forward",
      { productionCycleId: cycle.productionCycleId },
    );
  }

  const timingGate = intersectCycleWindowWithCampaignTiming({
    cycleStartDate: cycle.cycleStartDate,
    cycleEndDate: cycle.cycleEndDate,
    campaignTiming: input.truth.creative.campaignTimingConstraints,
  });
  if (!timingGate.ok) {
    return fail(mode, timingGate.code, timingGate.message, {
      productionCycleId: cycle.productionCycleId,
      plannedPostCount: input.truth.plannedPostCount,
    });
  }

  const artifactRootRel =
    input.artifactRootRel ??
    resolveSm001MonthlyCycleArtifactRoot({
      campaignId: input.truth.campaignId,
      productionCycleId: cycle.productionCycleId,
    });

  const existing = readReceipt(input.repoRoot, artifactRootRel);
  if (existing) {
    // CY-7: productionCycleId immutable; metadata must not mutate in place.
    if (
      existing.productionCycleId === cycle.productionCycleId &&
      (existing.cycleStartDate !== cycle.cycleStartDate ||
        existing.cycleEndDate !== cycle.cycleEndDate)
    ) {
      return fail(
        mode,
        "CYCLE_IDENTITY_IMMUTABLE",
        "productionCycleId is immutable once production began — create a new cycle record for date/backfill changes; do not mutate in place",
        { productionCycleId: cycle.productionCycleId },
      );
    }
    if (
      existing.productionCycleId === cycle.productionCycleId &&
      existing.monthlyContentFocus !== cycle.monthlyContentFocus
    ) {
      return fail(
        mode,
        "CYCLE_IDENTITY_IMMUTABLE",
        "Cycle focus cannot mutate in place under the same productionCycleId — open a new cycle record",
        { productionCycleId: cycle.productionCycleId },
      );
    }
  }

  const preFingerprint = fingerprintSm001MonthlyFromTruth(
    {
      ...input.truth,
      cycle,
    },
    timingGate.timing,
  );

  if (
    existing &&
    existing.productionCycleId === cycle.productionCycleId &&
    existing.productionFingerprint === preFingerprint
  ) {
    return {
      ok: true,
      verdict:
        mode === "customer"
          ? "SM_001_MONTHLY_RENDERER_JOB_PASS"
          : "SM_001_MONTHLY_RENDERER_PROOF_PASS",
      invocationOutcome: "ALREADY_RENDERED",
      outputMode: mode,
      productionFingerprint: preFingerprint,
      receipt: existing,
      identity: existing.sm001Identity,
      artifactRootRel,
    };
  }

  const sm001Truth = mapToSealedSm001Truth(
    { ...input.truth, cycle },
    timingGate.timing,
  );

  const engine = await runSm001RendererPipeline({
    repoRoot: input.repoRoot,
    truth: sm001Truth,
    artifactRootRel,
    forceInvalidPlate: input.forceInvalidPlate,
    forceDateOutsideWindow: input.forceDateOutsideWindow,
  });

  if (!engine.ok) {
    const plateFail =
      engine.failureCode === "INVALID_PLATE" ||
      /plate|portrait/i.test(engine.message);
    return fail(
      mode,
      plateFail ? "INVALID_PLATE" : "ENGINE_FAILURE",
      `Sealed sm-001 engine refused: ${engine.failureCode}: ${engine.message}`,
      {
        productionCycleId: cycle.productionCycleId,
        plannedPostCount: input.truth.plannedPostCount,
      },
    );
  }

  const identity = engine.identity as Sm001SetIdentity;
  const productionFingerprint = fingerprintSm001MonthlyFromTruth(
    { ...input.truth, cycle },
    timingGate.timing,
  );

  // If material changed within cycle, fingerprint differs from prior → new receipt / vN.
  const receipt: Sm001MonthlyCycleReceipt = {
    packageId: SM_001_MONTHLY_PROOF_PACKAGE_ID,
    wrapperVersion: SM_001_MONTHLY_WRAPPER_VERSION,
    skuId: "sm-001-monthly",
    campaignId: input.truth.campaignId,
    productionCycleId: cycle.productionCycleId,
    cycleStartDate: cycle.cycleStartDate,
    cycleEndDate: cycle.cycleEndDate,
    monthlyContentFocus: cycle.monthlyContentFocus,
    plannedPostCount: input.truth.plannedPostCount,
    productionFingerprint,
    artifactRootRel,
    campaignSetRenderVersion: identity.campaignSetRenderVersion,
    sm001Identity: identity,
    renderedAt: new Date().toISOString(),
  };
  writeReceipt(input.repoRoot, artifactRootRel, receipt);

  // Mirror wrapper identity pointer beside sealed current-identity.
  writeFileSync(
    path.join(input.repoRoot, artifactRootRel, "monthly-cycle-identity.json"),
    `${JSON.stringify(
      {
        skuId: "sm-001-monthly",
        campaignId: input.truth.campaignId,
        productionCycleId: cycle.productionCycleId,
        cycleStartDate: cycle.cycleStartDate,
        cycleEndDate: cycle.cycleEndDate,
        monthlyContentFocus: cycle.monthlyContentFocus,
        plannedPostCount: input.truth.plannedPostCount,
        productionFingerprint,
        campaignSetRenderVersion: identity.campaignSetRenderVersion,
        sealedEngineSkuId: DESIGN_RENDERER_SM_001_SKU,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    ok: true,
    verdict:
      mode === "customer"
        ? "SM_001_MONTHLY_RENDERER_JOB_PASS"
        : "SM_001_MONTHLY_RENDERER_PROOF_PASS",
    invocationOutcome: "RENDERED",
    outputMode: mode,
    productionFingerprint,
    receipt,
    identity,
    artifactRootRel,
  };
}

export async function runSm001MonthlyProofPipeline(input: {
  repoRoot: string;
  truth: Sm001MonthlyProjectTruth;
  artifactRootRel?: string;
  requestedMint?: Parameters<
    typeof runSm001MonthlyRendererPipeline
  >[0]["requestedMint"];
  forceReusePriorCycleIdAsCurrent?: string;
  forceInvalidPlate?: boolean;
  forceDateOutsideWindow?: boolean;
}): Promise<Sm001MonthlyPipelineResult> {
  return runSm001MonthlyRendererPipeline(input);
}
