/**
 * Campaign reasoner — chooses among approved recipes; never invents CSS.
 */

import type { AssetAssessment, CampaignVisualSystem, CreativeBrief } from "../contracts";
import {
  CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER,
  isCampaignPrintFormat,
} from "../formats";
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

function bookingContactHasPhone(contact: string): boolean {
  return /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(contact);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return { r: 31, g: 58, b: 77 };
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

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
  const overlayRgb = hexToRgb(system.palette.primary);
  const overlayFill = `rgba(${overlayRgb.r}, ${overlayRgb.g}, ${overlayRgb.b}, ${system.imageTreatmentRules.overlayMaxOpacity})`;
  const bleedText = system.palette.background;
  const isFullBleed = recipe.familyId === "full_bleed_hero";
  const isPrint = isCampaignPrintFormat(recipe.formatId);
  const isUsLetter =
    isPrint &&
    recipe.canvas.widthPx ===
      CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER.widthPx;
  const dateColor = isFullBleed
    ? (system.fullBleedDateColor ?? system.palette.muted)
    : system.palette.text;
  const dateWeight = 600 as const;

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
      const platePad = isPrint ? 12 : 2;
      layers.push({
        type: "shape",
        id: `${recipe.recipeId}-logo-plate`,
        role: "logo_plate",
        x: b.x - platePad,
        y: b.y - platePad,
        width: b.width + platePad * 2,
        height: b.height + platePad * 2,
        fill: `rgba(${overlayRgb.r}, ${overlayRgb.g}, ${overlayRgb.b}, 0.2)`,
        borderRadiusPx: isPrint ? 12 : 6,
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
      if (isFullBleed) {
        // Seamless fade — no stacked bands (those read as UI divider lines)
        const peak = system.imageTreatmentRules.overlayMaxOpacity;
        layers.push({
          type: "shape",
          id: `${recipe.recipeId}-overlay`,
          role: "overlay",
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          fill: `linear-gradient(to bottom, rgba(${overlayRgb.r},${overlayRgb.g},${overlayRgb.b},0) 0%, rgba(${overlayRgb.r},${overlayRgb.g},${overlayRgb.b},${(peak * 0.45).toFixed(3)}) 42%, rgba(${overlayRgb.r},${overlayRgb.g},${overlayRgb.b},${peak.toFixed(3)}) 100%)`,
        });
      } else {
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
      }
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
          isFullBleed ? bleedText : system.palette.primary,
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
          isFullBleed ? bleedText : system.palette.text,
          Math.max(slot.minFontPx ?? 20, 18),
          isFullBleed ? 500 : 400,
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
          dateColor,
          Math.max(slot.minFontPx ?? 20, 18),
          dateWeight,
          "left",
          slot.maxLines,
        ),
      );
      continue;
    }
    if (slot.role === "price") {
      if (!brief.facts.priceDisplay.trim()) continue;
      layers.push(
        textFromSlot(
          `${recipe.recipeId}-price`,
          "price",
          brief.facts.priceDisplay,
          b,
          isFullBleed ? bleedText : system.palette.text,
          Math.max(slot.minFontPx ?? 28, 26),
          600,
          "left",
          slot.maxLines,
        ),
      );
      continue;
    }
    if (slot.role === "cta") {
      if (isPrint) {
        const ctaSize = Math.max(slot.minFontPx ?? 20, 18);
        const contactSize = isUsLetter
          ? ctaSize
          : Math.max(Math.round(ctaSize * 0.78), 16);
        const contactGap = isUsLetter
          ? Math.round(ctaSize * 1.55)
          : Math.round(ctaSize * 1.45);
        layers.push(
          textFromSlot(
            `${recipe.recipeId}-cta`,
            "cta",
            brief.facts.cta,
            {
              x: b.x,
              y: b.y,
              width: b.width,
              height: Math.round(ctaSize * 1.3),
            },
            isFullBleed ? bleedText : system.palette.primary,
            ctaSize,
            600,
            "left",
            1,
          ),
        );
        if (brief.facts.bookingContact.trim()) {
          layers.push(
            textFromSlot(
              `${recipe.recipeId}-contact`,
              "contact",
              brief.facts.bookingContact,
              {
                x: b.x,
                y: b.y + contactGap,
                width: b.width,
                height: Math.round(contactSize * 1.4),
              },
              isFullBleed ? bleedText : system.palette.text,
              contactSize,
              600,
              "left",
              1,
            ),
          );
        }
      } else {
        // Soft campaign CTA — translucent plate + type, not a solid web button
        layers.push({
          type: "shape",
          id: `${recipe.recipeId}-cta-btn`,
          role: "cta_button",
          x: b.x,
          y: b.y,
          width: Math.min(b.width, 320),
          height: Math.max(b.height, 40),
          fill: system.ctaStyle.background,
          borderRadiusPx: system.ctaStyle.borderRadiusPx,
        });
        layers.push(
          textFromSlot(
            `${recipe.recipeId}-cta`,
            "cta",
            brief.facts.cta,
            {
              x: b.x + 14,
              y: b.y + 10,
              width: Math.min(b.width, 320) - 28,
              height: b.height - 16,
            },
            system.ctaStyle.textColor,
            Math.max(slot.minFontPx ?? 18, 17),
            600,
            "left",
            1,
          ),
        );
        const webContact = brief.facts.bookingContact.trim();
        if (webContact && !bookingContactHasPhone(webContact)) {
          layers.push(
            textFromSlot(
              `${recipe.recipeId}-contact`,
              "contact",
              webContact,
              {
                x: b.x,
                y: b.y + Math.max(b.height, 40) + 6,
                width: Math.min(b.width, 520),
                height: 22,
              },
              isFullBleed ? bleedText : system.palette.text,
              16,
              500,
              "left",
              1,
            ),
          );
        }
      }
      continue;
    }
  }

  // Wordmark for identity on content-heavy recipes
  if (recipe.familyId !== "full_bleed_hero" && !isPrint) {
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
  for (const formatId of input.brief.targetFormats) {
    const recipe = getLayoutRecipe(
      familyId,
      formatId,
      input.brief.printHandoutContractId,
    );
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
      outputFormats: isCampaignPrintFormat(formatId) ? ["png", "pdf"] : ["png"],
    });
  }

  if (assets.length !== input.brief.targetFormats.length) {
    throw new Error(
      `EXPECTED_FORMAT_COUNT:${input.brief.targetFormats.length}:got_${assets.length}`,
    );
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
