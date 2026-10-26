/**
 * Deterministic campaign-set reasoner — square + portrait layouts (related, not cloned).
 */

import { resolvePromoPlate } from "./promo-contracts";
import {
  PROMO_PORTRAIT_CANVAS_HEIGHT_PX,
  PROMO_SQUARE_CANVAS_HEIGHT_PX,
  PROMO_STACK_GAP_PX,
  stackPromoTextLayersFromY,
  textLayerBottomY,
} from "./promo-stack-layout";
import {
  assertThemeLedPromoTruth,
  isThemeLedPromoTruth,
  reasonThemeLedPromoAsset,
} from "./promo-theme-led";
import {
  PROMO_DESIGN_SPEC_VERSION,
  type PromoAssetSpec,
  type PromoAssetTruth,
  type PromoCampaignSetSpec,
  type PromoDesignLayer,
  type PromoProjectTruth,
  type PromoTextLayer,
} from "./promo-types";

function textLayer(
  partial: Omit<PromoTextLayer, "type">,
): PromoTextLayer {
  return { type: "text", ...partial };
}

function resolvedPromoEditorialHeadline(
  truth: Pick<PromoProjectTruth, "headline" | "offerName">,
): string {
  const headline = truth.headline.trim();
  const offer = truth.offerName.trim();
  if (!headline || headline === offer) return "";
  return headline;
}

/** Paint headline only when intake supplied distinct editorial copy (not a repeat of offerName). */
function promoEditorialHeadlineLayer(
  truth: Pick<PromoProjectTruth, "headline" | "offerName">,
  partial: Omit<PromoTextLayer, "type" | "role" | "content" | "id"> & { assetId: string },
): PromoTextLayer[] {
  const headline = resolvedPromoEditorialHeadline(truth);
  if (!headline) return [];
  return [
    textLayer({
      id: `${partial.assetId}-headline`,
      role: "headline",
      content: headline,
      x: partial.x,
      y: partial.y,
      width: partial.width,
      fontSizePx: partial.fontSizePx,
      fontWeight: partial.fontWeight,
      lineHeight: partial.lineHeight,
      color: partial.color,
      align: partial.align,
      ...(partial.letterSpacingPx != null
        ? { letterSpacingPx: partial.letterSpacingPx }
        : {}),
    }),
  ];
}

function promoLogoLayers(
  assetId: string,
  logo: { materialId: string } | undefined,
  layout: "compact_square" | "tall_portrait",
): PromoDesignLayer[] {
  if (!logo) return [];
  if (layout === "compact_square") {
    const W = 1024;
    return [
      {
        type: "shape",
        id: `${assetId}-logo-plate`,
        role: "logo_plate",
        x: (W - 148) / 2,
        y: 36,
        width: 148,
        height: 148,
        fill: "#FFFFFF",
        borderRadiusPx: 74,
      },
      {
        type: "image",
        id: `${assetId}-logo`,
        role: "logo",
        materialId: logo.materialId,
        x: (W - 116) / 2,
        y: 52,
        width: 116,
        height: 116,
        fit: "contain",
      },
    ];
  }
  return [
    {
      type: "shape",
      id: `${assetId}-logo-plate`,
      role: "logo_plate",
      x: 392,
      y: 64,
      width: 240,
      height: 240,
      fill: "#FFFFFF",
      borderRadiusPx: 120,
    },
    {
      type: "image",
      id: `${assetId}-logo`,
      role: "logo",
      materialId: logo.materialId,
      x: 416,
      y: 88,
      width: 192,
      height: 192,
      fit: "contain",
    },
  ];
}

/** Purpose bars stay on identity JSON for production; never paint on customer art. */
function shouldPaintPurposeLabel(
  truth: Pick<PromoProjectTruth, "outputMode">,
): boolean {
  return truth.outputMode !== "customer";
}

