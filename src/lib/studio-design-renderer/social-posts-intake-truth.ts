/**
 * STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-INTAKE-TRUTH-1
 *
 * Map live social-posts intake → authoritative four-post placement + order +
 * Machine layout-template assignment. Does not wire dispatch. Does not remap
 * primaryTool. Does not invent customer role menus.
 *
 * Role-angle classification (Owner trap avoided):
 * - NOT fixed service-contract roles (catalog never names offer→CTA→dates→trust)
 * - NOT customer-configurable intake selects (live form has none)
 * - Harbor PROOF-1 angles are CERT fixture / proven layout templates
 * - Live path: Studio production assigns those proven templates for anti-clone
 *   variety — layout sequencing, not a universal customer campaign arc
 */

import {
  DESIGN_RENDERER_SOCIAL_POSTS_SKU,
  SOCIAL_POSTS_EXACT_COUNT,
  SOCIAL_POSTS_SQUARE_PLATE,
  SOCIAL_POST_ROLE_ANGLES,
  type SocialPostMemberTruth,
  type SocialPostOrderIndex,
  type SocialPostPlateId,
  type SocialPostRoleAngle,
  type SocialPostsQuad,
} from "./social-posts-types";

/** Live chip / flattened answer keys the Machine may read. */
export const SOCIAL_POSTS_INTAKE_FIELD_IDS = {
  /** Live SocialPostsIntakeForm chip */
  purposeChoice: "socialPostsPurposeChoice",
  actionChoice: "socialPostsActionChoice",
  platformChoice: "socialPostsPlatformChoice",
  materialsChoices: "socialPostsMaterialsChoices",
  /** Flattened / catalog-schema companions */
  postsAbout: "postsAbout",
  callToAction: "callToAction",
  platform: "platform",
  materials: "materials",
  wordingHashtags: "wordingHashtags",
  mustNotSay: "mustNotSay",
} as const;

/**
 * Authoritative classification — do not elevate Harbor’s CERT sequence into
 * a customer contract or intake menu.
 */
export const SOCIAL_POSTS_ROLE_ANGLE_CLASSIFICATION = {
  customerConfigurable: false,
  fixedServiceContractRoles: false,
  /**
   * Proven Machine layout templates from SOCIAL-POSTS-PROOF-1 (Harbor CERT).
   * Internal production keys — not customer-facing role names on the SKU.
   */
  provenMachineLayoutTemplates: SOCIAL_POST_ROLE_ANGLES,
  /**
   * Live assignment authority. Studio production picks four distinct proven
   * templates so the set is coordinated and not cloned. Captions stay
   * Studio-written from campaign truth.
   */
  liveAuthority: "studio_production_layout_assignment" as const,
  /**
   * Default posting-order sequencing of the current four-template library.
   * This is Machine layout-order for variety under a fixed library size —
   * not a promise that every customer campaign narrates
   * “offer → booking → dates → trust.”
   */
  defaultLayoutSequenceNote:
    "Default Machine layout-order uses the four CERT templates in proof order because those are the only proven social layouts today. Service contract remains: four coordinated posts, one theme, one platform, Studio captions + recommended posting order — without naming those four roles.",
} as const;

export type SocialPostsRoleAngleAuthority =
  | "fixture_cert"
  | "studio_production_layout_assignment";

/** Platforms the live form offers (chip labels). */
export const SOCIAL_POSTS_LIVE_PLATFORM_OPTIONS = [
  "Instagram Post",
  "Facebook Post",
  "LinkedIn Post",
  "I am not sure",
] as const;

export type SocialPostsLivePlatformOption =
  (typeof SOCIAL_POSTS_LIVE_PLATFORM_OPTIONS)[number];

/** Purpose chips on the live form (campaign-level — not per-post roles). */
export const SOCIAL_POSTS_LIVE_PURPOSE_OPTIONS = [
  "Promote an offer",
  "Announce something new",
  "Share an event",
  "Build awareness",
  "Encourage bookings or inquiries",
  "Something else",
] as const;

export type SocialPostsSetStructureTruth = {
  skuId: typeof DESIGN_RENDERER_SOCIAL_POSTS_SKU;
  platformChoice: string;
  platformLabel: string;
  /** Only proven executable plate for this SKU today. */
  plateId: SocialPostPlateId;
  canvas: { widthPx: number; heightPx: number };
  roleAngleAuthority: SocialPostsRoleAngleAuthority;
  roleAngleClassification: typeof SOCIAL_POSTS_ROLE_ANGLE_CLASSIFICATION;
  /** Captions are never customer four-field intake — Studio writes them. */
  captionSource: "studio_written_from_campaign_truth";
  assets: SocialPostsQuad<SocialPostMemberTruth>;
};

