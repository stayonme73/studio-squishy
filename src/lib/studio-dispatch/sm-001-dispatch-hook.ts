/**
 * STUDIO-OPERATING-DESIGN-SM-001-DISPATCH-HOOK-1
 *
 * Thin dd:{jobId} invoke for sm-001 only (Social Media Launch Set).
 * Idempotent for the same authoritative Launch Set fingerprint.
 * Locks: plannedPostCount ∈ {4,5,6} selected before execution · social-post-1…N ·
 * order 1–N · Studio layout templates · square-only · Studio captions ·
 * advisory schedule manifest with date governance. Success requires N/N posts,
 * N captions, N order entries, and N calendar entries — never a partial set.
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_SM_001_SKU,
  SM_001_RENDERER_VERSION,
  reasonSm001SetDeterministic,
  runSm001JobPipeline,
} from "@/lib/studio-design-renderer";
import type {
  Sm001RendererPipelineResult,
  Sm001SetIdentity,
  Sm001SetSpec,
} from "@/lib/studio-design-renderer";

import { customerArtifactRootRel } from "./map-flyer-job-truth";
import { mapSm001ProjectTruthFromJob } from "./map-sm-001-job-truth";
import {
  SM_001_DISPATCH_HOOK_PACKAGE_ID,
  acquireSm001RenderLockWithBriefWait,
  buildSm001IdempotencyKey,
  buildSm001IdempotencyTuple,
  findPartialSm001RenderState,
  findSuccessfulSm001RenderForFingerprint,
  writeImmutableSm001VersionReceipt,
  type Sm001DispatchHookReceipt,
} from "./sm-001-hook-idempotency";
import type { JobDispatchRecord } from "./types";

export { SM_001_DISPATCH_HOOK_PACKAGE_ID };

export type Sm001DispatchInvocationOutcome = "RENDERED" | "ALREADY_RENDERED";

export type Sm001DispatchHookResult =
  | {
      ok: true;
      packageId: typeof SM_001_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: Sm001DispatchInvocationOutcome;
      dispatchId: string;
      skuId: typeof DESIGN_RENDERER_SM_001_SKU;
      pipeline?: Extract<Sm001RendererPipelineResult, { ok: true }>;
      identity: Sm001SetIdentity;
      designSpec: Sm001SetSpec;
      plannedPostCount: number;
      receiptRelativePath: string;
      idempotencyKey: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    }
  | {
      ok: false;
      packageId: typeof SM_001_DISPATCH_HOOK_PACKAGE_ID;
      dispatchId?: string;
      skuId?: string;
      failureCode: string;
      message: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    };

function baseMeta() {
  return {
    packageId: SM_001_DISPATCH_HOOK_PACKAGE_ID,
    ownerRoutineProduction: "NONE" as const,
    canvaRequired: false as const,
    makeRequired: false as const,
  };
}

function versionReceiptRel(
  artifactRootRel: string,
  campaignSetRenderVersion: number,
): string {
  return `${artifactRootRel}/renders/v${campaignSetRenderVersion}/dispatch-hook-receipt.json`;
}

function ensureVersionReceiptPresent(input: {
  repoRoot: string;
  artifactRootRel: string;
  receipt: Sm001DispatchHookReceipt;
  identity: Sm001SetIdentity;
}): string {
  const rel = versionReceiptRel(
    input.artifactRootRel,
    input.identity.campaignSetRenderVersion,
  );
  if (existsSync(path.join(input.repoRoot, rel))) return rel;

  writeImmutableSm001VersionReceipt({
    repoRoot: input.repoRoot,
    artifactRootRel: input.artifactRootRel,
    receipt: {
      ...input.receipt,
      packageId: SM_001_DISPATCH_HOOK_PACKAGE_ID,
      status: "success",
      qaOk: true,
      plannedPostCount: input.identity.plannedPostCount,
      campaignSetRenderVersion: input.identity.campaignSetRenderVersion,
      identity: input.identity,
      postPngShas: input.identity.assets.map((a) => a.pngContentSha256),
      captionSetFingerprint: input.identity.captionSetFingerprint,
      postingOrderFingerprint: input.identity.postingOrderFingerprint,
      calendarFingerprint: input.identity.calendarFingerprint,
    },
    campaignSetRenderVersion: input.identity.campaignSetRenderVersion,
  });
  return rel;
}

function alreadyRenderedResult(input: {
  dispatchId: string;
  identity: Sm001SetIdentity;
  designSpec: Sm001SetSpec;
  receiptRelativePath: string;
  idempotencyKey: string;
}): Sm001DispatchHookResult {
  return {
    ok: true,
    ...baseMeta(),
    invocationOutcome: "ALREADY_RENDERED",
    dispatchId: input.dispatchId,
    skuId: DESIGN_RENDERER_SM_001_SKU,
    identity: input.identity,
    designSpec: input.designSpec,
    plannedPostCount: input.identity.plannedPostCount,
    receiptRelativePath: input.receiptRelativePath,
    idempotencyKey: input.idempotencyKey,
  };
}

/** The Launch Set is complete or it is not delivered — N is never shrunk to fit. */
function completeSetFailure(
  identity: Sm001SetIdentity,
  plannedPostCount: number,
): string | null {
  if (identity.plannedPostCount !== plannedPostCount) {
    return `Rendered set declares plannedPostCount ${identity.plannedPostCount} but the job locked ${plannedPostCount}`;
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

/**
 * Invoke the proven sm-001 Launch Set renderer for one ready dispatch record.
 * Same fingerprint → ALREADY_RENDERED (no new vN).
 */
export async function invokeSm001DispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  /** Test-only fail-closed injectors — never used in production observers. */
  forceQaFail?: boolean;
  forcePartialExportFail?: boolean;
  forceSetConsistencyFail?: boolean;
  forceCaptionBindFail?: boolean;
  forceMissingCaption?: boolean;
  forceMissingCalendarEntry?: boolean;
  forceBadCalendarBinding?: boolean;
  forceDateOutsideWindow?: boolean;
  forceCountMismatch?: boolean;
  forceInvalidPlate?: boolean;
}): Promise<Sm001DispatchHookResult> {
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_SM_001_SKU) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SKU_NOT_SUPPORTED",
      message: `sm-001 dispatch hook refuses SKU ${record.skuId} — sm-001 only`,
    };
  }

  if (!record.executionIdentityReady) {
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

  const mapped = mapSm001ProjectTruthFromJob({
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
      failureCode: mapped.code,
      message: mapped.message,
    };
  }

  const plannedPostCount = mapped.truth.plannedPostCount;
  const artifactRootRel = customerArtifactRootRel(
    input.campaign.campaignId,
    record.dispatchId,
  );

  let designSpec: Sm001SetSpec;
  try {
    designSpec = reasonSm001SetDeterministic(mapped.truth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: msg.startsWith("MISSING_REQUIRED_TRUTH")
        ? "MISSING_REQUIRED_TRUTH"
        : msg.startsWith("MISSING_REQUIRED_MATERIAL")
          ? "MISSING_REQUIRED_MATERIAL"
          : msg.startsWith("INVALID_PLATE")
            ? "INVALID_PLATE"
            : msg.startsWith("INVALID_PLANNED_POST_COUNT")
              ? "INVALID_PLANNED_POST_COUNT"
              : msg.startsWith("COUNT_MISMATCH")
                ? "COUNT_MISMATCH"
                : "RENDER_FAILURE",
      message: msg,
    };
  }

  const tuple = buildSm001IdempotencyTuple({
    dispatchId: record.dispatchId,
    jobId: record.jobId,
    skuId: record.skuId,
    spec: designSpec,
    timingConstraints: mapped.truth.timingConstraints,
  });
  const idempotencyKey = buildSm001IdempotencyKey(tuple);

  const lookup = () =>
    findSuccessfulSm001RenderForFingerprint({
      repoRoot: input.repoRoot,
      artifactRootRel,
      tuple,
    });

  const existing = lookup();
  if (existing.found) {
    return alreadyRenderedResult({
      dispatchId: record.dispatchId,
      identity: existing.identity,
      designSpec,
      receiptRelativePath: ensureVersionReceiptPresent({
        repoRoot: input.repoRoot,
        artifactRootRel,
        receipt: existing.receipt,
        identity: existing.identity,
      }),
      idempotencyKey,
    });
  }

  const partial = findPartialSm001RenderState({
    repoRoot: input.repoRoot,
    artifactRootRel,
  });
  if (partial.partial) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "PARTIAL_SET_FAILURE",
      message: `Fail closed on partial sm-001 Launch Set render state: ${partial.detail}`,
    };
  }

  const lock = await acquireSm001RenderLockWithBriefWait({
    repoRoot: input.repoRoot,
    artifactRootRel,
    idempotencyKey,
    lookup,
  });

  if (!lock.ok) {
    if (lock.already) {
      return alreadyRenderedResult({
        dispatchId: record.dispatchId,
        identity: lock.already.identity,
        designSpec,
        receiptRelativePath: ensureVersionReceiptPresent({
          repoRoot: input.repoRoot,
          artifactRootRel,
          receipt: lock.already.receipt,
          identity: lock.already.identity,
        }),
        idempotencyKey,
      });
    }
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "CONCURRENT_IN_PROGRESS",
      message:
        "Another invocation holds the render lock for this fingerprint — refuse conflicting mint",
    };
  }

  try {
    const again = lookup();
    if (again.found) {
      return alreadyRenderedResult({
        dispatchId: record.dispatchId,
        identity: again.identity,
        designSpec,
        receiptRelativePath: ensureVersionReceiptPresent({
          repoRoot: input.repoRoot,
          artifactRootRel,
          receipt: again.receipt,
          identity: again.identity,
        }),
        idempotencyKey,
      });
    }

    const pipeline = await runSm001JobPipeline({
      repoRoot: input.repoRoot,
      truth: mapped.truth,
      artifactRootRel,
      specOverride: designSpec,
      forceQaFail: input.forceQaFail,
      forcePartialExportFail: input.forcePartialExportFail,
      forceSetConsistencyFail: input.forceSetConsistencyFail,
      forceCaptionBindFail: input.forceCaptionBindFail,
      forceMissingCaption: input.forceMissingCaption,
      forceMissingCalendarEntry: input.forceMissingCalendarEntry,
      forceBadCalendarBinding: input.forceBadCalendarBinding,
      forceDateOutsideWindow: input.forceDateOutsideWindow,
      forceCountMismatch: input.forceCountMismatch,
      forceInvalidPlate: input.forceInvalidPlate,
    });

    const failReceiptBase = {
      packageId: SM_001_DISPATCH_HOOK_PACKAGE_ID,
      idempotencyKey,
      dispatchId: record.dispatchId,
      jobId: record.jobId,
      campaignId: input.campaign.campaignId,
      skuId: record.skuId,
      plannedPostCount,
      sharedSpecFingerprint: tuple.sharedSpecFingerprint,
      materialFingerprint: tuple.materialFingerprint,
      calendarInputFingerprint: tuple.calendarInputFingerprint,
      rendererVersion: SM_001_RENDERER_VERSION,
    } as const;

    if (!pipeline.ok) {
      if (pipeline.identity) {
        const failReceipt: Sm001DispatchHookReceipt = {
          ...failReceiptBase,
          status:
            pipeline.failureCode === "QA_FAILURE" ||
            pipeline.failureCode === "SET_CONSISTENCY_FAILURE"
              ? "qa_failed"
              : "failed",
          campaignSetRenderVersion: pipeline.identity.campaignSetRenderVersion,
          identity: pipeline.identity,
          postPngShas: pipeline.identity.assets.map((a) => a.pngContentSha256),
          captionSetFingerprint: pipeline.identity.captionSetFingerprint,
          postingOrderFingerprint: pipeline.identity.postingOrderFingerprint,
          calendarFingerprint: pipeline.identity.calendarFingerprint,
          qaOk: false,
          failureCode: pipeline.failureCode,
          message: pipeline.message,
          invokedAt: new Date().toISOString(),
        };
        try {
          writeImmutableSm001VersionReceipt({
            repoRoot: input.repoRoot,
            artifactRootRel,
            receipt: failReceipt,
            campaignSetRenderVersion: pipeline.identity.campaignSetRenderVersion,
          });
        } catch (e) {
          return {
            ok: false,
            ...baseMeta(),
            dispatchId: record.dispatchId,
            skuId: record.skuId,
            failureCode: pipeline.failureCode,
            message: `${pipeline.message}; receipt write: ${
              e instanceof Error ? e.message : String(e)
            }`,
          };
        }
      }

      return {
        ok: false,
        ...baseMeta(),
        dispatchId: record.dispatchId,
        skuId: record.skuId,
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
        failureCode: "PARTIAL_SET_FAILURE",
        message: `Fail closed — Launch Set is complete or it is not delivered: ${incomplete}`,
      };
    }

    const successReceipt: Sm001DispatchHookReceipt = {
      ...failReceiptBase,
      status: "success",
      campaignSetRenderVersion: pipeline.identity.campaignSetRenderVersion,
      identity: pipeline.identity,
      postPngShas: pipeline.identity.assets.map((a) => a.pngContentSha256),
      captionSetFingerprint: pipeline.identity.captionSetFingerprint,
      postingOrderFingerprint: pipeline.identity.postingOrderFingerprint,
      calendarFingerprint: pipeline.identity.calendarFingerprint,
      qaOk: true,
      invokedAt: new Date().toISOString(),
    };

    const written = writeImmutableSm001VersionReceipt({
      repoRoot: input.repoRoot,
      artifactRootRel,
      receipt: successReceipt,
      campaignSetRenderVersion: pipeline.identity.campaignSetRenderVersion,
    });

    return {
      ok: true,
      ...baseMeta(),
      invocationOutcome: "RENDERED",
      dispatchId: record.dispatchId,
      skuId: DESIGN_RENDERER_SM_001_SKU,
      pipeline,
      identity: pipeline.identity,
      designSpec,
      plannedPostCount,
      receiptRelativePath: written.versionReceiptRel,
      idempotencyKey,
    };
  } finally {
    lock.handle.release();
  }
}
