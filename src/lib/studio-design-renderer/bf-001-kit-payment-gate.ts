/**
 * STUDIO-OPERATING-DESIGN-BF-001-INTAKE-PAYMENT-LOCK-1 (payment gate half)
 *
 * Studio Plan / Checkout consume the authoritative bf001PackageLock.
 * Payment cannot proceed for bf-001 without a locked graphic kind (profile XOR
 * cover), the existing business name, and the customer-supplied visual starting
 * point (notes + supplied logo material note).
 * No remap · no dispatch · no composer invoke.
 */

import { createHash } from "crypto";

import {
  assertBf001PackageReadyForPayment,
  buildBf001PackageManifestSeed,
  customerFacingBf001PackageLines,
  mapBf001PackageLockFromLiveTruth,
  type Bf001LivePackageLockInput,
  type Bf001PackageLiveTruth,
  type Bf001PackageManifestSeed,
  type Bf001PackageStartingPointIdentity,
  type Bf001PaymentReadinessResult,
  BF_001_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
} from "./bf-001-intake-truth";
import { recipeForGraphicKind } from "./bf-001-contracts";
import { DESIGN_RENDERER_BF_001_SKU } from "./bf-001-types";

export const BF_001_PACKAGE_PAYMENT_GATE_PACKAGE_ID =
  BF_001_INTAKE_PAYMENT_LOCK_PACKAGE_ID;

/** Compact seal stored on checkout binding + paymentTruth. */
export type Bf001PackagePaymentSeal = {
  packageId: typeof BF_001_INTAKE_PAYMENT_LOCK_PACKAGE_ID;
  skuId: typeof DESIGN_RENDERER_BF_001_SKU;
  packageFingerprint: string;
  businessName: string;
  graphicKind: Bf001PackageLiveTruth["graphicKind"];
  lockedPackageMemberCount: 2;
  memberIds: readonly string[];
  memberKinds: readonly string[];
  memberOrder: readonly number[];
  memberPlateIds: readonly string[];
  packageScope: "brand_refresh_two_member_package";
  startingPointSource: "customer_supplied";
  startingPointIdentity: Bf001PackageStartingPointIdentity;
  completenessAuthority: "graphic_kind_locked_two_member_package_membership";
  countUnit: "member_identities";
  newLogoRequested: false;
  namingRequested: false;
  messagingRequested: false;
  fontSectionMode: "recommendations_only";
  logoUsageMode: "usage_guidance_only";
  graphicFontPolicy: "studio_safe_only";
  ownerRoutine: "NONE";
  truth: Bf001PackageLiveTruth;
  manifestSeed: Bf001PackageManifestSeed;
  sealedAt: string;
};

/**
 * Fingerprint the purchased refresh identity: graphic kind + exact members +
 * starting-point identity (notes + supplied logo note + likes/dislikes + facts).
 */
