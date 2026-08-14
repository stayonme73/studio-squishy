/**
 * STUDIO-OPERATING-DESIGN-MA-001-POSTPAY-COMPOSITION-DISPATCH-STRUCTURE-1
 *
 * Paid composition seal (paymentTruth) → durable pack members →
 * per-member producer family / plate / content requirements →
 * dispatch-ready pack structure.
 *
 * Does NOT: remap ma-001 · invoke renderer · change Stripe · rebuild Payment Truth ·
 * mutate sealed member producers · authorize the dispatch hook.
 */

import type { CampaignRecord } from "@/config/studio-board";
import {
  MA_001_MEMBER_CONTENT_INHERITANCE,
  type Ma001CustomerKindOption,
} from "./ma-001-intake-truth";
import {
  fingerprintMa001CompositionTruth,
  type Ma001CompositionPaymentSeal,
  MA_001_COMPOSITION_PAYMENT_GATE_PACKAGE_ID,
} from "./ma-001-composition-payment-gate";
import {
  isMa001SupportedKind,
  producerFamilyForKind,
} from "./ma-001-contracts";
import {
  DESIGN_RENDERER_MA_001_SKU,
  type Ma001LockedPackMemberCount,
  type Ma001SupportedKind,
} from "./ma-001-types";

export const MA_001_POSTPAY_COMPOSITION_DISPATCH_STRUCTURE_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-MA-001-POSTPAY-COMPOSITION-DISPATCH-STRUCTURE-1" as const;

export type Ma001PostPayDispatchMember = {
  memberId: string;
  order: number;
  kind: Ma001SupportedKind;
  customerKindLabel: Ma001CustomerKindOption | string;
  memberPurpose: string;
  /** Required plate/output identity for this member — survives post-pay unchanged. */
  agreedPlateId: string;
  /** Sealed producer family — Machine only; never customer UI. */
  producerFamily: string;
  contentInheritanceSource: string;
  contentRequirementSummary: string;
};

/**
 * Authoritative post-pay production structure for ma-001.
 * Sole upstream authority: paymentTruth.ma001CompositionSeal.
 */
export type Ma001PostPayDispatchStructure = {
  packageId: typeof MA_001_POSTPAY_COMPOSITION_DISPATCH_STRUCTURE_PACKAGE_ID;
  status: "paid_composition_dispatch_structure_ready";
  skuId: typeof DESIGN_RENDERER_MA_001_SKU;
  /** Fingerprint of the paid seal — links structure to purchased basket. */
  compositionFingerprint: string;
  lockedPackMemberCount: Ma001LockedPackMemberCount;
  countUnit: "member_identities";
  completenessAuthority: "exact_locked_member_nn";
  campaignFocus: string;
  members: readonly Ma001PostPayDispatchMember[];
  paymentSealPackageId: typeof MA_001_COMPOSITION_PAYMENT_GATE_PACKAGE_ID;
  sealedAt: string;
  builtAt: string;
  /** Explicit: this package does not remap. */
  remapAuthorized: false;
  /** Explicit: this package does not invoke the renderer. */
  rendererInvoked: false;
  /** Explicit: dispatch hook not authorized yet. */
  dispatchHookAuthorized: false;
  note: string;
};

export type Ma001PostPayStructureFailureCode =
  | "MISSING_PAYMENT_SEAL"
  | "INVALID_PAYMENT_SEAL"
  | "FINGERPRINT_MISMATCH"
  | "MEMBER_COUNT_MISMATCH"
  | "MEMBER_IDENTITY_MISMATCH"
  | "MEMBER_KIND_MISMATCH"
  | "MEMBER_ORDER_MISMATCH"
  | "MEMBER_DROPPED"
  | "MEMBER_SWAPPED"
  | "UNSUPPORTED_KIND"
  | "PRODUCER_FAMILY_MISMATCH"
  | "MISSING_PLATE"
  | "DUPLICATE_MEMBER_ID"
  | "STRUCTURE_TAMPERED"
  | "MA_001_NOT_PAID";

export type Ma001PostPayStructureBuildResult =
  | { ok: true; structure: Ma001PostPayDispatchStructure; rendererInvoked: false }
  | {
      ok: false;
      code: Ma001PostPayStructureFailureCode;
      message: string;
      rendererInvoked: false;
    };

function fail(
  code: Ma001PostPayStructureFailureCode,
  message: string,
): Ma001PostPayStructureBuildResult {
  return { ok: false, code, message, rendererInvoked: false };
}

