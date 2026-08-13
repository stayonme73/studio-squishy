/**
 * STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-DISPATCH-HOOK-1
 *
 * Thin dd:{jobId} invoke for v2-rtu-promotion-graphics only.
 * Idempotent for the same authoritative campaign-set fingerprint.
 * Visual gate: PROMOTION-GRAPHICS-PROOF-1 PASS (Owner control).
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_PROMO_SKU,
  PROMO_RENDERER_VERSION,
  reasonPromoCampaignSetDeterministic,
  runPromoJobPipeline,
} from "@/lib/studio-design-renderer";
import type {
  PromoCampaignSetIdentity,
  PromoCampaignSetSpec,
  PromoRendererPipelineResult,
} from "@/lib/studio-design-renderer";

import { customerArtifactRootRel } from "./map-flyer-job-truth";
import { mapPromoProjectTruthFromJob } from "./map-promo-job-truth";
import {
  PROMO_DISPATCH_HOOK_PACKAGE_ID,
  acquirePromoRenderLockWithBriefWait,
  buildPromoIdempotencyKey,
  buildPromoIdempotencyTuple,
  findPartialPromoRenderState,
  findSuccessfulPromoRenderForFingerprint,
  writeImmutablePromoVersionReceipt,
  type PromoDispatchHookReceipt,
} from "./promo-hook-idempotency";
import type { JobDispatchRecord } from "./types";

export { PROMO_DISPATCH_HOOK_PACKAGE_ID };

export type PromoDispatchInvocationOutcome = "RENDERED" | "ALREADY_RENDERED";

export type PromoDispatchHookResult =
  | {
      ok: true;
      packageId: typeof PROMO_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: PromoDispatchInvocationOutcome;
      dispatchId: string;
      skuId: typeof DESIGN_RENDERER_PROMO_SKU;
      pipeline?: Extract<PromoRendererPipelineResult, { ok: true }>;
      identity: PromoCampaignSetIdentity;
      designSpec: PromoCampaignSetSpec;
      receiptRelativePath: string;
      idempotencyKey: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    }
  | {
      ok: false;
      packageId: typeof PROMO_DISPATCH_HOOK_PACKAGE_ID;
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
    packageId: PROMO_DISPATCH_HOOK_PACKAGE_ID,
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
  receipt: PromoDispatchHookReceipt;
  identity: PromoCampaignSetIdentity;
}): string {
  const rel = versionReceiptRel(
    input.artifactRootRel,
    input.identity.campaignSetRenderVersion,
  );
  const abs = path.join(input.repoRoot, rel);
  if (existsSync(abs)) return rel;

  const [assetA, assetB] = input.identity.assets;
  writeImmutablePromoVersionReceipt({
    repoRoot: input.repoRoot,
    artifactRootRel: input.artifactRootRel,
    receipt: {
      ...input.receipt,
      packageId: PROMO_DISPATCH_HOOK_PACKAGE_ID,
      status: "success",
      qaOk: true,
      campaignSetRenderVersion: input.identity.campaignSetRenderVersion,
      identity: input.identity,
      assetAPngSha: assetA.pngContentSha256,
      assetBPngSha: assetB.pngContentSha256,
    },
    campaignSetRenderVersion: input.identity.campaignSetRenderVersion,
  });
  return rel;
}

function alreadyRenderedResult(input: {
  dispatchId: string;
  identity: PromoCampaignSetIdentity;
  designSpec: PromoCampaignSetSpec;
  receiptRelativePath: string;
  idempotencyKey: string;
}): PromoDispatchHookResult {
  return {
    ok: true,
    ...baseMeta(),
    invocationOutcome: "ALREADY_RENDERED",
    dispatchId: input.dispatchId,
    skuId: DESIGN_RENDERER_PROMO_SKU,
    identity: input.identity,
    designSpec: input.designSpec,
    receiptRelativePath: input.receiptRelativePath,
    idempotencyKey: input.idempotencyKey,
  };
}

/**
 * Invoke the proven promotion-graphics renderer for one ready dispatch record.
 * Same fingerprint → ALREADY_RENDERED (no new vN).
 */
