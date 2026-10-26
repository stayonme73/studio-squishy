/**
 * Creative reasoning → bounded FlyerDesignSpec.
 * Prefer Anthropic text-model path when available; always schema-constrained.
 * Does not require Tagia to lay out the flyer.
 */

import type { FlyerReasoningConstraints } from "@/config/studio-autonomous-production-loop-v1";

import {
  deriveCreativeBriefFromTruth,
  paletteForBrief,
  reasonIntelligentFlyerLayout,
  selectRouteWithAnthropic,
  BLOCKED_SEED_SIGNATURES,
} from "@/lib/studio-design-intelligence";
import {
  recordAnthropicCall,
  type AnthropicUsagePayload,
} from "@/lib/studio-project-alpha/cost-telemetry";

import {
  composeCustomerOfferLine,
  isEditorialFlyerFamily,
  offerNameWithoutRepeatedPrice,
  sameCustomerFacingMessage,
} from "./flyer-creative-quality";
import {
  isPromotionalPricePrimaryAttention,
  priceCalloutTypeSizePx,
  resolvePriceCalloutSizePx,
  CAPPED_DECORATIVE_GEOMETRY_PX,
} from "./flyer-offer-value-hierarchy";
import type {
  FlyerDesignLayer,
  FlyerDesignSpec,
  FlyerProjectTruth,
  FlyerTextLayer,
} from "./types";
import { FLYER_DESIGN_SPEC_VERSION } from "./types";
import { resolveFlyerFormat } from "./flyer-content-proportional-composition";

function textLayer(
  partial: Omit<FlyerTextLayer, "type"> & { type?: "text" },
): FlyerTextLayer {
  return { type: "text", ...partial };
}

function textHeight(layer: FlyerTextLayer): number {
  const maxLines = layer.maxLines ?? 2;
  const approxChars = Math.max(
    18,
    Math.floor(layer.width / Math.max(10, layer.fontSizePx * 0.48)),
  );
  const lines = Math.min(
    maxLines,
    Math.max(1, Math.ceil(layer.content.length / approxChars)),
  );
  return Math.round(layer.fontSizePx * layer.lineHeight * lines);
}

function familySource(truth: FlyerProjectTruth): string {
  return `${truth.businessName} ${truth.headline} ${truth.offerName} ${truth.descriptor} ${truth.body}`;
}

/**
 * Deterministic constrained reasoner — encodes hierarchy/layout from project truth.
 * No-photo customers still get a zoned poster (frame + offer region), not a centered text stack.
 */
function attachRevisionEmphasis(
  spec: FlyerDesignSpec,
  truth: FlyerProjectTruth,
): FlyerDesignSpec {
  if (!truth.revisionEmphasis) return spec;
  return { ...spec, revisionEmphasis: truth.revisionEmphasis };
}

