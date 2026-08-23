/**
 * STUDIO-OPERATING-DESIGN-RM-J008-POSTPAY-KIT-DISPATCH-STRUCTURE-1
 *
 * Paid Update Kit seal (paymentTruth.rmj008KitSeal) → durable kit members →
 * platform-locked full-replacement production structure ready for later dispatch.
 *
 * Preserves update-specific truth: customer-supplied before-state, approved after
 * intent, change sheet, exact N (FB 5 / IG 4 / TT 4). Does not reinterpret the update.
 *
 * Does NOT: remap rm-j008 · invoke kit composer / renderer · change Stripe ·
 * rebuild Payment Truth · authorize the dispatch hook · silently change platform,
 * before-state, or membership.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { recipeForUpdatePlatform } from "./rm-j008-contracts";
import {
  fingerprintRmJ008KitLiveTruth,
  type RmJ008KitPaymentSeal,
  RM_J008_KIT_PAYMENT_GATE_PACKAGE_ID,
} from "./rm-j008-kit-payment-gate";
import { RM_J008_INTAKE_PAYMENT_LOCK_PACKAGE_ID } from "./rm-j008-intake-truth";
import {
  DESIGN_RENDERER_RM_J008_SKU,
  RM_J002_AVATAR_PLATE,
  RM_J002_FACEBOOK_COVER_PLATE,
  type RmJ008MemberKind,
  type RmJ008Platform,
} from "./rm-j008-types";

export const RM_J008_POSTPAY_KIT_DISPATCH_STRUCTURE_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-RM-J008-POSTPAY-KIT-DISPATCH-STRUCTURE-1" as const;

export type RmJ008PostPayProductionRole =
  | "copy"
  | "field_map"
  | "avatar"
  | "page_cover"
  | "change_sheet";

export type RmJ008PostPayDispatchMember = {
  memberId: string;
  order: number;
  kind: RmJ008MemberKind;
  memberPurpose: string;
  productionRole: RmJ008PostPayProductionRole;
  /** Required when productionRole is avatar or page_cover. */
  agreedPlateId: string | null;
  plateRequired: boolean;
  /** Avatar is always reissued in the Update Kit (CHANGED or UNCHANGED). */
  avatarAlwaysReissued?: true;
  /** Kit path — customer applies; Studio does not mutate accounts. */
  customerApplies: true;
  accountMutation: false;
};

/**
 * Authoritative post-pay production structure for rm-j008.
 * Sole upstream authority: paymentTruth.rmj008KitSeal.
 */
export type RmJ008PostPayDispatchStructure = {
  packageId: typeof RM_J008_POSTPAY_KIT_DISPATCH_STRUCTURE_PACKAGE_ID;
  status: "paid_kit_dispatch_structure_ready";
  skuId: typeof DESIGN_RENDERER_RM_J008_SKU;
  /** Fingerprint of the paid seal — links structure to purchased kit. */
  kitFingerprint: string;
  platform: RmJ008Platform;
  lockedKitMemberCount: 2 | 4 | 5;
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
  afterStateIntent: {
    businessName: string;
    displayName: string;
    profileGoal: string;
    updateIntentNotes: string;
    website: string;
    phone: string;
    brandNotes: string;
    avatarAction: "reissue_unchanged" | "replace";
    coverAction: "reissue_unchanged" | "replace" | "not_applicable";
  };
  countUnit: "kit_member_identities";
  completenessAuthority: "platform_locked_full_replacement_kit_membership";
  members: readonly RmJ008PostPayDispatchMember[];
  credentialsPresent: false;
  mutationRequested: false;
  partialKitRequested: false;
  customerApplies: true;
  accountMutation: false;
  ownerRoutine: "NONE";
  paymentSealPackageId:
    | typeof RM_J008_KIT_PAYMENT_GATE_PACKAGE_ID
    | typeof RM_J008_INTAKE_PAYMENT_LOCK_PACKAGE_ID;
  sealedAt: string;
  builtAt: string;
  remapAuthorized: false;
  rendererInvoked: false;
  composerInvoked: false;
  dispatchHookAuthorized: false;
  note: string;
};

