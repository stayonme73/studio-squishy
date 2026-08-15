/**
 * BF-001 composition validation — CONTRACT-TRUTH-1 freeze.
 */

import {
  BF_001_COVER_PLATE,
  BF_001_PROFILE_PLATE,
  BF_001_SHEET_PLATE,
  BF_001_STUDIO_SAFE_FONTS,
  DESIGN_RENDERER_BF_001_SKU,
  type Bf001GraphicKind,
  type Bf001PlannedMember,
  type Bf001RefreshProjectTruth,
} from "./bf-001-types";

export const BF_001_PROOF_CONTRACT = {
  packageId: "STUDIO-OPERATING-DESIGN-BF-001-PROOF-1",
  skuId: DESIGN_RENDERER_BF_001_SKU,
  lockedPackageMemberCount: 2 as const,
  canvaRequired: false,
  remapAuthorized: false,
  ownerRoutine: "NONE" as const,
  inventFromNothing: false,
  newLogoCreation: false,
  naming: false,
  messagingTaglines: false,
  fontSectionMode: "recommendations_only" as const,
  logoUsageMode: "usage_guidance_only" as const,
} as const;

export function isDesignRendererBf001Sku(skuId: string): boolean {
  return skuId === DESIGN_RENDERER_BF_001_SKU;
}

