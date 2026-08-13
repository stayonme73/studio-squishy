/**
 * STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-DISPATCH-HOOK-1
 *
 * Thin dd:{jobId} invoke for v2-rtu-social-posts only.
 * Idempotent for the same authoritative campaign-set fingerprint.
 * Locks: exactly 4 posts · social-post-1…4 · order 1–4 · Studio layout
 * templates · square-only · Studio captions · no customer role menu.
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_SOCIAL_POSTS_SKU,
  SOCIAL_POSTS_RENDERER_VERSION,
  reasonSocialPostsSetDeterministic,
  runSocialPostsJobPipeline,
} from "@/lib/studio-design-renderer";
import type {
  SocialPostsRendererPipelineResult,
  SocialPostsSetIdentity,
  SocialPostsSetSpec,
} from "@/lib/studio-design-renderer";

import { customerArtifactRootRel } from "./map-flyer-job-truth";
import { mapSocialPostsProjectTruthFromJob } from "./map-social-job-truth";
import {
  SOCIAL_POSTS_DISPATCH_HOOK_PACKAGE_ID,
  acquireSocialPostsRenderLockWithBriefWait,
  buildSocialPostsIdempotencyKey,
  buildSocialPostsIdempotencyTuple,
  findPartialSocialPostsRenderState,
  findSuccessfulSocialPostsRenderForFingerprint,
  writeImmutableSocialPostsVersionReceipt,
  type SocialPostsDispatchHookReceipt,
} from "./social-posts-hook-idempotency";
import type { JobDispatchRecord } from "./types";

export { SOCIAL_POSTS_DISPATCH_HOOK_PACKAGE_ID };

export type SocialPostsDispatchInvocationOutcome =
  | "RENDERED"
  | "ALREADY_RENDERED";

export type SocialPostsDispatchHookResult =
  | {
      ok: true;
      packageId: typeof SOCIAL_POSTS_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: SocialPostsDispatchInvocationOutcome;
      dispatchId: string;
      skuId: typeof DESIGN_RENDERER_SOCIAL_POSTS_SKU;
      pipeline?: Extract<SocialPostsRendererPipelineResult, { ok: true }>;
      identity: SocialPostsSetIdentity;
      designSpec: SocialPostsSetSpec;
      receiptRelativePath: string;
      idempotencyKey: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    }
  | {
      ok: false;
      packageId: typeof SOCIAL_POSTS_DISPATCH_HOOK_PACKAGE_ID;
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
    packageId: SOCIAL_POSTS_DISPATCH_HOOK_PACKAGE_ID,
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
  receipt: SocialPostsDispatchHookReceipt;
  identity: SocialPostsSetIdentity;
}): string {
  const rel = versionReceiptRel(
    input.artifactRootRel,
    input.identity.campaignSetRenderVersion,
  );
  const abs = path.join(input.repoRoot, rel);
  if (existsSync(abs)) return rel;

  writeImmutableSocialPostsVersionReceipt({
    repoRoot: input.repoRoot,
    artifactRootRel: input.artifactRootRel,
    receipt: {
      ...input.receipt,
      packageId: SOCIAL_POSTS_DISPATCH_HOOK_PACKAGE_ID,
      status: "success",
      qaOk: true,
      campaignSetRenderVersion: input.identity.campaignSetRenderVersion,
      identity: input.identity,
      postPngShas: input.identity.assets.map((a) => a.pngContentSha256),
      captionSetFingerprint: input.identity.captionSetFingerprint,
      postingOrderFingerprint: input.identity.postingOrderFingerprint,
    },
    campaignSetRenderVersion: input.identity.campaignSetRenderVersion,
  });
  return rel;
}

function alreadyRenderedResult(input: {
  dispatchId: string;
  identity: SocialPostsSetIdentity;
  designSpec: SocialPostsSetSpec;
  receiptRelativePath: string;
  idempotencyKey: string;
}): SocialPostsDispatchHookResult {
  return {
    ok: true,
    ...baseMeta(),
    invocationOutcome: "ALREADY_RENDERED",
    dispatchId: input.dispatchId,
    skuId: DESIGN_RENDERER_SOCIAL_POSTS_SKU,
    identity: input.identity,
    designSpec: input.designSpec,
    receiptRelativePath: input.receiptRelativePath,
    idempotencyKey: input.idempotencyKey,
  };
}

/**
 * Invoke the proven social-posts renderer for one ready dispatch record.
 * Same fingerprint → ALREADY_RENDERED (no new vN).
 */