export type RmJ008PostPayStructureFailureCode =
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
  | "CHANGE_SHEET_MISSING"
  | "AVATAR_MISSING"
  | "FACEBOOK_COVER_MISSING"
  | "COVER_FORBIDDEN"
  | "COVER_ACTION_MISMATCH"
  | "PLATE_TAMPER"
  | "MISSING_PLATE"
  | "BEFORE_STATE_MISSING"
  | "BEFORE_STATE_MISMATCH"
  | "BEFORE_STATE_NOT_CUSTOMER_SUPPLIED"
  | "PARTIAL_KIT_FORBIDDEN"
  | "CREDENTIALS_FORBIDDEN"
  | "MUTATION_FORBIDDEN"
  | "POST_PAYMENT_PLATFORM_MUTATION"
  | "STRUCTURE_TAMPERED"
  | "DUPLICATE_MEMBER_ID"
  | "RM_J008_NOT_PAID";

export type RmJ008PostPayStructureBuildResult =
  | { ok: true; structure: RmJ008PostPayDispatchStructure; rendererInvoked: false }
  | {
      ok: false;
      code: RmJ008PostPayStructureFailureCode;
      message: string;
      rendererInvoked: false;
    };

function fail(
  code: RmJ008PostPayStructureFailureCode,
  message: string,
): RmJ008PostPayStructureBuildResult {
  return { ok: false, code, message, rendererInvoked: false };
}

