/**
 * RM-J002 CONTRACT-TRUTH-1 recipes — fail closed before production.
 */

import {
  DESIGN_RENDERER_RM_J002_SKU,
  RM_J002_AVATAR_PLATE,
  RM_J002_FACEBOOK_COVER_PLATE,
  type RmJ002KitProjectTruth,
  type RmJ002MemberId,
  type RmJ002Platform,
  type RmJ002PlannedKitMember,
} from "./rm-j002-types";

export const RM_J002_PROOF_CONTRACT = {
  packageId: "STUDIO-OPERATING-DESIGN-RM-J002-PROOF-1",
  skuId: DESIGN_RENDERER_RM_J002_SKU,
  platforms: ["facebook", "instagram", "tiktok"] as const,
  ownerRoutine: "NONE" as const,
  canvaRequired: false,
  accountMutation: false,
  remapAuthorized: false,
  dispatchAuthorized: false,
} as const;

const FACEBOOK_MEMBERS: readonly RmJ002PlannedKitMember[] = [
  {
    memberId: "bio_about_copy",
    kind: "copy",
    order: 1,
    memberPurpose: "Studio-written scoped Facebook Page about/description",
  },
  {
    memberId: "field_map_checklist",
    kind: "field_map_package",
    order: 2,
    memberPurpose: "URL/contact/display-name recommendations + setup checklist",
  },
  {
    memberId: "profile_image",
    kind: "design_avatar",
    order: 3,
    memberPurpose: "Facebook Page profile picture",
    agreedPlateId: RM_J002_AVATAR_PLATE.plateId,
  },
  {
    memberId: "page_cover",
    kind: "design_page_cover",
    order: 4,
    memberPurpose: "Facebook Page cover photo",
    agreedPlateId: RM_J002_FACEBOOK_COVER_PLATE.plateId,
  },
];

const INSTAGRAM_MEMBERS: readonly RmJ002PlannedKitMember[] = [
  {
    memberId: "bio_profile_copy",
    kind: "copy",
    order: 1,
    memberPurpose: "Studio-written scoped Instagram bio/profile copy",
  },
  {
    memberId: "field_map_checklist",
    kind: "field_map_package",
    order: 2,
    memberPurpose: "URL/contact/display-name recommendations + setup checklist",
  },
  {
    memberId: "profile_image",
    kind: "design_avatar",
    order: 3,
    memberPurpose: "Instagram profile picture only — no profile cover",
    agreedPlateId: RM_J002_AVATAR_PLATE.plateId,
  },
];

const TIKTOK_MEMBERS: readonly RmJ002PlannedKitMember[] = [
  {
    memberId: "bio_profile_copy",
    kind: "copy",
    order: 1,
    memberPurpose: "Studio-written scoped TikTok bio/profile copy",
  },
  {
    memberId: "field_map_checklist",
    kind: "field_map_package",
    order: 2,
    memberPurpose: "URL/contact/display-name recommendations + setup checklist",
  },
  {
    memberId: "profile_image",
    kind: "design_avatar",
    order: 3,
    memberPurpose: "TikTok profile photo only — no cover",
    agreedPlateId: RM_J002_AVATAR_PLATE.plateId,
  },
];

export function recipeForPlatform(
  platform: RmJ002Platform,
): {
  lockedKitMemberCount: 3 | 4;
  plannedKitMembers: readonly RmJ002PlannedKitMember[];
} {
  switch (platform) {
    case "facebook":
      return { lockedKitMemberCount: 4, plannedKitMembers: FACEBOOK_MEMBERS };
    case "instagram":
      return { lockedKitMemberCount: 3, plannedKitMembers: INSTAGRAM_MEMBERS };
    case "tiktok":
      return { lockedKitMemberCount: 3, plannedKitMembers: TIKTOK_MEMBERS };
    default: {
      const _e: never = platform;
      return _e;
    }
  }
}

export function isDesignRendererRmJ002Sku(skuId: string): boolean {
  return skuId === DESIGN_RENDERER_RM_J002_SKU;
}

