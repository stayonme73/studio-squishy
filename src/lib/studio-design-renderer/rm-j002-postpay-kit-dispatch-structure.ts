/**
 * STUDIO-OPERATING-DESIGN-RM-J002-POSTPAY-KIT-DISPATCH-STRUCTURE-1
 *
 * Paid kit seal (paymentTruth.rmj002KitSeal) → durable kit members →
 * platform-locked production structure ready for later dispatch wiring.
 *
 * Does NOT: remap rm-j002 · invoke kit composer / renderer · change Stripe ·
 * rebuild Payment Truth · authorize the dispatch hook · silently change platform
 * or membership.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { recipeForPlatform } from "./rm-j002-contracts";
import {
  fingerprintRmJ002KitLiveTruth,
  type RmJ002KitPaymentSeal,
  RM_J002_KIT_PAYMENT_GATE_PACKAGE_ID,
} from "./rm-j002-kit-payment-gate";
import { RM_J002_INTAKE_PAYMENT_LOCK_PACKAGE_ID } from "./rm-j002-intake-truth";
import {
  DESIGN_RENDERER_RM_J002_SKU,
  RM_J002_AVATAR_PLATE,
  RM_J002_FACEBOOK_COVER_PLATE,
  type RmJ002MemberKind,
  type RmJ002Platform,
} from "./rm-j002-types";

export const RM_J002_POSTPAY_KIT_DISPATCH_STRUCTURE_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-RM-J002-POSTPAY-KIT-DISPATCH-STRUCTURE-1" as const;

export type RmJ002PostPayProductionRole =
  | "copy"
  | "field_map"
  | "avatar"
  | "page_cover";

export type RmJ002PostPayDispatchMember = {
  memberId: string;
  order: number;
  kind: RmJ002MemberKind;
  memberPurpose: string;
  productionRole: RmJ002PostPayProductionRole;
  /** Required when productionRole is avatar or page_cover. */
  agreedPlateId: string | null;
  plateRequired: boolean;
  /** Kit path — customer applies; Studio does not mutate accounts. */
  customerApplies: true;
  accountMutation: false;
};

/**
 * Authoritative post-pay production structure for rm-j002.
 * Sole upstream authority: paymentTruth.rmj002KitSeal.
 */
export type RmJ002PostPayDispatchStructure = {
  packageId: typeof RM_J002_POSTPAY_KIT_DISPATCH_STRUCTURE_PACKAGE_ID;
  status: "paid_kit_dispatch_structure_ready";
  skuId: typeof DESIGN_RENDERER_RM_J002_SKU;
  /** Fingerprint of the paid seal — links structure to purchased kit. */
  kitFingerprint: string;
  platform: RmJ002Platform;
  lockedKitMemberCount: 3 | 4;
  countUnit: "kit_member_identities";
  completenessAuthority: "platform_locked_kit_membership";
  businessName: string;
  displayName: string;
  profileGoal: string;
  currentProfileNotes: string;
  website?: string;
  phone?: string;
  brandNotes: string;
  members: readonly RmJ002PostPayDispatchMember[];
  credentialsPresent: false;
  mutationRequested: false;
  customerApplies: true;
  accountMutation: false;
  ownerRoutine: "NONE";
  paymentSealPackageId:
    | typeof RM_J002_KIT_PAYMENT_GATE_PACKAGE_ID
    | typeof RM_J002_INTAKE_PAYMENT_LOCK_PACKAGE_ID;
  sealedAt: string;
  builtAt: string;
  remapAuthorized: false;
  rendererInvoked: false;
  composerInvoked: false;
  dispatchHookAuthorized: false;
  note: string;
};