export async function invokeSocialPostsDispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  /** Test-only fail-closed injectors — never used in production observers. */
  forceQaFail?: boolean;
  forceThirdAssetExportFail?: boolean;
  forceSetConsistencyFail?: boolean;
  forceCaptionBindFail?: boolean;
  forceMissingCaption?: boolean;
}): Promise<SocialPostsDispatchHookResult> {
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_SOCIAL_POSTS_SKU) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SKU_NOT_SUPPORTED",
      message: `social-posts dispatch hook refuses SKU ${record.skuId} — v2-rtu-social-posts only`,
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

  const mapped = mapSocialPostsProjectTruthFromJob({
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

  let designSpec: SocialPostsSetSpec;
  try {
    designSpec = reasonSocialPostsSetDeterministic(mapped.truth);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: msg.startsWith("MISSING_REQUIRED_TRUTH")
        ? "MISSING_REQUIRED_TRUTH"
        : msg.startsWith("INVALID_PLATE")
          ? "INVALID_PLATE"
          : "RENDER_FAILURE",
      message: msg,
    };
  }

  const tuple = buildSocialPostsIdempotencyTuple({
    dispatchId: record.dispatchId,
    jobId: record.jobId,
    skuId: record.skuId,
    spec: designSpec,
  });
  const idempotencyKey = buildSocialPostsIdempotencyKey(tuple);

  const lookup = () =>
    findSuccessfulSocialPostsRenderForFingerprint({
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

  const partial = findPartialSocialPostsRenderState({
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
      message: `Fail closed on partial social-posts render state: ${partial.detail}`,
    };
  }

  const lock = await acquireSocialPostsRenderLockWithBriefWait({
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

    const pipeline = await runSocialPostsJobPipeline({
      repoRoot: input.repoRoot,
      truth: mapped.truth,
      artifactRootRel,
      specOverride: designSpec,
      forceQaFail: input.forceQaFail,
      forceThirdAssetExportFail: input.forceThirdAssetExportFail,
      forceSetConsistencyFail: input.forceSetConsistencyFail,
      forceCaptionBindFail: input.forceCaptionBindFail,
      forceMissingCaption: input.forceMissingCaption,
    });

    if (!pipeline.ok) {
      if (pipeline.identity) {
        const failReceipt: SocialPostsDispatchHookReceipt = {
          packageId: SOCIAL_POSTS_DISPATCH_HOOK_PACKAGE_ID,
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
          rendererVersion: SOCIAL_POSTS_RENDERER_VERSION,
          campaignSetRenderVersion: pipeline.identity.campaignSetRenderVersion,
          identity: pipeline.identity,
          postPngShas: pipeline.identity.assets.map((a) => a.pngContentSha256),
          captionSetFingerprint: pipeline.identity.captionSetFingerprint,
          postingOrderFingerprint: pipeline.identity.postingOrderFingerprint,
          qaOk: false,
          failureCode: pipeline.failureCode,
          message: pipeline.message,
          invokedAt: new Date().toISOString(),
        };
        try {
          writeImmutableSocialPostsVersionReceipt({
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

    const successReceipt: SocialPostsDispatchHookReceipt = {
      packageId: SOCIAL_POSTS_DISPATCH_HOOK_PACKAGE_ID,
      status: "success",
      idempotencyKey,
      dispatchId: record.dispatchId,
      jobId: record.jobId,
      campaignId: input.campaign.campaignId,
      skuId: record.skuId,
      sharedSpecFingerprint: tuple.sharedSpecFingerprint,
      materialFingerprint: tuple.materialFingerprint,
      rendererVersion: SOCIAL_POSTS_RENDERER_VERSION,
      campaignSetRenderVersion: pipeline.identity.campaignSetRenderVersion,
      identity: pipeline.identity,
      postPngShas: pipeline.identity.assets.map((a) => a.pngContentSha256),
      captionSetFingerprint: pipeline.identity.captionSetFingerprint,
      postingOrderFingerprint: pipeline.identity.postingOrderFingerprint,
      qaOk: true,
      invokedAt: new Date().toISOString(),
    };

    const written = writeImmutableSocialPostsVersionReceipt({
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
      skuId: DESIGN_RENDERER_SOCIAL_POSTS_SKU,
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