export function assertPromoRequiredTruth(truth: PromoProjectTruth): void {
  if (truth.skuId !== "v2-rtu-promotion-graphics") {
    throw new Error("MISSING_REQUIRED_TRUTH: skuId must be v2-rtu-promotion-graphics");
  }
  if (!truth.businessName?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: businessName");
  }
  const themeLed = isThemeLedPromoTruth(truth);
  if (themeLed) {
    assertThemeLedPromoTruth(truth);
  } else if (!truth.offerName?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: offerName");
  }
  if (!Array.isArray(truth.assets) || truth.assets.length !== 2) {
    throw new Error("MISSING_REQUIRED_TRUTH: exactly two assets required");
  }
  const [a, b] = truth.assets;
  if (!a.assetId?.trim() || !b.assetId?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: each asset requires semantic assetId");
  }
  if (a.assetId === b.assetId) {
    throw new Error("MISSING_REQUIRED_TRUTH: assetIds must be distinct");
  }
  if (!a.authorizedPurpose?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: Asset A authorizedPurpose required (explicit fixture truth)");
  }
  if (!b.authorizedPurpose?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: Asset B authorizedPurpose required (explicit fixture truth)");
  }
  if (!a.plateId || !b.plateId) {
    throw new Error("MISSING_REQUIRED_TRUTH: each asset requires plateId");
  }
  if (a.layoutVariant === b.layoutVariant && a.plateId === b.plateId) {
    throw new Error(
      "MISSING_REQUIRED_TRUTH: assets must adapt to distinct layout/plate (coordinated, not cloned)",
    );
  }
  const wordmarkOnly = truth.approvedLogoVariantId === "wordmark-only";
  if (!wordmarkOnly && !truth.materials.some((m) => m.role === "logo")) {
    throw new Error("MISSING_REQUIRED_MATERIAL: logo");
  }
  if (!truth.liveIntakePerAssetPurposeGap?.trim()) {
    throw new Error(
      "MISSING_REQUIRED_TRUTH: liveIntakePerAssetPurposeGap must be documented on proof truth",
    );
  }
  for (const asset of truth.assets) {
    const plate = resolvePromoPlate(asset.plateId);
    if (
      asset.canvas.widthPx !== plate.widthPx ||
      asset.canvas.heightPx !== plate.heightPx
    ) {
      throw new Error(
        `INVALID_PLATE: asset ${asset.assetId} canvas ${asset.canvas.widthPx}x${asset.canvas.heightPx} does not match plate ${plate.plateId}`,
      );
    }
  }
}

