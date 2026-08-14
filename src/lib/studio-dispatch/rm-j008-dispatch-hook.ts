/**
 * STUDIO-OPERATING-DESIGN-RM-J008-DISPATCH-HOOK-1
 *
 * Thin dd:{jobId} invoke for rm-j008 only (Social Profile Update Kit).
 * Consumes paid rmJ008PostPayDispatchStructure — purchased Update Kit is law.
 * Exact platform + before-state + locked member N/N. Same fingerprint → ALREADY_RENDERED.
 * Material authorized change → immutable vN+1.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_RM_J008_SKU,
  runRmJ008KitComposerPipeline,
  type RmJ008KitIdentity,
  type RmJ008KitPipelineResult,
} from "@/lib/studio-design-renderer";

import { customerArtifactRootRel } from "./map-flyer-job-truth";
import { mapRmJ008KitProjectTruthFromJob } from "./map-rm-j008-job-truth";
import type { JobDispatchRecord } from "./types";

export const RM_J008_DISPATCH_HOOK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-RM-J008-DISPATCH-HOOK-1" as const;

export type RmJ008DispatchInvocationOutcome = "RENDERED" | "ALREADY_RENDERED";

export type RmJ008DispatchHookResult =
  | {
      ok: true;
      packageId: typeof RM_J008_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: RmJ008DispatchInvocationOutcome;
      dispatchId: string;
      skuId: typeof DESIGN_RENDERER_RM_J008_SKU;
      pipeline?: Extract<RmJ008KitPipelineResult, { ok: true }>;
      identity: RmJ008KitIdentity;
      platform: RmJ008KitIdentity["platform"];
      lockedKitMemberCount: number;
      receiptRelativePath: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
      accountMutation: false;
    }
  | {
      ok: false;
      packageId: typeof RM_J008_DISPATCH_HOOK_PACKAGE_ID;
      dispatchId?: string;
      skuId?: string;
      failureCode: string;
      message: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
      accountMutation: false;
    };

function baseMeta() {
  return {
    packageId: RM_J008_DISPATCH_HOOK_PACKAGE_ID,
    ownerRoutineProduction: "NONE" as const,
    canvaRequired: false as const,
    makeRequired: false as const,
    accountMutation: false as const,
  };
}

function versionReceiptRel(
  artifactRootRel: string,
  kitRenderVersion: number,
): string {
  return `${artifactRootRel}/renders/v${kitRenderVersion}/dispatch-hook-receipt.json`;
}

function writeReceipt(input: {
  repoRoot: string;
  artifactRootRel: string;
  identity: RmJ008KitIdentity;
  dispatchId: string;
  invocationOutcome: RmJ008DispatchInvocationOutcome;
}): string {
  const rel = versionReceiptRel(
    input.artifactRootRel,
    input.identity.kitRenderVersion,
  );
  const abs = path.join(input.repoRoot, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  if (!existsSync(abs)) {
    writeFileSync(
      abs,
      JSON.stringify(
        {
          packageId: RM_J008_DISPATCH_HOOK_PACKAGE_ID,
          status: "success",
          invocationOutcome: input.invocationOutcome,
          dispatchId: input.dispatchId,
          skuId: DESIGN_RENDERER_RM_J008_SKU,
          platform: input.identity.platform,
          lockedKitMemberCount: input.identity.lockedKitMemberCount,
          kitRenderVersion: input.identity.kitRenderVersion,
          kitFingerprint: input.identity.kitFingerprint,
          beforeStateSource: input.identity.beforeStateSource,
          memberIds: input.identity.members.map((m) => m.memberId),
          memberKinds: input.identity.members.map((m) => m.kind),
          qaOk: input.identity.kitQaOk,
          credentialsPresent: false,
          accountMutation: false,
          customerApplies: true,
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

/** Exact N/N — never deliver a partial Update Kit. */
function completeKitFailure(
  identity: RmJ008KitIdentity,
  lockedKitMemberCount: number,
): string | null {
  if (identity.lockedKitMemberCount !== lockedKitMemberCount) {
    return `Rendered kit declares lockedKitMemberCount ${identity.lockedKitMemberCount} but structure locked ${lockedKitMemberCount}`;
  }
  if (identity.members.length !== lockedKitMemberCount) {
    return `PARTIAL_KIT_FAILURE: rendered ${identity.members.length}/${lockedKitMemberCount} members`;
  }
  if (!identity.kitQaOk) {
    return "KIT_QA_FAILURE: kit QA not ok on identity";
  }
  if (identity.accountMutation !== false || identity.canvaUsed !== false) {
    return "MUTATION_FORBIDDEN: kit identity must remain no-Canva / no account mutation";
  }
  if (identity.beforeStateSource !== "customer_supplied") {
    return "BEFORE_STATE_NOT_CUSTOMER_SUPPLIED: rendered identity lost customer-supplied before-state";
  }
  if (
    !identity.members.some((m) => m.memberId === "before_after_change_sheet")
  ) {
    return "CHANGE_SHEET_MISSING: rendered kit missing change sheet";
  }
  for (const m of identity.members) {
    if (!m.producerQaOk) {
      return `MEMBER_QA_FAILURE: member ${m.memberId} producer QA failed`;
    }
  }
  return null;
}

