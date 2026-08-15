/**
 * STUDIO-OPERATING-DESIGN-BF-001-INTAKE-PAYMENT-LOCK-1 (intake half)
 *
 * Map customer-locked graphic kind (profile XOR cover) + existing business name
 * + customer-supplied visual starting point → authoritative 2-member Brand
 * Identity Refresh package membership **before payment**.
 * skuId `bf-001` alone is NOT enough for checkout.
 *
 * Hard boundary: bf-001 refreshes an existing presentation. It never invents
 * from nothing — no naming, no new logo from scratch, no messaging/taglines.
 * Sheet fonts are recommendations only; the Studio graphic renders Studio-safe faces.
 *
 * No remap · no dispatch · no composer invoke.
 */

import { recipeForGraphicKind } from "./bf-001-contracts";
import {
  DESIGN_RENDERER_BF_001_SKU,
  type Bf001GraphicKind,
  type Bf001PlannedMember,
} from "./bf-001-types";

export const BF_001_INTAKE_PAYMENT_LOCK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-BF-001-INTAKE-PAYMENT-LOCK-1" as const;

export const BF_001_CUSTOMER_GRAPHIC_KIND_OPTIONS = [
  "Profile image",
  "Cover graphic",
] as const;

export type Bf001CustomerGraphicKindOption =
  (typeof BF_001_CUSTOMER_GRAPHIC_KIND_OPTIONS)[number];

const CUSTOMER_GRAPHIC_KIND_TO_MACHINE: Record<
  Bf001CustomerGraphicKindOption,
  Bf001GraphicKind
> = {
  "Profile image": "profile",
  "Cover graphic": "cover",
};

/** Flat live intake field ids for brand-refresh → 2-member package lock. */
export const BF_001_PACKAGE_LOCK_FIELD_IDS = {
  businessName: "businessName",
  graphicKind: "graphicKind",
  visualStartingPointNotes: "visualStartingPointNotes",
  logoMaterialNote: "logoMaterialNote",
  likesDislikes: "likesDislikes",
  businessFacts: "businessFacts",
} as const;

/**
 * Out-of-scope requests that must never enter a bf-001 lock.
 * bf-001 refreshes — it does not name, redraw a logo, or write messaging.
 */
export const BF_001_FORBIDDEN_SCOPE_INTAKE_FIELDS = [
  "namingRequested",
  "businessNameOptions",
  "renameBusiness",
  "nameIdeas",
  "newLogoRequested",
  "newLogoFromScratch",
  "logoFromScratch",
  "logoConcepts",
  "multipleLogoConcepts",
  "logoRedraw",
  "logoRedesign",
  "messagingRequested",
  "brandMessaging",
  "taglineOptions",
  "sloganOptions",
  "valueProposition",
  "positioningStatement",
  "trademarkSearch",
] as const;

/** Cannot substitute for an explicit graphic-kind lock or the 2-member package. */
export const BF_001_AMBIGUOUS_LEGACY_FIELDS = [
  "graphicKinds",
  "bothProfileAndCover",
  "profileAndCover",
  "anyGraphic",
  "graphicOrSimilar",
  "profileOrCoverLater",
  "decideGraphicLater",
  "memberIds",
  "membersOverride",
  "partialPackage",
  "sheetOnly",
  "graphicOnly",
  "inventFromNothing",
  "noStartingPoint",
  "startFromScratch",
  "noExistingLogo",
] as const;

export type Bf001LivePackageLockInput = {
  /** Existing business name — bf-001 never names or renames. */
  businessName: string;
  /** Customer-facing: Profile image XOR Cover graphic. Locked before payment. */
  graphicKind: string;
  /** Customer-supplied description of the current visual starting point. */
  visualStartingPointNotes: string;
  /** Materials note describing the supplied logo file/link. Required. */
  logoMaterialNote: string;
  likesDislikes: string;
  businessFacts: string;
  /**
   * Optional explicit source. Only `customer_supplied` (or omit) is allowed.
   * Invent-from-nothing / "we will design a new mark" fail closed.
   */
  startingPointSource?: string;
  [extra: string]: unknown;
};

