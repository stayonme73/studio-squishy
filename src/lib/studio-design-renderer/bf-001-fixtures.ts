/**
 * Harbor & Oak fixtures for BF-001 PROOF-1.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";

import { recipeForGraphicKind } from "./bf-001-contracts";
import {
  DESIGN_RENDERER_BF_001_SKU,
  type Bf001GraphicKind,
  type Bf001RefreshProjectTruth,
} from "./bf-001-types";
import { HARBOR_OAK_LOGO_SVG } from "./fixtures";

export const BF_001_PROOF_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-BF-001-PROOF-1" as const;

export const BF_001_PROOF_ARTIFACT_ROOT =
  "docs/launch/studio-operating-design-bf-001-proof-1/artifacts/bf-001" as const;

const LOGO_REL =
  `${BF_001_PROOF_ARTIFACT_ROOT}/materials/harbor-oak-anchor-oak-oval-v1.svg` as const;

export function ensureHarborOakBf001LogoMaterial(repoRoot: string): {
  materialId: string;
  role: "logo";
  relativePath: string;
  contentSha256: string;
  approvedIdentitySourceId: string;
} {
  const abs = path.join(repoRoot, LOGO_REL);
  mkdirSync(path.dirname(abs), { recursive: true });
  if (!existsSync(abs) || readFileSync(abs, "utf8") !== HARBOR_OAK_LOGO_SVG) {
    writeFileSync(abs, HARBOR_OAK_LOGO_SVG, "utf8");
  }
  const contentSha256 = createHash("sha256")
    .update(readFileSync(abs))
    .digest("hex");
  return {
    materialId: "mat-harbor-oak-logo-v1",
    role: "logo",
    relativePath: LOGO_REL,
    contentSha256,
    approvedIdentitySourceId: harborOakIdentityLock.approvedLogoVariantIds[0],
  };
}

export function buildBf001RefreshTruth(input: {
  graphicKind: Bf001GraphicKind;
  campaignId: string;
  repoRoot: string;
  overrides?: Partial<
    Pick<
      Bf001RefreshProjectTruth,
      | "businessName"
      | "visualStartingPointNotes"
      | "likesDislikes"
      | "businessFacts"
      | "hexPalette"
      | "fontRecommendations"
      | "logoUsageRules"
      | "graphicRenderFontFamily"
      | "label"
      | "logoMaterial"
      | "plannedMembers"
      | "lockedPackageMemberCount"
    >
  >;
}): Bf001RefreshProjectTruth {
  const recipe = recipeForGraphicKind(input.graphicKind);
  const logo =
    input.overrides?.logoMaterial === undefined
      ? ensureHarborOakBf001LogoMaterial(input.repoRoot)
      : input.overrides.logoMaterial;
  const o = input.overrides ?? {};
  return {
    skuId: DESIGN_RENDERER_BF_001_SKU,
    campaignId: input.campaignId,
    jobId: `${input.campaignId}::bf-001`,
    dispatchId: `dispatch-${input.campaignId}`,
    businessName: o.businessName ?? "Harbor & Oak Studio",
    graphicKind: input.graphicKind,
    lockedPackageMemberCount: o.lockedPackageMemberCount ?? 2,
    plannedMembers: o.plannedMembers ?? recipe.plannedMembers,
    logoMaterial: logo,
    visualStartingPointNotes:
      o.visualStartingPointNotes ??
      "Existing oval oak-anchor mark on cream; warm oak + soft harbor blue already in use on business cards.",
    likesDislikes:
      o.likesDislikes ??
      "Like calm, timeless portrait tone. Dislike neon accents and dense poster layouts.",
    businessFacts:
      o.businessFacts ??
      "Downtown portrait sessions. Discovery calls by appointment.",
    hexPalette: o.hexPalette ?? [
      { role: "primary", hex: "#5C7A8A", label: "Harbor blue" },
      { role: "secondary", hex: "#C4A574", label: "Warm oak" },
      { role: "neutral", hex: "#F7F4EF", label: "Cream ground" },
      { role: "ink", hex: "#2C3E50", label: "Deep slate" },
    ],
    fontRecommendations: o.fontRecommendations ?? [
      {
        role: "primary",
        recommendedFamily: "Playfair Display",
        recommendationOnly: true,
        notes:
          "Recommendation for headlines on customer-owned materials — not a Studio render/license guarantee.",
      },
      {
        role: "secondary",
        recommendedFamily: "Source Sans 3",
        recommendationOnly: true,
        notes:
          "Recommendation for body text on customer-owned materials — not a Studio render/license guarantee.",
      },
    ],
    logoUsageRules: o.logoUsageRules ?? {
      clearSpace: "Keep clear space around the mark equal to at least 1/8 of the mark height.",
      placement:
        "Center the mark on profile graphics; keep the mark in the safe center band on cover graphics.",
      backgroundContrast:
        "Prefer cream or soft slate grounds; avoid low-contrast oak-on-oak.",
      preferredLockup:
        "Prefer the existing oval lockup as supplied — do not invent a new lockup.",
      avoidDistortion:
        "Do not stretch, squash, skew, or recolor the mark outside the approved palette.",
      minimumSize: "Keep the mark large enough that the oak detail remains readable.",
      consistency: "Use the same supplied mark and colorway across surfaces.",
      redesignForbidden: true,
    },
    // Graphic uses Studio-safe Georgia — not the recommended Playfair Display.
    graphicRenderFontFamily:
      o.graphicRenderFontFamily ?? 'Georgia, "Times New Roman", serif',
    label: o.label ?? `Harbor & Oak — bf-001 ${input.graphicKind} refresh`,
  };
}

/** Illegal: profile + cover members in one package. */
export function buildBf001ProfileAndCoverTruth(input: {
  campaignId: string;
  repoRoot: string;
}): Bf001RefreshProjectTruth {
  const base = buildBf001RefreshTruth({
    graphicKind: "profile",
    campaignId: input.campaignId,
    repoRoot: input.repoRoot,
  });
  return {
    ...base,
    lockedPackageMemberCount: 2,
    plannedMembers: [
      base.plannedMembers[0]!,
      {
        memberId: "profile_or_cover_graphic",
        kind: "design_profile",
        order: 2,
        memberPurpose: "Illegal dual — profile",
        agreedPlateId: recipeForGraphicKind("profile").plannedMembers[1]!
          .agreedPlateId,
      },
      {
        memberId: "profile_or_cover_graphic",
        kind: "design_cover",
        order: 3,
        memberPurpose: "Illegal dual — cover",
        agreedPlateId: recipeForGraphicKind("cover").plannedMembers[1]!
          .agreedPlateId,
      },
    ],
  };
}