/**
 * Invoke the proven rm-j008 Update Kit composer for one ready dispatch record.
 * Same kit fingerprint → ALREADY_RENDERED (no new vN).
 */
export async function invokeRmJ008DispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): Promise<RmJ008DispatchHookResult> {
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_RM_J008_SKU) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SKU_NOT_SUPPORTED",
      message: `rm-j008 dispatch hook refuses SKU ${record.skuId} — rm-j008 only`,
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

  if (!input.campaign.paymentTruth?.rmj008KitSeal) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "MISSING_PAYMENT_SEAL",
      message:
        "MISSING_PAYMENT_SEAL: cannot dispatch rm-j008 without Update Kit seal",
    };
  }

  if (!input.campaign.rmJ008PostPayDispatchStructure) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "MISSING_POSTPAY_STRUCTURE",
      message:
        "MISSING_POSTPAY_STRUCTURE: cannot dispatch rm-j008 without durable post-pay structure",
    };
  }

  const mapped = mapRmJ008KitProjectTruthFromJob({
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

  const lockedKitMemberCount = mapped.structure.lockedKitMemberCount;
  const artifactRootRel = customerArtifactRootRel(
    input.campaign.campaignId,
    record.dispatchId,
  );

  const pipeline = await runRmJ008KitComposerPipeline({
    repoRoot: input.repoRoot,
    truth: mapped.truth,
    artifactRootRel,
    outputMode: "customer",
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

  if (pipeline.identity.platform !== mapped.structure.platform) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "PLATFORM_MISMATCH",
      message:
        "PLATFORM_MISMATCH: rendered kit platform does not match paid structure",
    };
  }

  const incomplete = completeKitFailure(
    pipeline.identity,
    lockedKitMemberCount,
  );
  if (incomplete) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: incomplete.startsWith("PARTIAL")
        ? "PARTIAL_KIT_FAILURE"
        : incomplete.startsWith("KIT_QA")
          ? "KIT_QA_FAILURE"
          : incomplete.startsWith("MEMBER_QA")
            ? "MEMBER_QA_FAILURE"
            : incomplete.startsWith("CHANGE_SHEET")
              ? "CHANGE_SHEET_MISSING"
              : incomplete.startsWith("MUTATION")
                ? "MUTATION_FORBIDDEN"
                : incomplete.startsWith("BEFORE_STATE")
                  ? "BEFORE_STATE_NOT_CUSTOMER_SUPPLIED"
                  : "MEMBER_COUNT_MISMATCH",
      message: incomplete,
    };
  }

  // Exact ordered identities vs paid structure — no silent reordering.
  for (let i = 0; i < lockedKitMemberCount; i++) {
    const expected = mapped.structure.members[i]!;
    const actual = pipeline.identity.members[i]!;
    if (
      actual.memberId !== expected.memberId ||
      actual.kind !== expected.kind ||
      actual.order !== expected.order
    ) {
      return {
        ok: false,
        ...baseMeta(),
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        failureCode: "MEMBER_IDENTITY_MISMATCH",
        message: `MEMBER_IDENTITY_MISMATCH: rendered slot ${i + 1} drifted from paid structure`,
      };
    }
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
    skuId: DESIGN_RENDERER_RM_J008_SKU,
    pipeline,
    identity: pipeline.identity,
    platform: pipeline.identity.platform,
    lockedKitMemberCount,
    receiptRelativePath,
  };
}