export type Bf001PackageStartingPointIdentity = {
  visualStartingPointNotes: string;
  logoMaterialNote: string;
  likesDislikes: string;
  businessFacts: string;
};

export type Bf001PackageLiveTruth = {
  skuId: typeof DESIGN_RENDERER_BF_001_SKU;
  businessName: string;
  graphicKind: Bf001GraphicKind;
  lockedPackageMemberCount: 2;
  plannedMembers: readonly Bf001PlannedMember[];
  packageScope: "brand_refresh_two_member_package";
  startingPointSource: "customer_supplied";
  startingPoint: Bf001PackageStartingPointIdentity;
  existingBusinessName: true;
  lockedBeforePayment: true;
  newLogoRequested: false;
  namingRequested: false;
  messagingRequested: false;
  fontSectionMode: "recommendations_only";
  logoUsageMode: "usage_guidance_only";
  graphicFontPolicy: "studio_safe_only";
  completenessAuthority: "graphic_kind_locked_two_member_package_membership";
  countUnit: "member_identities";
  ownerRoutine: "NONE";
  packageId: typeof BF_001_INTAKE_PAYMENT_LOCK_PACKAGE_ID;
};

export type Bf001PackageManifestSeed = {
  status: "package_locked_pre_payment";
  skuId: typeof DESIGN_RENDERER_BF_001_SKU;
  graphicKind: Bf001GraphicKind;
  lockedPackageMemberCount: 2;
  packageScope: "brand_refresh_two_member_package";
  startingPointSource: "customer_supplied";
  countUnit: "member_identities";
  completenessAuthority: "graphic_kind_locked_two_member_package_membership";
  newLogoRequested: false;
  namingRequested: false;
  messagingRequested: false;
  fontSectionMode: "recommendations_only";
  logoUsageMode: "usage_guidance_only";
  graphicFontPolicy: "studio_safe_only";
  ownerRoutine: "NONE";
  businessName: string;
  startingPoint: Bf001PackageStartingPointIdentity;
  members: readonly {
    memberId: string;
    order: number;
    kind: string;
    memberPurpose: string;
    agreedPlateId: string;
  }[];
  note: string;
};

export type Bf001PackageFailureCode =
  | "MISSING_PACKAGE_LOCK"
  | "INVALID_PACKAGE_LOCK"
  | "UNSUPPORTED_GRAPHIC_KIND"
  | "NO_GRAPHIC_SELECTED"
  | "PROFILE_AND_COVER"
  | "BUSINESS_NAME_MISSING"
  | "MISSING_REQUIRED_TRUTH"
  | "STARTING_POINT_INSUFFICIENT"
  | "STARTING_POINT_NOT_CUSTOMER_SUPPLIED"
  | "FORBIDDEN_SCOPE_INTAKE"
  | "AMBIGUOUS_LEGACY_TRUTH"
  | "PARTIAL_PACKAGE_FORBIDDEN"
  | "MEMBERSHIP_TAMPER";

export type Bf001PackageMapResult =
  | {
      ok: true;
      truth: Bf001PackageLiveTruth;
      manifestSeed: Bf001PackageManifestSeed;
    }
  | {
      ok: false;
      code: Bf001PackageFailureCode;
      message: string;
    };

export type Bf001PaymentReadinessResult =
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
    }
  | {
      ok: false;
      applicable: true;
      code: "SKU_ONLY_INSUFFICIENT" | Bf001PackageFailureCode;
      message: string;
      blockCheckout: true;
    };

function isCustomerGraphicKindOption(
  v: string,
): v is Bf001CustomerGraphicKindOption {
  return (BF_001_CUSTOMER_GRAPHIC_KIND_OPTIONS as readonly string[]).includes(v);
}

function normalizeGraphicKind(raw: string): Bf001GraphicKind | null {
  const t = raw.trim();
  if (!t) return null;
  if (t === "profile" || t === "cover") return t;
  if (isCustomerGraphicKindOption(t)) {
    return CUSTOMER_GRAPHIC_KIND_TO_MACHINE[t];
  }
  const lower = t.toLowerCase();
  if (lower === "profile image" || lower === "profile") return "profile";
  if (lower === "cover graphic" || lower === "cover") return "cover";
  return null;
}