function productionRoleFor(
  memberId: string,
  kind: RmJ008MemberKind,
): RmJ008PostPayProductionRole | null {
  if (
    kind === "copy" ||
    memberId === "bio_about_copy" ||
    memberId === "bio_profile_copy"
  ) {
    return "copy";
  }
  if (memberId === "before_after_change_sheet") {
    return "change_sheet";
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
  role: RmJ008PostPayProductionRole,
  platform: RmJ008Platform,
): string | null {
  if (role === "avatar") return RM_J002_AVATAR_PLATE.plateId;
  if (role === "page_cover") {
    if (platform !== "facebook") return null;
    return RM_J002_FACEBOOK_COVER_PLATE.plateId;
  }
  return null;
}

function beforeIdentityEqual(
  a: RmJ008PostPayDispatchStructure["beforeStateIdentity"],
  b: RmJ008KitPaymentSeal["beforeStateIdentity"],
): boolean {
  return (
    a.displayName === b.displayName &&
    a.bioOrAbout === b.bioOrAbout &&
    a.website === b.website &&
    a.phone === b.phone &&
    a.profileImageNote === b.profileImageNote &&
    (a.pageCoverNote ?? "") === (b.pageCoverNote ?? "")
  );
}

function assertSealInternallyConsistent(
  seal: RmJ008KitPaymentSeal,
): RmJ008PostPayStructureBuildResult | { ok: true } {
  if (seal.skuId !== DESIGN_RENDERER_RM_J008_SKU) {
    return fail(
      "INVALID_PAYMENT_SEAL",
      `INVALID_PAYMENT_SEAL: skuId must be ${DESIGN_RENDERER_RM_J008_SKU}`,
    );
  }
  if (
    seal.packageId !== RM_J008_INTAKE_PAYMENT_LOCK_PACKAGE_ID ||
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
      "CREDENTIALS_FORBIDDEN: paid Update Kit seal must not carry credentials or mutation",
    );
  }
  if (
    seal.partialKitRequested !== false ||
    seal.truth.partialKitRequested !== false
  ) {
    return fail(
      "PARTIAL_KIT_FORBIDDEN",
      "PARTIAL_KIT_FORBIDDEN: paid Update Kit seal must be full replacement membership",
    );
  }
  if (seal.customerApplies !== true || seal.accountMutation !== false) {
    return fail(
      "MUTATION_FORBIDDEN",
      "MUTATION_FORBIDDEN: paid Update Kit seal must remain customer-applies / no account mutation",
    );
  }
  if (
    seal.beforeStateSource !== "customer_supplied" ||
    seal.truth.beforeStateSource !== "customer_supplied" ||
    seal.replacementKitScope !== "full_platform_replacement_kit" ||
    seal.truth.replacementKitScope !== "full_platform_replacement_kit"
  ) {
    return fail(
      "BEFORE_STATE_NOT_CUSTOMER_SUPPLIED",
      "BEFORE_STATE_NOT_CUSTOMER_SUPPLIED: paid seal must preserve customer-supplied before-state and full replacement scope",
    );
  }

  const before = seal.beforeStateIdentity ?? seal.truth.before;
  if (
    !before?.displayName?.trim() ||
    !before?.bioOrAbout?.trim() ||
    !before?.website?.trim() ||
    !before?.phone?.trim() ||
    !before?.profileImageNote?.trim()
  ) {
    return fail(
      "BEFORE_STATE_MISSING",
      "BEFORE_STATE_MISSING: paid seal missing customer-supplied before-state identity",
    );
  }
  if (seal.platform === "facebook" && !before.pageCoverNote?.trim()) {
    return fail(
      "BEFORE_STATE_MISSING",
      "BEFORE_STATE_MISSING: Facebook paid seal requires before Page cover note",
    );
  }
  if (
    !beforeIdentityEqual(before, seal.truth.before) ||
    !beforeIdentityEqual(seal.beforeStateIdentity, seal.truth.before)
  ) {
    return fail(
      "BEFORE_STATE_MISMATCH",
      "BEFORE_STATE_MISMATCH: seal beforeStateIdentity does not match embedded truth.before",
    );
  }

  const recipe = recipeForUpdatePlatform(seal.platform);
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
  if (
    seal.manifestSeed.platform !== seal.platform ||
    seal.truth.platform !== seal.platform
  ) {
    return fail(
      "PLATFORM_MISMATCH",
      "PLATFORM_MISMATCH: seal platform does not match embedded truth/manifest",
    );
  }

  if (
    seal.platform === "facebook" &&
    seal.truth.after.coverAction === "not_applicable"
  ) {
    return fail(
      "COVER_ACTION_MISMATCH",
      "COVER_ACTION_MISMATCH: Facebook Update Kit requires a coverAction",
    );
  }
  if (
    seal.platform !== "facebook" &&
    seal.truth.after.coverAction !== "not_applicable"
  ) {
    return fail(
      "COVER_FORBIDDEN",
      "COVER_FORBIDDEN: Instagram/TikTok coverAction must be not_applicable",
    );
  }

  const liveFp = fingerprintRmJ008KitLiveTruth(seal.truth);
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
      "CHECKLIST_MEMBER_MISSING: field_map_checklist (replacement checklist) required",
    );
  }
  if (!seen.has("before_after_change_sheet")) {
    return fail(
      "CHANGE_SHEET_MISSING",
      "CHANGE_SHEET_MISSING: before_after_change_sheet required",
    );
  }
  if (!seen.has("profile_image")) {
    return fail(
      "AVATAR_MISSING",
      "AVATAR_MISSING: profile_image required (avatar always reissued)",
    );
  }
  const hasCopy =
    seen.has("bio_about_copy") || seen.has("bio_profile_copy");
  if (!hasCopy) {
    return fail(
      "COPY_MEMBER_MISSING",
      "COPY_MEMBER_MISSING: revised bio/about copy required",
    );
  }
  if (seal.platform === "facebook") {
    if (!seen.has("page_cover")) {
      return fail(
        "FACEBOOK_COVER_MISSING",
        "FACEBOOK_COVER_MISSING: Facebook Update Kit requires page_cover",
      );
    }
  } else if (seen.has("page_cover")) {
    return fail(
      "COVER_FORBIDDEN",
      "COVER_FORBIDDEN: Instagram/TikTok Update Kits must not include page_cover",
    );
  }

  return { ok: true };
}

/**
 * Sole builder: payment seal → durable dispatch-ready Update Kit structure.
 * Never invents members. Never remaps. Never invokes composer/renderer.
 */
