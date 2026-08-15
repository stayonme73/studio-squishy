/**
 * STUDIO-OPERATING-DESIGN-BF-001-DISPATCH-HOOK-1
 *
 * Thin dd:{jobId} invoke for bf-001 only (Brand Identity Refresh).
 * Consumes paid bf001PostPayDispatchStructure — the purchased 2-member refresh
 * package is law. Exact graphic kind + both member plates + 2/2 membership.
 * Same package fingerprint → ALREADY_RENDERED. Authorized change → immutable vN+1.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_BF_001_SKU,
  runBf001PackageComposerPipeline,
  type Bf001PackageIdentity,
  type Bf001PackagePipelineResult,
} from "@/lib/studio-design-renderer";

import { customerArtifactRootRel } from "./map-flyer-job-truth";
import { mapBf001RefreshProjectTruthFromJob } from "./map-bf-001-job-truth";
import type { JobDispatchRecord } from "./types";

export const BF_001_DISPATCH_HOOK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-BF-001-DISPATCH-HOOK-1" as const;

export type Bf001DispatchInvocationOutcome = "RENDERED" | "ALREADY_RENDERED";

export type Bf001DispatchHookResult =
  | {
      ok: true;
      packageId: typeof BF_001_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: Bf001DispatchInvocationOutcome;
      dispatchId: string;
      skuId: typeof DESIGN_RENDERER_BF_001_SKU;
      pipeline?: Extract<Bf001PackagePipelineResult, { ok: true }>;
      identity: Bf001PackageIdentity;
      graphicKind: Bf001PackageIdentity["graphicKind"];
      lockedPackageMemberCount: number;
      receiptRelativePath: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
      newLogoCreated: false;
    }
  | {
      ok: false;
      packageId: typeof BF_001_DISPATCH_HOOK_PACKAGE_ID;
      dispatchId?: string;
      skuId?: string;
      failureCode: string;
      message: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
      newLogoCreated: false;
    };

function baseMeta() {
  return {
    packageId: BF_001_DISPATCH_HOOK_PACKAGE_ID,
    ownerRoutineProduction: "NONE" as const,
    canvaRequired: false as const,
    makeRequired: false as const,
    newLogoCreated: false as const,
  };
}

function versionReceiptRel(
  artifactRootRel: string,
  packageRenderVersion: number,
): string {
  return `${artifactRootRel}/renders/v${packageRenderVersion}/dispatch-hook-receipt.json`;
}

function writeReceipt(input: {
  repoRoot: string;
  artifactRootRel: string;
  identity: Bf001PackageIdentity;
  dispatchId: string;
  invocationOutcome: Bf001DispatchInvocationOutcome;
}): string {
  const rel = versionReceiptRel(
    input.artifactRootRel,
    input.identity.packageRenderVersion,
  );
  const abs = path.join(input.repoRoot, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  if (!existsSync(abs)) {
    writeFileSync(
      abs,
      JSON.stringify(
        {
          packageId: BF_001_DISPATCH_HOOK_PACKAGE_ID,
          status: "success",
          invocationOutcome: input.invocationOutcome,
          dispatchId: input.dispatchId,
          skuId: DESIGN_RENDERER_BF_001_SKU,
          graphicKind: input.identity.graphicKind,
          lockedPackageMemberCount: input.identity.lockedPackageMemberCount,
          packageRenderVersion: input.identity.packageRenderVersion,
          packageFingerprint: input.identity.packageFingerprint,
          memberIds: input.identity.members.map((m) => m.memberId),
          memberKinds: input.identity.members.map((m) => m.kind),
          memberPlateIds: input.identity.members.map((m) => m.agreedPlateId),
          qaOk: input.identity.packageQaOk,
          startingPointSource: "customer_supplied",
          newLogoCreated: false,
          namingPerformed: false,
          messagingWritten: false,
          fontSectionMode: "recommendations_only",
          logoUsageMode: "usage_guidance_only",
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

/** Exact 2/2 — never deliver a partial refresh package. */
function completePackageFailure(
  identity: Bf001PackageIdentity,
  lockedPackageMemberCount: number,
): string | null {
  if (identity.lockedPackageMemberCount !== lockedPackageMemberCount) {
    return `Rendered package declares lockedPackageMemberCount ${identity.lockedPackageMemberCount} but structure locked ${lockedPackageMemberCount}`;
  }
  if (identity.members.length !== lockedPackageMemberCount) {
    return `PARTIAL_PACKAGE_FAILURE: rendered ${identity.members.length}/${lockedPackageMemberCount} members`;
  }
  if (!identity.packageQaOk) {
    return "PACKAGE_QA_FAILURE: package QA not ok on identity";
  }
  if (identity.canvaUsed !== false || identity.remapAuthorized !== false) {
    return "MUTATION_FORBIDDEN: package identity must remain no-Canva / no-remap";
  }
  if (!identity.members.some((m) => m.memberId === "brand_direction_sheet")) {
    return "SHEET_MEMBER_MISSING: rendered package missing the Brand Direction Sheet";
  }
  if (
    !identity.members.some((m) => m.memberId === "profile_or_cover_graphic")
  ) {
    return "GRAPHIC_MEMBER_MISSING: rendered package missing the branded graphic";
  }
  for (const m of identity.members) {
    if (!m.producerQaOk) {
      return `MEMBER_QA_FAILURE: member ${m.memberId} producer QA failed`;
    }
  }
  return null;
}

