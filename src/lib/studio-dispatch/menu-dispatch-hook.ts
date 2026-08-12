/**
 * STUDIO-OPERATING-DESIGN-MENU-DISPATCH-HOOK-1
 *
 * Thin dd:{jobId} invoke for v2-rtu-menu only.
 * Idempotent for the same authoritative menu fingerprint.
 * Visual gate: PASS WITH LIMITS (MENU-LAYOUT-1).
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_MENU_SKU,
  MENU_RENDERER_VERSION,
  reasonMenuDesignSpecDeterministic,
  runMenuJobPipeline,
} from "@/lib/studio-design-renderer";
import type {
  MenuArtifactIdentity,
  MenuDesignSpec,
  MenuRendererPipelineResult,
} from "@/lib/studio-design-renderer";

import {
  MENU_DISPATCH_HOOK_PACKAGE_ID,
  acquireMenuRenderLockWithBriefWait,
  buildMenuIdempotencyKey,
  buildMenuIdempotencyTuple,
  findPartialMenuRenderState,
  findSuccessfulMenuRenderForFingerprint,
  writeImmutableMenuVersionReceipt,
  type MenuDispatchHookReceipt,
} from "./menu-hook-idempotency";
import { mapMenuProjectTruthFromJob } from "./map-menu-job-truth";
import { customerArtifactRootRel } from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export { MENU_DISPATCH_HOOK_PACKAGE_ID };

export type MenuDispatchInvocationOutcome = "RENDERED" | "ALREADY_RENDERED";

export type MenuDispatchHookResult =
  | {
      ok: true;
      packageId: typeof MENU_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: MenuDispatchInvocationOutcome;
      dispatchId: string;
      skuId: typeof DESIGN_RENDERER_MENU_SKU;
      pipeline?: Extract<MenuRendererPipelineResult, { ok: true }>;
      identity: MenuArtifactIdentity;
      designSpec: MenuDesignSpec;
      receiptRelativePath: string;
      idempotencyKey: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    }
  | {
      ok: false;
      packageId: typeof MENU_DISPATCH_HOOK_PACKAGE_ID;
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
    packageId: MENU_DISPATCH_HOOK_PACKAGE_ID,
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
  receipt: MenuDispatchHookReceipt;
  identity: MenuArtifactIdentity;
}): string {
  const rel = versionReceiptRel(
    input.artifactRootRel,
    input.identity.renderVersion,
  );
  const abs = path.join(input.repoRoot, rel);
  if (existsSync(abs)) return rel;
  writeImmutableMenuVersionReceipt({
    repoRoot: input.repoRoot,
    artifactRootRel: input.artifactRootRel,
    receipt: {
      ...input.receipt,
      packageId: MENU_DISPATCH_HOOK_PACKAGE_ID,
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
  identity: MenuArtifactIdentity;
  designSpec: MenuDesignSpec;
  receiptRelativePath: string;
  idempotencyKey: string;
}): MenuDispatchHookResult {
  return {
    ok: true,
    ...baseMeta(),
    invocationOutcome: "ALREADY_RENDERED",
    dispatchId: input.dispatchId,
    skuId: DESIGN_RENDERER_MENU_SKU,
    identity: input.identity,
    designSpec: input.designSpec,
    receiptRelativePath: input.receiptRelativePath,
    idempotencyKey: input.idempotencyKey,
  };
}

/**
 * Invoke the proven menu renderer for one ready menu dispatch record.
 * Same fingerprint → ALREADY_RENDERED (no new vN).
 */
export async function invokeMenuDispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  forceQaFail?: boolean;
}): Promise<MenuDispatchHookResult> {
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_MENU_SKU) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SKU_NOT_SUPPORTED",
      message: `Menu dispatch hook refuses SKU ${record.skuId} — v2-rtu-menu only`,
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

  const mapped = mapMenuProjectTruthFromJob({
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

  let designSpec: MenuDesignSpec;
  try {
    designSpec = reasonMenuDesignSpecDeterministic(mapped.truth);
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

  const tuple = buildMenuIdempotencyTuple({
    dispatchId: record.dispatchId,
    jobId: record.jobId,
    skuId: record.skuId,
    spec: designSpec,
  });
  const idempotencyKey = buildMenuIdempotencyKey(tuple);

  const lookup = () =>
    findSuccessfulMenuRenderForFingerprint({
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

  const partial = findPartialMenuRenderState({
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
      message: `Fail closed on partial menu render state: ${partial.detail}`,
    };
  }

  const lock = await acquireMenuRenderLockWithBriefWait({
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

    const pipeline = await runMenuJobPipeline({
      repoRoot: input.repoRoot,
      truth: mapped.truth,
      artifactRootRel,
      specOverride: designSpec,
      forceQaFail: input.forceQaFail,
    });

    if (!pipeline.ok) {
      if (pipeline.identity) {
        const failReceipt: MenuDispatchHookReceipt = {
          packageId: MENU_DISPATCH_HOOK_PACKAGE_ID,
          status:
            pipeline.failureCode === "QA_FAILURE" ? "qa_failed" : "failed",
          idempotencyKey,
          dispatchId: record.dispatchId,
          jobId: record.jobId,
          campaignId: input.campaign.campaignId,
          skuId: record.skuId,
          designSpecFingerprint: tuple.designSpecFingerprint,
          materialFingerprint: tuple.materialFingerprint,
          rendererVersion: MENU_RENDERER_VERSION,
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
          writeImmutableMenuVersionReceipt({
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

    const successReceipt: MenuDispatchHookReceipt = {
      packageId: MENU_DISPATCH_HOOK_PACKAGE_ID,
      status: "success",
      idempotencyKey,
      dispatchId: record.dispatchId,
      jobId: record.jobId,
      campaignId: input.campaign.campaignId,
      skuId: record.skuId,
      designSpecFingerprint: tuple.designSpecFingerprint,
      materialFingerprint: tuple.materialFingerprint,
      rendererVersion: MENU_RENDERER_VERSION,
      renderVersion: pipeline.identity.renderVersion,
      identity: pipeline.identity,
      pngContentSha256: pipeline.identity.pngContentSha256,
      pdfContentSha256: pipeline.identity.pdfContentSha256,
      qaOk: true,
      invokedAt: new Date().toISOString(),
    };

    const written = writeImmutableMenuVersionReceipt({
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
      skuId: DESIGN_RENDERER_MENU_SKU,
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