function detectForbiddenScopeFields(
  input: Bf001LivePackageLockInput,
): string[] {
  return BF_001_FORBIDDEN_SCOPE_INTAKE_FIELDS.filter(
    (k) => k in input && input[k] != null && String(input[k]).trim() !== "",
  );
}

function detectAmbiguousLegacyFields(
  input: Bf001LivePackageLockInput,
): string[] {
  return BF_001_AMBIGUOUS_LEGACY_FIELDS.filter(
    (k) => k in input && input[k] != null && String(input[k]).trim() !== "",
  );
}

export function buildBf001PackageManifestSeed(
  truth: Bf001PackageLiveTruth,
): Bf001PackageManifestSeed {
  return {
    status: "package_locked_pre_payment",
    skuId: DESIGN_RENDERER_BF_001_SKU,
    graphicKind: truth.graphicKind,
    lockedPackageMemberCount: 2,
    packageScope: "brand_refresh_two_member_package",
    startingPointSource: "customer_supplied",
    countUnit: "member_identities",
    completenessAuthority:
      "graphic_kind_locked_two_member_package_membership",
    newLogoRequested: false,
    namingRequested: false,
    messagingRequested: false,
    fontSectionMode: "recommendations_only",
    logoUsageMode: "usage_guidance_only",
    graphicFontPolicy: "studio_safe_only",
    ownerRoutine: "NONE",
    businessName: truth.businessName,
    startingPoint: truth.startingPoint,
    members: truth.plannedMembers.map((m) => ({
      memberId: m.memberId,
      order: m.order,
      kind: m.kind,
      memberPurpose: m.memberPurpose,
      agreedPlateId: m.agreedPlateId,
    })),
    note:
      "Brand Identity Refresh package = exactly 2 member identities (Brand Direction Sheet + one profile XOR cover graphic). Built from the customer's existing business name and supplied visual starting point. No naming, no new logo from scratch, no messaging. Sheet fonts are recommendations only; the Studio graphic renders Studio-safe faces.",
  };
}

function assertMembershipMatchesRecipe(
  truth: Pick<
    Bf001PackageLiveTruth,
    "graphicKind" | "lockedPackageMemberCount" | "plannedMembers"
  >,
): Bf001PackageMapResult | null {
  const recipe = recipeForGraphicKind(truth.graphicKind);
  const graphicKinds = new Set(
    truth.plannedMembers
      .filter((m) => m.memberId === "profile_or_cover_graphic")
      .map((m) => m.kind),
  );
  if (graphicKinds.has("design_profile") && graphicKinds.has("design_cover")) {
    return {
      ok: false,
      code: "PROFILE_AND_COVER",
      message:
        "PROFILE_AND_COVER: exactly one graphic kind per package — profile XOR cover",
    };
  }
  if (
    truth.plannedMembers.filter(
      (m) => m.memberId === "profile_or_cover_graphic",
    ).length > 1
  ) {
    return {
      ok: false,
      code: "PROFILE_AND_COVER",
      message: "PROFILE_AND_COVER: exactly one graphic member per package",
    };
  }
  if (
    truth.lockedPackageMemberCount !== 2 ||
    truth.plannedMembers.length !== 2
  ) {
    return {
      ok: false,
      code: "MEMBERSHIP_TAMPER",
      message:
        "MEMBERSHIP_TAMPER: sealed membership does not match the frozen 2-member refresh recipe",
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
        message: `MEMBERSHIP_TAMPER: expected ${expected.memberId} (${expected.kind}) at order ${expected.order} on plate ${expected.agreedPlateId}`,
      };
    }
  }
  const ids = new Set(truth.plannedMembers.map((m) => m.memberId));
  if (!ids.has("brand_direction_sheet")) {
    return {
      ok: false,
      code: "MEMBERSHIP_TAMPER",
      message:
        "MEMBERSHIP_TAMPER: brand_direction_sheet is always required in the refresh package",
    };
  }
  if (!ids.has("profile_or_cover_graphic")) {
    return {
      ok: false,
      code: "NO_GRAPHIC_SELECTED",
      message:
        "NO_GRAPHIC_SELECTED: the refresh package always includes one branded profile or cover graphic",
    };
  }
  return null;
}

