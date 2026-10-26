import { studioDesignIntelligenceV1 } from "@/config/studio-design-intelligence-v1";

import { DESIGN_PALETTE_FAMILIES } from "./library";
import type {
  AntiCopyVerdict,
  DesignCreativeRoute,
  VisualSignature,
} from "./types";

const MAYA_NAVY = "#1F3A5F";
const MAYA_GOLD = "#C4A574";

export const BLOCKED_SEED_SIGNATURES: readonly VisualSignature[] = [
  {
    campaignId: "seed:maya-like-default",
    source: "blocked_seed",
    paletteFamilyId: "navy_gold_house",
    primaryHex: MAYA_NAVY,
    secondaryHex: MAYA_GOLD,
    layoutFamilyId: "centered_promotional_plate",
    geometryId: "centered_circle",
    typeSystemId: "editorial_serif",
    headlineAlign: "center",
    ctaTreatment: "pill",
    contentDistribution: "top_third",
    recordedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    campaignId: "9c6c25f2-2562-4192-97a5-44536e45cd18:v4",
    source: "blocked_seed",
    paletteFamilyId: "navy_gold_house",
    primaryHex: MAYA_NAVY,
    secondaryHex: MAYA_GOLD,
    layoutFamilyId: "centered_promotional_plate",
    geometryId: "centered_circle",
    typeSystemId: "editorial_serif",
    headlineAlign: "center",
    ctaTreatment: "pill",
    contentDistribution: "top_third",
    recordedAt: "2026-09-12T22:27:05.114Z",
  },
];

function hexClose(a: string, b: string): boolean {
  return a.replace("#", "").toUpperCase() === b.replace("#", "").toUpperCase();
}

export function isMayaLikeDefault(input: {
  primaryHex: string;
  secondaryHex: string;
  geometryId: string;
  layoutFamilyId: string;
}): boolean {
  const paletteMatch =
    hexClose(input.primaryHex, MAYA_NAVY) &&
    hexClose(input.secondaryHex, MAYA_GOLD);
  const geometryMatch =
    input.geometryId === studioDesignIntelligenceV1.antiCopy.blockedDefaultGeometryId;
  const layoutMatch =
    input.layoutFamilyId ===
    studioDesignIntelligenceV1.antiCopy.blockedDefaultLayoutId;
  return paletteMatch || (geometryMatch && layoutMatch);
}

function reuseScore(a: VisualSignature, route: DesignCreativeRoute): number {
  let score = 0;
  if (a.paletteFamilyId === route.paletteFamilyId) score += 3;
  if (a.geometryId === route.geometryId) score += 3;
  if (a.layoutFamilyId === route.layoutFamilyId) score += 2;
  if (a.typeSystemId === route.typeSystemId) score += 1;
  if (a.contentDistribution === "top_third") score += 2;
  const palette = DESIGN_PALETTE_FAMILIES[route.paletteFamilyId];
  if (hexClose(a.primaryHex, palette.primary) && hexClose(a.secondaryHex, palette.secondary)) {
    score += 2;
  }
  return score;
}

export function evaluateAntiCopy(input: {
  route: DesignCreativeRoute;
  recent: readonly VisualSignature[];
  independentlyJustified?: boolean;
  currentCampaignId?: string;
}): AntiCopyVerdict {
  const palette = DESIGN_PALETTE_FAMILIES[input.route.paletteFamilyId];
  if (
    isMayaLikeDefault({
      primaryHex: palette.primary,
      secondaryHex: palette.secondary,
      geometryId: input.route.geometryId,
      layoutFamilyId: input.route.layoutFamilyId,
    }) &&
    !input.independentlyJustified
  ) {
    return {
      ok: false,
      id: "maya_like_default",
      message:
        "Creative direction repeats the Maya-like Studio default (navy/gold and/or centered circular plate). A new customer may not inherit that signature unless the brief independently supports it.",
      matchedAgainst: "seed:maya-like-default",
    };
  }
  for (const prior of input.recent) {
    if (
      input.currentCampaignId &&
      (prior.campaignId === input.currentCampaignId ||
        prior.campaignId.startsWith(`${input.currentCampaignId}:`))
    ) {
      continue;
    }
    if (reuseScore(prior, input.route) >= 6 && !input.independentlyJustified) {
      return {
        ok: false,
        id: "derivative_visual_signature",
        message:
          "Proposed creative direction reuses too much visual DNA from a prior Design job (palette, geometry, layout skeleton, and type).",
        matchedAgainst: prior.campaignId,
      };
    }
  }
  return { ok: true };
}
