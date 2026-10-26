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
import { refineLaunchDesignSpecCreative } from "@/lib/studio-production-team-workforce";

import { customerArtifactRootRel } from "./map-flyer-job-truth";
import { mapPromoProjectTruthFromJob } from "./map-promo-job-truth";
import {
  mapSocialPromoOfferLedPromoTruth,
  type SocialPromoOfferLedFailure,
} from "./map-social-promo-offer-led-truth";
import { mapSocialPromoThemeLedPromoTruth } from "./map-social-promo-theme-led-truth";
import {
  isCampaignLaunchKitBranchJob,
  projectCampaignLaunchKitOntoSocialPromo,
} from "./campaign-launch-kit-brief";
import {
  isSocialPromoCompositeBranchJob,
  themeLedSetFingerprint,
} from "./social-promo-composite-dispatch";
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
import { disposableSocialPromoCertBlocksBillableProviders } from "@/lib/studio-payment/disposable-social-promo-cert-isolation";
import type { GeneralDesignInternalLoopRecord } from "@/config/studio-general-design-runtime-v1";
import {
  appendGeneralDesignAttempt,
  applyGeneralDesignChromeCorrection,
  createGeneralDesignInternalLoop,
  isChromeCorrectableFailure,
  remainingGeneralDesignAttempts,
} from "@/lib/studio-general-design-runtime/correction";

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
      generalDesignLoop?: GeneralDesignInternalLoopRecord;
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
      generalDesignLoop?: GeneralDesignInternalLoopRecord;
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
  generalDesignLoop?: GeneralDesignInternalLoopRecord;
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
    generalDesignLoop: input.generalDesignLoop,
  };
}

/**
 * Invoke the proven promotion-graphics renderer for one ready dispatch record.
 * Same fingerprint → ALREADY_RENDERED (no new vN).
 */

