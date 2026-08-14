/**
 * STUDIO-OPERATING-DESIGN-MA-001-COMPOSITION-PAYMENT-GATE-1
 *
 * Studio Plan / Checkout consume authoritative ma001PackComposition.
 * Payment cannot proceed for ma-001 without a locked composition.
 * No remap · no dispatch · no renderer invoke.
 */

import { createHash } from "crypto";

import {
  assertMa001CompositionReadyForPayment,
  buildMa001PackManifestSeed,
  mapMa001CompositionFromLiveTruth,
  type Ma001CompositionLiveTruth,
  type Ma001LiveCompositionInput,
  type Ma001PackManifestSeed,
  type Ma001PaymentReadinessResult,
} from "./ma-001-intake-truth";
import { DESIGN_RENDERER_MA_001_SKU } from "./ma-001-types";

export const MA_001_COMPOSITION_PAYMENT_GATE_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-MA-001-COMPOSITION-PAYMENT-GATE-1" as const;

/** Compact seal stored on checkout binding + paymentTruth. */
export type Ma001CompositionPaymentSeal = {
  packageId: typeof MA_001_COMPOSITION_PAYMENT_GATE_PACKAGE_ID;
  skuId: typeof DESIGN_RENDERER_MA_001_SKU;
  compositionFingerprint: string;
  lockedPackMemberCount: Ma001CompositionLiveTruth["lockedPackMemberCount"];
  customerKindLabels: readonly string[];
  memberIds: readonly string[];
  memberKinds: readonly string[];
  memberOrder: readonly number[];
  campaignFocus: string;
  completenessAuthority: "exact_locked_member_nn";
  countUnit: "member_identities";
  /** Full authoritative truth mirrored for Machine post-pay proof. */
  truth: Ma001CompositionLiveTruth;
  manifestSeed: Ma001PackManifestSeed;
  sealedAt: string;
};

export function fingerprintMa001CompositionTruth(
  truth: Ma001CompositionLiveTruth,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        skuId: truth.skuId,
        lockedPackMemberCount: truth.lockedPackMemberCount,
        campaignFocus: truth.campaignFocus,
        completenessAuthority: truth.completenessAuthority,
        countUnit: truth.countUnit,
        members: truth.plannedPackMembers.map((m) => ({
          memberId: m.memberId,
          kind: m.kind,
          order: m.order,
          memberPurpose: m.memberPurpose,
          agreedPlateId: m.agreedPlateId ?? null,
          producerFamily: m.producerFamily,
        })),
        customerKindLabels: truth.customerKindLabels,
      }),
    )
    .digest("hex");
}

function assertNoDuplicateMemberIds(
  truth: Ma001CompositionLiveTruth,
): { ok: true } | { ok: false; message: string } {
  const seen = new Set<string>();
  for (const m of truth.plannedPackMembers) {
    if (seen.has(m.memberId)) {
      return {
        ok: false,
        message: `DUPLICATE_MEMBER_ID: ${m.memberId}`,
      };
    }
    seen.add(m.memberId);
  }
  if (seen.size !== truth.lockedPackMemberCount) {
    return {
      ok: false,
      message: "MISSING_MEMBER: member identity set does not match locked count",
    };
  }
  return { ok: true };
}

/**
 * Normalize any client/live composition into authoritative truth.
 * Never invents a default pack. Re-maps live input; re-validates sealed truth.
 */
export function normalizeMa001CompositionForPayment(
  composition: Ma001LiveCompositionInput | Ma001CompositionLiveTruth | null | undefined,
):
  | { ok: true; truth: Ma001CompositionLiveTruth; manifestSeed: Ma001PackManifestSeed }
  | { ok: false; code: string; message: string } {
  if (!composition) {
    return {
      ok: false,
      code: "MISSING_COMPOSITION",
      message: "MISSING_COMPOSITION: no Promotion Pack composition provided",
    };
  }

  if (
    typeof composition === "object" &&
    "plannedPackMembers" in composition &&
    "lockedBeforePayment" in composition
  ) {
    const truth = composition as Ma001CompositionLiveTruth;
    if (truth.skuId !== DESIGN_RENDERER_MA_001_SKU || !truth.lockedBeforePayment) {
      return {
        ok: false,
        code: "INVALID_COMPOSITION",
        message: "INVALID_COMPOSITION: composition seal is not valid for payment",
      };
    }
    if (truth.plannedPackMembers.length !== truth.lockedPackMemberCount) {
      return {
        ok: false,
        code: "MEMBER_COUNT_MISMATCH",
        message: "MEMBER_COUNT_MISMATCH: sealed member list length mismatch",
      };
    }
    const dup = assertNoDuplicateMemberIds(truth);
    if (!dup.ok) {
      return { ok: false, code: "INVALID_COMPOSITION", message: dup.message };
    }
    return {
      ok: true,
      truth,
      manifestSeed: buildMa001PackManifestSeed(truth),
    };
  }

  const mapped = mapMa001CompositionFromLiveTruth(
    composition as Ma001LiveCompositionInput,
  );
  if (!mapped.ok) {
    return { ok: false, code: mapped.code, message: mapped.message };
  }
  const dup = assertNoDuplicateMemberIds(mapped.truth);
  if (!dup.ok) {
    return { ok: false, code: "INVALID_COMPOSITION", message: dup.message };
  }
  return mapped;
}