export function buildRmJ008PostPayDispatchStructureFromPaymentSeal(
  seal: RmJ008KitPaymentSeal | null | undefined,
  builtAt = new Date().toISOString(),
): RmJ008PostPayStructureBuildResult {
  if (!seal) {
    return fail(
      "MISSING_PAYMENT_SEAL",
      "MISSING_PAYMENT_SEAL: paymentTruth.rmj008KitSeal is required to build post-pay Update Kit structure",
    );
  }

  const consistent = assertSealInternallyConsistent(seal);
  if (!consistent.ok) return consistent;

  const n = seal.lockedKitMemberCount;
  const members: RmJ008PostPayDispatchMember[] = [];

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
      ...(role === "avatar" ? { avatarAlwaysReissued: true as const } : {}),
      customerApplies: true,
      accountMutation: false,
    });
  }

  const structure: RmJ008PostPayDispatchStructure = {
    packageId: RM_J008_POSTPAY_KIT_DISPATCH_STRUCTURE_PACKAGE_ID,
    status: "paid_kit_dispatch_structure_ready",
    skuId: DESIGN_RENDERER_RM_J008_SKU,
    kitFingerprint: seal.kitFingerprint,
    platform: seal.platform,
    lockedKitMemberCount: n,
    replacementKitScope: "full_platform_replacement_kit",
    beforeStateSource: "customer_supplied",
    beforeStateIdentity: { ...seal.beforeStateIdentity },
    afterStateIntent: { ...seal.truth.after },
    countUnit: "kit_member_identities",
    completenessAuthority: "platform_locked_full_replacement_kit_membership",
    members,
    credentialsPresent: false,
    mutationRequested: false,
    partialKitRequested: false,
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
      "Post-pay structure mirrors the exact paid full-replacement Update Kit — platform, customer-supplied before-state, after intent, change sheet, and N/N members. Production must not reinterpret the update, drop/swap members, or invent covers. Customer applies — Studio does not log in. Dispatch hook not authorized in this package.",
  };

  const ready = assertRmJ008PostPayStructureMatchesPaymentSeal(structure, seal);
  if (!ready.ok) return ready;

  return { ok: true, structure, rendererInvoked: false };
}

/**
 * Fail closed if structure drifts from the paid seal
 * (platform, before-state, count, IDs, kinds, order, plates, credentials).
 */
