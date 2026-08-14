/**
 * STUDIO-OPERATING-DESIGN-RM-J002-INTAKE-PAYMENT-LOCK-1 (intake half)
 *
 * Map customer-locked platform + approved business facts → authoritative kit
 * membership **before payment**. skuId `rm-j002` alone is NOT enough for checkout.
 *
 * No remap · no dispatch · no renderer invoke.
 */

import {
  recipeForPlatform,
  isRmJ002Platform,
} from "./rm-j002-contracts";
import {
  DESIGN_RENDERER_RM_J002_SKU,
  type RmJ002Platform,
  type RmJ002PlannedKitMember,
} from "./rm-j002-types";

export const RM_J002_INTAKE_PAYMENT_LOCK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-RM-J002-INTAKE-PAYMENT-LOCK-1" as const;

/** Customer-facing platform labels (intake select). */
export const RM_J002_CUSTOMER_PLATFORM_OPTIONS = [
  "Facebook",
  "Instagram",
  "TikTok",
] as const;

export type RmJ002CustomerPlatformOption =
  (typeof RM_J002_CUSTOMER_PLATFORM_OPTIONS)[number];

const CUSTOMER_PLATFORM_TO_MACHINE: Record<
  RmJ002CustomerPlatformOption,
  RmJ002Platform
> = {
  Facebook: "facebook",
  Instagram: "instagram",
  TikTok: "tiktok",
};

/** Flat live intake field ids for social-setup → kit lock. */
export const RM_J002_KIT_LOCK_FIELD_IDS = {
  platform: "platform",
  businessName: "businessName",
  displayName: "displayName",
  profileGoal: "profileGoal",
  currentProfileNotes: "currentProfileNotes",
  website: "website",
  phone: "phone",
  brandNotes: "brandNotes",
} as const;

/**
 * Fields that must never appear on the sold kit path — Studio never requests
 * platform login, admin invite, or credentials for rm-j002.
 */
export const RM_J002_FORBIDDEN_CREDENTIAL_INTAKE_FIELDS = [
  "platformLogin",
  "adminInvite",
  "adminInvitation",
  "pageAdminInvite",
  "password",
  "passwd",
  "loginPassword",
  "accountPassword",
  "credentials",
  "credentialShare",
  "oauthToken",
  "accessToken",
  "secureAccess",
  "accountAccess",
  "shareAccess",
  "loginForStudio",
  "studioLogin",
] as const;

/** Ambiguous legacy keys that cannot substitute for an explicit platform lock. */
export const RM_J002_AMBIGUOUS_LEGACY_FIELDS = [
  "platforms",
  "allPlatforms",
  "anyPlatform",
  "platformOrSimilar",
  "coverRequested",
  "instagramCover",
  "tiktokCover",
  "mutationRequested",
  "credentialsPresent",
] as const;

export type RmJ002LiveKitLockInput = {
  /** Customer label or machine id — normalized in map. */
  platform: string;
  businessName: string;
  displayName: string;
  profileGoal: string;
  currentProfileNotes: string;
  /** Optional when customer has no public URL yet. */
  website?: string;
  phone?: string;
  /** Brand/logo notes or material pointer — required for avatar plate. */
  brandNotes: string;
  [extra: string]: unknown;
};

export type RmJ002KitLiveTruth = {
  skuId: typeof DESIGN_RENDERER_RM_J002_SKU;
  platform: RmJ002Platform;
  lockedKitMemberCount: 3 | 4;
  plannedKitMembers: readonly RmJ002PlannedKitMember[];
  businessName: string;
  displayName: string;
  profileGoal: string;
  currentProfileNotes: string;
  website?: string;
  phone?: string;
  brandNotes: string;
  lockedBeforePayment: true;
  credentialsPresent: false;
  mutationRequested: false;
  customerApplies: true;
  accountMutation: false;
  completenessAuthority: "platform_locked_kit_membership";
  countUnit: "kit_member_identities";
  ownerRoutine: "NONE";
  packageId: typeof RM_J002_INTAKE_PAYMENT_LOCK_PACKAGE_ID;
};