export type RmJ002PostPayStructureFailureCode =
  | "MISSING_PAYMENT_SEAL"
  | "INVALID_PAYMENT_SEAL"
  | "FINGERPRINT_MISMATCH"
  | "PLATFORM_MISMATCH"
  | "MEMBER_COUNT_MISMATCH"
  | "MEMBER_IDENTITY_MISMATCH"
  | "MEMBER_KIND_MISMATCH"
  | "MEMBER_ORDER_MISMATCH"
  | "MEMBER_DROPPED"
  | "MEMBER_SWAPPED"
  | "COPY_MEMBER_MISSING"
  | "CHECKLIST_MEMBER_MISSING"
  | "AVATAR_MISSING"
  | "FACEBOOK_COVER_MISSING"
  | "COVER_FORBIDDEN"
  | "PLATE_TAMPER"
  | "MISSING_PLATE"
  | "CREDENTIALS_FORBIDDEN"
  | "MUTATION_FORBIDDEN"
  | "POST_PAYMENT_PLATFORM_MUTATION"
  | "STRUCTURE_TAMPERED"
  | "DUPLICATE_MEMBER_ID"
  | "RM_J002_NOT_PAID";

export type RmJ002PostPayStructureBuildResult =
  | { ok: true; structure: RmJ002PostPayDispatchStructure; rendererInvoked: false }
  | {
      ok: false;
      code: RmJ002PostPayStructureFailureCode;
      message: string;
      rendererInvoked: false;
    };

function fail(
  code: RmJ002PostPayStructureFailureCode,
  message: string,
): RmJ002PostPayStructureBuildResult {
  return { ok: false, code, message, rendererInvoked: false };
}

function productionRoleFor(
  memberId: string,
  kind: RmJ002MemberKind,
): RmJ002PostPayProductionRole | null {
  if (kind === "copy" || memberId === "bio_about_copy" || memberId === "bio_profile_copy") {
    return "copy";
  }
  if (kind === "field_map_package" || memberId === "field_map_checklist") {
    return "field_map";
  }
  if (kind === "design_avatar" || memberId === "profile_image") {
    return "avatar";
  }
  if (kind === "design_page_cover" || memberId === "page_cover") {
    return "page_cover";
  }
  return null;
}

function expectedPlateFor(
  role: RmJ002PostPayProductionRole,
  platform: RmJ002Platform,
): string | null {
  if (role === "avatar") return RM_J002_AVATAR_PLATE.plateId;
  if (role === "page_cover") {
    if (platform !== "facebook") return null;
    return RM_J002_FACEBOOK_COVER_PLATE.plateId;
  }
  return null;
}

