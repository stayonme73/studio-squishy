/**
 * Platform capability matrix — first-party documentation only.
 * Live mutation not executed in this package (no Meta/TikTok app credentials).
 */

import type {
  PlatformCapabilityRecord,
  PlatformProductionVerdict,
  SocialPlatform,
} from "./types";

/** Facebook about field character limit from Graph API Page reference. */
export const FACEBOOK_ABOUT_MAX_CHARS = 100;

/**
 * Instagram profile field write via IG User node is not supported in first-party docs.
 * Character limits for write path remain irrelevant until a supported write API exists.
 */
export const INSTAGRAM_BIO_WRITE_SUPPORTED = false;

/** TikTok User Info API is GET-only for bio/avatar/display_name. */
export const TIKTOK_PROFILE_WRITE_SUPPORTED = false;

export const FACEBOOK_PAGE_CAPABILITY: PlatformCapabilityRecord = {
  platform: "facebook",
  accountTypeRequired:
    "Facebook Page (business/community). Personal profile ≠ Page — personal-profile mutation is out of Graph Pages API scope.",
  authorizationModel:
    "Facebook Login for Business → User token → GET /me/accounts → short-lived Page access token with MANAGE task. Prefer long-lived Page token server-side.",
  permissionsOrScopes: [
    "pages_show_list",
    "pages_manage_metadata",
    "pages_read_engagement",
    "business_management (when using business system user)",
  ],
  fields: [
    {
      field: "about",
      readable: true,
      writable: true,
      note: `POST /{page-id} about — maps to Description in Edit Page Info; limit ${FACEBOOK_ABOUT_MAX_CHARS} characters.`,
      firstPartySource:
        "https://developers.facebook.com/docs/pages-api/manage-pages/ and Graph API Page Updating",
    },
    {
      field: "website",
      readable: true,
      writable: true,
      note: "Page website field readable/writable via Pages manage path when MANAGE task present.",
      firstPartySource:
        "https://developers.facebook.com/docs/graph-api/reference/page/",
    },
    {
      field: "phone",
      readable: true,
      writable: true,
      note: "Page phone field present on Page node; update via POST /{page-id} when permitted.",
      firstPartySource:
        "https://developers.facebook.com/docs/graph-api/reference/page/",
    },
    {
      field: "emails",
      readable: true,
      writable: true,
      note: "emails list updateable on Page node.",
      firstPartySource:
        "https://developers.facebook.com/docs/graph-api/reference/page/",
    },
    {
      field: "hours",
      readable: true,
      writable: true,
      note: "hours map updateable on Page node.",
      firstPartySource:
        "https://developers.facebook.com/docs/graph-api/reference/page/",
    },
    {
      field: "profile_image",
      readable: true,
      writable: true,
      note: "POST /{page-id}/picture Creating supported with MANAGE task; Updating/Deleting not supported on that edge.",
      firstPartySource:
        "https://developers.facebook.com/docs/graph-api/reference/page/picture/",
    },
    {
      field: "cover_image",
      readable: true,
      writable: true,
      note: "cover parameter on Page update — Page Admin/Editor with EDIT_PROFILE and business_management permissions per Page Updating docs.",
      firstPartySource:
        "https://developers.facebook.com/docs/graph-api/reference/page/",
    },
    {
      field: "bio",
      readable: "UNVERIFIED",
      writable: "UNVERIFIED",
      note: "Page has about/description; separate bio field appears in some read examples — do not treat as Instagram-style bio.",
      firstPartySource:
        "https://developers.facebook.com/docs/pages-api/manage-pages/",
    },
    {
      field: "display_name",
      readable: true,
      writable: "UNVERIFIED",
      note: "Page name readable; renaming policies/restrictions not claimed here.",
      firstPartySource:
        "https://developers.facebook.com/docs/graph-api/reference/page/",
    },
  ],
  appReviewRequired: true,
  businessVerificationRequired: "UNVERIFIED",
  tokenNotes:
    "Page tokens from /me/accounts are short-lived unless exchanged/extended. Store server-side only; refresh/revoke via Meta token flows. Never store customer passwords.",
  customerConsentNotes:
    "Customer (Page admin) must authorize Studio Meta app via Facebook Login for Business and retain Page MANAGE capability. Customer creates/owns the Page — Studio does not create the Facebook account/Page via this SKU path.",
  canCreateUnderlyingAccount: false,
  ownerIndependentMutation: true,
  verdict: "INTEGRATION READY — ACCOUNT/AUTH BLOCKER",
  evidenceNotes: [
    "First-party Pages API documents GET + POST /{page-id} for about and related details when MANAGE task + Page access token present.",
    "No live Meta app / OAuth / Page test executed in this package — not PROVEN.",
    "App Review required for pages_* permissions outside development mode.",
  ],
};

