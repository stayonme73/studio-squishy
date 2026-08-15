/**
 * Persist BF-001 package identity + manifest.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { nextRenderVersion } from "./bind";
import { BF_001_PROOF_PACKAGE_ID } from "./bf-001-fixtures";
import { BF_001_ORCHESTRATOR_VERSION } from "./bf-001-types";
import type {
  Bf001MemberResult,
  Bf001PackageIdentity,
  Bf001RefreshProjectTruth,
} from "./bf-001-types";

export function persistBf001PackageArtifacts(input: {
  repoRoot: string;
  truth: Bf001RefreshProjectTruth;
  artifactRootRel: string;
  members: readonly Bf001MemberResult[];
  packageFingerprint: string;
  packageQaOk: boolean;
  packageRenderVersion?: number;
}): Bf001PackageIdentity {
  const packageRenderVersion =
    input.packageRenderVersion ??
    nextRenderVersion(input.repoRoot, input.artifactRootRel);
  const dirRel = `${input.artifactRootRel}/renders/v${packageRenderVersion}`;
  mkdirSync(path.join(input.repoRoot, dirRel), { recursive: true });

  const manifestRelativePath = `${dirRel}/package-manifest.json`;
  const identityRelativePath = `${dirRel}/package-identity.json`;

  const identity: Bf001PackageIdentity = {
    packageId: BF_001_PROOF_PACKAGE_ID,
    campaignId: input.truth.campaignId,
    jobId: input.truth.jobId,
    dispatchId: input.truth.dispatchId,
    skuId: input.truth.skuId,
    businessName: input.truth.businessName,
    graphicKind: input.truth.graphicKind,
    packageRenderVersion,
    lockedPackageMemberCount: 2,
    plannedMembers: input.truth.plannedMembers,
    members: input.members,
    packageFingerprint: input.packageFingerprint,
    packageQaOk: input.packageQaOk,
    manifestRelativePath,
    identityRelativePath,
    orchestratorVersion: BF_001_ORCHESTRATOR_VERSION,
    ownerRoutine: "NONE",
    canvaUsed: false,
    remapAuthorized: false,
    createdAt: new Date().toISOString(),
  };

  const manifest = {
    skuId: input.truth.skuId,
    businessName: input.truth.businessName,
    graphicKind: input.truth.graphicKind,
    lockedPackageMemberCount: 2,
    countUnit: "member_identities",
    packageRenderVersion,
    packageFingerprint: input.packageFingerprint,
    packageQaOk: input.packageQaOk,
    ownerRoutine: "NONE",
    canvaUsed: false,
    remapAuthorized: false,
    fontSectionMode: "recommendations_only",
    logoUsageMode: "usage_guidance_only",
    members: input.members.map((m) => ({
      memberId: m.memberId,
      kind: m.kind,
      order: m.order,
      memberPurpose: m.memberPurpose,
      agreedPlateId: m.agreedPlateId,
      producerQaOk: m.producerQaOk,
      artifactCount: m.artifacts.length,
      artifacts: m.artifacts,
      plateHonestyNote: m.plateHonestyNote,
    })),
  };

  writeFileSync(
    path.join(input.repoRoot, manifestRelativePath),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(input.repoRoot, identityRelativePath),
    `${JSON.stringify(identity, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(input.repoRoot, input.artifactRootRel, "current-identity.json"),
    `${JSON.stringify(identity, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(input.repoRoot, input.artifactRootRel, "package-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  return identity;
}