/**
 * Map customer-locked live refresh answers → Machine package truth + manifest seed.
 * Graphic kind determines the graphic plate. Fail closed on missing starting
 * point, dual profile+cover, partial packages, and out-of-scope requests.
 */
export function mapBf001PackageLockFromLiveTruth(
  input: Bf001LivePackageLockInput | null | undefined,
): Bf001PackageMapResult {
  if (!input) {
    return {
      ok: false,
      code: "MISSING_PACKAGE_LOCK",
      message:
        "MISSING_PACKAGE_LOCK: Brand Identity Refresh requires one locked graphic kind (profile or cover), the existing business name, and a customer-supplied visual starting point before payment — skuId bf-001 alone is not enough",
    };
  }

  const forbidden = detectForbiddenScopeFields(input);
  if (forbidden.length) {
    return {
      ok: false,
      code: "FORBIDDEN_SCOPE_INTAKE",
      message: `FORBIDDEN_SCOPE_INTAKE: bf-001 refreshes an existing presentation and never collects naming, new-logo-from-scratch, or messaging requests (${forbidden.join(", ")})`,
    };
  }

  if (
    input.partialPackage === true ||
    input.sheetOnly === true ||
    input.graphicOnly === true ||
    (Array.isArray(input.memberIds) && input.memberIds.length > 0) ||
    (Array.isArray(input.membersOverride) && input.membersOverride.length > 0)
  ) {
    return {
      ok: false,
      code: "PARTIAL_PACKAGE_FORBIDDEN",
      message:
        "PARTIAL_PACKAGE_FORBIDDEN: sheet-only / graphic-only compositions are not purchasable — both refresh members are mandatory before payment",
    };
  }

  const sourceRaw = String(input.startingPointSource ?? "customer_supplied")
    .trim()
    .toLowerCase();
  if (
    sourceRaw !== "customer_supplied" &&
    sourceRaw !== "" &&
    sourceRaw !== "customer supplied"
  ) {
    return {
      ok: false,
      code: "STARTING_POINT_NOT_CUSTOMER_SUPPLIED",
      message:
        "STARTING_POINT_NOT_CUSTOMER_SUPPLIED: the visual starting point must be customer-supplied — invent-from-nothing, new marks, or “we will decide later” are not sold paths",
    };
  }

  const ambiguous = detectAmbiguousLegacyFields(input);
  if (ambiguous.length) {
    return {
      ok: false,
      code: "AMBIGUOUS_LEGACY_TRUTH",
      message: `AMBIGUOUS_LEGACY_TRUTH: fields ${ambiguous.join(", ")} cannot substitute for an explicit profile-XOR-cover lock with a customer-supplied visual starting point`,
    };
  }

  const graphicKindRaw = String(input.graphicKind ?? "").trim();
  if (!graphicKindRaw) {
    return {
      ok: false,
      code: "NO_GRAPHIC_SELECTED",
      message:
        "NO_GRAPHIC_SELECTED: choose Profile image or Cover graphic before payment — the refresh package includes exactly one",
    };
  }
  const graphicKind = normalizeGraphicKind(graphicKindRaw);
  if (!graphicKind) {
    return {
      ok: false,
      code: "UNSUPPORTED_GRAPHIC_KIND",
      message: `UNSUPPORTED_GRAPHIC_KIND: "${graphicKindRaw}" is not Profile image or Cover graphic. No closest-match substitution.`,
    };
  }

  const businessName = String(input.businessName ?? "").trim();
  if (!businessName) {
    return {
      ok: false,
      code: "BUSINESS_NAME_MISSING",
      message:
        "BUSINESS_NAME_MISSING: bf-001 refreshes an existing business name — naming is not in scope, so the current name is required",
    };
  }

  const visualStartingPointNotes = String(
    input.visualStartingPointNotes ?? "",
  ).trim();
  const logoMaterialNote = String(input.logoMaterialNote ?? "").trim();
  if (!visualStartingPointNotes) {
    return {
      ok: false,
      code: "STARTING_POINT_INSUFFICIENT",
      message:
        "STARTING_POINT_INSUFFICIENT: describe your current visual starting point (logo, colors, fonts, visible materials) before payment — bf-001 refines what exists",
    };
  }
  if (!logoMaterialNote) {
    return {
      ok: false,
      code: "STARTING_POINT_INSUFFICIENT",
      message:
        "STARTING_POINT_INSUFFICIENT: a supplied logo material note is required — bf-001 places your existing mark and never draws a new one",
    };
  }

  const likesDislikes = String(input.likesDislikes ?? "").trim();
  const businessFacts = String(input.businessFacts ?? "").trim();
  if (!likesDislikes) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: examples of what you like and dislike are required for palette and font recommendations",
    };
  }
  if (!businessFacts) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: accurate business information is required for the Brand Direction Sheet",
    };
  }

  const recipe = recipeForGraphicKind(graphicKind);
  const truth: Bf001PackageLiveTruth = {
    skuId: DESIGN_RENDERER_BF_001_SKU,
    businessName,
    graphicKind,
    lockedPackageMemberCount: 2,
    plannedMembers: recipe.plannedMembers,
    packageScope: "brand_refresh_two_member_package",
    startingPointSource: "customer_supplied",
    startingPoint: {
      visualStartingPointNotes,
      logoMaterialNote,
      likesDislikes,
      businessFacts,
    },
    existingBusinessName: true,
    lockedBeforePayment: true,
    newLogoRequested: false,
    namingRequested: false,
    messagingRequested: false,
    fontSectionMode: "recommendations_only",
    logoUsageMode: "usage_guidance_only",
    graphicFontPolicy: "studio_safe_only",
    completenessAuthority:
      "graphic_kind_locked_two_member_package_membership",
    countUnit: "member_identities",
    ownerRoutine: "NONE",
    packageId: BF_001_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
  };

  const membership = assertMembershipMatchesRecipe(truth);
  if (membership) return membership;

  return {
    ok: true,
    truth,
    manifestSeed: buildBf001PackageManifestSeed(truth),
  };
}

