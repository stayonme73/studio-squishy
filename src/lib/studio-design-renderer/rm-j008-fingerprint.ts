/**
 * RM-J008 update-kit fingerprint — before + after + membership (not artifact hashes).
 */

import { createHash } from "crypto";

import {
  RM_J002_AVATAR_VISUAL_VERSION,
  RM_J002_COVER_VISUAL_VERSION,
  RM_J002_COPY_CHECKLIST_PRESENTATION_VERSION,
} from "./rm-j002-types";
import {
  RM_J008_CHANGE_SHEET_PRESENTATION_VERSION,
  RM_J008_KIT_ORCHESTRATOR_VERSION,
  type RmJ008UpdateKitProjectTruth,
} from "./rm-j008-types";

export function fingerprintRmJ008UpdateKit(
  truth: RmJ008UpdateKitProjectTruth,
): string {
  const members = [...truth.plannedKitMembers]
    .sort((a, b) => a.order - b.order)
    .map((m) => ({
      memberId: m.memberId,
      kind: m.kind,
      order: m.order,
      agreedPlateId: m.agreedPlateId ?? null,
    }));

  return createHash("sha256")
    .update(
      JSON.stringify({
        skuId: truth.skuId,
        campaignId: truth.campaignId,
        platform: truth.platform,
        lockedKitMemberCount: truth.lockedKitMemberCount,
        before: truth.before,
        after: truth.after,
        members,
        credentialsPresent: truth.credentialsPresent,
        mutationRequested: truth.mutationRequested,
        partialKitRequested: truth.partialKitRequested,
        logoContentSha256: truth.logoMaterial?.contentSha256 ?? null,
        orchestratorVersion: RM_J008_KIT_ORCHESTRATOR_VERSION,
        changeSheetPresentationVersion: RM_J008_CHANGE_SHEET_PRESENTATION_VERSION,
        avatarVisualVersion: RM_J002_AVATAR_VISUAL_VERSION,
        coverVisualVersion: RM_J002_COVER_VISUAL_VERSION,
        copyChecklistPresentationVersion:
          RM_J002_COPY_CHECKLIST_PRESENTATION_VERSION,
      }),
    )
    .digest("hex");
}