export const INSTAGRAM_CAPABILITY: PlatformCapabilityRecord = {
  platform: "instagram",
  accountTypeRequired:
    "Instagram Business or Creator (professional) account connected via Meta. Personal Instagram accounts are not the IG User Graph target for this SKU path.",
  authorizationModel:
    "Meta Instagram Graph API with Facebook Login (Page-linked IG) or Instagram Login for professional accounts — OAuth user/page tokens. No password vault.",
  permissionsOrScopes: [
    "instagram_basic / equivalent professional scopes for read",
    "pages_show_list (Facebook Login path)",
    "instagram_manage_* scopes are for content/comments — not proven for profile bio write",
  ],
  fields: [
    {
      field: "bio",
      readable: true,
      writable: false,
      note: "IG User biography is readable. Creating/Updating/Deleting on IG User node: “This operation is not supported.”",
      firstPartySource:
        "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/",
    },
    {
      field: "website",
      readable: true,
      writable: false,
      note: "website field readable on IG User; no first-party write operation documented on IG User.",
      firstPartySource:
        "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/",
    },
    {
      field: "profile_image",
      readable: true,
      writable: false,
      note: "profile_picture_url readable; no first-party IG User profile-picture write for Business/Creator profile setup documented.",
      firstPartySource:
        "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/",
    },
    {
      field: "cover_image",
      readable: false,
      writable: false,
      note: "Instagram professional profiles do not expose a Facebook-style cover write via IG User docs.",
      firstPartySource:
        "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/",
    },
    {
      field: "about",
      readable: false,
      writable: false,
      note: "Use biography, not Facebook about.",
      firstPartySource:
        "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/",
    },
    {
      field: "phone",
      readable: "UNVERIFIED",
      writable: false,
      note: "Contact options may exist in Instagram professional UI; not claimed as Graph-writable here.",
      firstPartySource:
        "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/",
    },
    {
      field: "emails",
      readable: "UNVERIFIED",
      writable: false,
      note: "Not claimed as Graph-writable from IG User reference.",
      firstPartySource:
        "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/",
    },
    {
      field: "hours",
      readable: "UNVERIFIED",
      writable: false,
      note: "Not claimed as Graph-writable from IG User reference.",
      firstPartySource:
        "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/",
    },
    {
      field: "display_name",
      readable: true,
      writable: false,
      note: "name/username readable; write unsupported on IG User node.",
      firstPartySource:
        "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/",
    },
  ],
  appReviewRequired: true,
  businessVerificationRequired: "UNVERIFIED",
  tokenNotes:
    "OAuth tokens server-side only. Read APIs must not be treated as mutation proof.",
  customerConsentNotes:
    "Customer must own/control a professional Instagram account and authorize Studio. Studio cannot create the Instagram account via official APIs claimed here.",
  canCreateUnderlyingAccount: false,
  ownerIndependentMutation: false,
  verdict: "FAIL — SUPPORTED OWNER-INDEPENDENT MUTATION NOT AVAILABLE",
  evidenceNotes: [
    "First-party IG User reference documents Reading for biography/website/profile_picture_url and states Creating/Updating/Deleting are not supported.",
    "Do not use community forum claims as primary proof.",
    INSTAGRAM_BIO_WRITE_SUPPORTED
      ? "WRITE FLAG INCONSISTENT"
      : "Profile mutation for contract fields is unavailable via documented IG User API.",
  ],
};

