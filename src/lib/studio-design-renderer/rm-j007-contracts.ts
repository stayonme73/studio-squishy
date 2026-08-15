/**
 * RM-J007 composition validation — Owner APPROVE B freeze.
 * Fail closed: missing reference, unsupported mime, redesign, missing changes, missing acceptance.
 */

import {
  DESIGN_RENDERER_RM_J007_SKU,
  RM_J007_UPDATE_PLATE,
  type RmJ007BoundedChanges,
  type RmJ007PlannedMember,
  type RmJ007UpdateProjectTruth,
} from "./rm-j007-types";

export const RM_J007_PROOF_CONTRACT = {
  packageId: "STUDIO-OPERATING-DESIGN-RM-J007-PROOF-1",
  skuId: DESIGN_RENDERER_RM_J007_SKU,
  lockedPackageMemberCount: 1 as const,
  canvaRequired: false,
  remapAuthorized: true,
  ownerRoutine: "NONE" as const,
  fulfillmentMode: "recreation" as const,
  redesignAllowed: false,
  pixelPerfectGuarantee: false,
  sourceFileEdit: false,
  canvaFileEdit: false,
  editableLayerRestoration: false,
} as const;

export const RM_J007_SUPPORTED_REFERENCE_MIMES = [
  "png",
  "jpeg",
  "pdf",
] as const;

export function isDesignRendererRmJ007Sku(skuId: string): boolean {
  return skuId === DESIGN_RENDERER_RM_J007_SKU;
}

export function recipeForRmJ007Update(): {
  lockedPackageMemberCount: 1;
  plannedMembers: readonly RmJ007PlannedMember[];
} {
  return {
    lockedPackageMemberCount: 1,
    plannedMembers: [
      {
        memberId: "updated_promotion",
        kind: "design_promotion_update",
        order: 1,
        memberPurpose: "Reference-guided recreated updated promotion",
        agreedPlateId: RM_J007_UPDATE_PLATE.plateId,
      },
    ],
  };
}

export function hasAtLeastOneBoundedChange(
  changes: RmJ007BoundedChanges,
): boolean {
  return Boolean(
    changes.dates?.trim() ||
      changes.prices?.trim() ||
      changes.contact?.trim() ||
      changes.wording?.trim() ||
      changes.remove?.trim(),
  );
}

export type RmJ007CompositionValidation =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function validateRmJ007PackageComposition(
  truth: RmJ007UpdateProjectTruth,
): RmJ007CompositionValidation {
  if (truth.skuId !== DESIGN_RENDERER_RM_J007_SKU) {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: `MEMBERSHIP_MISMATCH: skuId must be ${DESIGN_RENDERER_RM_J007_SKU}`,
    };
  }

  const name = truth.businessName?.trim() ?? "";
  if (!name) {
    return {
      ok: false,
      code: "BUSINESS_NAME_MISSING",
      message: "BUSINESS_NAME_MISSING: business name required",
    };
  }

  const item = truth.itemIdentity?.trim() ?? "";
  if (!item) {
    return {
      ok: false,
      code: "ITEM_IDENTITY_MISSING",
      message:
        "ITEM_IDENTITY_MISSING: one named existing promotional item identity required",
    };
  }

  if (truth.redesignRequested !== false) {
    return {
      ok: false,
      code: "REDESIGN_REQUESTED",
      message:
        "REDESIGN_REQUESTED: redesign / new concept fails closed for rm-j007",
    };
  }

  if (truth.acceptRecreationLimits !== true) {
    return {
      ok: false,
      code: "MISSING_ACCEPTANCE",
      message:
        "MISSING_ACCEPTANCE: customer must accept recreation limits (not pixel-perfect / not source-file edit)",
    };
  }

  if (!truth.referenceMaterial?.contentSha256 || !truth.referenceMaterial.relativePath) {
    return {
      ok: false,
      code: "MISSING_REFERENCE",
      message:
        "MISSING_REFERENCE: customer-supplied promotional reference material required",
    };
  }

  const mime = truth.referenceMaterial.mime;
  if (
    !(RM_J007_SUPPORTED_REFERENCE_MIMES as readonly string[]).includes(mime)
  ) {
    return {
      ok: false,
      code: "UNSUPPORTED_REFERENCE_MIME",
      message: `UNSUPPORTED_REFERENCE_MIME: reference mime "${mime}" is not png|jpeg|pdf`,
    };
  }

  const whatChange = truth.whatChange?.trim() ?? "";
  const newInfo = truth.newInfo?.trim() ?? "";
  if (!whatChange || !newInfo) {
    return {
      ok: false,
      code: "MISSING_BOUNDED_CHANGES",
      message:
        "MISSING_BOUNDED_CHANGES: whatChange and newInfo are required",
    };
  }

  if (!hasAtLeastOneBoundedChange(truth.boundedChanges)) {
    return {
      ok: false,
      code: "MISSING_BOUNDED_CHANGES",
      message:
        "MISSING_BOUNDED_CHANGES: at least one bounded field (dates, prices, contact, wording, remove) required",
    };
  }

  if (truth.lockedPackageMemberCount !== 1) {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: "MEMBERSHIP_MISMATCH: lockedPackageMemberCount must be 1",
    };
  }

  if (truth.fulfillmentMode !== "recreation") {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: "MEMBERSHIP_MISMATCH: fulfillmentMode must be recreation",
    };
  }

  const expected = recipeForRmJ007Update();
  if (truth.plannedMembers.length !== 1) {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: `MEMBERSHIP_MISMATCH: expected 1 member, got ${truth.plannedMembers.length}`,
    };
  }

  const exp = expected.plannedMembers[0]!;
  const got = truth.plannedMembers[0]!;
  if (
    got.memberId !== exp.memberId ||
    got.kind !== exp.kind ||
    got.order !== exp.order ||
    got.agreedPlateId !== exp.agreedPlateId
  ) {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: "MEMBERSHIP_MISMATCH: member does not match frozen 1-member recipe",
    };
  }

  if (got.agreedPlateId !== RM_J007_UPDATE_PLATE.plateId) {
    return {
      ok: false,
      code: "PLATE_MISMATCH",
      message: `PLATE_MISMATCH: expected ${RM_J007_UPDATE_PLATE.plateId}`,
    };
  }

  return { ok: true };
}
