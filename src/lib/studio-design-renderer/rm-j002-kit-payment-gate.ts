/**
 * STUDIO-OPERATING-DESIGN-RM-J002-INTAKE-PAYMENT-LOCK-1 (payment gate half)
 *
 * Studio Plan / Checkout consume authoritative rmj002KitLock.
 * Payment cannot proceed for rm-j002 without a locked platform + kit membership.
 * No remap · no dispatch · no renderer invoke.
 */

import { createHash } from "crypto";

import {
  assertRmJ002KitReadyForPayment,
  buildRmJ002KitManifestSeed,
  customerFacingRmJ002KitLines,
  mapRmJ002KitLockFromLiveTruth,
  type RmJ002KitLiveTruth,
  type RmJ002KitManifestSeed,
  type RmJ002LiveKitLockInput,
  type RmJ002PaymentReadinessResult,
  RM_J002_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
} from "./rm-j002-intake-truth";
import { recipeForPlatform } from "./rm-j002-contracts";
import { DESIGN_RENDERER_RM_J002_SKU } from "./rm-j002-types";

export const RM_J002_KIT_PAYMENT_GATE_PACKAGE_ID =
  RM_J002_INTAKE_PAYMENT_LOCK_PACKAGE_ID;

/** Compact seal stored on checkout binding + paymentTruth. */
export type RmJ002KitPaymentSeal = {
  packageId: typeof RM_J002_INTAKE_PAYMENT_LOCK_PACKAGE_ID;
  skuId: typeof DESIGN_RENDERER_RM_J002_SKU;
  kitFingerprint: string;
  platform: RmJ002KitLiveTruth["platform"];
  lockedKitMemberCount: RmJ002KitLiveTruth["lockedKitMemberCount"];
  memberIds: readonly string[];
  memberKinds: readonly string[];
  memberOrder: readonly number[];
  displayName: string;
  businessName: string;
  completenessAuthority: "platform_locked_kit_membership";
  countUnit: "kit_member_identities";
  credentialsPresent: false;
  mutationRequested: false;
  customerApplies: true;
  accountMutation: false;
  ownerRoutine: "NONE";
  truth: RmJ002KitLiveTruth;
  manifestSeed: RmJ002KitManifestSeed;
  sealedAt: string;
};

export function fingerprintRmJ002KitLiveTruth(
  truth: RmJ002KitLiveTruth,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        skuId: truth.skuId,
        platform: truth.platform,
        lockedKitMemberCount: truth.lockedKitMemberCount,
        businessName: truth.businessName,
        displayName: truth.displayName,
        profileGoal: truth.profileGoal,
        currentProfileNotes: truth.currentProfileNotes,
        website: truth.website ?? null,
        phone: truth.phone ?? null,
        brandNotes: truth.brandNotes,
        credentialsPresent: truth.credentialsPresent,
        mutationRequested: truth.mutationRequested,
        members: truth.plannedKitMembers.map((m) => ({
          memberId: m.memberId,
          kind: m.kind,
          order: m.order,
          memberPurpose: m.memberPurpose,
          agreedPlateId: m.agreedPlateId ?? null,
        })),
      }),
    )
    .digest("hex");
}

/**
 * Normalize any client/live kit lock into authoritative truth.
 * Never invents a default platform. Re-maps live input; re-validates sealed truth.
 */
export function normalizeRmJ002KitForPayment(
  kitLock: RmJ002LiveKitLockInput | RmJ002KitLiveTruth | null | undefined,
):
  | { ok: true; truth: RmJ002KitLiveTruth; manifestSeed: RmJ002KitManifestSeed }
  | { ok: false; code: string; message: string } {
  if (!kitLock) {
    return {
      ok: false,
      code: "MISSING_KIT_LOCK",
      message: "MISSING_KIT_LOCK: no Social Profile Setup Kit lock provided",
    };
  }

  if (
    typeof kitLock === "object" &&
    "plannedKitMembers" in kitLock &&
    "lockedBeforePayment" in kitLock
  ) {
    const truth = kitLock as RmJ002KitLiveTruth;
    if (
      truth.skuId !== DESIGN_RENDERER_RM_J002_SKU ||
      !truth.lockedBeforePayment ||
      truth.credentialsPresent !== false ||
      truth.mutationRequested !== false
    ) {
      return {
        ok: false,
        code: "INVALID_KIT_LOCK",
        message: "INVALID_KIT_LOCK: kit seal is not valid for payment",
      };
    }
    const recipe = recipeForPlatform(truth.platform);
    if (
      truth.lockedKitMemberCount !== recipe.lockedKitMemberCount ||
      truth.plannedKitMembers.length !== recipe.lockedKitMemberCount
    ) {
      return {
        ok: false,
        code: "MEMBERSHIP_TAMPER",
        message: "MEMBERSHIP_TAMPER: sealed member list length mismatch",
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
          code: "MEMBERSHIP_TAMPER",
          message: `MEMBERSHIP_TAMPER: expected ${expected.memberId} at order ${expected.order}`,
        };
      }
    }
    if (
      truth.platform !== "facebook" &&
      truth.plannedKitMembers.some((m) => m.memberId === "page_cover")
    ) {
      return {
        ok: false,
        code: "COVER_FORBIDDEN",
        message:
          "COVER_FORBIDDEN: Instagram/TikTok kits must not include page_cover",
      };
    }
    return {
      ok: true,
      truth,
      manifestSeed: buildRmJ002KitManifestSeed(truth),
    };
  }

  const mapped = mapRmJ002KitLockFromLiveTruth(
    kitLock as RmJ002LiveKitLockInput,
  );
  if (!mapped.ok) {
    return { ok: false, code: mapped.code, message: mapped.message };
  }
  return mapped;
}

