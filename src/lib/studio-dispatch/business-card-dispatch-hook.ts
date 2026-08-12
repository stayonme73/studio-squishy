/**
 * STUDIO-OPERATING-DESIGN-BUSINESS-CARD-DISPATCH-HOOK-1
 *
 * Thin dd:{jobId} invoke for v2-rtu-business-card only.
 * Idempotent for the same authoritative card fingerprint.
 * Double-sided: front + back bound per success.
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  BUSINESS_CARD_RENDERER_VERSION,
  DESIGN_RENDERER_BUSINESS_CARD_SKU,
  reasonBusinessCardDesignSpecDeterministic,
  runBusinessCardJobPipeline,
} from "@/lib/studio-design-renderer";
import type {
  BusinessCardArtifactIdentity,
  BusinessCardDesignSpec,
  BusinessCardRendererPipelineResult,
} from "@/lib/studio-design-renderer";

import {
  BUSINESS_CARD_DISPATCH_HOOK_PACKAGE_ID,
  acquireCardRenderLockWithBriefWait,
  buildCardIdempotencyKey,
  buildCardIdempotencyTuple,
  findPartialCardRenderState,
  findSuccessfulCardRenderForFingerprint,
  writeImmutableCardVersionReceipt,
  type BusinessCardDispatchHookReceipt,
} from "./card-hook-idempotency";
import { mapBusinessCardProjectTruthFromJob } from "./map-business-card-job-truth";
import { customerArtifactRootRel } from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export { BUSINESS_CARD_DISPATCH_HOOK_PACKAGE_ID };

export type BusinessCardDispatchInvocationOutcome =
  | "RENDERED"
  | "ALREADY_RENDERED";

export type BusinessCardDispatchHookResult =
  | {
      ok: true;
      packageId: typeof BUSINESS_CARD_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: BusinessCardDispatchInvocationOutcome;
      dispatchId: string;
      skuId: typeof DESIGN_RENDERER_BUSINESS_CARD_SKU;
      pipeline?: Extract<BusinessCardRendererPipelineResult, { ok: true }>;
      identity: BusinessCardArtifactIdentity;
      designSpec: BusinessCardDesignSpec;
      receiptRelativePath: string;
      idempotencyKey: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    }
  | {
      ok: false;
      packageId: typeof BUSINESS_CARD_DISPATCH_HOOK_PACKAGE_ID;
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
    packageId: BUSINESS_CARD_DISPATCH_HOOK_PACKAGE_ID,
    ownerRoutineProduction: "NONE" as const,
    canvaRequired: false as const,
    makeRequired: false as const,
  };
}

function versionReceiptRel(
  artifactRootRel: string,
  renderVersion: number,
): string {
  return `${artifactRootRel}/renders/v${renderVersion}/dispatch-hook-receipt.json`;
}

function ensureVersionReceiptPresent(input: {
  repoRoot: string;
  artifactRootRel: string;
  receipt: BusinessCardDispatchHookReceipt;
  identity: BusinessCardArtifactIdentity;
}): string {
  const rel = versionReceiptRel(
    input.artifactRootRel,
    input.identity.renderVersion,
  );
  const abs = path.join(input.repoRoot, rel);
  if (existsSync(abs)) return rel;
  const front = input.identity.sides.find((s) => s.side === "front")!;
  const back = input.identity.sides.find((s) => s.side === "back")!;
  writeImmutableCardVersionReceipt({
    repoRoot: input.repoRoot,
    artifactRootRel: input.artifactRootRel,
    receipt: {
      ...input.receipt,
      packageId: BUSINESS_CARD_DISPATCH_HOOK_PACKAGE_ID,
      status: "success",
      qaOk: true,
      renderVersion: input.identity.renderVersion,
      identity: input.identity,
      frontPngContentSha256: front.pngContentSha256,
      backPngContentSha256: back.pngContentSha256,
      pdfContentSha256: input.identity.pdfContentSha256,
    },
    renderVersion: input.identity.renderVersion,
  });
  return rel;
}

function alreadyRenderedResult(input: {
  dispatchId: string;
  identity: BusinessCardArtifactIdentity;
  designSpec: BusinessCardDesignSpec;
  receiptRelativePath: string;
  idempotencyKey: string;
}): BusinessCardDispatchHookResult {
  return {
    ok: true,
    ...baseMeta(),
    invocationOutcome: "ALREADY_RENDERED",
    dispatchId: input.dispatchId,
    skuId: DESIGN_RENDERER_BUSINESS_CARD_SKU,
    identity: input.identity,
    designSpec: input.designSpec,
    receiptRelativePath: input.receiptRelativePath,
    idempotencyKey: input.idempotencyKey,
  };
}

/**
 * Invoke the proven business-card renderer for one ready card dispatch record.
 * Same fingerprint → ALREADY_RENDERED (no new vN). Requires front+back success.
 */
