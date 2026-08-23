/**
 * RM-J008 CONTRACT-TRUTH-1 recipes — fail closed before production.
 */

import { recipeForPlatform as rmJ002RecipeForPlatform } from "./rm-j002-contracts";
import {
  DESIGN_RENDERER_RM_J008_SKU,
  RM_J002_AVATAR_PLATE,
  RM_J002_FACEBOOK_COVER_PLATE,
  type RmJ008MemberId,
  type RmJ008Platform,
  type RmJ008PlannedKitMember,
  type RmJ008UpdateKitProjectTruth,
} from "./rm-j008-types";

export const RM_J008_PROOF_CONTRACT = {
  packageId: "STUDIO-OPERATING-DESIGN-RM-J008-PROOF-1",
  skuId: DESIGN_RENDERER_RM_J008_SKU,
  platforms: ["facebook", "instagram", "tiktok"] as const,
  ownerRoutine: "NONE" as const,
  canvaRequired: false,
  accountMutation: false,
  remapAuthorized: false,
  dispatchAuthorized: false,
  beforeStateSource: "customer_supplied" as const,
  unchangedMembers: "reissue_always" as const,
} as const;

function afterStateMembers(
  platform: RmJ008Platform,
): readonly RmJ008PlannedKitMember[] {
  const base = rmJ002RecipeForPlatform(platform).plannedKitMembers;
  return base.map((m) => ({
    memberId: m.memberId as RmJ008MemberId,
    kind: m.kind,
    order: m.order,
    memberPurpose: m.memberPurpose.replace(/^Studio-written/, "Revised Studio"),
    agreedPlateId: m.agreedPlateId,
  }));
}

export function recipeForUpdatePlatform(platform: RmJ008Platform): {
  lockedKitMemberCount: 2 | 4 | 5;
  plannedKitMembers: readonly RmJ008PlannedKitMember[];
} {
  const after = afterStateMembers(platform);
  const changeSheet: RmJ008PlannedKitMember = {
    memberId: "before_after_change_sheet",
    kind: "field_map_package",
    order: after.length + 1,
    memberPurpose:
      "Before→after change sheet from customer-supplied before vs approved after",
  };
  const plannedKitMembers = [...after, changeSheet];
  const lockedKitMemberCount = plannedKitMembers.length as 4 | 5;
  return { lockedKitMemberCount, plannedKitMembers };
}

export function isDesignRendererRmJ008Sku(skuId: string): boolean {
  return skuId === DESIGN_RENDERER_RM_J008_SKU;
}

export function isRmJ008Platform(value: string): value is RmJ008Platform {
  return value === "facebook" || value === "instagram" || value === "tiktok";
}

export type RmJ008CompositionValidation =
  | { ok: true }
  | { ok: false; code: string; message: string };

function normalizeNone(value: string): string {
  const v = value.trim().toLowerCase();
  if (v === "" || v === "none" || v === "n/a" || v === "blank") return "none";
  return value.trim();
}

export function validateRmJ008BeforeState(
  truth: RmJ008UpdateKitProjectTruth,
): RmJ008CompositionValidation {
  const b = truth.before;
  if (b.source !== "customer_supplied") {
    return {
      ok: false,
      code: "BEFORE_STATE_INVALID",
      message:
        "BEFORE_STATE_INVALID: sold path requires customer_supplied before-state (no scrape/login readback)",
    };
  }
  const required = [
    b.displayName,
    b.bioOrAbout,
    b.website,
    b.phone,
    b.profileImageNote,
  ];
  if (required.some((x) => !String(x ?? "").trim())) {
    return {
      ok: false,
      code: "BEFORE_STATE_INVALID",
      message: "BEFORE_STATE_INVALID: missing required shared before-state field",
    };
  }
  if (truth.platform === "facebook") {
    if (!b.pageCoverNote?.trim()) {
      return {
        ok: false,
        code: "BEFORE_STATE_INVALID",
        message:
          "BEFORE_STATE_INVALID: Facebook update requires before.pageCoverNote",
      };
    }
  } else if (b.pageCoverNote != null && b.pageCoverNote.trim() !== "") {
    return {
      ok: false,
      code: "UNSUPPORTED_USE",
      message:
        "UNSUPPORTED_USE: Instagram/TikTok before-state must not include page cover",
    };
  }
  void normalizeNone;
  return { ok: true };
}

