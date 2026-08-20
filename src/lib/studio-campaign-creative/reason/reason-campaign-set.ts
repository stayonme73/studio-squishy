/**
 * Campaign reasoner — chooses among approved recipes; never invents CSS.
 */

import type { AssetAssessment, CampaignVisualSystem, CreativeBrief } from "../contracts";
import { CAMPAIGN_FORMAT_ORDER } from "../formats";
import { getLayoutRecipe } from "../recipes";
import type {
  CampaignAssetSpec,
  CampaignCreativeSetSpec,
  CampaignDesignLayer,
  CampaignLayoutFamilyId,
  CampaignMaterialRef,
  CampaignTextLayer,
} from "../types";
import {
  CAMPAIGN_CREATIVE_SPEC_VERSION,
} from "../types";
import { assertNoInternalLeakInCampaignText } from "../customer-safe";

export function resolveHeroMaterialId(
  brief: CreativeBrief,
  assessments: readonly AssetAssessment[],
): string {
  const id = brief.selectedAssetIds.primaryPhotoId;
  const a = assessments.find((x) => x.assetId === id);
  if (!a) throw new Error(`HERO_ASSET_MISSING:${id}`);
  if (!a.technical.usable) {
    throw new Error(
      `HERO_ASSET_UNUSABLE:${id}:${a.technical.failReasons.join(",")}`,
    );
  }
  return id;
}

/**
 * Deterministic family pick: portrait-friendly photos → full-bleed;
 * landscape → image_panel; otherwise split.
 */
export function pickRecipeFamily(input: {
  brief: CreativeBrief;
  heroAssessment: AssetAssessment;
  system: CampaignVisualSystem;
}): { familyId: CampaignLayoutFamilyId; rationaleCodes: string[] } {
  const codes: string[] = ["bounded_grammar_only"];
  const approved = new Set(input.system.approvedLayoutFamilyIds);
  let familyId: CampaignLayoutFamilyId = "split_hero";

  if (input.heroAssessment.orientation === "portrait" && approved.has("full_bleed_hero")) {
    familyId = "full_bleed_hero";
    codes.push("portrait_prefers_full_bleed");
  } else if (
    input.heroAssessment.orientation === "landscape" &&
    approved.has("image_panel")
  ) {
    familyId = "image_panel";
    codes.push("landscape_prefers_image_panel");
  } else {
    codes.push("default_split_hero");
  }

  if (!approved.has(familyId)) {
    familyId = input.system.approvedLayoutFamilyIds[0] as CampaignLayoutFamilyId;
    codes.push("fallback_first_approved");
  }

  return { familyId, rationaleCodes: codes };
}

function textFromSlot(
  id: string,
  role: CampaignTextLayer["role"],
  content: string,
  box: { x: number; y: number; width: number; height: number },
  color: string,
  fontSizePx: number,
  weight: CampaignTextLayer["fontWeight"],
  align: CampaignTextLayer["align"] = "left",
  maxLines?: number,
): CampaignTextLayer {
  assertNoInternalLeakInCampaignText(content);
  return {
    type: "text",
    id,
    role,
    content,
    x: box.x,
    y: box.y,
    width: box.width,
    fontSizePx,
    fontWeight: weight,
    lineHeight: 1.2,
    color,
    align,
    maxLines,
  };
}

