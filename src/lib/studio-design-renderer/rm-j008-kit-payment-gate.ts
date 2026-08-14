/**
 * STUDIO-OPERATING-DESIGN-RM-J008-INTAKE-PAYMENT-LOCK-1 (payment gate half)
 *
 * Studio Plan / Checkout consume authoritative rmj008KitLock.
 * Payment cannot proceed for rm-j008 without a locked platform + full
 * replacement membership + customer-supplied before-state.
 * No remap · no dispatch · no renderer invoke.
 */

import { createHash } from "crypto";

import {
  assertRmJ008KitReadyForPayment,
  buildRmJ008KitManifestSeed,
  customerFacingRmJ008KitLines,
  mapRmJ008KitLockFromLiveTruth,
  type RmJ008KitLiveTruth,
  type RmJ008KitManifestSeed,
  type RmJ008LiveKitLockInput,
  type RmJ008PaymentReadinessResult,
  RM_J008_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
} from "./rm-j008-intake-truth";
import { recipeForUpdatePlatform } from "./rm-j008-contracts";
import { DESIGN_RENDERER_RM_J008_SKU } from "./rm-j008-types";

export const RM_J008_KIT_PAYMENT_GATE_PACKAGE_ID =
  RM_J008_INTAKE_PAYMENT_LOCK_PACKAGE_ID;

/** Compact seal stored on checkout binding + paymentTruth. */
export type RmJ008KitPaymentSeal = {
  packageId: typeof RM_J008_INTAKE_PAYMENT_LOCK_PACKAGE_ID;
  skuId: typeof DESIGN_RENDERER_RM_J008_SKU;
  kitFingerprint: string;
  platform: RmJ008KitLiveTruth["platform"];
  lockedKitMemberCount: RmJ008KitLiveTruth["lockedKitMemberCount"];
  memberIds: readonly string[];
  memberKinds: readonly string[];
  memberOrder: readonly number[];
  replacementKitScope: "full_platform_replacement_kit";
  beforeStateSource: "customer_supplied";
  beforeStateIdentity: {
    displayName: string;
    bioOrAbout: string;
    website: string;
    phone: string;
    profileImageNote: string;
    pageCoverNote?: string;
  };
  completenessAuthority: "platform_locked_full_replacement_kit_membership";
  countUnit: "kit_member_identities";
  credentialsPresent: false;
  mutationRequested: false;
  partialKitRequested: false;
  customerApplies: true;
  accountMutation: false;
  ownerRoutine: "NONE";
  truth: RmJ008KitLiveTruth;
  manifestSeed: RmJ008KitManifestSeed;
  sealedAt: string;
};