function assertSealInternallyConsistent(
  seal: Ma001CompositionPaymentSeal,
): Ma001PostPayStructureBuildResult | { ok: true } {
  if (seal.skuId !== DESIGN_RENDERER_MA_001_SKU) {
    return fail(
      "INVALID_PAYMENT_SEAL",
      `INVALID_PAYMENT_SEAL: skuId must be ${DESIGN_RENDERER_MA_001_SKU}`,
    );
  }
  if (
    seal.packageId !== MA_001_COMPOSITION_PAYMENT_GATE_PACKAGE_ID ||
    !seal.truth ||
    !seal.manifestSeed
  ) {
    return fail(
      "INVALID_PAYMENT_SEAL",
      "INVALID_PAYMENT_SEAL: seal missing package identity, truth, or manifest seed",
    );
  }

  const n = seal.lockedPackMemberCount;
  if (n < 1 || n > 4 || seal.truth.lockedPackMemberCount !== n) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: seal lockedPackMemberCount does not match truth",
    );
  }
  if (
    seal.memberIds.length !== n ||
    seal.memberKinds.length !== n ||
    seal.memberOrder.length !== n ||
    seal.truth.plannedPackMembers.length !== n ||
    seal.manifestSeed.members.length !== n
  ) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: seal member lists do not match locked count",
    );
  }

  const liveFp = fingerprintMa001CompositionTruth(seal.truth);
  if (liveFp !== seal.compositionFingerprint) {
    return fail(
      "FINGERPRINT_MISMATCH",
      "FINGERPRINT_MISMATCH: payment seal fingerprint does not match embedded truth",
    );
  }

  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const planned = seal.truth.plannedPackMembers[i]!;
    const seed = seal.manifestSeed.members[i]!;
    if (planned.memberId !== seal.memberIds[i] || planned.memberId !== seed.memberId) {
      return fail(
        "MEMBER_IDENTITY_MISMATCH",
        `MEMBER_IDENTITY_MISMATCH: member slot ${i + 1} identity drift in seal`,
      );
    }
    if (seen.has(planned.memberId)) {
      return fail(
        "DUPLICATE_MEMBER_ID",
        `DUPLICATE_MEMBER_ID: ${planned.memberId}`,
      );
    }
    seen.add(planned.memberId);
    if (planned.kind !== seal.memberKinds[i] || planned.kind !== seed.kind) {
      return fail(
        "MEMBER_KIND_MISMATCH",
        `MEMBER_KIND_MISMATCH: member ${planned.memberId} kind drift in seal`,
      );
    }
    if (planned.order !== seal.memberOrder[i] || planned.order !== seed.order) {
      return fail(
        "MEMBER_ORDER_MISMATCH",
        `MEMBER_ORDER_MISMATCH: member ${planned.memberId} order drift in seal`,
      );
    }
    if (!isMa001SupportedKind(planned.kind)) {
      return fail(
        "UNSUPPORTED_KIND",
        `UNSUPPORTED_KIND: ${planned.kind}`,
      );
    }
    const expectedFamily = producerFamilyForKind(planned.kind);
    if (
      planned.producerFamily !== expectedFamily ||
      seed.producerFamily !== expectedFamily
    ) {
      return fail(
        "PRODUCER_FAMILY_MISMATCH",
        `PRODUCER_FAMILY_MISMATCH: member ${planned.memberId} expected ${expectedFamily}`,
      );
    }
    const plate =
      (planned.agreedPlateId ?? "").trim() || (seed.agreedPlateId ?? "").trim();
    if (!plate) {
      return fail(
        "MISSING_PLATE",
        `MISSING_PLATE: member ${planned.memberId} has no agreedPlateId`,
      );
    }
  }

  return { ok: true };
}

/**
 * Sole builder: payment seal → durable dispatch-ready pack structure.
 * Never invents members. Never remaps. Never invokes renderer.
 */
