/**
 * STUDIO-OPERATING-DESIGN-RM-J008-INTAKE-PAYMENT-LOCK-1 (intake half)
 *
 * Map customer-locked platform + customer-supplied before-state + after intent
 * → authoritative full replacement Update Kit membership **before payment**.
 * skuId `rm-j008` alone is NOT enough for checkout.
 *
 * Hard boundary: before-state is customer-supplied truth only — never
 * “inspect the live profile later,” scrape, login, or readback.
 *
 * No remap · no dispatch · no renderer invoke.
 */

import {
  recipeForUpdatePlatform,
  isRmJ008Platform,
} from "./rm-j008-contracts";
import {
  DESIGN_RENDERER_RM_J008_SKU,
  type RmJ008Platform,
  type RmJ008PlannedKitMember,
} from "./rm-j008-types";

export const RM_J008_INTAKE_PAYMENT_LOCK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-RM-J008-INTAKE-PAYMENT-LOCK-1" as const;

export const RM_J008_CUSTOMER_PLATFORM_OPTIONS = [
  "Facebook",
  "Instagram",
  "TikTok",
] as const;

export type RmJ008CustomerPlatformOption =
  (typeof RM_J008_CUSTOMER_PLATFORM_OPTIONS)[number];

const CUSTOMER_PLATFORM_TO_MACHINE: Record<
  RmJ008CustomerPlatformOption,
  RmJ008Platform
> = {
  Facebook: "facebook",
  Instagram: "instagram",
  TikTok: "tiktok",
};

/** Flat live intake field ids for social-update → kit lock. */
export const RM_J008_KIT_LOCK_FIELD_IDS = {
  platform: "platform",
  businessName: "businessName",
  customerControlsExistingProfile: "customerControlsExistingProfile",
  beforeDisplayName: "beforeDisplayName",
  beforeBioOrAbout: "beforeBioOrAbout",
  beforeWebsite: "beforeWebsite",
  beforePhone: "beforePhone",
  beforeProfileImageNote: "beforeProfileImageNote",
  beforePageCoverNote: "beforePageCoverNote",
  afterDisplayName: "afterDisplayName",
  profileGoal: "profileGoal",
  updateIntentNotes: "updateIntentNotes",
  afterWebsite: "afterWebsite",
  afterPhone: "afterPhone",
  brandNotes: "brandNotes",
  avatarAction: "avatarAction",
  coverAction: "coverAction",
} as const;