function mapPromoBranch(
  jobId: string,
  mapInput: Parameters<typeof mapPromoProjectTruthFromJob>[0],
) {
  if (isCampaignLaunchKitBranchJob(jobId) && jobId.endsWith(":branch:graphics")) {
    const projected = projectCampaignLaunchKitOntoSocialPromo(mapInput.campaign);
    if (!projected.ok) {
      const failure: SocialPromoOfferLedFailure = {
        ok: false,
        code: "MISSING_REQUIRED_TRUTH",
        message: projected.message,
      };
      return failure;
    }
    return mapSocialPromoOfferLedPromoTruth({ ...mapInput, campaign: projected.campaign });
  }
  if (!isSocialPromoCompositeBranchJob(jobId)) return mapPromoProjectTruthFromJob(mapInput);
  const offer = mapSocialPromoOfferLedPromoTruth(mapInput);
  if (offer.ok || offer.code !== "THEME_LED_PATH") return offer;
  return mapSocialPromoThemeLedPromoTruth(mapInput);
}

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

  const mapInput = {
    repoRoot: input.repoRoot,
    campaign: input.campaign,
    dispatchRecord: record,
    materials: input.materials,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  };
  const mapped = mapPromoBranch(record.jobId, mapInput);
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
    const seed = reasonPromoCampaignSetDeterministic(mapped.truth);
    designSpec = await refineLaunchDesignSpecCreative({
      skuId: record.skuId,
      seed,
      authorizedFacts: mapped.truth,
      forbidBillableProviders: disposableSocialPromoCertBlocksBillableProviders(
        input.campaign,
      ),
    });
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

  const themeLed = mapped.truth.contentMode === "theme_led";
  const tupleFor = (spec: PromoCampaignSetSpec) => {
    const built = buildPromoIdempotencyTuple({
      dispatchId: record.dispatchId,
      jobId: record.jobId,
      skuId: record.skuId,
      spec,
    });
    return themeLed
      ? { ...built, sharedSpecFingerprint: themeLedSetFingerprint(built.sharedSpecFingerprint, spec.assets) }
      : built;
  };
  const tuple = tupleFor(designSpec);
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

    let workingTruth = mapped.truth;
    let workingSpec = designSpec;
    let loop = createGeneralDesignInternalLoop({
      skuId: record.skuId,
      campaignId: input.campaign.campaignId,
      jobId: record.jobId,
      dispatchId: record.dispatchId,
    });

    const runAttempt = (
      truth: typeof mapped.truth,
      spec: PromoCampaignSetSpec,
      forceQaFail?: boolean,
    ) =>
      runPromoJobPipeline({
        repoRoot: input.repoRoot,
        truth,
        artifactRootRel,
        specOverride: spec,
        forceQaFail,
        forceFirstAssetExportFail: input.forceFirstAssetExportFail,
        forceSecondAssetExportFail: input.forceSecondAssetExportFail,
        forceSetConsistencyFail: input.forceSetConsistencyFail,
      });

    let pipeline = await runAttempt(workingTruth, workingSpec, input.forceQaFail);
    const startedAt = new Date().toISOString();
    loop = appendGeneralDesignAttempt(loop, {
      attemptNumber: 1,
      triggeredBy: "initial_dispatch",
      qaResult: pipeline.ok ? "pass" : "fail",
      failureCode: pipeline.ok ? null : pipeline.failureCode,
      message: pipeline.ok ? null : pipeline.message,
      pngContentSha256: pipeline.identity?.assets[0]?.pngContentSha256 ?? null,
      startedAt,
      completedAt: new Date().toISOString(),
    });

    const injectorsActive = Boolean(
      input.forceQaFail ||
        input.forceFirstAssetExportFail ||
        input.forceSecondAssetExportFail ||
        input.forceSetConsistencyFail,
    );

    while (
      !pipeline.ok &&
      !injectorsActive &&
      (isChromeCorrectableFailure(pipeline.failureCode) ||
        pipeline.failureCode === "QA_FAILURE" ||
        pipeline.failureCode === "SET_CONSISTENCY_FAILURE") &&
      remainingGeneralDesignAttempts(loop) > 0
    ) {
      if (isChromeCorrectableFailure(pipeline.failureCode)) {
        workingTruth = applyGeneralDesignChromeCorrection(workingTruth);
      }
      try {
        workingSpec = reasonPromoCampaignSetDeterministic(workingTruth);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          ok: false,
          ...baseMeta(),
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          failureCode: "MISSING_REQUIRED_TRUTH",
          message: msg,
          generalDesignLoop: loop,
        };
      }
      const correctedTuple = tupleFor(workingSpec);
      const correctedExisting = findSuccessfulPromoRenderForFingerprint({
        repoRoot: input.repoRoot,
        artifactRootRel,
        tuple: correctedTuple,
      });
      if (correctedExisting.found) {
        loop = appendGeneralDesignAttempt(loop, {
          attemptNumber: loop.attempts.length + 1,
          triggeredBy: "qa_correction",
          qaResult: "pass",
          failureCode: null,
          message: null,
          pngContentSha256:
            correctedExisting.identity.assets[0]?.pngContentSha256 ?? null,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });
        const receiptRelativePath = ensureVersionReceiptPresent({
          repoRoot: input.repoRoot,
          artifactRootRel,
          receipt: correctedExisting.receipt,
          identity: correctedExisting.identity,
        });
        return alreadyRenderedResult({
          dispatchId: record.dispatchId,
          identity: correctedExisting.identity,
          designSpec: workingSpec,
          receiptRelativePath,
          idempotencyKey: buildPromoIdempotencyKey(correctedTuple),
          generalDesignLoop: loop,
        });
      }
      const retryStarted = new Date().toISOString();
      pipeline = await runAttempt(workingTruth, workingSpec, false);
      loop = appendGeneralDesignAttempt(loop, {
        attemptNumber: loop.attempts.length + 1,
        triggeredBy: "qa_correction",
        qaResult: pipeline.ok ? "pass" : "fail",
        failureCode: pipeline.ok ? null : pipeline.failureCode,
        message: pipeline.ok ? null : pipeline.message,
        pngContentSha256: pipeline.identity?.assets[0]?.pngContentSha256 ?? null,
        startedAt: retryStarted,
        completedAt: new Date().toISOString(),
      });
    }

    designSpec = workingSpec;

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
        message:
          loop.status === "fail_closed" &&
          (pipeline.failureCode === "QA_FAILURE" ||
            pipeline.failureCode === "SET_CONSISTENCY_FAILURE")
            ? "Internal campaign-graphics correction budget exhausted. Owner will not finish the campaign graphics. The honest next step is a refund or cannot-deliver close."
            : pipeline.message,
        generalDesignLoop: loop,
      };
    }

    const settledTuple = tupleFor(designSpec);
    const settledKey = buildPromoIdempotencyKey(settledTuple);

    const [assetA, assetB] = pipeline.identity.assets;
    const successReceipt: PromoDispatchHookReceipt = {
      packageId: PROMO_DISPATCH_HOOK_PACKAGE_ID,
      status: "success",
      idempotencyKey: settledKey,
      dispatchId: record.dispatchId,
      jobId: record.jobId,
      campaignId: input.campaign.campaignId,
      skuId: record.skuId,
      sharedSpecFingerprint: settledTuple.sharedSpecFingerprint,
      materialFingerprint: settledTuple.materialFingerprint,
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
      idempotencyKey: settledKey,
      generalDesignLoop: loop,
    };
  } finally {
    lock.handle.release();
  }
}