export function emitAssetLayers(input: {
  recipe: ReturnType<typeof getLayoutRecipe>;
  brief: CreativeBrief;
  system: CampaignVisualSystem;
  heroPreparedMaterialId: string;
  logoMaterialId: string;
}): CampaignDesignLayer[] {
  const { recipe, brief, system } = input;
  const layers: CampaignDesignLayer[] = [];
  const overlayFill = `rgba(31, 58, 77, ${system.imageTreatmentRules.overlayMaxOpacity})`;

  for (const slot of recipe.slots) {
    const b = slot.box;
    if (slot.role === "hero" && slot.kind === "image") {
      layers.push({
        type: "image",
        id: `${recipe.recipeId}-hero`,
        role: "hero",
        materialId: input.heroPreparedMaterialId,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        fit: slot.fit ?? "cover",
      });
      continue;
    }
    if (slot.role === "logo") {
      layers.push({
        type: "shape",
        id: `${recipe.recipeId}-logo-plate`,
        role: "logo_plate",
        x: b.x - 8,
        y: b.y - 8,
        width: b.width + 16,
        height: b.height + 16,
        fill: "#FFFFFF",
        borderRadiusPx: 16,
      });
      layers.push({
        type: "image",
        id: `${recipe.recipeId}-logo`,
        role: "logo",
        materialId: input.logoMaterialId,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        fit: "contain",
      });
      continue;
    }
    if (slot.role === "overlay") {
      layers.push({
        type: "shape",
        id: `${recipe.recipeId}-overlay`,
        role: "overlay",
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        fill: overlayFill,
      });
      continue;
    }
    if (slot.role === "content_panel") {
      layers.push({
        type: "shape",
        id: `${recipe.recipeId}-panel`,
        role: "content_panel",
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        fill: system.palette.background,
      });
      continue;
    }
    if (slot.role === "headline") {
      layers.push(
        textFromSlot(
          `${recipe.recipeId}-headline`,
          "headline",
          brief.facts.headline,
          b,
          recipe.familyId === "full_bleed_hero"
            ? "#F7F3EC"
            : system.palette.primary,
          Math.max(slot.minFontPx ?? 32, 32),
          700,
          "left",
          slot.maxLines,
        ),
      );
      continue;
    }
    if (slot.role === "body") {
      layers.push(
        textFromSlot(
          `${recipe.recipeId}-body`,
          "body",
          brief.facts.supportingCopy,
          b,
          system.palette.text,
          Math.max(slot.minFontPx ?? 20, 18),
          400,
          "left",
          slot.maxLines,
        ),
      );
      continue;
    }
    if (slot.role === "dates") {
      layers.push(
        textFromSlot(
          `${recipe.recipeId}-dates`,
          "dates",
          brief.facts.datesDisplay,
          b,
          recipe.familyId === "full_bleed_hero"
            ? "#E8E0D5"
            : system.palette.muted,
          Math.max(slot.minFontPx ?? 20, 18),
          500,
          "left",
          slot.maxLines,
        ),
      );
      continue;
    }
    if (slot.role === "price") {
      layers.push(
        textFromSlot(
          `${recipe.recipeId}-price`,
          "price",
          brief.facts.priceDisplay,
          b,
          recipe.familyId === "full_bleed_hero"
            ? "#FFFFFF"
            : system.palette.text,
          Math.max(slot.minFontPx ?? 36, 28),
          700,
          "left",
          slot.maxLines,
        ),
      );
      continue;
    }
    if (slot.role === "cta") {
      layers.push({
        type: "shape",
        id: `${recipe.recipeId}-cta-btn`,
        role: "cta_button",
        x: b.x,
        y: b.y,
        width: b.width,
        height: Math.max(b.height, system.ctaStyle.minHeightPx),
        fill: system.ctaStyle.background,
        borderRadiusPx: system.ctaStyle.borderRadiusPx,
      });
      layers.push(
        textFromSlot(
          `${recipe.recipeId}-cta`,
          "cta",
          brief.facts.cta,
          {
            x: b.x + 16,
            y: b.y + 16,
            width: b.width - 32,
            height: b.height - 24,
          },
          system.ctaStyle.textColor,
          Math.max(slot.minFontPx ?? 20, 18),
          600,
          "center",
          1,
        ),
      );
      continue;
    }
  }

  // Wordmark for identity on content-heavy recipes
  if (recipe.familyId !== "full_bleed_hero") {
    layers.push(
      textFromSlot(
        `${recipe.recipeId}-wordmark`,
        "wordmark",
        brief.businessName,
        {
          x: 48,
          y: recipe.canvas.heightPx - 48,
          width: recipe.canvas.widthPx - 96,
          height: 28,
        },
        system.palette.muted,
        16,
        500,
        "left",
        1,
      ),
    );
  }

  return layers;
}

export function reasonCampaignCreativeSetDeterministic(input: {
  brief: CreativeBrief;
  system: CampaignVisualSystem;
  heroAssessment: AssetAssessment;
  materials: readonly CampaignMaterialRef[];
  preparedHeroByFormat: Record<string, CampaignMaterialRef>;
}): CampaignCreativeSetSpec {
  const heroId = resolveHeroMaterialId(input.brief, [input.heroAssessment]);
  const { familyId, rationaleCodes } = pickRecipeFamily({
    brief: input.brief,
    heroAssessment: input.heroAssessment,
    system: input.system,
  });

  const logo = input.materials.find((m) => m.role === "logo");
  if (!logo) throw new Error("MISSING_LOGO_MATERIAL");

  const assets: CampaignAssetSpec[] = [];
  for (const formatId of CAMPAIGN_FORMAT_ORDER) {
    if (!input.brief.targetFormats.includes(formatId)) continue;
    const recipe = getLayoutRecipe(familyId, formatId);
    const prepared = input.preparedHeroByFormat[formatId];
    if (!prepared) throw new Error(`MISSING_PREPARED_HERO:${formatId}`);
    const layers = emitAssetLayers({
      recipe,
      brief: input.brief,
      system: input.system,
      heroPreparedMaterialId: prepared.materialId,
      logoMaterialId: logo.materialId,
    });
    assets.push({
      assetId: `${formatId}__${familyId}`,
      formatId,
      recipeId: recipe.recipeId,
      familyId,
      canvas: recipe.canvas,
      background: { color: input.system.palette.background },
      layers,
      outputFormats:
        formatId === "print_handout" ? ["png", "pdf"] : ["png"],
    });
  }

  if (assets.length !== 3) {
    throw new Error(`EXPECTED_THREE_FORMATS:got_${assets.length}`);
  }

  return {
    specVersion: CAMPAIGN_CREATIVE_SPEC_VERSION,
    systemId: input.system.systemId,
    familyId,
    colors: input.system.palette,
    materials: [
      ...input.materials.filter((m) => m.role === "logo"),
      ...Object.values(input.preparedHeroByFormat),
    ],
    brief: {
      campaignId: input.brief.campaignId,
      businessName: input.brief.businessName,
      facts: input.brief.facts,
      constraints: input.brief.constraints,
      voiceDirection: input.brief.voiceDirection,
    },
    assets,
    reasoningMode: "deterministic_constrained",
    reasoning: {
      familyId,
      heroMaterialId: heroId,
      rationaleCodes,
    },
  };
}
