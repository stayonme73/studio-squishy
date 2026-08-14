/**
 * Harbor fixtures for RM-J008 PROOF-1.
 */

import { recipeForUpdatePlatform } from "./rm-j008-contracts";
import { ensureHarborOakRmJ002LogoMaterial } from "./rm-j002-fixtures";
import {
  DESIGN_RENDERER_RM_J008_SKU,
  type RmJ008Platform,
  type RmJ008UpdateKitProjectTruth,
} from "./rm-j008-types";

export const RM_J008_PROOF_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-RM-J008-PROOF-1" as const;

export const RM_J008_PROOF_ARTIFACT_ROOT =
  "docs/launch/studio-operating-design-rm-j008-proof-1/artifacts/rm-j008" as const;

export { ensureHarborOakRmJ002LogoMaterial as ensureHarborOakRmJ008LogoMaterial };

export function buildRmJ008UpdateKitTruth(input: {
  platform: RmJ008Platform;
  campaignId: string;
  /** When true, only bio/website change; avatar/cover marked UNCHANGED but still reissued. */
  bioLedUpdate?: boolean;
  overrides?: {
    beforeBio?: string;
    afterWebsite?: string;
    avatarAction?: "reissue_unchanged" | "replace";
    coverAction?: "reissue_unchanged" | "replace" | "not_applicable";
    partialKitRequested?: boolean;
    mutationRequested?: boolean;
    credentialsPresent?: boolean;
  };
}): RmJ008UpdateKitProjectTruth {
  const recipe = recipeForUpdatePlatform(input.platform);
  const bioLed = input.bioLedUpdate ?? true;
  const o = input.overrides ?? {};

  const coverAction =
    o.coverAction ??
    (input.platform === "facebook"
      ? bioLed
        ? "reissue_unchanged"
        : "replace"
      : "not_applicable");

  return {
    skuId: DESIGN_RENDERER_RM_J008_SKU,
    campaignId: input.campaignId,
    jobId: `${input.campaignId}::rm-j008`,
    dispatchId: `dispatch-${input.campaignId}`,
    platform: input.platform,
    lockedKitMemberCount: recipe.lockedKitMemberCount,
    plannedKitMembers: recipe.plannedKitMembers,
    before: {
      source: "customer_supplied",
      displayName: "Harbor & Oak Studio",
      bioOrAbout:
        o.beforeBio ??
        "Old bio: weekend snapshots and unclear booking link.",
      website: "https://old-harbor.example",
      phone: "(555) 000-0000",
      profileImageNote: "Current default platform avatar — low contrast",
      ...(input.platform === "facebook"
        ? { pageCoverNote: "Current cover: busy collage with expired promo" }
        : {}),
    },
    after: {
      businessName: "Harbor & Oak Studio",
      displayName: "Harbor & Oak Studio",
      profileGoal:
        "Show a calm portrait photography studio that books discovery calls.",
      updateIntentNotes: bioLed
        ? "Rewrite bio/about and fix website/phone. Keep current avatar and cover look."
        : "Full refresh of bio, contact, avatar, and cover.",
      website: o.afterWebsite ?? "https://harbor-and-oak.example",
      phone: "(555) 014-2200",
      brandNotes: "Warm oak + soft harbor blue. Circular logo safe.",
      avatarAction: o.avatarAction ?? (bioLed ? "reissue_unchanged" : "replace"),
      coverAction,
    },
    customerControlsExistingProfile: true,
    label: `Harbor & Oak — rm-j008 ${input.platform} update kit`,
    credentialsPresent: false,
    mutationRequested: false,
    partialKitRequested: false,
  };
}

/** Illegal: Instagram cover member in update kit. */
export function buildRmJ008UnsupportedInstagramCoverTruth(input: {
  campaignId: string;
}): RmJ008UpdateKitProjectTruth {
  const base = buildRmJ008UpdateKitTruth({
    platform: "instagram",
    campaignId: input.campaignId,
  });
  return {
    ...base,
    lockedKitMemberCount: 5,
    plannedKitMembers: [
      ...base.plannedKitMembers.filter(
        (m) => m.memberId !== "before_after_change_sheet",
      ),
      {
        memberId: "page_cover",
        kind: "design_page_cover",
        order: 4,
        memberPurpose: "Illegal Instagram cover",
        agreedPlateId: "facebook-page-cover-851x315",
      },
      {
        memberId: "before_after_change_sheet",
        kind: "field_map_package",
        order: 5,
        memberPurpose: "Change sheet",
      },
    ],
    after: {
      ...base.after,
      coverAction: "replace",
    },
  };
}

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