export type SocialPostsIntakeStructureResult =
  | { ok: true; structure: SocialPostsSetStructureTruth }
  | {
      ok: false;
      code:
        | "MISSING_REQUIRED_TRUTH"
        | "INVALID_PLATFORM"
        | "UNSUPPORTED_PLATE_EXECUTION";
      message: string;
    };

function readAnswer(
  answers: Record<string, string | undefined>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = answers[key]?.trim() ?? "";
    if (value) return value;
  }
  return "";
}

/**
 * Resolve the customer’s one platform choice into a placement label.
 * Instagram’s live chip detail mentions “Square or portrait”; Machine
 * execution remains square-only until a separate plate proof is authorized.
 */
export function resolveSocialPostsPlatformPlacement(raw: string):
  | { ok: true; platformChoice: string; platformLabel: string }
  | Extract<SocialPostsIntakeStructureResult, { ok: false }> {
  const value = raw.trim();
  if (!value) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: platform is required (one platform for the four-post set)",
    };
  }

  // Live chips first; flattened answers may append " — Square or portrait…"
  const chip =
    SOCIAL_POSTS_LIVE_PLATFORM_OPTIONS.find(
      (option) =>
        value === option ||
        value.startsWith(`${option} —`) ||
        value.startsWith(`${option} -`),
    ) ?? null;

  if (chip) {
    const platformLabel =
      chip === "I am not sure"
        ? "Feed post — square 1024×1024 (Studio safest format)"
        : `${chip} — square feed (1024×1024)`;
    return { ok: true, platformChoice: chip, platformLabel };
  }

  // Catalog schema select options (Facebook / Instagram / TikTok)
  const catalogNormalized = value.toLowerCase();
  if (catalogNormalized.includes("instagram")) {
    return {
      ok: true,
      platformChoice: "Instagram Post",
      platformLabel: "Instagram Post — square feed (1024×1024)",
    };
  }
  if (catalogNormalized.includes("facebook")) {
    return {
      ok: true,
      platformChoice: "Facebook Post",
      platformLabel: "Facebook Post — square feed (1024×1024)",
    };
  }
  if (catalogNormalized.includes("linkedin")) {
    return {
      ok: true,
      platformChoice: "LinkedIn Post",
      platformLabel: "LinkedIn Post — square feed (1024×1024)",
    };
  }
  if (catalogNormalized.includes("tiktok")) {
    return {
      ok: false,
      code: "UNSUPPORTED_PLATE_EXECUTION",
      message:
        "UNSUPPORTED_PLATE_EXECUTION: TikTok is recorded on catalog schema but " +
        "v2-rtu-social-posts Machine execution is square-feed CERT only today. " +
        "No silent portrait/native substitution.",
    };
  }

  return {
    ok: false,
    code: "INVALID_PLATFORM",
    message: `INVALID_PLATFORM: "${value}" is not an authorized social-posts platform choice`,
  };
}

/**
 * Studio production assignment of the four proven layout templates into
 * posting positions 1–4. Not customer intake. Not a fixed service-contract arc.
 */
export function assignStudioProductionSocialPostMembers(): SocialPostsQuad<SocialPostMemberTruth> {
  const members = SOCIAL_POST_ROLE_ANGLES.map((roleAngle, index) => {
    const orderIndex = (index + 1) as SocialPostOrderIndex;
    return {
      assetId: `social-post-${orderIndex}`,
      orderIndex,
      roleAngle,
    };
  });
  return members as unknown as SocialPostsQuad<SocialPostMemberTruth>;
}

/** Harbor CERT fixture members — explicit fixture authority, same template set. */
export function harborCertSocialPostMembers(): SocialPostsQuad<SocialPostMemberTruth> {
  return assignStudioProductionSocialPostMembers();
}

/**
 * Build authoritative four-post structure from live / flattened intake answers.
 * Fail-closed — never invent platform, plate, or a customer role menu.
 */
