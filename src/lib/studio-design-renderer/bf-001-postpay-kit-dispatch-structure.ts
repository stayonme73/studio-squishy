/**
 * STUDIO-OPERATING-DESIGN-BF-001-POSTPAY-PACKAGE-DISPATCH-STRUCTURE-1
 *
 * Paid refresh seal (paymentTruth.bf001PackageSeal) → durable 2-member package
 * structure ready for later dispatch.
 *
 * Preserves refresh-specific truth: existing business name, customer-supplied
 * visual starting point (notes + supplied logo note), locked graphic kind
 * (profile XOR cover), and both member plates (sheet plate + profile/cover plate).
 * Does not reinterpret the refresh.
 *
 * Does NOT: remap bf-001 · invoke package composer / renderer · change Stripe ·
 * rebuild Payment Truth · authorize the dispatch hook · silently change graphic
 * kind, starting point, or membership.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { plateForGraphicKind, recipeForGraphicKind } from "./bf-001-contracts";
import {
  fingerprintBf001PackageLiveTruth,
  type Bf001PackagePaymentSeal,
  BF_001_PACKAGE_PAYMENT_GATE_PACKAGE_ID,
} from "./bf-001-kit-payment-gate";
import {
  BF_001_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
  type Bf001PackageStartingPointIdentity,
} from "./bf-001-intake-truth";
import {
  BF_001_SHEET_PLATE,
  DESIGN_RENDERER_BF_001_SKU,
  type Bf001GraphicKind,
  type Bf001MemberKind,
} from "./bf-001-types";

export const BF_001_POSTPAY_PACKAGE_DISPATCH_STRUCTURE_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-BF-001-POSTPAY-PACKAGE-DISPATCH-STRUCTURE-1" as const;

export type Bf001PostPayProductionRole =
  | "brand_direction_sheet"
  | "profile_graphic"
  | "cover_graphic";

export type Bf001PostPayDispatchMember = {
  memberId: string;
  order: number;
  kind: Bf001MemberKind;
  memberPurpose: string;
  productionRole: Bf001PostPayProductionRole;
  /** Always required — both refresh members render on a frozen plate. */
  agreedPlateId: string;
  plateRequired: true;
  /** Supplied mark is placed, never redrawn. */
  logoRedrawForbidden: true;
  /** Sheet: fonts are recommendations only. Graphic: Studio-safe faces only. */
  fontMode: "recommendations_only" | "studio_safe_only";
};

/**
 * Authoritative post-pay production structure for bf-001.
 * Sole upstream authority: paymentTruth.bf001PackageSeal.
 */
export type Bf001PostPayDispatchStructure = {
  packageId: typeof BF_001_POSTPAY_PACKAGE_DISPATCH_STRUCTURE_PACKAGE_ID;
  status: "paid_package_dispatch_structure_ready";
  skuId: typeof DESIGN_RENDERER_BF_001_SKU;
  /** Fingerprint of the paid seal — links structure to purchased package. */
  packageFingerprint: string;
  businessName: string;
  graphicKind: Bf001GraphicKind;
  lockedPackageMemberCount: 2;
  packageScope: "brand_refresh_two_member_package";
  startingPointSource: "customer_supplied";
  startingPointIdentity: Bf001PackageStartingPointIdentity;
  countUnit: "member_identities";
  completenessAuthority: "graphic_kind_locked_two_member_package_membership";
  members: readonly Bf001PostPayDispatchMember[];
  newLogoRequested: false;
  namingRequested: false;
  messagingRequested: false;
  fontSectionMode: "recommendations_only";
  logoUsageMode: "usage_guidance_only";
  graphicFontPolicy: "studio_safe_only";
  ownerRoutine: "NONE";
  paymentSealPackageId:
    | typeof BF_001_PACKAGE_PAYMENT_GATE_PACKAGE_ID
    | typeof BF_001_INTAKE_PAYMENT_LOCK_PACKAGE_ID;
  sealedAt: string;
  builtAt: string;
  remapAuthorized: false;
  rendererInvoked: false;
  composerInvoked: false;
  dispatchHookAuthorized: false;
  note: string;
};

