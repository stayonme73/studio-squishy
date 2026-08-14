/**
 * RM-J002 kit fingerprint — platform lock + member recipe + scoped content.
 */

import { createHash } from "crypto";

import {
  RM_J002_AVATAR_VISUAL_VERSION,
  RM_J002_COVER_VISUAL_VERSION,
  RM_J002_COPY_CHECKLIST_PRESENTATION_VERSION,
  RM_J002_KIT_ORCHESTRATOR_VERSION,
} from "./rm-j002-types";
import type { RmJ002KitProjectTruth } from "./rm-j002-types";

export function fingerprintRmJ002Kit(truth: RmJ002KitProjectTruth): string {
  const members = [...truth.plannedKitMembers]
    .sort((a, b) => a.order - b.order)
    .map((m) => ({
      memberId: m.memberId,
      kind: m.kind,
      order: m.order,
      memberPurpose: m.memberPurpose,
      agreedPlateId: m.agreedPlateId ?? null,
    }));

  return createHash("sha256")
    .update(
      JSON.stringify({
        skuId: truth.skuId,
        campaignId: truth.campaignId,
        platform: truth.platform,
        lockedKitMemberCount: truth.lockedKitMemberCount,
        businessName: truth.businessName,
        profileGoal: truth.profileGoal,
        currentProfileNotes: truth.currentProfileNotes,
        website: truth.website ?? null,
        phone: truth.phone ?? null,
        displayName: truth.displayName ?? null,
        brandNotes: truth.brandNotes ?? null,
        logoContentSha256: truth.logoMaterial?.contentSha256 ?? null,
        members,
        credentialsPresent: truth.credentialsPresent,
        mutationRequested: truth.mutationRequested,
        orchestratorVersion: RM_J002_KIT_ORCHESTRATOR_VERSION,
        avatarVisualVersion: RM_J002_AVATAR_VISUAL_VERSION,
        coverVisualVersion: RM_J002_COVER_VISUAL_VERSION,
        copyChecklistPresentationVersion:
          RM_J002_COPY_CHECKLIST_PRESENTATION_VERSION,
      }),
    )
    .digest("hex");
}