function reasonSquareAsset(
  truth: PromoProjectTruth,
  asset: PromoAssetTruth,
): PromoAssetSpec {
  const c = truth.brandColors;
  const logo = truth.materials.find((m) => m.role === "logo");
  const W = asset.canvas.widthPx;
  const headerLift = logo ? 0 : 156;
  const priceLine = truth.wasPriceDisplay
    ? `${truth.priceDisplay} · ${truth.wasPriceDisplay}`
    : truth.priceDisplay;
  const margin = 72;
  const textWidth = W - margin * 2;
  const compact = /\b(tighten|tighter|empty space|too much space|closer together)\b/i.test(
    truth.revisionInstruction ?? "",
  );
  const place = (y: number) =>
    !compact || y < 448 ? y : 448 + Math.round((y - 448) * 0.72);

  const editorialHeadline = resolvedPromoEditorialHeadline(truth);
  const descriptorText = truth.descriptor.trim();
  const offerBandY = editorialHeadline
    ? place(356 - headerLift)
    : descriptorText
      ? place(308 - headerLift)
      : place(268 - headerLift);
  const offerTextY = offerBandY + 16;
  const priceY = offerBandY + 92;
  const datesY = priceY + 68;

  const layers: PromoDesignLayer[] = [
    ...promoLogoLayers(asset.assetId, logo, "compact_square"),
    ...(shouldPaintPurposeLabel(truth)
      ? [
          textLayer({
            id: `${asset.assetId}-purpose`,
            role: "purpose_label",
            content: asset.authorizedPurpose,
            x: margin,
            y: 8,
            width: textWidth,
            fontSizePx: 16,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacingPx: 1,
            color: c.secondary,
            align: "center",
          }),
        ]
      : []),
    textLayer({
      id: `${asset.assetId}-wordmark`,
      role: "wordmark",
      content: truth.wordmark,
      x: margin,
      y: place(204 - headerLift),
      width: textWidth,
      fontSizePx: 40,
      fontWeight: 700,
      lineHeight: 1.1,
      color: c.primary,
      align: "center",
    }),
    ...(descriptorText
      ? [
          textLayer({
            id: `${asset.assetId}-descriptor`,
            role: "descriptor",
            content: descriptorText,
            x: margin,
            y: place(258 - headerLift),
            width: textWidth,
            fontSizePx: 18,
            fontWeight: 500,
            lineHeight: 1.2,
            letterSpacingPx: 2,
            color: c.primary,
            align: "center",
          }),
        ]
      : []),
    ...(editorialHeadline
      ? promoEditorialHeadlineLayer(truth, {
          assetId: asset.assetId,
          x: margin,
          y: place(300 - headerLift),
          width: textWidth,
          fontSizePx: 28,
          fontWeight: 600,
          lineHeight: 1.2,
          color: c.text,
          align: "center",
        })
      : []),
    {
      type: "shape",
      id: `${asset.assetId}-offer-band`,
      role: "offer_band",
      x: margin,
      y: offerBandY,
      width: textWidth,
      height: 72,
      fill: c.secondary,
    },
    textLayer({
      id: `${asset.assetId}-offer`,
      role: "offer",
      content: truth.offerName,
      x: margin,
      y: offerTextY,
      width: textWidth,
      fontSizePx: 28,
      fontWeight: 700,
      lineHeight: 1.2,
      color: c.primary,
      align: "center",
    }),
    textLayer({
      id: `${asset.assetId}-price`,
      role: "price",
      content: priceLine,
      x: margin,
      y: priceY,
      width: textWidth,
      fontSizePx: 48,
      fontWeight: 700,
      lineHeight: 1.05,
      color: c.text,
      align: "center",
    }),
    textLayer({
      id: `${asset.assetId}-dates`,
      role: "dates",
      content: truth.dateWindow,
      x: margin,
      y: datesY,
      width: textWidth,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.muted,
      align: "center",
    }),
  ];

  const datesLayer = layers[layers.length - 1]!;
  if (datesLayer.type !== "text") {
    throw new Error("INVALID_DESIGN_SPEC: expected dates text layer");
  }
  const footerStartY = textLayerBottomY(datesLayer, { maxLines: 2 }) + PROMO_STACK_GAP_PX;
  const footerStack = stackPromoTextLayersFromY(
    footerStartY,
    [
      {
        id: `${asset.assetId}-body`,
        role: "body",
        content: truth.body,
        skipWhenEmpty: true,
        x: margin + 24,
        y: footerStartY,
        width: textWidth - 48,
        fontSizePx: 22,
        fontWeight: 400,
        lineHeight: 1.35,
        color: c.text,
        align: "center",
        maxLines: 4,
      },
      {
        id: `${asset.assetId}-cta`,
        role: "cta",
        content: truth.cta,
        x: margin,
        y: footerStartY,
        width: textWidth,
        fontSizePx: 26,
        fontWeight: 700,
        lineHeight: 1.2,
        color: c.primary,
        align: "center",
        maxLines: 1,
      },
      {
        id: `${asset.assetId}-phone`,
        role: "contact_phone",
        content: truth.phone,
        skipWhenEmpty: true,
        x: margin,
        y: footerStartY,
        width: textWidth,
        fontSizePx: 22,
        fontWeight: 500,
        lineHeight: 1.2,
        color: c.text,
        align: "center",
        maxLines: 1,
      },
      {
        id: `${asset.assetId}-web`,
        role: "contact_web",
        content: truth.webDisplay,
        skipWhenEmpty: true,
        x: margin,
        y: footerStartY,
        width: textWidth,
        fontSizePx: 20,
        fontWeight: 500,
        lineHeight: 1.2,
        color: c.secondary,
        align: "center",
        maxLines: 2,
      },
      {
        id: `${asset.assetId}-disclaimer`,
        role: "disclaimer",
        content: truth.disclaimer,
        skipWhenEmpty: true,
        x: margin,
        y: footerStartY,
        width: textWidth,
        fontSizePx: 14,
        fontWeight: 400,
        lineHeight: 1.3,
        color: c.muted,
        align: "center",
        maxLines: 4,
      },
    ],
    PROMO_SQUARE_CANVAS_HEIGHT_PX,
  );
  if (!("layers" in footerStack)) {
    throw new Error(`MISSING_REQUIRED_TRUTH: ${footerStack.message}`);
  }
  layers.push(...footerStack.layers);

  return {
    assetId: asset.assetId,
    authorizedPurpose: asset.authorizedPurpose,
    plateId: asset.plateId,
    canvas: { ...asset.canvas },
    layoutVariant: "compact_square",
    background: { color: c.background },
    layers,
    outputFormats: ["png", "pdf"],
  };
}


