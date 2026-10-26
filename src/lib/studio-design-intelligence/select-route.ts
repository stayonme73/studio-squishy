import { DESIGN_INTELLIGENCE_VERSION } from "@/config/studio-design-intelligence-v1";
import type { FlyerReasoningConstraints } from "@/config/studio-autonomous-production-loop-v1";

import { evaluateAntiCopy } from "./anti-copy";
import type { DesignCreativeBrief } from "./types";
import {
  LAYOUT_ARCHETYPES,
  paletteById,
  preferredLayoutsFor,
  preferredPaletteFor,
} from "./library";
import type {
  DesignCreativeRoute,
  DesignLayoutFamilyId,
  DesignTypeSystemId,
  FlyerCreativeDirection,
  VisualSignature,
} from "./types";

function typeSystemFor(layout: DesignLayoutFamilyId): DesignTypeSystemId {
  if (layout === "bold_asymmetric") return "condensed_sans";
  if (layout === "service_rail") return "grotesque_sans";
  if (layout === "type_led_premium") return "tracked_display_serif";
  if (layout === "modular_thirds") return "editorial_serif";
  return "editorial_serif";
}

export function proposeCreativeRoutes(brief: DesignCreativeBrief): DesignCreativeRoute[] {
  const layouts = preferredLayoutsFor(brief.industryFamily).filter(
    (id) => id !== "centered_promotional_plate",
  );
  const primaryPalette = brief.existingBrandColors
    ? brief.existingBrandColors.familyId
    : preferredPaletteFor({
        industryFamily: brief.industryFamily,
        moodId: brief.moodId,
        chooseForMe: brief.chooseForMe,
      });
  const altPalettes = (
    [
      primaryPalette,
      brief.moodId === "creative_edgy" ? "ink_ember" : "graphite_paper",
      brief.industryFamily === "food_hospitality"
        ? "wine_cream"
        : "harvest_terracotta",
    ] as const
  ).filter((id, index, all) => all.indexOf(id) === index);

  return layouts.slice(0, 3).map((layout, index) => {
    const archetype = LAYOUT_ARCHETYPES[layout];
    const paletteFamilyId = altPalettes[index] ?? primaryPalette;
    return {
      routeId: `route-${String.fromCharCode(65 + index)}`,
      label:
        index === 0
          ? "editorial/minimal"
          : index === 1
            ? "bold/asymmetrical"
            : "premium/type-led",
      layoutFamilyId: layout,
      paletteFamilyId,
      typeSystemId: typeSystemFor(layout),
      geometryId: archetype.geometryId,
      rationale: `${archetype.editorialNote} Palette ${paletteFamilyId} from ${brief.industryFamily} / ${brief.moodId}.`,
    };
  });
}

function scoreRoute(
  route: DesignCreativeRoute,
  brief: DesignCreativeBrief,
  recent: readonly VisualSignature[],
): number {
  let score = 8;
  const anti = evaluateAntiCopy({
    route,
    recent,
    independentlyJustified: Boolean(
      brief.existingBrandColors &&
        brief.existingBrandColors.familyId === route.paletteFamilyId,
    ),
  });
  if (!anti.ok) score -= 12;
  if (route.layoutFamilyId === "centered_promotional_plate") score -= 10;
  if (route.geometryId === "centered_circle") score -= 8;
  if (route.paletteFamilyId === "navy_gold_house" && !brief.existingBrandColors) {
    score -= 12;
  }
  if (
    brief.moodId === "creative_edgy" &&
    (route.layoutFamilyId === "editorial_split" ||
      route.layoutFamilyId === "type_led_premium")
  ) {
    score += 3;
  }
  if (brief.moodId === "bold_energetic" && route.layoutFamilyId === "bold_asymmetric") {
    score += 3;
  }
  if (
    brief.moodId === "professional_polished" &&
    route.layoutFamilyId === "service_rail"
  ) {
    score += 2;
  }
  if (!brief.cta && route.layoutFamilyId === "bold_asymmetric") score -= 1;
  return score;
}

export function selectCreativeDirection(input: {
  brief: DesignCreativeBrief;
  recent: readonly VisualSignature[];
  constraints?: FlyerReasoningConstraints;
  selectionMode?: FlyerCreativeDirection["selectionMode"];
}): FlyerCreativeDirection {
  const proposed = proposeCreativeRoutes(input.brief);
  const excluded = new Set(input.constraints?.excludeLayoutFamilyIds ?? []);
  const usable = proposed.filter((route) => !excluded.has(route.layoutFamilyId));
  const ranked = [...(usable.length ? usable : proposed)].sort(
    (a, b) =>
      scoreRoute(b, input.brief, input.recent) -
      scoreRoute(a, input.brief, input.recent),
  );
  let selected = ranked[0]!;
  if (input.constraints?.preferAlternateLayoutFamily && ranked[1]) {
    selected = ranked[1]!;
  }
  const anti = evaluateAntiCopy({
    route: selected,
    recent: input.recent,
    independentlyJustified: Boolean(input.brief.existingBrandColors),
  });
  if (!anti.ok) {
    const next = ranked.find(
      (route) =>
        evaluateAntiCopy({
          route,
          recent: input.recent,
        }).ok,
    );
    if (next) selected = next;
  }
  return {
    intelligenceVersion: DESIGN_INTELLIGENCE_VERSION,
    brief: input.brief,
    selectedRoute: selected,
    candidateRoutes: proposed,
    selectionMode: input.selectionMode ?? "deterministic_score",
    chosenForCustomer: true,
  };
}

export function applySelectedRoute(
  direction: FlyerCreativeDirection,
  routeId: string,
): FlyerCreativeDirection {
  const selected =
    direction.candidateRoutes.find((route) => route.routeId === routeId) ??
    direction.selectedRoute;
  return { ...direction, selectedRoute: selected };
}

export { paletteById };