export async function invokePromoDispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  /** Test-only fail-closed injectors — never used in production observers. */
  forceQaFail?: boolean;
  forceFirstAssetExportFail?: boolean;
  forceSecondAssetExportFail?: boolean;
  forceSetConsistencyFail?: boolean;
}): Promise<PromoDispatchHookResult> {
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_PROMO_SKU) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SKU_NOT_SUPPORTED",
      message: `promotion-graphics dispatch hook refuses SKU ${record.skuId} — v2-rtu-promotion-graphics only`,
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

  const mapped = mapPromoProjectTruthFromJob({
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

  const artifactRootRel = customerArtifactRootRel(
    input.campaign.campaignId,
    record.dispatchId,
  );

  let designSpec: PromoCampaignSetSpec;
  try {
    designSpec = reasonPromoCampaignSetDeterministic(mapped.truth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: msg.startsWith("MISSING_REQUIRED_TRUTH")
        ? "MISSING_REQUIRED_TRUTH"
        : "RENDER_FAILURE",
      message: msg,
    };
  }

  const tuple = buildPromoIdempotencyTuple({
    dispatchId: record.dispatchId,
    jobId: record.jobId,
    skuId: record.skuId,
    spec: designSpec,
  });
  const idempotencyKey = buildPromoIdempotencyKey(tuple);

  const lookup = () =>
    findSuccessfulPromoRenderForFingerprint({
      repoRoot: input.repoRoot,
      artifactRootRel,
      tuple,
    });

  const existing = lookup();
  if (existing.found) {
    const receiptRelativePath = ensureVersionReceiptPresent({
      repoRoot: input.repoRoot,
      artifactRootRel,
      receipt: existing.receipt,
      identity: existing.identity,
    });
    return alreadyRenderedResult({
      dispatchId: record.dispatchId,
      identity: existing.identity,
      designSpec,
      receiptRelativePath,
      idempotencyKey,
    });
  }

  const partial = findPartialPromoRenderState({
    repoRoot: input.repoRoot,
    artifactRootRel,
  });
  if (partial.partial) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "PARTIAL_RENDER_STATE",
      message: `Fail closed on partial promotion-graphics render state: ${partial.detail}`,
    };
  }

  const lock = await acquirePromoRenderLockWithBriefWait({
    repoRoot: input.repoRoot,
    artifactRootRel,
    idempotencyKey,
    lookup,
  });

  if (!lock.ok) {
    if (lock.already) {
      const receiptRelativePath = ensureVersionReceiptPresent({
        repoRoot: input.repoRoot,
        artifactRootRel,
        receipt: lock.already.receipt,
        identity: lock.already.identity,
      });
      return alreadyRenderedResult({
        dispatchId: record.dispatchId,
        identity: lock.already.identity,
        designSpec,
        receiptRelativePath,
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
      const receiptRelativePath = ensureVersionReceiptPresent({
        repoRoot: input.repoRoot,
        artifactRootRel,
        receipt: again.receipt,
        identity: again.identity,
      });
      return alreadyRenderedResult({
        dispatchId: record.dispatchId,
        identity: again.identity,
        designSpec,
        receiptRelativePath,
        idempotencyKey,
      });
    }

    const pipeline = await runPromoJobPipeline({
      repoRoot: input.repoRoot,
      truth: mapped.truth,
      artifactRootRel,
      specOverride: designSpec,
      forceQaFail: input.forceQaFail,
      forceFirstAssetExportFail: input.forceFirstAssetExportFail,
      forceSecondAssetExportFail: input.forceSecondAssetExportFail,
      forceSetConsistencyFail: input.forceSetConsistencyFail,
    });

    if (!pipeline.ok) {
      if (pipeline.identity) {
        const [assetA, assetB] = pipeline.identity.assets;
        const failReceipt: PromoDispatchHookReceipt = {
          packageId: PROMO_DISPATCH_HOOK_PACKAGE_ID,
          status:
            pipeline.failureCode === "QA_FAILURE" ||
            pipeline.failureCode === "SET_CONSISTENCY_FAILURE"
              ? "qa_failed"
              : "failed",
          idempotencyKey,
          dispatchId: record.dispatchId,
          jobId: record.jobId,
          campaignId: input.campaign.campaignId,
          skuId: record.skuId,
          sharedSpecFingerprint: tuple.sharedSpecFingerprint,
          materialFingerprint: tuple.materialFingerprint,
          rendererVersion: PROMO_RENDERER_VERSION,
          campaignSetRenderVersion: pipeline.identity.campaignSetRenderVersion,
          identity: pipeline.identity,
          assetAPngSha: assetA.pngContentSha256,
          assetBPngSha: assetB.pngContentSha256,
          qaOk: false,
          failureCode: pipeline.failureCode,
          message: pipeline.message,
          invokedAt: new Date().toISOString(),
        };
        try {
          writeImmutablePromoVersionReceipt({
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

    const [assetA, assetB] = pipeline.identity.assets;
    const successReceipt: PromoDispatchHookReceipt = {
      packageId: PROMO_DISPATCH_HOOK_PACKAGE_ID,
      status: "success",
      idempotencyKey,
      dispatchId: record.dispatchId,
      jobId: record.jobId,
      campaignId: input.campaign.campaignId,
      skuId: record.skuId,
      sharedSpecFingerprint: tuple.sharedSpecFingerprint,
      materialFingerprint: tuple.materialFingerprint,
      rendererVersion: PROMO_RENDERER_VERSION,
      campaignSetRenderVersion: pipeline.identity.campaignSetRenderVersion,
      identity: pipeline.identity,
      assetAPngSha: assetA.pngContentSha256,
      assetBPngSha: assetB.pngContentSha256,
      qaOk: true,
      invokedAt: new Date().toISOString(),
    };

    const written = writeImmutablePromoVersionReceipt({
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
      skuId: DESIGN_RENDERER_PROMO_SKU,
      pipeline,
      identity: pipeline.identity,
      designSpec,
      receiptRelativePath: written.versionReceiptRel,
      idempotencyKey,
    };
  } finally {
    lock.handle.release();
  }
}