function reasonPortraitAsset(
  truth: PromoProjectTruth,
  asset: PromoAssetTruth,
): PromoAssetSpec {
  const c = truth.brandColors;
  const logo = truth.materials.find((m) => m.role === "logo");
  const W = asset.canvas.widthPx;
  const headerLift = logo ? 0 : 276;
  const priceLine = truth.wasPriceDisplay
    ? `${truth.priceDisplay} (${truth.wasPriceDisplay})`
    : truth.priceDisplay;

  const editorialHeadline = resolvedPromoEditorialHeadline(truth);
  const descriptorText = truth.descriptor.trim();
  const ruleY = editorialHeadline
    ? 560 - headerLift
    : descriptorText
      ? 480 - headerLift
      : 420 - headerLift;
  const offerY = ruleY + 36;
  const priceY = offerY + 104;
  const datesY = priceY + 90;

  const layers: PromoDesignLayer[] = [
    {
      type: "shape",
      id: `${asset.assetId}-accent`,
      role: "accent_bar",
      x: 0,
      y: 0,
      width: 28,
      height: asset.canvas.heightPx,
      fill: c.primary,
    },
    ...promoLogoLayers(asset.assetId, logo, "tall_portrait"),
    ...(shouldPaintPurposeLabel(truth)
      ? [
          textLayer({
            id: `${asset.assetId}-purpose`,
            role: "purpose_label",
            content: asset.authorizedPurpose,
            x: 72,
            y: 48,
            width: 300,
            fontSizePx: 16,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacingPx: 1,
            color: c.secondary,
            align: "left",
          }),
        ]
      : []),
    textLayer({
      id: `${asset.assetId}-wordmark`,
      role: "wordmark",
      content: truth.wordmark,
      x: 72,
      y: 340 - headerLift,
      width: 880,
      fontSizePx: 48,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.primary,
      align: "center",
    }),
    ...(descriptorText
      ? [
          textLayer({
            id: `${asset.assetId}-descriptor`,
            role: "descriptor",
            content: descriptorText,
            x: 72,
            y: 408 - headerLift,
            width: 880,
            fontSizePx: 22,
            fontWeight: 500,
            lineHeight: 1.2,
            letterSpacingPx: 2,
            color: c.primary,
            align: "center",
          }),
        ]
      : []),
    ...(editorialHeadline
      ? promoEditorialHeadlineLayer(truth, {
          assetId: asset.assetId,
          x: 88,
          y: 480 - headerLift,
          width: 848,
          fontSizePx: 38,
          fontWeight: 600,
          lineHeight: 1.2,
          color: c.text,
          align: "center",
        })
      : []),
    {
      type: "shape",
      id: `${asset.assetId}-rule`,
      role: "footer_rule",
      x: 360,
      y: ruleY,
      width: 304,
      height: 3,
      fill: c.secondary,
    },
    textLayer({
      id: `${asset.assetId}-offer`,
      role: "offer",
      content: truth.offerName,
      x: 72,
      y: offerY,
      width: 880,
      fontSizePx: 34,
      fontWeight: 700,
      lineHeight: 1.25,
      color: c.primary,
      align: "center",
    }),
    textLayer({
      id: `${asset.assetId}-price`,
      role: "price",
      content: priceLine,
      x: 72,
      y: priceY,
      width: 880,
      fontSizePx: 56,
      fontWeight: 700,
      lineHeight: 1.1,
      color: c.text,
      align: "center",
    }),
    textLayer({
      id: `${asset.assetId}-dates`,
      role: "dates",
      content: truth.dateWindow,
      x: 72,
      y: datesY,
      width: 880,
      fontSizePx: 24,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.muted,
      align: "center",
    }),
  ];

  const portraitDates = layers[layers.length - 1]!;
  if (portraitDates.type !== "text") {
    throw new Error("INVALID_DESIGN_SPEC: expected dates text layer");
  }
  const portraitFooterStart =
    textLayerBottomY(portraitDates, { maxLines: 2 }) + PROMO_STACK_GAP_PX;
  const portraitFooter = stackPromoTextLayersFromY(
    portraitFooterStart,
    [
      {
        id: `${asset.assetId}-body`,
        role: "body",
        content: truth.body,
        skipWhenEmpty: true,
        x: 100,
        y: portraitFooterStart,
        width: 824,
        fontSizePx: 22,
        fontWeight: 400,
        lineHeight: 1.35,
        color: c.text,
        align: "center",
        maxLines: 4,
      },
      {
        id: `${asset.assetId}-cta`,
        role: "cta",
        content: truth.cta,
        x: 72,
        y: portraitFooterStart,
        width: 880,
        fontSizePx: 28,
        fontWeight: 700,
        lineHeight: 1.2,
        color: c.primary,
        align: "center",
        maxLines: 1,
      },
      {
        id: `${asset.assetId}-phone`,
        role: "contact_phone",
        content: truth.phone,
        skipWhenEmpty: true,
        x: 72,
        y: portraitFooterStart,
        width: 880,
        fontSizePx: 24,
        fontWeight: 500,
        lineHeight: 1.2,
        color: c.text,
        align: "center",
        maxLines: 1,
      },
      {
        id: `${asset.assetId}-web`,
        role: "contact_web",
        content: truth.webDisplay,
        skipWhenEmpty: true,
        x: 72,
        y: portraitFooterStart,
        width: 880,
        fontSizePx: 22,
        fontWeight: 500,
        lineHeight: 1.2,
        color: c.secondary,
        align: "center",
        maxLines: 2,
      },
      {
        id: `${asset.assetId}-disclaimer`,
        role: "disclaimer",
        content: truth.disclaimer,
        skipWhenEmpty: true,
        x: 72,
        y: portraitFooterStart,
        width: 880,
        fontSizePx: 14,
        fontWeight: 400,
        lineHeight: 1.3,
        color: c.muted,
        align: "center",
        maxLines: 4,
      },
    ],
    PROMO_PORTRAIT_CANVAS_HEIGHT_PX,
  );
  if (!("layers" in portraitFooter)) {
    throw new Error(`MISSING_REQUIRED_TRUTH: ${portraitFooter.message}`);
  }
  layers.push(...portraitFooter.layers);

  return {
    assetId: asset.assetId,
    authorizedPurpose: asset.authorizedPurpose,
    plateId: asset.plateId,
    canvas: { ...asset.canvas },
    layoutVariant: "tall_portrait",
    background: { color: c.background },
    layers,
    outputFormats: ["png", "pdf"],
  };
}