export function reasonFlyerDesignSpecDeterministic(
  truth: FlyerProjectTruth,
  constraints?: FlyerReasoningConstraints,
): FlyerDesignSpec {
  if (
    truth.outputMode === "customer" &&
    truth.creativeDirection?.selectedRoute.layoutFamilyId &&
    truth.creativeDirection.selectedRoute.layoutFamilyId !==
      "centered_promotional_plate"
  ) {
    return attachRevisionEmphasis(
      reasonIntelligentFlyerLayout(
        truth,
        truth.creativeDirection,
        constraints,
      ),
      truth,
    );
  }
  const c = truth.brandColors;
  const logo = truth.materials.find((m) => m.role === "logo");
  const editorial = isEditorialFlyerFamily(familySource(truth));
  const tighten = Boolean(constraints?.tightenComposition);
  const longBody = truth.body.trim().length > 160;
  const priceLine = truth.wasPriceDisplay
    ? `${truth.priceDisplay} (${truth.wasPriceDisplay})`
    : truth.priceDisplay;
  const usePriceSeal = Boolean(truth.priceDisplay.trim());
  const offerLine = usePriceSeal
    ? offerNameWithoutRepeatedPrice(truth.offerName)
    : composeCustomerOfferLine(truth.offerName, truth.priceDisplay);
  const hasCta = Boolean(truth.cta.trim());
  const hasDates = Boolean(truth.dateWindow.trim());
  const hasBody = Boolean(truth.body.trim());
  const hasHeadline =
    Boolean(truth.headline.trim()) &&
    truth.headline.trim().toLowerCase() !== truth.offerName.trim().toLowerCase();
  const paintCta =
    hasCta &&
    !(hasHeadline && sameCustomerFacingMessage(truth.headline, truth.cta));
  const useDateHero = !usePriceSeal && !logo && hasDates;

  const format = resolveFlyerFormat(truth).format;
  const W = format.widthPx;
  const H = format.heightPx;
  const bar = editorial ? 64 : 52;
  const frame = 8;
  const inset = editorial ? 40 : 48;
  const paper = editorial ? "#FFFCF7" : "#FFFFFF";
  const layers: FlyerDesignLayer[] = [
    {
      type: "shape",
      id: "plate-top",
      role: "accent_bar",
      x: 0,
      y: 0,
      width: W,
      height: bar,
      fill: c.primary,
    },
    {
      type: "shape",
      id: "plate-bottom",
      role: "accent_bar",
      x: 0,
      y: H - bar,
      width: W,
      height: bar,
      fill: c.primary,
    },
    {
      type: "shape",
      id: "paper-mat",
      role: "plate",
      x: inset,
      y: bar + 16,
      width: W - inset * 2,
      height: H - bar * 2 - 32,
      fill: paper,
    },
    {
      type: "shape",
      id: "frame-top",
      role: "footer_rule",
      x: inset,
      y: bar + 16,
      width: W - inset * 2,
      height: frame,
      fill: c.secondary,
    },
    {
      type: "shape",
      id: "frame-bottom",
      role: "footer_rule",
      x: inset,
      y: H - bar - 16 - frame,
      width: W - inset * 2,
      height: frame,
      fill: c.secondary,
    },
    {
      type: "shape",
      id: "frame-left",
      role: "footer_rule",
      x: inset,
      y: bar + 16,
      width: frame,
      height: H - bar * 2 - 32,
      fill: c.secondary,
    },
    {
      type: "shape",
      id: "frame-right",
      role: "footer_rule",
      x: W - inset - frame,
      y: bar + 16,
      width: frame,
      height: H - bar * 2 - 32,
      fill: c.secondary,
    },
  ];

  const paperTop = bar + 16;
  const paperHeight = H - bar * 2 - 32;
  const contentX = inset + 40;
  const contentW = W - contentX * 2;
  const onPrimary = paper;
  const tick = 26;
  const tickW = 3;
  const cornerX = inset + frame + 14;
  const cornerY = paperTop + frame + 14;
  const cornerX2 = W - inset - frame - 14 - tick;
  const cornerY2 = paperTop + paperHeight - frame - 14 - tickW;
  const cornerY2v = paperTop + paperHeight - frame - 14 - tick;
  layers.push(
    {
      type: "shape",
      id: "corner-tl-h",
      role: "footer_rule",
      x: cornerX,
      y: cornerY,
      width: tick,
      height: tickW,
      fill: c.secondary,
    },
    {
      type: "shape",
      id: "corner-tl-v",
      role: "footer_rule",
      x: cornerX,
      y: cornerY,
      width: tickW,
      height: tick,
      fill: c.secondary,
    },
    {
      type: "shape",
      id: "corner-tr-h",
      role: "footer_rule",
      x: W - inset - frame - 14 - tick,
      y: cornerY,
      width: tick,
      height: tickW,
      fill: c.secondary,
    },
    {
      type: "shape",
      id: "corner-tr-v",
      role: "footer_rule",
      x: W - inset - frame - 14 - tickW,
      y: cornerY,
      width: tickW,
      height: tick,
      fill: c.secondary,
    },
    {
      type: "shape",
      id: "corner-bl-h",
      role: "footer_rule",
      x: cornerX,
      y: cornerY2,
      width: tick,
      height: tickW,
      fill: c.secondary,
    },
    {
      type: "shape",
      id: "corner-bl-v",
      role: "footer_rule",
      x: cornerX,
      y: cornerY2v,
      width: tickW,
      height: tick,
      fill: c.secondary,
    },
    {
      type: "shape",
      id: "corner-br-h",
      role: "footer_rule",
      x: cornerX2,
      y: cornerY2,
      width: tick,
      height: tickW,
      fill: c.secondary,
    },
    {
      type: "shape",
      id: "corner-br-v",
      role: "footer_rule",
      x: W - inset - frame - 14 - tickW,
      y: cornerY2v,
      width: tickW,
      height: tick,
      fill: c.secondary,
    },
  );

  const innerTop = paperTop + frame + 36;
  const innerBottom = paperTop + paperHeight - frame - 18;
  const offerInnerX = inset + 64;
  const offerInnerW = W - offerInnerX * 2;
  const promotionalPrimary = isPromotionalPricePrimaryAttention(truth);
  const posterScale = promotionalPrimary && H >= 1400;
  const wordmarkSize = posterScale ? 46 : editorial ? 28 : 42;
  const headlineSize = posterScale ? 70 : editorial ? 70 : 44;
  const offerSize = posterScale ? 40 : editorial ? 32 : 34;
  const contactPhoneSize = posterScale ? 30 : 22;
  const contactWebSize = posterScale ? 24 : 20;
  const offerProbe = textLayer({
    id: "offer",
    role: "offer",
    content: offerLine,
    x: offerInnerX,
    y: 0,
    width: offerInnerW,
    fontSizePx: offerSize,
    fontWeight: 600,
    lineHeight: 1.28,
    color: c.text,
    align: "center",
    maxLines: 3,
  });
  const bodyProbe = hasBody
    ? textLayer({
        id: "body",
        role: "body",
        content: truth.body,
        x: contentX,
        y: 0,
        width: contentW,
        fontSizePx: longBody ? 20 : 22,
        fontWeight: 400,
        lineHeight: 1.4,
        color: onPrimary,
        align: "center",
        maxLines: longBody ? 4 : 3,
      })
    : null;
  const footerNeeded =
    36 +
    (bodyProbe ? textHeight(bodyProbe) + 14 : 0) +
    (paintCta ? 92 : 0) +
    (posterScale ? 96 : 72) +
    (truth.disclaimer.trim() ? 50 : 0) +
    28;
  const footerH = Math.max(editorial ? (posterScale ? 196 : 168) : 196, footerNeeded);
  const footerTop = innerBottom - footerH;

  let y = innerTop;

  if (logo) {
    layers.push(
      {
        type: "shape",
        id: "logo-plate",
        role: "logo_plate",
        x: 412,
        y,
        width: 200,
        height: 200,
        fill: "#FFFFFF",
        borderRadiusPx: 100,
      },
      {
        type: "image",
        id: "logo",
        role: "logo",
        materialId: logo.materialId,
        x: 428,
        y: y + 20,
        width: 168,
        height: 168,
        fit: "contain",
      },
    );
    y += 214;
  }

  const pushText = (
    partial: Omit<FlyerTextLayer, "type" | "y"> & { gapAfter?: number; y?: number },
  ) => {
    const { gapAfter = 20, y: yOverride, ...rest } = partial;
    const layer = textLayer({ ...rest, y: yOverride ?? y });
    layers.push(layer);
    if (yOverride == null) {
      y += textHeight(layer) + gapAfter;
    }
    return layer;
  };

  pushText({
    id: "wordmark",
    role: "wordmark",
    content: truth.wordmark,
    x: contentX,
    width: contentW,
    fontSizePx: wordmarkSize,
    fontWeight: 700,
    lineHeight: 1.15,
    letterSpacingPx: editorial ? 5 : undefined,
    color: c.primary,
    align: "center",
    gapAfter: editorial ? (tighten ? 16 : 10) : tighten ? 20 : 14,
  });

  if (truth.descriptor.trim()) {
    pushText({
      id: "descriptor",
      role: "descriptor",
      content: truth.descriptor,
      x: contentX,
      width: contentW,
      fontSizePx: 20,
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacingPx: 2,
      color: c.secondary,
      align: "center",
      gapAfter: 12,
    });
  }

  if (hasHeadline) {
    pushText({
      id: "headline",
      role: "headline",
      content: truth.headline,
      x: contentX,
      width: contentW,
      fontSizePx: headlineSize,
      fontWeight: 700,
      lineHeight: 1.12,
      letterSpacingPx: editorial ? 5 : undefined,
      color: c.primary,
      align: "center",
      gapAfter: hasHeadline ? (posterScale ? 32 : 14) : 14,
    });
  }

  layers.push({
    type: "shape",
    id: "identity-rule",
    role: "footer_rule",
    x: W / 2 - 80,
    y,
    width: 160,
    height: 3,
    fill: c.secondary,
  });
  y += 22;

  const offerZoneTop = y + (posterScale ? 20 : 8);
  const offerH = textHeight(offerProbe);
  const datesH = hasDates ? 34 : 0;
  const panelPadY = tighten ? 34 : 28;
  const availableForSeal = Math.max(
    200,
    footerTop - 12 - offerZoneTop - offerH - datesH - panelPadY * 2 - 20,
  );
  const capGeometry = Boolean(constraints?.capDominantGeometry);
  const medallionSize = usePriceSeal
    ? resolvePriceCalloutSizePx({
        canvasWidthPx: W,
        availablePx: availableForSeal,
        innerWidthPx: offerInnerW - 72,
        promotionalPricePrimary: promotionalPrimary,
        capGeometry,
      })
    : useDateHero
      ? Math.min(CAPPED_DECORATIVE_GEOMETRY_PX, availableForSeal)
      : 0;
  const priceSize = usePriceSeal
    ? priceCalloutTypeSizePx(medallionSize)
    : editorial
      ? 72
      : 64;
  const priceH = Math.round(priceSize * 1.05);
  const dateHeroSize = useDateHero ? 28 : 24;
  const lockupH =
    panelPadY +
    offerH +
    16 +
    (usePriceSeal || useDateHero ? medallionSize : priceLine.trim() ? priceH : 0) +
    (hasDates && !useDateHero ? datesH + 12 : 0) +
    panelPadY;
  const panelHeight = Math.max(220, lockupH);
  const panelTop = offerZoneTop;

  layers.push({
    type: "shape",
    id: "offer-panel",
    role: "plate",
    x: inset + 48,
    y: panelTop,
    width: W - (inset + 48) * 2,
    height: panelHeight,
    fill: editorial ? "#F7F1E8" : "#F4F1EA",
    borderRadiusPx: editorial ? 8 : 16,
  });

  let innerY = panelTop + panelPadY;
  layers.push({
    type: "shape",
    id: "offer-panel-rule",
    role: "footer_rule",
    x: W / 2 - 64,
    y: innerY - 16,
    width: 128,
    height: 3,
    fill: c.secondary,
  });

  pushText({
    ...offerProbe,
    y: innerY,
    gapAfter: 0,
  });
  innerY += offerH + 16;

  if (usePriceSeal) {
    const sealX = Math.round((W - medallionSize) / 2);
    const ring = Math.max(14, Math.round(medallionSize * 0.055));
    layers.push(
      {
        type: "shape",
        id: "offer-medallion",
        role: "logo_plate",
        x: sealX,
        y: innerY,
        width: medallionSize,
        height: medallionSize,
        fill: c.secondary,
        borderRadiusPx: Math.round(medallionSize / 2),
      },
      {
        type: "shape",
        id: "offer-medallion-inner",
        role: "plate",
        x: sealX + ring,
        y: innerY + ring,
        width: medallionSize - ring * 2,
        height: medallionSize - ring * 2,
        fill: editorial ? "#F7F1E8" : "#F4F1EA",
        borderRadiusPx: Math.round((medallionSize - ring * 2) / 2),
      },
    );
    const pricePad = Math.max(24, Math.round(medallionSize * 0.08));
    pushText({
      id: "price",
      role: "price",
      content: priceLine,
      x: sealX + pricePad,
      y: innerY + Math.round((medallionSize - priceH) / 2),
      width: medallionSize - pricePad * 2,
      fontSizePx: priceSize,
      fontWeight: 700,
      lineHeight: 1.05,
      color: c.primary,
      align: "center",
      maxLines: 1,
      gapAfter: 0,
    });
    innerY += medallionSize;
  } else if (useDateHero) {
    const sealX = Math.round((W - medallionSize) / 2);
    const ring = Math.max(14, Math.round(medallionSize * 0.055));
    layers.push(
      {
        type: "shape",
        id: "offer-medallion",
        role: "logo_plate",
        x: sealX,
        y: innerY,
        width: medallionSize,
        height: medallionSize,
        fill: c.secondary,
        borderRadiusPx: Math.round(medallionSize / 2),
      },
      {
        type: "shape",
        id: "offer-medallion-inner",
        role: "plate",
        x: sealX + ring,
        y: innerY + ring,
        width: medallionSize - ring * 2,
        height: medallionSize - ring * 2,
        fill: editorial ? "#F7F1E8" : "#F4F1EA",
        borderRadiusPx: Math.round((medallionSize - ring * 2) / 2),
      },
    );
    const datePad = Math.max(20, Math.round(medallionSize * 0.1));
    pushText({
      id: "dates",
      role: "dates",
      content: truth.dateWindow,
      x: sealX + datePad,
      y: innerY + Math.round((medallionSize - dateHeroSize * 2.4) / 2),
      width: medallionSize - datePad * 2,
      fontSizePx: dateHeroSize,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.primary,
      align: "center",
      maxLines: 3,
      gapAfter: 0,
    });
    innerY += medallionSize;
  } else if (priceLine.trim()) {
    pushText({
      id: "price",
      role: "price",
      content: priceLine,
      x: offerInnerX,
      y: innerY,
      width: offerInnerW,
      fontSizePx: priceSize,
      fontWeight: 700,
      lineHeight: 1.05,
      color: c.primary,
      align: "center",
      gapAfter: 0,
    });
    innerY += priceH;
  }

  if (hasDates && !useDateHero) {
    innerY += 12;
    pushText({
      id: "dates",
      role: "dates",
      content: truth.dateWindow,
      x: offerInnerX,
      y: innerY,
      width: offerInnerW,
      fontSizePx: 24,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.muted,
      align: "center",
      gapAfter: 0,
    });
  }

  layers.push({
    type: "shape",
    id: "footer-band",
    role: "plate",
    x: inset + frame,
    y: footerTop,
    width: W - (inset + frame) * 2,
    height: footerH,
    fill: c.primary,
  });

  let footerY = footerTop + 28;
  if (bodyProbe) {
    pushText({
      ...bodyProbe,
      y: footerY,
      gapAfter: 0,
    });
    footerY += textHeight(bodyProbe) + 14;
  }

  if (paintCta) {
    layers.push({
      type: "shape",
      id: "cta-plate",
      role: "plate",
      x: 212,
      y: footerY,
      width: 600,
      height: 80,
      fill: c.secondary,
      borderRadiusPx: 12,
    });
    layers.push(
      textLayer({
        id: "cta",
        role: "cta",
        content: truth.cta,
        x: 212,
        y: footerY + 24,
        width: 600,
        fontSizePx: 28,
        fontWeight: 600,
        lineHeight: 1.2,
        color: c.primary,
        align: "center",
      }),
    );
    footerY += 92;
  }

  if (truth.phone.trim()) {
    pushText({
      id: "phone",
      role: "contact_phone",
      content: truth.phone,
      x: contentX,
      y: footerY,
      width: contentW,
      fontSizePx: contactPhoneSize,
      fontWeight: 500,
      lineHeight: 1.2,
      color: onPrimary,
      align: "center",
      gapAfter: 0,
    });
    footerY += posterScale ? 38 : 30;
  }
  if (truth.webDisplay.trim()) {
    pushText({
      id: "web",
      role: "contact_web",
      content: truth.webDisplay,
      x: contentX,
      y: footerY,
      width: contentW,
      fontSizePx: contactWebSize,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.secondary,
      align: "center",
      gapAfter: 0,
    });
    footerY += 32;
  }

  if (truth.disclaimer.trim()) {
    pushText({
      id: "disclaimer",
      role: "disclaimer",
      content: truth.disclaimer,
      x: contentX,
      y: footerY,
      width: contentW,
      fontSizePx: 13,
      fontWeight: 400,
      lineHeight: 1.3,
      color: c.secondary,
      align: "center",
      maxLines: 3,
      gapAfter: 0,
    });
  }

  return attachRevisionEmphasis(
    {
      specVersion: FLYER_DESIGN_SPEC_VERSION,
      skuId: truth.skuId,
      canvas: { widthPx: W, heightPx: H },
      background: { color: c.background },
      colors: { ...c },
      materials: [...truth.materials],
      outputFormats: ["png", "pdf"],
      reasoningMode: "deterministic_constrained",
      layers,
    },
    truth,
  );
}