export function sealRmJ002KitForPayment(
  truth: RmJ002KitLiveTruth,
  sealedAt = new Date().toISOString(),
): RmJ002KitPaymentSeal {
  const manifestSeed = buildRmJ002KitManifestSeed(truth);
  return {
    packageId: RM_J002_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
    skuId: DESIGN_RENDERER_RM_J002_SKU,
    kitFingerprint: fingerprintRmJ002KitLiveTruth(truth),
    platform: truth.platform,
    lockedKitMemberCount: truth.lockedKitMemberCount,
    memberIds: truth.plannedKitMembers.map((m) => m.memberId),
    memberKinds: truth.plannedKitMembers.map((m) => m.kind),
    memberOrder: truth.plannedKitMembers.map((m) => m.order),
    displayName: truth.displayName,
    businessName: truth.businessName,
    completenessAuthority: "platform_locked_kit_membership",
    countUnit: "kit_member_identities",
    credentialsPresent: false,
    mutationRequested: false,
    customerApplies: true,
    accountMutation: false,
    ownerRoutine: "NONE",
    truth,
    manifestSeed,
    sealedAt,
  };
}

export function rmJ002KitSealsMatch(
  a: RmJ002KitPaymentSeal | null | undefined,
  b: RmJ002KitPaymentSeal | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.kitFingerprint === b.kitFingerprint;
}

/**
 * Plan + Checkout gate: reuse assertRmJ002KitReadyForPayment + identity checks.
 */
export function evaluateRmJ002KitPaymentGate(input: {
  selectedServiceIds: readonly string[];
  kitLock: RmJ002LiveKitLockInput | RmJ002KitLiveTruth | null | undefined;
}):
  | {
      ok: true;
      applicable: false;
      reason: "rm-j002_not_selected";
    }
  | {
      ok: true;
      applicable: true;
      truth: RmJ002KitLiveTruth;
      manifestSeed: RmJ002KitManifestSeed;
      seal: RmJ002KitPaymentSeal;
      customerFacingLines: readonly string[];
    }
  | {
      ok: false;
      applicable: true;
      blockCheckout: true;
      code: string;
      message: string;
    } {
  const readiness: RmJ002PaymentReadinessResult = assertRmJ002KitReadyForPayment(
    {
      selectedServiceIds: input.selectedServiceIds,
      kitLock: input.kitLock,
    },
  );

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

  const normalized = normalizeRmJ002KitForPayment(readiness.truth);
  if (!normalized.ok) {
    return {
      ok: false,
      applicable: true,
      blockCheckout: true,
      code: normalized.code,
      message: normalized.message,
    };
  }

  const seal = sealRmJ002KitForPayment(normalized.truth);
  return {
    ok: true,
    applicable: true,
    truth: normalized.truth,
    manifestSeed: normalized.manifestSeed,
    seal,
    customerFacingLines: customerFacingRmJ002KitLines(normalized.truth),
  };
}

/**
 * Fail closed if platform or kit membership mutates after checkout authority sealed it.
 */
export function assertRmJ002KitUnchangedAfterCheckoutAuthority(input: {
  sealed: RmJ002KitPaymentSeal;
  attempted: RmJ002LiveKitLockInput | RmJ002KitLiveTruth | null | undefined;
}):
  | { ok: true }
  | {
      ok: false;
      code: "POST_CHECKOUT_KIT_MUTATION" | "POST_PAYMENT_PLATFORM_MUTATION";
      message: string;
    } {
  const normalized = normalizeRmJ002KitForPayment(input.attempted);
  if (!normalized.ok) {
    return {
      ok: false,
      code: "POST_CHECKOUT_KIT_MUTATION",
      message: `POST_CHECKOUT_KIT_MUTATION: attempted kit lock is invalid (${normalized.message})`,
    };
  }
  if (normalized.truth.platform !== input.sealed.platform) {
    return {
      ok: false,
      code: "POST_PAYMENT_PLATFORM_MUTATION",
      message:
        "POST_PAYMENT_PLATFORM_MUTATION: platform cannot silently change after payment — requires a new authorized scope/payment decision",
    };
  }
  const nextFp = fingerprintRmJ002KitLiveTruth(normalized.truth);
  if (nextFp !== input.sealed.kitFingerprint) {
    return {
      ok: false,
      code: "POST_CHECKOUT_KIT_MUTATION",
      message:
        "POST_CHECKOUT_KIT_MUTATION: platform, membership, or approved facts cannot change after checkout authority without a new authorized scope/payment decision",
    };
  }
  return { ok: true };
}

/**
 * Stale Studio Plan display vs live draft kit lock.
 */
export function assertRmJ002PlanKitFresh(input: {
  displayedFingerprint: string | null | undefined;
  liveKitLock: RmJ002LiveKitLockInput | RmJ002KitLiveTruth | null | undefined;
}):
  | { ok: true; fingerprint: string }
  | { ok: false; code: "STALE_PLAN_KIT_LOCK"; message: string } {
  const normalized = normalizeRmJ002KitForPayment(input.liveKitLock);
  if (!normalized.ok) {
    return {
      ok: false,
      code: "STALE_PLAN_KIT_LOCK",
      message: `STALE_PLAN_KIT_LOCK: live kit lock invalid (${normalized.message})`,
    };
  }
  const liveFp = fingerprintRmJ002KitLiveTruth(normalized.truth);
  if (input.displayedFingerprint && input.displayedFingerprint !== liveFp) {
    return {
      ok: false,
      code: "STALE_PLAN_KIT_LOCK",
      message:
        "STALE_PLAN_KIT_LOCK: Studio Plan display does not match the current locked kit — refresh plan truth before payment",
    };
  }
  return { ok: true, fingerprint: liveFp };
}
