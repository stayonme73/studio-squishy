/**
 * STUDIO-OPERATING-DESIGN-SERVICE-SHEET-DISPATCH-HOOK-1
 *
 * Thin dd:{jobId} invoke for v2-rtu-service-sheet only.
 * Idempotent for the same authoritative service-sheet fingerprint.
 * Visual gate: SERVICE-SHEET-PROOF-1 PASS (Owner control).
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_SERVICE_SHEET_SKU,
  SERVICE_SHEET_RENDERER_VERSION,
  reasonServiceSheetDesignSpecDeterministic,
  runServiceSheetJobPipeline,
} from "@/lib/studio-design-renderer";
import type {
  ServiceSheetArtifactIdentity,
  ServiceSheetDesignSpec,
  ServiceSheetRendererPipelineResult,
} from "@/lib/studio-design-renderer";

import {
  SERVICE_SHEET_DISPATCH_HOOK_PACKAGE_ID,
  acquireServiceSheetRenderLockWithBriefWait,
  buildServiceSheetIdempotencyKey,
  buildServiceSheetIdempotencyTuple,
  findPartialServiceSheetRenderState,
  findSuccessfulServiceSheetRenderForFingerprint,
  writeImmutableServiceSheetVersionReceipt,
  type ServiceSheetDispatchHookReceipt,
} from "./service-sheet-hook-idempotency";
import { mapServiceSheetProjectTruthFromJob } from "./map-service-sheet-job-truth";
import { customerArtifactRootRel } from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export { SERVICE_SHEET_DISPATCH_HOOK_PACKAGE_ID };

export type ServiceSheetDispatchInvocationOutcome = "RENDERED" | "ALREADY_RENDERED";

export type ServiceSheetDispatchHookResult =
  | {
      ok: true;
      packageId: typeof SERVICE_SHEET_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: ServiceSheetDispatchInvocationOutcome;
      dispatchId: string;
      skuId: typeof DESIGN_RENDERER_SERVICE_SHEET_SKU;
      pipeline?: Extract<ServiceSheetRendererPipelineResult, { ok: true }>;
      identity: ServiceSheetArtifactIdentity;
      designSpec: ServiceSheetDesignSpec;
      receiptRelativePath: string;
      idempotencyKey: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    }
  | {
      ok: false;
      packageId: typeof SERVICE_SHEET_DISPATCH_HOOK_PACKAGE_ID;
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
    packageId: SERVICE_SHEET_DISPATCH_HOOK_PACKAGE_ID,
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
  receipt: ServiceSheetDispatchHookReceipt;
  identity: ServiceSheetArtifactIdentity;
}): string {
  const rel = versionReceiptRel(
    input.artifactRootRel,
    input.identity.renderVersion,
  );
  const abs = path.join(input.repoRoot, rel);
  if (existsSync(abs)) return rel;
  writeImmutableServiceSheetVersionReceipt({
    repoRoot: input.repoRoot,
    artifactRootRel: input.artifactRootRel,
    receipt: {
      ...input.receipt,
      packageId: SERVICE_SHEET_DISPATCH_HOOK_PACKAGE_ID,
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
  identity: ServiceSheetArtifactIdentity;
  designSpec: ServiceSheetDesignSpec;
  receiptRelativePath: string;
  idempotencyKey: string;
}): ServiceSheetDispatchHookResult {
  return {
    ok: true,
    ...baseMeta(),
    invocationOutcome: "ALREADY_RENDERED",
    dispatchId: input.dispatchId,
    skuId: DESIGN_RENDERER_SERVICE_SHEET_SKU,
    identity: input.identity,
    designSpec: input.designSpec,
    receiptRelativePath: input.receiptRelativePath,
    idempotencyKey: input.idempotencyKey,
  };
}

/**
 * Invoke the proven service-sheet renderer for one ready service-sheet dispatch record.
 * Same fingerprint → ALREADY_RENDERED (no new vN).
 */
export async function invokeServiceSheetDispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  forceQaFail?: boolean;
}): Promise<ServiceSheetDispatchHookResult> {
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_SERVICE_SHEET_SKU) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SKU_NOT_SUPPORTED",
      message: `service-sheet dispatch hook refuses SKU ${record.skuId} — v2-rtu-service-sheet only`,
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

  const mapped = mapServiceSheetProjectTruthFromJob({
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

  let designSpec: ServiceSheetDesignSpec;
  try {
    designSpec = reasonServiceSheetDesignSpecDeterministic(mapped.truth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: msg.startsWith("DENSITY_OVERFLOW")
        ? "DENSITY_OVERFLOW"
        : "RENDER_FAILURE",
      message: msg,
    };
  }

  const tuple = buildServiceSheetIdempotencyTuple({
    dispatchId: record.dispatchId,
    jobId: record.jobId,
    skuId: record.skuId,
    spec: designSpec,
  });
  const idempotencyKey = buildServiceSheetIdempotencyKey(tuple);

  const lookup = () =>
    findSuccessfulServiceSheetRenderForFingerprint({
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

  const partial = findPartialServiceSheetRenderState({
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
      message: `Fail closed on partial service-sheet render state: ${partial.detail}`,
    };
  }

  const lock = await acquireServiceSheetRenderLockWithBriefWait({
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

    const pipeline = await runServiceSheetJobPipeline({
      repoRoot: input.repoRoot,
      truth: mapped.truth,
      artifactRootRel,
      specOverride: designSpec,
      forceQaFail: input.forceQaFail,
    });

    if (!pipeline.ok) {
      if (pipeline.identity) {
        const failReceipt: ServiceSheetDispatchHookReceipt = {
          packageId: SERVICE_SHEET_DISPATCH_HOOK_PACKAGE_ID,
          status:
            pipeline.failureCode === "QA_FAILURE" ? "qa_failed" : "failed",
          idempotencyKey,
          dispatchId: record.dispatchId,
          jobId: record.jobId,
          campaignId: input.campaign.campaignId,
          skuId: record.skuId,
          designSpecFingerprint: tuple.designSpecFingerprint,
          materialFingerprint: tuple.materialFingerprint,
          rendererVersion: SERVICE_SHEET_RENDERER_VERSION,
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
          writeImmutableServiceSheetVersionReceipt({
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

    const successReceipt: ServiceSheetDispatchHookReceipt = {
      packageId: SERVICE_SHEET_DISPATCH_HOOK_PACKAGE_ID,
      status: "success",
      idempotencyKey,
      dispatchId: record.dispatchId,
      jobId: record.jobId,
      campaignId: input.campaign.campaignId,
      skuId: record.skuId,
      designSpecFingerprint: tuple.designSpecFingerprint,
      materialFingerprint: tuple.materialFingerprint,
      rendererVersion: SERVICE_SHEET_RENDERER_VERSION,
      renderVersion: pipeline.identity.renderVersion,
      identity: pipeline.identity,
      pngContentSha256: pipeline.identity.pngContentSha256,
      pdfContentSha256: pipeline.identity.pdfContentSha256,
      qaOk: true,
      invokedAt: new Date().toISOString(),
    };

    const written = writeImmutableServiceSheetVersionReceipt({
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
      skuId: DESIGN_RENDERER_SERVICE_SHEET_SKU,
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