export function isRmJ002Platform(value: string): value is RmJ002Platform {
  return value === "facebook" || value === "instagram" || value === "tiktok";
}

export type RmJ002CompositionValidation =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function validateRmJ002KitComposition(
  truth: RmJ002KitProjectTruth,
): RmJ002CompositionValidation {
  if (!isDesignRendererRmJ002Sku(truth.skuId)) {
    return {
      ok: false,
      code: "WRONG_SKU",
      message: `WRONG_SKU: expected ${DESIGN_RENDERER_RM_J002_SKU}`,
    };
  }
  if (!isRmJ002Platform(truth.platform)) {
    return {
      ok: false,
      code: "UNSUPPORTED_PLATFORM",
      message: `UNSUPPORTED_PLATFORM: ${String(truth.platform)}`,
    };
  }
  if (truth.credentialsPresent) {
    return {
      ok: false,
      code: "CREDENTIALS_FORBIDDEN",
      message: "CREDENTIALS_FORBIDDEN: kit path forbids credentials",
    };
  }
  if (truth.mutationRequested) {
    return {
      ok: false,
      code: "MUTATION_FORBIDDEN",
      message: "MUTATION_FORBIDDEN: kit path forbids account mutation",
    };
  }

  const recipe = recipeForPlatform(truth.platform);
  if (truth.lockedKitMemberCount !== recipe.lockedKitMemberCount) {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: `MEMBERSHIP_MISMATCH: platform ${truth.platform} requires lockedKitMemberCount=${recipe.lockedKitMemberCount}`,
    };
  }
  if (truth.plannedKitMembers.length !== recipe.lockedKitMemberCount) {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: `MEMBERSHIP_MISMATCH: planned length ${truth.plannedKitMembers.length} ≠ ${recipe.lockedKitMemberCount}`,
    };
  }

  for (let i = 0; i < recipe.plannedKitMembers.length; i++) {
    const expected = recipe.plannedKitMembers[i]!;
    const actual = truth.plannedKitMembers[i]!;
    if (
      actual.memberId !== expected.memberId ||
      actual.kind !== expected.kind ||
      actual.order !== expected.order
    ) {
      return {
        ok: false,
        code: "MEMBERSHIP_MISMATCH",
        message: `MEMBERSHIP_MISMATCH: expected ${expected.memberId}/${expected.kind} at order ${expected.order}`,
      };
    }
    if (
      expected.agreedPlateId &&
      actual.agreedPlateId !== expected.agreedPlateId
    ) {
      return {
        ok: false,
        code: "MEMBERSHIP_MISMATCH",
        message: `MEMBERSHIP_MISMATCH: plate for ${expected.memberId} must be ${expected.agreedPlateId}`,
      };
    }
  }

  const ids = new Set(truth.plannedKitMembers.map((m) => m.memberId));
  if (truth.platform !== "facebook" && ids.has("page_cover")) {
    return {
      ok: false,
      code: "UNSUPPORTED_USE",
      message:
        "UNSUPPORTED_USE: Instagram/TikTok kits must not include page_cover / profile cover",
    };
  }
  if (truth.platform === "facebook" && !ids.has("page_cover")) {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: "MEMBERSHIP_MISMATCH: Facebook kit requires page_cover",
    };
  }
  if (ids.has("bio_about_copy" as RmJ002MemberId) && truth.platform !== "facebook") {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: "MEMBERSHIP_MISMATCH: bio_about_copy is Facebook-only",
    };
  }
  if (
    (ids.has("bio_profile_copy") && truth.platform === "facebook") ||
    (!ids.has("bio_about_copy") &&
      !ids.has("bio_profile_copy") &&
      truth.platform === "facebook")
  ) {
    if (truth.platform === "facebook" && !ids.has("bio_about_copy")) {
      return {
        ok: false,
        code: "MEMBERSHIP_MISMATCH",
        message: "MEMBERSHIP_MISMATCH: Facebook requires bio_about_copy",
      };
    }
  }

  return { ok: true };
}