export function buildMa001PostPayDispatchStructureFromPaymentSeal(
  seal: Ma001CompositionPaymentSeal | null | undefined,
  builtAt = new Date().toISOString(),
): Ma001PostPayStructureBuildResult {
  if (!seal) {
    return fail(
      "MISSING_PAYMENT_SEAL",
      "MISSING_PAYMENT_SEAL: paymentTruth.ma001CompositionSeal is required to build post-pay pack structure",
    );
  }

  const consistent = assertSealInternallyConsistent(seal);
  if (!consistent.ok) return consistent;

  const n = seal.lockedPackMemberCount;
  const members: Ma001PostPayDispatchMember[] = [];

  for (let i = 0; i < n; i++) {
    const planned = seal.truth.plannedPackMembers[i]!;
    const seed = seal.manifestSeed.members[i]!;
    const kind = planned.kind as Ma001SupportedKind;
    const inheritance = MA_001_MEMBER_CONTENT_INHERITANCE[kind];
    const plate =
      (planned.agreedPlateId ?? "").trim() || seed.agreedPlateId.trim();

    members.push({
      memberId: planned.memberId,
      order: planned.order,
      kind,
      customerKindLabel:
        seal.customerKindLabels[i] ?? seed.customerKindLabel,
      memberPurpose: planned.memberPurpose,
      agreedPlateId: plate,
      producerFamily: producerFamilyForKind(kind),
      contentInheritanceSource: inheritance.source,
      contentRequirementSummary: inheritance.customerFacingSummary,
    });
  }

  const structure: Ma001PostPayDispatchStructure = {
    packageId: MA_001_POSTPAY_COMPOSITION_DISPATCH_STRUCTURE_PACKAGE_ID,
    status: "paid_composition_dispatch_structure_ready",
    skuId: DESIGN_RENDERER_MA_001_SKU,
    compositionFingerprint: seal.compositionFingerprint,
    lockedPackMemberCount: n,
    countUnit: "member_identities",
    completenessAuthority: "exact_locked_member_nn",
    campaignFocus: seal.campaignFocus,
    members,
    paymentSealPackageId: MA_001_COMPOSITION_PAYMENT_GATE_PACKAGE_ID,
    sealedAt: seal.sealedAt,
    builtAt,
    remapAuthorized: false,
    rendererInvoked: false,
    dispatchHookAuthorized: false,
    note:
      "Post-pay structure mirrors the exact paid basket. Production must not swap, drop, or reorder members without a new authorized scope/payment decision. Dispatch hook not authorized in this package.",
  };

  const ready = assertMa001PostPayStructureMatchesPaymentSeal(structure, seal);
  if (!ready.ok) return ready;

  return { ok: true, structure, rendererInvoked: false };
}

/**
 * Fail closed if structure drifts from the paid seal
 * (count, IDs, kinds, order, plate, producer family).
 */
export function assertMa001PostPayStructureMatchesPaymentSeal(
  structure: Ma001PostPayDispatchStructure,
  seal: Ma001CompositionPaymentSeal,
): Ma001PostPayStructureBuildResult {
  if (structure.compositionFingerprint !== seal.compositionFingerprint) {
    return fail(
      "FINGERPRINT_MISMATCH",
      "FINGERPRINT_MISMATCH: post-pay structure fingerprint does not match payment seal",
    );
  }
  if (structure.lockedPackMemberCount !== seal.lockedPackMemberCount) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: post-pay structure count does not match payment seal",
    );
  }
  if (structure.members.length !== seal.lockedPackMemberCount) {
    return fail(
      "MEMBER_DROPPED",
      "MEMBER_DROPPED: post-pay structure member list length does not match locked count",
    );
  }

  for (let i = 0; i < seal.lockedPackMemberCount; i++) {
    const m = structure.members[i]!;
    if (m.memberId !== seal.memberIds[i]) {
      return fail(
        "MEMBER_SWAPPED",
        `MEMBER_SWAPPED: slot ${i + 1} memberId ${m.memberId} !== sealed ${seal.memberIds[i]}`,
      );
    }
    if (m.kind !== seal.memberKinds[i]) {
      return fail(
        "MEMBER_KIND_MISMATCH",
        `MEMBER_KIND_MISMATCH: member ${m.memberId} kind changed after payment`,
      );
    }
    if (m.order !== seal.memberOrder[i]) {
      return fail(
        "MEMBER_ORDER_MISMATCH",
        `MEMBER_ORDER_MISMATCH: member ${m.memberId} order changed after payment`,
      );
    }
    const sealedPlate =
      seal.truth.plannedPackMembers[i]?.agreedPlateId?.trim() ||
      seal.manifestSeed.members[i]?.agreedPlateId?.trim() ||
      "";
    if (m.agreedPlateId !== sealedPlate) {
      return fail(
        "STRUCTURE_TAMPERED",
        `STRUCTURE_TAMPERED: member ${m.memberId} plate/output truth changed after payment`,
      );
    }
    if (!isMa001SupportedKind(m.kind)) {
      return fail("UNSUPPORTED_KIND", `UNSUPPORTED_KIND: ${m.kind}`);
    }
    if (m.producerFamily !== producerFamilyForKind(m.kind)) {
      return fail(
        "PRODUCER_FAMILY_MISMATCH",
        `PRODUCER_FAMILY_MISMATCH: member ${m.memberId}`,
      );
    }
  }

  return { ok: true, structure, rendererInvoked: false };
}

/**
 * Structure is dispatch-ready as a data contract only.
 * Does not authorize or invoke the dispatch hook / renderer.
 */