export function fingerprintBf001PackageLiveTruth(
  truth: Bf001PackageLiveTruth,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        skuId: truth.skuId,
        businessName: truth.businessName,
        graphicKind: truth.graphicKind,
        lockedPackageMemberCount: truth.lockedPackageMemberCount,
        packageScope: truth.packageScope,
        startingPointSource: truth.startingPointSource,
        startingPoint: {
          visualStartingPointNotes:
            truth.startingPoint.visualStartingPointNotes,
          logoMaterialNote: truth.startingPoint.logoMaterialNote,
          likesDislikes: truth.startingPoint.likesDislikes,
          businessFacts: truth.startingPoint.businessFacts,
        },
        newLogoRequested: truth.newLogoRequested,
        namingRequested: truth.namingRequested,
        messagingRequested: truth.messagingRequested,
        fontSectionMode: truth.fontSectionMode,
        logoUsageMode: truth.logoUsageMode,
        graphicFontPolicy: truth.graphicFontPolicy,
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

/**
 * Normalize any client/live package lock into authoritative truth.
 * Never invents a default graphic kind or starting point.
 */
export function normalizeBf001PackageForPayment(
  packageLock:
    | Bf001LivePackageLockInput
    | Bf001PackageLiveTruth
    | null
    | undefined,
):
  | {
      ok: true;
      truth: Bf001PackageLiveTruth;
      manifestSeed: Bf001PackageManifestSeed;
    }
  | { ok: false; code: string; message: string } {
  if (!packageLock) {
    return {
      ok: false,
      code: "MISSING_PACKAGE_LOCK",
      message:
        "MISSING_PACKAGE_LOCK: no Brand Identity Refresh package lock provided",
    };
  }

  if (
    typeof packageLock === "object" &&
    "plannedMembers" in packageLock &&
    "lockedBeforePayment" in packageLock
  ) {
    const truth = packageLock as Bf001PackageLiveTruth;
    if (
      truth.skuId !== DESIGN_RENDERER_BF_001_SKU ||
      !truth.lockedBeforePayment ||
      truth.newLogoRequested !== false ||
      truth.namingRequested !== false ||
      truth.messagingRequested !== false ||
      truth.startingPointSource !== "customer_supplied" ||
      truth.packageScope !== "brand_refresh_two_member_package" ||
      truth.fontSectionMode !== "recommendations_only" ||
      truth.logoUsageMode !== "usage_guidance_only" ||
      truth.graphicFontPolicy !== "studio_safe_only"
    ) {
      return {
        ok: false,
        code: "INVALID_PACKAGE_LOCK",
        message:
          "INVALID_PACKAGE_LOCK: refresh package seal is not valid for payment",
      };
    }
    if (truth.graphicKind !== "profile" && truth.graphicKind !== "cover") {
      return {
        ok: false,
        code: "NO_GRAPHIC_SELECTED",
        message:
          "NO_GRAPHIC_SELECTED: graphic kind must be locked as profile XOR cover",
      };
    }
    const graphicMembers = truth.plannedMembers.filter(
      (m) => m.memberId === "profile_or_cover_graphic",
    );
    const kinds = new Set(graphicMembers.map((m) => m.kind));
    if (
      graphicMembers.length > 1 ||
      (kinds.has("design_profile") && kinds.has("design_cover"))
    ) {
      return {
        ok: false,
        code: "PROFILE_AND_COVER",
        message:
          "PROFILE_AND_COVER: exactly one graphic member per refresh package",
      };
    }
    const recipe = recipeForGraphicKind(truth.graphicKind);
    if (
      truth.lockedPackageMemberCount !== 2 ||
      truth.plannedMembers.length !== 2
    ) {
      return {
        ok: false,
        code: "MEMBERSHIP_TAMPER",
        message: "MEMBERSHIP_TAMPER: sealed member list must be exactly 2",
      };
    }
    for (let i = 0; i < recipe.plannedMembers.length; i++) {
      const expected = recipe.plannedMembers[i]!;
      const actual = truth.plannedMembers[i]!;
      if (
        actual.memberId !== expected.memberId ||
        actual.kind !== expected.kind ||
        actual.order !== expected.order ||
        actual.agreedPlateId !== expected.agreedPlateId
      ) {
        return {
          ok: false,
          code: "MEMBERSHIP_TAMPER",
          message: `MEMBERSHIP_TAMPER: expected ${expected.memberId} at order ${expected.order} on plate ${expected.agreedPlateId}`,
        };
      }
    }
    if (
      !truth.plannedMembers.some((m) => m.memberId === "brand_direction_sheet")
    ) {
      return {
        ok: false,
        code: "MEMBERSHIP_TAMPER",
        message: "MEMBERSHIP_TAMPER: Brand Direction Sheet member is required",
      };
    }
    if (!truth.businessName?.trim()) {
      return {
        ok: false,
        code: "BUSINESS_NAME_MISSING",
        message:
          "BUSINESS_NAME_MISSING: sealed refresh package is missing the existing business name",
      };
    }
    if (
      !truth.startingPoint?.visualStartingPointNotes?.trim() ||
      !truth.startingPoint?.logoMaterialNote?.trim()
    ) {
      return {
        ok: false,
        code: "STARTING_POINT_INSUFFICIENT",
        message:
          "STARTING_POINT_INSUFFICIENT: sealed refresh package is missing the customer-supplied visual starting point",
      };
    }
    return {
      ok: true,
      truth,
      manifestSeed: buildBf001PackageManifestSeed(truth),
    };
  }

  const mapped = mapBf001PackageLockFromLiveTruth(
    packageLock as Bf001LivePackageLockInput,
  );
  if (!mapped.ok) {
    return { ok: false, code: mapped.code, message: mapped.message };
  }
  return mapped;
}

export function sealBf001PackageForPayment(
  truth: Bf001PackageLiveTruth,
  sealedAt = new Date().toISOString(),
): Bf001PackagePaymentSeal {
  const manifestSeed = buildBf001PackageManifestSeed(truth);
  return {
    packageId: BF_001_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
    skuId: DESIGN_RENDERER_BF_001_SKU,
    packageFingerprint: fingerprintBf001PackageLiveTruth(truth),
    businessName: truth.businessName,
    graphicKind: truth.graphicKind,
    lockedPackageMemberCount: 2,
    memberIds: truth.plannedMembers.map((m) => m.memberId),
    memberKinds: truth.plannedMembers.map((m) => m.kind),
    memberOrder: truth.plannedMembers.map((m) => m.order),
    memberPlateIds: truth.plannedMembers.map((m) => m.agreedPlateId),
    packageScope: "brand_refresh_two_member_package",
    startingPointSource: "customer_supplied",
    startingPointIdentity: { ...truth.startingPoint },
    completenessAuthority:
      "graphic_kind_locked_two_member_package_membership",
    countUnit: "member_identities",
    newLogoRequested: false,
    namingRequested: false,
    messagingRequested: false,
    fontSectionMode: "recommendations_only",
    logoUsageMode: "usage_guidance_only",
    graphicFontPolicy: "studio_safe_only",
    ownerRoutine: "NONE",
    truth,
    manifestSeed,
    sealedAt,
  };
}

export function bf001PackageSealsMatch(
  a: Bf001PackagePaymentSeal | null | undefined,
  b: Bf001PackagePaymentSeal | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.packageFingerprint === b.packageFingerprint;
}

export function evaluateBf001PackagePaymentGate(input: {
  selectedServiceIds: readonly string[];
  packageLock:
    | Bf001LivePackageLockInput
    | Bf001PackageLiveTruth
    | null
    | undefined;
}):
  | {
      ok: true;
      applicable: false;
      reason: "bf-001_not_selected";
    }
  | {
      ok: true;
      applicable: true;
      truth: Bf001PackageLiveTruth;
      manifestSeed: Bf001PackageManifestSeed;
      seal: Bf001PackagePaymentSeal;
      customerFacingLines: readonly string[];
    }
  | {
      ok: false;
      applicable: true;
      blockCheckout: true;
      code: string;
      message: string;
    } {
  const readiness: Bf001PaymentReadinessResult =
    assertBf001PackageReadyForPayment({
      selectedServiceIds: input.selectedServiceIds,
      packageLock: input.packageLock,
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

  const normalized = normalizeBf001PackageForPayment(readiness.truth);
  if (!normalized.ok) {
    return {
      ok: false,
      applicable: true,
      blockCheckout: true,
      code: normalized.code,
      message: normalized.message,
    };
  }

  const seal = sealBf001PackageForPayment(normalized.truth);
  return {
    ok: true,
    applicable: true,
    truth: normalized.truth,
    manifestSeed: normalized.manifestSeed,
    seal,
    customerFacingLines: customerFacingBf001PackageLines(normalized.truth),
  };
}

/**
 * Fail closed if graphic kind, membership, or starting point mutates after
 * checkout authority sealed the refresh package.
 */
export function assertBf001PackageUnchangedAfterCheckoutAuthority(input: {
  sealed: Bf001PackagePaymentSeal;
  attempted:
    | Bf001LivePackageLockInput
    | Bf001PackageLiveTruth
    | null
    | undefined;
}):
  | { ok: true }
  | {
      ok: false;
      code:
        | "POST_CHECKOUT_PACKAGE_MUTATION"
        | "POST_PAYMENT_GRAPHIC_KIND_MUTATION"
        | "POST_PAYMENT_MEMBER_SWAP";
      message: string;
    } {
  const normalized = normalizeBf001PackageForPayment(input.attempted);
  if (!normalized.ok) {
    return {
      ok: false,
      code: "POST_CHECKOUT_PACKAGE_MUTATION",
      message: `POST_CHECKOUT_PACKAGE_MUTATION: attempted package lock is invalid (${normalized.message})`,
    };
  }
  if (normalized.truth.graphicKind !== input.sealed.graphicKind) {
    return {
      ok: false,
      code: "POST_PAYMENT_GRAPHIC_KIND_MUTATION",
      message:
        "POST_PAYMENT_GRAPHIC_KIND_MUTATION: profile/cover choice cannot silently change after payment — requires a new authorized scope/payment decision",
    };
  }
  const sealedIds = input.sealed.memberIds.join(",");
  const nextIds = normalized.truth.plannedMembers
    .map((m) => m.memberId)
    .join(",");
  const sealedKinds = input.sealed.memberKinds.join(",");
  const nextKinds = normalized.truth.plannedMembers
    .map((m) => m.kind)
    .join(",");
  if (sealedIds !== nextIds || sealedKinds !== nextKinds) {
    return {
      ok: false,
      code: "POST_PAYMENT_MEMBER_SWAP",
      message:
        "POST_PAYMENT_MEMBER_SWAP: refresh package membership cannot silently change after payment",
    };
  }
  const nextFp = fingerprintBf001PackageLiveTruth(normalized.truth);
  if (nextFp !== input.sealed.packageFingerprint) {
    return {
      ok: false,
      code: "POST_CHECKOUT_PACKAGE_MUTATION",
      message:
        "POST_CHECKOUT_PACKAGE_MUTATION: graphic kind, membership, business name, or visual starting point cannot change after checkout authority without a new authorized scope/payment decision",
    };
  }
  return { ok: true };
}

export function assertBf001PlanPackageFresh(input: {
  displayedFingerprint: string | null | undefined;
  livePackageLock:
    | Bf001LivePackageLockInput
    | Bf001PackageLiveTruth
    | null
    | undefined;
}):
  | { ok: true; fingerprint: string }
  | { ok: false; code: "STALE_PLAN_PACKAGE_LOCK"; message: string } {
  const normalized = normalizeBf001PackageForPayment(input.livePackageLock);
  if (!normalized.ok) {
    return {
      ok: false,
      code: "STALE_PLAN_PACKAGE_LOCK",
      message: `STALE_PLAN_PACKAGE_LOCK: live package lock invalid (${normalized.message})`,
    };
  }
  const liveFp = fingerprintBf001PackageLiveTruth(normalized.truth);
  if (input.displayedFingerprint && input.displayedFingerprint !== liveFp) {
    return {
      ok: false,
      code: "STALE_PLAN_PACKAGE_LOCK",
      message:
        "STALE_PLAN_PACKAGE_LOCK: Studio Plan display does not match the current locked refresh package — refresh plan truth before payment",
    };
  }
  return { ok: true, fingerprint: liveFp };
}