export function bf001LivePackageLockFromFlatAnswers(
  answers: Record<string, string>,
): Bf001LivePackageLockInput | Bf001PackageMapResult {
  const graphicKind =
    answers[BF_001_PACKAGE_LOCK_FIELD_IDS.graphicKind]?.trim() ?? "";
  if (!graphicKind) {
    return {
      ok: false,
      code: "NO_GRAPHIC_SELECTED",
      message:
        "NO_GRAPHIC_SELECTED: Profile image or Cover graphic is required before payment",
    };
  }
  const input: Bf001LivePackageLockInput = {
    businessName: answers[BF_001_PACKAGE_LOCK_FIELD_IDS.businessName] ?? "",
    graphicKind,
    visualStartingPointNotes:
      answers[BF_001_PACKAGE_LOCK_FIELD_IDS.visualStartingPointNotes] ?? "",
    logoMaterialNote:
      answers[BF_001_PACKAGE_LOCK_FIELD_IDS.logoMaterialNote] ?? "",
    likesDislikes: answers[BF_001_PACKAGE_LOCK_FIELD_IDS.likesDislikes] ?? "",
    businessFacts: answers[BF_001_PACKAGE_LOCK_FIELD_IDS.businessFacts] ?? "",
  };
  for (const k of [
    ...BF_001_FORBIDDEN_SCOPE_INTAKE_FIELDS,
    ...BF_001_AMBIGUOUS_LEGACY_FIELDS,
  ]) {
    if (answers[k] != null && String(answers[k]).trim() !== "") {
      input[k] = answers[k];
    }
  }
  return input;
}

/**
 * Checkout / payment gate: if bf-001 is selected, the package lock must be present.
 * skuId alone → block checkout.
 */
