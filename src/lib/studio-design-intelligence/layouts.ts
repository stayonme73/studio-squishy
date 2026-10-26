/**
 * Full-canvas layout families for customer Design jobs.
 * CERT / fixture jobs without creativeDirection keep the legacy centered plate.
 *
 * A solid field is atmosphere. Content must occupy top, middle, and lower dock.
 * Correction constraints must change the route — identical remints are a defect.
 */

import type { FlyerReasoningConstraints } from "@/config/studio-autonomous-production-loop-v1";
import { resolveFlyerFormat } from "@/lib/studio-design-renderer/flyer-content-proportional-composition";
import {
  composeCustomerOfferLine,
  offerNameWithoutRepeatedPrice,
  sameCustomerFacingMessage,
} from "@/lib/studio-design-renderer/flyer-creative-quality";
import type {
  FlyerDesignLayer,
  FlyerDesignSpec,
  FlyerProjectTruth,
  FlyerTextLayer,
} from "@/lib/studio-design-renderer/types";
import { FLYER_DESIGN_SPEC_VERSION } from "@/lib/studio-design-renderer/types";

import { FONT_STACKS, LAYOUT_ARCHETYPES } from "./library";
import type {
  DesignLayoutFamilyId,
  DesignTypeSystemId,
  FlyerCreativeDirection,
} from "./types";

function textLayer(
  partial: Omit<FlyerTextLayer, "type"> & { type?: "text" },
): FlyerTextLayer {
  return { type: "text", ...partial };
}

