/**
 * ma-001 Promotion Pack orchestrator — proof only.
 * Reuses sealed flyer / card / service-sheet pipelines + single promo adapter.
 * Does not remap primaryTool. Does not wire dispatch. Does not fork sealed renderers.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { nextRenderVersion } from "./bind";
import { runBusinessCardRendererPipeline } from "./card-pipeline";
import { FLYER_CANVAS } from "./types";
import { BUSINESS_CARD_CANVAS } from "./card-types";
import {
  isDesignRendererMa001Sku,
  validateMa001PackComposition,
} from "./ma-001-contracts";
import { persistMa001PackArtifacts } from "./ma-001-bind";
import { fingerprintMa001Pack } from "./ma-001-fingerprint";
import { MA_001_PROOF_ARTIFACT_ROOT, MA_001_PROOF_PACKAGE_ID } from "./ma-001-fixtures";
import { evaluateMa001PackQa } from "./ma-001-pack-qa";
import { runMa001PromotionGraphicMemberAdapter } from "./ma-001-promo-member-adapter";
import type {
  Ma001MemberResult,
  Ma001OutputMode,
  Ma001PackIdentity,
  Ma001PackPipelineResult,
  Ma001PackProjectTruth,
} from "./ma-001-types";
import { runDesignRendererPipeline } from "./pipeline";
import { runServiceSheetRendererPipeline } from "./service-sheet-pipeline";
import { SERVICE_SHEET_CANVAS } from "./service-sheet-types";

function fail(
  mode: Ma001OutputMode,
  code: Extract<Ma001PackPipelineResult, { ok: false }>["failureCode"],
  message: string,
  extra?: Partial<Extract<Ma001PackPipelineResult, { ok: false }>>,
): Ma001PackPipelineResult {
  return {
    ok: false,
    verdict:
      mode === "customer"
        ? "MA_001_PACK_ORCHESTRATOR_JOB_FAIL"
        : "MA_001_PACK_ORCHESTRATOR_PROOF_FAIL",
    failureCode: code,
    message,
    outputMode: mode,
    ...extra,
  };
}

function readCurrentIdentity(
  repoRoot: string,
  artifactRootRel: string,
): Ma001PackIdentity | null {
  const p = path.join(repoRoot, artifactRootRel, "current-identity.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Ma001PackIdentity;
  } catch {
    return null;
  }
}

async function produceMember(input: {
  repoRoot: string;
  truth: Ma001PackProjectTruth;
  planned: Ma001PackProjectTruth["plannedPackMembers"][number];
  memberArtifactRootRel: string;
  forceMemberIdFail?: string;
  forcePromoQaFail?: boolean;
}): Promise<
  | { ok: true; member: Ma001MemberResult }
  | {
      ok: false;
      failureCode: Extract<Ma001PackPipelineResult, { ok: false }>["failureCode"];
      message: string;
    }
> {
  const { planned, truth } = input;
  if (input.forceMemberIdFail && planned.memberId === input.forceMemberIdFail) {
    return {
      ok: false,
      failureCode: "MEMBER_RENDER_FAILURE",
      message: `Forced member render failure for ${planned.memberId}`,
    };
  }

  const payload = truth.memberTruthById[planned.memberId];
  if (!payload) {
    return {
      ok: false,
      failureCode: "MISSING_MEMBER_TRUTH",
      message: `No memberTruthById for ${planned.memberId}`,
    };
  }

  if (payload.kind === "flyer") {
    const result = await runDesignRendererPipeline({
      repoRoot: input.repoRoot,
      truth: payload.truth,
      artifactRootRel: input.memberArtifactRootRel,
    });
    if (!result.ok) {
      return {
        ok: false,
        failureCode:
          result.failureCode === "QA_FAILURE"
            ? "MEMBER_QA_FAILURE"
            : "MEMBER_RENDER_FAILURE",
        message: `${result.failureCode}: ${result.message}`,
      };
    }
    const id = result.identity;
    return {
      ok: true,
      member: {
        memberId: planned.memberId,
        kind: "flyer",
        order: planned.order,
        producerFamily: planned.producerFamily,
        agreedPlateId: planned.agreedPlateId ?? "cert-portrait-1024x1536",
        memberPurpose: planned.memberPurpose,
        producerQaOk: result.qaOk,
        artifacts: [
          {
            role: "png",
            relativePath: id.pngRelativePath,
            contentSha256: id.pngContentSha256,
            widthPx: id.widthPx,
            heightPx: id.heightPx,
          },
          {
            role: "pdf",
            relativePath: id.pdfRelativePath,
            contentSha256: id.pdfContentSha256,
            widthPx: id.widthPx,
            heightPx: id.heightPx,
          },
          {
            role: "html",
            relativePath: id.htmlRelativePath,
            contentSha256: id.pngContentSha256,
          },
        ],
        producerIdentityRel: id.pngRelativePath.replace(
          /flyer\.png$/i,
          "artifact-identity.json",
        ),
        producerRenderVersion: id.renderVersion,
      },
    };
  }

  if (payload.kind === "business_card") {
    const result = await runBusinessCardRendererPipeline({
      repoRoot: input.repoRoot,
      truth: payload.truth,
      artifactRootRel: input.memberArtifactRootRel,
    });
    if (!result.ok) {
      return {
        ok: false,
        failureCode:
          result.failureCode === "QA_FAILURE"
            ? "MEMBER_QA_FAILURE"
            : "MEMBER_RENDER_FAILURE",
        message: `${result.failureCode}: ${result.message}`,
      };
    }
    const id = result.identity;
    const artifacts = [
      ...id.sides.map((s) => ({
        role: `side-${s.side}`,
        relativePath: s.pngRelativePath,
        contentSha256: s.pngContentSha256,
        widthPx: s.widthPx,
        heightPx: s.heightPx,
      })),
      {
        role: "pdf",
        relativePath: id.pdfRelativePath,
        contentSha256: id.pdfContentSha256,
        widthPx: BUSINESS_CARD_CANVAS.widthPx,
        heightPx: BUSINESS_CARD_CANVAS.heightPx,
      },
    ];
    return {
      ok: true,
      member: {
        memberId: planned.memberId,
        kind: "business_card",
        order: planned.order,
        producerFamily: planned.producerFamily,
        agreedPlateId: planned.agreedPlateId ?? "cert-landscape-1536x1024",
        memberPurpose: planned.memberPurpose,
        producerQaOk: result.qaOk,
        artifacts,
        producerIdentityRel: id.designSpecRelativePath.replace(
          /design-spec\.json$/i,
          "artifact-identity.json",
        ),
        producerRenderVersion: id.renderVersion,
      },
    };
  }

  if (payload.kind === "service_sheet") {
    const result = await runServiceSheetRendererPipeline({
      repoRoot: input.repoRoot,
      truth: payload.truth,
      artifactRootRel: input.memberArtifactRootRel,
    });
    if (!result.ok) {
      return {
        ok: false,
        failureCode:
          result.failureCode === "QA_FAILURE"
            ? "MEMBER_QA_FAILURE"
            : "MEMBER_RENDER_FAILURE",
        message: `${result.failureCode}: ${result.message}`,
      };
    }
    const id = result.identity;
    return {
      ok: true,
      member: {
        memberId: planned.memberId,
        kind: "service_sheet",
        order: planned.order,
        producerFamily: planned.producerFamily,
        agreedPlateId: planned.agreedPlateId ?? "cert-portrait-1024x1536",
        memberPurpose: planned.memberPurpose,
        producerQaOk: result.qaOk,
        artifacts: [
          {
            role: "png",
            relativePath: id.pngRelativePath,
            contentSha256: id.pngContentSha256,
            widthPx: id.widthPx,
            heightPx: id.heightPx,
          },
          {
            role: "pdf",
            relativePath: id.pdfRelativePath,
            contentSha256: id.pdfContentSha256,
            widthPx: id.widthPx,
            heightPx: id.heightPx,
          },
          {
            role: "html",
            relativePath: id.htmlRelativePath,
            contentSha256: id.pngContentSha256,
          },
        ],
        producerIdentityRel: id.pngRelativePath.replace(
          /service-sheet\.png$/i,
          "artifact-identity.json",
        ),
        producerRenderVersion: id.renderVersion,
      },
    };
  }

  if (payload.kind === "promotion_graphic") {
    const adapted = await runMa001PromotionGraphicMemberAdapter({
      repoRoot: input.repoRoot,
      memberId: planned.memberId,
      order: planned.order,
      memberPurpose: planned.memberPurpose,
      memberTruth: payload.truth,
      artifactRootRel: input.memberArtifactRootRel,
      campaignId: truth.campaignId,
      jobId: truth.jobId,
      dispatchId: truth.dispatchId,
      forceQaFail: input.forcePromoQaFail,
    });
    if (!adapted.ok) {
      return {
        ok: false,
        failureCode:
          adapted.failureCode === "MEMBER_QA_FAILURE"
            ? "MEMBER_QA_FAILURE"
            : adapted.failureCode === "WRONG_PLATE"
              ? "WRONG_PLATE"
              : "MEMBER_RENDER_FAILURE",
        message: adapted.message,
      };
    }
    return { ok: true, member: adapted.member };
  }

  return {
    ok: false,
    failureCode: "UNSUPPORTED_KIND",
    message: `Kind ${planned.kind} has no pack producer path`,
  };
}

export async function runMa001PackRendererPipeline(input: {
  repoRoot: string;
  truth: Ma001PackProjectTruth;
  artifactRootRel: string;
  forceMemberIdFail?: string;
  forcePromoQaFail?: boolean;
  forcePackQaFail?: boolean;
}): Promise<Ma001PackPipelineResult> {
  const mode = input.truth.outputMode;

  if (!isDesignRendererMa001Sku(input.truth.skuId)) {
    return fail(mode, "SKU_NOT_SUPPORTED", `SKU ${input.truth.skuId} not ma-001`);
  }

  const composition = validateMa001PackComposition(input.truth);
  if (!composition.ok) {
    return fail(mode, composition.code, composition.message, {
      artifactRootRel: input.artifactRootRel,
    });
  }

  const packFingerprint = fingerprintMa001Pack(input.truth);
  const existing = readCurrentIdentity(input.repoRoot, input.artifactRootRel);
  if (
    existing?.packQaOk &&
    existing.packFingerprint === packFingerprint &&
    existing.lockedPackMemberCount === input.truth.lockedPackMemberCount
  ) {
    return {
      ok: true,
      verdict:
        mode === "customer"
          ? "MA_001_PACK_ORCHESTRATOR_JOB_PASS"
          : "MA_001_PACK_ORCHESTRATOR_PROOF_PASS",
      invocationOutcome: "ALREADY_RENDERED",
      identity: existing,
      outputMode: mode,
      artifactRootRel: input.artifactRootRel,
      packFingerprint,
    };
  }

  mkdirSync(path.join(input.repoRoot, input.artifactRootRel), {
    recursive: true,
  });

  const packRenderVersion = nextRenderVersion(
    input.repoRoot,
    input.artifactRootRel,
  );
  const packDirRel = `${input.artifactRootRel}/renders/v${packRenderVersion}`;
  mkdirSync(path.join(input.repoRoot, packDirRel), { recursive: true });

  const ordered = [...input.truth.plannedPackMembers].sort(
    (a, b) => a.order - b.order,
  );
  const members: Ma001MemberResult[] = [];

  for (const planned of ordered) {
    const memberRoot = `${packDirRel}/members/${planned.memberId}`;
    const produced = await produceMember({
      repoRoot: input.repoRoot,
      truth: input.truth,
      planned,
      memberArtifactRootRel: memberRoot,
      forceMemberIdFail: input.forceMemberIdFail,
      forcePromoQaFail: input.forcePromoQaFail,
    });
    if (!produced.ok) {
      return fail(mode, produced.failureCode, produced.message, {
        artifactRootRel: input.artifactRootRel,
      });
    }
    members.push(produced.member);
  }

  if (members.length !== input.truth.lockedPackMemberCount) {
    return fail(
      mode,
      "PARTIAL_PACK_FAILURE",
      `Produced ${members.length} members; locked ${input.truth.lockedPackMemberCount}`,
      { artifactRootRel: input.artifactRootRel },
    );
  }

  let packQa = evaluateMa001PackQa({ truth: input.truth, members });
  if (input.forcePackQaFail) {
    packQa = {
      ok: false,
      code: "PACK_QA_FAILURE",
      message: "Forced pack QA failure",
    };
  }
  if (!packQa.ok) {
    const identity = persistMa001PackArtifacts({
      repoRoot: input.repoRoot,
      truth: input.truth,
      artifactRootRel: input.artifactRootRel,
      members,
      packFingerprint,
      packQaOk: false,
      packRenderVersion,
    });
    writeFileSync(
      path.join(input.repoRoot, packDirRel, "pack.design-qa.json"),
      `${JSON.stringify(packQa, null, 2)}\n`,
      "utf8",
    );
    return fail(mode, packQa.code, packQa.message, {
      identity,
      artifactRootRel: input.artifactRootRel,
    });
  }

  const identity = persistMa001PackArtifacts({
    repoRoot: input.repoRoot,
    truth: input.truth,
    artifactRootRel: input.artifactRootRel,
    members,
    packFingerprint,
    packQaOk: true,
    packRenderVersion,
  });

  writeFileSync(
    path.join(input.repoRoot, packDirRel, "pack.design-qa.json"),
    `${JSON.stringify(
      {
        ok: true,
        summary: packQa.summary,
        lockedPackMemberCount: input.truth.lockedPackMemberCount,
        artifactFileCount: members.reduce((s, m) => s + m.artifacts.length, 0),
        flyerCanvas: FLYER_CANVAS,
        serviceSheetCanvas: SERVICE_SHEET_CANVAS,
        packageId: MA_001_PROOF_PACKAGE_ID,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    ok: true,
    verdict:
      mode === "customer"
        ? "MA_001_PACK_ORCHESTRATOR_JOB_PASS"
        : "MA_001_PACK_ORCHESTRATOR_PROOF_PASS",
    invocationOutcome: "RENDERED",
    identity,
    outputMode: mode,
    artifactRootRel: input.artifactRootRel,
    packFingerprint,
  };
}

export async function runMa001PackProofPipeline(input: {
  repoRoot: string;
  truth: Ma001PackProjectTruth;
  artifactRootRel?: string;
  forceMemberIdFail?: string;
  forcePromoQaFail?: boolean;
  forcePackQaFail?: boolean;
}): Promise<Ma001PackPipelineResult> {
  return runMa001PackRendererPipeline({
    ...input,
    artifactRootRel: input.artifactRootRel ?? MA_001_PROOF_ARTIFACT_ROOT,
  });
}
