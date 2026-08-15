/**
 * BF-001 package fingerprint — starting materials + graphic kind + sheet content.
 */

import { createHash } from "crypto";

import {
  BF_001_GRAPHIC_VISUAL_VERSION,
  BF_001_ORCHESTRATOR_VERSION,
  BF_001_SHEET_VISUAL_VERSION,
  type Bf001RefreshProjectTruth,
} from "./bf-001-types";

export function fingerprintBf001Package(truth: Bf001RefreshProjectTruth): string {
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
        graphicKind: truth.graphicKind,
        lockedPackageMemberCount: truth.lockedPackageMemberCount,
        visualStartingPointNotes: truth.visualStartingPointNotes,
        likesDislikes: truth.likesDislikes,
        businessFacts: truth.businessFacts,
        hexPalette: truth.hexPalette,
        fontRecommendations: truth.fontRecommendations,
        logoUsageRules: truth.logoUsageRules,
        logoContentSha256: truth.logoMaterial?.contentSha256 ?? null,
        graphicRenderFontFamily: truth.graphicRenderFontFamily,
        members,
        orchestratorVersion: BF_001_ORCHESTRATOR_VERSION,
        sheetVisualVersion: BF_001_SHEET_VISUAL_VERSION,
        graphicVisualVersion: BF_001_GRAPHIC_VISUAL_VERSION,
      }),
    )
    .digest("hex");
}
