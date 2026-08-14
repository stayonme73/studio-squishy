/**
 * STUDIO-OPERATING-DESIGN-RM-J008-DISPATCH-HOOK-1
 *
 * Map paid rmJ008PostPayDispatchStructure (+ payment seal) → RmJ008UpdateKitProjectTruth.
 * Purchased full-replacement Update Kit is law — never invent / reorder / substitute
 * members, before-state, or after intent.
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_RM_J008_SKU,
  assertRmJ008PostPayStructureDispatchReady,
  assertRmJ008PostPayStructureMatchesPaymentSeal,
  recipeForUpdatePlatform,
  type RmJ008UpdateKitProjectTruth,
  type RmJ008PlannedKitMember,
  type RmJ008PostPayDispatchStructure,
  type RmJ008KitPaymentSeal,
} from "@/lib/studio-design-renderer";

import { resolveApprovedLogoMaterial } from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export const RM_J008_DISPATCH_WIRING_SCOPE_NOTE =
  "STUDIO-OPERATING-DESIGN-RM-J008-DISPATCH-HOOK-1 — Owner-independent Machine path. " +
  "Paid rmj008KitSeal + rmJ008PostPayDispatchStructure required. " +
  "Purchased full-replacement Update Kit membership + customer-supplied before-state are law. " +
  "Canva not on the fulfillment spine; Make not required; Owner routine production NONE. " +
  "Customer applies the kit — Studio does not log in.";

export type RmJ008TruthMapResult =
  | {
      ok: true;
      truth: RmJ008UpdateKitProjectTruth;
      structure: RmJ008PostPayDispatchStructure;
    }
  | {
      ok: false;
      code:
        | "MISSING_PAYMENT_SEAL"
        | "MISSING_POSTPAY_STRUCTURE"
        | "SEAL_STRUCTURE_MISMATCH"
        | "MISSING_REQUIRED_MATERIAL"
        | "BROKEN_ASSET_REFERENCE"
        | "MISSING_REQUIRED_TRUTH"
        | "MISSING_BEFORE_STATE"
        | "BEFORE_STATE_MISMATCH"
        | "BEFORE_STATE_NOT_CUSTOMER_SUPPLIED"
        | "PLATFORM_MISMATCH"
        | "MEMBER_COUNT_MISMATCH"
        | "MEMBER_IDENTITY_MISMATCH"
        | "MEMBER_KIND_MISMATCH"
        | "COVER_FORBIDDEN"
        | "FACEBOOK_COVER_MISSING"
        | "CHANGE_SHEET_MISSING"
        | "AVATAR_MISSING"
        | "COPY_MEMBER_MISSING"
        | "CHECKLIST_MEMBER_MISSING"
        | "PLATE_TAMPER"
        | "PARTIAL_KIT_FORBIDDEN"
        | "CREDENTIALS_FORBIDDEN"
        | "MUTATION_FORBIDDEN"
        | "SKU_NOT_SUPPORTED"
        | "RM_J008_NOT_PAID";
      message: string;
    };

/**
 * Build composer input from the paid structure only.
 * Membership / platform / before-state / after intent / plates come exclusively
 * from the paid structure (+ matching seal) — never from SKU/platform guesses.
 */
