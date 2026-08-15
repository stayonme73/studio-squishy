/**
 * STUDIO-OPERATING-DESIGN-RM-J007-POSTPAY-UPDATE-DISPATCH-STRUCTURE-1
 *
 * Paid update seal (paymentTruth.rmj007UpdateSeal) → durable 1-member structure.
 * Does NOT remap · invoke renderer · change Stripe · rebuild Payment Truth.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { recipeForRmJ007Update } from "./rm-j007-contracts";
import {
  fingerprintRmJ007UpdateLiveTruth,
  type RmJ007UpdatePaymentSeal,
  RM_J007_UPDATE_PAYMENT_GATE_PACKAGE_ID,
} from "./rm-j007-kit-payment-gate";
import {
  RM_J007_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
  type RmJ007UpdateStartingIdentity,
} from "./rm-j007-intake-truth";
import {
  DESIGN_RENDERER_RM_J007_SKU,
  RM_J007_UPDATE_PLATE,
  type RmJ007MemberKind,
} from "./rm-j007-types";

export const RM_J007_POSTPAY_UPDATE_DISPATCH_STRUCTURE_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-RM-J007-POSTPAY-UPDATE-DISPATCH-STRUCTURE-1" as const;

export type RmJ007PostPayDispatchMember = {
  memberId: string;
  order: number;
  kind: RmJ007MemberKind;
  memberPurpose: string;
  productionRole: "updated_promotion";
  agreedPlateId: string;
  plateRequired: true;
  fulfillmentMode: "recreation";
};

export type RmJ007PostPayDispatchStructure = {
  packageId: typeof RM_J007_POSTPAY_UPDATE_DISPATCH_STRUCTURE_PACKAGE_ID;
  status: "paid_update_dispatch_structure_ready";
  skuId: typeof DESIGN_RENDERER_RM_J007_SKU;
  packageFingerprint: string;
  businessName: string;
  lockedPackageMemberCount: 1;
  packageScope: "reference_guided_promotion_update_one_member";
  startingPointIdentity: RmJ007UpdateStartingIdentity;
  countUnit: "member_identities";
  completenessAuthority: "reference_and_bounded_change_locked_before_payment";
  members: readonly RmJ007PostPayDispatchMember[];
  acceptRecreationLimits: true;
  redesignRequested: false;
  fulfillmentMode: "recreation";
  ownerRoutine: "NONE";
  canvaRequired: false;
  paymentSealPackageId:
    | typeof RM_J007_UPDATE_PAYMENT_GATE_PACKAGE_ID
    | typeof RM_J007_INTAKE_PAYMENT_LOCK_PACKAGE_ID;
  sealedAt: string;
  builtAt: string;
  remapAuthorized: true;
  rendererInvoked: false;
  composerInvoked: false;
  dispatchHookAuthorized: false;
  note: string;
};

export type RmJ007PostPayStructureFailureCode =
  | "MISSING_PAYMENT_SEAL"
  | "INVALID_PAYMENT_SEAL"
  | "FINGERPRINT_MISMATCH"
  | "MEMBER_COUNT_MISMATCH"
  | "MEMBER_IDENTITY_MISMATCH"
  | "MEMBER_KIND_MISMATCH"
  | "MEMBER_ORDER_MISMATCH"
  | "MEMBER_DROPPED"
  | "MEMBER_SWAPPED"
  | "PLATE_TAMPER"
  | "MISSING_PLATE"
  | "BUSINESS_NAME_MISSING"
  | "STARTING_POINT_MISSING"
  | "STARTING_POINT_MISMATCH"
  | "REDESIGN_REQUESTED"
  | "MISSING_ACCEPTANCE"
  | "SCOPE_FORBIDDEN"
  | "STRUCTURE_TAMPERED"
  | "RM_J007_NOT_PAID";

export type RmJ007PostPayStructureBuildResult =
  | {
      ok: true;
      structure: RmJ007PostPayDispatchStructure;
      rendererInvoked: false;
    }
  | {
      ok: false;
      code: RmJ007PostPayStructureFailureCode;
      message: string;
      rendererInvoked: false;
    };

function fail(
  code: RmJ007PostPayStructureFailureCode,
  message: string,
): RmJ007PostPayStructureBuildResult {
  return { ok: false, code, message, rendererInvoked: false };
}

function startingPointEqual(
  a: RmJ007UpdateStartingIdentity,
  b: RmJ007UpdateStartingIdentity,
): boolean {
  return (
    a.itemIdentity === b.itemIdentity &&
    a.referenceMaterialNote === b.referenceMaterialNote &&
    a.whatChange === b.whatChange &&
    a.newInfo === b.newInfo &&
    a.whereLive === b.whereLive &&
    (a.remove ?? "") === (b.remove ?? "") &&
    (a.replacementImageNote ?? "") === (b.replacementImageNote ?? "")
  );
}

function assertSealInternallyConsistent(
  seal: RmJ007UpdatePaymentSeal,
): RmJ007PostPayStructureBuildResult | { ok: true } {
  if (seal.skuId !== DESIGN_RENDERER_RM_J007_SKU) {
    return fail(
      "INVALID_PAYMENT_SEAL",
      `INVALID_PAYMENT_SEAL: skuId must be ${DESIGN_RENDERER_RM_J007_SKU}`,
    );
  }
  if (
    seal.packageId !== RM_J007_INTAKE_PAYMENT_LOCK_PACKAGE_ID ||
    !seal.truth ||
    !seal.manifestSeed
  ) {
    return fail(
      "INVALID_PAYMENT_SEAL",
      "INVALID_PAYMENT_SEAL: seal missing package identity, truth, or manifest seed",
    );
  }
  if (
    seal.acceptRecreationLimits !== true ||
    seal.truth.acceptRecreationLimits !== true
  ) {
    return fail(
      "MISSING_ACCEPTANCE",
      "MISSING_ACCEPTANCE: paid seal must preserve recreation-limits acceptance",
    );
  }
  if (
    seal.redesignRequested !== false ||
    seal.truth.redesignRequested !== false
  ) {
    return fail(
      "REDESIGN_REQUESTED",
      "REDESIGN_REQUESTED: paid seal must keep redesignRequested false",
    );
  }
  if (
    seal.packageScope !== "reference_guided_promotion_update_one_member" ||
    seal.truth.packageScope !== "reference_guided_promotion_update_one_member"
  ) {
    return fail(
      "SCOPE_FORBIDDEN",
      "SCOPE_FORBIDDEN: paid seal must preserve one-member update scope",
    );
  }
  if (!seal.businessName?.trim() || !seal.truth.businessName?.trim()) {
    return fail(
      "BUSINESS_NAME_MISSING",
      "BUSINESS_NAME_MISSING: paid seal missing business name",
    );
  }

  const starting = seal.startingPointIdentity ?? seal.truth.startingPoint;
  if (
    !starting?.itemIdentity?.trim() ||
    !starting?.referenceMaterialNote?.trim() ||
    !starting?.whatChange?.trim() ||
    !starting?.newInfo?.trim() ||
    !starting?.whereLive?.trim()
  ) {
    return fail(
      "STARTING_POINT_MISSING",
      "STARTING_POINT_MISSING: paid seal missing update starting-point identity",
    );
  }
  if (
    !startingPointEqual(starting, seal.truth.startingPoint) ||
    !startingPointEqual(seal.startingPointIdentity, seal.truth.startingPoint)
  ) {
    return fail(
      "STARTING_POINT_MISMATCH",
      "STARTING_POINT_MISMATCH: seal startingPointIdentity does not match embedded truth",
    );
  }

  const recipe = recipeForRmJ007Update();
  if (
    seal.lockedPackageMemberCount !== 1 ||
    seal.truth.lockedPackageMemberCount !== 1 ||
    seal.manifestSeed.lockedPackageMemberCount !== 1
  ) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: rm-j007 is always exactly 1 member",
    );
  }
  if (
    seal.memberIds.length !== 1 ||
    seal.memberKinds.length !== 1 ||
    seal.memberOrder.length !== 1 ||
    seal.memberPlateIds.length !== 1 ||
    seal.truth.plannedMembers.length !== 1
  ) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: seal member lists do not match locked count",
    );
  }

  const liveFp = fingerprintRmJ007UpdateLiveTruth(seal.truth);
  if (liveFp !== seal.packageFingerprint) {
    return fail(
      "FINGERPRINT_MISMATCH",
      "FINGERPRINT_MISMATCH: payment seal fingerprint does not match embedded truth",
    );
  }

  const expected = recipe.plannedMembers[0]!;
  const planned = seal.truth.plannedMembers[0]!;
  if (
    planned.memberId !== expected.memberId ||
    planned.memberId !== seal.memberIds[0] ||
    planned.kind !== expected.kind ||
    planned.kind !== seal.memberKinds[0] ||
    planned.order !== expected.order ||
    planned.order !== seal.memberOrder[0]
  ) {
    return fail(
      "MEMBER_IDENTITY_MISMATCH",
      "MEMBER_IDENTITY_MISMATCH: member slot drift in seal",
    );
  }
  if (
    planned.agreedPlateId !== RM_J007_UPDATE_PLATE.plateId ||
    seal.memberPlateIds[0] !== RM_J007_UPDATE_PLATE.plateId
  ) {
    return fail(
      "PLATE_TAMPER",
      `PLATE_TAMPER: expected plate ${RM_J007_UPDATE_PLATE.plateId}`,
    );
  }

  return { ok: true };
}

export function buildRmJ007PostPayDispatchStructureFromPaymentSeal(
  seal: RmJ007UpdatePaymentSeal | null | undefined,
  builtAt = new Date().toISOString(),
): RmJ007PostPayStructureBuildResult {
  if (!seal) {
    return fail(
      "MISSING_PAYMENT_SEAL",
      "MISSING_PAYMENT_SEAL: paymentTruth.rmj007UpdateSeal is required",
    );
  }

  const consistent = assertSealInternallyConsistent(seal);
  if (!consistent.ok) return consistent;

  const planned = seal.truth.plannedMembers[0]!;
  const members: RmJ007PostPayDispatchMember[] = [
    {
      memberId: planned.memberId,
      order: planned.order,
      kind: planned.kind,
      memberPurpose: planned.memberPurpose,
      productionRole: "updated_promotion",
      agreedPlateId: RM_J007_UPDATE_PLATE.plateId,
      plateRequired: true,
      fulfillmentMode: "recreation",
    },
  ];

  const structure: RmJ007PostPayDispatchStructure = {
    packageId: RM_J007_POSTPAY_UPDATE_DISPATCH_STRUCTURE_PACKAGE_ID,
    status: "paid_update_dispatch_structure_ready",
    skuId: DESIGN_RENDERER_RM_J007_SKU,
    packageFingerprint: seal.packageFingerprint,
    businessName: seal.businessName,
    lockedPackageMemberCount: 1,
    packageScope: "reference_guided_promotion_update_one_member",
    startingPointIdentity: { ...seal.startingPointIdentity },
    countUnit: "member_identities",
    completenessAuthority: "reference_and_bounded_change_locked_before_payment",
    members,
    acceptRecreationLimits: true,
    redesignRequested: false,
    fulfillmentMode: "recreation",
    ownerRoutine: "NONE",
    canvaRequired: false,
    paymentSealPackageId: seal.packageId,
    sealedAt: seal.sealedAt,
    builtAt,
    remapAuthorized: true,
    rendererInvoked: false,
    composerInvoked: false,
    dispatchHookAuthorized: false,
    note:
      "Post-pay structure mirrors the paid Reference-Guided Promotion Update — one named item, customer reference, bounded changes, recreation limits accepted. Not a redesign. Not a pixel-perfect source edit. Dispatch hook not authorized on the structure object itself.",
  };

  const ready = assertRmJ007PostPayStructureMatchesPaymentSeal(structure, seal);
  if (!ready.ok) return ready;

  return { ok: true, structure, rendererInvoked: false };
}

export function assertRmJ007PostPayStructureMatchesPaymentSeal(
  structure: RmJ007PostPayDispatchStructure,
  seal: RmJ007UpdatePaymentSeal,
): RmJ007PostPayStructureBuildResult {
  if (structure.packageFingerprint !== seal.packageFingerprint) {
    return fail(
      "FINGERPRINT_MISMATCH",
      "FINGERPRINT_MISMATCH: post-pay structure fingerprint does not match payment seal",
    );
  }
  if (structure.businessName !== seal.businessName) {
    return fail(
      "BUSINESS_NAME_MISSING",
      "BUSINESS_NAME_MISSING: post-pay structure business name drifted",
    );
  }
  if (structure.lockedPackageMemberCount !== 1 || structure.members.length !== 1) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: post-pay structure must be 1/1",
    );
  }
  if (
    !startingPointEqual(
      structure.startingPointIdentity,
      seal.startingPointIdentity,
    )
  ) {
    return fail(
      "STARTING_POINT_MISMATCH",
      "STARTING_POINT_MISMATCH: post-pay structure starting-point drifted",
    );
  }
  if (
    structure.acceptRecreationLimits !== true ||
    structure.redesignRequested !== false
  ) {
    return fail(
      "SCOPE_FORBIDDEN",
      "SCOPE_FORBIDDEN: post-pay structure must preserve acceptance / no-redesign",
    );
  }
  const m = structure.members[0]!;
  if (m.memberId !== seal.memberIds[0]) {
    return fail(
      "MEMBER_SWAPPED",
      `MEMBER_SWAPPED: memberId ${m.memberId} !== sealed ${seal.memberIds[0]}`,
    );
  }
  if (m.kind !== seal.memberKinds[0]) {
    return fail(
      "MEMBER_KIND_MISMATCH",
      "MEMBER_KIND_MISMATCH: member kind changed after payment",
    );
  }
  if (m.agreedPlateId !== seal.memberPlateIds[0]) {
    return fail(
      "PLATE_TAMPER",
      "PLATE_TAMPER: member plate changed after payment",
    );
  }
  return { ok: true, structure, rendererInvoked: false };
}

export function assertRmJ007PostPayStructureDispatchReady(
  structure: RmJ007PostPayDispatchStructure,
): RmJ007PostPayStructureBuildResult {
  if (structure.status !== "paid_update_dispatch_structure_ready") {
    return fail(
      "INVALID_PAYMENT_SEAL",
      "INVALID_PAYMENT_SEAL: structure status is not paid_update_dispatch_structure_ready",
    );
  }
  if (
    structure.rendererInvoked !== false ||
    structure.composerInvoked !== false ||
    structure.dispatchHookAuthorized !== false
  ) {
    return fail(
      "STRUCTURE_TAMPERED",
      "STRUCTURE_TAMPERED: structure must remain composer/renderer/dispatch unauthorized on the structure object itself",
    );
  }
  if (
    structure.members.length !== 1 ||
    structure.lockedPackageMemberCount !== 1
  ) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: structure is not exact 1/1",
    );
  }
  if (!structure.members[0]!.agreedPlateId.trim()) {
    return fail(
      "MISSING_PLATE",
      "MISSING_PLATE: updated_promotion lacks required plate",
    );
  }
  return { ok: true, structure, rendererInvoked: false };
}

export function buildRmJ007PostPayDispatchStructureFromCampaign(
  campaign: CampaignRecord,
): RmJ007PostPayStructureBuildResult {
  const hasSku = campaign.paymentTruth?.selectedServiceIds?.includes(
    DESIGN_RENDERER_RM_J007_SKU,
  );
  const seal = campaign.paymentTruth?.rmj007UpdateSeal;
  if (hasSku && !seal) {
    return fail(
      "MISSING_PAYMENT_SEAL",
      "MISSING_PAYMENT_SEAL: rm-j007 was paid/selected without an update seal",
    );
  }
  if (!seal) {
    return fail(
      "RM_J007_NOT_PAID",
      "RM_J007_NOT_PAID: no rm-j007 update seal on paymentTruth",
    );
  }
  if (
    !campaign.paymentReceivedAt &&
    campaign.paymentTruth?.status !== "confirmed"
  ) {
    return fail(
      "RM_J007_NOT_PAID",
      "RM_J007_NOT_PAID: payment not confirmed — post-pay structure requires a paid seal",
    );
  }
  return buildRmJ007PostPayDispatchStructureFromPaymentSeal(seal);
}

export function ensureRmJ007PostPayDispatchStructureOnCampaign(
  campaign: CampaignRecord,
):
  | {
      ok: true;
      campaign: CampaignRecord;
      structure: RmJ007PostPayDispatchStructure;
      alreadyPresent: boolean;
      rendererInvoked: false;
    }
  | {
      ok: false;
      campaign: CampaignRecord;
      code: RmJ007PostPayStructureFailureCode;
      message: string;
      rendererInvoked: false;
    } {
  const built = buildRmJ007PostPayDispatchStructureFromCampaign(campaign);
  if (!built.ok) {
    return {
      ok: false,
      campaign,
      code: built.code,
      message: built.message,
      rendererInvoked: false,
    };
  }

  const existing = campaign.rmj007PostPayDispatchStructure;
  if (
    existing &&
    existing.packageFingerprint === built.structure.packageFingerprint &&
    existing.lockedPackageMemberCount ===
      built.structure.lockedPackageMemberCount &&
    startingPointEqual(
      existing.startingPointIdentity,
      built.structure.startingPointIdentity,
    ) &&
    existing.members.length === built.structure.members.length &&
    existing.members.every(
      (m, i) =>
        m.memberId === built.structure.members[i]!.memberId &&
        m.kind === built.structure.members[i]!.kind &&
        m.order === built.structure.members[i]!.order &&
        m.agreedPlateId === built.structure.members[i]!.agreedPlateId,
    )
  ) {
    const ready = assertRmJ007PostPayStructureDispatchReady(existing);
    if (!ready.ok) {
      return {
        ok: false,
        campaign,
        code: ready.code,
        message: ready.message,
        rendererInvoked: false,
      };
    }
    return {
      ok: true,
      campaign,
      structure: existing,
      alreadyPresent: true,
      rendererInvoked: false,
    };
  }

  return {
    ok: true,
    campaign: {
      ...campaign,
      rmj007PostPayDispatchStructure: built.structure,
      updatedAt: new Date().toISOString(),
    },
    structure: built.structure,
    alreadyPresent: false,
    rendererInvoked: false,
  };
}