export function mapSocialPostsSetStructureFromIntakeAnswers(
  answers: Record<string, string | undefined>,
): SocialPostsIntakeStructureResult {
  const purpose = readAnswer(
    answers,
    SOCIAL_POSTS_INTAKE_FIELD_IDS.purposeChoice,
    SOCIAL_POSTS_INTAKE_FIELD_IDS.postsAbout,
  );
  if (!purpose) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: campaign purpose / postsAbout is required",
    };
  }

  const action = readAnswer(
    answers,
    SOCIAL_POSTS_INTAKE_FIELD_IDS.actionChoice,
    SOCIAL_POSTS_INTAKE_FIELD_IDS.callToAction,
  );
  if (!action) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: call-to-action / action choice is required",
    };
  }

  const platformRaw = readAnswer(
    answers,
    SOCIAL_POSTS_INTAKE_FIELD_IDS.platformChoice,
    SOCIAL_POSTS_INTAKE_FIELD_IDS.platform,
  );
  const placement = resolveSocialPostsPlatformPlacement(platformRaw);
  if (!placement.ok) return placement;

  // Reject any attempt to smuggle customer per-post role selects into truth.
  for (let i = 1; i <= SOCIAL_POSTS_EXACT_COUNT; i++) {
    const smuggled =
      answers[`post${i}_role`] ??
      answers[`post${i}_roleAngle`] ??
      answers[`socialPost${i}_roleAngle`];
    if (smuggled?.trim()) {
      return {
        ok: false,
        code: "MISSING_REQUIRED_TRUTH",
        message:
          "MISSING_REQUIRED_TRUTH: per-post roleAngle is not a customer intake " +
          "field for v2-rtu-social-posts. Studio production assigns proven " +
          "layout templates; do not treat Harbor CERT roles as customer contract.",
      };
    }
  }

  const assets = assignStudioProductionSocialPostMembers();
  const angles = new Set(assets.map((a) => a.roleAngle));
  if (angles.size !== SOCIAL_POSTS_EXACT_COUNT) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: Studio production must assign four distinct layout templates",
    };
  }

  return {
    ok: true,
    structure: {
      skuId: DESIGN_RENDERER_SOCIAL_POSTS_SKU,
      platformChoice: placement.platformChoice,
      platformLabel: placement.platformLabel,
      plateId: SOCIAL_POSTS_SQUARE_PLATE.plateId,
      canvas: {
        widthPx: SOCIAL_POSTS_SQUARE_PLATE.widthPx,
        heightPx: SOCIAL_POSTS_SQUARE_PLATE.heightPx,
      },
      roleAngleAuthority: "studio_production_layout_assignment",
      roleAngleClassification: SOCIAL_POSTS_ROLE_ANGLE_CLASSIFICATION,
      captionSource: "studio_written_from_campaign_truth",
      assets,
    },
  };
}

export function hasSocialPostsSetStructureIntakeTruth(
  answers: Record<string, string | undefined>,
): boolean {
  return mapSocialPostsSetStructureFromIntakeAnswers(answers).ok;
}

/** Only the CERT square plate is executable for social-posts today. */
export const SOCIAL_POSTS_EXECUTABLE_PLATE_IDS: ReadonlySet<SocialPostPlateId> =
  new Set([SOCIAL_POSTS_SQUARE_PLATE.plateId]);

/**
 * Portrait (or any non-square) must fail closed — Instagram chip copy is not
 * an execution authorization.
 */
export function assertSocialPostsStructureExecutableForDispatch(
  structure: SocialPostsSetStructureTruth,
):
  | { ok: true }
  | {
      ok: false;
      code: "UNSUPPORTED_PLATE_EXECUTION";
      message: string;
    } {
  if (!SOCIAL_POSTS_EXECUTABLE_PLATE_IDS.has(structure.plateId)) {
    return {
      ok: false,
      code: "UNSUPPORTED_PLATE_EXECUTION",
      message:
        `UNSUPPORTED_PLATE_EXECUTION: social-posts plate ${structure.plateId} ` +
        `is not proven for Machine execution (executable: ` +
        `${SOCIAL_POSTS_SQUARE_PLATE.plateId}). No silent substitution.`,
    };
  }
  if (structure.assets.length !== SOCIAL_POSTS_EXACT_COUNT) {
    return {
      ok: false,
      code: "UNSUPPORTED_PLATE_EXECUTION",
      message: `UNSUPPORTED_PLATE_EXECUTION: social-posts requires exactly ${SOCIAL_POSTS_EXACT_COUNT} members`,
    };
  }
  for (const asset of structure.assets) {
    if (
      !(SOCIAL_POST_ROLE_ANGLES as readonly string[]).includes(asset.roleAngle)
    ) {
      return {
        ok: false,
        code: "UNSUPPORTED_PLATE_EXECUTION",
        message:
          `UNSUPPORTED_PLATE_EXECUTION: roleAngle "${asset.roleAngle}" is not a ` +
          `proven social layout template. Do not invent layouts at dispatch.`,
      };
    }
  }
  return { ok: true };
}

export function isProvenSocialPostRoleAngle(
  value: string,
): value is SocialPostRoleAngle {
  return (SOCIAL_POST_ROLE_ANGLES as readonly string[]).includes(value);
}
