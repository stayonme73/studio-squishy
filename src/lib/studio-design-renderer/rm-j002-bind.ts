/**
 * Persist RM-J002 kit identity + manifest.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { nextRenderVersion } from "./bind";
import { RM_J002_PROOF_PACKAGE_ID } from "./rm-j002-fixtures";
import { RM_J002_KIT_ORCHESTRATOR_VERSION } from "./rm-j002-types";
import type {
  RmJ002KitIdentity,
  RmJ002KitProjectTruth,
  RmJ002MemberResult,
} from "./rm-j002-types";

export function persistRmJ002KitArtifacts(input: {
  repoRoot: string;
  truth: RmJ002KitProjectTruth;
  artifactRootRel: string;
  members: readonly RmJ002MemberResult[];
  kitFingerprint: string;
  kitQaOk: boolean;
  kitRenderVersion?: number;
}): RmJ002KitIdentity {
  const kitRenderVersion =
    input.kitRenderVersion ??
    nextRenderVersion(input.repoRoot, input.artifactRootRel);
  const dirRel = `${input.artifactRootRel}/renders/v${kitRenderVersion}`;
  mkdirSync(path.join(input.repoRoot, dirRel), { recursive: true });

  const manifestRelativePath = `${dirRel}/kit-manifest.json`;
  const identityRelativePath = `${dirRel}/kit-identity.json`;

  const identity: RmJ002KitIdentity = {
    packageId: RM_J002_PROOF_PACKAGE_ID,
    campaignId: input.truth.campaignId,
    jobId: input.truth.jobId,
    dispatchId: input.truth.dispatchId,
    skuId: input.truth.skuId,
    platform: input.truth.platform,
    kitRenderVersion,
    lockedKitMemberCount: input.truth.lockedKitMemberCount,
    plannedKitMembers: input.truth.plannedKitMembers,
    members: input.members,
    kitFingerprint: input.kitFingerprint,
    kitQaOk: input.kitQaOk,
    manifestRelativePath,
    identityRelativePath,
    orchestratorVersion: RM_J002_KIT_ORCHESTRATOR_VERSION,
    ownerRoutine: "NONE",
    canvaUsed: false,
    accountMutation: false,
    createdAt: new Date().toISOString(),
  };

  const manifest = {
    skuId: input.truth.skuId,
    platform: input.truth.platform,
    lockedKitMemberCount: input.truth.lockedKitMemberCount,
    countUnit: "member_identities",
    kitRenderVersion,
    kitFingerprint: input.kitFingerprint,
    kitQaOk: input.kitQaOk,
    ownerRoutine: "NONE",
    canvaUsed: false,
    accountMutation: false,
    fieldMapIsDurableMember: true,
    plateHonesty:
      "Studio render dimensions ≠ guaranteed visible pixels (circular crop / Page cover overlap).",
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
    path.join(input.repoRoot, input.artifactRootRel, "kit-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  return identity;
}
