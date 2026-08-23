/**
 * STUDIO-OPERATING-DESIGN-RM-J002-DISPATCH-HOOK-1
 *
 * Map paid rmJ002PostPayDispatchStructure (+ payment seal) → RmJ002KitProjectTruth.
 * Purchased platform kit is law — never invent / reorder / substitute members.
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_RM_J002_SKU,
  assertRmJ002PostPayStructureDispatchReady,
  assertRmJ002PostPayStructureMatchesPaymentSeal,
  recipeForPlatform,
  type RmJ002KitProjectTruth,
  type RmJ002PlannedKitMember,
  type RmJ002PostPayDispatchStructure,
  type RmJ002KitPaymentSeal,
} from "@/lib/studio-design-renderer";

import {
  requireApprovedLogoFile,
  resolveApprovedLogoMaterial,
} from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export const RM_J002_DISPATCH_WIRING_SCOPE_NOTE =
  "STUDIO-OPERATING-DESIGN-RM-J002-DISPATCH-HOOK-1 — Owner-independent Machine path. " +
  "Paid rmj002KitSeal + rmJ002PostPayDispatchStructure required. " +
  "Purchased platform kit membership is law. Canva not on the fulfillment spine; Make not required; " +
  "Owner routine production NONE. Customer applies the kit — Studio does not log in.";

export type RmJ002TruthMapResult =
  | {
      ok: true;
      truth: RmJ002KitProjectTruth;
      structure: RmJ002PostPayDispatchStructure;
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
        | "PLATFORM_MISMATCH"
        | "MEMBER_COUNT_MISMATCH"
        | "MEMBER_IDENTITY_MISMATCH"
        | "MEMBER_KIND_MISMATCH"
        | "COVER_FORBIDDEN"
        | "FACEBOOK_COVER_MISSING"
        | "AVATAR_MISSING"
        | "COPY_MEMBER_MISSING"
        | "CHECKLIST_MEMBER_MISSING"
        | "PLATE_TAMPER"
        | "CREDENTIALS_FORBIDDEN"
        | "MUTATION_FORBIDDEN"
        | "SKU_NOT_SUPPORTED"
        | "RM_J002_NOT_PAID";
      message: string;
    };

/**
 * Build composer input from the paid structure only.
 * Membership / platform / plates come exclusively from the paid structure.
 */
export function mapRmJ002KitProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): RmJ002TruthMapResult {
  const record = input.dispatchRecord;
  if (record.skuId !== DESIGN_RENDERER_RM_J002_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `rm-j002 mapper refuses SKU ${record.skuId}`,
    };
  }

  if (
    !input.campaign.paymentReceivedAt &&
    input.campaign.paymentTruth?.status !== "confirmed"
  ) {
    return {
      ok: false,
      code: "RM_J002_NOT_PAID",
      message: "RM_J002_NOT_PAID: confirmed payment required before kit dispatch",
    };
  }

  const seal = input.campaign.paymentTruth?.rmj002KitSeal as
    | RmJ002KitPaymentSeal
    | undefined;
  if (!seal) {
    return {
      ok: false,
      code: "MISSING_PAYMENT_SEAL",
      message: "MISSING_PAYMENT_SEAL: paymentTruth.rmj002KitSeal required",
    };
  }

  const structure = input.campaign.rmJ002PostPayDispatchStructure;
  if (!structure) {
    return {
      ok: false,
      code: "MISSING_POSTPAY_STRUCTURE",
      message:
        "MISSING_POSTPAY_STRUCTURE: campaign.rmJ002PostPayDispatchStructure required",
    };
  }

  const matched = assertRmJ002PostPayStructureMatchesPaymentSeal(structure, seal);
  if (!matched.ok) {
    return {
      ok: false,
      code: "SEAL_STRUCTURE_MISMATCH",
      message: matched.message,
    };
  }

  const ready = assertRmJ002PostPayStructureDispatchReady(structure);
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
        "CREDENTIALS_FORBIDDEN: kit dispatch refuses credentials or account mutation",
    };
  }

  const recipe = recipeForPlatform(structure.platform);
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

  const plannedKitMembers: RmJ002PlannedKitMember[] = [];
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
      memberId: m.memberId as RmJ002PlannedKitMember["memberId"],
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

  if (
    !structure.businessName.trim() ||
    !structure.displayName.trim() ||
    !structure.profileGoal.trim() ||
    !structure.currentProfileNotes.trim() ||
    !structure.brandNotes.trim()
  ) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: paid kit structure missing approved business facts",
    };
  }

  const logo = requireApprovedLogoFile(
    resolveApprovedLogoMaterial({
    repoRoot: input.repoRoot,
    items: input.materials,
    skuId: DESIGN_RENDERER_RM_J002_SKU,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  }),
  );
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

  const truth: RmJ002KitProjectTruth = {
    skuId: DESIGN_RENDERER_RM_J002_SKU,
    campaignId: input.campaign.campaignId,
    jobId: record.jobId,
    dispatchId: record.dispatchId,
    platform: structure.platform,
    lockedKitMemberCount: structure.lockedKitMemberCount,
    plannedKitMembers,
    businessName: structure.businessName,
    displayName: structure.displayName,
    profileGoal: structure.profileGoal,
    currentProfileNotes: structure.currentProfileNotes,
    ...(structure.website ? { website: structure.website } : {}),
    ...(structure.phone ? { phone: structure.phone } : {}),
    brandNotes: structure.brandNotes,
    label: `${structure.businessName} — rm-j002 ${structure.platform} kit`,
    credentialsPresent: false,
    mutationRequested: false,
    logoMaterial: {
      materialId: logo.material.materialId,
      relativePath: logo.material.relativePath,
      contentSha256: logo.material.contentSha256,
    },
  };

  return { ok: true, truth, structure };
}
