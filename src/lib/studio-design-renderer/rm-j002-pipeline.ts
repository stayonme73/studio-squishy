/**
 * RM-J002 Profile Setup Kit composer — PROOF-1 only.
 * No Canva · no remap · no account mutation · no dispatch.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { nextRenderVersion } from "./bind";
import { validateRmJ002KitComposition } from "./rm-j002-contracts";
import { persistRmJ002KitArtifacts } from "./rm-j002-bind";
import { fingerprintRmJ002Kit } from "./rm-j002-fingerprint";
import {
  RM_J002_PROOF_ARTIFACT_ROOT,
  RM_J002_PROOF_PACKAGE_ID,
} from "./rm-j002-fixtures";
import { evaluateRmJ002KitQa } from "./rm-j002-kit-qa";
import { produceRmJ002Member } from "./rm-j002-members";
import type {
  RmJ002KitIdentity,
  RmJ002KitPipelineResult,
  RmJ002KitProjectTruth,
  RmJ002MemberResult,
  RmJ002OutputMode,
} from "./rm-j002-types";

function fail(
  mode: RmJ002OutputMode,
  code: Extract<RmJ002KitPipelineResult, { ok: false }>["failureCode"],
  message: string,
): RmJ002KitPipelineResult {
  return {
    ok: false,
    verdict: "RM_J002_KIT_COMPOSER_PROOF_FAIL",
    failureCode: code,
    message,
    outputMode: mode,
  };
}

function readCurrentIdentity(
  repoRoot: string,
  artifactRootRel: string,
): RmJ002KitIdentity | null {
  const p = path.join(repoRoot, artifactRootRel, "current-identity.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as RmJ002KitIdentity;
  } catch {
    return null;
  }
}

export async function runRmJ002KitComposerPipeline(input: {
  repoRoot: string;
  truth: RmJ002KitProjectTruth;
  artifactRootRel?: string;
  outputMode?: RmJ002OutputMode;
}): Promise<RmJ002KitPipelineResult> {
  const mode = input.outputMode ?? "proof";
  const artifactRootRel = input.artifactRootRel ?? RM_J002_PROOF_ARTIFACT_ROOT;
  const { truth, repoRoot } = input;

  const composition = validateRmJ002KitComposition(truth);
  if (!composition.ok) {
    const code = composition.code as Extract<
      RmJ002KitPipelineResult,
      { ok: false }
    >["failureCode"];
    return fail(mode, code, composition.message);
  }

  const kitFingerprint = fingerprintRmJ002Kit(truth);
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
    };
  }

  const kitRenderVersion = nextRenderVersion(repoRoot, artifactRootRel);
  const versionDirRel = `${artifactRootRel}/renders/v${kitRenderVersion}`;
  mkdirSync(path.join(repoRoot, versionDirRel), { recursive: true });

  const members: RmJ002MemberResult[] = [];
  for (const planned of truth.plannedKitMembers) {
    const memberDirRel = `${versionDirRel}/members/${planned.memberId}`;
    const produced = await produceRmJ002Member({
      repoRoot,
      truth,
      planned,
      memberDirRel,
    });
    if (!produced.ok) {
      return fail(
        mode,
        produced.failureCode as Extract<
          RmJ002KitPipelineResult,
          { ok: false }
        >["failureCode"],
        produced.message,
      );
    }
    members.push(produced.member);
  }

  const kitQa = evaluateRmJ002KitQa({ truth, members });
  if (!kitQa.ok) {
    return fail(mode, "KIT_QA_FAIL", kitQa.message);
  }

  const identity = persistRmJ002KitArtifacts({
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
        packageId: RM_J002_PROOF_PACKAGE_ID,
        platform: truth.platform,
        lockedKitMemberCount: truth.lockedKitMemberCount,
        kitQaOk: true,
        ownerRoutine: "NONE",
        canvaUsed: false,
        accountMutation: false,
        members: members.map((m) => ({
          memberId: m.memberId,
          producerQaOk: m.producerQaOk,
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
    verdict: "RM_J002_KIT_COMPOSER_PROOF_PASS",
    invocationOutcome: "RENDERED",
    identity,
    outputMode: mode,
  };
}

export async function runRmJ002KitProofPipeline(input: {
  repoRoot: string;
  truth: RmJ002KitProjectTruth;
  artifactRootRel?: string;
}): Promise<RmJ002KitPipelineResult> {
  return runRmJ002KitComposerPipeline({
    ...input,
    outputMode: "proof",
  });
}