export function validateRmJ008KitComposition(
  truth: RmJ008UpdateKitProjectTruth,
): RmJ008CompositionValidation {
  if (!isDesignRendererRmJ008Sku(truth.skuId)) {
    return {
      ok: false,
      code: "WRONG_SKU",
      message: `WRONG_SKU: expected ${DESIGN_RENDERER_RM_J008_SKU}`,
    };
  }
  if (!isRmJ008Platform(truth.platform)) {
    return {
      ok: false,
      code: "UNSUPPORTED_PLATFORM",
      message: `UNSUPPORTED_PLATFORM: ${String(truth.platform)}`,
    };
  }
  if (!truth.customerControlsExistingProfile) {
    return {
      ok: false,
      code: "UNSUPPORTED_USE",
      message:
        "UNSUPPORTED_USE: rm-j008 requires an existing customer-controlled profile (not new setup)",
    };
  }
  if (truth.credentialsPresent) {
    return {
      ok: false,
      code: "CREDENTIALS_FORBIDDEN",
      message: "CREDENTIALS_FORBIDDEN: update kit forbids credentials",
    };
  }
  if (truth.mutationRequested) {
    return {
      ok: false,
      code: "MUTATION_FORBIDDEN",
      message: "MUTATION_FORBIDDEN: update kit forbids account mutation",
    };
  }
  if (truth.partialKitRequested) {
    return {
      ok: false,
      code: "PARTIAL_KIT_FORBIDDEN",
      message:
        "PARTIAL_KIT_FORBIDDEN: bio-only / changed-members-only compositions fail closed before payment",
    };
  }

  const beforeCheck = validateRmJ008BeforeState(truth);
  if (!beforeCheck.ok) return beforeCheck;

  if (
    truth.platform === "facebook" &&
    truth.after.coverAction === "not_applicable"
  ) {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: "MEMBERSHIP_MISMATCH: Facebook requires a coverAction",
    };
  }
  if (
    truth.platform !== "facebook" &&
    truth.after.coverAction !== "not_applicable"
  ) {
    return {
      ok: false,
      code: "UNSUPPORTED_USE",
      message:
        "UNSUPPORTED_USE: Instagram/TikTok cover remains OUT — coverAction must be not_applicable",
    };
  }

  const recipe = recipeForUpdatePlatform(truth.platform);
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
        message: `MEMBERSHIP_MISMATCH: expected ${expected.memberId} at order ${expected.order}`,
      };
    }
  }

  const ids = new Set(truth.plannedKitMembers.map((m) => m.memberId));
  if (!ids.has("before_after_change_sheet")) {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: "MEMBERSHIP_MISMATCH: before_after_change_sheet required",
    };
  }
  if (truth.platform !== "facebook" && ids.has("page_cover")) {
    return {
      ok: false,
      code: "UNSUPPORTED_USE",
      message:
        "UNSUPPORTED_USE: Instagram/TikTok kits must not include page_cover",
    };
  }
  if (truth.platform === "facebook" && !ids.has("page_cover")) {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: "MEMBERSHIP_MISMATCH: Facebook update kit requires page_cover",
    };
  }

  // Partial recipe: missing an after-state member while claiming full kit.
  const afterRecipe = rmJ002RecipeForPlatform(truth.platform);
  for (const m of afterRecipe.plannedKitMembers) {
    if (!ids.has(m.memberId as RmJ008MemberId)) {
      return {
        ok: false,
        code: "PARTIAL_KIT_FORBIDDEN",
        message: `PARTIAL_KIT_FORBIDDEN: missing after-state member ${m.memberId}`,
      };
    }
  }

  void RM_J002_AVATAR_PLATE;
  void RM_J002_FACEBOOK_COVER_PLATE;
  return { ok: true };
}