export const TIKTOK_CAPABILITY: PlatformCapabilityRecord = {
  platform: "tiktok",
  accountTypeRequired:
    "TikTok user account authorizing a TikTok developer app (Login Kit / Display API). Business vs personal distinctions for profile write remain unavailable because write APIs are not documented.",
  authorizationModel:
    "TikTok OAuth (authorization code → access_token + refresh_token). Scopes such as user.info.basic / user.info.profile for read. No password vault.",
  permissionsOrScopes: [
    "user.info.basic",
    "user.info.profile (bio_description, username, profile_deep_link)",
    "user.info.stats (optional stats — not profile edit)",
    "video.publish / Content Posting API scopes are for posting content — not profile mutation",
  ],
  fields: [
    {
      field: "bio",
      readable: true,
      writable: false,
      note: "bio_description via GET /v2/user/info/ only — no first-party update endpoint documented.",
      firstPartySource: "https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info",
    },
    {
      field: "profile_image",
      readable: true,
      writable: false,
      note: "avatar_url fields are read-only in User Info API.",
      firstPartySource: "https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info",
    },
    {
      field: "display_name",
      readable: true,
      writable: false,
      note: "display_name readable only.",
      firstPartySource: "https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info",
    },
    {
      field: "website",
      readable: false,
      writable: false,
      note: "No website field in documented User Info response for write/read of a custom URL matching Studio contract.",
      firstPartySource: "https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info",
    },
    {
      field: "cover_image",
      readable: false,
      writable: false,
      note: "Not documented in User Info API.",
      firstPartySource: "https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info",
    },
    {
      field: "about",
      readable: false,
      writable: false,
      note: "Use bio_description read path only.",
      firstPartySource: "https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info",
    },
    {
      field: "phone",
      readable: false,
      writable: false,
      note: "Not in User Info API.",
      firstPartySource: "https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info",
    },
    {
      field: "emails",
      readable: false,
      writable: false,
      note: "Not in User Info API.",
      firstPartySource: "https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info",
    },
    {
      field: "hours",
      readable: false,
      writable: false,
      note: "Not in User Info API.",
      firstPartySource: "https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info",
    },
  ],
  appReviewRequired: true,
  businessVerificationRequired: "UNVERIFIED",
  tokenNotes:
    "Access tokens expire (~24h) with refresh_token rotation documented by TikTok. Server-side only.",
  customerConsentNotes:
    "Customer authorizes Studio TikTok app. Content Posting API must not be mistaken for profile setup/update.",
  canCreateUnderlyingAccount: false,
  ownerIndependentMutation: false,
  verdict: "FAIL — SUPPORTED OWNER-INDEPENDENT MUTATION NOT AVAILABLE",
  evidenceNotes: [
    "First-party User Info API is GET-only for profile fields.",
    "Content Posting API documents creator info query + publish — not bio/avatar mutation.",
    TIKTOK_PROFILE_WRITE_SUPPORTED
      ? "WRITE FLAG INCONSISTENT"
      : "No first-party profile-edit product proven for Studio contract fields.",
  ],
};

export function getPlatformCapability(
  platform: SocialPlatform,
): PlatformCapabilityRecord {
  switch (platform) {
    case "facebook":
      return FACEBOOK_PAGE_CAPABILITY;
    case "instagram":
      return INSTAGRAM_CAPABILITY;
    case "tiktok":
      return TIKTOK_CAPABILITY;
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}

export function platformHardGateMatrix(): Record<
  SocialPlatform,
  PlatformProductionVerdict
> {
  return {
    facebook: FACEBOOK_PAGE_CAPABILITY.verdict,
    instagram: INSTAGRAM_CAPABILITY.verdict,
    tiktok: TIKTOK_CAPABILITY.verdict,
  };
}

/**
 * SKU-level readiness after Owner A+C: kit path, not cross-platform mutation.
 * Platform mutation hard-gates remain documented; they do not block kit readiness.
 */
export function deriveSkuReadinessFromPlatforms(): {
  rmJ002: string;
  rmJ008: string;
  facebookFuture: string;
  instagramMutation: string;
  tiktokMutation: string;
  metaOauthStarted: false;
} {
  return {
    rmJ002: "CUSTOMER READY WITH LIMITS — PROFILE KIT",
    rmJ008: "CUSTOMER READY WITH LIMITS — PROFILE KIT",
    facebookFuture: "INTEGRATION READY — ACCOUNT/AUTH BLOCKER (future only; not wired)",
    instagramMutation: "UNSUPPORTED",
    tiktokMutation: "UNSUPPORTED",
    metaOauthStarted: false,
  };
}
