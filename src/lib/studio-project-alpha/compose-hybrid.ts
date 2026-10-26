/**
 * Compose generated visual under renderer-owned exact text.
 * Image generation owns atmosphere. The renderer owns names, prices, phones, URLs, and CTAs.
 */

import { hybridLockupPlanFor } from "@/lib/studio-design-intelligence/hybrid-layout-signatures";
import type { DesignLayoutFamilyId } from "@/lib/studio-design-intelligence/types";
import { sameCustomerFacingMessage } from "@/lib/studio-design-renderer/flyer-creative-quality";
import type {
  FlyerDesignLayer,
  FlyerDesignSpec,
  FlyerTextLayer,
  FlyerTextRole,
} from "@/lib/studio-design-renderer/types";
import type { HybridImageResult } from "./hybrid-image";

const STRIP_IDS = new Set([
  "field-bleed",
  "paper-mat",
  "split-field",
  "mid-band",
  "hero-slab",
  "service-rail",
  "footer-band",
  "visual-anchor",
  "tick-square",
  "plate-top",
  "plate-bottom",
  "cta-bar",
  "field-mark",
  "offer-panel",
  "identity-rule",
  "offer-panel-rule",
  "frame-top",
  "frame-bottom",
  "frame-left",
  "frame-right",
]);

function isDark(hex: string): boolean {
  const n = Number.parseInt(hex.slice(1), 16);
  if (!Number.isFinite(n)) return true;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 < 150;
}

/**
 * Rendered height of a text layer, estimated from font size, line height, and
 * wrap. Exported so composition checks measure the same geometry the composer
 * laid out — two estimators would drift and the checks would grade a layout
 * nobody rendered.
 */
export function estimateTextLayerHeight(layer: FlyerTextLayer): number {
  const maxLines = layer.maxLines ?? 2;
  const explicit = Math.max(1, layer.content.split(/\n/).length);
  const approxChars = Math.max(
    14,
    Math.floor(layer.width / Math.max(10, layer.fontSizePx * 0.58)),
  );
  const wrapped = Math.max(
    1,
    Math.ceil(layer.content.replace(/\n/g, "").length / approxChars),
  );
  const lines = Math.min(maxLines, Math.max(explicit, wrapped));
  return Math.round(layer.fontSizePx * layer.lineHeight * lines);
}

const textHeight = estimateTextLayerHeight;

function byRole(
  layers: readonly FlyerTextLayer[],
  role: FlyerTextRole,
): FlyerTextLayer | undefined {
  return layers.find((layer) => layer.role === role && layer.id !== "field-mark");
}

function significantTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3);
}

function headlineRepeatsOffer(headline: string, offer: string): boolean {
  if (sameCustomerFacingMessage(headline, offer)) return true;
  const left = significantTokens(headline);
  const right = new Set(significantTokens(offer));
  if (left.length === 0 || right.size === 0) return false;
  const overlap = left.filter((token) => right.has(token)).length;
  return overlap >= 2 || overlap / Math.min(left.length, right.size) >= 0.5;
}

