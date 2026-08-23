/**
 * STUDIO-OPERATING-DESIGN-BF-001-DISPATCH-HOOK-1
 *
 * Map paid bf001PostPayDispatchStructure (+ payment seal) → Bf001RefreshProjectTruth.
 * The purchased 2-member refresh package is law — never invent / reorder /
 * substitute members, graphic kind, or the customer-supplied starting point.
 *
 * bf-001 refreshes what exists: existing business name, supplied logo placed
 * (never redrawn), sheet fonts as recommendations only, graphic rendered with
 * Studio-safe faces.
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_BF_001_SKU,
  assertBf001PostPayStructureDispatchReady,
  assertBf001PostPayStructureMatchesPaymentSeal,
  recipeForGraphicKind,
  type Bf001FontRecommendation,
  type Bf001HexSwatch,
  type Bf001LogoUsageRules,
  type Bf001PackagePaymentSeal,
  type Bf001PlannedMember,
  type Bf001PostPayDispatchStructure,
  type Bf001RefreshProjectTruth,
} from "@/lib/studio-design-renderer";

import {
  requireApprovedLogoFile,
  resolveApprovedLogoMaterial,
} from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export const BF_001_DISPATCH_WIRING_SCOPE_NOTE =
  "STUDIO-OPERATING-DESIGN-BF-001-DISPATCH-HOOK-1 — Owner-independent Machine path. " +
  "Paid bf001PackageSeal + bf001PostPayDispatchStructure required. " +
  "Purchased 2-member refresh membership (Brand Direction Sheet + one profile XOR cover graphic) " +
  "and the customer-supplied visual starting point are law. " +
  "No naming, no new logo, no messaging. Sheet fonts are recommendations only; the graphic renders Studio-safe faces. " +
  "Canva not on the fulfillment spine; Make not required; Owner routine production NONE.";

/**
 * Studio production baselines for the refresh render.
 * These are Studio presentation defaults for the sheet/graphic surfaces — they
 * do not decide scope, membership, or what the customer bought.
 */
export const BF_001_STUDIO_BASELINE_PALETTE: readonly Bf001HexSwatch[] = [
  { role: "primary", hex: "#1F3A5F", label: "Studio deep navy" },
  { role: "secondary", hex: "#C4A574", label: "Studio warm oak" },
  { role: "neutral", hex: "#F7F4EF", label: "Studio cream ground" },
  { role: "ink", hex: "#1A1A1A", label: "Studio ink" },
];

export const BF_001_STUDIO_BASELINE_FONT_RECOMMENDATIONS: readonly Bf001FontRecommendation[] =
  [
    {
      role: "primary",
      recommendedFamily: "Playfair Display",
      recommendationOnly: true,
      notes:
        "Recommendation for headlines on your own materials — not a Studio render or license guarantee.",
    },
    {
      role: "secondary",
      recommendedFamily: "Source Sans 3",
      recommendationOnly: true,
      notes:
        "Recommendation for body text on your own materials — not a Studio render or license guarantee.",
    },
  ];

export const BF_001_STUDIO_BASELINE_LOGO_USAGE_RULES: Bf001LogoUsageRules = {
  clearSpace:
    "Keep clear space around the mark equal to at least 1/8 of the mark height.",
  placement:
    "Center the mark on profile graphics; keep the mark inside the safe center band on cover graphics.",
  backgroundContrast:
    "Place the mark on a light, low-noise ground so the shape stays readable.",
  preferredLockup:
    "Use the lockup you already supplied — do not invent a new lockup.",
  avoidDistortion:
    "Do not stretch, squash, skew, or recolor the mark outside your palette.",
  minimumSize: "Keep the mark large enough that its detail stays readable.",
  consistency: "Use the same supplied mark and colorway across surfaces.",
  redesignForbidden: true,
};

/** Studio-safe render face for the delivered graphic. */
export const BF_001_GRAPHIC_RENDER_FONT_FAMILY =
  'Georgia, "Times New Roman", serif' as const;

export type Bf001TruthMapResult =
  | {
      ok: true;
      truth: Bf001RefreshProjectTruth;
      structure: Bf001PostPayDispatchStructure;
    }
  | {
      ok: false;
      code:
        | "MISSING_PAYMENT_SEAL"
        | "MISSING_POSTPAY_STRUCTURE"
        | "SEAL_STRUCTURE_MISMATCH"
        | "MISSING_REQUIRED_MATERIAL"
        | "BROKEN_ASSET_REFERENCE"
        | "MISSING_REQUIRED_TRUTH"
        | "BUSINESS_NAME_MISSING"
        | "STARTING_POINT_INSUFFICIENT"
        | "STARTING_POINT_NOT_CUSTOMER_SUPPLIED"
        | "GRAPHIC_KIND_MISMATCH"
        | "NO_GRAPHIC_SELECTED"
        | "PROFILE_AND_COVER"
        | "MEMBER_COUNT_MISMATCH"
        | "MEMBER_IDENTITY_MISMATCH"
        | "MEMBER_KIND_MISMATCH"
        | "SHEET_MEMBER_MISSING"
        | "GRAPHIC_MEMBER_MISSING"
        | "PLATE_TAMPER"
        | "PARTIAL_PACKAGE_FORBIDDEN"
        | "SCOPE_FORBIDDEN"
        | "LOGO_REDRAW_FORBIDDEN"
        | "SKU_NOT_SUPPORTED"
        | "BF_001_NOT_PAID";
      message: string;
    };