export type Bf001PostPayStructureFailureCode =
  | "MISSING_PAYMENT_SEAL"
  | "INVALID_PAYMENT_SEAL"
  | "FINGERPRINT_MISMATCH"
  | "GRAPHIC_KIND_MISMATCH"
  | "NO_GRAPHIC_SELECTED"
  | "PROFILE_AND_COVER"
  | "MEMBER_COUNT_MISMATCH"
  | "MEMBER_IDENTITY_MISMATCH"
  | "MEMBER_KIND_MISMATCH"
  | "MEMBER_ORDER_MISMATCH"
  | "MEMBER_DROPPED"
  | "MEMBER_SWAPPED"
  | "SHEET_MEMBER_MISSING"
  | "GRAPHIC_MEMBER_MISSING"
  | "PLATE_TAMPER"
  | "MISSING_PLATE"
  | "BUSINESS_NAME_MISSING"
  | "STARTING_POINT_MISSING"
  | "STARTING_POINT_MISMATCH"
  | "STARTING_POINT_NOT_CUSTOMER_SUPPLIED"
  | "PARTIAL_PACKAGE_FORBIDDEN"
  | "SCOPE_FORBIDDEN"
  | "FONT_MODE_FORBIDDEN"
  | "LOGO_REDRAW_FORBIDDEN"
  | "POST_PAYMENT_GRAPHIC_KIND_MUTATION"
  | "STRUCTURE_TAMPERED"
  | "DUPLICATE_MEMBER_ID"
  | "BF_001_NOT_PAID";

export type Bf001PostPayStructureBuildResult =
  | {
      ok: true;
      structure: Bf001PostPayDispatchStructure;
      rendererInvoked: false;
    }
  | {
      ok: false;
      code: Bf001PostPayStructureFailureCode;
      message: string;
      rendererInvoked: false;
    };

function fail(
  code: Bf001PostPayStructureFailureCode,
  message: string,
): Bf001PostPayStructureBuildResult {
  return { ok: false, code, message, rendererInvoked: false };
}

function productionRoleFor(
  memberId: string,
  kind: Bf001MemberKind,
): Bf001PostPayProductionRole | null {
  if (kind === "strategy_document" || memberId === "brand_direction_sheet") {
    return "brand_direction_sheet";
  }
  if (kind === "design_profile") return "profile_graphic";
  if (kind === "design_cover") return "cover_graphic";
  return null;
}

function expectedPlateFor(
  role: Bf001PostPayProductionRole,
  graphicKind: Bf001GraphicKind,
): string {
  if (role === "brand_direction_sheet") return BF_001_SHEET_PLATE.plateId;
  return plateForGraphicKind(graphicKind).plateId;
}

function fontModeFor(
  role: Bf001PostPayProductionRole,
): Bf001PostPayDispatchMember["fontMode"] {
  return role === "brand_direction_sheet"
    ? "recommendations_only"
    : "studio_safe_only";
}

function startingPointEqual(
  a: Bf001PackageStartingPointIdentity,
  b: Bf001PackageStartingPointIdentity,
): boolean {
  return (
    a.visualStartingPointNotes === b.visualStartingPointNotes &&
    a.logoMaterialNote === b.logoMaterialNote &&
    a.likesDislikes === b.likesDislikes &&
    a.businessFacts === b.businessFacts
  );
}