/**
 * Reason one promo graphic layout from sealed square/portrait layout families.
 * Used by the exact-two campaign set and by ma-001 single `promotion_graphic` member adapter.
 * Does not change exact-two product law — dual set still requires two assets via assertPromoRequiredTruth.
 */
export function reasonPromoGraphicAsset(
  truth: PromoProjectTruth,
  asset: PromoAssetTruth,
): PromoAssetSpec {
  if (isThemeLedPromoTruth(truth)) {
    return reasonThemeLedPromoAsset(truth, asset);
  }
  if (asset.layoutVariant === "compact_square") {
    return reasonSquareAsset(truth, asset);
  }
  if (asset.layoutVariant === "tall_portrait") {
    return reasonPortraitAsset(truth, asset);
  }
  if (asset.layoutVariant === "wide_landscape") {
    throw new Error(
      "MISSING_REQUIRED_TRUTH: landscape promo layout is intake-ready but not yet in the promotion-graphics renderer proof (square + portrait only). Do not invent a stretched portrait.",
    );
  }
  throw new Error(`INVALID_DESIGN_SPEC: unknown layoutVariant`);
}

export function reasonPromoCampaignSetDeterministic(
  truth: PromoProjectTruth,
): PromoCampaignSetSpec {
  assertPromoRequiredTruth(truth);
  const [aTruth, bTruth] = truth.assets;

  return {
    specVersion: PROMO_DESIGN_SPEC_VERSION,
    skuId: truth.skuId,
    colors: { ...truth.brandColors },
    materials: [...truth.materials],
    sharedCampaign: {
      businessName: truth.businessName,
      wordmark: truth.wordmark,
      offerName: truth.offerName,
      priceDisplay: truth.priceDisplay,
      dateWindow: truth.dateWindow,
      phone: truth.phone,
      webDisplay: truth.webDisplay,
      cta: truth.cta,
    },
    assets: [
      reasonPromoGraphicAsset(truth, aTruth),
      reasonPromoGraphicAsset(truth, bTruth),
    ],
    reasoningMode: "deterministic_constrained",
  };
}
