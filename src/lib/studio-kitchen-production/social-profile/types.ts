/**
 * KITCHEN-SOCIAL-PROFILE-PRODUCTION-1 — shared setup/update spine.
 * Provider-independent work packet + platform capability truth.
 * Does not invent platform mutation APIs.
 */

export const SOCIAL_PROFILE_PACKAGE_ID =
  "KITCHEN-SOCIAL-PROFILE-PRODUCTION-1" as const;

export const SOCIAL_PROFILE_MECHANISM_VERSION =
  "social-profile-production-1.0.0" as const;

export const SOCIAL_PROFILE_SETUP_SKU = "rm-j002" as const;
export const SOCIAL_PROFILE_UPDATE_SKU = "rm-j008" as const;

export type SocialProfileSku =
  | typeof SOCIAL_PROFILE_SETUP_SKU
  | typeof SOCIAL_PROFILE_UPDATE_SKU;

export type SocialPlatform = "facebook" | "instagram" | "tiktok";

export type SocialProfileMode = "setup" | "update";

export type PlatformProductionVerdict =
  | "PROVEN"
  | "INTEGRATION READY — ACCOUNT/AUTH BLOCKER"
  | "BLOCKED — APP REVIEW / EXTERNAL APPROVAL"
  | "FAIL — SUPPORTED OWNER-INDEPENDENT MUTATION NOT AVAILABLE"
  | "UNVERIFIED";

export type SocialProfileFieldId =
  | "about"
  | "bio"
  | "website"
  | "phone"
  | "emails"
  | "hours"
  | "profile_image"
  | "cover_image"
  | "display_name";

export type SocialAuthorizationKind =
  | "oauth_page_token"
  | "oauth_user_token"
  | "manual_admin_invite"
  | "unsupported";

export type SocialCredentialRef = {
  /** Opaque server-side credential handle — never the raw token. */
  credentialHandle: string;
  kind: SocialAuthorizationKind;
  platformAccountId: string;
  scopes: readonly string[];
  expiresAt?: string;
  revocable: boolean;
};

export type SocialProfileSnapshot = {
  capturedAt: string;
  fields: Partial<Record<SocialProfileFieldId, string | null>>;
  profileImageSha256?: string;
  coverImageSha256?: string;
  source: "platform_readback" | "customer_supplied" | "unavailable";
};

export type SocialProfileMutation = {
  field: SocialProfileFieldId;
  requestedValue: string;
  assetRelativePath?: string;
  assetSha256?: string;
};

export type SocialProfileWorkPacket = {
  workPacketId: string;
  workPacketVersion: string;
  campaignId: string;
  skuId: SocialProfileSku;
  mode: SocialProfileMode;
  platform: SocialPlatform;
  businessName: string;
  /** Customer-controlled account — catalog requires pre-existing control. */
  customerOwnsAccount: true;
  platformAccountId: string;
  authorization: SocialCredentialRef | null;
  beforeSnapshot: SocialProfileSnapshot | null;
  mutations: readonly SocialProfileMutation[];
  approvedBio?: string;
  approvedAbout?: string;
  approvedWebsite?: string;
  approvedPhone?: string;
  approvedEmails?: readonly string[];
  profileImage?: { relativePath: string; contentSha256: string };
  coverImage?: { relativePath: string; contentSha256: string };
  qaState: "draft" | "qa_ready" | "blocked" | "failed";
  label: string;
};

export type PlatformFieldCapability = {
  field: SocialProfileFieldId;
  readable: boolean | "UNVERIFIED";
  writable: boolean | "UNVERIFIED";
  note: string;
  firstPartySource: string;
};

export type PlatformCapabilityRecord = {
  platform: SocialPlatform;
  accountTypeRequired: string;
  authorizationModel: string;
  permissionsOrScopes: readonly string[];
  fields: readonly PlatformFieldCapability[];
  appReviewRequired: boolean | "UNVERIFIED";
  businessVerificationRequired: boolean | "UNVERIFIED";
  tokenNotes: string;
  customerConsentNotes: string;
  canCreateUnderlyingAccount: false;
  ownerIndependentMutation: boolean;
  verdict: PlatformProductionVerdict;
  evidenceNotes: readonly string[];
};
