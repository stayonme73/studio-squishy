/**
 * Bounded layout recipes — full-bleed, split, image-panel × three formats.
 * Absolute boxes; Machine fills slots — not LLM CSS.
 */

import type { CampaignFormatId, LayoutRecipe } from "../contracts";
import { CAMPAIGN_FORMAT_CANVASES } from "../formats";
import type { CampaignLayoutFamilyId } from "../types";

function canvasOf(formatId: CampaignFormatId) {
  return CAMPAIGN_FORMAT_CANVASES[formatId];
}

function fullBleed(formatId: CampaignFormatId): LayoutRecipe {
  const { widthPx: W, heightPx: H } = canvasOf(formatId);
  const isPrint = formatId === "print_handout";
  const isSquare = formatId === "social_square";
  // Compact bottom stack — portrait owns most of the frame (especially vertical)
  const stackH = isPrint ? 340 : isSquare ? 310 : 320;
  const contentTop = H - stackH;
  const overlayTop = Math.max(0, contentTop - 96);
  const contentWidth = Math.min(W - 96, isPrint ? W - 120 : Math.floor(W * 0.78));
  return {
    recipeId: `full_bleed_hero__${formatId}`,
    familyId: "full_bleed_hero",
    formatId,
    canvas: { widthPx: W, heightPx: H },
    slots: [
      {
        id: "hero",
        kind: "image",
        role: "hero",
        box: { x: 0, y: 0, width: W, height: H },
        fit: "cover",
      },
      {
        id: "overlay",
        kind: "shape",
        role: "overlay",
        box: {
          x: 0,
          y: overlayTop,
          width: W,
          height: H - overlayTop,
        },
      },
      {
        id: "logo",
        kind: "logo",
        role: "logo",
        box: {
          x: 36,
          y: 28,
          width: Math.floor(W * 0.3),
          height: Math.floor(W * 0.09),
        },
        fit: "contain",
      },
      {
        id: "headline",
        kind: "text",
        role: "headline",
        box: { x: 48, y: contentTop + 4, width: contentWidth, height: 52 },
        maxLines: 1,
        minFontPx: isSquare ? 40 : 44,
      },
      {
        id: "body",
        kind: "text",
        role: "body",
        box: {
          x: 48,
          y: contentTop + 58,
          width: contentWidth,
          height: isPrint ? 64 : 48,
        },
        maxLines: isPrint ? 3 : 2,
        minFontPx: isPrint ? 18 : 17,
      },
      {
        id: "dates",
        kind: "text",
        role: "dates",
        box: {
          x: 48,
          y: contentTop + (isPrint ? 130 : 114),
          width: contentWidth,
          height: 28,
        },
        maxLines: 1,
        minFontPx: 18,
      },
      {
        id: "price",
        kind: "text",
        role: "price",
        box: {
          x: 48,
          y: contentTop + (isPrint ? 164 : 148),
          width: contentWidth,
          height: 36,
        },
        maxLines: 1,
        minFontPx: 26,
      },
      {
        id: "cta",
        kind: "cta",
        role: "cta",
        box: {
          x: 48,
          y: contentTop + (isPrint ? 214 : 198),
          width: Math.min(isPrint ? contentWidth : 360, contentWidth),
          height: isPrint ? 64 : 44,
        },
        maxLines: isPrint ? 2 : 1,
        minFontPx: isPrint ? 17 : 18,
      },
    ],
  };
}