function textHeight(layer: FlyerTextLayer): number {
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

function facts(truth: FlyerProjectTruth) {
  const priceLine = truth.wasPriceDisplay
    ? `${truth.priceDisplay} (${truth.wasPriceDisplay})`
    : truth.priceDisplay;
  const usePrice = Boolean(truth.priceDisplay.trim());
  const offerLine = usePrice
    ? offerNameWithoutRepeatedPrice(truth.offerName)
    : composeCustomerOfferLine(truth.offerName, truth.priceDisplay);
  const hasCta = Boolean(truth.cta.trim());
  const headlineDistinct =
    Boolean(truth.headline.trim()) &&
    truth.headline.trim().toLowerCase() !== truth.offerName.trim().toLowerCase();
  const ctaIsHeadline =
    hasCta &&
    headlineDistinct &&
    sameCustomerFacingMessage(truth.headline, truth.cta);
  const hasHeadline = headlineDistinct && !ctaIsHeadline;
  const paintCta = hasCta;
  let body = truth.body.trim();
  if (paintCta && truth.cta.trim() && body.toLowerCase().includes(truth.cta.trim().toLowerCase())) {
    body = body
      .replace(new RegExp(`[.\\s]*${escapeRegExp(truth.cta.trim())}\\.?$`, "i"), "")
      .trim();
  }
  return {
    offerLine,
    priceLine,
    usePrice,
    hasDates:
      Boolean(truth.dateWindow.trim()) &&
      !sameCustomerFacingMessage(truth.dateWindow, truth.headline) &&
      !sameCustomerFacingMessage(truth.dateWindow, truth.offerName),
    hasBody: Boolean(body),
    body,
    hasHeadline,
    paintCta,
    logo: truth.materials.find((m) => m.role === "logo"),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function typeSystemFor(layout: DesignLayoutFamilyId): DesignTypeSystemId {
  if (layout === "bold_asymmetric") return "condensed_sans";
  if (layout === "service_rail") return "grotesque_sans";
  if (layout === "type_led_premium") return "tracked_display_serif";
  if (layout === "modular_thirds") return "editorial_serif";
  return "editorial_serif";
}

function directionForConstraints(
  direction: FlyerCreativeDirection,
  constraints?: FlyerReasoningConstraints,
): FlyerCreativeDirection {
  if (!constraints) return direction;
  const excluded = new Set(constraints.excludeLayoutFamilyIds ?? []);
  const current = direction.selectedRoute.layoutFamilyId;
  const shouldReroute =
    Boolean(constraints.tightenComposition) ||
    Boolean(constraints.preferAlternateLayoutFamily) ||
    excluded.has(current);
  if (!shouldReroute) return direction;
  const next =
    direction.candidateRoutes.find(
      (route) =>
        route.layoutFamilyId !== current && !excluded.has(route.layoutFamilyId),
    ) ??
    direction.candidateRoutes.find(
      (route) => !excluded.has(route.layoutFamilyId),
    );
  if (!next) {
    const fallbackId: DesignLayoutFamilyId =
      current === "modular_thirds" ? "editorial_split" : "modular_thirds";
    const archetype = LAYOUT_ARCHETYPES[fallbackId];
    return {
      ...direction,
      selectedRoute: {
        ...direction.selectedRoute,
        routeId: "route-correction",
        layoutFamilyId: fallbackId,
        typeSystemId: typeSystemFor(fallbackId),
        geometryId: archetype.geometryId,
        rationale: `${direction.selectedRoute.rationale} Correction reroute after composition failure.`,
      },
    };
  }
  if (next.routeId === direction.selectedRoute.routeId) return direction;
  return { ...direction, selectedRoute: next };
}

function finish(
  truth: FlyerProjectTruth,
  direction: FlyerCreativeDirection,
  layers: FlyerDesignLayer[],
  reasoningMode: FlyerDesignSpec["reasoningMode"],
  reasoningModel?: string,
): FlyerDesignSpec {
  const format = resolveFlyerFormat(truth).format;
  const resolved = truth.brandColors;
  return {
    specVersion: FLYER_DESIGN_SPEC_VERSION,
    skuId: truth.skuId,
    canvas: { widthPx: format.widthPx, heightPx: format.heightPx },
    background: { color: resolved.background },
    colors: { ...resolved },
    materials: [...truth.materials],
    outputFormats: ["png", "pdf"],
    reasoningMode,
    reasoningModel,
    creativeDirection: {
      intelligenceVersion: direction.intelligenceVersion,
      routeId: direction.selectedRoute.routeId,
      layoutFamilyId: direction.selectedRoute.layoutFamilyId,
      paletteFamilyId: direction.selectedRoute.paletteFamilyId,
      typeSystemId: direction.selectedRoute.typeSystemId,
      geometryId: direction.selectedRoute.geometryId,
    },
    layers,
  };
}

function zonesFor(H: number) {
  const footerY = Math.round(H * 0.74);
  return {
    topY: Math.round(H * 0.05),
    midY: Math.round(H * 0.30),
    footerY,
    footerH: H - footerY,
  };
}

function pushFooterCopy(input: {
  layers: FlyerDesignLayer[];
  truth: FlyerProjectTruth;
  f: ReturnType<typeof facts>;
  font: string;
  x: number;
  width: number;
  footerY: number;
  color: string;
  secondaryColor?: string;
}): void {
  const { layers, truth, f, font, x, width, footerY, color } = input;
  let y = footerY + 36;
  if (f.paintCta) {
    layers.push(
      textLayer({
        id: "cta",
        role: "cta",
        content: truth.cta,
        x,
        y,
        width,
        fontSizePx: 30,
        fontWeight: 700,
        lineHeight: 1.15,
        color,
        align: "left",
        fontStack: font,
        maxLines: 2,
      }),
    );
    y += 52;
  }
  if (truth.phone.trim()) {
    layers.push(
      textLayer({
        id: "phone",
        role: "contact_phone",
        content: truth.phone,
        x,
        y: y + 8,
        width: Math.min(420, Math.round(width * 0.48)),
        fontSizePx: 16,
        fontWeight: 500,
        lineHeight: 1.2,
        color: input.secondaryColor ?? color,
        align: "left",
        fontStack: font,
      }),
    );
  }
  if (truth.webDisplay.trim()) {
    layers.push(
      textLayer({
        id: "web",
        role: "contact_web",
        content: truth.webDisplay,
        x: truth.phone.trim() ? x + Math.min(440, Math.round(width * 0.5)) : x,
        y: y + 8,
        width: Math.min(460, Math.round(width * 0.48)),
        fontSizePx: 16,
        fontWeight: 500,
        lineHeight: 1.2,
        color: input.secondaryColor ?? color,
        align: "left",
        fontStack: font,
      }),
    );
  }
}

function pushMidOffer(input: {
  layers: FlyerDesignLayer[];
  truth: FlyerProjectTruth;
  f: ReturnType<typeof facts>;
  font: string;
  x: number;
  width: number;
  panelX: number;
  panelWidth: number;
  panelY: number;
  panelFill: string;
  headlineColor: string;
  offerColor: string;
  bodyColor: string;
  mutedColor: string;
  ruleFill: string;
}): number {
  const { layers, truth, f, font, x, width } = input;
  const items: FlyerTextLayer[] = [];
  let y = input.panelY + 24;
  if (f.hasHeadline) {
    items.push(
      textLayer({
        id: "headline",
        role: "headline",
        content: truth.headline,
        x,
        y,
        width,
        fontSizePx: 40,
        fontWeight: 600,
        lineHeight: 1.12,
        color: input.headlineColor,
        align: "left",
        fontStack: font,
        maxLines: 3,
      }),
    );
    y += textHeight(items[items.length - 1]!) + 22;
  }
  items.push(
    textLayer({
      id: "offer",
      role: "offer",
      content: f.offerLine,
      x,
      y,
      width,
      fontSizePx: 26,
      fontWeight: 600,
      lineHeight: 1.25,
      color: input.offerColor,
      align: "left",
      fontStack: font,
      maxLines: 3,
    }),
  );
  y += textHeight(items[items.length - 1]!) + 22;
  if (f.usePrice) {
    items.push(
      textLayer({
        id: "price",
        role: "price",
        content: f.priceLine,
        x,
        y,
        width,
        fontSizePx: 44,
        fontWeight: 700,
        lineHeight: 1,
        color: input.offerColor,
        align: "left",
        fontStack: font,
      }),
    );
    y += 56;
  }
  if (f.hasDates) {
    items.push(
      textLayer({
        id: "dates",
        role: "dates",
        content: truth.dateWindow,
        x,
        y,
        width,
        fontSizePx: 20,
        fontWeight: 500,
        lineHeight: 1.2,
        color: input.mutedColor,
        align: "left",
        fontStack: font,
      }),
    );
    y += 36;
  }
  if (f.hasBody) {
    items.push(
      textLayer({
        id: "body",
        role: "body",
        content: f.body,
        x,
        y,
        width,
        fontSizePx: 20,
        fontWeight: 400,
        lineHeight: 1.35,
        color: input.bodyColor,
        align: "left",
        fontStack: font,
        maxLines: 5,
      }),
    );
    y += textHeight(items[items.length - 1]!) + 12;
  }
  const lockupTop = items[0]!.y;
  const lockupBottom = items.reduce(
    (bottom, item) => Math.max(bottom, item.y + textHeight(item)),
    lockupTop,
  );
  const lockupH = Math.max(1, lockupBottom - lockupTop);
  const panelY = Math.max(input.panelY, lockupTop - 18);
  let panelHeight = lockupH + 36;
  if (panelHeight < 220) panelHeight = 220;
  if (panelHeight / lockupH > 1.75) {
    panelHeight = Math.max(220, Math.round(lockupH * 1.7));
  }
  layers.push({
    type: "shape",
    id: "offer-panel",
    role: "plate",
    x: input.panelX,
    y: panelY,
    width: input.panelWidth,
    height: panelHeight,
    fill: input.panelFill,
  });
  layers.push({
    type: "shape",
    id: "identity-rule",
    role: "footer_rule",
    x,
    y: panelY - 14,
    width: 140,
    height: 3,
    fill: input.ruleFill,
  });
  layers.push(...items);
  return panelY + panelHeight;
}

export function reasonIntelligentFlyerLayout(
  truth: FlyerProjectTruth,
  direction: FlyerCreativeDirection,
  constraints?: FlyerReasoningConstraints,
): FlyerDesignSpec {
  const resolved = directionForConstraints(direction, constraints);
  const family = resolved.selectedRoute.layoutFamilyId;
  if (family === "bold_asymmetric") return layoutBoldAsymmetric(truth, resolved);
  if (family === "type_led_premium") return layoutTypeLed(truth, resolved);
  if (family === "service_rail") return layoutServiceRail(truth, resolved);
  if (family === "modular_thirds") return layoutModularThirds(truth, resolved);
  return layoutEditorialSplit(truth, resolved);
}

function layoutTypeLed(
  truth: FlyerProjectTruth,
  direction: FlyerCreativeDirection,
): FlyerDesignSpec {
  const format = resolveFlyerFormat(truth).format;
  const W = format.widthPx;
  const H = format.heightPx;
  const c = truth.brandColors;
  const f = facts(truth);
  const font = FONT_STACKS[direction.selectedRoute.typeSystemId];
  const z = zonesFor(H);
  const layers: FlyerDesignLayer[] = [
    {
      type: "shape",
      id: "field-bleed",
      role: "plate",
      x: 0,
      y: 0,
      width: W,
      height: H,
      fill: c.primary,
    },
    {
      type: "shape",
      id: "mid-band",
      role: "plate",
      x: 0,
      y: z.midY,
      width: W,
      height: z.footerY - z.midY,
      fill: c.background,
    },
    {
      type: "shape",
      id: "footer-band",
      role: "accent_bar",
      x: 0,
      y: z.footerY,
      width: W,
      height: z.footerH,
      fill: c.secondary,
    },
  ];
  if (f.logo) {
    layers.push({
      type: "image",
      id: "logo",
      role: "logo",
      materialId: f.logo.materialId,
      x: 64,
      y: z.topY,
      width: 88,
      height: 88,
      fit: "contain",
    });
  }
  layers.push(
    textLayer({
      id: "wordmark",
      role: "wordmark",
      content: truth.wordmark,
      x: 64,
      y: f.logo ? z.topY + 104 : z.topY,
      width: W - 128,
      fontSizePx: 72,
      fontWeight: 700,
      lineHeight: 1.02,
      letterSpacingPx: 6,
      color: c.background,
      align: "left",
      fontStack: font,
      maxLines: 3,
    }),
  );
  layers.push({
    type: "shape",
    id: "visual-anchor",
    role: "accent_bar",
    x: 64,
    y: z.midY - 28,
    width: 180,
    height: 10,
    fill: c.secondary,
  });
  pushMidOffer({
    layers,
    truth,
    f,
    font,
    x: 64,
    width: W - 128,
    panelX: 0,
    panelWidth: W,
    panelY: z.midY,
    panelFill: c.background,
    headlineColor: c.primary,
    offerColor: c.primary,
    bodyColor: c.text,
    mutedColor: c.muted,
    ruleFill: c.secondary,
  });
  pushFooterCopy({
    layers,
    truth,
    f,
    font,
    x: 64,
    width: W - 128,
    footerY: z.footerY,
    color: c.primary,
  });
  return finish(truth, direction, layers, "deterministic_constrained");
}

function layoutEditorialSplit(
  truth: FlyerProjectTruth,
  direction: FlyerCreativeDirection,
): FlyerDesignSpec {
  const format = resolveFlyerFormat(truth).format;
  const W = format.widthPx;
  const H = format.heightPx;
  const c = truth.brandColors;
  const f = facts(truth);
  const font = FONT_STACKS[direction.selectedRoute.typeSystemId];
  const z = zonesFor(H);
  const splitX = Math.round(W * 0.58);
  const leftX = 48;
  const leftW = splitX - 96;
  const layers: FlyerDesignLayer[] = [
    {
      type: "shape",
      id: "paper-mat",
      role: "plate",
      x: 0,
      y: 0,
      width: splitX,
      height: H,
      fill: c.background,
    },
    {
      type: "shape",
      id: "split-field",
      role: "plate",
      x: splitX,
      y: 0,
      width: W - splitX,
      height: H,
      fill: c.primary,
    },
    {
      type: "shape",
      id: "visual-anchor",
      role: "accent_bar",
      x: splitX + 36,
      y: Math.round(H * 0.58),
      width: W - splitX - 72,
      height: 160,
      fill: c.secondary,
    },
    {
      type: "shape",
      id: "footer-band",
      role: "accent_bar",
      x: 0,
      y: z.footerY,
      width: W,
      height: z.footerH,
      fill: c.primary,
    },
  ];
  if (f.logo) {
    layers.push({
      type: "image",
      id: "logo",
      role: "logo",
      materialId: f.logo.materialId,
      x: leftX,
      y: z.topY,
      width: 88,
      height: 88,
      fit: "contain",
    });
  }
  layers.push(
    textLayer({
      id: "wordmark",
      role: "wordmark",
      content: truth.wordmark,
      x: leftX,
      y: f.logo ? z.topY + 104 : z.topY,
      width: leftW,
      fontSizePx: 36,
      fontWeight: 700,
      lineHeight: 1.08,
      letterSpacingPx: 3,
      color: c.primary,
      align: "left",
      fontStack: font,
      maxLines: 3,
    }),
  );
  layers.push(
    textLayer({
      id: "field-mark",
      role: "eyebrow",
      content: truth.wordmark.slice(0, 1).toUpperCase(),
      x: splitX + 36,
      y: z.topY,
      width: W - splitX - 72,
      fontSizePx: 180,
      fontWeight: 700,
      lineHeight: 0.9,
      color: c.background,
      align: "left",
      fontStack: font,
      maxLines: 1,
    }),
  );
  pushMidOffer({
    layers,
    truth,
    f,
    font,
    x: leftX,
    width: leftW,
    panelX: leftX - 8,
    panelWidth: leftW + 16,
    panelY: z.midY,
    panelFill: c.background,
    headlineColor: c.primary,
    offerColor: c.text,
    bodyColor: c.text,
    mutedColor: c.muted,
    ruleFill: c.secondary,
  });
  pushFooterCopy({
    layers,
    truth,
    f,
    font,
    x: 48,
    width: W - 96,
    footerY: z.footerY,
    color: c.background,
  });
  return finish(truth, direction, layers, "deterministic_constrained");
}

function layoutBoldAsymmetric(
  truth: FlyerProjectTruth,
  direction: FlyerCreativeDirection,
): FlyerDesignSpec {
  const format = resolveFlyerFormat(truth).format;
  const W = format.widthPx;
  const H = format.heightPx;
  const c = truth.brandColors;
  const f = facts(truth);
  const font = FONT_STACKS[direction.selectedRoute.typeSystemId];
  const z = zonesFor(H);
  const slabW = Math.round(W * 0.34);
  const layers: FlyerDesignLayer[] = [
    {
      type: "shape",
      id: "paper-mat",
      role: "plate",
      x: 0,
      y: 0,
      width: W,
      height: H,
      fill: c.background,
    },
    {
      type: "shape",
      id: "hero-slab",
      role: "plate",
      x: 0,
      y: 0,
      width: slabW,
      height: H,
      fill: c.primary,
    },
    {
      type: "shape",
      id: "cta-bar",
      role: "accent_bar",
      x: 0,
      y: z.footerY,
      width: W,
      height: 8,
      fill: c.secondary,
    },
    {
      type: "shape",
      id: "footer-band",
      role: "accent_bar",
      x: 0,
      y: z.footerY,
      width: W,
      height: z.footerH,
      fill: c.primary,
    },
  ];
  if (f.logo) {
    layers.push({
      type: "image",
      id: "logo",
      role: "logo",
      materialId: f.logo.materialId,
      x: 32,
      y: z.topY,
      width: 72,
      height: 88,
      fit: "contain",
    });
  }
  layers.push(
    textLayer({
      id: "wordmark",
      role: "wordmark",
      content: truth.wordmark,
      x: 32,
      y: f.logo ? z.topY + 108 : z.topY,
      width: slabW - 56,
      fontSizePx: 34,
      fontWeight: 700,
      lineHeight: 1.1,
      color: c.background,
      align: "left",
      fontStack: font,
      maxLines: 4,
    }),
  );
  const rightX = slabW + 48;
  const rightW = W - rightX - 48;
  pushMidOffer({
    layers,
    truth,
    f,
    font,
    x: rightX,
    width: rightW,
    panelX: rightX - 8,
    panelWidth: rightW + 16,
    panelY: z.midY,
    panelFill: c.background,
    headlineColor: c.primary,
    offerColor: c.text,
    bodyColor: c.text,
    mutedColor: c.muted,
    ruleFill: c.secondary,
  });
  pushFooterCopy({
    layers,
    truth,
    f,
    font,
    x: 32,
    width: W - 64,
    footerY: z.footerY,
    color: c.background,
  });
  return finish(truth, direction, layers, "deterministic_constrained");
}

function layoutServiceRail(
  truth: FlyerProjectTruth,
  direction: FlyerCreativeDirection,
): FlyerDesignSpec {
  const format = resolveFlyerFormat(truth).format;
  const W = format.widthPx;
  const H = format.heightPx;
  const c = truth.brandColors;
  const f = facts(truth);
  const font = FONT_STACKS[direction.selectedRoute.typeSystemId];
  const z = zonesFor(H);
  const rail = 88;
  const x = rail + 48;
  const contentW = W - x - 56;
  const layers: FlyerDesignLayer[] = [
    {
      type: "shape",
      id: "service-rail",
      role: "accent_bar",
      x: 0,
      y: 0,
      width: rail,
      height: H,
      fill: c.primary,
    },
    {
      type: "shape",
      id: "paper-mat",
      role: "plate",
      x: rail,
      y: 0,
      width: W - rail,
      height: H,
      fill: c.background,
    },
    {
      type: "shape",
      id: "tick-square",
      role: "logo_plate",
      x: 28,
      y: 48,
      width: 32,
      height: 32,
      fill: c.secondary,
    },
    {
      type: "shape",
      id: "footer-band",
      role: "accent_bar",
      x: rail,
      y: z.footerY,
      width: W - rail,
      height: z.footerH,
      fill: c.primary,
    },
  ];
  if (f.logo) {
    layers.push({
      type: "image",
      id: "logo",
      role: "logo",
      materialId: f.logo.materialId,
      x,
      y: z.topY,
      width: 88,
      height: 88,
      fit: "contain",
    });
  }
  layers.push(
    textLayer({
      id: "wordmark",
      role: "wordmark",
      content: truth.wordmark,
      x,
      y: f.logo ? z.topY + 104 : z.topY,
      width: contentW,
      fontSizePx: 42,
      fontWeight: 700,
      lineHeight: 1.08,
      color: c.primary,
      align: "left",
      fontStack: font,
      maxLines: 2,
    }),
  );
  pushMidOffer({
    layers,
    truth,
    f,
    font,
    x,
    width: contentW,
    panelX: x - 8,
    panelWidth: contentW + 16,
    panelY: z.midY,
    panelFill: c.background,
    headlineColor: c.primary,
    offerColor: c.text,
    bodyColor: c.text,
    mutedColor: c.muted,
    ruleFill: c.secondary,
  });
  pushFooterCopy({
    layers,
    truth,
    f,
    font,
    x,
    width: contentW,
    footerY: z.footerY,
    color: c.background,
  });
  return finish(truth, direction, layers, "deterministic_constrained");
}

function layoutModularThirds(
  truth: FlyerProjectTruth,
  direction: FlyerCreativeDirection,
): FlyerDesignSpec {
  const format = resolveFlyerFormat(truth).format;
  const W = format.widthPx;
  const H = format.heightPx;
  const c = truth.brandColors;
  const f = facts(truth);
  const font = FONT_STACKS[direction.selectedRoute.typeSystemId];
  const topH = Math.round(H / 3);
  const midH = Math.round(H / 3);
  const layers: FlyerDesignLayer[] = [
    {
      type: "shape",
      id: "paper-mat",
      role: "plate",
      x: 0,
      y: 0,
      width: W,
      height: topH,
      fill: c.background,
    },
    {
      type: "shape",
      id: "mid-band",
      role: "plate",
      x: 0,
      y: topH,
      width: W,
      height: midH,
      fill: c.primary,
    },
    {
      type: "shape",
      id: "footer-band",
      role: "accent_bar",
      x: 0,
      y: topH + midH,
      width: W,
      height: H - topH - midH,
      fill: c.secondary,
    },
  ];
  layers.push(
    textLayer({
      id: "wordmark",
      role: "wordmark",
      content: truth.wordmark,
      x: 56,
      y: Math.round(topH * 0.18),
      width: W - 112,
      fontSizePx: 52,
      fontWeight: 700,
      lineHeight: 1.08,
      color: c.primary,
      align: "left",
      fontStack: font,
      maxLines: 3,
    }),
  );
  pushMidOffer({
    layers,
    truth,
    f,
    font,
    x: 56,
    width: W - 112,
    panelX: 40,
    panelWidth: W - 80,
    panelY: topH + 24,
    panelFill: c.primary,
    headlineColor: c.background,
    offerColor: c.background,
    bodyColor: c.background,
    mutedColor: c.secondary,
    ruleFill: c.secondary,
  });
  pushFooterCopy({
    layers,
    truth,
    f,
    font,
    x: 56,
    width: W - 112,
    footerY: topH + midH,
    color: c.primary,
  });
  return finish(truth, direction, layers, "deterministic_constrained");
}