/**
 * Invoke the proven bf-001 refresh package composer for one ready dispatch record.
 * Same package fingerprint → ALREADY_RENDERED (no new vN).
 */
export async function invokeBf001DispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): Promise<Bf001DispatchHookResult> {
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_BF_001_SKU) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SKU_NOT_SUPPORTED",
      message: `bf-001 dispatch hook refuses SKU ${record.skuId} — bf-001 only`,
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

  if (!input.campaign.paymentTruth?.bf001PackageSeal) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "MISSING_PAYMENT_SEAL",
      message:
        "MISSING_PAYMENT_SEAL: cannot dispatch bf-001 without refresh package seal",
    };
  }

  if (!input.campaign.bf001PostPayDispatchStructure) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "MISSING_POSTPAY_STRUCTURE",
      message:
        "MISSING_POSTPAY_STRUCTURE: cannot dispatch bf-001 without durable post-pay structure",
    };
  }

  const mapped = mapBf001RefreshProjectTruthFromJob({
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

  const lockedPackageMemberCount = mapped.structure.lockedPackageMemberCount;
  const artifactRootRel = customerArtifactRootRel(
    input.campaign.campaignId,
    record.dispatchId,
  );

  const pipeline = await runBf001PackageComposerPipeline({
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

  if (pipeline.identity.graphicKind !== mapped.structure.graphicKind) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "GRAPHIC_KIND_MISMATCH",
      message:
        "GRAPHIC_KIND_MISMATCH: rendered package graphic kind does not match paid structure",
    };
  }

  const incomplete = completePackageFailure(
    pipeline.identity,
    lockedPackageMemberCount,
  );
  if (incomplete) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: incomplete.startsWith("PARTIAL")
        ? "PARTIAL_PACKAGE_FAILURE"
        : incomplete.startsWith("PACKAGE_QA")
          ? "PACKAGE_QA_FAILURE"
          : incomplete.startsWith("MEMBER_QA")
            ? "MEMBER_QA_FAILURE"
            : incomplete.startsWith("SHEET_MEMBER")
              ? "SHEET_MEMBER_MISSING"
              : incomplete.startsWith("GRAPHIC_MEMBER")
                ? "GRAPHIC_MEMBER_MISSING"
                : incomplete.startsWith("MUTATION")
                  ? "MUTATION_FORBIDDEN"
                  : "MEMBER_COUNT_MISMATCH",
      message: incomplete,
    };
  }

  // Exact ordered identities + plates vs paid structure — no silent reordering.
  for (let i = 0; i < lockedPackageMemberCount; i++) {
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
    if (actual.agreedPlateId !== expected.agreedPlateId) {
      return {
        ok: false,
        ...baseMeta(),
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        failureCode: "PLATE_TAMPER",
        message: `PLATE_TAMPER: rendered member ${actual.memberId} plate drifted from paid structure`,
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
    skuId: DESIGN_RENDERER_BF_001_SKU,
    pipeline,
    identity: pipeline.identity,
    graphicKind: pipeline.identity.graphicKind,
    lockedPackageMemberCount,
    receiptRelativePath,
  };
}
