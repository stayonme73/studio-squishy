/**
 * Content-proportional flyer composition — class-level factory rule.
 *
 * The canvas serves authorized customer content. Decorative occupancy is not
 * a pass. Sparse copy does not automatically shrink the format. Customer-selected
 * size remains authoritative. Do not invent facts to occupy space.
 */

import type { DesignQualityFinding } from "@/lib/studio-kitchen-production/design-quality/types";

import type { FlyerDesignSpec, FlyerProjectTruth, FlyerTextLayer } from "./types";

export const FLYER_FORMAT_POSTER = {
  id: "poster_portrait",
  widthPx: 1024,
  heightPx: 1536,
} as const;

export const FLYER_FORMAT_SQUARE = {
  id: "square",
  widthPx: 1024,
  heightPx: 1024,
} as const;

export type FlyerCertifiedFormat =
  | typeof FLYER_FORMAT_POSTER
  | typeof FLYER_FORMAT_SQUARE;

export const FLYER_CERTIFIED_FORMATS = [
  FLYER_FORMAT_POSTER,
  FLYER_FORMAT_SQUARE,
] as const;

const CHROME_LAYER_IDS = new Set([
  "plate-top",
  "plate-bottom",
  "paper-mat",
  "frame-top",
  "frame-bottom",
  "frame-left",
  "frame-right",
  "corner-tl-h",
  "corner-tl-v",
  "corner-tr-h",
  "corner-tr-v",
  "corner-bl-h",
  "corner-bl-v",
  "corner-br-h",
  "corner-br-v",
  "identity-rule",
  "offer-panel-rule",
  "cta-rule",
  "tick-square",
]);

const MIN_ZONE_SPAN_RATIO = 0.72;
const MAX_TRAILING_UNUSED_RATIO = 0.18;

export function isCertifiedFlyerCanvas(canvas: {
  widthPx: number;
  heightPx: number;
}): boolean {
  return FLYER_CERTIFIED_FORMATS.some(
    (format) =>
      format.widthPx === canvas.widthPx && format.heightPx === canvas.heightPx,
  );
}

export type AuthorizedFlyerContentInventory = {
  factCount: number;
  hasImagery: boolean;
  hasBody: boolean;
  hasDates: boolean;
  hasDescriptor: boolean;
  hasHeadline: boolean;
  hasOffer: boolean;
  hasPrice: boolean;
  hasCta: boolean;
  hasContact: boolean;
};

export function inventoryAuthorizedFlyerContent(
  truth: FlyerProjectTruth,
): AuthorizedFlyerContentInventory {
  const hasImagery = truth.materials.some(
    (material) => layerRoleIsImage(material.role),
  );
  const hasBody = Boolean(truth.body.trim());
  const hasDates = Boolean(truth.dateWindow.trim());
  const hasDescriptor = Boolean(truth.descriptor.trim());
  const hasHeadline = Boolean(truth.headline.trim());
  const hasOffer = Boolean(truth.offerName.trim());
  const hasPrice = Boolean(truth.priceDisplay.trim());
  const hasCta = Boolean(truth.cta.trim());
  const hasContact = Boolean(truth.phone.trim() || truth.webDisplay.trim());
  const factCount = [
    Boolean(truth.wordmark.trim() || truth.businessName.trim()),
    hasDescriptor,
    hasHeadline,
    hasOffer,
    hasPrice,
    hasDates,
    hasBody,
    hasCta,
    Boolean(truth.phone.trim()),
    Boolean(truth.webDisplay.trim()),
    hasImagery,
  ].filter(Boolean).length;
  return {
    factCount,
    hasImagery,
    hasBody,
    hasDates,
    hasDescriptor,
    hasHeadline,
    hasOffer,
    hasPrice,
    hasCta,
    hasContact,
  };
}

function layerRoleIsImage(role: string): boolean {
  return role === "logo" || role === "hero";
}

/** Sparse means few authorized facts — not a command to shrink the format. */
export function isSparseAuthorizedFlyerContent(
  inventory: AuthorizedFlyerContentInventory,
): boolean {
  return (
    !inventory.hasImagery &&
    !inventory.hasBody &&
    !inventory.hasDates &&
    inventory.factCount <= 7
  );
}

export function parseCustomerSelectedFlyerFormat(
  sizeNotes: string | undefined,
): FlyerCertifiedFormat | null {
  const notes = String(sizeNotes ?? "").trim().toLowerCase();
  if (!notes) return null;
  if (
    /8\s*[x×by]\s*11|8\.5|letter|tabloid|poster|11\s*[x×]\s*17|print\s*handout/.test(
      notes,
    )
  ) {
    return FLYER_FORMAT_POSTER;
  }
  if (/\bsquare\b|1024\s*[x×]\s*1024|instagram|1:1/.test(notes)) {
    return FLYER_FORMAT_SQUARE;
  }
  return null;
}

export function intendedUseIncludesPrint(intendedUse: string | undefined): boolean {
  return /\bprint\b|\bhandout\b|\bwindow\b|\bposter\b|\bcounter\b/i.test(
    String(intendedUse ?? ""),
  );
}

