/**
 * Deterministic service-sheet packer — single-column comfortable list.
 * Reuses sealed portrait plate + list-row ideas; does not call menu reasoner
 * (menu requires a price on every row). SKU-gated optional pricing.
 */

import {
  SERVICE_SHEET_CANVAS,
  SERVICE_SHEET_DESIGN_SPEC_VERSION,
  SERVICE_SHEET_MAX_SERVICES,
  SERVICE_SHEET_MIN_FONT_PX,
  type ServiceRowTruth,
  type ServiceSheetDesignLayer,
  type ServiceSheetDesignSpec,
  type ServiceSheetProjectTruth,
} from "./service-sheet-types";
import { looksLikeInventedPricingFallback } from "./service-sheet-map-price";

const SIDE_PAD = 56;
const CONTENT_WIDTH = SERVICE_SHEET_CANVAS.widthPx - SIDE_PAD * 2;
/** Wider than menu so contact-for-pricing text stays associated and readable. */
const PRICE_COL_W = 168;
const NAME_GAP = 12;

type TypeScale = {
  mode: ServiceSheetDesignSpec["typographyMode"];
  wordmark: number;
  descriptor: number;
  sectionTitle: number;
  serviceName: number;
  serviceDescription: number;
  servicePrice: number;
  contact: number;
  disclaimer: number;
  rowGap: number;
  sectionGapAfter: number;
};

const SCALES: readonly TypeScale[] = [
  {
    mode: "comfortable",
    wordmark: 34,
    descriptor: 16,
    sectionTitle: 18,
    serviceName: 16,
    serviceDescription: 13,
    servicePrice: 15,
    contact: 13,
    disclaimer: 11,
    rowGap: 18,
    sectionGapAfter: 20,
  },
  {
    mode: "compact",
    wordmark: 32,
    descriptor: 15,
    sectionTitle: 17,
    serviceName: 15,
    serviceDescription: 12,
    servicePrice: 14,
    contact: 12,
    disclaimer: 11,
    rowGap: 14,
    sectionGapAfter: 16,
  },
  {
    mode: "minimum",
    wordmark: SERVICE_SHEET_MIN_FONT_PX.wordmark,
    descriptor: SERVICE_SHEET_MIN_FONT_PX.descriptor,
    sectionTitle: SERVICE_SHEET_MIN_FONT_PX.sectionTitle,
    serviceName: SERVICE_SHEET_MIN_FONT_PX.serviceName,
    serviceDescription: SERVICE_SHEET_MIN_FONT_PX.serviceDescription,
    servicePrice: SERVICE_SHEET_MIN_FONT_PX.servicePrice,
    contact: SERVICE_SHEET_MIN_FONT_PX.contact,
    disclaimer: SERVICE_SHEET_MIN_FONT_PX.disclaimer,
    rowGap: 12,
    sectionGapAfter: 14,
  },
];

function approxLines(text: string, widthPx: number, fontPx: number): number {
  const avg = fontPx * 0.52;
  const charsPerLine = Math.max(8, Math.floor(widthPx / avg));
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  let lines = 1;
  let used = 0;
  for (const w of words) {
    const need = (used === 0 ? 0 : 1) + w.length;
    if (used + need > charsPerLine) {
      lines += 1;
      used = w.length;
    } else {
      used += need;
    }
  }
  return lines;
}

function resolvePriceText(row: ServiceRowTruth): string | null {
  if (row.priceMode === "omitted") {
    if (row.priceDisplay?.trim()) {
      throw new Error(
        `MISSING_REQUIRED_TRUTH: omitted mode must not carry priceDisplay (${row.serviceId})`,
      );
    }
    return null;
  }
  const text = row.priceDisplay?.trim() ?? "";
  if (!text) {
    throw new Error(
      `MISSING_REQUIRED_TRUTH: ${row.priceMode} requires customer price text (${row.serviceId})`,
    );
  }
  if (looksLikeInventedPricingFallback(text)) {
    throw new Error(
      `MISSING_REQUIRED_TRUTH: forbidden filler pricing language (${row.serviceId}): ${text}`,
    );
  }
  return text;
}