type AnthropicReasonResult =
  | { ok: true; spec: FlyerDesignSpec }
  | { ok: false; message: string };

/**
 * Optional Anthropic path — same Messages API pattern as decision-learner.
 * Output must validate against FlyerDesignSpec; inventing prohibited claims fails later.
 */
export async function reasonFlyerDesignSpecAnthropic(
  truth: FlyerProjectTruth,
  constraints?: FlyerReasoningConstraints,
): Promise<AnthropicReasonResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "ANTHROPIC_API_KEY not set" };
  }

  if (truth.outputMode === "customer") {
    const brief =
      truth.creativeDirection?.brief ?? deriveCreativeBriefFromTruth(truth);
    const palette = paletteForBrief(brief);
    const directed = {
      ...truth,
      brandColors: truth.creativeDirection
        ? truth.brandColors
        : {
            primary: palette.primary,
            secondary: palette.secondary,
            background: palette.background,
            text: palette.text,
            muted: palette.muted,
          },
    };
    const direction = await selectRouteWithAnthropic({
      brief,
      recent: BLOCKED_SEED_SIGNATURES,
      constraints,
    });
    const spec = reasonIntelligentFlyerLayout(
      { ...directed, creativeDirection: direction },
      direction,
      constraints,
    );
    const model =
      process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929";
    return {
      ok: true,
      spec: {
        ...spec,
        reasoningMode: "anthropic_text_model",
        reasoningModel: model,
      },
    };
  }

  const format = resolveFlyerFormat(truth).format;
  const base = reasonFlyerDesignSpecDeterministic(truth, undefined);
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929";

  const system = `You are The Studio design reasoner for SKU v2-rtu-flyer.
Return ONLY valid JSON for a FlyerDesignSpec. Do not invent prices, offers, or prohibited claims.
You may refine hierarchy (font sizes, y positions, wording polish) within the provided facts.
Preserve all required tokens. Canvas must remain ${format.widthPx}x${format.heightPx}.
Compose from the customer's actual authorized content. Do not invent filler, addresses, hours, slogans, or social handles.
Do not stretch empty plates to occupy leftover canvas. Customer-selected size is authoritative when present.
outputFormats must be ["png","pdf"]. materials must be unchanged from input.
specVersion must be "${FLYER_DESIGN_SPEC_VERSION}". skuId must be "v2-rtu-flyer".
reasoningMode must be "anthropic_text_model".
Keep a designed offer-panel sized to the offer lockup — never a hollow empty card.
When the customer supplied a promotional price and no logo or photo, include a substantial offer-medallion price seal. Do not invent a price, phone, website, or other contact fact. When those facts are empty, omit those layers.
Do not invent photographs, logos, products, claims, or other facts.
Do not print field labels such as "phone" or "web".
Do not duplicate the price in the offer sentence and the seal. Name the offer in the sentence; put the promotional price in the seal when a seal is used.
A supplied promotional price may be a substantial callout. Do not invent filler to occupy leftover canvas.`;

  const user = JSON.stringify(
    {
      projectTruth: {
        businessName: truth.businessName,
        wordmark: truth.wordmark,
        descriptor: truth.descriptor,
        headline: truth.headline,
        offerName: truth.offerName,
        priceDisplay: truth.priceDisplay,
        wasPriceDisplay: truth.wasPriceDisplay,
        dateWindow: truth.dateWindow,
        body: truth.body,
        cta: truth.cta,
        phone: truth.phone,
        webDisplay: truth.webDisplay,
        requiredTextTokens: truth.requiredTextTokens,
        prohibitedClaimPatterns: truth.prohibitedClaimPatterns,
        brandColors: truth.brandColors,
      },
      seedSpec: base,
    },
    null,
    2,
  );

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!response.ok) {
      recordAnthropicCall({
        model,
        purpose: "creative_reasoning",
        httpStatus: response.status,
      });
      return {
        ok: false,
        message: `Anthropic HTTP ${response.status}: ${await response.text()}`,
      };
    }
    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: AnthropicUsagePayload;
    };
    recordAnthropicCall({
      model,
      purpose: "creative_reasoning",
      httpStatus: response.status,
      usage: data.usage,
    });
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const fenced = text.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced?.[1]?.trim() ?? text.trim();
    const parsed = JSON.parse(candidate) as FlyerDesignSpec;
    parsed.materials = [...truth.materials];
    parsed.reasoningMode = "anthropic_text_model";
    parsed.reasoningModel = model;
    parsed.specVersion = FLYER_DESIGN_SPEC_VERSION;
    parsed.skuId = truth.skuId;
    parsed.outputFormats = ["png", "pdf"];
    parsed.canvas = { widthPx: format.widthPx, heightPx: format.heightPx };
    return { ok: true, spec: parsed };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function reasonFlyerDesignSpec(input: {
  truth: FlyerProjectTruth;
  preferAnthropic?: boolean;
  constraints?: FlyerReasoningConstraints;
}): Promise<FlyerDesignSpec> {
  if (input.preferAnthropic !== false) {
    const ai = await reasonFlyerDesignSpecAnthropic(
      input.truth,
      input.constraints,
    );
    if (ai.ok) return ai.spec;
  }
  return reasonFlyerDesignSpecDeterministic(input.truth, input.constraints);
}