export type RmJ002KitManifestSeed = {
  status: "kit_locked_pre_payment";
  skuId: typeof DESIGN_RENDERER_RM_J002_SKU;
  platform: RmJ002Platform;
  lockedKitMemberCount: 3 | 4;
  countUnit: "kit_member_identities";
  completenessAuthority: "platform_locked_kit_membership";
  credentialsPresent: false;
  mutationRequested: false;
  customerApplies: true;
  accountMutation: false;
  ownerRoutine: "NONE";
  businessName: string;
  displayName: string;
  profileGoal: string;
  currentProfileNotes: string;
  website?: string;
  phone?: string;
  brandNotes: string;
  members: readonly {
    memberId: string;
    order: number;
    kind: string;
    memberPurpose: string;
    agreedPlateId?: string;
  }[];
  note: string;
};

export type RmJ002KitMapResult =
  | { ok: true; truth: RmJ002KitLiveTruth; manifestSeed: RmJ002KitManifestSeed }
  | {
      ok: false;
      code:
        | "MISSING_KIT_LOCK"
        | "INVALID_KIT_LOCK"
        | "UNSUPPORTED_PLATFORM"
        | "UNSUPPORTED_USE"
        | "MISSING_REQUIRED_TRUTH"
        | "FORBIDDEN_CREDENTIAL_INTAKE"
        | "AMBIGUOUS_LEGACY_TRUTH"
        | "COVER_FORBIDDEN";
      message: string;
    };

export type RmJ002PaymentReadinessResult =
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
    }
  | {
      ok: false;
      applicable: true;
      code:
        | "SKU_ONLY_INSUFFICIENT"
        | "MISSING_KIT_LOCK"
        | "INVALID_KIT_LOCK"
        | "UNSUPPORTED_PLATFORM"
        | "UNSUPPORTED_USE"
        | "MISSING_REQUIRED_TRUTH"
        | "FORBIDDEN_CREDENTIAL_INTAKE"
        | "AMBIGUOUS_LEGACY_TRUTH"
        | "COVER_FORBIDDEN"
        | "MEMBERSHIP_TAMPER";
      message: string;
      blockCheckout: true;
    };

function isCustomerPlatformOption(
  v: string,
): v is RmJ002CustomerPlatformOption {
  return (RM_J002_CUSTOMER_PLATFORM_OPTIONS as readonly string[]).includes(v);
}

function normalizePlatform(
  raw: string,
): RmJ002Platform | null {
  const t = raw.trim();
  if (isRmJ002Platform(t)) return t;
  if (isCustomerPlatformOption(t)) return CUSTOMER_PLATFORM_TO_MACHINE[t];
  const lower = t.toLowerCase();
  if (lower === "facebook" || lower === "instagram" || lower === "tiktok") {
    return lower;
  }
  return null;
}

function detectForbiddenCredentialFields(
  input: RmJ002LiveKitLockInput,
): string[] {
  return RM_J002_FORBIDDEN_CREDENTIAL_INTAKE_FIELDS.filter(
    (k) => k in input && input[k] != null && String(input[k]).trim() !== "",
  );
}

function detectAmbiguousLegacyFields(
  input: RmJ002LiveKitLockInput,
): string[] {
  return RM_J002_AMBIGUOUS_LEGACY_FIELDS.filter(
    (k) => k in input && input[k] != null && String(input[k]).trim() !== "",
  );
}

export function buildRmJ002KitManifestSeed(
  truth: RmJ002KitLiveTruth,
): RmJ002KitManifestSeed {
  return {
    status: "kit_locked_pre_payment",
    skuId: DESIGN_RENDERER_RM_J002_SKU,
    platform: truth.platform,
    lockedKitMemberCount: truth.lockedKitMemberCount,
    countUnit: "kit_member_identities",
    completenessAuthority: "platform_locked_kit_membership",
    credentialsPresent: false,
    mutationRequested: false,
    customerApplies: true,
    accountMutation: false,
    ownerRoutine: "NONE",
    businessName: truth.businessName,
    displayName: truth.displayName,
    profileGoal: truth.profileGoal,
    currentProfileNotes: truth.currentProfileNotes,
    ...(truth.website ? { website: truth.website } : {}),
    ...(truth.phone ? { phone: truth.phone } : {}),
    brandNotes: truth.brandNotes,
    members: truth.plannedKitMembers.map((m) => ({
      memberId: m.memberId,
      order: m.order,
      kind: m.kind,
      memberPurpose: m.memberPurpose,
      ...(m.agreedPlateId ? { agreedPlateId: m.agreedPlateId } : {}),
    })),
    note:
      "Kit completeness = platform-locked member identities N/N. Customer applies the kit — Studio does not log in or publish.",
  };
}

/**
 * Map customer-locked live kit answers → Machine kit truth + manifest seed.
 * Platform determines exact membership. Fail closed on unsupported use.
 */