function assertSealInternallyConsistent(
  seal: RmJ002KitPaymentSeal,
): RmJ002PostPayStructureBuildResult | { ok: true } {
  if (seal.skuId !== DESIGN_RENDERER_RM_J002_SKU) {
    return fail(
      "INVALID_PAYMENT_SEAL",
      `INVALID_PAYMENT_SEAL: skuId must be ${DESIGN_RENDERER_RM_J002_SKU}`,
    );
  }
  if (
    seal.packageId !== RM_J002_INTAKE_PAYMENT_LOCK_PACKAGE_ID ||
    !seal.truth ||
    !seal.manifestSeed
  ) {
    return fail(
      "INVALID_PAYMENT_SEAL",
      "INVALID_PAYMENT_SEAL: seal missing package identity, truth, or manifest seed",
    );
  }
  if (
    seal.credentialsPresent !== false ||
    seal.mutationRequested !== false ||
    seal.truth.credentialsPresent !== false ||
    seal.truth.mutationRequested !== false
  ) {
    return fail(
      "CREDENTIALS_FORBIDDEN",
      "CREDENTIALS_FORBIDDEN: paid kit seal must not carry credentials or mutation",
    );
  }
  if (seal.customerApplies !== true || seal.accountMutation !== false) {
    return fail(
      "MUTATION_FORBIDDEN",
      "MUTATION_FORBIDDEN: paid kit seal must remain customer-applies / no account mutation",
    );
  }

  const recipe = recipeForPlatform(seal.platform);
  const n = seal.lockedKitMemberCount;
  if (n !== recipe.lockedKitMemberCount || seal.truth.lockedKitMemberCount !== n) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      `MEMBER_COUNT_MISMATCH: platform ${seal.platform} requires ${recipe.lockedKitMemberCount} members`,
    );
  }
  if (
    seal.memberIds.length !== n ||
    seal.memberKinds.length !== n ||
    seal.memberOrder.length !== n ||
    seal.truth.plannedKitMembers.length !== n ||
    seal.manifestSeed.members.length !== n
  ) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: seal member lists do not match locked count",
    );
  }
  if (seal.manifestSeed.platform !== seal.platform || seal.truth.platform !== seal.platform) {
    return fail(
      "PLATFORM_MISMATCH",
      "PLATFORM_MISMATCH: seal platform does not match embedded truth/manifest",
    );
  }

  const liveFp = fingerprintRmJ002KitLiveTruth(seal.truth);
  if (liveFp !== seal.kitFingerprint) {
    return fail(
      "FINGERPRINT_MISMATCH",
      "FINGERPRINT_MISMATCH: payment seal fingerprint does not match embedded truth",
    );
  }

  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const expected = recipe.plannedKitMembers[i]!;
    const planned = seal.truth.plannedKitMembers[i]!;
    const seed = seal.manifestSeed.members[i]!;
    if (
      planned.memberId !== expected.memberId ||
      planned.memberId !== seal.memberIds[i] ||
      planned.memberId !== seed.memberId
    ) {
      return fail(
        "MEMBER_IDENTITY_MISMATCH",
        `MEMBER_IDENTITY_MISMATCH: member slot ${i + 1} identity drift in seal`,
      );
    }
    if (seen.has(planned.memberId)) {
      return fail("DUPLICATE_MEMBER_ID", `DUPLICATE_MEMBER_ID: ${planned.memberId}`);
    }
    seen.add(planned.memberId);
    if (
      planned.kind !== expected.kind ||
      planned.kind !== seal.memberKinds[i] ||
      planned.kind !== seed.kind
    ) {
      return fail(
        "MEMBER_KIND_MISMATCH",
        `MEMBER_KIND_MISMATCH: member ${planned.memberId} kind drift in seal`,
      );
    }
    if (
      planned.order !== expected.order ||
      planned.order !== seal.memberOrder[i] ||
      planned.order !== seed.order
    ) {
      return fail(
        "MEMBER_ORDER_MISMATCH",
        `MEMBER_ORDER_MISMATCH: member ${planned.memberId} order drift in seal`,
      );
    }
    const role = productionRoleFor(planned.memberId, planned.kind);
    if (!role) {
      return fail(
        "MEMBER_KIND_MISMATCH",
        `MEMBER_KIND_MISMATCH: unrecognized member ${planned.memberId}/${planned.kind}`,
      );
    }
    const expectedPlate = expectedPlateFor(role, seal.platform);
    if (expectedPlate) {
      const actual =
        (planned.agreedPlateId ?? "").trim() ||
        (seed.agreedPlateId ?? "").trim() ||
        (expected.agreedPlateId ?? "").trim();
      if (actual !== expectedPlate) {
        return fail(
          "PLATE_TAMPER",
          `PLATE_TAMPER: member ${planned.memberId} expected plate ${expectedPlate}`,
        );
      }
    }
  }

  if (!seen.has("field_map_checklist")) {
    return fail(
      "CHECKLIST_MEMBER_MISSING",
      "CHECKLIST_MEMBER_MISSING: field_map_checklist required",
    );
  }
  if (!seen.has("profile_image")) {
    return fail("AVATAR_MISSING", "AVATAR_MISSING: profile_image required");
  }
  const hasCopy =
    seen.has("bio_about_copy") || seen.has("bio_profile_copy");
  if (!hasCopy) {
    return fail("COPY_MEMBER_MISSING", "COPY_MEMBER_MISSING: bio/about copy required");
  }
  if (seal.platform === "facebook") {
    if (!seen.has("page_cover")) {
      return fail(
        "FACEBOOK_COVER_MISSING",
        "FACEBOOK_COVER_MISSING: Facebook kit requires page_cover",
      );
    }
  } else if (seen.has("page_cover")) {
    return fail(
      "COVER_FORBIDDEN",
      "COVER_FORBIDDEN: Instagram/TikTok kits must not include page_cover",
    );
  }

  return { ok: true };
}

/**
 * Sole builder: payment seal → durable dispatch-ready kit structure.
 * Never invents members. Never remaps. Never invokes composer/renderer.
 */
