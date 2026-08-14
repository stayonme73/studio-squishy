/**
 * STUDIO-OPERATING-DESIGN-MA-001-DISPATCH-HOOK-1
 *
 * Thin dd:{jobId} invoke for ma-001 only (Promotion Pack).
 * Consumes paid ma001PostPayDispatchStructure — purchased basket is law.
 * Exact locked member N/N. Same fingerprint → ALREADY_RENDERED. Material change → vN+1.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_MA_001_SKU,
  runMa001PackRendererPipeline,
  type Ma001PackIdentity,
  type Ma001PackPipelineResult,
} from "@/lib/studio-design-renderer";

import { customerArtifactRootRel } from "./map-flyer-job-truth";
import { mapMa001PackProjectTruthFromJob } from "./map-ma-001-job-truth";
import type { JobDispatchRecord } from "./types";

export const MA_001_DISPATCH_HOOK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-MA-001-DISPATCH-HOOK-1" as const;

export type Ma001DispatchInvocationOutcome = "RENDERED" | "ALREADY_RENDERED";

export type Ma001DispatchHookResult =
  | {
      ok: true;
      packageId: typeof MA_001_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: Ma001DispatchInvocationOutcome;
      dispatchId: string;
      skuId: typeof DESIGN_RENDERER_MA_001_SKU;
      pipeline?: Extract<Ma001PackPipelineResult, { ok: true }>;
      identity: Ma001PackIdentity;
      lockedPackMemberCount: number;
      receiptRelativePath: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    }
  | {
      ok: false;
      packageId: typeof MA_001_DISPATCH_HOOK_PACKAGE_ID;
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
    packageId: MA_001_DISPATCH_HOOK_PACKAGE_ID,
    ownerRoutineProduction: "NONE" as const,
    canvaRequired: false as const,
    makeRequired: false as const,
  };
}

function versionReceiptRel(
  artifactRootRel: string,
  packRenderVersion: number,
): string {
  return `${artifactRootRel}/renders/v${packRenderVersion}/dispatch-hook-receipt.json`;
}

function writeReceipt(input: {
  repoRoot: string;
  artifactRootRel: string;
  identity: Ma001PackIdentity;
  dispatchId: string;
  invocationOutcome: Ma001DispatchInvocationOutcome;
}): string {
  const rel = versionReceiptRel(
    input.artifactRootRel,
    input.identity.packRenderVersion,
  );
  const abs = path.join(input.repoRoot, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  if (!existsSync(abs)) {
    writeFileSync(
      abs,
      JSON.stringify(
        {
          packageId: MA_001_DISPATCH_HOOK_PACKAGE_ID,
          status: "success",
          invocationOutcome: input.invocationOutcome,
          dispatchId: input.dispatchId,
          skuId: DESIGN_RENDERER_MA_001_SKU,
          lockedPackMemberCount: input.identity.lockedPackMemberCount,
          packRenderVersion: input.identity.packRenderVersion,
          packFingerprint: input.identity.packFingerprint,
          memberIds: input.identity.members.map((m) => m.memberId),
          memberKinds: input.identity.members.map((m) => m.kind),
          qaOk: input.identity.packQaOk,
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

/** Exact N/N — never deliver a partial pack. */
function completePackFailure(
  identity: Ma001PackIdentity,
  lockedPackMemberCount: number,
): string | null {
  if (identity.lockedPackMemberCount !== lockedPackMemberCount) {
    return `Rendered pack declares lockedPackMemberCount ${identity.lockedPackMemberCount} but structure locked ${lockedPackMemberCount}`;
  }
  if (identity.members.length !== lockedPackMemberCount) {
    return `PARTIAL_PACK_FAILURE: rendered ${identity.members.length}/${lockedPackMemberCount} members`;
  }
  if (!identity.packQaOk) {
    return "PACK_QA_FAILURE: pack QA not ok on identity";
  }
  return null;
}

/**
 * Invoke the proven ma-001 pack orchestrator for one ready dispatch record.
 * Same pack fingerprint → ALREADY_RENDERED (no new vN).
 */
export async function invokeMa001DispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  forceMemberIdFail?: string;
  forcePromoQaFail?: boolean;
  forcePackQaFail?: boolean;
}): Promise<Ma001DispatchHookResult> {
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_MA_001_SKU) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SKU_NOT_SUPPORTED",
      message: `ma-001 dispatch hook refuses SKU ${record.skuId} — ma-001 only`,
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

  if (!input.campaign.paymentTruth?.ma001CompositionSeal) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "MISSING_PAYMENT_SEAL",
      message: "MISSING_PAYMENT_SEAL: cannot dispatch ma-001 without composition seal",
    };
  }

  if (!input.campaign.ma001PostPayDispatchStructure) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "MISSING_POSTPAY_STRUCTURE",
      message:
        "MISSING_POSTPAY_STRUCTURE: cannot dispatch ma-001 without durable post-pay structure",
    };
  }

  const mapped = mapMa001PackProjectTruthFromJob({
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

  const lockedPackMemberCount = mapped.structure.lockedPackMemberCount;
  const artifactRootRel = customerArtifactRootRel(
    input.campaign.campaignId,
    record.dispatchId,
  );

  const pipeline = await runMa001PackRendererPipeline({
    repoRoot: input.repoRoot,
    truth: mapped.truth,
    artifactRootRel,
    forceMemberIdFail: input.forceMemberIdFail,
    forcePromoQaFail: input.forcePromoQaFail,
    forcePackQaFail: input.forcePackQaFail,
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

  const incomplete = completePackFailure(
    pipeline.identity,
    lockedPackMemberCount,
  );
  if (incomplete) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: incomplete.startsWith("PARTIAL")
        ? "PARTIAL_PACK_FAILURE"
        : incomplete.startsWith("PACK_QA")
          ? "PACK_QA_FAILURE"
          : "MEMBER_COUNT_MISMATCH",
      message: incomplete,
    };
  }

  // Member vs file: pack member count is identity count, not artifact files.
  const cardMember = pipeline.identity.members.find(
    (m) => m.kind === "business_card",
  );
  if (
    cardMember &&
    cardMember.artifacts.length > 1 &&
    pipeline.identity.members.filter((m) => m.memberId === cardMember.memberId)
      .length !== 1
  ) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "MEMBER_COUNT_MISMATCH",
      message:
        "MEMBER_COUNT_MISMATCH: business-card multi-artifact must remain one pack member",
    };
  }
  if (pipeline.identity.members.length !== lockedPackMemberCount) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "MEMBER_COUNT_MISMATCH",
      message:
        "MEMBER_COUNT_MISMATCH: pack identity member count must equal locked pack member count",
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
    skuId: DESIGN_RENDERER_MA_001_SKU,
    pipeline,
    identity: pipeline.identity,
    lockedPackMemberCount,
    receiptRelativePath,
  };
}
