/**
 * STUDIO-OPERATING-DESIGN-RM-J007-INTAKE-PAYMENT-LOCK-1 (payment gate half)
 *
 * Studio Plan / Checkout consume authoritative rmj007UpdateLock.
 * Payment cannot proceed for rm-j007 without locked reference + bounded changes
 * + recreation-limits acceptance.
 */

import { createHash } from "crypto";

import {
  assertRmJ007UpdateReadyForPayment,
  buildRmJ007UpdateManifestSeed,
  customerFacingRmJ007UpdateLines,
  mapRmJ007UpdateLockFromLiveTruth,
  type RmJ007LiveUpdateLockInput,
  type RmJ007UpdateLiveTruth,
  type RmJ007UpdateManifestSeed,
  type RmJ007UpdateStartingIdentity,
  type RmJ007PaymentReadinessResult,
  RM_J007_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
} from "./rm-j007-intake-truth";
import { recipeForRmJ007Update } from "./rm-j007-contracts";
import { DESIGN_RENDERER_RM_J007_SKU } from "./rm-j007-types";

export const RM_J007_UPDATE_PAYMENT_GATE_PACKAGE_ID =
  RM_J007_INTAKE_PAYMENT_LOCK_PACKAGE_ID;

export type RmJ007UpdatePaymentSeal = {
  packageId: typeof RM_J007_INTAKE_PAYMENT_LOCK_PACKAGE_ID;
  skuId: typeof DESIGN_RENDERER_RM_J007_SKU;
  packageFingerprint: string;
  businessName: string;
  lockedPackageMemberCount: 1;
  memberIds: readonly string[];
  memberKinds: readonly string[];
  memberOrder: readonly number[];
  memberPlateIds: readonly string[];
  packageScope: "reference_guided_promotion_update_one_member";
  startingPointIdentity: RmJ007UpdateStartingIdentity;
  completenessAuthority: "reference_and_bounded_change_locked_before_payment";
  countUnit: "member_identities";
  acceptRecreationLimits: true;
  redesignRequested: false;
  fulfillmentMode: "recreation";
  ownerRoutine: "NONE";
  canvaRequired: false;
  truth: RmJ007UpdateLiveTruth;
  manifestSeed: RmJ007UpdateManifestSeed;
  sealedAt: string;
};

export function fingerprintRmJ007UpdateLiveTruth(
  truth: RmJ007UpdateLiveTruth,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        skuId: truth.skuId,
        businessName: truth.businessName,
        lockedPackageMemberCount: truth.lockedPackageMemberCount,
        packageScope: truth.packageScope,
        acceptRecreationLimits: truth.acceptRecreationLimits,
        redesignRequested: truth.redesignRequested,
        fulfillmentMode: truth.fulfillmentMode,
        startingPoint: truth.startingPoint,
        members: truth.plannedMembers.map((m) => ({
          memberId: m.memberId,
          kind: m.kind,
          order: m.order,
          memberPurpose: m.memberPurpose,
          agreedPlateId: m.agreedPlateId,
        })),
      }),
    )
    .digest("hex");
}

export function normalizeRmJ007UpdateForPayment(
  updateLock:
    | RmJ007LiveUpdateLockInput
    | RmJ007UpdateLiveTruth
    | null
    | undefined,
):
  | {
      ok: true;
      truth: RmJ007UpdateLiveTruth;
      manifestSeed: RmJ007UpdateManifestSeed;
    }
  | { ok: false; code: string; message: string } {
  if (!updateLock) {
    return {
      ok: false,
      code: "MISSING_UPDATE_LOCK",
      message: "MISSING_UPDATE_LOCK: no Reference-Guided Update lock provided",
    };
  }

  if (
    typeof updateLock === "object" &&
    "plannedMembers" in updateLock &&
    "lockedBeforePayment" in updateLock
  ) {
    const truth = updateLock as RmJ007UpdateLiveTruth;
    if (
      truth.skuId !== DESIGN_RENDERER_RM_J007_SKU ||
      !truth.lockedBeforePayment ||
      truth.acceptRecreationLimits !== true ||
      truth.redesignRequested !== false ||
      truth.fulfillmentMode !== "recreation" ||
      truth.packageScope !== "reference_guided_promotion_update_one_member"
    ) {
      return {
        ok: false,
        code: "INVALID_UPDATE_LOCK",
        message: "INVALID_UPDATE_LOCK: update seal is not valid for payment",
      };
    }
    const recipe = recipeForRmJ007Update();
    if (
      truth.lockedPackageMemberCount !== 1 ||
      truth.plannedMembers.length !== 1
    ) {
      return {
        ok: false,
        code: "MEMBERSHIP_TAMPER",
        message: "MEMBERSHIP_TAMPER: sealed member list must be exactly 1",
      };
    }
    const expected = recipe.plannedMembers[0]!;
    const actual = truth.plannedMembers[0]!;
    if (
      actual.memberId !== expected.memberId ||
      actual.kind !== expected.kind ||
      actual.order !== expected.order ||
      actual.agreedPlateId !== expected.agreedPlateId
    ) {
      return {
        ok: false,
        code: "MEMBERSHIP_TAMPER",
        message: "MEMBERSHIP_TAMPER: member drifted from frozen recipe",
      };
    }
    if (!truth.businessName?.trim()) {
      return {
        ok: false,
        code: "BUSINESS_NAME_MISSING",
        message: "BUSINESS_NAME_MISSING: sealed update missing business name",
      };
    }
    if (
      !truth.startingPoint?.itemIdentity?.trim() ||
      !truth.startingPoint?.referenceMaterialNote?.trim()
    ) {
      return {
        ok: false,
        code: "MISSING_REFERENCE_NOTE",
        message:
          "MISSING_REFERENCE_NOTE: sealed update missing item/reference identity",
      };
    }
    return {
      ok: true,
      truth,
      manifestSeed: buildRmJ007UpdateManifestSeed(truth),
    };
  }

  const mapped = mapRmJ007UpdateLockFromLiveTruth(
    updateLock as RmJ007LiveUpdateLockInput,
  );
  if (!mapped.ok) {
    return { ok: false, code: mapped.code, message: mapped.message };
  }
  return mapped;
}