export function mapRmJ008KitProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): RmJ008TruthMapResult {
  const record = input.dispatchRecord;
  if (record.skuId !== DESIGN_RENDERER_RM_J008_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `rm-j008 mapper refuses SKU ${record.skuId}`,
    };
  }

  if (
    !input.campaign.paymentReceivedAt &&
    input.campaign.paymentTruth?.status !== "confirmed"
  ) {
    return {
      ok: false,
      code: "RM_J008_NOT_PAID",
      message: "RM_J008_NOT_PAID: confirmed payment required before Update Kit dispatch",
    };
  }

  const seal = input.campaign.paymentTruth?.rmj008KitSeal as
    | RmJ008KitPaymentSeal
    | undefined;
  if (!seal) {
    return {
      ok: false,
      code: "MISSING_PAYMENT_SEAL",
      message: "MISSING_PAYMENT_SEAL: paymentTruth.rmj008KitSeal required",
    };
  }

  const structure = input.campaign.rmJ008PostPayDispatchStructure;
  if (!structure) {
    return {
      ok: false,
      code: "MISSING_POSTPAY_STRUCTURE",
      message:
        "MISSING_POSTPAY_STRUCTURE: campaign.rmJ008PostPayDispatchStructure required",
    };
  }

  const matched = assertRmJ008PostPayStructureMatchesPaymentSeal(structure, seal);
  if (!matched.ok) {
    return {
      ok: false,
      code: "SEAL_STRUCTURE_MISMATCH",
      message: matched.message,
    };
  }

  const ready = assertRmJ008PostPayStructureDispatchReady(structure);
  if (!ready.ok) {
    return {
      ok: false,
      code: "SEAL_STRUCTURE_MISMATCH",
      message: ready.message,
    };
  }

  if (
    structure.credentialsPresent !== false ||
    structure.mutationRequested !== false ||
    structure.customerApplies !== true ||
    structure.accountMutation !== false ||
    seal.credentialsPresent !== false ||
    seal.mutationRequested !== false
  ) {
    return {
      ok: false,
      code: "CREDENTIALS_FORBIDDEN",
      message:
        "CREDENTIALS_FORBIDDEN: Update Kit dispatch refuses credentials or account mutation",
    };
  }

  if (
    structure.partialKitRequested !== false ||
    seal.partialKitRequested !== false ||
    structure.replacementKitScope !== "full_platform_replacement_kit"
  ) {
    return {
      ok: false,
      code: "PARTIAL_KIT_FORBIDDEN",
      message:
        "PARTIAL_KIT_FORBIDDEN: Update Kit dispatch requires full replacement membership",
    };
  }

  if (
    structure.beforeStateSource !== "customer_supplied" ||
    seal.beforeStateSource !== "customer_supplied"
  ) {
    return {
      ok: false,
      code: "BEFORE_STATE_NOT_CUSTOMER_SUPPLIED",
      message:
        "BEFORE_STATE_NOT_CUSTOMER_SUPPLIED: before-state must remain customer-supplied",
    };
  }

  const before = structure.beforeStateIdentity;
  if (
    !before.displayName.trim() ||
    !before.bioOrAbout.trim() ||
    !before.website.trim() ||
    !before.phone.trim() ||
    !before.profileImageNote.trim()
  ) {
    return {
      ok: false,
      code: "MISSING_BEFORE_STATE",
      message: "MISSING_BEFORE_STATE: paid structure missing before-state identity",
    };
  }
  if (structure.platform === "facebook" && !before.pageCoverNote?.trim()) {
    return {
      ok: false,
      code: "MISSING_BEFORE_STATE",
      message:
        "MISSING_BEFORE_STATE: Facebook Update Kit requires before Page cover note",
    };
  }

  const after = structure.afterStateIntent;
  if (
    !after.businessName.trim() ||
    !after.displayName.trim() ||
    !after.profileGoal.trim() ||
    !after.updateIntentNotes.trim() ||
    !after.website.trim() ||
    !after.phone.trim() ||
    !after.brandNotes.trim()
  ) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: paid structure missing approved after-state intent",
    };
  }

  const recipe = recipeForUpdatePlatform(structure.platform);
  if (structure.lockedKitMemberCount !== recipe.lockedKitMemberCount) {
    return {
      ok: false,
      code: "MEMBER_COUNT_MISMATCH",
      message: `MEMBER_COUNT_MISMATCH: structure N=${structure.lockedKitMemberCount} vs recipe ${recipe.lockedKitMemberCount}`,
    };
  }
  if (structure.members.length !== recipe.lockedKitMemberCount) {
    return {
      ok: false,
      code: "MEMBER_COUNT_MISMATCH",
      message: "MEMBER_COUNT_MISMATCH: structure member list length mismatch",
    };
  }

  const plannedKitMembers: RmJ008PlannedKitMember[] = [];
  for (let i = 0; i < structure.members.length; i++) {
    const m = structure.members[i]!;
    const expected = recipe.plannedKitMembers[i]!;
    if (
      m.memberId !== expected.memberId ||
      m.kind !== expected.kind ||
      m.order !== expected.order
    ) {
      return {
        ok: false,
        code: "MEMBER_IDENTITY_MISMATCH",
        message: `MEMBER_IDENTITY_MISMATCH: slot ${i + 1} expected ${expected.memberId}/${expected.kind}`,
      };
    }
    if (expected.agreedPlateId) {
      if (m.agreedPlateId !== expected.agreedPlateId) {
        return {
          ok: false,
          code: "PLATE_TAMPER",
          message: `PLATE_TAMPER: ${m.memberId} plate must be ${expected.agreedPlateId}`,
        };
      }
    } else if (m.agreedPlateId != null) {
      return {
        ok: false,
        code: "PLATE_TAMPER",
        message: `PLATE_TAMPER: non-design member ${m.memberId} must not carry a plate`,
      };
    }
    plannedKitMembers.push({
      memberId: m.memberId as RmJ008PlannedKitMember["memberId"],
      kind: m.kind,
      order: m.order,
      memberPurpose: m.memberPurpose,
      ...(m.agreedPlateId ? { agreedPlateId: m.agreedPlateId } : {}),
    });
  }

  const ids = new Set(plannedKitMembers.map((m) => m.memberId));
  if (!ids.has("field_map_checklist")) {
    return {
      ok: false,
      code: "CHECKLIST_MEMBER_MISSING",
      message: "CHECKLIST_MEMBER_MISSING",
    };
  }
  if (!ids.has("before_after_change_sheet")) {
    return {
      ok: false,
      code: "CHANGE_SHEET_MISSING",
      message: "CHANGE_SHEET_MISSING",
    };
  }
  if (!ids.has("profile_image")) {
    return { ok: false, code: "AVATAR_MISSING", message: "AVATAR_MISSING" };
  }
  if (!ids.has("bio_about_copy") && !ids.has("bio_profile_copy")) {
    return {
      ok: false,
      code: "COPY_MEMBER_MISSING",
      message: "COPY_MEMBER_MISSING",
    };
  }
  if (structure.platform === "facebook") {
    if (!ids.has("page_cover")) {
      return {
        ok: false,
        code: "FACEBOOK_COVER_MISSING",
        message: "FACEBOOK_COVER_MISSING",
      };
    }
  } else if (ids.has("page_cover")) {
    return {
      ok: false,
      code: "COVER_FORBIDDEN",
      message: "COVER_FORBIDDEN",
    };
  }

  const logo = resolveApprovedLogoMaterial({
    repoRoot: input.repoRoot,
    items: input.materials,
    skuId: DESIGN_RENDERER_RM_J008_SKU,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  });
  if (!logo.ok) {
    return { ok: false, code: logo.code, message: logo.message };
  }
  const logoAbs = path.join(input.repoRoot, logo.material.relativePath);
  if (!existsSync(logoAbs)) {
    return {
      ok: false,
      code: "BROKEN_ASSET_REFERENCE",
      message: `BROKEN_ASSET_REFERENCE: logo missing at ${logo.material.relativePath}`,
    };
  }

  const truth: RmJ008UpdateKitProjectTruth = {
    skuId: DESIGN_RENDERER_RM_J008_SKU,
    campaignId: input.campaign.campaignId,
    jobId: record.jobId,
    dispatchId: record.dispatchId,
    platform: structure.platform,
    lockedKitMemberCount: structure.lockedKitMemberCount,
    plannedKitMembers,
    before: {
      source: "customer_supplied",
      displayName: before.displayName,
      bioOrAbout: before.bioOrAbout,
      website: before.website,
      phone: before.phone,
      profileImageNote: before.profileImageNote,
      ...(structure.platform === "facebook"
        ? { pageCoverNote: before.pageCoverNote }
        : {}),
    },
    after: {
      businessName: after.businessName,
      displayName: after.displayName,
      profileGoal: after.profileGoal,
      updateIntentNotes: after.updateIntentNotes,
      website: after.website,
      phone: after.phone,
      brandNotes: after.brandNotes,
      avatarAction: after.avatarAction,
      coverAction: after.coverAction,
    },
    customerControlsExistingProfile: true,
    label: `${after.businessName} — rm-j008 ${structure.platform} update kit`,
    credentialsPresent: false,
    mutationRequested: false,
    partialKitRequested: false,
    logoMaterial: {
      materialId: logo.material.materialId,
      relativePath: logo.material.relativePath,
      contentSha256: logo.material.contentSha256,
    },
  };

  return { ok: true, truth, structure };
}