export function assertServiceSheetRequiredTruth(
  truth: ServiceSheetProjectTruth,
): void {
  if (truth.skuId !== "v2-rtu-service-sheet") {
    throw new Error("MISSING_REQUIRED_TRUTH: skuId must be v2-rtu-service-sheet");
  }
  if (!truth.businessName?.trim() || !truth.wordmark?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: businessName/wordmark");
  }
  if (!truth.listHeading?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: listHeading");
  }
  if (!truth.contactDetails?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: contactDetails");
  }
  if (!truth.legalDisclaimer?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: legalDisclaimer");
  }
  if (!truth.services?.length) {
    throw new Error("MISSING_REQUIRED_TRUTH: services required");
  }
  if (truth.services.length > SERVICE_SHEET_MAX_SERVICES) {
    throw new Error(
      `MISSING_REQUIRED_TRUTH: services exceed ${SERVICE_SHEET_MAX_SERVICES}`,
    );
  }
  const ids = new Set<string>();
  for (const s of truth.services) {
    if (!s.serviceId?.trim()) {
      throw new Error("MISSING_REQUIRED_TRUTH: serviceId");
    }
    if (ids.has(s.serviceId)) {
      throw new Error(`MISSING_REQUIRED_TRUTH: duplicate serviceId ${s.serviceId}`);
    }
    ids.add(s.serviceId);
    if (!s.name?.trim()) {
      throw new Error(`MISSING_REQUIRED_TRUTH: service name (${s.serviceId})`);
    }
    if (
      s.priceMode !== "listed" &&
      s.priceMode !== "contact_for_pricing" &&
      s.priceMode !== "omitted"
    ) {
      throw new Error(
        `MISSING_REQUIRED_TRUTH: invalid priceMode (${s.serviceId})`,
      );
    }
    resolvePriceText(s);
  }
  if (!truth.materials.some((m) => m.role === "logo")) {
    throw new Error("MISSING_REQUIRED_MATERIAL: logo");
  }
  if (truth.outputMode === "customer") {
    // Scan customer-facing content only — not internal package labels.
    const blob = [
      truth.businessName,
      truth.wordmark,
      truth.descriptor ?? "",
      truth.listHeading,
      truth.contactDetails,
      truth.legalDisclaimer,
      ...truth.services.flatMap((s) => [
        s.name,
        s.description ?? "",
        s.priceDisplay ?? "",
      ]),
    ].join("\n");
    if (/CERTIFICATION FIXTURE/i.test(blob) || /INTERNAL TEST/i.test(blob)) {
      throw new Error("FIXTURE_LEAKAGE: certification fixture text in customer truth");
    }
  }
}

function estimateRowHeight(
  row: ServiceRowTruth,
  scale: TypeScale,
  nameWidth: number,
): number {
  const desc = row.description?.trim() ?? "";
  const descLines = desc
    ? Math.min(3, approxLines(desc, nameWidth, scale.serviceDescription))
    : 0;
  const priceText =
    row.priceMode === "omitted" ? null : row.priceDisplay?.trim() || null;
  const priceLines =
    priceText && row.priceMode === "contact_for_pricing"
      ? Math.min(2, approxLines(priceText, PRICE_COL_W, scale.servicePrice))
      : priceText
        ? 1
        : 0;
  const nameBlock = scale.serviceName * 1.25;
  const descBlock = descLines * scale.serviceDescription * 1.35;
  const priceBlock = priceLines * scale.servicePrice * 1.25;
  return (
    Math.max(nameBlock + descBlock, priceBlock, nameBlock) + scale.rowGap
  );
}

