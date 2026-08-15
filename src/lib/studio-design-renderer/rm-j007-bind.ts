/**
 * Persist RM-J007 package identity + manifest + change-request.json.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { nextRenderVersion } from "./bind";
import { RM_J007_PROOF_PACKAGE_ID } from "./rm-j007-fixtures";
import { RM_J007_ORCHESTRATOR_VERSION } from "./rm-j007-types";
import type {
  RmJ007MemberResult,
  RmJ007PackageIdentity,
  RmJ007UpdateProjectTruth,
} from "./rm-j007-types";

export function buildRmJ007ChangeRequest(truth: RmJ007UpdateProjectTruth) {
  return {
    skuId: truth.skuId,
    businessName: truth.businessName,
    itemIdentity: truth.itemIdentity,
    whereLive: truth.whereLive,
    whatChange: truth.whatChange,
    newInfo: truth.newInfo,
    boundedChanges: truth.boundedChanges,
    referenceMaterial: truth.referenceMaterial
      ? {
          materialId: truth.referenceMaterial.materialId,
          relativePath: truth.referenceMaterial.relativePath,
          contentSha256: truth.referenceMaterial.contentSha256,
          mime: truth.referenceMaterial.mime,
        }
      : null,
    replacementImage: truth.replacementImage
      ? {
          materialId: truth.replacementImage.materialId,
          relativePath: truth.replacementImage.relativePath,
          contentSha256: truth.replacementImage.contentSha256,
          mime: truth.replacementImage.mime,
        }
      : null,
    acceptRecreationLimits: true as const,
    redesignRequested: false as const,
    fulfillmentMode: "recreation" as const,
    honesty:
      "Reference-guided recreation — not a pixel-perfect edit of your original file.",
  };
}

export function persistRmJ007PackageArtifacts(input: {
  repoRoot: string;
  truth: RmJ007UpdateProjectTruth;
  artifactRootRel: string;
  members: readonly RmJ007MemberResult[];
  packageFingerprint: string;
  packageQaOk: boolean;
  packageRenderVersion?: number;
}): RmJ007PackageIdentity {
  const packageRenderVersion =
    input.packageRenderVersion ??
    nextRenderVersion(input.repoRoot, input.artifactRootRel);
  const dirRel = `${input.artifactRootRel}/renders/v${packageRenderVersion}`;
  mkdirSync(path.join(input.repoRoot, dirRel), { recursive: true });

  const manifestRelativePath = `${dirRel}/package-manifest.json`;
  const identityRelativePath = `${dirRel}/package-identity.json`;
  const changeRequestRelativePath = `${dirRel}/change-request.json`;

  const changeRequest = buildRmJ007ChangeRequest(input.truth);

  const identity: RmJ007PackageIdentity = {
    packageId: RM_J007_PROOF_PACKAGE_ID,
    campaignId: input.truth.campaignId,
    jobId: input.truth.jobId,
    dispatchId: input.truth.dispatchId,
    skuId: input.truth.skuId,
    businessName: input.truth.businessName,
    itemIdentity: input.truth.itemIdentity,
    packageRenderVersion,
    lockedPackageMemberCount: 1,
    plannedMembers: input.truth.plannedMembers,
    members: input.members,
    packageFingerprint: input.packageFingerprint,
    packageQaOk: input.packageQaOk,
    manifestRelativePath,
    identityRelativePath,
    changeRequestRelativePath,
    orchestratorVersion: RM_J007_ORCHESTRATOR_VERSION,
    ownerRoutine: "NONE",
    canvaUsed: false,
    remapAuthorized: true,
    fulfillmentMode: "recreation",
    acceptRecreationLimits: true,
    redesignRequested: false,
    createdAt: new Date().toISOString(),
  };

  const manifest = {
    skuId: input.truth.skuId,
    businessName: input.truth.businessName,
    itemIdentity: input.truth.itemIdentity,
    lockedPackageMemberCount: 1,
    countUnit: "member_identities",
    packageRenderVersion,
    packageFingerprint: input.packageFingerprint,
    packageQaOk: input.packageQaOk,
    ownerRoutine: "NONE",
    canvaUsed: false,
    remapAuthorized: true,
    fulfillmentMode: "recreation",
    acceptRecreationLimits: true,
    redesignRequested: false,
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
    path.join(input.repoRoot, changeRequestRelativePath),
    `${JSON.stringify(changeRequest, null, 2)}\n`,
    "utf8",
  );
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
  writeFileSync(
    path.join(input.repoRoot, input.artifactRootRel, "change-request.json"),
    `${JSON.stringify(changeRequest, null, 2)}\n`,
    "utf8",
  );

  return identity;
}
