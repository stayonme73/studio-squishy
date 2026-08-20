/**
 * Deterministic campaign-set reasoner — square + portrait layouts (related, not cloned).
 */

import { resolvePromoPlate } from "./promo-contracts";
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
  if (!truth.offerName?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: offerName");
  }
  if (!truth.priceDisplay?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: priceDisplay");
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
  if (!truth.materials.some((m) => m.role === "logo")) {
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
  const logo = truth.materials.find((m) => m.role === "logo")!;
  const W = asset.canvas.widthPx;
  const priceLine = truth.wasPriceDisplay
    ? `${truth.priceDisplay} · ${truth.wasPriceDisplay}`
    : truth.priceDisplay;

  const layers: PromoDesignLayer[] = [
    {
      type: "shape",
      id: `${asset.assetId}-band`,
      role: "offer_band",
      x: 0,
      y: 0,
      width: W,
      height: 120,
      fill: c.primary,
    },
    {
      type: "shape",
      id: `${asset.assetId}-logo-plate`,
      role: "logo_plate",
      x: 48,
      y: 148,
      width: 160,
      height: 160,
      fill: "#FFFFFF",
      borderRadiusPx: 24,
    },
    {
      type: "image",
      id: `${asset.assetId}-logo`,
      role: "logo",
      materialId: logo.materialId,
      x: 64,
      y: 164,
      width: 128,
      height: 128,
      fit: "contain",
    },
    ...(shouldPaintPurposeLabel(truth)
      ? [
          textLayer({
            id: `${asset.assetId}-purpose`,
            role: "purpose_label",
            content: asset.authorizedPurpose,
            x: 48,
            y: 36,
            width: W - 96,
            fontSizePx: 18,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacingPx: 1,
            color: "#F7F4EF",
            align: "left",
          }),
        ]
      : []),
    textLayer({
      id: `${asset.assetId}-wordmark`,
      role: "wordmark",
      content: truth.wordmark,
      x: 232,
      y: 168,
      width: W - 280,
      fontSizePx: 34,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.primary,
      align: "left",
    }),
    textLayer({
      id: `${asset.assetId}-descriptor`,
      role: "descriptor",
      content: truth.descriptor,
      x: 232,
      y: 220,
      width: W - 280,
      fontSizePx: 18,
      fontWeight: 500,
      lineHeight: 1.25,
      color: c.secondary,
      align: "left",
    }),
    textLayer({
      id: `${asset.assetId}-offer`,
      role: "offer",
      content: truth.offerName,
      x: 48,
      y: 360,
      width: W - 96,
      fontSizePx: 36,
      fontWeight: 700,
      lineHeight: 1.2,
      color: c.primary,
      align: "left",
    }),
    textLayer({
      id: `${asset.assetId}-price`,
      role: "price",
      content: priceLine,
      x: 48,
      y: 460,
      width: W - 96,
      fontSizePx: 52,
      fontWeight: 700,
      lineHeight: 1.05,
      color: c.text,
      align: "left",
    }),
    textLayer({
      id: `${asset.assetId}-dates`,
      role: "dates",
      content: truth.dateWindow,
      x: 48,
      y: 540,
      width: W - 96,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.muted,
      align: "left",
    }),
    textLayer({
      id: `${asset.assetId}-cta`,
      role: "cta",
      content: truth.cta,
      x: 48,
      y: 720,
      width: W - 96,
      fontSizePx: 26,
      fontWeight: 700,
      lineHeight: 1.2,
      color: c.primary,
      align: "left",
    }),
    textLayer({
      id: `${asset.assetId}-phone`,
      role: "contact_phone",
      content: truth.phone,
      x: 48,
      y: 780,
      width: W - 96,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.text,
      align: "left",
    }),
    textLayer({
      id: `${asset.assetId}-web`,
      role: "contact_web",
      content: truth.webDisplay,
      x: 48,
      y: 820,
      width: W - 96,
      fontSizePx: 20,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.secondary,
      align: "left",
    }),
    textLayer({
      id: `${asset.assetId}-disclaimer`,
      role: "disclaimer",
      content: truth.disclaimer,
      x: 48,
      y: 920,
      width: W - 96,
      fontSizePx: 14,
      fontWeight: 400,
      lineHeight: 1.3,
      color: c.muted,
      align: "left",
    }),
  ];

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
  const logo = truth.materials.find((m) => m.role === "logo")!;
  const W = asset.canvas.widthPx;
  const priceLine = truth.wasPriceDisplay
    ? `${truth.priceDisplay} (${truth.wasPriceDisplay})`
    : truth.priceDisplay;

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
    {
      type: "shape",
      id: `${asset.assetId}-logo-plate`,
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
      id: `${asset.assetId}-logo`,
      role: "logo",
      materialId: logo.materialId,
      x: 416,
      y: 88,
      width: 192,
      height: 192,
      fit: "contain",
    },
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
      y: 340,
      width: 880,
      fontSizePx: 48,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.primary,
      align: "center",
    }),
    textLayer({
      id: `${asset.assetId}-descriptor`,
      role: "descriptor",
      content: truth.descriptor,
      x: 72,
      y: 408,
      width: 880,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacingPx: 2,
      color: c.secondary,
      align: "center",
    }),
    textLayer({
      id: `${asset.assetId}-headline`,
      role: "headline",
      content: truth.headline,
      x: 88,
      y: 480,
      width: 848,
      fontSizePx: 38,
      fontWeight: 600,
      lineHeight: 1.2,
      color: c.text,
      align: "center",
    }),
    {
      type: "shape",
      id: `${asset.assetId}-rule`,
      role: "footer_rule",
      x: 360,
      y: 560,
      width: 304,
      height: 3,
      fill: c.secondary,
    },
    textLayer({
      id: `${asset.assetId}-offer`,
      role: "offer",
      content: truth.offerName,
      x: 72,
      y: 596,
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
      y: 700,
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
      y: 790,
      width: 880,
      fontSizePx: 24,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.muted,
      align: "center",
    }),
    textLayer({
      id: `${asset.assetId}-body`,
      role: "body",
      content: truth.body,
      x: 100,
      y: 880,
      width: 824,
      fontSizePx: 22,
      fontWeight: 400,
      lineHeight: 1.35,
      color: c.text,
      align: "center",
    }),
    textLayer({
      id: `${asset.assetId}-cta`,
      role: "cta",
      content: truth.cta,
      x: 72,
      y: 1100,
      width: 880,
      fontSizePx: 28,
      fontWeight: 700,
      lineHeight: 1.2,
      color: c.primary,
      align: "center",
    }),
    textLayer({
      id: `${asset.assetId}-phone`,
      role: "contact_phone",
      content: truth.phone,
      x: 72,
      y: 1180,
      width: 880,
      fontSizePx: 24,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.text,
      align: "center",
    }),
    textLayer({
      id: `${asset.assetId}-web`,
      role: "contact_web",
      content: truth.webDisplay,
      x: 72,
      y: 1224,
      width: 880,
      fontSizePx: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      color: c.secondary,
      align: "center",
    }),
    textLayer({
      id: `${asset.assetId}-disclaimer`,
      role: "disclaimer",
      content: truth.disclaimer,
      x: 72,
      y: 1400,
      width: 880,
      fontSizePx: 14,
      fontWeight: 400,
      lineHeight: 1.3,
      color: c.muted,
      align: "center",
    }),
  ];

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
