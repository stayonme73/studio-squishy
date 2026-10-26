/**
 * Second layout family on the Stage 0 composition path: modular thirds.
 *
 * Maya's flyer is a dark editorial poster. This one is a bright, airy sheet on
 * warm paper. They share the document contract, the fact-binding rules, the
 * validator, and the renderer seat — and nothing else. That is the point: if the
 * contract only ever produced one look, "richer composition" would be a label.
 *
 * The archetype is not invented here. `modular_thirds` is an existing Design
 * Intelligence layout family — "explicit top identity, mid offer, lower CTA dock"
 * (`LAYOUT_ARCHETYPES` in `@/lib/studio-design-intelligence/library`) — and this
 * composition follows that structure rather than borrowing its name.
 *
 * Geometry is derived from the logical width, so the same composition materialises
 * on any sheet proportion without a second layout being written.
 */

import { studioStaticDesignCompositionV1 as cfg } from "@/config/studio-static-design-composition-v1";
import type { DesignPalette } from "@/lib/studio-design-intelligence/types";
import type { FlyerProjectTruth } from "@/lib/studio-design-renderer/types";

import { loadHouseFonts } from "./fonts";
import { applyPresentationCase } from "./presentation-case";
import type {
  StudioDesignDocument,
  StudioDesignElement,
  StudioImageElement,
} from "./types";

const HOUSE = cfg.fonts.houseSerifFamily;

/**
 * The measure this composition's type sizes were set against — the text column of
 * the 8.5in sheet. Type scales with the measure, not just the boxes.
 *
 * Learned the hard way: the first version derived every box from the logical width
 * but left the type sizes fixed, so on a narrower sheet the headline wrapped onto
 * three lines and the price broke away from its own offer line. Geometry that
 * flexes while type does not is not flexible geometry.
 */
const REFERENCE_TEXT_COLUMN_PX = 1011;

/**
 * Soft bottom fade, authored as a data URI so the mask travels inside the
 * document. Polotno reads the same string as `clipSrc`. This is what lets the
 * photograph dissolve into the paper instead of ending on a hard rectangle edge.
 */