export function buildRmJ002PostPayDispatchStructureFromPaymentSeal(
  seal: RmJ002KitPaymentSeal | null | undefined,
  builtAt = new Date().toISOString(),
): RmJ002PostPayStructureBuildResult {
  if (!seal) {
    return fail(
      "MISSING_PAYMENT_SEAL",
      "MISSING_PAYMENT_SEAL: paymentTruth.rmj002KitSeal is required to build post-pay kit structure",
    );
  }

  const consistent = assertSealInternallyConsistent(seal);
  if (!consistent.ok) return consistent;

  const n = seal.lockedKitMemberCount;
  const members: RmJ002PostPayDispatchMember[] = [];

  for (let i = 0; i < n; i++) {
    const planned = seal.truth.plannedKitMembers[i]!;
    const seed = seal.manifestSeed.members[i]!;
    const role = productionRoleFor(planned.memberId, planned.kind)!;
    const expectedPlate = expectedPlateFor(role, seal.platform);
    const plate =
      (planned.agreedPlateId ?? "").trim() ||
      (seed.agreedPlateId ?? "").trim() ||
      expectedPlate ||
      null;

    members.push({
      memberId: planned.memberId,
      order: planned.order,
      kind: planned.kind,
      memberPurpose: planned.memberPurpose,
      productionRole: role,
      agreedPlateId: expectedPlate ? plate : null,
      plateRequired: expectedPlate != null,
      customerApplies: true,
      accountMutation: false,
    });
  }

  const structure: RmJ002PostPayDispatchStructure = {
    packageId: RM_J002_POSTPAY_KIT_DISPATCH_STRUCTURE_PACKAGE_ID,
    status: "paid_kit_dispatch_structure_ready",
    skuId: DESIGN_RENDERER_RM_J002_SKU,
    kitFingerprint: seal.kitFingerprint,
    platform: seal.platform,
    lockedKitMemberCount: n,
    countUnit: "kit_member_identities",
    completenessAuthority: "platform_locked_kit_membership",
    businessName: seal.truth.businessName,
    displayName: seal.truth.displayName,
    profileGoal: seal.truth.profileGoal,
    currentProfileNotes: seal.truth.currentProfileNotes,
    ...(seal.truth.website ? { website: seal.truth.website } : {}),
    ...(seal.truth.phone ? { phone: seal.truth.phone } : {}),
    brandNotes: seal.truth.brandNotes,
    members,
    credentialsPresent: false,
    mutationRequested: false,
    customerApplies: true,
    accountMutation: false,
    ownerRoutine: "NONE",
    paymentSealPackageId: seal.packageId,
    sealedAt: seal.sealedAt,
    builtAt,
    remapAuthorized: false,
    rendererInvoked: false,
    composerInvoked: false,
    dispatchHookAuthorized: false,
    note:
      "Post-pay structure mirrors the exact paid platform kit. Production must not change platform, drop/swap members, or invent covers. Customer applies the kit — Studio does not log in. Dispatch hook not authorized in this package.",
  };

  const ready = assertRmJ002PostPayStructureMatchesPaymentSeal(structure, seal);
  if (!ready.ok) return ready;

  return { ok: true, structure, rendererInvoked: false };
}

/**
 * Fail closed if structure drifts from the paid seal
 * (platform, count, IDs, kinds, order, plates, credentials).
 */
