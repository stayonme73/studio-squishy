/**
 * Persist ma-001 pack identity + delivery manifest.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { nextRenderVersion } from "./bind";
import { MA_001_PROOF_PACKAGE_ID } from "./ma-001-fixtures";
import type {
  Ma001MemberResult,
  Ma001PackIdentity,
  Ma001PackProjectTruth,
} from "./ma-001-types";
import { MA_001_PACK_ORCHESTRATOR_VERSION } from "./ma-001-types";

export function persistMa001PackArtifacts(input: {
  repoRoot: string;
  truth: Ma001PackProjectTruth;
  artifactRootRel: string;
  members: readonly Ma001MemberResult[];
  packFingerprint: string;
  packQaOk: boolean;
  /** When set, reuse this version directory (e.g. members already written there). */
  packRenderVersion?: number;
}): Ma001PackIdentity {
  const packRenderVersion =
    input.packRenderVersion ??
    nextRenderVersion(input.repoRoot, input.artifactRootRel);
  const dirRel = `${input.artifactRootRel}/renders/v${packRenderVersion}`;
  mkdirSync(path.join(input.repoRoot, dirRel), { recursive: true });

  const manifestRelativePath = `${dirRel}/pack-manifest.json`;
  const identityRelativePath = `${dirRel}/pack-identity.json`;

  const identity: Ma001PackIdentity = {
    packageId: MA_001_PROOF_PACKAGE_ID,
    campaignId: input.truth.campaignId,
    jobId: input.truth.jobId,
    dispatchId: input.truth.dispatchId,
    skuId: input.truth.skuId,
    packRenderVersion,
    lockedPackMemberCount: input.truth.lockedPackMemberCount,
    plannedPackMembers: input.truth.plannedPackMembers,
    members: input.members,
    packFingerprint: input.packFingerprint,
    packQaOk: input.packQaOk,
    manifestRelativePath,
    identityRelativePath,
    orchestratorVersion: MA_001_PACK_ORCHESTRATOR_VERSION,
    createdAt: new Date().toISOString(),
  };

  const manifest = {
    skuId: input.truth.skuId,
    campaignFocus: input.truth.campaignFocus,
    lockedPackMemberCount: input.truth.lockedPackMemberCount,
    countUnit: "member_identities",
    packRenderVersion,
    packFingerprint: input.packFingerprint,
    packQaOk: input.packQaOk,
    members: input.members.map((m) => ({
      memberId: m.memberId,
      kind: m.kind,
      order: m.order,
      memberPurpose: m.memberPurpose,
      producerFamily: m.producerFamily,
      agreedPlateId: m.agreedPlateId,
      producerQaOk: m.producerQaOk,
      artifactCount: m.artifacts.length,
      artifacts: m.artifacts,
    })),
    note: "Pack completeness = member count, not artifact-file count.",
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
    path.join(input.repoRoot, input.artifactRootRel, "pack-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  return identity;
}
