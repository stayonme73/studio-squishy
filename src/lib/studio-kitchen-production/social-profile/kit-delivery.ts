/**
 * A+C kit delivery path — owner-independent Copy + Design + field-map package.
 * Does not perform platform mutations. Does not start Meta OAuth.
 */

import type { SocialPlatform, SocialProfileMode } from "./types";

export const SOCIAL_PROFILE_KIT_READINESS_STATUS =
  "CUSTOMER READY WITH LIMITS — PROFILE KIT" as const;

export type KitDeliverableId =
  | "bio_about_copy"
  | "profile_description"
  | "url_contact_field_map"
  | "profile_image_asset"
  | "cover_banner_asset"
  | "display_name_recommendations"
  | "setup_sheet_checklist"
  | "current_profile_review"
  | "before_after_change_sheet"
  | "field_replacement_instructions";

export type KitDeliverableCoverage = {
  id: KitDeliverableId;
  label: string;
  productionSystem: "copy" | "design" | "field_map_package";
  evidence: string;
  covered: boolean;
};

const SHARED_LIMITS = [
  "Kit delivery only — customer applies changes on the platform.",
  "No Studio login / OAuth mutation in this SKU path.",
  "No raw-password workflow.",
  "No browser automation.",
  "Facebook Page mutation remains future-only (INTEGRATION READY / ACCOUNT-AUTH BLOCKER) — not sold here.",
  "Instagram and TikTok direct profile mutation remain UNSUPPORTED.",
  "Per-artifact copy QA and design QA remain required before delivery.",
  "Manual Canva path for profile/cover assets (same operational design path as other static visual SKUs).",
] as const;

export function kitDeliverablesForMode(
  mode: SocialProfileMode,
): readonly KitDeliverableCoverage[] {
  const setup: KitDeliverableCoverage[] = [
    {
      id: "bio_about_copy",
      label: "Platform-specific bio/about copy",
      productionSystem: "copy",
      evidence:
        "Copy production family + text_model path (KITCHEN-PRODUCTION-CERT-COPY-1 method; bio/about is paste-ready copy of the same class).",
      covered: true,
    },
    {
      id: "profile_description",
      label: "Business/profile description",
      productionSystem: "copy",
      evidence: "Same certified copy production method.",
      covered: true,
    },
    {
      id: "url_contact_field_map",
      label: "Approved URL/contact field map",
      productionSystem: "field_map_package",
      evidence:
        "Deterministic platform field map from this package (no platform write API required).",
      covered: true,
    },
    {
      id: "profile_image_asset",
      label: "Profile image/avatar asset",
      productionSystem: "design",
      evidence:
        "Creative production + manual Canva path; profile/cover graphic already in bf-001 contract method; static visual QA path from KITCHEN-PRODUCTION-CERT-DESIGN-1.",
      covered: true,
    },
    {
      id: "cover_banner_asset",
      label: "Cover/banner asset where platform supports one",
      productionSystem: "design",
      evidence:
        "Same design/Canva path; omitted from package when platform has no cover (e.g. TikTok).",
      covered: true,
    },
    {
      id: "display_name_recommendations",
      label: "Display-name / field recommendations",
      productionSystem: "field_map_package",
      evidence: "Platform field recommendations in setup sheet.",
      covered: true,
    },
    {
      id: "setup_sheet_checklist",
      label: "Platform-specific setup sheet + checklist",
      productionSystem: "field_map_package",
      evidence: "Generated implementation checklist bound to work packet.",
      covered: true,
    },
  ];

  if (mode === "setup") return setup;

  return [
    {
      id: "current_profile_review",
      label: "Reviewed current-profile inputs",
      productionSystem: "field_map_package",
      evidence: "Before-state capture in update work packet.",
      covered: true,
    },
    ...setup.filter((d) => d.id !== "setup_sheet_checklist"),
    {
      id: "before_after_change_sheet",
      label: "Before→after change sheet",
      productionSystem: "field_map_package",
      evidence: "Diff of approved mutations vs before snapshot.",
      covered: true,
    },
    {
      id: "field_replacement_instructions",
      label: "Exact field-replacement instructions + checklist",
      productionSystem: "field_map_package",
      evidence: "Update implementation checklist bound to work packet.",
      covered: true,
    },
  ];
}

/** Platforms that support a cover/banner asset in the kit (customer-applied). */
export function platformSupportsCoverAsset(platform: SocialPlatform): boolean {
  return platform === "facebook" || platform === "instagram";
}

export function evaluateKitReadiness(mode: SocialProfileMode): {
  status: typeof SOCIAL_PROFILE_KIT_READINESS_STATUS;
  allDeliverablesCovered: boolean;
  deliverables: readonly KitDeliverableCoverage[];
  limits: readonly string[];
  ownerRoutineAction: "NONE";
  metaOauthStarted: false;
  facebookFuturePreserved: true;
  instagramMutationUnsupported: true;
  tiktokMutationUnsupported: true;
} {
  const deliverables = kitDeliverablesForMode(mode);
  return {
    status: SOCIAL_PROFILE_KIT_READINESS_STATUS,
    allDeliverablesCovered: deliverables.every((d) => d.covered),
    deliverables,
    limits: SHARED_LIMITS,
    ownerRoutineAction: "NONE",
    metaOauthStarted: false,
    facebookFuturePreserved: true,
    instagramMutationUnsupported: true,
    tiktokMutationUnsupported: true,
  };
}

export function buildPlatformFieldChecklist(input: {
  platform: SocialPlatform;
  mode: SocialProfileMode;
  bio?: string;
  about?: string;
  website?: string;
  phone?: string;
  displayName?: string;
  includeCover: boolean;
}): readonly { field: string; action: string; value: string }[] {
  const rows: { field: string; action: string; value: string }[] = [];
  const apply = input.mode === "setup" ? "Enter" : "Replace with";
  if (input.displayName) {
    rows.push({
      field: "Display name",
      action: `${apply} approved display name`,
      value: input.displayName,
    });
  }
  if (input.bio) {
    rows.push({
      field: input.platform === "facebook" ? "About / Description" : "Bio",
      action: `${apply} approved copy (do not truncate)`,
      value: input.bio,
    });
  }
  if (input.about && input.platform === "facebook") {
    rows.push({
      field: "About",
      action: `${apply} approved about (max platform length)`,
      value: input.about,
    });
  }
  if (input.website) {
    rows.push({
      field: "Website / link",
      action: `${apply} approved URL`,
      value: input.website,
    });
  }
  if (input.phone) {
    rows.push({
      field: "Phone / contact",
      action: `${apply} approved contact`,
      value: input.phone,
    });
  }
  rows.push({
    field: "Profile image",
    action: "Upload the Studio-delivered profile image asset",
    value: "[profile asset from kit]",
  });
  if (input.includeCover && platformSupportsCoverAsset(input.platform)) {
    rows.push({
      field: "Cover / banner",
      action: "Upload the Studio-delivered cover/banner asset",
      value: "[cover asset from kit]",
    });
  }
  rows.push({
    field: "Publish / save",
    action: "Save changes on the platform after reviewing the kit",
    value: "Customer action",
  });
  return rows;
}