export const RM_J008_FORBIDDEN_CREDENTIAL_INTAKE_FIELDS = [
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

/** Cannot substitute for customer-supplied before-state or full-kit lock. */
export const RM_J008_AMBIGUOUS_LEGACY_FIELDS = [
  "platforms",
  "allPlatforms",
  "anyPlatform",
  "platformOrSimilar",
  "coverRequested",
  "instagramCover",
  "tiktokCover",
  "mutationRequested",
  "credentialsPresent",
  "inspectLiveProfile",
  "scrapeProfile",
  "platformReadback",
  "liveProfileInspect",
  "weWillCheckLater",
  "bioOnly",
  "changedMembersOnly",
  "partialKit",
  "kitMemberIds",
  "membersOverride",
] as const;

export type RmJ008LiveKitLockInput = {
  platform: string;
  businessName: string;
  /** Must affirm existing profile control — not new setup. */
  customerControlsExistingProfile: boolean | "Yes" | "true" | true;
  beforeDisplayName: string;
  beforeBioOrAbout: string;
  beforeWebsite: string;
  beforePhone: string;
  beforeProfileImageNote: string;
  /** Required when platform is Facebook. */
  beforePageCoverNote?: string;
  afterDisplayName: string;
  profileGoal: string;
  updateIntentNotes: string;
  afterWebsite: string;
  afterPhone: string;
  brandNotes: string;
  /** Customer-facing: Keep current look / Replace with new from brand materials */
  avatarAction: string;
  /** Facebook only — Keep / Replace. IG/TT must be absent or Not applicable. */
  coverAction?: string;
  /**
   * Optional explicit source. Only `customer_supplied` (or omit) is allowed.
   * Live inspect / scrape / readback fail closed.
   */
  beforeStateSource?: string;
  [extra: string]: unknown;
};

export type RmJ008KitLiveTruth = {
  skuId: typeof DESIGN_RENDERER_RM_J008_SKU;
  platform: RmJ008Platform;
  lockedKitMemberCount: 4 | 5;
  plannedKitMembers: readonly RmJ008PlannedKitMember[];
  replacementKitScope: "full_platform_replacement_kit";
  beforeStateSource: "customer_supplied";
  before: {
    displayName: string;
    bioOrAbout: string;
    website: string;
    phone: string;
    profileImageNote: string;
    pageCoverNote?: string;
  };
  after: {
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
  customerControlsExistingProfile: true;
  lockedBeforePayment: true;
  credentialsPresent: false;
  mutationRequested: false;
  partialKitRequested: false;
  customerApplies: true;
  accountMutation: false;
  completenessAuthority: "platform_locked_full_replacement_kit_membership";
  countUnit: "kit_member_identities";
  ownerRoutine: "NONE";
  packageId: typeof RM_J008_INTAKE_PAYMENT_LOCK_PACKAGE_ID;
};

export type RmJ008KitManifestSeed = {
  status: "kit_locked_pre_payment";
  skuId: typeof DESIGN_RENDERER_RM_J008_SKU;
  platform: RmJ008Platform;
  lockedKitMemberCount: 4 | 5;
  replacementKitScope: "full_platform_replacement_kit";
  beforeStateSource: "customer_supplied";
  countUnit: "kit_member_identities";
  completenessAuthority: "platform_locked_full_replacement_kit_membership";
  credentialsPresent: false;
  mutationRequested: false;
  partialKitRequested: false;
  customerApplies: true;
  accountMutation: false;
  ownerRoutine: "NONE";
  before: RmJ008KitLiveTruth["before"];
  after: RmJ008KitLiveTruth["after"];
  members: readonly {
    memberId: string;
    order: number;
    kind: string;
    memberPurpose: string;
    agreedPlateId?: string;
  }[];
  note: string;
};

export type RmJ008KitMapResult =
  | { ok: true; truth: RmJ008KitLiveTruth; manifestSeed: RmJ008KitManifestSeed }
  | {
      ok: false;
      code:
        | "MISSING_KIT_LOCK"
        | "INVALID_KIT_LOCK"
        | "UNSUPPORTED_PLATFORM"
        | "UNSUPPORTED_USE"
        | "MISSING_REQUIRED_TRUTH"
        | "MISSING_BEFORE_STATE"
        | "BEFORE_STATE_NOT_CUSTOMER_SUPPLIED"
        | "FORBIDDEN_CREDENTIAL_INTAKE"
        | "AMBIGUOUS_LEGACY_TRUTH"
        | "COVER_FORBIDDEN"
        | "COVER_REQUIRED"
        | "PARTIAL_KIT_FORBIDDEN"
        | "MEMBERSHIP_TAMPER";
      message: string;
    };

export type RmJ008PaymentReadinessResult =
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
        | "MISSING_BEFORE_STATE"
        | "BEFORE_STATE_NOT_CUSTOMER_SUPPLIED"
        | "FORBIDDEN_CREDENTIAL_INTAKE"
        | "AMBIGUOUS_LEGACY_TRUTH"
        | "COVER_FORBIDDEN"
        | "COVER_REQUIRED"
        | "PARTIAL_KIT_FORBIDDEN"
        | "MEMBERSHIP_TAMPER";
      message: string;
      blockCheckout: true;
    };

function isCustomerPlatformOption(
  v: string,
): v is RmJ008CustomerPlatformOption {
  return (RM_J008_CUSTOMER_PLATFORM_OPTIONS as readonly string[]).includes(v);
}

function normalizePlatform(raw: string): RmJ008Platform | null {
  const t = raw.trim();
  if (isRmJ008Platform(t)) return t;
  if (isCustomerPlatformOption(t)) return CUSTOMER_PLATFORM_TO_MACHINE[t];
  const lower = t.toLowerCase();
  if (lower === "facebook" || lower === "instagram" || lower === "tiktok") {
    return lower;
  }
  return null;
}

function detectForbiddenCredentialFields(
  input: RmJ008LiveKitLockInput,
): string[] {
  return RM_J008_FORBIDDEN_CREDENTIAL_INTAKE_FIELDS.filter(
    (k) => k in input && input[k] != null && String(input[k]).trim() !== "",
  );
}

function detectAmbiguousLegacyFields(
  input: RmJ008LiveKitLockInput,
): string[] {
  return RM_J008_AMBIGUOUS_LEGACY_FIELDS.filter(
    (k) => k in input && input[k] != null && String(input[k]).trim() !== "",
  );
}

function truthyAffirmation(value: unknown): boolean {
  if (value === true) return true;
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return s === "yes" || s === "true" || s === "1";
}

function normalizeAvatarAction(
  raw: string,
): "reissue_unchanged" | "replace" | null {
  const t = raw.trim().toLowerCase();
  if (
    t === "reissue_unchanged" ||
    t === "keep" ||
    t === "unchanged" ||
    t === "keep current look" ||
    t === "leave as-is" ||
    t.startsWith("keep current")
  ) {
    return "reissue_unchanged";
  }
  if (
    t === "replace" ||
    t === "new" ||
    t === "replace with new from brand materials" ||
    t.startsWith("replace")
  ) {
    return "replace";
  }
  return null;
}

function normalizeCoverAction(
  platform: RmJ008Platform,
  raw: string | undefined,
): "reissue_unchanged" | "replace" | "not_applicable" | null {
  if (platform !== "facebook") {
    if (!raw || !String(raw).trim()) return "not_applicable";
    const t = String(raw).trim().toLowerCase();
    if (
      t === "not_applicable" ||
      t === "n/a" ||
      t === "not used" ||
      t === "not applicable" ||
      t.startsWith("not used")
    ) {
      return "not_applicable";
    }
    return null;
  }
  if (!raw || !String(raw).trim()) return null;
  const t = String(raw).trim().toLowerCase();
  if (
    t === "reissue_unchanged" ||
    t === "keep" ||
    t === "unchanged" ||
    t === "keep current look" ||
    t.startsWith("keep current")
  ) {
    return "reissue_unchanged";
  }
  if (t === "replace" || t.startsWith("replace")) return "replace";
  if (t === "not_applicable" || t === "n/a") return null;
  return null;
}

export function buildRmJ008KitManifestSeed(
  truth: RmJ008KitLiveTruth,
): RmJ008KitManifestSeed {
  return {
    status: "kit_locked_pre_payment",
    skuId: DESIGN_RENDERER_RM_J008_SKU,
    platform: truth.platform,
    lockedKitMemberCount: truth.lockedKitMemberCount,
    replacementKitScope: "full_platform_replacement_kit",
    beforeStateSource: "customer_supplied",
    countUnit: "kit_member_identities",
    completenessAuthority: "platform_locked_full_replacement_kit_membership",
    credentialsPresent: false,
    mutationRequested: false,
    partialKitRequested: false,
    customerApplies: true,
    accountMutation: false,
    ownerRoutine: "NONE",
    before: truth.before,
    after: truth.after,
    members: truth.plannedKitMembers.map((m) => ({
      memberId: m.memberId,
      order: m.order,
      kind: m.kind,
      memberPurpose: m.memberPurpose,
      ...(m.agreedPlateId ? { agreedPlateId: m.agreedPlateId } : {}),
    })),
    note:
      "Full replacement Update Kit = platform-locked member identities N/N including change sheet. Before-state is customer-supplied. Customer applies — Studio does not log in, inspect live, or publish.",
  };
}

function assertMembershipMatchesRecipe(
  truth: Pick<
    RmJ008KitLiveTruth,
    "platform" | "lockedKitMemberCount" | "plannedKitMembers"
  >,
): RmJ008KitMapResult | null {
  const recipe = recipeForUpdatePlatform(truth.platform);
  if (
    truth.lockedKitMemberCount !== recipe.lockedKitMemberCount ||
    truth.plannedKitMembers.length !== recipe.lockedKitMemberCount
  ) {
    return {
      ok: false,
      code: "MEMBERSHIP_TAMPER",
      message:
        "MEMBERSHIP_TAMPER: sealed kit membership does not match the locked platform full-replacement recipe",
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
  const ids = new Set(truth.plannedKitMembers.map((m) => m.memberId));
  if (!ids.has("before_after_change_sheet")) {
    return {
      ok: false,
      code: "MEMBERSHIP_TAMPER",
      message: "MEMBERSHIP_TAMPER: before_after_change_sheet is always required",
    };
  }
  if (truth.platform === "facebook" && !ids.has("page_cover")) {
    return {
      ok: false,
      code: "COVER_REQUIRED",
      message: "COVER_REQUIRED: Facebook Update Kit requires page_cover",
    };
  }
  if (truth.platform !== "facebook" && ids.has("page_cover")) {
    return {
      ok: false,
      code: "COVER_FORBIDDEN",
      message:
        "COVER_FORBIDDEN: Instagram and TikTok Update Kits must not include page_cover",
    };
  }
  return null;
}

/**
 * Map customer-locked live kit answers → Machine kit truth + manifest seed.
 * Platform determines exact full-replacement membership. Fail closed on
 * missing before-state, partial kits, and live-inspect substitutes.
 */
export function mapRmJ008KitLockFromLiveTruth(
  input: RmJ008LiveKitLockInput | null | undefined,
): RmJ008KitMapResult {
  if (!input) {
    return {
      ok: false,
      code: "MISSING_KIT_LOCK",
      message:
        "MISSING_KIT_LOCK: Social Profile Update Kit requires one locked platform, customer-supplied before-state, and after-state intent before payment — skuId rm-j008 alone is not enough",
    };
  }

  const forbidden = detectForbiddenCredentialFields(input);
  if (forbidden.length) {
    return {
      ok: false,
      code: "FORBIDDEN_CREDENTIAL_INTAKE",
      message: `FORBIDDEN_CREDENTIAL_INTAKE: rm-j008 never collects platform login, admin invite, or credentials (${forbidden.join(", ")}). Customer applies the delivered Update Kit.`,
    };
  }

  if (
    input.partialKitRequested === true ||
    input.bioOnly === true ||
    input.changedMembersOnly === true ||
    input.partialKit === true ||
    (Array.isArray(input.kitMemberIds) && input.kitMemberIds.length > 0) ||
    (Array.isArray(input.membersOverride) && input.membersOverride.length > 0)
  ) {
    return {
      ok: false,
      code: "PARTIAL_KIT_FORBIDDEN",
      message:
        "PARTIAL_KIT_FORBIDDEN: bio-only / changed-members-only compositions are not purchasable — full replacement membership is mandatory before payment",
    };
  }

  const sourceRaw = String(input.beforeStateSource ?? "customer_supplied")
    .trim()
    .toLowerCase();
  if (
    sourceRaw !== "customer_supplied" &&
    sourceRaw !== "" &&
    sourceRaw !== "customer supplied"
  ) {
    return {
      ok: false,
      code: "BEFORE_STATE_NOT_CUSTOMER_SUPPLIED",
      message:
        "BEFORE_STATE_NOT_CUSTOMER_SUPPLIED: before-state must be customer-supplied truth — live inspect, scrape, login readback, or “check later” are not sold paths",
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
        "COVER_FORBIDDEN: Instagram and TikTok Update Kits do not include a profile cover/banner",
    };
  }

  const ambiguous = detectAmbiguousLegacyFields(input);
  if (ambiguous.length) {
    return {
      ok: false,
      code: "AMBIGUOUS_LEGACY_TRUTH",
      message: `AMBIGUOUS_LEGACY_TRUTH: fields ${ambiguous.join(", ")} cannot substitute for an explicit single-platform full-replacement Update Kit lock with customer-supplied before-state`,
    };
  }

  if (!truthyAffirmation(input.customerControlsExistingProfile)) {
    return {
      ok: false,
      code: "UNSUPPORTED_USE",
      message:
        "UNSUPPORTED_USE: rm-j008 requires an existing customer-controlled profile (not new setup — use Social Profile Setup Kit)",
    };
  }

  const beforeDisplayName = String(input.beforeDisplayName ?? "").trim();
  const beforeBioOrAbout = String(input.beforeBioOrAbout ?? "").trim();
  const beforeWebsite = String(input.beforeWebsite ?? "").trim();
  const beforePhone = String(input.beforePhone ?? "").trim();
  const beforeProfileImageNote = String(
    input.beforeProfileImageNote ?? "",
  ).trim();
  const beforePageCoverNote = String(input.beforePageCoverNote ?? "").trim();

  if (
    !beforeDisplayName ||
    !beforeBioOrAbout ||
    !beforeWebsite ||
    !beforePhone ||
    !beforeProfileImageNote
  ) {
    return {
      ok: false,
      code: "MISSING_BEFORE_STATE",
      message:
        "MISSING_BEFORE_STATE: customer-supplied before-state (display name, bio/about, website, phone, profile image note) is required before payment — Studio will not inspect the live profile later",
    };
  }

  if (platform === "facebook" && !beforePageCoverNote) {
    return {
      ok: false,
      code: "MISSING_BEFORE_STATE",
      message:
        "MISSING_BEFORE_STATE: Facebook Update Kit requires a customer-supplied before Page cover note",
    };
  }
  if (platform !== "facebook" && beforePageCoverNote) {
    return {
      ok: false,
      code: "UNSUPPORTED_USE",
      message:
        "UNSUPPORTED_USE: Instagram/TikTok before-state must not include a Page cover note",
    };
  }

  const businessName = String(input.businessName ?? "").trim();
  const afterDisplayName = String(input.afterDisplayName ?? "").trim();
  const profileGoal = String(input.profileGoal ?? "").trim();
  const updateIntentNotes = String(input.updateIntentNotes ?? "").trim();
  const afterWebsite = String(input.afterWebsite ?? "").trim();
  const afterPhone = String(input.afterPhone ?? "").trim();
  const brandNotes = String(input.brandNotes ?? "").trim();

  if (!businessName) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: "MISSING_REQUIRED_TRUTH: business or profile name is required",
    };
  }
  if (!afterDisplayName) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: "MISSING_REQUIRED_TRUTH: approved after display name is required",
    };
  }
  if (!profileGoal) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: profile goal is required for Studio-written revised copy",
    };
  }
  if (!updateIntentNotes) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: update intent notes are required — they do not shrink kit membership",
    };
  }
  if (!afterWebsite) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: approved after website/link (or explicit none) is required",
    };
  }
  if (!afterPhone) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: approved after phone/contact (or explicit none) is required",
    };
  }
  if (!brandNotes) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: brand/logo material notes are required for the reissued avatar",
    };
  }

  const avatarAction = normalizeAvatarAction(String(input.avatarAction ?? ""));
  if (!avatarAction) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: avatar action must be Keep current look or Replace (full kit still reissues the avatar member)",
    };
  }

  const coverAction = normalizeCoverAction(
    platform,
    input.coverAction != null ? String(input.coverAction) : undefined,
  );
  if (!coverAction) {
    return {
      ok: false,
      code:
        platform === "facebook" ? "COVER_REQUIRED" : "COVER_FORBIDDEN",
      message:
        platform === "facebook"
          ? "COVER_REQUIRED: Facebook Update Kit requires Keep current cover or Replace"
          : "COVER_FORBIDDEN: Instagram/TikTok cover action must be Not applicable",
    };
  }

  const recipe = recipeForUpdatePlatform(platform);
  const truth: RmJ008KitLiveTruth = {
    skuId: DESIGN_RENDERER_RM_J008_SKU,
    platform,
    lockedKitMemberCount: recipe.lockedKitMemberCount,
    plannedKitMembers: recipe.plannedKitMembers,
    replacementKitScope: "full_platform_replacement_kit",
    beforeStateSource: "customer_supplied",
    before: {
      displayName: beforeDisplayName,
      bioOrAbout: beforeBioOrAbout,
      website: beforeWebsite,
      phone: beforePhone,
      profileImageNote: beforeProfileImageNote,
      ...(platform === "facebook"
        ? { pageCoverNote: beforePageCoverNote }
        : {}),
    },
    after: {
      businessName,
      displayName: afterDisplayName,
      profileGoal,
      updateIntentNotes,
      website: afterWebsite,
      phone: afterPhone,
      brandNotes,
      avatarAction,
      coverAction,
    },
    customerControlsExistingProfile: true,
    lockedBeforePayment: true,
    credentialsPresent: false,
    mutationRequested: false,
    partialKitRequested: false,
    customerApplies: true,
    accountMutation: false,
    completenessAuthority: "platform_locked_full_replacement_kit_membership",
    countUnit: "kit_member_identities",
    ownerRoutine: "NONE",
    packageId: RM_J008_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
  };

  return {
    ok: true,
    truth,
    manifestSeed: buildRmJ008KitManifestSeed(truth),
  };
}