function assertSealInternallyConsistent(
  seal: Bf001PackagePaymentSeal,
): Bf001PostPayStructureBuildResult | { ok: true } {
  if (seal.skuId !== DESIGN_RENDERER_BF_001_SKU) {
    return fail(
      "INVALID_PAYMENT_SEAL",
      `INVALID_PAYMENT_SEAL: skuId must be ${DESIGN_RENDERER_BF_001_SKU}`,
    );
  }
  if (
    seal.packageId !== BF_001_INTAKE_PAYMENT_LOCK_PACKAGE_ID ||
    !seal.truth ||
    !seal.manifestSeed
  ) {
    return fail(
      "INVALID_PAYMENT_SEAL",
      "INVALID_PAYMENT_SEAL: seal missing package identity, truth, or manifest seed",
    );
  }
  if (
    seal.newLogoRequested !== false ||
    seal.namingRequested !== false ||
    seal.messagingRequested !== false ||
    seal.truth.newLogoRequested !== false ||
    seal.truth.namingRequested !== false ||
    seal.truth.messagingRequested !== false
  ) {
    return fail(
      "SCOPE_FORBIDDEN",
      "SCOPE_FORBIDDEN: paid refresh seal must not carry naming, new-logo, or messaging scope",
    );
  }
  if (
    seal.fontSectionMode !== "recommendations_only" ||
    seal.truth.fontSectionMode !== "recommendations_only" ||
    seal.graphicFontPolicy !== "studio_safe_only" ||
    seal.truth.graphicFontPolicy !== "studio_safe_only"
  ) {
    return fail(
      "FONT_MODE_FORBIDDEN",
      "FONT_MODE_FORBIDDEN: sheet fonts stay recommendations-only and the graphic stays Studio-safe",
    );
  }
  if (
    seal.logoUsageMode !== "usage_guidance_only" ||
    seal.truth.logoUsageMode !== "usage_guidance_only"
  ) {
    return fail(
      "LOGO_REDRAW_FORBIDDEN",
      "LOGO_REDRAW_FORBIDDEN: logo guidance is usage-only — the supplied mark is never redrawn",
    );
  }
  if (
    seal.packageScope !== "brand_refresh_two_member_package" ||
    seal.truth.packageScope !== "brand_refresh_two_member_package"
  ) {
    return fail(
      "PARTIAL_PACKAGE_FORBIDDEN",
      "PARTIAL_PACKAGE_FORBIDDEN: paid seal must preserve the 2-member refresh package scope",
    );
  }
  if (
    seal.startingPointSource !== "customer_supplied" ||
    seal.truth.startingPointSource !== "customer_supplied"
  ) {
    return fail(
      "STARTING_POINT_NOT_CUSTOMER_SUPPLIED",
      "STARTING_POINT_NOT_CUSTOMER_SUPPLIED: paid seal must preserve the customer-supplied visual starting point",
    );
  }
  if (!seal.businessName?.trim() || !seal.truth.businessName?.trim()) {
    return fail(
      "BUSINESS_NAME_MISSING",
      "BUSINESS_NAME_MISSING: paid seal missing the existing business name",
    );
  }

  const starting = seal.startingPointIdentity ?? seal.truth.startingPoint;
  if (
    !starting?.visualStartingPointNotes?.trim() ||
    !starting?.logoMaterialNote?.trim() ||
    !starting?.likesDislikes?.trim() ||
    !starting?.businessFacts?.trim()
  ) {
    return fail(
      "STARTING_POINT_MISSING",
      "STARTING_POINT_MISSING: paid seal missing customer-supplied starting-point identity",
    );
  }
  if (
    !startingPointEqual(starting, seal.truth.startingPoint) ||
    !startingPointEqual(seal.startingPointIdentity, seal.truth.startingPoint)
  ) {
    return fail(
      "STARTING_POINT_MISMATCH",
      "STARTING_POINT_MISMATCH: seal startingPointIdentity does not match embedded truth.startingPoint",
    );
  }

  if (seal.graphicKind !== "profile" && seal.graphicKind !== "cover") {
    return fail(
      "NO_GRAPHIC_SELECTED",
      "NO_GRAPHIC_SELECTED: paid seal graphic kind must be profile XOR cover",
    );
  }
  if (
    seal.manifestSeed.graphicKind !== seal.graphicKind ||
    seal.truth.graphicKind !== seal.graphicKind
  ) {
    return fail(
      "GRAPHIC_KIND_MISMATCH",
      "GRAPHIC_KIND_MISMATCH: seal graphic kind does not match embedded truth/manifest",
    );
  }

  const recipe = recipeForGraphicKind(seal.graphicKind);
  const n = seal.lockedPackageMemberCount;
  if (
    n !== 2 ||
    seal.truth.lockedPackageMemberCount !== 2 ||
    seal.manifestSeed.lockedPackageMemberCount !== 2
  ) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: bf-001 is always exactly 2 member identities",
    );
  }
  if (
    seal.memberIds.length !== n ||
    seal.memberKinds.length !== n ||
    seal.memberOrder.length !== n ||
    seal.memberPlateIds.length !== n ||
    seal.truth.plannedMembers.length !== n ||
    seal.manifestSeed.members.length !== n
  ) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: seal member lists do not match locked count",
    );
  }

  const liveFp = fingerprintBf001PackageLiveTruth(seal.truth);
  if (liveFp !== seal.packageFingerprint) {
    return fail(
      "FINGERPRINT_MISMATCH",
      "FINGERPRINT_MISMATCH: payment seal fingerprint does not match embedded truth",
    );
  }

  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const expected = recipe.plannedMembers[i]!;
    const planned = seal.truth.plannedMembers[i]!;
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
      return fail(
        "DUPLICATE_MEMBER_ID",
        `DUPLICATE_MEMBER_ID: ${planned.memberId}`,
      );
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
    const expectedPlate = expectedPlateFor(role, seal.graphicKind);
    if (
      planned.agreedPlateId !== expectedPlate ||
      seal.memberPlateIds[i] !== expectedPlate ||
      seed.agreedPlateId !== expectedPlate
    ) {
      return fail(
        "PLATE_TAMPER",
        `PLATE_TAMPER: member ${planned.memberId} expected plate ${expectedPlate}`,
      );
    }
  }

  if (!seen.has("brand_direction_sheet")) {
    return fail(
      "SHEET_MEMBER_MISSING",
      "SHEET_MEMBER_MISSING: brand_direction_sheet required",
    );
  }
  if (!seen.has("profile_or_cover_graphic")) {
    return fail(
      "GRAPHIC_MEMBER_MISSING",
      "GRAPHIC_MEMBER_MISSING: profile_or_cover_graphic required",
    );
  }

  return { ok: true };
}