export function isBf001StudioSafeFont(fontFamilyCss: string): boolean {
  const parts = fontFamilyCss
    .split(",")
    .map((p) => p.trim().replace(/^["']|["']$/g, "").toLowerCase());
  if (parts.length === 0) return false;
  const allowed = new Set(
    BF_001_STUDIO_SAFE_FONTS.map((f) => f.toLowerCase()),
  );
  return parts.every((p) => allowed.has(p));
}

export function plateForGraphicKind(kind: Bf001GraphicKind): {
  plateId: string;
  widthPx: number;
  heightPx: number;
} {
  return kind === "profile" ? BF_001_PROFILE_PLATE : BF_001_COVER_PLATE;
}

export function recipeForGraphicKind(
  kind: Bf001GraphicKind,
): {
  lockedPackageMemberCount: 2;
  plannedMembers: readonly Bf001PlannedMember[];
} {
  const graphicPlate = plateForGraphicKind(kind);
  return {
    lockedPackageMemberCount: 2,
    plannedMembers: [
      {
        memberId: "brand_direction_sheet",
        kind: "strategy_document",
        order: 1,
        memberPurpose: "One-page Brand Direction Sheet",
        agreedPlateId: BF_001_SHEET_PLATE.plateId,
      },
      {
        memberId: "profile_or_cover_graphic",
        kind: kind === "profile" ? "design_profile" : "design_cover",
        order: 2,
        memberPurpose:
          kind === "profile"
            ? "Branded profile graphic"
            : "Branded cover graphic",
        agreedPlateId: graphicPlate.plateId,
      },
    ],
  };
}

export type Bf001CompositionValidation =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function validateBf001PackageComposition(
  truth: Bf001RefreshProjectTruth,
): Bf001CompositionValidation {
  if (truth.skuId !== DESIGN_RENDERER_BF_001_SKU) {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: `MEMBERSHIP_MISMATCH: skuId must be ${DESIGN_RENDERER_BF_001_SKU}`,
    };
  }

  const name = truth.businessName?.trim() ?? "";
  if (!name) {
    return {
      ok: false,
      code: "BUSINESS_NAME_MISSING",
      message: "BUSINESS_NAME_MISSING: existing business name required",
    };
  }

  if (!truth.graphicKind || (truth.graphicKind !== "profile" && truth.graphicKind !== "cover")) {
    return {
      ok: false,
      code: "NO_GRAPHIC_SELECTED",
      message: "NO_GRAPHIC_SELECTED: graphic kind must be profile XOR cover",
    };
  }

  // Detect illegal dual selection before length checks so the fail code is precise.
  const graphicKinds = new Set(
    truth.plannedMembers
      .filter((m) => m.memberId === "profile_or_cover_graphic")
      .map((m) => m.kind),
  );
  if (graphicKinds.has("design_profile") && graphicKinds.has("design_cover")) {
    return {
      ok: false,
      code: "PROFILE_AND_COVER",
      message: "PROFILE_AND_COVER: exactly one graphic kind per package",
    };
  }
  if (truth.plannedMembers.filter((m) => m.memberId === "profile_or_cover_graphic").length > 1) {
    return {
      ok: false,
      code: "PROFILE_AND_COVER",
      message: "PROFILE_AND_COVER: exactly one graphic member per package",
    };
  }

  if (!truth.logoMaterial?.contentSha256 || !truth.logoMaterial.relativePath) {
    return {
      ok: false,
      code: "STARTING_POINT_INSUFFICIENT",
      message:
        "STARTING_POINT_INSUFFICIENT: customer-supplied logo/visual starting point required — invent-from-nothing forbidden",
    };
  }

  const notes = truth.visualStartingPointNotes?.trim() ?? "";
  if (!notes) {
    return {
      ok: false,
      code: "STARTING_POINT_INSUFFICIENT",
      message:
        "STARTING_POINT_INSUFFICIENT: visual starting point notes required",
    };
  }

  if (truth.lockedPackageMemberCount !== 2) {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: "MEMBERSHIP_MISMATCH: lockedPackageMemberCount must be 2",
    };
  }

  const expected = recipeForGraphicKind(truth.graphicKind);
  if (truth.plannedMembers.length !== 2) {
    return {
      ok: false,
      code: "MEMBERSHIP_MISMATCH",
      message: `MEMBERSHIP_MISMATCH: expected 2 members, got ${truth.plannedMembers.length}`,
    };
  }

  for (let i = 0; i < expected.plannedMembers.length; i++) {
    const exp = expected.plannedMembers[i]!;
    const got = truth.plannedMembers[i]!;
    if (
      got.memberId !== exp.memberId ||
      got.kind !== exp.kind ||
      got.order !== exp.order ||
      got.agreedPlateId !== exp.agreedPlateId
    ) {
      return {
        ok: false,
        code: "MEMBERSHIP_MISMATCH",
        message: `MEMBERSHIP_MISMATCH: member ${i + 1} does not match frozen recipe`,
      };
    }
  }

  if (truth.hexPalette.length < 2) {
    return {
      ok: false,
      code: "SHEET_QA_FAIL",
      message: "SHEET_QA_FAIL: HEX palette requires at least two swatches",
    };
  }
  for (const swatch of truth.hexPalette) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(swatch.hex)) {
      return {
        ok: false,
        code: "SHEET_QA_FAIL",
        message: `SHEET_QA_FAIL: invalid HEX ${swatch.hex}`,
      };
    }
  }

  if (truth.fontRecommendations.length < 1) {
    return {
      ok: false,
      code: "SHEET_QA_FAIL",
      message: "SHEET_QA_FAIL: font recommendations required",
    };
  }
  for (const fr of truth.fontRecommendations) {
    if (!fr.recommendationOnly) {
      return {
        ok: false,
        code: "SHEET_QA_FAIL",
        message:
          "SHEET_QA_FAIL: font entries must be recommendationOnly — not render guarantees",
      };
    }
  }

  if (!truth.logoUsageRules?.redesignForbidden) {
    return {
      ok: false,
      code: "LOGO_REDRAW_FORBIDDEN",
      message: "LOGO_REDRAW_FORBIDDEN: logo usage must forbid redesign",
    };
  }

  if (!isBf001StudioSafeFont(truth.graphicRenderFontFamily)) {
    return {
      ok: false,
      code: "STUDIO_SAFE_FONT_VIOLATION",
      message: `STUDIO_SAFE_FONT_VIOLATION: graphic font "${truth.graphicRenderFontFamily}" is not Studio-safe`,
    };
  }

  return { ok: true };
}