export function assertRmJ002PostPayStructureMatchesPaymentSeal(
  structure: RmJ002PostPayDispatchStructure,
  seal: RmJ002KitPaymentSeal,
): RmJ002PostPayStructureBuildResult {
  if (structure.kitFingerprint !== seal.kitFingerprint) {
    return fail(
      "FINGERPRINT_MISMATCH",
      "FINGERPRINT_MISMATCH: post-pay structure fingerprint does not match payment seal",
    );
  }
  if (structure.platform !== seal.platform) {
    return fail(
      "POST_PAYMENT_PLATFORM_MUTATION",
      "POST_PAYMENT_PLATFORM_MUTATION: post-pay structure platform does not match payment seal",
    );
  }
  if (structure.lockedKitMemberCount !== seal.lockedKitMemberCount) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: post-pay structure count does not match payment seal",
    );
  }
  if (structure.members.length !== seal.lockedKitMemberCount) {
    return fail(
      "MEMBER_DROPPED",
      "MEMBER_DROPPED: post-pay structure member list length does not match locked count",
    );
  }
  if (
    structure.credentialsPresent !== false ||
    structure.mutationRequested !== false ||
    structure.customerApplies !== true ||
    structure.accountMutation !== false
  ) {
    return fail(
      "CREDENTIALS_FORBIDDEN",
      "CREDENTIALS_FORBIDDEN: post-pay structure must preserve customer-applies / no-credentials boundary",
    );
  }

  const ids = new Set(structure.members.map((m) => m.memberId));
  if (!ids.has("field_map_checklist")) {
    return fail(
      "CHECKLIST_MEMBER_MISSING",
      "CHECKLIST_MEMBER_MISSING: field_map_checklist required",
    );
  }
  if (!ids.has("profile_image")) {
    return fail("AVATAR_MISSING", "AVATAR_MISSING: profile_image required");
  }
  if (!ids.has("bio_about_copy") && !ids.has("bio_profile_copy")) {
    return fail("COPY_MEMBER_MISSING", "COPY_MEMBER_MISSING: bio/about copy required");
  }
  if (structure.platform === "facebook") {
    if (!ids.has("page_cover")) {
      return fail(
        "FACEBOOK_COVER_MISSING",
        "FACEBOOK_COVER_MISSING: Facebook kit requires page_cover",
      );
    }
  } else if (ids.has("page_cover")) {
    return fail(
      "COVER_FORBIDDEN",
      "COVER_FORBIDDEN: Instagram/TikTok kits must not include page_cover",
    );
  }

  for (let i = 0; i < seal.lockedKitMemberCount; i++) {
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
    const expectedPlate = expectedPlateFor(m.productionRole, structure.platform);
    if (expectedPlate) {
      if (m.agreedPlateId !== expectedPlate) {
        return fail(
          "PLATE_TAMPER",
          `PLATE_TAMPER: member ${m.memberId} plate changed after payment`,
        );
      }
      if (!m.plateRequired) {
        return fail(
          "MISSING_PLATE",
          `MISSING_PLATE: member ${m.memberId} must require its plate`,
        );
      }
    } else if (m.agreedPlateId != null) {
      return fail(
        "PLATE_TAMPER",
        `PLATE_TAMPER: non-design member ${m.memberId} must not carry a plate`,
      );
    }
    if (m.customerApplies !== true || m.accountMutation !== false) {
      return fail(
        "MUTATION_FORBIDDEN",
        `MUTATION_FORBIDDEN: member ${m.memberId} must remain customer-applies`,
      );
    }
  }

  return { ok: true, structure, rendererInvoked: false };
}

/**
 * Structure is dispatch-ready as a data contract only.
 * Does not authorize or invoke the dispatch hook / composer / renderer.
 */
export function assertRmJ002PostPayStructureDispatchReady(
  structure: RmJ002PostPayDispatchStructure,
): RmJ002PostPayStructureBuildResult {
  if (structure.status !== "paid_kit_dispatch_structure_ready") {
    return fail(
      "INVALID_PAYMENT_SEAL",
      "INVALID_PAYMENT_SEAL: structure status is not paid_kit_dispatch_structure_ready",
    );
  }
  if (
    structure.remapAuthorized !== false ||
    structure.rendererInvoked !== false ||
    structure.composerInvoked !== false ||
    structure.dispatchHookAuthorized !== false
  ) {
    return fail(
      "STRUCTURE_TAMPERED",
      "STRUCTURE_TAMPERED: structure must remain remap/composer/renderer/dispatch unauthorized on the structure object itself",
    );
  }
  const recipe = recipeForPlatform(structure.platform);
  if (
    structure.members.length !== structure.lockedKitMemberCount ||
    structure.lockedKitMemberCount !== recipe.lockedKitMemberCount
  ) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: structure is not exact platform N/N",
    );
  }
  for (const m of structure.members) {
    if (!m.memberId.trim()) {
      return fail("MEMBER_IDENTITY_MISMATCH", "MEMBER_IDENTITY_MISMATCH: empty memberId");
    }
    if (m.plateRequired && !(m.agreedPlateId ?? "").trim()) {
      return fail(
        "MISSING_PLATE",
        `MISSING_PLATE: member ${m.memberId} lacks required plate`,
      );
    }
  }
  return { ok: true, structure, rendererInvoked: false };
}

