/**
 * Offer-value hierarchy — class-level factory rule.
 *
 * A customer-supplied promotional price is not decorative geometry.
 * When that value is a primary attention element, the legitimate price
 * treatment may carry substantially more visual weight. QA must not
 * punish size alone. Reject a large price treatment only when it
 * overwhelms the composition or damages hierarchy.
 *
 * Do not invent offers. Do not duplicate the price. Do not use
 * customer-specific coordinates.
 */

import { inventoryAuthorizedFlyerContent } from "./flyer-content-proportional-composition";
import type { FlyerDesignSpec, FlyerProjectTruth, FlyerTextLayer } from "./types";

/** Decorative / empty seals. Occupancy may not be satisfied by a hollow circle. */
export const MAX_DECORATIVE_GEOMETRY_RATIO = 0.24;
export const MAX_DECORATIVE_GEOMETRY_PX = Math.round(
  1024 * MAX_DECORATIVE_GEOMETRY_RATIO,
);
export const CAPPED_DECORATIVE_GEOMETRY_PX = 220;

/** Designed promotional price callout — substantial, not a button, not the whole plate. */
export const PROMOTIONAL_PRICE_CALLOUT_TARGET_RATIO = 0.38;
export const PROMOTIONAL_PRICE_CALLOUT_MAX_RATIO = 0.44;
export const PROMOTIONAL_PRICE_CALLOUT_MIN_RATIO = 0.3;

export function promotionalPriceCalloutTargetPx(canvasWidthPx: number): number {
  return Math.round(canvasWidthPx * PROMOTIONAL_PRICE_CALLOUT_TARGET_RATIO);
}

export function promotionalPriceCalloutMaxPx(canvasWidthPx: number): number {
  return Math.round(canvasWidthPx * PROMOTIONAL_PRICE_CALLOUT_MAX_RATIO);
}

export function promotionalPriceCalloutMinPx(canvasWidthPx: number): number {
  return Math.round(canvasWidthPx * PROMOTIONAL_PRICE_CALLOUT_MIN_RATIO);
}

/**
 * True when the supplied price is the commercial hook, not a supporting
 * fact beside dense copy or customer imagery.
 */
export function isPromotionalPricePrimaryAttention(
  truth: Pick<
    FlyerProjectTruth,
    | "priceDisplay"
    | "body"
    | "dateWindow"
    | "descriptor"
    | "headline"
    | "offerName"
    | "cta"
    | "phone"
    | "webDisplay"
    | "wordmark"
    | "businessName"
    | "materials"
  >,
): boolean {
  if (!String(truth.priceDisplay ?? "").trim()) return false;
  const inventory = inventoryAuthorizedFlyerContent(truth as FlyerProjectTruth);
  if (inventory.hasImagery) return false;
  if (inventory.hasBody) return false;
  return true;
}

export function resolvePriceCalloutSizePx(input: {
  canvasWidthPx: number;
  availablePx: number;
  innerWidthPx: number;
  promotionalPricePrimary: boolean;
  capGeometry: boolean;
}): number {
  const available = Math.max(200, input.availablePx);
  const innerCap = Math.max(200, input.innerWidthPx);
  if (!input.promotionalPricePrimary) {
    const modest = input.capGeometry
      ? CAPPED_DECORATIVE_GEOMETRY_PX
      : Math.min(280, MAX_DECORATIVE_GEOMETRY_PX);
    return Math.min(modest, innerCap, available);
  }
  const target = promotionalPriceCalloutTargetPx(input.canvasWidthPx);
  const max = promotionalPriceCalloutMaxPx(input.canvasWidthPx);
  return Math.min(target, max, innerCap, available);
}

export function priceCalloutTypeSizePx(medallionSize: number): number {
  return Math.max(56, Math.round(medallionSize * 0.26));
}

function estimatedTextHeight(layer: FlyerTextLayer): number {
  const lineHeight = layer.lineHeight || 1.2;
  const maxLines = layer.maxLines ?? 2;
  const approxCharsPerLine = Math.max(
    12,
    Math.floor(layer.width / Math.max(10, layer.fontSizePx * 0.45)),
  );
  const contentLines = Math.max(
    1,
    Math.ceil(layer.content.length / approxCharsPerLine),
  );
  return Math.round(
    layer.fontSizePx * lineHeight * Math.min(maxLines, contentLines),
  );
}

export function isPriceInsideMedallion(spec: FlyerDesignSpec): boolean {
  const medallion = spec.layers.find(
    (layer) => layer.type === "shape" && layer.id === "offer-medallion",
  );
  const price = spec.layers.find(
    (layer) => layer.type === "text" && layer.role === "price",
  );
  if (!medallion || medallion.type !== "shape") return false;
  if (!price || price.type !== "text") return false;
  const bottom = price.y + estimatedTextHeight(price);
  return (
    price.y >= medallion.y &&
    bottom <= medallion.y + medallion.height &&
    price.x >= medallion.x &&
    price.x + price.width <= medallion.x + medallion.width
  );
}