/**
 * Sole builder: payment seal → durable dispatch-ready refresh package structure.
 * Never invents members. Never remaps. Never invokes composer/renderer.
 */
export function buildBf001PostPayDispatchStructureFromPaymentSeal(
  seal: Bf001PackagePaymentSeal | null | undefined,
  builtAt = new Date().toISOString(),
): Bf001PostPayStructureBuildResult {
  if (!seal) {
    return fail(
      "MISSING_PAYMENT_SEAL",
      "MISSING_PAYMENT_SEAL: paymentTruth.bf001PackageSeal is required to build the post-pay refresh structure",
    );
  }

  const consistent = assertSealInternallyConsistent(seal);
  if (!consistent.ok) return consistent;

  const members: Bf001PostPayDispatchMember[] = [];
  for (let i = 0; i < seal.lockedPackageMemberCount; i++) {
    const planned = seal.truth.plannedMembers[i]!;
    const role = productionRoleFor(planned.memberId, planned.kind)!;
    members.push({
      memberId: planned.memberId,
      order: planned.order,
      kind: planned.kind,
      memberPurpose: planned.memberPurpose,
      productionRole: role,
      agreedPlateId: expectedPlateFor(role, seal.graphicKind),
      plateRequired: true,
      logoRedrawForbidden: true,
      fontMode: fontModeFor(role),
    });
  }

  const structure: Bf001PostPayDispatchStructure = {
    packageId: BF_001_POSTPAY_PACKAGE_DISPATCH_STRUCTURE_PACKAGE_ID,
    status: "paid_package_dispatch_structure_ready",
    skuId: DESIGN_RENDERER_BF_001_SKU,
    packageFingerprint: seal.packageFingerprint,
    businessName: seal.businessName,
    graphicKind: seal.graphicKind,
    lockedPackageMemberCount: 2,
    packageScope: "brand_refresh_two_member_package",
    startingPointSource: "customer_supplied",
    startingPointIdentity: { ...seal.startingPointIdentity },
    countUnit: "member_identities",
    completenessAuthority:
      "graphic_kind_locked_two_member_package_membership",
    members,
    newLogoRequested: false,
    namingRequested: false,
    messagingRequested: false,
    fontSectionMode: "recommendations_only",
    logoUsageMode: "usage_guidance_only",
    graphicFontPolicy: "studio_safe_only",
    ownerRoutine: "NONE",
    paymentSealPackageId: seal.packageId,
    sealedAt: seal.sealedAt,
    builtAt,
    remapAuthorized: false,
    rendererInvoked: false,
    composerInvoked: false,
    dispatchHookAuthorized: false,
    note:
      "Post-pay structure mirrors the exact paid refresh package — existing business name, customer-supplied visual starting point, locked profile XOR cover graphic, and both member plates. Production must not reinvent the brand, add a second graphic, name the business, draw a new logo, or write messaging. Dispatch hook not authorized in this package.",
  };

  const ready = assertBf001PostPayStructureMatchesPaymentSeal(structure, seal);
  if (!ready.ok) return ready;

  return { ok: true, structure, rendererInvoked: false };
}

