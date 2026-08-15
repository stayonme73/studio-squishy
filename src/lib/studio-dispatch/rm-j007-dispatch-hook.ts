/**
 * STUDIO-OPERATING-DESIGN-RM-J007-DISPATCH-HOOK-1
 *
 * Thin dd:{jobId} invoke for rm-j007 only (Reference-Guided Promotion Update).
 * Consumes paid rmj007PostPayDispatchStructure. Same fingerprint → ALREADY_RENDERED.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_RM_J007_SKU,
  runRmJ007PackageComposerPipeline,
  type RmJ007PackageIdentity,
  type RmJ007PackagePipelineResult,
} from "@/lib/studio-design-renderer";

import { customerArtifactRootRel } from "./map-flyer-job-truth";
import { mapRmJ007UpdateProjectTruthFromJob } from "./map-rm-j007-job-truth";
import type { JobDispatchRecord } from "./types";

export const RM_J007_DISPATCH_HOOK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-RM-J007-DISPATCH-HOOK-1" as const;

export type RmJ007DispatchInvocationOutcome = "RENDERED" | "ALREADY_RENDERED";

export type RmJ007DispatchHookResult =
  | {
      ok: true;
      packageId: typeof RM_J007_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: RmJ007DispatchInvocationOutcome;
      dispatchId: string;
      skuId: typeof DESIGN_RENDERER_RM_J007_SKU;
      pipeline?: Extract<RmJ007PackagePipelineResult, { ok: true }>;
      identity: RmJ007PackageIdentity;
      lockedPackageMemberCount: number;
      receiptRelativePath: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    }
  | {
      ok: false;
      packageId: typeof RM_J007_DISPATCH_HOOK_PACKAGE_ID;
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
    packageId: RM_J007_DISPATCH_HOOK_PACKAGE_ID,
    ownerRoutineProduction: "NONE" as const,
    canvaRequired: false as const,
    makeRequired: false as const,
  };
}

function writeReceipt(input: {
  repoRoot: string;
  artifactRootRel: string;
  identity: RmJ007PackageIdentity;
  dispatchId: string;
  invocationOutcome: RmJ007DispatchInvocationOutcome;
}): string {
  const rel = `${input.artifactRootRel}/renders/v${input.identity.packageRenderVersion}/dispatch-hook-receipt.json`;
  const abs = path.join(input.repoRoot, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  if (!existsSync(abs)) {
    writeFileSync(
      abs,
      JSON.stringify(
        {
          packageId: RM_J007_DISPATCH_HOOK_PACKAGE_ID,
          status: "success",
          invocationOutcome: input.invocationOutcome,
          dispatchId: input.dispatchId,
          skuId: DESIGN_RENDERER_RM_J007_SKU,
          lockedPackageMemberCount: input.identity.lockedPackageMemberCount,
          packageRenderVersion: input.identity.packageRenderVersion,
          packageFingerprint: input.identity.packageFingerprint,
          memberIds: input.identity.members.map((m) => m.memberId),
          qaOk: input.identity.packageQaOk,
          fulfillmentMode: "recreation",
          acceptRecreationLimits: true,
          redesignRequested: false,
          ownerRoutineProduction: "NONE",
          canvaRequired: false,
          makeRequired: false,
          writtenAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      "utf8",
    );
  }
  return rel;
}

export async function invokeRmJ007DispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedReferenceRelativePath?: string;
}): Promise<RmJ007DispatchHookResult> {
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_RM_J007_SKU) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SKU_NOT_SUPPORTED",
      message: `rm-j007 dispatch hook refuses SKU ${record.skuId} — rm-j007 only`,
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

  if (!input.campaign.paymentTruth?.rmj007UpdateSeal) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "MISSING_PAYMENT_SEAL",
      message:
        "MISSING_PAYMENT_SEAL: cannot dispatch rm-j007 without update seal",
    };
  }

  if (!input.campaign.rmj007PostPayDispatchStructure) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "MISSING_POSTPAY_STRUCTURE",
      message:
        "MISSING_POSTPAY_STRUCTURE: cannot dispatch rm-j007 without durable post-pay structure",
    };
  }

  const mapped = mapRmJ007UpdateProjectTruthFromJob({
    repoRoot: input.repoRoot,
    campaign: input.campaign,
    dispatchRecord: record,
    materials: input.materials,
    stagedReferenceRelativePath: input.stagedReferenceRelativePath,
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

  const lockedPackageMemberCount = mapped.structure.lockedPackageMemberCount;
  const artifactRootRel = customerArtifactRootRel(
    input.campaign.campaignId,
    record.dispatchId,
  );

  const pipeline = await runRmJ007PackageComposerPipeline({
    repoRoot: input.repoRoot,
    truth: mapped.truth,
    artifactRootRel,
    outputMode: "dispatch",
  });

  if (!pipeline.ok) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: pipeline.failureCode,
      message: pipeline.message,
    };
  }

  if (pipeline.identity.lockedPackageMemberCount !== lockedPackageMemberCount) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "MEMBER_COUNT_MISMATCH",
      message: "MEMBER_COUNT_MISMATCH: rendered package member count drifted",
    };
  }
  if (pipeline.identity.members.length !== 1) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "PARTIAL_PACKAGE_FAILURE",
      message: "PARTIAL_PACKAGE_FAILURE: expected exactly 1 member",
    };
  }
  if (!pipeline.identity.packageQaOk || pipeline.identity.canvaUsed !== false) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "PACKAGE_QA_FAILURE",
      message: "PACKAGE_QA_FAILURE: package QA not ok or Canva used",
    };
  }

  const invocationOutcome =
    pipeline.invocationOutcome === "ALREADY_RENDERED"
      ? "ALREADY_RENDERED"
      : "RENDERED";

  const receiptRelativePath = writeReceipt({
    repoRoot: input.repoRoot,
    artifactRootRel,
    identity: pipeline.identity,
    dispatchId: record.dispatchId,
    invocationOutcome,
  });

  return {
    ok: true,
    ...baseMeta(),
    invocationOutcome,
    dispatchId: record.dispatchId,
    skuId: DESIGN_RENDERER_RM_J007_SKU,
    pipeline,
    identity: pipeline.identity,
    lockedPackageMemberCount,
    receiptRelativePath,
  };
}