const BOTTOM_FADE_MASK = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
    '<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#fff" stop-opacity="1"/>' +
    '<stop offset="0.7" stop-color="#fff" stop-opacity="1"/>' +
    '<stop offset="1" stop-color="#fff" stop-opacity="0"/>' +
    '</linearGradient></defs><rect width="100" height="100" fill="url(#f)"/></svg>',
)}`;

export type ModularThirdsCompositionInput = {
  repoRoot: string;
  truth: FlyerProjectTruth;
  /** The sunlit interior band. Must be larger than its box at output resolution. */
  heroMaterialId: string;
  /** The natural-texture inset. A second, independent crop on a second source. */
  textureMaterialId: string;
  palette: DesignPalette;
  /** Authoring space. Width drives the geometry; height stays the graded 1536. */
  logical?: { widthPx: number; heightPx: number };
  /**
   * Attaches a recorded crop-headroom exemption to the hero band. Only for a
   * controlled proof where the shortfall is a provider ceiling; the exemption is
   * reported on every validation result rather than forgiven.
   */
  heroPrintResolutionException?: StudioImageElement["printResolutionException"];
  composedAt?: string;
};

function trimmed(value: string | undefined | null): string {
  return String(value ?? "").trim();
}

/**
 * Vertical rhythm, in logical units on the graded 1536 plate. Horizontal geometry
 * is a fraction of the width so an 8.5in and a 7.33in sheet both compose.
 */
const ROW = {
  wordmark: 92,
  hairline: 158,
  band: { y: 196, height: 596 },
  headline: 836,
  body: 1064,
  panel: { y: 1196, height: 252 },
  offerName: 1228,
  offerDetail: 1292,
  cta: 1358,
  ctaRule: 1414,
  contactPhone: 1230,
  contactWeb: 1284,
  serviceArea: 1344,
} as const;

/**
 * Room a run of lines needs: the leading the composition asked for, times the
 * lines it declared, plus a little slack for rounding.
 *
 * Measured in Chromium before settling on this, because an earlier version of this
 * function sized boxes against the face's ascent-plus-descent metric box instead.
 * That box is ~1.38em for Source Serif 4 at every size, and does not shrink when
 * `line-height` is tightened — it is metric whitespace, not ink. Reserving it
 * inflated every box by a third and forced the rows apart to no visual purpose.
 * Leading is what positions the lines, so leading is what gets reserved.
 */
function reservedHeight(
  fontSize: number,
  lineHeight: number,
  lines: number,
  slackPx = 6,
): number {
  return Math.ceil(fontSize * lineHeight * lines + slackPx);
}

/**
 * Horizontal geometry, derived from the sheet width alone.
 *
 * Extracted so the composition and the image-generation spend gate read the same
 * boxes. A gate that retypes the numbers is a gate that eventually grades a box
 * the composer no longer uses.
 */
export function modularThirdsGeometry(width: number) {
  const margin = Math.round(width * 0.074);
  const column = width - margin * 2;
  const dockGutter = Math.round(column * 0.04);
  const contactWidth = Math.round(column * 0.31);
  const contactX = margin + column - dockGutter - contactWidth;
  const insetWidth = Math.round(column * 0.3);
  return {
    margin,
    column,
    typeColumnWidth: Math.round(column * 0.65),
    insetWidth,
    insetX: margin + column - insetWidth,
    dockGutter,
    dockLeftWidth: Math.round(column * 0.5),
    contactWidth,
    contactX,
    /**
     * The offer detail is the longest line in the dock. It gets the full run up to
     * the contact column rather than the offer name's measure, because breaking
     * "session — $225" across two lines orphans the price over the call to action.
     */
    offerDetailWidth: contactX - (margin + dockGutter) - Math.round(column * 0.03),
  };
}

/** The boxes on this sheet that a generated visual has to fill. */
export function modularThirdsImageBoxes(logicalWidth: number): {
  hero: { elementId: string; x: number; y: number; width: number; height: number };
  textureInset: { elementId: string; x: number; y: number; width: number; height: number };
} {
  const geometry = modularThirdsGeometry(logicalWidth);
  return {
    hero: {
      elementId: "generated-hero",
      x: 0,
      y: ROW.band.y,
      width: logicalWidth,
      height: ROW.band.height,
    },
    textureInset: {
      elementId: "texture-inset",
      x: geometry.insetX,
      y: ROW.headline,
      width: geometry.insetWidth,
      height: geometry.insetWidth,
    },
  };
}

/**
 * Compose the sheet. Deterministic: same truth and palette in, identical document
 * out, including the resolved fact bindings.
 */
export function composeModularThirdsFlyer(
  input: ModularThirdsCompositionInput,
): StudioDesignDocument {
  const { truth, palette } = input;
  const logical = input.logical ?? cfg.logicalSpace;
  const fonts = loadHouseFonts(input.repoRoot);

  const width = logical.widthPx;
  const {
    margin,
    column,
    typeColumnWidth,
    insetWidth,
    insetX,
    dockGutter,
    dockLeftWidth,
    contactWidth,
    contactX,
    offerDetailWidth,
  } = modularThirdsGeometry(width);

  /**
   * Type scale, tied to the measure. Rounded down so a narrower sheet always ends
   * up with marginally more room per glyph than the reference, never less. At the
   * reference width this is the identity, so the reference sheet is unchanged.
   */
  const measureScale = column / REFERENCE_TEXT_COLUMN_PX;
  const type = (px: number) => Math.max(1, Math.floor(px * measureScale));
  const track = (px: number) => Number((px * measureScale).toFixed(2));

  /** Ivory paper reads as light; the sage dock reads as dark. Ink follows. */
  const inkOnPaper = palette.text;
  const inkOnDock = palette.background;
  const accent = palette.primary;
  const gold = palette.secondary;

  const elements: StudioDesignElement[] = [];

  // 1 — top identity. Tracked, small, on the paper. Not a plate.
  elements.push({
    type: "text",
    id: "wordmark",
    role: "wordmark",
    factId: "businessName",
    text: applyPresentationCase(
      trimmed(truth.wordmark) || trimmed(truth.businessName),
      "upper",
    ),
    presentationCase: "upper",
    fontFamily: HOUSE,
    fontSize: type(30),
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: track(4.2),
    align: "left",
    fill: accent,
    maxLines: 1,
    x: margin,
    y: ROW.wordmark,
    width: column,
    height: reservedHeight(type(30), 1.2, 1),
  });

  elements.push({
    type: "figure",
    id: "wordmark-hairline",
    role: "accent_bar",
    subType: "rect",
    // Real alpha on a hairline: it reads as a pressed rule rather than a bar.
    fill: "rgba(63,90,74,0.42)",
    effectiveHex: "#A2B0A6",
    requiresContent: false,
    decorativePurpose:
      "Hairline closing the identity line. Carries no fact; separates identity from the visual band.",
    x: margin,
    y: ROW.hairline,
    width: column,
    height: 3,
  });

  // 2 — the visual band, full width, faded into the paper at its lower edge so
  // image and type share the sheet instead of the type sitting on a plate over
  // the art. The customer asked for exactly that and the obstruction gate
  // measures whether it happened.
  elements.push({
    type: "image",
    id: "generated-hero",
    role: "hero",
    materialId: input.heroMaterialId,
    fit: "cover",
    focal: { x: 0.5, y: 0.44 },
    clipSrc: BOTTOM_FADE_MASK,
    x: 0,
    y: ROW.band.y,
    width,
    height: ROW.band.height,
    ...(input.heroPrintResolutionException
      ? { printResolutionException: input.heroPrintResolutionException }
      : {}),
  });

  // 3 — mid: the supplied headline and body on open paper
  elements.push({
    type: "text",
    id: "headline",
    role: "headline",
    factId: "headline",
    text: trimmed(truth.headline),
    fontFamily: HOUSE,
    fontSize: type(84),
    fontWeight: 700,
    lineHeight: 1.05,
    letterSpacing: track(-1.5),
    align: "left",
    fill: inkOnPaper,
    maxLines: 2,
    x: margin,
    y: ROW.headline,
    width: typeColumnWidth,
    height: reservedHeight(type(84), 1.05, 2),
  });

  elements.push({
    type: "text",
    id: "body",
    role: "body",
    factId: "body",
    text: trimmed(truth.body),
    fontFamily: HOUSE,
    fontSize: type(27),
    fontWeight: 400,
    lineHeight: 1.46,
    align: "left",
    fill: inkOnPaper,
    maxLines: 3,
    x: margin,
    y: ROW.body,
    width: Math.round(column * 0.62),
    height: reservedHeight(type(27), 1.46, 3),
  });

  // 4 — natural-texture inset: a second independent crop, on a second source,
  // clipped to a soft-cornered square. Balances the type column.
  elements.push({
    type: "image",
    id: "texture-inset",
    role: "hero",
    materialId: input.textureMaterialId,
    fit: "cover",
    focal: { x: 0.62, y: 0.38 },
    cornerRadius: 8,
    x: insetX,
    y: ROW.headline,
    width: insetWidth,
    height: insetWidth,
  });

  // 5 — the lower dock. Declared as a container that must carry content, which is
  // what makes the hollow-panel defect unreachable rather than merely absent.
  elements.push({
    type: "figure",
    id: "offer-panel",
    role: "plate",
    subType: "rect",
    fill: "rgba(63,90,74,0.94)",
    effectiveHex: "#41594B",
    cornerRadius: 10,
    requiresContent: true,
    x: margin,
    y: ROW.panel.y,
    width: column,
    height: ROW.panel.height,
  });

  elements.push({
    type: "text",
    id: "offer-name",
    role: "offer",
    factId: "offerName",
    text: trimmed(truth.offerName),
    fontFamily: HOUSE,
    fontSize: type(44),
    fontWeight: 700,
    lineHeight: 1.2,
    align: "left",
    fill: inkOnDock,
    maxLines: 1,
    x: margin + dockGutter,
    y: ROW.offerName,
    width: dockLeftWidth,
    height: reservedHeight(type(44), 1.2, 1),
  });

  /**
   * The offer detail line as the customer wrote it, price included. Splitting it
   * to give the price its own display would drop the em dash and print "$225"
   * twice, and the brief says do neither.
   */
  elements.push({
    type: "text",
    id: "offer-detail",
    role: "price",
    factId: "descriptor",
    text: trimmed(truth.descriptor),
    fontFamily: HOUSE,
    fontSize: type(30),
    fontWeight: 400,
    lineHeight: 1.25,
    align: "left",
    fill: inkOnDock,
    maxLines: 1,
    x: margin + dockGutter,
    y: ROW.offerDetail,
    width: offerDetailWidth,
    height: reservedHeight(type(30), 1.25, 1),
  });

  elements.push({
    type: "text",
    id: "cta",
    role: "cta",
    factId: "cta",
    text: trimmed(truth.cta),
    fontFamily: HOUSE,
    fontSize: type(38),
    fontWeight: 600,
    lineHeight: 1.2,
    align: "left",
    fill: inkOnDock,
    maxLines: 1,
    x: margin + dockGutter,
    y: ROW.cta,
    width: dockLeftWidth,
    height: reservedHeight(type(38), 1.2, 1),
  });

  // The archetype's CTA treatment is a rule, not a pill. Gradient fill, so the
  // capability rides on a field Polotno carries unchanged.
  elements.push({
    type: "figure",
    id: "cta-rule-gold",
    role: "accent_bar",
    subType: "rect",
    fill: `linear-gradient(90deg,${gold} 0%,rgba(184,154,106,0) 100%)`,
    effectiveHex: gold,
    requiresContent: false,
    decorativePurpose:
      "Gold rule marking the call to action. The archetype's CTA treatment is a rule, not a badge.",
    x: margin + dockGutter,
    y: ROW.ctaRule,
    width: Math.round(dockLeftWidth * 0.66),
    height: 5,
  });

  // 6 — the conversion route, right-aligned in the dock. One fact per line, never
  // merged into a contact blob.
  elements.push({
    type: "text",
    id: "contact-phone",
    role: "contact_phone",
    factId: "phone",
    text: trimmed(truth.phone),
    fontFamily: HOUSE,
    fontSize: type(32),
    fontWeight: 600,
    lineHeight: 1.25,
    align: "right",
    fill: inkOnDock,
    maxLines: 1,
    x: contactX,
    y: ROW.contactPhone,
    width: contactWidth,
    height: reservedHeight(type(32), 1.25, 1),
  });

  elements.push({
    type: "text",
    id: "contact-web",
    role: "contact_web",
    factId: "webDisplay",
    text: trimmed(truth.webDisplay),
    fontFamily: HOUSE,
    fontSize: type(28),
    fontWeight: 400,
    lineHeight: 1.25,
    align: "right",
    fill: inkOnDock,
    maxLines: 1,
    x: contactX,
    y: ROW.contactWeb,
    width: contactWidth,
    height: reservedHeight(type(28), 1.25, 1),
  });

  // The required service-area footer. Supplied by the customer, so it is a bound
  // fact with a role — not a caption the composer decided to add.
  elements.push({
    type: "text",
    id: "service-area",
    role: "disclaimer",
    factId: "disclaimer",
    text: trimmed(truth.disclaimer),
    fontFamily: HOUSE,
    fontSize: type(22),
    fontWeight: 400,
    lineHeight: 1.3,
    letterSpacing: track(1.4),
    align: "right",
    fill: "rgba(244,240,230,0.82)",
    maxLines: 1,
    x: contactX,
    y: ROW.serviceArea,
    width: contactWidth,
    height: reservedHeight(type(22), 1.3, 1),
  });

  return {
    contractVersion: cfg.documentContractVersion,
    logical: { ...logical },
    print: {
      dpi: cfg.print.dpi,
      referenceSheetHeightIn: cfg.print.referenceSheetHeightIn,
    },
    background: palette.background,
    fonts,
    elements,
    materials: truth.materials,
    provenance: {
      packageId: cfg.packageId,
      skuId: truth.skuId,
      campaignId: truth.campaignId,
      jobId: truth.jobId,
      dispatchId: truth.dispatchId,
      truthSpecVersion: "flyer-project-truth",
      creativeDirection: truth.creativeDirection,
      composedAt: input.composedAt ?? "1970-01-01T00:00:00.000Z",
    },
  };
}