export function composeHybridSpec(
  spec: FlyerDesignSpec,
  visual: HybridImageResult,
): FlyerDesignSpec {
  const W = spec.canvas.widthPx;
  const H = spec.canvas.heightPx;
  // The route's layout family decides the composition. Without a creative
  // direction (CERT fixtures, legacy proofs) the centred plate stays the shape.
  const plan = hybridLockupPlanFor(
    spec.creativeDirection?.layoutFamilyId as DesignLayoutFamilyId | undefined,
    W,
    H,
  );
  const dockFill = isDark(spec.colors.primary) ? spec.colors.primary : "#161412";
  const ink = isDark(dockFill) ? "#F6F1E8" : spec.colors.text;
  const muted = isDark(dockFill) ? "#D9D0C4" : spec.colors.muted;
  const inset = plan.plateX + plan.insetPx;
  const width = plan.plateWidth - plan.insetPx * 2;
  const originals = spec.layers.filter(
    (layer): layer is FlyerTextLayer => layer.type === "text",
  );
  const wordmark = byRole(originals, "wordmark");
  const offer = byRole(originals, "offer");
  let headline = byRole(originals, "headline");
  if (headline && offer && headlineRepeatsOffer(headline.content, offer.content)) {
    headline = undefined;
  }
  const price = byRole(originals, "price");
  let body = byRole(originals, "body");
  if (
    body &&
    ((offer && sameCustomerFacingMessage(body.content, offer.content)) ||
      (headline && sameCustomerFacingMessage(body.content, headline.content)))
  ) {
    body = undefined;
  }
  const cta = byRole(originals, "cta");
  const phone = byRole(originals, "contact_phone");
  const web = byRole(originals, "contact_web");
  const dates = byRole(originals, "dates");
  const font = wordmark?.fontStack ?? offer?.fontStack;

  // Lay the lockup out from zero, measure it, then move the whole block to where
  // the family's plan puts it. Anchoring to the bottom edge is impossible until
  // the lockup's height is known.
  let cursor = 0;
  const items: FlyerTextLayer[] = [];
  const place = (
    source: FlyerTextLayer,
    opts: { fontSizePx: number; fontWeight: FlyerTextLayer["fontWeight"]; color?: string; maxLines?: number },
  ) => {
    const layer: FlyerTextLayer = {
      ...source,
      x: inset,
      y: cursor,
      width,
      fontSizePx: opts.fontSizePx,
      fontWeight: opts.fontWeight,
      lineHeight: source.lineHeight || 1.15,
      color: opts.color ?? ink,
      align: plan.align,
      fontStack: font ?? source.fontStack,
      maxLines: opts.maxLines ?? source.maxLines,
    };
    items.push(layer);
    cursor += textHeight(layer) + plan.blockGapPx;
  };

  if (wordmark) {
    place(wordmark, { fontSizePx: plan.scale.wordmarkPx, fontWeight: 700, maxLines: 2 });
  }
  if (headline) {
    place(headline, { fontSizePx: plan.scale.headlinePx, fontWeight: 600, maxLines: 3 });
  }
  if (offer) {
    place(offer, { fontSizePx: plan.scale.offerPx, fontWeight: 600, maxLines: 3 });
  }
  if (price) {
    place(price, { fontSizePx: plan.scale.pricePx, fontWeight: 700, maxLines: 1 });
  }
  if (dates) {
    place(dates, { fontSizePx: plan.scale.datesPx, fontWeight: 500, color: muted, maxLines: 2 });
  }
  if (body) {
    place(body, { fontSizePx: plan.scale.bodyPx, fontWeight: 400, color: muted, maxLines: 4 });
  }
  if (cta) {
    place(cta, { fontSizePx: plan.scale.ctaPx, fontWeight: 700, maxLines: 2 });
  }
  const contactY = cursor;
  const contactWidth = Math.min(
    Math.round(width * 0.48),
    Math.max(180, Math.round(width * 0.48)),
  );
  if (phone) {
    items.push({
      ...phone,
      x: inset,
      y: contactY,
      width: contactWidth,
      fontSizePx: plan.scale.contactPx,
      fontWeight: 500,
      color: muted,
      align: plan.align,
      fontStack: font ?? phone.fontStack,
    });
  }
  if (web) {
    items.push({
      ...web,
      x: phone ? inset + Math.round(width * 0.5) : inset,
      y: contactY,
      width: contactWidth,
      fontSizePx: plan.scale.contactPx,
      fontWeight: 500,
      color: muted,
      align: plan.align,
      fontStack: font ?? web.fontStack,
    });
  }

  // The dock must back the whole lockup, contact row included. Sizing it from
  // the headline/offer/price/CTA block alone left the phone and web address
  // hanging just below the panel, sitting on raw generated photography.
  const measuredHeight = items.reduce(
    (bottom, layer) => Math.max(bottom, layer.y + textHeight(layer)),
    0,
  );
  let panelHeight = Math.min(H, measuredHeight + plan.paddingPx * 2);
  let panelY: number;
  if (plan.anchor === "bottom_edge" || plan.anchor === "lower") {
    panelY = H - plan.bottomMarginPx - panelHeight;
  } else {
    panelY = plan.plateTopPx;
  }
  if (panelY < 0) panelY = 0;
  if (panelY + panelHeight > H) panelHeight = H - panelY;
  const lockupTop = panelY + plan.paddingPx;
  for (const item of items) {
    item.y += lockupTop;
  }

  const hero = {
    type: "image" as const,
    id: "generated-hero",
    role: "hero" as const,
    materialId: "hybrid-generated-visual",
    x: 0,
    y: 0,
    width: W,
    height: H,
    fit: "cover" as const,
  };
  const kept = spec.layers.filter(
    (layer) =>
      !STRIP_IDS.has(layer.id) &&
      layer.type !== "text" &&
      !(layer.type === "shape" && layer.role === "plate"),
  );
  const layers: FlyerDesignLayer[] = [
    hero,
    ...(plan.rail
      ? [
          {
            type: "shape" as const,
            id: "service-rail",
            role: "accent_bar" as const,
            x: plan.rail.x,
            y: plan.rail.y,
            width: plan.rail.width,
            height: plan.rail.height,
            fill: spec.colors.primary,
          },
        ]
      : []),
    {
      type: "shape",
      id: "offer-panel",
      role: "plate",
      x: plan.plateX,
      y: panelY,
      width: plan.plateWidth,
      height: panelHeight,
      fill: dockFill,
    },
    {
      type: "shape",
      id: "identity-rule",
      role: "footer_rule",
      x: inset,
      y: Math.max(0, panelY - 12),
      width: 140,
      height: 3,
      fill: spec.colors.secondary,
    },
    ...items,
    ...kept,
  ];
  const materials = [
    {
      materialId: "hybrid-generated-visual",
      role: "hero" as const,
      relativePath: visual.relativePath,
      contentSha256: visual.contentSha256,
    },
    ...spec.materials.filter((material) => material.materialId !== "hybrid-generated-visual"),
  ];
  return { ...spec, materials, layers };
}

export function hybridSpecOwnsExactFacts(
  spec: FlyerDesignSpec,
  facts: readonly string[],
): boolean {
  const text = spec.layers
    .filter((layer) => layer.type === "text")
    .map((layer) => layer.content)
    .join("\n")
    .toLowerCase();
  return facts
    .map((fact) => fact.trim())
    .filter((fact) => fact.length >= 4)
    .every((fact) => text.includes(fact.toLowerCase().slice(0, 12)));
}