export function rmJ008LiveKitLockFromFlatAnswers(
  answers: Record<string, string>,
): RmJ008LiveKitLockInput | RmJ008KitMapResult {
  const platform = answers[RM_J008_KIT_LOCK_FIELD_IDS.platform]?.trim() ?? "";
  if (!platform) {
    return {
      ok: false,
      code: "MISSING_KIT_LOCK",
      message: "MISSING_KIT_LOCK: platform is required before payment",
    };
  }
  const input: RmJ008LiveKitLockInput = {
    platform,
    businessName: answers[RM_J008_KIT_LOCK_FIELD_IDS.businessName] ?? "",
    customerControlsExistingProfile:
      answers[RM_J008_KIT_LOCK_FIELD_IDS.customerControlsExistingProfile] ??
      "",
    beforeDisplayName:
      answers[RM_J008_KIT_LOCK_FIELD_IDS.beforeDisplayName] ?? "",
    beforeBioOrAbout:
      answers[RM_J008_KIT_LOCK_FIELD_IDS.beforeBioOrAbout] ?? "",
    beforeWebsite: answers[RM_J008_KIT_LOCK_FIELD_IDS.beforeWebsite] ?? "",
    beforePhone: answers[RM_J008_KIT_LOCK_FIELD_IDS.beforePhone] ?? "",
    beforeProfileImageNote:
      answers[RM_J008_KIT_LOCK_FIELD_IDS.beforeProfileImageNote] ?? "",
    beforePageCoverNote:
      answers[RM_J008_KIT_LOCK_FIELD_IDS.beforePageCoverNote],
    afterDisplayName:
      answers[RM_J008_KIT_LOCK_FIELD_IDS.afterDisplayName] ?? "",
    profileGoal: answers[RM_J008_KIT_LOCK_FIELD_IDS.profileGoal] ?? "",
    updateIntentNotes:
      answers[RM_J008_KIT_LOCK_FIELD_IDS.updateIntentNotes] ?? "",
    afterWebsite: answers[RM_J008_KIT_LOCK_FIELD_IDS.afterWebsite] ?? "",
    afterPhone: answers[RM_J008_KIT_LOCK_FIELD_IDS.afterPhone] ?? "",
    brandNotes: answers[RM_J008_KIT_LOCK_FIELD_IDS.brandNotes] ?? "",
    avatarAction: answers[RM_J008_KIT_LOCK_FIELD_IDS.avatarAction] ?? "",
    coverAction: answers[RM_J008_KIT_LOCK_FIELD_IDS.coverAction],
  };
  for (const k of [
    ...RM_J008_FORBIDDEN_CREDENTIAL_INTAKE_FIELDS,
    ...RM_J008_AMBIGUOUS_LEGACY_FIELDS,
  ]) {
    if (answers[k] != null && String(answers[k]).trim() !== "") {
      input[k] = answers[k];
    }
  }
  return input;
}