function splitHero(formatId: CampaignFormatId): LayoutRecipe {
  const { widthPx: W, heightPx: H } = canvasOf(formatId);
  const photoH = formatId === "social_square" ? Math.floor(H * 0.52) : Math.floor(H * 0.48);
  const panelY = photoH;
  return {
    recipeId: `split_hero__${formatId}`,
    familyId: "split_hero",
    formatId,
    canvas: { widthPx: W, heightPx: H },
    slots: [
      {
        id: "hero",
        kind: "image",
        role: "hero",
        box: { x: 0, y: 0, width: W, height: photoH },
        fit: "cover",
      },
      {
        id: "panel",
        kind: "shape",
        role: "content_panel",
        box: { x: 0, y: panelY, width: W, height: H - panelY },
      },
      {
        id: "logo",
        kind: "logo",
        role: "logo",
        box: { x: 48, y: panelY + 32, width: 96, height: 96 },
        fit: "contain",
      },
      {
        id: "headline",
        kind: "text",
        role: "headline",
        box: { x: 168, y: panelY + 40, width: W - 216, height: 72 },
        maxLines: 2,
        minFontPx: 32,
      },
      {
        id: "body",
        kind: "text",
        role: "body",
        box: { x: 48, y: panelY + 140, width: W - 96, height: 72 },
        maxLines: 2,
        minFontPx: 20,
      },
      {
        id: "dates",
        kind: "text",
        role: "dates",
        box: { x: 48, y: panelY + 220, width: W - 96, height: 36 },
        maxLines: 1,
        minFontPx: 20,
      },
      {
        id: "price",
        kind: "text",
        role: "price",
        box: { x: 48, y: panelY + 268, width: W - 96, height: 48 },
        maxLines: 1,
        minFontPx: 36,
      },
      {
        id: "cta",
        kind: "cta",
        role: "cta",
        box: {
          x: 48,
          y: Math.min(H - 100, panelY + 340),
          width: Math.min(400, W - 96),
          height: 60,
        },
        maxLines: 1,
        minFontPx: 20,
      },
    ],
  };
}

function imagePanel(formatId: CampaignFormatId): LayoutRecipe {
  const { widthPx: W, heightPx: H } = canvasOf(formatId);
  const gutter = 40;
  const photoW = Math.floor(W * 0.58);
  return {
    recipeId: `image_panel__${formatId}`,
    familyId: "image_panel",
    formatId,
    canvas: { widthPx: W, heightPx: H },
    slots: [
      {
        id: "hero",
        kind: "image",
        role: "hero",
        box: { x: gutter, y: gutter, width: photoW - gutter, height: H - gutter * 2 },
        fit: "cover",
      },
      {
        id: "panel",
        kind: "shape",
        role: "content_panel",
        box: {
          x: photoW,
          y: 0,
          width: W - photoW,
          height: H,
        },
      },
      {
        id: "logo",
        kind: "logo",
        role: "logo",
        box: { x: photoW + 32, y: 48, width: 88, height: 88 },
        fit: "contain",
      },
      {
        id: "headline",
        kind: "text",
        role: "headline",
        box: { x: photoW + 32, y: 160, width: W - photoW - 64, height: 100 },
        maxLines: 3,
        minFontPx: 28,
      },
      {
        id: "dates",
        kind: "text",
        role: "dates",
        box: { x: photoW + 32, y: 280, width: W - photoW - 64, height: 48 },
        maxLines: 2,
        minFontPx: 18,
      },
      {
        id: "price",
        kind: "text",
        role: "price",
        box: { x: photoW + 32, y: 340, width: W - photoW - 64, height: 56 },
        maxLines: 1,
        minFontPx: 32,
      },
      {
        id: "cta",
        kind: "cta",
        role: "cta",
        box: {
          x: photoW + 32,
          y: H - 140,
          width: W - photoW - 64,
          height: 60,
        },
        maxLines: 1,
        minFontPx: 18,
      },
    ],
  };
}

const BUILDERS: Record<
  CampaignLayoutFamilyId,
  (formatId: CampaignFormatId) => LayoutRecipe
> = {
  full_bleed_hero: fullBleed,
  split_hero: splitHero,
  image_panel: imagePanel,
};

export function getLayoutRecipe(
  familyId: CampaignLayoutFamilyId,
  formatId: CampaignFormatId,
): LayoutRecipe {
  return BUILDERS[familyId](formatId);
}

export const ALL_LAYOUT_FAMILY_IDS: readonly CampaignLayoutFamilyId[] = [
  "full_bleed_hero",
  "split_hero",
  "image_panel",
] as const;
