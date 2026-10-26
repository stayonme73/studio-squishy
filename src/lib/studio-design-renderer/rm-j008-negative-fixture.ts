/**
 * Negative proof only. Count 2 is illegal against the legal kit of 4 or 5.
 * Not imported by production runtime.
 */

import { buildRmJ008UpdateKitTruth } from "./rm-j008-fixtures";
import type { RmJ008UpdateKitProjectTruth } from "./rm-j008-types";

/** Illegal: bio-only / partial after-state recipe. */
export function buildRmJ008PartialBioOnlyTruth(input: {
  campaignId: string;
}): RmJ008UpdateKitProjectTruth {
  const base = buildRmJ008UpdateKitTruth({
    platform: "instagram",
    campaignId: input.campaignId,
  });
  return {
    ...base,
    lockedKitMemberCount: 2,
    plannedKitMembers: [
      {
        memberId: "bio_profile_copy",
        kind: "copy",
        order: 1,
        memberPurpose: "Bio only",
      },
      {
        memberId: "before_after_change_sheet",
        kind: "field_map_package",
        order: 2,
        memberPurpose: "Change sheet",
      },
    ],
  };
}