/**
 * Fail closed if structure drifts from the paid seal
 * (graphic kind, starting point, count, IDs, kinds, order, plates, scope).
 */
export function assertBf001PostPayStructureMatchesPaymentSeal(
  structure: Bf001PostPayDispatchStructure,
  seal: Bf001PackagePaymentSeal,
): Bf001PostPayStructureBuildResult {
  if (structure.packageFingerprint !== seal.packageFingerprint) {
    return fail(
      "FINGERPRINT_MISMATCH",
      "FINGERPRINT_MISMATCH: post-pay structure fingerprint does not match payment seal",
    );
  }
  if (structure.graphicKind !== seal.graphicKind) {
    return fail(
      "POST_PAYMENT_GRAPHIC_KIND_MUTATION",
      "POST_PAYMENT_GRAPHIC_KIND_MUTATION: post-pay structure graphic kind does not match payment seal",
    );
  }
  if (structure.businessName !== seal.businessName) {
    return fail(
      "BUSINESS_NAME_MISSING",
      "BUSINESS_NAME_MISSING: post-pay structure business name drifted from payment seal",
    );
  }
  if (structure.lockedPackageMemberCount !== seal.lockedPackageMemberCount) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: post-pay structure count does not match payment seal",
    );
  }
  if (structure.members.length !== seal.lockedPackageMemberCount) {
    return fail(
      "MEMBER_DROPPED",
      "MEMBER_DROPPED: post-pay structure member list length does not match locked count",
    );
  }
  if (
    structure.startingPointSource !== "customer_supplied" ||
    structure.packageScope !== "brand_refresh_two_member_package"
  ) {
    return fail(
      "PARTIAL_PACKAGE_FORBIDDEN",
      "PARTIAL_PACKAGE_FORBIDDEN: post-pay structure must remain the 2-member refresh with a customer-supplied starting point",
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
      "STARTING_POINT_MISMATCH: post-pay structure starting-point identity drifted from payment seal",
    );
  }
  if (
    structure.newLogoRequested !== false ||
    structure.namingRequested !== false ||
    structure.messagingRequested !== false
  ) {
    return fail(
      "SCOPE_FORBIDDEN",
      "SCOPE_FORBIDDEN: post-pay structure must preserve the no-naming / no-new-logo / no-messaging boundary",
    );
  }
  if (
    structure.fontSectionMode !== "recommendations_only" ||
    structure.graphicFontPolicy !== "studio_safe_only"
  ) {
    return fail(
      "FONT_MODE_FORBIDDEN",
      "FONT_MODE_FORBIDDEN: post-pay structure must keep sheet fonts recommendation-only and the graphic Studio-safe",
    );
  }
  if (structure.logoUsageMode !== "usage_guidance_only") {
    return fail(
      "LOGO_REDRAW_FORBIDDEN",
      "LOGO_REDRAW_FORBIDDEN: post-pay structure must keep logo guidance usage-only",
    );
  }

  const ids = new Set(structure.members.map((m) => m.memberId));
  if (!ids.has("brand_direction_sheet")) {
    return fail(
      "SHEET_MEMBER_MISSING",
      "SHEET_MEMBER_MISSING: brand_direction_sheet required",
    );
  }
  if (!ids.has("profile_or_cover_graphic")) {
    return fail(
      "GRAPHIC_MEMBER_MISSING",
      "GRAPHIC_MEMBER_MISSING: profile_or_cover_graphic required",
    );
  }
  const graphicRoles = new Set(
    structure.members
      .filter((m) => m.memberId === "profile_or_cover_graphic")
      .map((m) => m.productionRole),
  );
  if (
    graphicRoles.has("profile_graphic") &&
    graphicRoles.has("cover_graphic")
  ) {
    return fail(
      "PROFILE_AND_COVER",
      "PROFILE_AND_COVER: exactly one graphic member per refresh package",
    );
  }

  for (let i = 0; i < seal.lockedPackageMemberCount; i++) {
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
    const expectedPlate = expectedPlateFor(
      m.productionRole,
      structure.graphicKind,
    );
    if (
      m.agreedPlateId !== expectedPlate ||
      m.agreedPlateId !== seal.memberPlateIds[i]
    ) {
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
    if (m.logoRedrawForbidden !== true) {
      return fail(
        "LOGO_REDRAW_FORBIDDEN",
        `LOGO_REDRAW_FORBIDDEN: member ${m.memberId} must keep the supplied mark placed, not redrawn`,
      );
    }
    if (m.fontMode !== fontModeFor(m.productionRole)) {
      return fail(
        "FONT_MODE_FORBIDDEN",
        `FONT_MODE_FORBIDDEN: member ${m.memberId} font mode changed after payment`,
      );
    }
  }

  return { ok: true, structure, rendererInvoked: false };
}