export function assertMa001PostPayStructureDispatchReady(
  structure: Ma001PostPayDispatchStructure,
): Ma001PostPayStructureBuildResult {
  if (structure.status !== "paid_composition_dispatch_structure_ready") {
    return fail(
      "INVALID_PAYMENT_SEAL",
      "INVALID_PAYMENT_SEAL: structure status is not paid_composition_dispatch_structure_ready",
    );
  }
  if (structure.remapAuthorized !== false || structure.rendererInvoked !== false) {
    return fail(
      "STRUCTURE_TAMPERED",
      "STRUCTURE_TAMPERED: structure must remain remapAuthorized=false and rendererInvoked=false on the structure object itself",
    );
  }
  // dispatchHookAuthorized stays false on the structure record (structure package
  // does not invoke). The separate DISPATCH-HOOK-1 package authorizes invoke.
  if (
    structure.members.length !== structure.lockedPackMemberCount ||
    structure.lockedPackMemberCount < 1 ||
    structure.lockedPackMemberCount > 4
  ) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: structure is not exact N/N",
    );
  }
  for (const m of structure.members) {
    if (!m.memberId.trim() || !m.agreedPlateId.trim() || !m.producerFamily.trim()) {
      return fail(
        "MISSING_PLATE",
        `MISSING_PLATE: member ${m.memberId || "(empty)"} lacks required production identity`,
      );
    }
  }
  return { ok: true, structure, rendererInvoked: false };
}

/**
 * Fail closed if an attempted structure silently drops or swaps members
 * relative to the paid seal.
 */
export function assertMa001PostPayStructureNoSilentMemberMutation(input: {
  seal: Ma001CompositionPaymentSeal;
  attempted: Ma001PostPayDispatchStructure;
}): Ma001PostPayStructureBuildResult {
  const match = assertMa001PostPayStructureMatchesPaymentSeal(
    input.attempted,
    input.seal,
  );
  if (!match.ok) return match;
  return assertMa001PostPayStructureDispatchReady(input.attempted);
}

/**
 * Read seal from campaign paymentTruth and build durable structure.
 * Does not invent composition when seal is absent.
 */
export function buildMa001PostPayDispatchStructureFromCampaign(
  campaign: CampaignRecord,
): Ma001PostPayStructureBuildResult {
  const hasMa001 = campaign.paymentTruth?.selectedServiceIds?.includes(
    DESIGN_RENDERER_MA_001_SKU,
  );
  const seal = campaign.paymentTruth?.ma001CompositionSeal;
  if (hasMa001 && !seal) {
    return fail(
      "MISSING_PAYMENT_SEAL",
      "MISSING_PAYMENT_SEAL: ma-001 was paid/selected without composition seal",
    );
  }
  if (!seal) {
    return fail(
      "MA_001_NOT_PAID",
      "MA_001_NOT_PAID: no ma-001 composition seal on paymentTruth",
    );
  }
  if (!campaign.paymentReceivedAt && campaign.paymentTruth?.status !== "confirmed") {
    return fail(
      "MA_001_NOT_PAID",
      "MA_001_NOT_PAID: payment not confirmed — post-pay structure requires paid seal",
    );
  }
  return buildMa001PostPayDispatchStructureFromPaymentSeal(seal);
}

/**
 * Attach durable structure onto campaign from paymentTruth seal.
 * Idempotent when fingerprint already matches. Never mutates paymentTruth.
 */
export function ensureMa001PostPayDispatchStructureOnCampaign(
  campaign: CampaignRecord,
):
  | { ok: true; campaign: CampaignRecord; structure: Ma001PostPayDispatchStructure; alreadyPresent: boolean; rendererInvoked: false }
  | {
      ok: false;
      campaign: CampaignRecord;
      code: Ma001PostPayStructureFailureCode;
      message: string;
      rendererInvoked: false;
    } {
  const built = buildMa001PostPayDispatchStructureFromCampaign(campaign);
  if (!built.ok) {
    return {
      ok: false,
      campaign,
      code: built.code,
      message: built.message,
      rendererInvoked: false,
    };
  }

  const existing = campaign.ma001PostPayDispatchStructure;
  if (
    existing &&
    existing.compositionFingerprint === built.structure.compositionFingerprint &&
    existing.lockedPackMemberCount === built.structure.lockedPackMemberCount &&
    existing.members.length === built.structure.members.length &&
    existing.members.every(
      (m, i) =>
        m.memberId === built.structure.members[i]!.memberId &&
        m.kind === built.structure.members[i]!.kind &&
        m.order === built.structure.members[i]!.order &&
        m.agreedPlateId === built.structure.members[i]!.agreedPlateId &&
        m.producerFamily === built.structure.members[i]!.producerFamily,
    )
  ) {
    const ready = assertMa001PostPayStructureDispatchReady(existing);
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
      ma001PostPayDispatchStructure: built.structure,
      updatedAt: new Date().toISOString(),
    },
    structure: built.structure,
    alreadyPresent: false,
    rendererInvoked: false,
  };
}
