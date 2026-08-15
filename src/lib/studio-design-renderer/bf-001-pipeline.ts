/**
 * BF-001 Brand Identity Refresh package composer — PROOF-1.
 * Canva OFF · no remap · Owner routine NONE.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { nextRenderVersion } from "./bind";
import { persistBf001PackageArtifacts } from "./bf-001-bind";
import { validateBf001PackageComposition } from "./bf-001-contracts";
import { fingerprintBf001Package } from "./bf-001-fingerprint";
import {
  BF_001_PROOF_ARTIFACT_ROOT,
  BF_001_PROOF_PACKAGE_ID,
} from "./bf-001-fixtures";
import { produceBf001Member } from "./bf-001-members";
import { evaluateBf001PackageQa } from "./bf-001-package-qa";
import type {
  Bf001MemberResult,
  Bf001OutputMode,
  Bf001PackageIdentity,
  Bf001PackagePipelineResult,
  Bf001RefreshProjectTruth,
} from "./bf-001-types";

function fail(
  mode: Bf001OutputMode,
  code: Extract<Bf001PackagePipelineResult, { ok: false }>["failureCode"],
  message: string,
): Bf001PackagePipelineResult {
  return {
    ok: false,
    verdict: "BF_001_REFRESH_PACKAGE_PROOF_FAIL",
    failureCode: code,
    message,
    outputMode: mode,
  };
}

function readCurrentIdentity(
  repoRoot: string,
  artifactRootRel: string,
): Bf001PackageIdentity | null {
  const p = path.join(repoRoot, artifactRootRel, "current-identity.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Bf001PackageIdentity;
  } catch {
    return null;
  }
}

export async function runBf001PackageComposerPipeline(input: {
  repoRoot: string;
  truth: Bf001RefreshProjectTruth;
  artifactRootRel?: string;
  outputMode?: Bf001OutputMode;
}): Promise<Bf001PackagePipelineResult> {
  const mode = input.outputMode ?? "proof";
  const artifactRootRel = input.artifactRootRel ?? BF_001_PROOF_ARTIFACT_ROOT;
  const { truth, repoRoot } = input;

  const composition = validateBf001PackageComposition(truth);
  if (!composition.ok) {
    const code = composition.code as Extract<
      Bf001PackagePipelineResult,
      { ok: false }
    >["failureCode"];
    return fail(mode, code, composition.message);
  }

  const packageFingerprint = fingerprintBf001Package(truth);
  const current = readCurrentIdentity(repoRoot, artifactRootRel);
  if (
    current &&
    current.packageFingerprint === packageFingerprint &&
    current.packageQaOk &&
    current.graphicKind === truth.graphicKind &&
    current.lockedPackageMemberCount === truth.lockedPackageMemberCount
  ) {
    return {
      ok: true,
      verdict: "ALREADY_RENDERED",
      invocationOutcome: "ALREADY_RENDERED",
      identity: current,
      outputMode: mode,
    };
  }

  const packageRenderVersion = nextRenderVersion(repoRoot, artifactRootRel);
  const versionDirRel = `${artifactRootRel}/renders/v${packageRenderVersion}`;
  mkdirSync(path.join(repoRoot, versionDirRel), { recursive: true });

  const members: Bf001MemberResult[] = [];
  for (const planned of truth.plannedMembers) {
    const memberDirRel = `${versionDirRel}/members/${planned.memberId}`;
    const produced = await produceBf001Member({
      repoRoot,
      truth,
      planned,
      memberDirRel,
    });
    if (!produced.ok) {
      return fail(
        mode,
        produced.failureCode as Extract<
          Bf001PackagePipelineResult,
          { ok: false }
        >["failureCode"],
        produced.message,
      );
    }
    members.push(produced.member);
  }

  const packageQa = evaluateBf001PackageQa({ repoRoot, truth, members });
  if (!packageQa.ok) {
    return fail(mode, "PACKAGE_QA_FAIL", packageQa.message);
  }

  const identity = persistBf001PackageArtifacts({
    repoRoot,
    truth,
    artifactRootRel,
    members,
    packageFingerprint,
    packageQaOk: true,
    packageRenderVersion,
  });

  writeFileSync(
    path.join(repoRoot, versionDirRel, "package.design-qa.json"),
    `${JSON.stringify(
      {
        packageId: BF_001_PROOF_PACKAGE_ID,
        graphicKind: truth.graphicKind,
        lockedPackageMemberCount: 2,
        packageQaOk: true,
        ownerRoutine: "NONE",
        canvaUsed: false,
        remapAuthorized: false,
        fontSectionMode: "recommendations_only",
        logoUsageMode: "usage_guidance_only",
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
    verdict: "BF_001_REFRESH_PACKAGE_PROOF_PASS",
    invocationOutcome: "RENDERED",
    identity,
    outputMode: mode,
  };
}

export async function runBf001PackageProofPipeline(input: {
  repoRoot: string;
  truth: Bf001RefreshProjectTruth;
  artifactRootRel?: string;
}): Promise<Bf001PackagePipelineResult> {
  return runBf001PackageComposerPipeline({
    ...input,
    outputMode: "proof",
  });
}