export function assertBf001PackageReadyForPayment(input: {
  selectedServiceIds: readonly string[];
  packageLock:
    | Bf001LivePackageLockInput
    | Bf001PackageLiveTruth
    | null
    | undefined;
}): Bf001PaymentReadinessResult {
  const hasSku = input.selectedServiceIds.includes(DESIGN_RENDERER_BF_001_SKU);
  if (!hasSku) {
    return { ok: true, applicable: false, reason: "bf-001_not_selected" };
  }

  if (!input.packageLock) {
    return {
      ok: false,
      applicable: true,
      code: "SKU_ONLY_INSUFFICIENT",
      message:
        "SKU_ONLY_INSUFFICIENT: selected service bf-001 (Brand Identity Refresh) has no locked refresh package. Checkout cannot accept payment until the customer locks one graphic kind (profile or cover), confirms the existing business name, and supplies the visual starting point including the logo material note.",
      blockCheckout: true,
    };
  }

  if (
    typeof input.packageLock === "object" &&
    "plannedMembers" in input.packageLock &&
    "lockedBeforePayment" in input.packageLock
  ) {
    const truth = input.packageLock as Bf001PackageLiveTruth;
    if (
      !truth.lockedBeforePayment ||
      truth.skuId !== DESIGN_RENDERER_BF_001_SKU ||
      truth.newLogoRequested !== false ||
      truth.namingRequested !== false ||
      truth.messagingRequested !== false ||
      truth.startingPointSource !== "customer_supplied" ||
      truth.packageScope !== "brand_refresh_two_member_package" ||
      truth.fontSectionMode !== "recommendations_only" ||
      truth.logoUsageMode !== "usage_guidance_only" ||
      truth.graphicFontPolicy !== "studio_safe_only" ||
      truth.ownerRoutine !== "NONE"
    ) {
      return {
        ok: false,
        applicable: true,
        code: "INVALID_PACKAGE_LOCK",
        message:
          "INVALID_PACKAGE_LOCK: refresh package truth is incomplete or unsafe for payment",
        blockCheckout: true,
      };
    }
    if (!truth.businessName?.trim()) {
      return {
        ok: false,
        applicable: true,
        code: "BUSINESS_NAME_MISSING",
        message:
          "BUSINESS_NAME_MISSING: sealed refresh package is missing the existing business name",
        blockCheckout: true,
      };
    }
    if (
      !truth.startingPoint?.visualStartingPointNotes?.trim() ||
      !truth.startingPoint?.logoMaterialNote?.trim() ||
      !truth.startingPoint?.likesDislikes?.trim() ||
      !truth.startingPoint?.businessFacts?.trim()
    ) {
      return {
        ok: false,
        applicable: true,
        code: "STARTING_POINT_INSUFFICIENT",
        message:
          "STARTING_POINT_INSUFFICIENT: sealed refresh package is missing the customer-supplied visual starting point",
        blockCheckout: true,
      };
    }
    const membership = assertMembershipMatchesRecipe(truth);
    if (membership && !membership.ok) {
      return {
        ok: false,
        applicable: true,
        code: membership.code,
        message: membership.message,
        blockCheckout: true,
      };
    }
    return {
      ok: true,
      applicable: true,
      truth,
      manifestSeed: buildBf001PackageManifestSeed(truth),
    };
  }

  const mapped = mapBf001PackageLockFromLiveTruth(
    input.packageLock as Bf001LivePackageLockInput,
  );
  if (!mapped.ok) {
    return {
      ok: false,
      applicable: true,
      code: mapped.code,
      message: mapped.message,
      blockCheckout: true,
    };
  }
  return {
    ok: true,
    applicable: true,
    truth: mapped.truth,
    manifestSeed: mapped.manifestSeed,
  };
}

/** Customer-facing Plan lines — no producer jargon. */
export function customerFacingBf001PackageLines(
  truth: Bf001PackageLiveTruth,
): readonly string[] {
  const graphicLabel =
    truth.graphicKind === "profile" ? "profile image" : "cover graphic";
  return [
    `Brand Identity Refresh — 2 pieces: a one-page Brand Direction Sheet and one branded ${graphicLabel}`,
    "Built from your existing business name and the logo and colors you already use — not a new name or a new logo",
    "Font pairings on the sheet are recommendations for your own materials; the graphic we deliver uses Studio-safe fonts",
  ];
}