export function sealMa001CompositionForPayment(
  truth: Ma001CompositionLiveTruth,
  sealedAt = new Date().toISOString(),
): Ma001CompositionPaymentSeal {
  const manifestSeed = buildMa001PackManifestSeed(truth);
  return {
    packageId: MA_001_COMPOSITION_PAYMENT_GATE_PACKAGE_ID,
    skuId: DESIGN_RENDERER_MA_001_SKU,
    compositionFingerprint: fingerprintMa001CompositionTruth(truth),
    lockedPackMemberCount: truth.lockedPackMemberCount,
    customerKindLabels: [...truth.customerKindLabels],
    memberIds: truth.plannedPackMembers.map((m) => m.memberId),
    memberKinds: truth.plannedPackMembers.map((m) => m.kind),
    memberOrder: truth.plannedPackMembers.map((m) => m.order),
    campaignFocus: truth.campaignFocus,
    completenessAuthority: "exact_locked_member_nn",
    countUnit: "member_identities",
    truth,
    manifestSeed,
    sealedAt,
  };
}

export function ma001CompositionSealsMatch(
  a: Ma001CompositionPaymentSeal | null | undefined,
  b: Ma001CompositionPaymentSeal | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.compositionFingerprint === b.compositionFingerprint;
}

/**
 * Plan + Checkout gate: reuse assertMa001CompositionReadyForPayment + identity checks.
 */
export function evaluateMa001CompositionPaymentGate(input: {
  selectedServiceIds: readonly string[];
  composition: Ma001LiveCompositionInput | Ma001CompositionLiveTruth | null | undefined;
}):
  | {
      ok: true;
      applicable: false;
      reason: "ma-001_not_selected";
    }
  | {
      ok: true;
      applicable: true;
      truth: Ma001CompositionLiveTruth;
      manifestSeed: Ma001PackManifestSeed;
      seal: Ma001CompositionPaymentSeal;
      customerFacingLines: readonly string[];
    }
  | {
      ok: false;
      applicable: true;
      blockCheckout: true;
      code: string;
      message: string;
    } {
  const readiness: Ma001PaymentReadinessResult =
    assertMa001CompositionReadyForPayment({
      selectedServiceIds: input.selectedServiceIds,
      composition: input.composition,
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

  const normalized = normalizeMa001CompositionForPayment(readiness.truth);
  if (!normalized.ok) {
    return {
      ok: false,
      applicable: true,
      blockCheckout: true,
      code: normalized.code,
      message: normalized.message,
    };
  }

  const seal = sealMa001CompositionForPayment(normalized.truth);
  return {
    ok: true,
    applicable: true,
    truth: normalized.truth,
    manifestSeed: normalized.manifestSeed,
    seal,
    customerFacingLines: customerFacingCompositionLines(normalized.truth),
  };
}

/** Plain-language lines for Studio Plan (no producer jargon). */
export function customerFacingCompositionLines(
  truth: Ma001CompositionLiveTruth,
): readonly string[] {
  return truth.plannedPackMembers.map((m, i) => {
    const label = truth.customerKindLabels[i] ?? String(m.kind);
    return `${label} — ${m.memberPurpose}`;
  });
}

/**
 * Fail closed if composition mutates after checkout authority sealed it.
 */
export function assertMa001CompositionUnchangedAfterCheckoutAuthority(input: {
  sealed: Ma001CompositionPaymentSeal;
  attempted: Ma001LiveCompositionInput | Ma001CompositionLiveTruth | null | undefined;
}): { ok: true } | { ok: false; code: "POST_CHECKOUT_COMPOSITION_MUTATION"; message: string } {
  const normalized = normalizeMa001CompositionForPayment(input.attempted);
  if (!normalized.ok) {
    return {
      ok: false,
      code: "POST_CHECKOUT_COMPOSITION_MUTATION",
      message: `POST_CHECKOUT_COMPOSITION_MUTATION: attempted composition is invalid (${normalized.message})`,
    };
  }
  const nextFp = fingerprintMa001CompositionTruth(normalized.truth);
  if (nextFp !== input.sealed.compositionFingerprint) {
    return {
      ok: false,
      code: "POST_CHECKOUT_COMPOSITION_MUTATION",
      message:
        "POST_CHECKOUT_COMPOSITION_MUTATION: member count, kinds, order, or identities cannot change after checkout authority without a new authorized scope/payment decision",
    };
  }
  return { ok: true };
}

/**
 * Stale Studio Plan display vs live draft composition.
 */
export function assertMa001PlanCompositionFresh(input: {
  displayedFingerprint: string | null | undefined;
  liveComposition: Ma001LiveCompositionInput | Ma001CompositionLiveTruth | null | undefined;
}): { ok: true; fingerprint: string } | { ok: false; code: "STALE_PLAN_COMPOSITION"; message: string } {
  const normalized = normalizeMa001CompositionForPayment(input.liveComposition);
  if (!normalized.ok) {
    return {
      ok: false,
      code: "STALE_PLAN_COMPOSITION",
      message: `STALE_PLAN_COMPOSITION: live composition invalid (${normalized.message})`,
    };
  }
  const liveFp = fingerprintMa001CompositionTruth(normalized.truth);
  if (input.displayedFingerprint && input.displayedFingerprint !== liveFp) {
    return {
      ok: false,
      code: "STALE_PLAN_COMPOSITION",
      message:
        "STALE_PLAN_COMPOSITION: Studio Plan display does not match the current locked composition — refresh plan truth before payment",
    };
  }
  return { ok: true, fingerprint: liveFp };
}