/**
 * Build composer input from the paid structure only.
 * Membership / graphic kind / plates / starting point come exclusively from the
 * paid structure (+ matching seal) — never from SKU or graphic-kind guesses.
 */
export function mapBf001RefreshProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): Bf001TruthMapResult {
  const record = input.dispatchRecord;
  if (record.skuId !== DESIGN_RENDERER_BF_001_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `bf-001 mapper refuses SKU ${record.skuId}`,
    };
  }

  if (
    !input.campaign.paymentReceivedAt &&
    input.campaign.paymentTruth?.status !== "confirmed"
  ) {
    return {
      ok: false,
      code: "BF_001_NOT_PAID",
      message:
        "BF_001_NOT_PAID: confirmed payment required before Brand Identity Refresh dispatch",
    };
  }

  const seal = input.campaign.paymentTruth?.bf001PackageSeal as
    | Bf001PackagePaymentSeal
    | undefined;
  if (!seal) {
    return {
      ok: false,
      code: "MISSING_PAYMENT_SEAL",
      message: "MISSING_PAYMENT_SEAL: paymentTruth.bf001PackageSeal required",
    };
  }

  const structure = input.campaign.bf001PostPayDispatchStructure;
  if (!structure) {
    return {
      ok: false,
      code: "MISSING_POSTPAY_STRUCTURE",
      message:
        "MISSING_POSTPAY_STRUCTURE: campaign.bf001PostPayDispatchStructure required",
    };
  }

  const matched = assertBf001PostPayStructureMatchesPaymentSeal(
    structure,
    seal,
  );
  if (!matched.ok) {
    return {
      ok: false,
      code: "SEAL_STRUCTURE_MISMATCH",
      message: matched.message,
    };
  }

  const ready = assertBf001PostPayStructureDispatchReady(structure);
  if (!ready.ok) {
    return {
      ok: false,
      code: "SEAL_STRUCTURE_MISMATCH",
      message: ready.message,
    };
  }

  if (
    structure.newLogoRequested !== false ||
    structure.namingRequested !== false ||
    structure.messagingRequested !== false ||
    seal.newLogoRequested !== false ||
    seal.namingRequested !== false ||
    seal.messagingRequested !== false
  ) {
    return {
      ok: false,
      code: "SCOPE_FORBIDDEN",
      message:
        "SCOPE_FORBIDDEN: bf-001 dispatch refuses naming, new-logo, or messaging scope",
    };
  }

  if (
    structure.packageScope !== "brand_refresh_two_member_package" ||
    structure.lockedPackageMemberCount !== 2 ||
    structure.members.length !== 2
  ) {
    return {
      ok: false,
      code: "PARTIAL_PACKAGE_FORBIDDEN",
      message:
        "PARTIAL_PACKAGE_FORBIDDEN: bf-001 dispatch requires the full 2-member refresh package",
    };
  }

  if (
    structure.startingPointSource !== "customer_supplied" ||
    seal.startingPointSource !== "customer_supplied"
  ) {
    return {
      ok: false,
      code: "STARTING_POINT_NOT_CUSTOMER_SUPPLIED",
      message:
        "STARTING_POINT_NOT_CUSTOMER_SUPPLIED: the visual starting point must remain customer-supplied",
    };
  }

  if (structure.logoUsageMode !== "usage_guidance_only") {
    return {
      ok: false,
      code: "LOGO_REDRAW_FORBIDDEN",
      message:
        "LOGO_REDRAW_FORBIDDEN: the supplied mark is placed, never redrawn",
    };
  }

  const businessName = structure.businessName?.trim() ?? "";
  if (!businessName) {
    return {
      ok: false,
      code: "BUSINESS_NAME_MISSING",
      message:
        "BUSINESS_NAME_MISSING: paid structure missing the existing business name",
    };
  }

  const starting = structure.startingPointIdentity;
  if (
    !starting.visualStartingPointNotes.trim() ||
    !starting.logoMaterialNote.trim()
  ) {
    return {
      ok: false,
      code: "STARTING_POINT_INSUFFICIENT",
      message:
        "STARTING_POINT_INSUFFICIENT: paid structure missing the customer-supplied visual starting point",
    };
  }
  if (!starting.likesDislikes.trim() || !starting.businessFacts.trim()) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: paid structure missing likes/dislikes or business facts for the Brand Direction Sheet",
    };
  }

  if (
    structure.graphicKind !== "profile" &&
    structure.graphicKind !== "cover"
  ) {
    return {
      ok: false,
      code: "NO_GRAPHIC_SELECTED",
      message:
        "NO_GRAPHIC_SELECTED: paid structure graphic kind must be profile XOR cover",
    };
  }
  if (structure.graphicKind !== seal.graphicKind) {
    return {
      ok: false,
      code: "GRAPHIC_KIND_MISMATCH",
      message:
        "GRAPHIC_KIND_MISMATCH: structure graphic kind does not match the paid seal",
    };
  }

  const recipe = recipeForGraphicKind(structure.graphicKind);
  if (structure.lockedPackageMemberCount !== recipe.lockedPackageMemberCount) {
    return {
      ok: false,
      code: "MEMBER_COUNT_MISMATCH",
      message: `MEMBER_COUNT_MISMATCH: structure N=${structure.lockedPackageMemberCount} vs recipe ${recipe.lockedPackageMemberCount}`,
    };
  }

  const plannedMembers: Bf001PlannedMember[] = [];
  for (let i = 0; i < structure.members.length; i++) {
    const m = structure.members[i]!;
    const expected = recipe.plannedMembers[i]!;
    if (m.memberId !== expected.memberId || m.order !== expected.order) {
      return {
        ok: false,
        code: "MEMBER_IDENTITY_MISMATCH",
        message: `MEMBER_IDENTITY_MISMATCH: slot ${i + 1} expected ${expected.memberId} at order ${expected.order}`,
      };
    }
    if (m.kind !== expected.kind) {
      return {
        ok: false,
        code: "MEMBER_KIND_MISMATCH",
        message: `MEMBER_KIND_MISMATCH: ${m.memberId} must be ${expected.kind}`,
      };
    }
    if (m.agreedPlateId !== expected.agreedPlateId) {
      return {
        ok: false,
        code: "PLATE_TAMPER",
        message: `PLATE_TAMPER: ${m.memberId} plate must be ${expected.agreedPlateId}`,
      };
    }
    plannedMembers.push({
      memberId: expected.memberId,
      kind: expected.kind,
      order: expected.order,
      memberPurpose: m.memberPurpose || expected.memberPurpose,
      agreedPlateId: expected.agreedPlateId,
    });
  }

  const ids = new Set(plannedMembers.map((m) => m.memberId));
  if (!ids.has("brand_direction_sheet")) {
    return {
      ok: false,
      code: "SHEET_MEMBER_MISSING",
      message: "SHEET_MEMBER_MISSING: Brand Direction Sheet member required",
    };
  }
  if (!ids.has("profile_or_cover_graphic")) {
    return {
      ok: false,
      code: "GRAPHIC_MEMBER_MISSING",
      message:
        "GRAPHIC_MEMBER_MISSING: one branded profile or cover graphic required",
    };
  }
  const graphicKinds = new Set(
    plannedMembers
      .filter((m) => m.memberId === "profile_or_cover_graphic")
      .map((m) => m.kind),
  );
  if (graphicKinds.has("design_profile") && graphicKinds.has("design_cover")) {
    return {
      ok: false,
      code: "PROFILE_AND_COVER",
      message: "PROFILE_AND_COVER: exactly one graphic member per package",
    };
  }

  const logo = requireApprovedLogoFile(
    resolveApprovedLogoMaterial({
    repoRoot: input.repoRoot,
    items: input.materials,
    skuId: DESIGN_RENDERER_BF_001_SKU,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  }),
  );
  if (!logo.ok) {
    return { ok: false, code: logo.code, message: logo.message };
  }
  const logoAbs = path.join(input.repoRoot, logo.material.relativePath);
  if (!existsSync(logoAbs)) {
    return {
      ok: false,
      code: "BROKEN_ASSET_REFERENCE",
      message: `BROKEN_ASSET_REFERENCE: supplied logo missing at ${logo.material.relativePath}`,
    };
  }

  const truth: Bf001RefreshProjectTruth = {
    skuId: DESIGN_RENDERER_BF_001_SKU,
    campaignId: input.campaign.campaignId,
    jobId: record.jobId,
    dispatchId: record.dispatchId,
    businessName,
    graphicKind: structure.graphicKind,
    lockedPackageMemberCount: 2,
    plannedMembers,
    logoMaterial: {
      materialId: logo.material.materialId,
      role: "logo",
      relativePath: logo.material.relativePath,
      contentSha256: logo.material.contentSha256,
      ...(logo.material.approvedIdentitySourceId
        ? { approvedIdentitySourceId: logo.material.approvedIdentitySourceId }
        : {}),
    },
    visualStartingPointNotes: starting.visualStartingPointNotes,
    likesDislikes: starting.likesDislikes,
    businessFacts: starting.businessFacts,
    hexPalette: BF_001_STUDIO_BASELINE_PALETTE,
    fontRecommendations: BF_001_STUDIO_BASELINE_FONT_RECOMMENDATIONS,
    logoUsageRules: BF_001_STUDIO_BASELINE_LOGO_USAGE_RULES,
    graphicRenderFontFamily: BF_001_GRAPHIC_RENDER_FONT_FAMILY,
    label: `${businessName} — bf-001 ${structure.graphicKind} refresh`,
  };

  return { ok: true, truth, structure };
}