export async function invokeBusinessCardDispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  forceQaFail?: boolean;
}): Promise<BusinessCardDispatchHookResult> {
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_BUSINESS_CARD_SKU) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SKU_NOT_SUPPORTED",
      message: `Business-card dispatch hook refuses SKU ${record.skuId} — v2-rtu-business-card only`,
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

  const mapped = mapBusinessCardProjectTruthFromJob({
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

  const designSpec = reasonBusinessCardDesignSpecDeterministic(mapped.truth);
  const tuple = buildCardIdempotencyTuple({
    dispatchId: record.dispatchId,
    jobId: record.jobId,
    skuId: record.skuId,
    spec: designSpec,
  });
  const idempotencyKey = buildCardIdempotencyKey(tuple);

  const lookup = () =>
    findSuccessfulCardRenderForFingerprint({
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

  const partial = findPartialCardRenderState({
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
      message: `Fail closed on partial card render state: ${partial.detail}`,
    };
  }

  const lock = await acquireCardRenderLockWithBriefWait({
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

    const pipeline = await runBusinessCardJobPipeline({
      repoRoot: input.repoRoot,
      truth: mapped.truth,
      artifactRootRel,
      specOverride: designSpec,
      forceQaFail: input.forceQaFail,
    });

    if (!pipeline.ok) {
      if (pipeline.identity) {
        const front = pipeline.identity.sides.find((s) => s.side === "front");
        const back = pipeline.identity.sides.find((s) => s.side === "back");
        const failReceipt: BusinessCardDispatchHookReceipt = {
          packageId: BUSINESS_CARD_DISPATCH_HOOK_PACKAGE_ID,
          status:
            pipeline.failureCode === "QA_FAILURE" ? "qa_failed" : "failed",
          idempotencyKey,
          dispatchId: record.dispatchId,
          jobId: record.jobId,
          campaignId: input.campaign.campaignId,
          skuId: record.skuId,
          designSpecFingerprint: tuple.designSpecFingerprint,
          materialFingerprint: tuple.materialFingerprint,
          rendererVersion: BUSINESS_CARD_RENDERER_VERSION,
          renderVersion: pipeline.identity.renderVersion,
          identity: pipeline.identity,
          frontPngContentSha256: front?.pngContentSha256,
          backPngContentSha256: back?.pngContentSha256,
          pdfContentSha256: pipeline.identity.pdfContentSha256,
          qaOk: false,
          failureCode: pipeline.failureCode,
          message: pipeline.message,
          invokedAt: new Date().toISOString(),
        };
        try {
          writeImmutableCardVersionReceipt({
            repoRoot: input.repoRoot,
            artifactRootRel,
            receipt: failReceipt,
            renderVersion: pipeline.identity.renderVersion,
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

    const front = pipeline.identity.sides.find((s) => s.side === "front")!;
    const back = pipeline.identity.sides.find((s) => s.side === "back")!;
    if (!front || !back) {
      return {
        ok: false,
        ...baseMeta(),
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        failureCode: "EXPORT_FAILURE",
        message: "Successful card pipeline missing front or back side identity",
      };
    }

    const successReceipt: BusinessCardDispatchHookReceipt = {
      packageId: BUSINESS_CARD_DISPATCH_HOOK_PACKAGE_ID,
      status: "success",
      idempotencyKey,
      dispatchId: record.dispatchId,
      jobId: record.jobId,
      campaignId: input.campaign.campaignId,
      skuId: record.skuId,
      designSpecFingerprint: tuple.designSpecFingerprint,
      materialFingerprint: tuple.materialFingerprint,
      rendererVersion: BUSINESS_CARD_RENDERER_VERSION,
      renderVersion: pipeline.identity.renderVersion,
      identity: pipeline.identity,
      frontPngContentSha256: front.pngContentSha256,
      backPngContentSha256: back.pngContentSha256,
      pdfContentSha256: pipeline.identity.pdfContentSha256,
      qaOk: true,
      invokedAt: new Date().toISOString(),
    };

    const written = writeImmutableCardVersionReceipt({
      repoRoot: input.repoRoot,
      artifactRootRel,
      receipt: successReceipt,
      renderVersion: pipeline.identity.renderVersion,
    });

    return {
      ok: true,
      ...baseMeta(),
      invocationOutcome: "RENDERED",
      dispatchId: record.dispatchId,
      skuId: DESIGN_RENDERER_BUSINESS_CARD_SKU,
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