export function fingerprintRmJ008KitLiveTruth(
  truth: RmJ008KitLiveTruth,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        skuId: truth.skuId,
        platform: truth.platform,
        lockedKitMemberCount: truth.lockedKitMemberCount,
        replacementKitScope: truth.replacementKitScope,
        beforeStateSource: truth.beforeStateSource,
        before: truth.before,
        after: truth.after,
        credentialsPresent: truth.credentialsPresent,
        mutationRequested: truth.mutationRequested,
        partialKitRequested: truth.partialKitRequested,
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
 * Never invents a default platform or before-state.
 */
export function normalizeRmJ008KitForPayment(
  kitLock: RmJ008LiveKitLockInput | RmJ008KitLiveTruth | null | undefined,
):
  | { ok: true; truth: RmJ008KitLiveTruth; manifestSeed: RmJ008KitManifestSeed }
  | { ok: false; code: string; message: string } {
  if (!kitLock) {
    return {
      ok: false,
      code: "MISSING_KIT_LOCK",
      message: "MISSING_KIT_LOCK: no Social Profile Update Kit lock provided",
    };
  }

  if (
    typeof kitLock === "object" &&
    "plannedKitMembers" in kitLock &&
    "lockedBeforePayment" in kitLock
  ) {
    const truth = kitLock as RmJ008KitLiveTruth;
    if (
      truth.skuId !== DESIGN_RENDERER_RM_J008_SKU ||
      !truth.lockedBeforePayment ||
      truth.credentialsPresent !== false ||
      truth.mutationRequested !== false ||
      truth.partialKitRequested !== false ||
      truth.beforeStateSource !== "customer_supplied" ||
      truth.replacementKitScope !== "full_platform_replacement_kit"
    ) {
      return {
        ok: false,
        code: "INVALID_KIT_LOCK",
        message: "INVALID_KIT_LOCK: Update Kit seal is not valid for payment",
      };
    }
    const recipe = recipeForUpdatePlatform(truth.platform);
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
    if (
      truth.platform === "facebook" &&
      !truth.plannedKitMembers.some((m) => m.memberId === "page_cover")
    ) {
      return {
        ok: false,
        code: "COVER_REQUIRED",
        message: "COVER_REQUIRED: Facebook Update Kit requires page_cover",
      };
    }
    if (
      !truth.plannedKitMembers.some(
        (m) => m.memberId === "before_after_change_sheet",
      )
    ) {
      return {
        ok: false,
        code: "MEMBERSHIP_TAMPER",
        message: "MEMBERSHIP_TAMPER: change sheet member is required",
      };
    }
    return {
      ok: true,
      truth,
      manifestSeed: buildRmJ008KitManifestSeed(truth),
    };
  }

  const mapped = mapRmJ008KitLockFromLiveTruth(
    kitLock as RmJ008LiveKitLockInput,
  );
  if (!mapped.ok) {
    return { ok: false, code: mapped.code, message: mapped.message };
  }
  return mapped;
}

export function sealRmJ008KitForPayment(
  truth: RmJ008KitLiveTruth,
  sealedAt = new Date().toISOString(),
): RmJ008KitPaymentSeal {
  const manifestSeed = buildRmJ008KitManifestSeed(truth);
  return {
    packageId: RM_J008_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
    skuId: DESIGN_RENDERER_RM_J008_SKU,
    kitFingerprint: fingerprintRmJ008KitLiveTruth(truth),
    platform: truth.platform,
    lockedKitMemberCount: truth.lockedKitMemberCount,
    memberIds: truth.plannedKitMembers.map((m) => m.memberId),
    memberKinds: truth.plannedKitMembers.map((m) => m.kind),
    memberOrder: truth.plannedKitMembers.map((m) => m.order),
    replacementKitScope: "full_platform_replacement_kit",
    beforeStateSource: "customer_supplied",
    beforeStateIdentity: { ...truth.before },
    completenessAuthority: "platform_locked_full_replacement_kit_membership",
    countUnit: "kit_member_identities",
    credentialsPresent: false,
    mutationRequested: false,
    partialKitRequested: false,
    customerApplies: true,
    accountMutation: false,
    ownerRoutine: "NONE",
    truth,
    manifestSeed,
    sealedAt,
  };
}

export function rmJ008KitSealsMatch(
  a: RmJ008KitPaymentSeal | null | undefined,
  b: RmJ008KitPaymentSeal | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.kitFingerprint === b.kitFingerprint;
}

export function evaluateRmJ008KitPaymentGate(input: {
  selectedServiceIds: readonly string[];
  kitLock: RmJ008LiveKitLockInput | RmJ008KitLiveTruth | null | undefined;
}):
  | {
      ok: true;
      applicable: false;
      reason: "rm-j008_not_selected";
    }
  | {
      ok: true;
      applicable: true;
      truth: RmJ008KitLiveTruth;
      manifestSeed: RmJ008KitManifestSeed;
      seal: RmJ008KitPaymentSeal;
      customerFacingLines: readonly string[];
    }
  | {
      ok: false;
      applicable: true;
      blockCheckout: true;
      code: string;
      message: string;
    } {
  const readiness: RmJ008PaymentReadinessResult = assertRmJ008KitReadyForPayment(
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

  const normalized = normalizeRmJ008KitForPayment(readiness.truth);
  if (!normalized.ok) {
    return {
      ok: false,
      applicable: true,
      blockCheckout: true,
      code: normalized.code,
      message: normalized.message,
    };
  }

  const seal = sealRmJ008KitForPayment(normalized.truth);
  return {
    ok: true,
    applicable: true,
    truth: normalized.truth,
    manifestSeed: normalized.manifestSeed,
    seal,
    customerFacingLines: customerFacingRmJ008KitLines(normalized.truth),
  };
}

/**
 * Fail closed if platform or kit membership mutates after checkout authority sealed it.
 */
export function assertRmJ008KitUnchangedAfterCheckoutAuthority(input: {
  sealed: RmJ008KitPaymentSeal;
  attempted: RmJ008LiveKitLockInput | RmJ008KitLiveTruth | null | undefined;
}):
  | { ok: true }
  | {
      ok: false;
      code:
        | "POST_CHECKOUT_KIT_MUTATION"
        | "POST_PAYMENT_PLATFORM_MUTATION"
        | "POST_PAYMENT_MEMBER_SWAP";
      message: string;
    } {
  const normalized = normalizeRmJ008KitForPayment(input.attempted);
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
  const sealedIds = input.sealed.memberIds.join(",");
  const nextIds = normalized.truth.plannedKitMembers
    .map((m) => m.memberId)
    .join(",");
  if (sealedIds !== nextIds) {
    return {
      ok: false,
      code: "POST_PAYMENT_MEMBER_SWAP",
      message:
        "POST_PAYMENT_MEMBER_SWAP: Update Kit membership cannot silently change after payment",
    };
  }
  const nextFp = fingerprintRmJ008KitLiveTruth(normalized.truth);
  if (nextFp !== input.sealed.kitFingerprint) {
    return {
      ok: false,
      code: "POST_CHECKOUT_KIT_MUTATION",
      message:
        "POST_CHECKOUT_KIT_MUTATION: platform, membership, before-state, or after intent cannot change after checkout authority without a new authorized scope/payment decision",
    };
  }
  return { ok: true };
}

export function assertRmJ008PlanKitFresh(input: {
  displayedFingerprint: string | null | undefined;
  liveKitLock: RmJ008LiveKitLockInput | RmJ008KitLiveTruth | null | undefined;
}):
  | { ok: true; fingerprint: string }
  | { ok: false; code: "STALE_PLAN_KIT_LOCK"; message: string } {
  const normalized = normalizeRmJ008KitForPayment(input.liveKitLock);
  if (!normalized.ok) {
    return {
      ok: false,
      code: "STALE_PLAN_KIT_LOCK",
      message: `STALE_PLAN_KIT_LOCK: live kit lock invalid (${normalized.message})`,
    };
  }
  const liveFp = fingerprintRmJ008KitLiveTruth(normalized.truth);
  if (input.displayedFingerprint && input.displayedFingerprint !== liveFp) {
    return {
      ok: false,
      code: "STALE_PLAN_KIT_LOCK",
      message:
        "STALE_PLAN_KIT_LOCK: Studio Plan display does not match the current locked Update Kit — refresh plan truth before payment",
    };
  }
  return { ok: true, fingerprint: liveFp };
}
