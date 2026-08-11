/**
 * STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-1 (+ IDEMPOTENCY-1)
 *
 * Thin dd:{jobId} invoke for v2-rtu-flyer only.
 * Idempotent for the same authoritative execution fingerprint.
 * Does not live inside evaluateJobDispatch. Observer NOT wired.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_PROOF_SKU,
  DESIGN_RENDERER_VERSION,
  reasonFlyerDesignSpecDeterministic,
  runDesignRendererJobPipeline,
} from "@/lib/studio-design-renderer";
import type {
  DesignArtifactIdentity,
  DesignRendererPipelineResult,
  FlyerDesignSpec,
} from "@/lib/studio-design-renderer";

import {
  DESIGN_DISPATCH_HOOK_PACKAGE_ID,
  acquireRenderLockWithBriefWait,
  buildIdempotencyKey,
  buildIdempotencyTuple,
  findPartialRenderState,
  findSuccessfulRenderForFingerprint,
  writeImmutableVersionReceipt,
  type DispatchHookReceipt,
} from "./hook-idempotency";
import { existsSync } from "fs";
import path from "path";
import {
  customerArtifactRootRel,
  mapFlyerProjectTruthFromJob,
} from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export { DESIGN_DISPATCH_HOOK_PACKAGE_ID };

export const DESIGN_DISPATCH_HOOK_IDEMPOTENCY_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-IDEMPOTENCY-1" as const;

export type DesignDispatchInvocationOutcome =
  | "RENDERED"
  | "ALREADY_RENDERED";

export type DesignDispatchHookResult =
  | {
      ok: true;
      packageId: typeof DESIGN_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: DesignDispatchInvocationOutcome;
      dispatchId: string;
      skuId: typeof DESIGN_RENDERER_PROOF_SKU;
      pipeline?: Extract<DesignRendererPipelineResult, { ok: true }>;
      identity: DesignArtifactIdentity;
      designSpec: FlyerDesignSpec;
      receiptRelativePath: string;
      idempotencyKey: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    }
  | {
      ok: false;
      packageId: typeof DESIGN_DISPATCH_HOOK_PACKAGE_ID;
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
    packageId: DESIGN_DISPATCH_HOOK_PACKAGE_ID,
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

/**
 * Ensure a durable per-version receipt exists for an ALREADY_RENDERED hit
 * (e.g. legacy identity-only success). Never overwrites an existing receipt.
 */
function ensureVersionReceiptPresent(input: {
  repoRoot: string;
  artifactRootRel: string;
  receipt: DispatchHookReceipt;
  identity: DesignArtifactIdentity;
}): string {
  const rel = versionReceiptRel(
    input.artifactRootRel,
    input.identity.renderVersion,
  );
  const abs = path.join(input.repoRoot, rel);
  if (existsSync(abs)) return rel;
  writeImmutableVersionReceipt({
    repoRoot: input.repoRoot,
    artifactRootRel: input.artifactRootRel,
    receipt: {
      ...input.receipt,
      packageId: DESIGN_DISPATCH_HOOK_IDEMPOTENCY_PACKAGE_ID,
      status: "success",
      qaOk: true,
      renderVersion: input.identity.renderVersion,
      identity: input.identity,
      pngContentSha256: input.identity.pngContentSha256,
      pdfContentSha256: input.identity.pdfContentSha256,
    },
    renderVersion: input.identity.renderVersion,
  });
  return rel;
}

function alreadyRenderedResult(input: {
  dispatchId: string;
  identity: DesignArtifactIdentity;
  designSpec: FlyerDesignSpec;
  receiptRelativePath: string;
  idempotencyKey: string;
}): DesignDispatchHookResult {
  return {
    ok: true,
    ...baseMeta(),
    invocationOutcome: "ALREADY_RENDERED",
    dispatchId: input.dispatchId,
    skuId: DESIGN_RENDERER_PROOF_SKU,
    identity: input.identity,
    designSpec: input.designSpec,
    receiptRelativePath: input.receiptRelativePath,
    idempotencyKey: input.idempotencyKey,
  };
}

/**
 * Invoke the proven design-renderer contract for one ready flyer dispatch record.
 * Same fingerprint → ALREADY_RENDERED (no new vN). Observer not authorized here.
 */
export async function invokeDesignRendererDispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  preferAnthropic?: boolean;
  /** Test harness only. */
  forceQaFail?: boolean;
}): Promise<DesignDispatchHookResult> {
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_PROOF_SKU) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SKU_NOT_SUPPORTED",
      message: `Design dispatch hook refuses SKU ${record.skuId} — v2-rtu-flyer only`,
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

  const mapped = mapFlyerProjectTruthFromJob({
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

  const designSpec = reasonFlyerDesignSpecDeterministic(mapped.truth);
  const tuple = buildIdempotencyTuple({
    dispatchId: record.dispatchId,
    jobId: record.jobId,
    skuId: record.skuId,
    spec: designSpec,
  });
  const idempotencyKey = buildIdempotencyKey(tuple);

  const lookup = () =>
    findSuccessfulRenderForFingerprint({
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

  const partial = findPartialRenderState({
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
      message: `Fail closed on partial render state: ${partial.detail}`,
    };
  }

  const lock = await acquireRenderLockWithBriefWait({
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

    const pipeline = await runDesignRendererJobPipeline({
      repoRoot: input.repoRoot,
      truth: mapped.truth,
      artifactRootRel,
      preferAnthropic: input.preferAnthropic ?? false,
      specOverride: designSpec,
      forceQaFail: input.forceQaFail,
    });

    if (!pipeline.ok) {
      if (pipeline.identity) {
        const failReceipt: DispatchHookReceipt = {
          packageId: DESIGN_DISPATCH_HOOK_IDEMPOTENCY_PACKAGE_ID,
          status:
            pipeline.failureCode === "QA_FAILURE" ? "qa_failed" : "failed",
          idempotencyKey,
          dispatchId: record.dispatchId,
          jobId: record.jobId,
          campaignId: input.campaign.campaignId,
          skuId: record.skuId,
          designSpecFingerprint: tuple.designSpecFingerprint,
          materialFingerprint: tuple.materialFingerprint,
          rendererVersion: DESIGN_RENDERER_VERSION,
          renderVersion: pipeline.identity.renderVersion,
          identity: pipeline.identity,
          pngContentSha256: pipeline.identity.pngContentSha256,
          pdfContentSha256: pipeline.identity.pdfContentSha256,
          qaOk: false,
          failureCode: pipeline.failureCode,
          message: pipeline.message,
          invokedAt: new Date().toISOString(),
        };
        try {
          writeImmutableVersionReceipt({
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

    const successReceipt: DispatchHookReceipt = {
      packageId: DESIGN_DISPATCH_HOOK_IDEMPOTENCY_PACKAGE_ID,
      status: "success",
      idempotencyKey,
      dispatchId: record.dispatchId,
      jobId: record.jobId,
      campaignId: input.campaign.campaignId,
      skuId: record.skuId,
      designSpecFingerprint: tuple.designSpecFingerprint,
      materialFingerprint: tuple.materialFingerprint,
      rendererVersion: DESIGN_RENDERER_VERSION,
      renderVersion: pipeline.identity.renderVersion,
      identity: pipeline.identity,
      pngContentSha256: pipeline.identity.pngContentSha256,
      pdfContentSha256: pipeline.identity.pdfContentSha256,
      qaOk: true,
      invokedAt: new Date().toISOString(),
    };

    const written = writeImmutableVersionReceipt({
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
      skuId: DESIGN_RENDERER_PROOF_SKU,
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
