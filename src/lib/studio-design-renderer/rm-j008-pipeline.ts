/**
 * RM-J008 Profile Update Kit composer — PROOF-1 only.
 * Reuses sealed rm-j002 after-state producers. No Canva · no remap · no mutation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { nextRenderVersion } from "./bind";
import { validateRmJ008KitComposition } from "./rm-j008-contracts";
import { persistRmJ008KitArtifacts } from "./rm-j008-bind";
import { fingerprintRmJ008UpdateKit } from "./rm-j008-fingerprint";
import {
  RM_J008_PROOF_ARTIFACT_ROOT,
  RM_J008_PROOF_PACKAGE_ID,
} from "./rm-j008-fixtures";
import { evaluateRmJ008KitQa } from "./rm-j008-kit-qa";
import {
  buildRmJ008ChangeSheetRows,
  produceRmJ008Member,
} from "./rm-j008-members";
import type {
  RmJ008KitIdentity,
  RmJ008KitPipelineResult,
  RmJ008MemberResult,
  RmJ008OutputMode,
  RmJ008UpdateKitProjectTruth,
} from "./rm-j008-types";

function fail(
  mode: RmJ008OutputMode,
  code: Extract<RmJ008KitPipelineResult, { ok: false }>["failureCode"],
  message: string,
): RmJ008KitPipelineResult {
  return {
    ok: false,
    verdict: "RM_J008_KIT_COMPOSER_PROOF_FAIL",
    failureCode: code,
    message,
    outputMode: mode,
  };
}

function readCurrentIdentity(
  repoRoot: string,
  artifactRootRel: string,
): RmJ008KitIdentity | null {
  const p = path.join(repoRoot, artifactRootRel, "current-identity.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as RmJ008KitIdentity;
  } catch {
    return null;
  }
}

export async function runRmJ008KitComposerPipeline(input: {
  repoRoot: string;
  truth: RmJ008UpdateKitProjectTruth;
  artifactRootRel?: string;
  outputMode?: RmJ008OutputMode;
}): Promise<RmJ008KitPipelineResult> {
  const mode = input.outputMode ?? "proof";
  const artifactRootRel = input.artifactRootRel ?? RM_J008_PROOF_ARTIFACT_ROOT;
  const { truth, repoRoot } = input;

  const composition = validateRmJ008KitComposition(truth);
  if (!composition.ok) {
    const code = composition.code as Extract<
      RmJ008KitPipelineResult,
      { ok: false }
    >["failureCode"];
    return fail(mode, code, composition.message);
  }

  const sheet = buildRmJ008ChangeSheetRows(truth);
  if (!sheet.ok) {
    return fail(mode, "COPY_QA_FAIL", sheet.message);
  }

  const kitFingerprint = fingerprintRmJ008UpdateKit(truth);
  const current = readCurrentIdentity(repoRoot, artifactRootRel);
  if (
    current &&
    current.kitFingerprint === kitFingerprint &&
    current.kitQaOk &&
    current.platform === truth.platform &&
    current.lockedKitMemberCount === truth.lockedKitMemberCount
  ) {
    return {
      ok: true,
      verdict: "ALREADY_RENDERED",
      invocationOutcome: "ALREADY_RENDERED",
      identity: current,
      outputMode: mode,
      changeSheetRows: sheet.rows,
    };
  }

  const kitRenderVersion = nextRenderVersion(repoRoot, artifactRootRel);
  const versionDirRel = `${artifactRootRel}/renders/v${kitRenderVersion}`;
  mkdirSync(path.join(repoRoot, versionDirRel), { recursive: true });

  const members: RmJ008MemberResult[] = [];
  for (const planned of truth.plannedKitMembers) {
    const memberDirRel = `${versionDirRel}/members/${planned.memberId}`;
    const produced = await produceRmJ008Member({
      repoRoot,
      truth,
      planned,
      memberDirRel,
      changeRows: sheet.rows,
      afterCopyText: sheet.afterCopyText,
    });
    if (!produced.ok) {
      return fail(
        mode,
        produced.failureCode as Extract<
          RmJ008KitPipelineResult,
          { ok: false }
        >["failureCode"],
        produced.message,
      );
    }
    members.push(produced.member);
  }

  const kitQa = evaluateRmJ008KitQa({
    truth,
    members,
    changeRows: sheet.rows,
  });
  if (!kitQa.ok) {
    return fail(mode, "KIT_QA_FAIL", kitQa.message);
  }

  const identity = persistRmJ008KitArtifacts({
    repoRoot,
    truth,
    artifactRootRel,
    members,
    kitFingerprint,
    kitQaOk: true,
    kitRenderVersion,
  });

  writeFileSync(
    path.join(repoRoot, versionDirRel, "kit.design-qa.json"),
    `${JSON.stringify(
      {
        packageId: RM_J008_PROOF_PACKAGE_ID,
        platform: truth.platform,
        lockedKitMemberCount: truth.lockedKitMemberCount,
        kitQaOk: true,
        ownerRoutine: "NONE",
        canvaUsed: false,
        accountMutation: false,
        beforeStateSource: "customer_supplied",
        changeSheetComparison:
          "authoritative_before_vs_approved_after_not_hashes",
        members: members.map((m) => ({
          memberId: m.memberId,
          producerQaOk: m.producerQaOk,
          changeStatus: m.changeStatus ?? null,
          artifactCount: m.artifacts.length,
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    ok: true,
    verdict: "RM_J008_KIT_COMPOSER_PROOF_PASS",
    invocationOutcome: "RENDERED",
    identity,
    outputMode: mode,
    changeSheetRows: sheet.rows,
  };
}

export async function runRmJ008KitProofPipeline(input: {
  repoRoot: string;
  truth: RmJ008UpdateKitProjectTruth;
  artifactRootRel?: string;
}): Promise<RmJ008KitPipelineResult> {
  return runRmJ008KitComposerPipeline({
    ...input,
    outputMode: "proof",
  });
}