/**
 * Fail closed if an attempted structure silently changes platform or members
 * relative to the paid seal.
 */
export function assertRmJ002PostPayStructureNoSilentKitMutation(input: {
  seal: RmJ002KitPaymentSeal;
  attempted: RmJ002PostPayDispatchStructure;
}): RmJ002PostPayStructureBuildResult {
  if (input.attempted.platform !== input.seal.platform) {
    return fail(
      "POST_PAYMENT_PLATFORM_MUTATION",
      "POST_PAYMENT_PLATFORM_MUTATION: platform cannot silently change after payment",
    );
  }
  const match = assertRmJ002PostPayStructureMatchesPaymentSeal(
    input.attempted,
    input.seal,
  );
  if (!match.ok) return match;
  return assertRmJ002PostPayStructureDispatchReady(input.attempted);
}

/**
 * Read seal from campaign paymentTruth and build durable structure.
 * Does not invent a kit when seal is absent.
 */
export function buildRmJ002PostPayDispatchStructureFromCampaign(
  campaign: CampaignRecord,
): RmJ002PostPayStructureBuildResult {
  const hasSku = campaign.paymentTruth?.selectedServiceIds?.includes(
    DESIGN_RENDERER_RM_J002_SKU,
  );
  const seal = campaign.paymentTruth?.rmj002KitSeal;
  if (hasSku && !seal) {
    return fail(
      "MISSING_PAYMENT_SEAL",
      "MISSING_PAYMENT_SEAL: rm-j002 was paid/selected without kit seal",
    );
  }
  if (!seal) {
    return fail(
      "RM_J002_NOT_PAID",
      "RM_J002_NOT_PAID: no rm-j002 kit seal on paymentTruth",
    );
  }
  if (!campaign.paymentReceivedAt && campaign.paymentTruth?.status !== "confirmed") {
    return fail(
      "RM_J002_NOT_PAID",
      "RM_J002_NOT_PAID: payment not confirmed — post-pay structure requires paid seal",
    );
  }
  return buildRmJ002PostPayDispatchStructureFromPaymentSeal(seal);
}

/**
 * Attach durable structure onto campaign from paymentTruth seal.
 * Idempotent when fingerprint already matches. Never mutates paymentTruth.
 */
export function ensureRmJ002PostPayDispatchStructureOnCampaign(
  campaign: CampaignRecord,
):
  | {
      ok: true;
      campaign: CampaignRecord;
      structure: RmJ002PostPayDispatchStructure;
      alreadyPresent: boolean;
      rendererInvoked: false;
    }
  | {
      ok: false;
      campaign: CampaignRecord;
      code: RmJ002PostPayStructureFailureCode;
      message: string;
      rendererInvoked: false;
    } {
  const built = buildRmJ002PostPayDispatchStructureFromCampaign(campaign);
  if (!built.ok) {
    return {
      ok: false,
      campaign,
      code: built.code,
      message: built.message,
      rendererInvoked: false,
    };
  }

  const existing = campaign.rmJ002PostPayDispatchStructure;
  if (
    existing &&
    existing.kitFingerprint === built.structure.kitFingerprint &&
    existing.platform === built.structure.platform &&
    existing.lockedKitMemberCount === built.structure.lockedKitMemberCount &&
    existing.members.length === built.structure.members.length &&
    existing.members.every(
      (m, i) =>
        m.memberId === built.structure.members[i]!.memberId &&
        m.kind === built.structure.members[i]!.kind &&
        m.order === built.structure.members[i]!.order &&
        m.agreedPlateId === built.structure.members[i]!.agreedPlateId &&
        m.productionRole === built.structure.members[i]!.productionRole,
    )
  ) {
    const ready = assertRmJ002PostPayStructureDispatchReady(existing);
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
      rmJ002PostPayDispatchStructure: built.structure,
      updatedAt: new Date().toISOString(),
    },
    structure: built.structure,
    alreadyPresent: false,
    rendererInvoked: false,
  };
}