export function mapRmJ002KitLockFromLiveTruth(
  input: RmJ002LiveKitLockInput | null | undefined,
): RmJ002KitMapResult {
  if (!input) {
    return {
      ok: false,
      code: "MISSING_KIT_LOCK",
      message:
        "MISSING_KIT_LOCK: Social Profile Setup Kit requires one locked platform and approved business facts before payment — skuId rm-j002 alone is not enough",
    };
  }

  const forbidden = detectForbiddenCredentialFields(input);
  if (forbidden.length) {
    return {
      ok: false,
      code: "FORBIDDEN_CREDENTIAL_INTAKE",
      message: `FORBIDDEN_CREDENTIAL_INTAKE: rm-j002 never collects platform login, admin invite, or credentials (${forbidden.join(", ")}). Customer applies the delivered kit.`,
    };
  }

  const platform = normalizePlatform(String(input.platform ?? ""));
  if (!platform) {
    return {
      ok: false,
      code: "UNSUPPORTED_PLATFORM",
      message: `UNSUPPORTED_PLATFORM: "${String(input.platform ?? "")}" is not Facebook, Instagram, or TikTok. No closest-match substitution.`,
    };
  }

  // Explicit cover request on IG/TT fails closed before ambiguous-key handling.
  if (
    (platform === "instagram" || platform === "tiktok") &&
    (Boolean(input.coverRequested) ||
      Boolean(input.instagramCover) ||
      Boolean(input.tiktokCover))
  ) {
    return {
      ok: false,
      code: "COVER_FORBIDDEN",
      message:
        "COVER_FORBIDDEN: Instagram and TikTok kits do not include a profile cover/banner",
    };
  }

  const ambiguous = detectAmbiguousLegacyFields(input);
  if (ambiguous.length) {
    return {
      ok: false,
      code: "AMBIGUOUS_LEGACY_TRUTH",
      message: `AMBIGUOUS_LEGACY_TRUTH: fields ${ambiguous.join(", ")} cannot substitute for an explicit single-platform kit lock`,
    };
  }

  const businessName = String(input.businessName ?? "").trim();
  const displayName = String(input.displayName ?? "").trim();
  const profileGoal = String(input.profileGoal ?? "").trim();
  const currentProfileNotes = String(input.currentProfileNotes ?? "").trim();
  const brandNotes = String(input.brandNotes ?? "").trim();
  const website = String(input.website ?? "").trim() || undefined;
  const phone = String(input.phone ?? "").trim() || undefined;

  if (!businessName) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: "MISSING_REQUIRED_TRUTH: business or profile name is required",
    };
  }
  if (!displayName) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: "MISSING_REQUIRED_TRUTH: approved display name is required",
    };
  }
  if (!profileGoal) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: profile goal is required for Studio-written scoped copy",
    };
  }
  if (!currentProfileNotes) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: current profile notes (or new-setup direction) are required",
    };
  }
  if (!brandNotes) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: approved brand/logo material notes are required for the avatar",
    };
  }

  const recipe = recipeForPlatform(platform);
  const truth: RmJ002KitLiveTruth = {
    skuId: DESIGN_RENDERER_RM_J002_SKU,
    platform,
    lockedKitMemberCount: recipe.lockedKitMemberCount,
    plannedKitMembers: recipe.plannedKitMembers,
    businessName,
    displayName,
    profileGoal,
    currentProfileNotes,
    ...(website ? { website } : {}),
    ...(phone ? { phone } : {}),
    brandNotes,
    lockedBeforePayment: true,
    credentialsPresent: false,
    mutationRequested: false,
    customerApplies: true,
    accountMutation: false,
    completenessAuthority: "platform_locked_kit_membership",
    countUnit: "kit_member_identities",
    ownerRoutine: "NONE",
    packageId: RM_J002_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
  };

  return {
    ok: true,
    truth,
    manifestSeed: buildRmJ002KitManifestSeed(truth),
  };
}