export function sealRmJ007UpdateForPayment(
  truth: RmJ007UpdateLiveTruth,
  sealedAt = new Date().toISOString(),
): RmJ007UpdatePaymentSeal {
  const manifestSeed = buildRmJ007UpdateManifestSeed(truth);
  return {
    packageId: RM_J007_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
    skuId: DESIGN_RENDERER_RM_J007_SKU,
    packageFingerprint: fingerprintRmJ007UpdateLiveTruth(truth),
    businessName: truth.businessName,
    lockedPackageMemberCount: 1,
    memberIds: truth.plannedMembers.map((m) => m.memberId),
    memberKinds: truth.plannedMembers.map((m) => m.kind),
    memberOrder: truth.plannedMembers.map((m) => m.order),
    memberPlateIds: truth.plannedMembers.map((m) => m.agreedPlateId),
    packageScope: "reference_guided_promotion_update_one_member",
    startingPointIdentity: { ...truth.startingPoint },
    completenessAuthority: "reference_and_bounded_change_locked_before_payment",
    countUnit: "member_identities",
    acceptRecreationLimits: true,
    redesignRequested: false,
    fulfillmentMode: "recreation",
    ownerRoutine: "NONE",
    canvaRequired: false,
    truth,
    manifestSeed,
    sealedAt,
  };
}

export function rmj007UpdateSealsMatch(
  a: RmJ007UpdatePaymentSeal | null | undefined,
  b: RmJ007UpdatePaymentSeal | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.packageFingerprint === b.packageFingerprint;
}

export function evaluateRmJ007UpdatePaymentGate(input: {
  selectedServiceIds: readonly string[];
  updateLock:
    | RmJ007LiveUpdateLockInput
    | RmJ007UpdateLiveTruth
    | null
    | undefined;
}):
  | {
      ok: true;
      applicable: false;
      reason: "rm-j007_not_selected";
    }
  | {
      ok: true;
      applicable: true;
      truth: RmJ007UpdateLiveTruth;
      manifestSeed: RmJ007UpdateManifestSeed;
      seal: RmJ007UpdatePaymentSeal;
      customerFacingLines: readonly string[];
    }
  | {
      ok: false;
      applicable: true;
      blockCheckout: true;
      code: string;
      message: string;
    } {
  const readiness: RmJ007PaymentReadinessResult =
    assertRmJ007UpdateReadyForPayment({
      selectedServiceIds: input.selectedServiceIds,
      updateLock: input.updateLock,
    });

  if (readiness.ok && !readiness.applicable) {
    return readiness;
  }
  if (!readiness.ok) {
    return {
      ok: false,
      applicable: true,
      blockCheckout: true,
      code: readiness.code,
      message: readiness.message,
    };
  }

  const normalized = normalizeRmJ007UpdateForPayment(readiness.truth);
  if (!normalized.ok) {
    return {
      ok: false,
      applicable: true,
      blockCheckout: true,
      code: normalized.code,
      message: normalized.message,
    };
  }

  const seal = sealRmJ007UpdateForPayment(normalized.truth);
  return {
    ok: true,
    applicable: true,
    truth: normalized.truth,
    manifestSeed: normalized.manifestSeed,
    seal,
    customerFacingLines: customerFacingRmJ007UpdateLines(normalized.truth),
  };
}

export function assertRmJ007UpdateUnchangedAfterCheckoutAuthority(input: {
  sealed: RmJ007UpdatePaymentSeal;
  attempted:
    | RmJ007LiveUpdateLockInput
    | RmJ007UpdateLiveTruth
    | null
    | undefined;
}):
  | { ok: true }
  | {
      ok: false;
      code: "POST_CHECKOUT_UPDATE_MUTATION" | "POST_PAYMENT_MEMBER_SWAP";
      message: string;
    } {
  const normalized = normalizeRmJ007UpdateForPayment(input.attempted);
  if (!normalized.ok) {
    return {
      ok: false,
      code: "POST_CHECKOUT_UPDATE_MUTATION",
      message: `POST_CHECKOUT_UPDATE_MUTATION: attempted update lock is invalid (${normalized.message})`,
    };
  }
  const sealedIds = input.sealed.memberIds.join(",");
  const nextIds = normalized.truth.plannedMembers
    .map((m) => m.memberId)
    .join(",");
  if (sealedIds !== nextIds) {
    return {
      ok: false,
      code: "POST_PAYMENT_MEMBER_SWAP",
      message:
        "POST_PAYMENT_MEMBER_SWAP: update membership cannot silently change after payment",
    };
  }
  const nextFp = fingerprintRmJ007UpdateLiveTruth(normalized.truth);
  if (nextFp !== input.sealed.packageFingerprint) {
    return {
      ok: false,
      code: "POST_CHECKOUT_UPDATE_MUTATION",
      message:
        "POST_CHECKOUT_UPDATE_MUTATION: item identity, reference, or bounded changes cannot change after checkout without a new authorized scope/payment decision",
    };
  }
  return { ok: true };
}