function packWithScale(
  truth: ServiceSheetProjectTruth,
  scale: TypeScale,
):
  | { layers: ServiceSheetDesignLayer[]; contentBottomPx: number }
  | { overflow: true; detail: string } {
  const logo = truth.materials.find((m) => m.role === "logo");
  if (!logo) throw new Error("MISSING_REQUIRED_MATERIAL: logo");

  const layers: ServiceSheetDesignLayer[] = [];
  const colors = truth.brandColors;
  let y = 48;

  layers.push({
    type: "shape",
    id: "accent-bar",
    role: "accent_bar",
    x: 0,
    y: 0,
    width: SERVICE_SHEET_CANVAS.widthPx,
    height: 10,
    fill: colors.primary,
  });

  layers.push({
    type: "shape",
    id: "logo-plate",
    role: "logo_plate",
    x: SIDE_PAD,
    y,
    width: 72,
    height: 72,
    fill: colors.background,
    borderRadiusPx: 8,
  });
  layers.push({
    type: "image",
    id: "logo",
    role: "logo",
    materialId: logo.materialId,
    x: SIDE_PAD + 4,
    y: y + 4,
    width: 64,
    height: 64,
    fit: "contain",
  });

  const textLeft = SIDE_PAD + 88;
  layers.push({
    type: "text",
    id: "wordmark",
    role: "wordmark",
    content: truth.wordmark,
    x: textLeft,
    y: y + 8,
    width: CONTENT_WIDTH - 88,
    fontSizePx: scale.wordmark,
    fontWeight: 700,
    lineHeight: 1.15,
    color: colors.primary,
    align: "left",
    minFontPx: SERVICE_SHEET_MIN_FONT_PX.wordmark,
  });
  if (truth.descriptor?.trim()) {
    layers.push({
      type: "text",
      id: "descriptor",
      role: "descriptor",
      content: truth.descriptor.trim(),
      x: textLeft,
      y: y + 8 + scale.wordmark * 1.2,
      width: CONTENT_WIDTH - 88,
      fontSizePx: scale.descriptor,
      fontWeight: 500,
      lineHeight: 1.25,
      color: colors.muted,
      align: "left",
      minFontPx: SERVICE_SHEET_MIN_FONT_PX.descriptor,
    });
  }
  y += 88;

  layers.push({
    type: "text",
    id: "list-heading",
    role: "section_title",
    content: truth.listHeading.trim(),
    x: SIDE_PAD,
    y,
    width: CONTENT_WIDTH,
    fontSizePx: scale.sectionTitle,
    fontWeight: 700,
    lineHeight: 1.2,
    color: colors.primary,
    align: "left",
    minFontPx: SERVICE_SHEET_MIN_FONT_PX.sectionTitle,
  });
  y += scale.sectionTitle * 1.35 + 8;
  layers.push({
    type: "shape",
    id: "heading-rule",
    role: "section_rule",
    x: SIDE_PAD,
    y,
    width: CONTENT_WIDTH,
    height: 2,
    fill: colors.secondary,
  });
  y += 16;

  const contact = truth.contactDetails.trim();
  const legal = truth.legalDisclaimer.trim();
  const contactLines = Math.min(
    3,
    approxLines(contact, CONTENT_WIDTH, scale.contact),
  );
  const legalLines = Math.min(
    3,
    approxLines(legal, CONTENT_WIDTH, scale.disclaimer),
  );
  const footerH =
    contactLines * scale.contact * 1.35 +
    legalLines * scale.disclaimer * 1.3 +
    36;
  const contentBottomLimit = SERVICE_SHEET_CANVAS.heightPx - footerH - 20;

  for (const row of truth.services) {
    const hasPrice = row.priceMode !== "omitted";
    const nameW = hasPrice
      ? CONTENT_WIDTH - PRICE_COL_W - NAME_GAP
      : CONTENT_WIDTH;
    const blockH = estimateRowHeight(row, scale, nameW);
    if (y + blockH > contentBottomLimit) {
      return {
        overflow: true,
        detail: `row does not fit: ${row.serviceId}`,
      };
    }

    layers.push({
      type: "text",
      id: `name-${row.serviceId}`,
      role: "service_name",
      content: row.name.trim(),
      x: SIDE_PAD,
      y,
      width: nameW,
      fontSizePx: scale.serviceName,
      fontWeight: 600,
      lineHeight: 1.25,
      color: colors.text,
      align: "left",
      serviceId: row.serviceId,
      minFontPx: SERVICE_SHEET_MIN_FONT_PX.serviceName,
    });

    const priceText = resolvePriceText(row);
    if (priceText != null) {
      const priceLines = Math.min(
        2,
        approxLines(priceText, PRICE_COL_W, scale.servicePrice),
      );
      layers.push({
        type: "text",
        id: `price-${row.serviceId}`,
        role: "service_price",
        content: priceText,
        x: SIDE_PAD + nameW + NAME_GAP,
        y,
        width: PRICE_COL_W,
        height: priceLines * scale.servicePrice * 1.3,
        fontSizePx: scale.servicePrice,
        fontWeight: row.priceMode === "listed" ? 600 : 500,
        lineHeight: 1.25,
        color:
          row.priceMode === "contact_for_pricing" ? colors.muted : colors.text,
        align: "right",
        serviceId: row.serviceId,
        minFontPx: SERVICE_SHEET_MIN_FONT_PX.servicePrice,
      });
    }

    let rowY = y + scale.serviceName * 1.25;
    const desc = row.description?.trim();
    if (desc) {
      const descLines = Math.min(
        3,
        approxLines(desc, nameW, scale.serviceDescription),
      );
      layers.push({
        type: "text",
        id: `desc-${row.serviceId}`,
        role: "service_description",
        content: desc,
        x: SIDE_PAD,
        y: rowY,
        width: nameW,
        height: descLines * scale.serviceDescription * 1.35,
        fontSizePx: scale.serviceDescription,
        fontWeight: 400,
        lineHeight: 1.35,
        color: colors.muted,
        align: "left",
        serviceId: row.serviceId,
        minFontPx: SERVICE_SHEET_MIN_FONT_PX.serviceDescription,
      });
      rowY += descLines * scale.serviceDescription * 1.35;
    }

    y = Math.max(y + blockH, rowY + scale.rowGap * 0.35);
    layers.push({
      type: "shape",
      id: `rule-${row.serviceId}`,
      role: "row_rule",
      x: SIDE_PAD,
      y: y - scale.rowGap * 0.45,
      width: CONTENT_WIDTH,
      height: 1,
      fill: "rgba(31,58,95,0.12)",
    });
  }

  const contentBottomPx = y;
  let fy = SERVICE_SHEET_CANVAS.heightPx - footerH;
  layers.push({
    type: "shape",
    id: "footer-rule",
    role: "footer_rule",
    x: SIDE_PAD,
    y: fy,
    width: CONTENT_WIDTH,
    height: 1,
    fill: colors.secondary,
  });
  fy += 12;
  layers.push({
    type: "text",
    id: "contact-block",
    role: "contact_block",
    content: contact,
    x: SIDE_PAD,
    y: fy,
    width: CONTENT_WIDTH,
    height: contactLines * scale.contact * 1.35,
    fontSizePx: scale.contact,
    fontWeight: 500,
    lineHeight: 1.35,
    color: colors.text,
    align: "left",
    minFontPx: SERVICE_SHEET_MIN_FONT_PX.contact,
  });
  fy += contactLines * scale.contact * 1.35 + 6;
  layers.push({
    type: "text",
    id: "legal-disclaimer",
    role: "legal_disclaimer",
    content: legal,
    x: SIDE_PAD,
    y: fy,
    width: CONTENT_WIDTH,
    height: legalLines * scale.disclaimer * 1.3,
    fontSizePx: scale.disclaimer,
    fontWeight: 400,
    lineHeight: 1.3,
    color: colors.muted,
    align: "left",
    minFontPx: SERVICE_SHEET_MIN_FONT_PX.disclaimer,
  });

  return { layers, contentBottomPx };
}

export function reasonServiceSheetDesignSpecDeterministic(
  truth: ServiceSheetProjectTruth,
): ServiceSheetDesignSpec {
  assertServiceSheetRequiredTruth(truth);

  let lastDetail = "";
  for (const scale of SCALES) {
    const packed = packWithScale(truth, scale);
    if ("overflow" in packed) {
      lastDetail = packed.detail;
      continue;
    }
    return {
      specVersion: SERVICE_SHEET_DESIGN_SPEC_VERSION,
      skuId: truth.skuId,
      canvas: { ...SERVICE_SHEET_CANVAS },
      background: { color: truth.brandColors.background },
      colors: { ...truth.brandColors },
      materials: [...truth.materials],
      outputFormats: ["png", "pdf"],
      reasoningMode: "deterministic_constrained",
      layers: packed.layers,
      contentBottomPx: packed.contentBottomPx,
      typographyMode: scale.mode,
      layoutMode: "single_column",
    };
  }

  throw new Error(
    `DENSITY_OVERFLOW: service sheet does not fit portrait plate (${lastDetail})`,
  );
}