export function assertRmJ008PostPayStructureMatchesPaymentSeal(
  structure: RmJ008PostPayDispatchStructure,
  seal: RmJ008KitPaymentSeal,
): RmJ008PostPayStructureBuildResult {
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
    structure.beforeStateSource !== "customer_supplied" ||
    structure.replacementKitScope !== "full_platform_replacement_kit" ||
    structure.partialKitRequested !== false
  ) {
    return fail(
      "PARTIAL_KIT_FORBIDDEN",
      "PARTIAL_KIT_FORBIDDEN: post-pay structure must remain full replacement with customer-supplied before-state",
    );
  }
  if (!beforeIdentityEqual(structure.beforeStateIdentity, seal.beforeStateIdentity)) {
    return fail(
      "BEFORE_STATE_MISMATCH",
      "BEFORE_STATE_MISMATCH: post-pay structure before-state identity drifted from payment seal",
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
  if (!ids.has("before_after_change_sheet")) {
    return fail(
      "CHANGE_SHEET_MISSING",
      "CHANGE_SHEET_MISSING: before_after_change_sheet required",
    );
  }
  if (!ids.has("profile_image")) {
    return fail("AVATAR_MISSING", "AVATAR_MISSING: profile_image required");
  }
  if (!ids.has("bio_about_copy") && !ids.has("bio_profile_copy")) {
    return fail(
      "COPY_MEMBER_MISSING",
      "COPY_MEMBER_MISSING: revised bio/about copy required",
    );
  }
  if (structure.platform === "facebook") {
    if (!ids.has("page_cover")) {
      return fail(
        "FACEBOOK_COVER_MISSING",
        "FACEBOOK_COVER_MISSING: Facebook Update Kit requires page_cover",
      );
    }
  } else if (ids.has("page_cover")) {
    return fail(
      "COVER_FORBIDDEN",
      "COVER_FORBIDDEN: Instagram/TikTok Update Kits must not include page_cover",
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
    if (m.productionRole === "avatar" && m.avatarAlwaysReissued !== true) {
      return fail(
        "AVATAR_MISSING",
        "AVATAR_MISSING: avatar member must remain always-reissued on post-pay structure",
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
export function assertRmJ008PostPayStructureDispatchReady(
  structure: RmJ008PostPayDispatchStructure,
): RmJ008PostPayStructureBuildResult {
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
  const recipe = recipeForUpdatePlatform(structure.platform);
  if (
    structure.members.length !== structure.lockedKitMemberCount ||
    structure.lockedKitMemberCount !== recipe.lockedKitMemberCount
  ) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: structure is not exact platform N/N",
    );
  }
  if (
    !structure.members.some((m) => m.memberId === "before_after_change_sheet")
  ) {
    return fail(
      "CHANGE_SHEET_MISSING",
      "CHANGE_SHEET_MISSING: change sheet required for dispatch-ready Update Kit",
    );
  }
  for (const m of structure.members) {
    if (!m.memberId.trim()) {
      return fail(
        "MEMBER_IDENTITY_MISMATCH",
        "MEMBER_IDENTITY_MISMATCH: empty memberId",
      );
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
 * Fail closed if an attempted structure silently changes platform, before-state,
 * or members relative to the paid seal.
 */
export function assertRmJ008PostPayStructureNoSilentKitMutation(input: {
  seal: RmJ008KitPaymentSeal;
  attempted: RmJ008PostPayDispatchStructure;
}): RmJ008PostPayStructureBuildResult {
  if (input.attempted.platform !== input.seal.platform) {
    return fail(
      "POST_PAYMENT_PLATFORM_MUTATION",
      "POST_PAYMENT_PLATFORM_MUTATION: platform cannot silently change after payment",
    );
  }
  if (
    !beforeIdentityEqual(
      input.attempted.beforeStateIdentity,
      input.seal.beforeStateIdentity,
    )
  ) {
    return fail(
      "BEFORE_STATE_MISMATCH",
      "BEFORE_STATE_MISMATCH: before-state identity cannot silently change after payment",
    );
  }
  const match = assertRmJ008PostPayStructureMatchesPaymentSeal(
    input.attempted,
    input.seal,
  );
  if (!match.ok) return match;
  return assertRmJ008PostPayStructureDispatchReady(input.attempted);
}

/**
 * Read seal from campaign paymentTruth and build durable structure.
 * Does not invent a kit when seal is absent.
 */
export function buildRmJ008PostPayDispatchStructureFromCampaign(
  campaign: CampaignRecord,
): RmJ008PostPayStructureBuildResult {
  const hasSku = campaign.paymentTruth?.selectedServiceIds?.includes(
    DESIGN_RENDERER_RM_J008_SKU,
  );
  const seal = campaign.paymentTruth?.rmj008KitSeal;
  if (hasSku && !seal) {
    return fail(
      "MISSING_PAYMENT_SEAL",
      "MISSING_PAYMENT_SEAL: rm-j008 was paid/selected without Update Kit seal",
    );
  }
  if (!seal) {
    return fail(
      "RM_J008_NOT_PAID",
      "RM_J008_NOT_PAID: no rm-j008 kit seal on paymentTruth",
    );
  }
  if (
    !campaign.paymentReceivedAt &&
    campaign.paymentTruth?.status !== "confirmed"
  ) {
    return fail(
      "RM_J008_NOT_PAID",
      "RM_J008_NOT_PAID: payment not confirmed — post-pay structure requires paid seal",
    );
  }
  return buildRmJ008PostPayDispatchStructureFromPaymentSeal(seal);
}

/**
 * Attach durable structure onto campaign from paymentTruth seal.
 * Idempotent when fingerprint already matches. Never mutates paymentTruth.
 */
export function ensureRmJ008PostPayDispatchStructureOnCampaign(
  campaign: CampaignRecord,
):
  | {
      ok: true;
      campaign: CampaignRecord;
      structure: RmJ008PostPayDispatchStructure;
      alreadyPresent: boolean;
      rendererInvoked: false;
    }
  | {
      ok: false;
      campaign: CampaignRecord;
      code: RmJ008PostPayStructureFailureCode;
      message: string;
      rendererInvoked: false;
    } {
  const built = buildRmJ008PostPayDispatchStructureFromCampaign(campaign);
  if (!built.ok) {
    return {
      ok: false,
      campaign,
      code: built.code,
      message: built.message,
      rendererInvoked: false,
    };
  }

  const existing = campaign.rmJ008PostPayDispatchStructure;
  if (
    existing &&
    existing.kitFingerprint === built.structure.kitFingerprint &&
    existing.platform === built.structure.platform &&
    existing.lockedKitMemberCount === built.structure.lockedKitMemberCount &&
    beforeIdentityEqual(
      existing.beforeStateIdentity,
      built.structure.beforeStateIdentity,
    ) &&
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
    const ready = assertRmJ008PostPayStructureDispatchReady(existing);
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
      rmJ008PostPayDispatchStructure: built.structure,
      updatedAt: new Date().toISOString(),
    },
    structure: built.structure,
    alreadyPresent: false,
    rendererInvoked: false,
  };
}
