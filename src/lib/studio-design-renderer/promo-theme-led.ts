/**
 * Theme-led campaign graphics — one square and one portrait built from the
 * customer's theme, core message, its three steps, and the wordmark. No price,
 * dates, contact, logo, or call to action unless the customer supplied it.
 */

import {
  assertThemeLedCampaignTruth,
  themeLedCopyPlan,
  themeLedInventedCtaFinding,
  themeLedRepetitionFinding,
  themeLedUnsuppliedFactLeak,
} from "./theme-led-campaign";
import type {
  PromoAssetSpec,
  PromoAssetTruth,
  PromoDesignLayer,
  PromoProjectTruth,
  PromoTextLayer,
} from "./promo-types";

export function isThemeLedPromoTruth(truth: PromoProjectTruth): boolean {
  return truth.contentMode === "theme_led";
}

export function assertThemeLedPromoTruth(truth: PromoProjectTruth): void {
  assertThemeLedCampaignTruth(truth.themeLed);
  const leak = themeLedUnsuppliedFactLeak(
    [truth.themeLed.theme, truth.themeLed.coreMessage, truth.cta].join(" "),
    truth,
  );
  if (leak) {
    throw new Error(
      `MISSING_REQUIRED_TRUTH: theme-led copy carries a ${leak} the customer did not supply as a fact`,
    );
  }
}

function text(partial: Omit<PromoTextLayer, "type">): PromoTextLayer {
  return { type: "text", ...partial };
}

function copyOf(truth: PromoProjectTruth) {
  return themeLedCopyPlan({ theme: truth.themeLed!, wordmark: truth.wordmark, cta: truth.cta });
}

function ctaLayer(
  truth: PromoProjectTruth,
  id: string,
  y: number,
  align: PromoTextLayer["align"],
): PromoDesignLayer[] {
  if (!truth.cta.trim()) return [];
  return [
    text({ id: `${id}-cta`, role: "cta", content: truth.cta.trim(), x: 72, y, width: 880, fontSizePx: 30, fontWeight: 700, lineHeight: 1.2, color: truth.brandColors.primary, align }),
  ];
}

function squareStepStride(truth: PromoProjectTruth): number {
  const note = truth.revisionInstruction ?? "";
  if (/\b(tighten|tighter|empty space|too much space|closer together)\b/i.test(note)) return 150;
  return 190;
}

/** Square — the three steps on a full navy field, wordmark as the sign-off. */
function squareLayers(truth: PromoProjectTruth, asset: PromoAssetTruth): PromoDesignLayer[] {
  const c = truth.brandColors;
  const id = asset.assetId;
  const W = asset.canvas.widthPx;
  const H = asset.canvas.heightPx;
  const copy = copyOf(truth);
  const stride = squareStepStride(truth);
  return [
    { type: "shape", id: `${id}-plate`, role: "plate", x: 0, y: 0, width: W, height: H, fill: c.primary },
    text({ id: `${id}-eyebrow`, role: "eyebrow", content: "How it works", x: 72, y: 140, width: W - 144, fontSizePx: 28, fontWeight: 600, lineHeight: 1.2, letterSpacingPx: 4, color: c.secondary, align: "center" }),
    ...copy.beats.flatMap((beat, index) => [
      text({ id: `${id}-step-label-${index + 1}`, role: "eyebrow", content: `Step ${index + 1}`, x: 72, y: 240 + index * stride, width: W - 144, fontSizePx: 24, fontWeight: 600, lineHeight: 1.2, letterSpacingPx: 3, color: c.secondary, align: "center" }),
      text({ id: `${id}-step-${index + 1}`, role: "offer", content: beat, x: 92, y: 280 + index * stride, width: W - 184, fontSizePx: 46, fontWeight: 700, lineHeight: 1.2, color: c.background, align: "center" }),
    ]),
    { type: "shape", id: `${id}-rule`, role: "footer_rule", x: (W - 160) / 2, y: 830, width: 160, height: 6, fill: c.secondary },
    text({ id: `${id}-wordmark`, role: "wordmark", content: truth.wordmark, x: 72, y: 866, width: W - 144, fontSizePx: 44, fontWeight: 700, lineHeight: 1.15, letterSpacingPx: 1, color: c.background, align: "center" }),
    ...ctaLayer(truth, id, 950, "center"),
  ];
}

