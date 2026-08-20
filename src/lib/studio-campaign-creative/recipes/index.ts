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

  if (isPrint) {
    // US Letter 2550×3300 @ 300 DPI — reflowed, not a stretched 2:3 stack.
    const margin = 180;
    const stackH = 1180;
    const contentTop = H - stackH;
    const overlayTop = contentTop - 420;
    const contentWidth = W - margin * 2;
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
            x: margin,
            y: 160,
            width: 780,
            height: 220,
          },
          fit: "contain",
        },
        {
          id: "headline",
          kind: "text",
          role: "headline",
          box: { x: margin, y: contentTop + 56, width: contentWidth, height: 200 },
          maxLines: 1,
          minFontPx: 168,
        },
        {
          id: "body",
          kind: "text",
          role: "body",
          box: {
            x: margin,
            y: contentTop + 280,
            width: contentWidth,
            height: 220,
          },
          maxLines: 3,
          minFontPx: 56,
        },
        {
          id: "dates",
          kind: "text",
          role: "dates",
          box: {
            x: margin,
            y: contentTop + 540,
            width: contentWidth,
            height: 88,
          },
          maxLines: 1,
          minFontPx: 68,
        },
        {
          id: "price",
          kind: "text",
          role: "price",
          box: {
            x: margin,
            y: contentTop + 648,
            width: contentWidth,
            height: 96,
          },
          maxLines: 1,
          minFontPx: 80,
        },
        {
          id: "cta",
          kind: "cta",
          role: "cta",
          box: {
            x: margin,
            y: contentTop + 780,
            width: contentWidth,
            height: 280,
          },
          maxLines: 2,
          minFontPx: 64,
        },
      ],
    };
  }

  // Compact bottom stack — portrait owns most of the frame (especially vertical)
  const stackH = isSquare ? 310 : 320;
  const contentTop = H - stackH;
  const overlayTop = Math.max(0, contentTop - 96);
  const contentWidth = Math.min(W - 96, Math.floor(W * 0.78));
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
          height: 48,
        },
        maxLines: 2,
        minFontPx: 17,
      },
      {
        id: "dates",
        kind: "text",
        role: "dates",
        box: {
          x: 48,
          y: contentTop + 114,
          width: contentWidth,
          height: 28,
        },
        maxLines: 1,
        minFontPx: 20,
      },
      {
        id: "price",
        kind: "text",
        role: "price",
        box: {
          x: 48,
          y: contentTop + 148,
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
          y: contentTop + 198,
          width: Math.min(360, contentWidth),
          height: 44,
        },
        maxLines: 1,
        minFontPx: 18,
      },
    ],
  };
}

function splitHero(formatId: CampaignFormatId): LayoutRecipe {
  const { widthPx: W, heightPx: H } = canvasOf(formatId);
  const isPrint = formatId === "print_handout";
  const photoH = isPrint
    ? Math.floor(H * 0.5)
    : formatId === "social_square"
      ? Math.floor(H * 0.52)
      : Math.floor(H * 0.48);
  const panelY = photoH;
  const gutter = isPrint ? 180 : 48;
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
        box: {
          x: gutter,
          y: panelY + (isPrint ? 80 : 32),
          width: isPrint ? 220 : 96,
          height: isPrint ? 220 : 96,
        },
        fit: "contain",
      },
      {
        id: "headline",
        kind: "text",
        role: "headline",
        box: {
          x: gutter + (isPrint ? 260 : 120),
          y: panelY + (isPrint ? 100 : 40),
          width: W - gutter * 2 - (isPrint ? 260 : 120),
          height: isPrint ? 180 : 72,
        },
        maxLines: 2,
        minFontPx: isPrint ? 96 : 32,
      },
      {
        id: "body",
        kind: "text",
        role: "body",
        box: {
          x: gutter,
          y: panelY + (isPrint ? 340 : 140),
          width: W - gutter * 2,
          height: isPrint ? 180 : 72,
        },
        maxLines: 2,
        minFontPx: isPrint ? 48 : 20,
      },
      {
        id: "dates",
        kind: "text",
        role: "dates",
        box: {
          x: gutter,
          y: panelY + (isPrint ? 560 : 220),
          width: W - gutter * 2,
          height: isPrint ? 80 : 36,
        },
        maxLines: 1,
        minFontPx: isPrint ? 56 : 20,
      },
      {
        id: "price",
        kind: "text",
        role: "price",
        box: {
          x: gutter,
          y: panelY + (isPrint ? 660 : 268),
          width: W - gutter * 2,
          height: isPrint ? 100 : 48,
        },
        maxLines: 1,
        minFontPx: isPrint ? 72 : 36,
      },
      {
        id: "cta",
        kind: "cta",
        role: "cta",
        box: {
          x: gutter,
          y: isPrint ? H - 360 : Math.min(H - 100, panelY + 340),
          width: Math.min(isPrint ? W - gutter * 2 : 400, W - gutter * 2),
          height: isPrint ? 220 : 60,
        },
        maxLines: isPrint ? 2 : 1,
        minFontPx: isPrint ? 48 : 20,
      },
    ],
  };
}

function imagePanel(formatId: CampaignFormatId): LayoutRecipe {
  const { widthPx: W, heightPx: H } = canvasOf(formatId);
  const isPrint = formatId === "print_handout";
  const gutter = isPrint ? 80 : 40;
  const photoW = Math.floor(W * (isPrint ? 0.55 : 0.58));
  const panelX = photoW;
  const panelW = W - photoW;
  const typeX = panelX + (isPrint ? 80 : 32);
  const typeW = panelW - (isPrint ? 160 : 64);
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
        box: {
          x: typeX,
          y: isPrint ? 120 : 48,
          width: isPrint ? 200 : 88,
          height: isPrint ? 200 : 88,
        },
        fit: "contain",
      },
      {
        id: "headline",
        kind: "text",
        role: "headline",
        box: {
          x: typeX,
          y: isPrint ? 360 : 160,
          width: typeW,
          height: isPrint ? 280 : 100,
        },
        maxLines: 3,
        minFontPx: isPrint ? 72 : 28,
      },
      {
        id: "dates",
        kind: "text",
        role: "dates",
        box: {
          x: typeX,
          y: isPrint ? 680 : 280,
          width: typeW,
          height: isPrint ? 120 : 48,
        },
        maxLines: 2,
        minFontPx: isPrint ? 48 : 18,
      },
      {
        id: "price",
        kind: "text",
        role: "price",
        box: {
          x: typeX,
          y: isPrint ? 840 : 340,
          width: typeW,
          height: isPrint ? 120 : 56,
        },
        maxLines: 1,
        minFontPx: isPrint ? 72 : 32,
      },
      {
        id: "cta",
        kind: "cta",
        role: "cta",
        box: {
          x: typeX,
          y: isPrint ? H - 420 : H - 140,
          width: typeW,
          height: isPrint ? 260 : 60,
        },
        maxLines: isPrint ? 2 : 1,
        minFontPx: isPrint ? 44 : 18,
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