export function intendedUseIsDigitalOnly(intendedUse: string | undefined): boolean {
  const text = String(intendedUse ?? "").trim();
  if (!text) return false;
  if (intendedUseIncludesPrint(text)) return false;
  return /\bdigital\b|\bonline\b|\bsocial\b|\bemail\b|\bweb\b|\bshare\b/i.test(
    text,
  );
}

export type FlyerFormatResolution = {
  format: FlyerCertifiedFormat;
  sizeLocked: boolean;
  reason:
    | "customer_selected_size"
    | "default_poster"
    | "digital_use_with_short_copy";
};

/**
 * Customer-selected size wins. Sparse copy alone never selects a smaller plate.
 * Digital-only intended use may choose the square plate when copy is short and
 * size was not specified.
 */
export function resolveFlyerFormat(
  truth: Pick<FlyerProjectTruth, "sizeNotes" | "intendedUse" | "materials" | "body" | "dateWindow" | "descriptor" | "headline" | "offerName" | "priceDisplay" | "cta" | "phone" | "webDisplay" | "wordmark" | "businessName">,
): FlyerFormatResolution {
  const locked = parseCustomerSelectedFlyerFormat(truth.sizeNotes);
  if (locked) {
    return {
      format: locked,
      sizeLocked: true,
      reason: "customer_selected_size",
    };
  }
  const inventory = inventoryAuthorizedFlyerContent(truth as FlyerProjectTruth);
  if (
    intendedUseIsDigitalOnly(truth.intendedUse) &&
    isSparseAuthorizedFlyerContent(inventory)
  ) {
    return {
      format: FLYER_FORMAT_SQUARE,
      sizeLocked: false,
      reason: "digital_use_with_short_copy",
    };
  }
  return {
    format: FLYER_FORMAT_POSTER,
    sizeLocked: false,
    reason: "default_poster",
  };
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

export function layerBottom(layer: FlyerDesignSpec["layers"][number]): number {
  if (layer.type === "text") return layer.y + estimatedTextHeight(layer);
  return layer.y + layer.height;
}

export function isCommunicativeFlyerLayer(
  layer: FlyerDesignSpec["layers"][number],
): boolean {
  if (CHROME_LAYER_IDS.has(layer.id)) return false;
  if (layer.type === "text") return layer.content.trim().length > 0;
  if (layer.type === "image") return true;
  return (
    layer.id === "offer-panel" ||
    layer.id === "offer-medallion" ||
    layer.id === "cta-plate" ||
    layer.id === "cta-bar" ||
    layer.id === "footer-band" ||
    layer.id === "logo-plate" ||
    layer.id === "split-field" ||
    layer.id === "hero-slab" ||
    layer.id === "field-bleed" ||
    layer.id === "service-rail" ||
    layer.id === "visual-anchor"
  );
}

export function communicativeContentBounds(spec: FlyerDesignSpec): {
  top: number;
  bottom: number;
} | null {
  const items = spec.layers.filter(isCommunicativeFlyerLayer);
  if (items.length === 0) return null;
  return {
    top: Math.min(...items.map((layer) => layer.y)),
    bottom: Math.max(...items.map(layerBottom)),
  };
}

export function liveAreaHeight(spec: FlyerDesignSpec): number {
  const liveTop = 52;
  const liveBottom = spec.canvas.heightPx - 52;
  return Math.max(1, liveBottom - liveTop);
}

export function communicativeOccupancy(spec: FlyerDesignSpec): number {
  const bounds = communicativeContentBounds(spec);
  if (!bounds) return 0;
  return (bounds.bottom - bounds.top) / liveAreaHeight(spec);
}

export function trailingUnusedRatio(spec: FlyerDesignSpec): number {
  const bounds = communicativeContentBounds(spec);
  if (!bounds) return 1;
  const liveBottom = spec.canvas.heightPx - 52;
  return Math.max(0, liveBottom - bounds.bottom) / liveAreaHeight(spec);
}

export function zoneSpanRatio(spec: FlyerDesignSpec): number {
  return communicativeOccupancy(spec);
}

function pushFail(
  findings: DesignQualityFinding[],
  id: string,
  message: string,
): void {
  findings.push({
    id,
    severity: "fail",
    checkKind: "creative_quality",
    message,
  });
}

/**
 * Acceptance: does this composition make intentional, proportional use of its
 * format given the actual customer-supplied content?
 */
export function evaluateContentProportionalComposition(
  spec: FlyerDesignSpec,
  _truth: FlyerProjectTruth,
): DesignQualityFinding[] {
  const findings: DesignQualityFinding[] = [];
  const occupancy = communicativeOccupancy(spec);
  const trailing = trailingUnusedRatio(spec);
  const span = zoneSpanRatio(spec);
  if (trailing > MAX_TRAILING_UNUSED_RATIO) {
    pushFail(
      findings,
      "content_disproportionate_format",
      "The format is not used in proportion to the authorized customer content — leftover canvas is not justified by decorative or background geometry",
    );
  } else if (span < MIN_ZONE_SPAN_RATIO || occupancy < MIN_ZONE_SPAN_RATIO) {
    pushFail(
      findings,
      "content_disproportionate_format",
      "The composition does not make intentional use of its format given the supplied content — a small cluster on a large plate is not customer-presentable",
    );
  }
  return findings;
}