/** Map flat social-setup answers → live kit lock input (or fail). */
export function rmJ002LiveKitLockFromFlatAnswers(
  answers: Record<string, string>,
): RmJ002LiveKitLockInput | RmJ002KitMapResult {
  const platform = answers[RM_J002_KIT_LOCK_FIELD_IDS.platform]?.trim() ?? "";
  if (!platform) {
    return {
      ok: false,
      code: "MISSING_KIT_LOCK",
      message: "MISSING_KIT_LOCK: platform is required before payment",
    };
  }
  const input: RmJ002LiveKitLockInput = {
    platform,
    businessName: answers[RM_J002_KIT_LOCK_FIELD_IDS.businessName] ?? "",
    displayName:
      answers[RM_J002_KIT_LOCK_FIELD_IDS.displayName]?.trim() ||
      answers[RM_J002_KIT_LOCK_FIELD_IDS.businessName] ||
      "",
    profileGoal: answers[RM_J002_KIT_LOCK_FIELD_IDS.profileGoal] ?? "",
    currentProfileNotes:
      answers[RM_J002_KIT_LOCK_FIELD_IDS.currentProfileNotes] ?? "",
    website: answers[RM_J002_KIT_LOCK_FIELD_IDS.website],
    phone: answers[RM_J002_KIT_LOCK_FIELD_IDS.phone],
    brandNotes: answers[RM_J002_KIT_LOCK_FIELD_IDS.brandNotes] ?? "",
  };
  for (const k of [
    ...RM_J002_FORBIDDEN_CREDENTIAL_INTAKE_FIELDS,
    ...RM_J002_AMBIGUOUS_LEGACY_FIELDS,
  ]) {
    if (answers[k] != null && String(answers[k]).trim() !== "") {
      input[k] = answers[k];
    }
  }
  return input;
}

/**
 * Checkout / payment gate: if rm-j002 is selected, kit lock must be present.
 * skuId alone → block checkout.
 */
export function assertRmJ002KitReadyForPayment(input: {
  selectedServiceIds: readonly string[];
  kitLock: RmJ002LiveKitLockInput | RmJ002KitLiveTruth | null | undefined;
}): RmJ002PaymentReadinessResult {
  const hasSku = input.selectedServiceIds.includes(DESIGN_RENDERER_RM_J002_SKU);
  if (!hasSku) {
    return { ok: true, applicable: false, reason: "rm-j002_not_selected" };
  }

  if (!input.kitLock) {
    return {
      ok: false,
      applicable: true,
      code: "SKU_ONLY_INSUFFICIENT",
      message:
        "SKU_ONLY_INSUFFICIENT: selected service rm-j002 (Social Profile Setup Kit) has no locked platform kit. Checkout cannot accept payment until the customer locks exactly one platform and the approved business facts for that kit.",
      blockCheckout: true,
    };
  }

  if (
    typeof input.kitLock === "object" &&
    "plannedKitMembers" in input.kitLock &&
    "lockedBeforePayment" in input.kitLock
  ) {
    const truth = input.kitLock as RmJ002KitLiveTruth;
    if (
      !truth.lockedBeforePayment ||
      truth.skuId !== DESIGN_RENDERER_RM_J002_SKU ||
      truth.credentialsPresent !== false ||
      truth.mutationRequested !== false
    ) {
      return {
        ok: false,
        applicable: true,
        code: "INVALID_KIT_LOCK",
        message: "INVALID_KIT_LOCK: kit truth is incomplete or unsafe for payment",
        blockCheckout: true,
      };
    }
    const recipe = recipeForPlatform(truth.platform);
    if (
      truth.lockedKitMemberCount !== recipe.lockedKitMemberCount ||
      truth.plannedKitMembers.length !== recipe.lockedKitMemberCount
    ) {
      return {
        ok: false,
        applicable: true,
        code: "MEMBERSHIP_TAMPER",
        message:
          "MEMBERSHIP_TAMPER: sealed kit membership does not match the locked platform recipe",
        blockCheckout: true,
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
          applicable: true,
          code: "MEMBERSHIP_TAMPER",
          message: `MEMBERSHIP_TAMPER: expected ${expected.memberId} at order ${expected.order}`,
          blockCheckout: true,
        };
      }
    }
    return {
      ok: true,
      applicable: true,
      truth,
      manifestSeed: buildRmJ002KitManifestSeed(truth),
    };
  }

  const mapped = mapRmJ002KitLockFromLiveTruth(
    input.kitLock as RmJ002LiveKitLockInput,
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
export function customerFacingRmJ002KitLines(
  truth: RmJ002KitLiveTruth,
): readonly string[] {
  const platformLabel =
    truth.platform === "facebook"
      ? "Facebook"
      : truth.platform === "instagram"
        ? "Instagram"
        : "TikTok";
  return [
    `${platformLabel} profile kit — ${truth.lockedKitMemberCount} pieces`,
    `Display name: ${truth.displayName}`,
    "You apply every field and upload on the platform. The Studio does not log in or publish.",
  ];
}
