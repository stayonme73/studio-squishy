/**
 * RM-J007 package fingerprint — reference + bounded changes + acceptance.
 */

import { createHash } from "crypto";

import {
  RM_J007_ORCHESTRATOR_VERSION,
  RM_J007_VISUAL_VERSION,
  type RmJ007UpdateProjectTruth,
} from "./rm-j007-types";

export function fingerprintRmJ007Package(
  truth: RmJ007UpdateProjectTruth,
): string {
  const members = [...truth.plannedMembers]
    .sort((a, b) => a.order - b.order)
    .map((m) => ({
      memberId: m.memberId,
      kind: m.kind,
      order: m.order,
      memberPurpose: m.memberPurpose,
      agreedPlateId: m.agreedPlateId,
    }));

  return createHash("sha256")
    .update(
      JSON.stringify({
        skuId: truth.skuId,
        campaignId: truth.campaignId,
        businessName: truth.businessName,
        itemIdentity: truth.itemIdentity,
        whereLive: truth.whereLive,
        lockedPackageMemberCount: truth.lockedPackageMemberCount,
        fulfillmentMode: truth.fulfillmentMode,
        acceptRecreationLimits: truth.acceptRecreationLimits,
        redesignRequested: truth.redesignRequested,
        whatChange: truth.whatChange,
        newInfo: truth.newInfo,
        boundedChanges: truth.boundedChanges,
        referenceContentSha256: truth.referenceMaterial?.contentSha256 ?? null,
        referenceMime: truth.referenceMaterial?.mime ?? null,
        replacementImageSha256:
          truth.replacementImage?.contentSha256 ?? null,
        members,
        orchestratorVersion: RM_J007_ORCHESTRATOR_VERSION,
        visualVersion: RM_J007_VISUAL_VERSION,
      }),
    )
    .digest("hex");
}