/** Portrait — wordmark plate with its own lead line; the three steps are the main content. */
function portraitLayers(truth: PromoProjectTruth, asset: PromoAssetTruth): PromoDesignLayer[] {
  const c = truth.brandColors;
  const id = asset.assetId;
  const W = asset.canvas.widthPx;
  const copy = copyOf(truth);
  return [
    { type: "shape", id: `${id}-plate`, role: "plate", x: 0, y: 0, width: W, height: 560, fill: c.primary },
    text({ id: `${id}-wordmark`, role: "wordmark", content: truth.wordmark, x: 72, y: 140, width: W - 144, fontSizePx: 84, fontWeight: 700, lineHeight: 1.1, color: c.background, align: "center" }),
    ...(copy.portraitLead
      ? [text({ id: `${id}-headline`, role: "headline", content: copy.portraitLead, x: 92, y: 290, width: W - 184, fontSizePx: 44, fontWeight: 700, lineHeight: 1.2, color: c.background, align: "center" })]
      : []),
    ...copy.beats.flatMap((beat, index) => [
      text({ id: `${id}-step-label-${index + 1}`, role: "eyebrow", content: `Step ${index + 1} of 3`, x: 72, y: 680 + index * 240, width: W - 144, fontSizePx: 26, fontWeight: 600, lineHeight: 1.2, letterSpacingPx: 3, color: c.secondary, align: "center" }),
      text({ id: `${id}-step-${index + 1}`, role: "offer", content: beat, x: 92, y: 722 + index * 240, width: W - 184, fontSizePx: 56, fontWeight: 700, lineHeight: 1.2, color: c.primary, align: "center" }),
    ]),
    { type: "shape", id: `${id}-rule`, role: "footer_rule", x: (W - 200) / 2, y: 1410, width: 200, height: 6, fill: c.secondary },
    ...ctaLayer(truth, id, 1440, "center"),
  ];
}

export function reasonThemeLedPromoAsset(
  truth: PromoProjectTruth,
  asset: PromoAssetTruth,
): PromoAssetSpec {
  if (asset.layoutVariant !== "compact_square" && asset.layoutVariant !== "tall_portrait") {
    throw new Error(
      "MISSING_REQUIRED_TRUTH: theme-led campaign graphics are square and portrait only. Do not invent a stretched layout.",
    );
  }
  return {
    assetId: asset.assetId,
    authorizedPurpose: asset.authorizedPurpose,
    plateId: asset.plateId,
    canvas: { ...asset.canvas },
    layoutVariant: asset.layoutVariant,
    background: { color: truth.brandColors.background },
    layers:
      asset.layoutVariant === "compact_square"
        ? squareLayers(truth, asset)
        : portraitLayers(truth, asset),
    outputFormats: ["png", "pdf"],
  };
}

/** Wordmark and every step on each graphic; no message said twice; nothing unsupplied. */
export function evaluateThemeLedPromoSet(input: {
  truth: PromoProjectTruth;
  assets: readonly PromoAssetSpec[];
  declaredTextByAsset: Record<string, string>;
}): { ok: true } | { ok: false; code: "SET_CONSISTENCY_FAILURE"; message: string } {
  const copy = copyOf(input.truth);
  const repetition = themeLedRepetitionFinding(
    input.assets.map((asset) => ({
      id: asset.assetId,
      lines: asset.layers.flatMap((layer) => (layer.type === "text" ? [layer.content] : [])),
    })),
    copy.core,
    copy.beats,
  );
  if (repetition) {
    return { ok: false, code: "SET_CONSISTENCY_FAILURE", message: `Repeated copy: ${repetition}` };
  }
  for (const asset of input.assets) {
    const painted = input.declaredTextByAsset[asset.assetId] ?? "";
    for (const required of [input.truth.wordmark, ...copy.beats]) {
      if (!painted.includes(required)) {
        return {
          ok: false,
          code: "SET_CONSISTENCY_FAILURE",
          message: `Graphic ${asset.assetId} is missing customer wording: "${required}"`,
        };
      }
    }
    const invented = themeLedInventedCtaFinding(painted, input.truth.cta);
    if (invented) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Graphic ${asset.assetId} paints a call to action ("${invented}") the customer left blank`,
      };
    }
    const leak = themeLedUnsuppliedFactLeak(painted, input.truth);
    if (leak) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Graphic ${asset.assetId} paints a ${leak} the customer did not supply`,
      };
    }
    if (!input.truth.cta.trim() && asset.layers.some((l) => l.type === "text" && l.role === "cta")) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `Graphic ${asset.assetId} paints a call to action the customer left blank`,
      };
    }
  }
  return { ok: true };
}