/**
 * Structure is dispatch-ready as a data contract only.
 * Does not authorize or invoke the dispatch hook / composer / renderer.
 */
export function assertBf001PostPayStructureDispatchReady(
  structure: Bf001PostPayDispatchStructure,
): Bf001PostPayStructureBuildResult {
  if (structure.status !== "paid_package_dispatch_structure_ready") {
    return fail(
      "INVALID_PAYMENT_SEAL",
      "INVALID_PAYMENT_SEAL: structure status is not paid_package_dispatch_structure_ready",
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
  if (
    structure.members.length !== structure.lockedPackageMemberCount ||
    structure.lockedPackageMemberCount !== 2
  ) {
    return fail(
      "MEMBER_COUNT_MISMATCH",
      "MEMBER_COUNT_MISMATCH: structure is not exact 2/2",
    );
  }
  if (
    !structure.members.some((m) => m.memberId === "brand_direction_sheet")
  ) {
    return fail(
      "SHEET_MEMBER_MISSING",
      "SHEET_MEMBER_MISSING: Brand Direction Sheet required for a dispatch-ready refresh package",
    );
  }
  if (
    !structure.startingPointIdentity.visualStartingPointNotes.trim() ||
    !structure.startingPointIdentity.logoMaterialNote.trim()
  ) {
    return fail(
      "STARTING_POINT_MISSING",
      "STARTING_POINT_MISSING: dispatch-ready refresh package requires the customer-supplied starting point",
    );
  }
  for (const m of structure.members) {
    if (!m.memberId.trim()) {
      return fail(
        "MEMBER_IDENTITY_MISMATCH",
        "MEMBER_IDENTITY_MISMATCH: empty memberId",
      );
    }
    if (!m.agreedPlateId.trim()) {
      return fail(
        "MISSING_PLATE",
        `MISSING_PLATE: member ${m.memberId} lacks required plate`,
      );
    }
  }
  return { ok: true, structure, rendererInvoked: false };
}

/**
 * Fail closed if an attempted structure silently changes graphic kind, starting
 * point, or members relative to the paid seal.
 */
export function assertBf001PostPayStructureNoSilentPackageMutation(input: {
  seal: Bf001PackagePaymentSeal;
  attempted: Bf001PostPayDispatchStructure;
}): Bf001PostPayStructureBuildResult {
  if (input.attempted.graphicKind !== input.seal.graphicKind) {
    return fail(
      "POST_PAYMENT_GRAPHIC_KIND_MUTATION",
      "POST_PAYMENT_GRAPHIC_KIND_MUTATION: profile/cover choice cannot silently change after payment",
    );
  }
  if (
    !startingPointEqual(
      input.attempted.startingPointIdentity,
      input.seal.startingPointIdentity,
    )
  ) {
    return fail(
      "STARTING_POINT_MISMATCH",
      "STARTING_POINT_MISMATCH: visual starting point cannot silently change after payment",
    );
  }
  const match = assertBf001PostPayStructureMatchesPaymentSeal(
    input.attempted,
    input.seal,
  );
  if (!match.ok) return match;
  return assertBf001PostPayStructureDispatchReady(input.attempted);
}

/**
 * Read seal from campaign paymentTruth and build durable structure.
 * Does not invent a refresh package when the seal is absent.
 */
export function buildBf001PostPayDispatchStructureFromCampaign(
  campaign: CampaignRecord,
): Bf001PostPayStructureBuildResult {
  const hasSku = campaign.paymentTruth?.selectedServiceIds?.includes(
    DESIGN_RENDERER_BF_001_SKU,
  );
  const seal = campaign.paymentTruth?.bf001PackageSeal;
  if (hasSku && !seal) {
    return fail(
      "MISSING_PAYMENT_SEAL",
      "MISSING_PAYMENT_SEAL: bf-001 was paid/selected without a refresh package seal",
    );
  }
  if (!seal) {
    return fail(
      "BF_001_NOT_PAID",
      "BF_001_NOT_PAID: no bf-001 package seal on paymentTruth",
    );
  }
  if (
    !campaign.paymentReceivedAt &&
    campaign.paymentTruth?.status !== "confirmed"
  ) {
    return fail(
      "BF_001_NOT_PAID",
      "BF_001_NOT_PAID: payment not confirmed — post-pay structure requires a paid seal",
    );
  }
  return buildBf001PostPayDispatchStructureFromPaymentSeal(seal);
}

/**
 * Attach durable structure onto the campaign from the paymentTruth seal.
 * Idempotent when fingerprint already matches. Never mutates paymentTruth.
 */
export function ensureBf001PostPayDispatchStructureOnCampaign(
  campaign: CampaignRecord,
):
  | {
      ok: true;
      campaign: CampaignRecord;
      structure: Bf001PostPayDispatchStructure;
      alreadyPresent: boolean;
      rendererInvoked: false;
    }
  | {
      ok: false;
      campaign: CampaignRecord;
      code: Bf001PostPayStructureFailureCode;
      message: string;
      rendererInvoked: false;
    } {
  const built = buildBf001PostPayDispatchStructureFromCampaign(campaign);
  if (!built.ok) {
    return {
      ok: false,
      campaign,
      code: built.code,
      message: built.message,
      rendererInvoked: false,
    };
  }

  const existing = campaign.bf001PostPayDispatchStructure;
  if (
    existing &&
    existing.packageFingerprint === built.structure.packageFingerprint &&
    existing.graphicKind === built.structure.graphicKind &&
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
        m.agreedPlateId === built.structure.members[i]!.agreedPlateId &&
        m.productionRole === built.structure.members[i]!.productionRole,
    )
  ) {
    const ready = assertBf001PostPayStructureDispatchReady(existing);
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
      bf001PostPayDispatchStructure: built.structure,
      updatedAt: new Date().toISOString(),
    },
    structure: built.structure,
    alreadyPresent: false,
    rendererInvoked: false,
  };
}