/**
 * Checkout / payment gate: if rm-j008 is selected, Update Kit lock must be present.
 * skuId alone → block checkout.
 */
export function assertRmJ008KitReadyForPayment(input: {
  selectedServiceIds: readonly string[];
  kitLock: RmJ008LiveKitLockInput | RmJ008KitLiveTruth | null | undefined;
}): RmJ008PaymentReadinessResult {
  const hasSku = input.selectedServiceIds.includes(DESIGN_RENDERER_RM_J008_SKU);
  if (!hasSku) {
    return { ok: true, applicable: false, reason: "rm-j008_not_selected" };
  }

  if (!input.kitLock) {
    return {
      ok: false,
      applicable: true,
      code: "SKU_ONLY_INSUFFICIENT",
      message:
        "SKU_ONLY_INSUFFICIENT: selected service rm-j008 (Social Profile Update Kit) has no locked platform replacement kit. Checkout cannot accept payment until the customer locks exactly one platform, supplies before-state, and locks after-state intent for the full replacement kit.",
      blockCheckout: true,
    };
  }

  if (
    typeof input.kitLock === "object" &&
    "plannedKitMembers" in input.kitLock &&
    "lockedBeforePayment" in input.kitLock
  ) {
    const truth = input.kitLock as RmJ008KitLiveTruth;
    if (
      !truth.lockedBeforePayment ||
      truth.skuId !== DESIGN_RENDERER_RM_J008_SKU ||
      truth.credentialsPresent !== false ||
      truth.mutationRequested !== false ||
      truth.partialKitRequested !== false ||
      truth.beforeStateSource !== "customer_supplied" ||
      truth.replacementKitScope !== "full_platform_replacement_kit" ||
      truth.customerApplies !== true ||
      truth.ownerRoutine !== "NONE"
    ) {
      return {
        ok: false,
        applicable: true,
        code: "INVALID_KIT_LOCK",
        message:
          "INVALID_KIT_LOCK: Update Kit truth is incomplete or unsafe for payment",
        blockCheckout: true,
      };
    }
    if (
      !truth.before?.displayName?.trim() ||
      !truth.before?.bioOrAbout?.trim() ||
      !truth.before?.website?.trim() ||
      !truth.before?.phone?.trim() ||
      !truth.before?.profileImageNote?.trim()
    ) {
      return {
        ok: false,
        applicable: true,
        code: "MISSING_BEFORE_STATE",
        message:
          "MISSING_BEFORE_STATE: sealed Update Kit is missing customer-supplied before-state",
        blockCheckout: true,
      };
    }
    const membership = assertMembershipMatchesRecipe(truth);
    if (membership && !membership.ok) {
      return {
        ok: false,
        applicable: true,
        code: membership.code === "MEMBERSHIP_TAMPER" ||
          membership.code === "COVER_FORBIDDEN" ||
          membership.code === "COVER_REQUIRED"
          ? membership.code
          : "MEMBERSHIP_TAMPER",
        message: membership.message,
        blockCheckout: true,
      };
    }
    return {
      ok: true,
      applicable: true,
      truth,
      manifestSeed: buildRmJ008KitManifestSeed(truth),
    };
  }

  const mapped = mapRmJ008KitLockFromLiveTruth(
    input.kitLock as RmJ008LiveKitLockInput,
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
export function customerFacingRmJ008KitLines(
  truth: RmJ008KitLiveTruth,
): readonly string[] {
  const platformLabel =
    truth.platform === "facebook"
      ? "Facebook"
      : truth.platform === "instagram"
        ? "Instagram"
        : "TikTok";
  return [
    `${platformLabel} profile update kit — ${truth.lockedKitMemberCount} pieces (full replacement package)`,
    `Before-state on file from what you provided (not a live account check)`,
    "You apply every change on the platform. The Studio does not log in or publish.",
  ];
}
