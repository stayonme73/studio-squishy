/**
 * Deterministic constrained menu reasoner — MENU-LAYOUT-1.
 * Two-column section flow + tight item–price pairing.
 * Same min type floors; fails closed on density overflow.
 */

import { countMenuItems } from "./menu-contracts";
import type {
  MenuDesignLayer,
  MenuDesignSpec,
  MenuItemTruth,
  MenuProjectTruth,
  MenuSectionTruth,
  MenuTextLayer,
} from "./menu-types";
import {
  MENU_CANVAS,
  MENU_DESIGN_SPEC_VERSION,
  MENU_MAX_ITEMS_TOTAL,
  MENU_MAX_SECTIONS,
  MENU_MIN_FONT_PX,
} from "./menu-types";

const SIDE_PAD = 48;
const GUTTER = 32;
const CONTENT_WIDTH = MENU_CANVAS.widthPx - SIDE_PAD * 2;
/** Tight price gutter inside a column — keeps price next to the name. */
const PRICE_COL_W = 58;
const COL_W = (CONTENT_WIDTH - GUTTER) / 2;
const TWO_COL_THRESHOLD_ITEMS = 10;

type TypeScale = {
  mode: MenuDesignSpec["typographyMode"];
  wordmark: number;
  descriptor: number;
  sectionTitle: number;
  itemName: number;
  itemDescription: number;
  itemPrice: number;
  disclaimer: number;
  sectionGapAfter: number;
  itemGap: number;
  nameDescGap: number;
};

const SCALES: readonly TypeScale[] = [
  {
    mode: "comfortable",
    wordmark: 40,
    descriptor: 16,
    sectionTitle: 17,
    itemName: 15,
    itemDescription: 13,
    itemPrice: 15,
    disclaimer: 11,
    sectionGapAfter: 16,
    itemGap: 11,
    nameDescGap: 3,
  },
  {
    mode: "compact",
    wordmark: 34,
    descriptor: 15,
    sectionTitle: 16,
    itemName: 14,
    itemDescription: 12,
    itemPrice: 14,
    disclaimer: 10,
    sectionGapAfter: 12,
    itemGap: 8,
    nameDescGap: 2,
  },
  {
    mode: "minimum",
    wordmark: MENU_MIN_FONT_PX.wordmark,
    descriptor: MENU_MIN_FONT_PX.descriptor,
    sectionTitle: MENU_MIN_FONT_PX.sectionTitle,
    itemName: MENU_MIN_FONT_PX.itemName,
    itemDescription: MENU_MIN_FONT_PX.itemDescription,
    itemPrice: MENU_MIN_FONT_PX.itemPrice,
    disclaimer: MENU_MIN_FONT_PX.disclaimer,
    sectionGapAfter: 8,
    itemGap: 5,
    nameDescGap: 1,
  },
];

function textLayer(
  partial: Omit<MenuTextLayer, "type"> & { type?: "text" },
): MenuTextLayer {
  return { type: "text", ...partial };
}

function approxLines(text: string, widthPx: number, fontSizePx: number): number {
  const avgChar = fontSizePx * 0.52;
  const charsPerLine = Math.max(8, Math.floor(widthPx / avgChar));
  const raw =
    text.trim().length === 0 ? 0 : Math.ceil(text.trim().length / charsPerLine);
  return Math.max(1, raw);
}

function estimateItemBlockHeight(
  description: string | undefined,
  scale: TypeScale,
  nameWidth: number,
): number {
  const nameH = scale.itemName * 1.2;
  const desc = description?.trim() ?? "";
  if (!desc) return nameH + scale.itemGap;
  // No silent truncation — full wrapped height, or page overflow fails closed.
  const lines = approxLines(desc, nameWidth, scale.itemDescription);
  const descH = lines * scale.itemDescription * 1.3;
  return nameH + scale.nameDescGap + descH + scale.itemGap;
}

function estimateSectionHeight(
  sec: MenuSectionTruth,
  scale: TypeScale,
  nameWidth: number,
): number {
  let h = scale.sectionTitle * 1.25 + 12;
  for (const it of sec.items) {
    h += estimateItemBlockHeight(it.description, scale, nameWidth);
  }
  return h + scale.sectionGapAfter;
}

export function assertMenuRequiredTruth(truth: MenuProjectTruth): void {
  if (truth.skuId !== "v2-rtu-menu") {
    throw new Error(`MISSING_REQUIRED_TRUTH: skuId must be v2-rtu-menu`);
  }
  if (!truth.businessName?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: businessName");
  }
  if (!truth.wordmark?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: wordmark");
  }
  if (!truth.dietaryLabels?.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: dietaryLabels");
  }
  if (!Array.isArray(truth.sections) || truth.sections.length === 0) {
    throw new Error("MISSING_REQUIRED_TRUTH: sections");
  }
  if (truth.sections.length > MENU_MAX_SECTIONS) {
    throw new Error(
      `MISSING_REQUIRED_TRUTH: sections exceed max ${MENU_MAX_SECTIONS}`,
    );
  }
  const total = countMenuItems(truth.sections);
  if (total > MENU_MAX_ITEMS_TOTAL) {
    throw new Error(
      `MISSING_REQUIRED_TRUTH: items exceed max ${MENU_MAX_ITEMS_TOTAL} total`,
    );
  }
  if (total < 1) {
    throw new Error("MISSING_REQUIRED_TRUTH: no items");
  }
  for (const sec of truth.sections) {
    if (!sec.sectionId?.trim() || !sec.title?.trim()) {
      throw new Error("MISSING_REQUIRED_TRUTH: section id/title");
    }
    if (!sec.items.length) {
      throw new Error(`MISSING_REQUIRED_TRUTH: empty section ${sec.sectionId}`);
    }
    for (const it of sec.items) {
      if (!it.itemId?.trim()) {
        throw new Error("MISSING_REQUIRED_TRUTH: itemId");
      }
      if (!it.name?.trim()) {
        throw new Error(`MISSING_REQUIRED_TRUTH: item name (${it.itemId})`);
      }
      if (!it.priceDisplay?.trim()) {
        throw new Error(`MISSING_REQUIRED_TRUTH: item price (${it.itemId})`);
      }
      if (!/^\$?\d/.test(it.priceDisplay.trim()) && !/\d/.test(it.priceDisplay)) {
        throw new Error(
          `MISSING_REQUIRED_TRUTH: malformed price (${it.itemId}): ${it.priceDisplay}`,
        );
      }
    }
  }
  if (!truth.materials.some((m) => m.role === "logo")) {
    throw new Error("MISSING_REQUIRED_MATERIAL: logo");
  }
}

type PackOk = {
  layers: MenuDesignLayer[];
  contentBottomPx: number;
  layoutMode: MenuDesignSpec["layoutMode"];
};
type PackFail = { overflow: true; detail: string };

function appendHeader(
  layers: MenuDesignLayer[],
  truth: MenuProjectTruth,
  scale: TypeScale,
  logoMaterialId: string,
): number {
  const c = truth.brandColors;
  layers.push({
    type: "shape",
    id: "accent-top",
    role: "accent_bar",
    x: 0,
    y: 0,
    width: MENU_CANVAS.widthPx,
    height: 18,
    fill: c.primary,
  });

  const logoSize =
    scale.mode === "minimum" ? 64 : scale.mode === "compact" ? 80 : 96;
  const logoTop = 26;
  layers.push({
    type: "shape",
    id: "logo-plate",
    role: "logo_plate",
    x: (MENU_CANVAS.widthPx - logoSize - 14) / 2,
    y: logoTop,
    width: logoSize + 14,
    height: logoSize + 14,
    fill: "#FFFFFF",
    borderRadiusPx: (logoSize + 14) / 2,
  });
  layers.push({
    type: "image",
    id: "logo",
    role: "logo",
    materialId: logoMaterialId,
    x: (MENU_CANVAS.widthPx - logoSize) / 2,
    y: logoTop + 7,
    width: logoSize,
    height: logoSize,
    fit: "contain",
  });

  let y = logoTop + logoSize + 18;
  layers.push(
    textLayer({
      id: "wordmark",
      role: "wordmark",
      content: truth.wordmark,
      x: SIDE_PAD,
      y,
      width: CONTENT_WIDTH,
      fontSizePx: scale.wordmark,
      fontWeight: 700,
      lineHeight: 1.1,
      color: c.primary,
      align: "center",
      minFontPx: MENU_MIN_FONT_PX.wordmark,
    }),
  );
  y += scale.wordmark * 1.12;

  if (truth.descriptor?.trim()) {
    layers.push(
      textLayer({
        id: "descriptor",
        role: "descriptor",
        content: truth.descriptor.trim(),
        x: SIDE_PAD,
        y,
        width: CONTENT_WIDTH,
        fontSizePx: scale.descriptor,
        fontWeight: 500,
        lineHeight: 1.2,
        letterSpacingPx: 3,
        color: c.secondary,
        align: "center",
        minFontPx: MENU_MIN_FONT_PX.descriptor,
      }),
    );
    y += scale.descriptor * 1.35 + 6;
  } else {
    y += 8;
  }

  layers.push({
    type: "shape",
    id: "header-rule",
    role: "footer_rule",
    x: 360,
    y,
    width: 304,
    height: 2,
    fill: c.secondary,
  });
  return y + 16;
}

function appendFooter(
  layers: MenuDesignLayer[],
  truth: MenuProjectTruth,
  scale: TypeScale,
  disclaimerH: number,
): void {
  const c = truth.brandColors;
  const dietary = truth.dietaryLabels.trim();
  const legal = truth.legalDisclaimer?.trim() ?? "";
  const footerTop = MENU_CANVAS.heightPx - disclaimerH - 10;

  // Light footer — rule + muted text (not a heavy solid bar dominating the page).
  layers.push({
    type: "shape",
    id: "footer-rule",
    role: "footer_rule",
    x: SIDE_PAD,
    y: footerTop,
    width: CONTENT_WIDTH,
    height: 2,
    fill: c.secondary,
  });

  let footerY = footerTop + 10;
  const dietaryLines = Math.min(
    2,
    approxLines(dietary, CONTENT_WIDTH, scale.disclaimer),
  );
  const dietaryH = dietaryLines * scale.disclaimer * 1.3;
  layers.push(
    textLayer({
      id: "dietary",
      role: "dietary_disclaimer",
      content: dietary,
      x: SIDE_PAD,
      y: footerY,
      width: CONTENT_WIDTH,
      height: dietaryH,
      fontSizePx: scale.disclaimer,
      fontWeight: 400,
      lineHeight: 1.3,
      color: c.muted,
      align: "left",
      minFontPx: MENU_MIN_FONT_PX.disclaimer,
    }),
  );
  footerY += dietaryH + 4;

  if (legal) {
    const legalLines = Math.min(
      2,
      approxLines(legal, CONTENT_WIDTH, scale.disclaimer),
    );
    const legalH = legalLines * scale.disclaimer * 1.25;
    layers.push(
      textLayer({
        id: "legal",
        role: "legal_disclaimer",
        content: legal,
        x: SIDE_PAD,
        y: footerY,
        width: CONTENT_WIDTH,
        height: legalH,
        fontSizePx: scale.disclaimer,
        fontWeight: 400,
        lineHeight: 1.25,
        color: c.primary,
        align: "left",
        minFontPx: MENU_MIN_FONT_PX.disclaimer,
      }),
    );
  }
}

function placeItem(
  layers: MenuDesignLayer[],
  it: MenuItemTruth,
  sec: MenuSectionTruth,
  scale: TypeScale,
  colX: number,
  y: number,
  nameW: number,
  colors: MenuProjectTruth["brandColors"],
): number {
  layers.push(
    textLayer({
      id: `name-${it.itemId}`,
      role: "item_name",
      content: it.name,
      x: colX,
      y,
      width: nameW,
      fontSizePx: scale.itemName,
      fontWeight: 600,
      lineHeight: 1.2,
      color: colors.text,
      align: "left",
      itemId: it.itemId,
      sectionId: sec.sectionId,
      minFontPx: MENU_MIN_FONT_PX.itemName,
    }),
  );
  layers.push(
    textLayer({
      id: `price-${it.itemId}`,
      role: "item_price",
      content: it.priceDisplay,
      x: colX + nameW + 6,
      y,
      width: PRICE_COL_W,
      fontSizePx: scale.itemPrice,
      fontWeight: 700,
      lineHeight: 1.2,
      color: colors.text,
      align: "right",
      itemId: it.itemId,
      sectionId: sec.sectionId,
      minFontPx: MENU_MIN_FONT_PX.itemPrice,
    }),
  );
  let nextY = y + scale.itemName * 1.2;

  const desc = it.description?.trim() ?? "";
  if (desc) {
    nextY += scale.nameDescGap;
    const lines = approxLines(desc, nameW, scale.itemDescription);
    const descH = lines * scale.itemDescription * 1.3;
    layers.push(
      textLayer({
        id: `desc-${it.itemId}`,
        role: "item_description",
        content: desc,
        x: colX,
        y: nextY,
        width: nameW,
        height: descH,
        fontSizePx: scale.itemDescription,
        fontWeight: 400,
        lineHeight: 1.3,
        color: colors.muted,
        align: "left",
        maxLines: lines,
        itemId: it.itemId,
        sectionId: sec.sectionId,
        minFontPx: MENU_MIN_FONT_PX.itemDescription,
      }),
    );
    nextY += descH;
  }
  return nextY + scale.itemGap;
}

function placeSectionHeader(
  layers: MenuDesignLayer[],
  sec: MenuSectionTruth,
  scale: TypeScale,
  colX: number,
  y: number,
  colW: number,
  colors: MenuProjectTruth["brandColors"],
  layerKey: string,
): number {
  layers.push(
    textLayer({
      id: `section-${layerKey}`,
      role: "section_title",
      content: sec.title.toUpperCase(),
      x: colX,
      y,
      width: colW,
      fontSizePx: scale.sectionTitle,
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacingPx: 1.2,
      color: colors.primary,
      align: "left",
      sectionId: sec.sectionId,
      minFontPx: MENU_MIN_FONT_PX.sectionTitle,
    }),
  );
  let nextY = y + scale.sectionTitle * 1.25;
  layers.push({
    type: "shape",
    id: `rule-${layerKey}`,
    role: "section_rule",
    x: colX,
    y: nextY,
    width: Math.min(140, colW * 0.45),
    height: 2,
    fill: colors.secondary,
  });
  return nextY + 10;
}

function packColumnSections(
  layers: MenuDesignLayer[],
  sections: readonly MenuSectionTruth[],
  scale: TypeScale,
  colX: number,
  startY: number,
  limitY: number,
  nameW: number,
  colW: number,
  colors: MenuProjectTruth["brandColors"],
  columnTag: string,
): { y: number } | { overflow: true; detail: string } {
  let y = startY;
  let idx = 0;
  for (const sec of sections) {
    const need = estimateSectionHeight(sec, scale, nameW);
    if (y + need > limitY + 0.5) {
      return {
        overflow: true,
        detail: `col=${columnTag} section=${sec.sectionId} y=${y.toFixed(1)} need=${need.toFixed(1)} limit=${limitY}`,
      };
    }
    const layerKey = `${columnTag}-${sec.sectionId}-${idx}`;
    y = placeSectionHeader(
      layers,
      sec,
      scale,
      colX,
      y,
      colW,
      colors,
      layerKey,
    );
    for (const it of sec.items) {
      const blockH = estimateItemBlockHeight(it.description, scale, nameW);
      if (y + blockH > limitY + 0.5) {
        return {
          overflow: true,
          detail: `col=${columnTag} item=${it.itemId} y=${y.toFixed(1)} need=${blockH.toFixed(1)} limit=${limitY}`,
        };
      }
      y = placeItem(layers, it, sec, scale, colX, y, nameW, colors);
    }
    y += scale.sectionGapAfter;
    idx += 1;
  }
  return { y };
}

/**
 * Greedy whole-section → column assignment (fill left, then right).
 * Splits a section's items only when the whole section exceeds remaining space.
 */
function assignSectionsToColumns(
  sections: readonly MenuSectionTruth[],
  scale: TypeScale,
  nameW: number,
  availableH: number,
):
  | { left: MenuSectionTruth[]; right: MenuSectionTruth[] }
  | { overflow: true; detail: string } {
  const left: MenuSectionTruth[] = [];
  const right: MenuSectionTruth[] = [];
  let leftH = 0;
  let rightH = 0;

  for (const sec of sections) {
    const h = estimateSectionHeight(sec, scale, nameW);
    // Prefer the currently shorter column for visual balance.
    const tryOrder: Array<"left" | "right"> =
      leftH <= rightH ? ["left", "right"] : ["right", "left"];
    let placedWhole = false;
    for (const side of tryOrder) {
      if (side === "left" && h <= availableH - leftH + 0.5) {
        left.push(sec);
        leftH += h;
        placedWhole = true;
        break;
      }
      if (side === "right" && h <= availableH - rightH + 0.5) {
        right.push(sec);
        rightH += h;
        placedWhole = true;
        break;
      }
    }
    if (placedWhole) continue;

    // Split items across remaining column capacity.
    const headerH = scale.sectionTitle * 1.25 + 12;
    let pending: MenuItemTruth[] = [...sec.items];
    let pass = 0;
    while (pending.length) {
      const preferLeft = leftH <= rightH;
      const colH = preferLeft ? leftH : rightH;
      const room = availableH - colH;
      if (room < headerH + scale.itemName * 2) {
        if (preferLeft && availableH - rightH >= headerH + scale.itemName * 2) {
          // try other column next loop by forcing height
          leftH = availableH;
          continue;
        }
        if (!preferLeft && availableH - leftH >= headerH + scale.itemName * 2) {
          rightH = availableH;
          continue;
        }
        return {
          overflow: true,
          detail: `split failed for ${sec.sectionId}; remaining=${pending.length}`,
        };
      }

      const placed: MenuItemTruth[] = [];
      let used = headerH;
      const remain: MenuItemTruth[] = [];
      let filling = true;
      for (const it of pending) {
        const bh = estimateItemBlockHeight(it.description, scale, nameW);
        if (filling && used + bh <= room - scale.sectionGapAfter) {
          placed.push(it);
          used += bh;
        } else {
          filling = false;
          remain.push(it);
        }
      }
      if (!placed.length) {
        return {
          overflow: true,
          detail: `no item fits in column for ${sec.sectionId}`,
        };
      }
      const partial: MenuSectionTruth = {
        sectionId: sec.sectionId,
        title: sec.title,
        items: placed,
      };
      if (preferLeft) {
        left.push(partial);
        leftH += used + scale.sectionGapAfter;
      } else {
        right.push(partial);
        rightH += used + scale.sectionGapAfter;
      }
      pending = remain;
      pass += 1;
      if (pass > 8) {
        return {
          overflow: true,
          detail: `split loop guard for ${sec.sectionId}`,
        };
      }
    }
  }

  return { left, right };
}

function packWithScale(
  truth: MenuProjectTruth,
  scale: TypeScale,
  layoutMode: MenuDesignSpec["layoutMode"],
): PackOk | PackFail {
  const logo = truth.materials.find((m) => m.role === "logo");
  if (!logo) {
    throw new Error("MISSING_REQUIRED_MATERIAL: logo");
  }

  const layers: MenuDesignLayer[] = [];
  const contentTop = appendHeader(layers, truth, scale, logo.materialId);

  const dietary = truth.dietaryLabels.trim();
  const legal = truth.legalDisclaimer?.trim() ?? "";
  const dietaryLines = Math.min(
    2,
    approxLines(dietary, CONTENT_WIDTH, scale.disclaimer),
  );
  const legalLines = legal
    ? Math.min(2, approxLines(legal, CONTENT_WIDTH, scale.disclaimer))
    : 0;
  const disclaimerH =
    dietaryLines * scale.disclaimer * 1.3 +
    legalLines * scale.disclaimer * 1.25 +
    24;
  const contentBottomLimit = MENU_CANVAS.heightPx - disclaimerH - 16;
  const availableH = contentBottomLimit - contentTop;
  const colors = truth.brandColors;

  if (layoutMode === "single_column") {
    const unitW = Math.min(CONTENT_WIDTH, COL_W + 40);
    const nameW = unitW - PRICE_COL_W - 6;
    const packed = packColumnSections(
      layers,
      truth.sections,
      scale,
      SIDE_PAD,
      contentTop,
      contentBottomLimit,
      nameW,
      unitW,
      colors,
      "L",
    );
    if ("overflow" in packed) return packed;
    appendFooter(layers, truth, scale, disclaimerH);
    return {
      layers,
      contentBottomPx: packed.y,
      layoutMode: "single_column",
    };
  }

  const nameW = COL_W - PRICE_COL_W - 6;
  const assigned = assignSectionsToColumns(
    truth.sections,
    scale,
    nameW,
    availableH,
  );
  if ("overflow" in assigned) return assigned;

  const leftX = SIDE_PAD;
  const rightX = SIDE_PAD + COL_W + GUTTER;

  const leftPack = packColumnSections(
    layers,
    assigned.left,
    scale,
    leftX,
    contentTop,
    contentBottomLimit,
    nameW,
    COL_W,
    colors,
    "L",
  );
  if ("overflow" in leftPack) return leftPack;

  const rightPack = packColumnSections(
    layers,
    assigned.right,
    scale,
    rightX,
    contentTop,
    contentBottomLimit,
    nameW,
    COL_W,
    colors,
    "R",
  );
  if ("overflow" in rightPack) return rightPack;

  layers.push({
    type: "shape",
    id: "column-gutter-tick",
    role: "section_rule",
    x: SIDE_PAD + COL_W + GUTTER / 2 - 0.5,
    y: contentTop,
    width: 1,
    height: 28,
    fill: colors.secondary,
  });

  appendFooter(layers, truth, scale, disclaimerH);
  return {
    layers,
    contentBottomPx: Math.max(leftPack.y, rightPack.y),
    layoutMode: "two_column",
  };
}

/**
 * Creative reasoning → bounded MenuDesignSpec (MENU-LAYOUT-1).
 * Prefers two-column when item count warrants it; tries comfortable→compact→minimum.
 */
export function reasonMenuDesignSpecDeterministic(
  truth: MenuProjectTruth,
): MenuDesignSpec {
  assertMenuRequiredTruth(truth);

  const itemCount = countMenuItems(truth.sections);
  const preferredLayout: MenuDesignSpec["layoutMode"] =
    itemCount >= TWO_COL_THRESHOLD_ITEMS ? "two_column" : "single_column";

  const layoutOrder: MenuDesignSpec["layoutMode"][] =
    preferredLayout === "two_column"
      ? ["two_column", "single_column"]
      : ["single_column", "two_column"];

  let lastDetail = "";
  for (const layoutMode of layoutOrder) {
    for (const scale of SCALES) {
      const packed = packWithScale(truth, scale, layoutMode);
      if ("overflow" in packed) {
        lastDetail = packed.detail;
        continue;
      }
      return {
        specVersion: MENU_DESIGN_SPEC_VERSION,
        skuId: truth.skuId,
        canvas: { ...MENU_CANVAS },
        background: { color: truth.brandColors.background },
        colors: { ...truth.brandColors },
        materials: [...truth.materials],
        outputFormats: ["png", "pdf"],
        reasoningMode: "deterministic_constrained",
        layers: packed.layers,
        contentBottomPx: packed.contentBottomPx,
        typographyMode: scale.mode,
        layoutMode: packed.layoutMode,
      };
    }
  }

  throw new Error(
    `DENSITY_OVERFLOW: maximum readable typography cannot fit menu on single page (${lastDetail}). Multi-page/bifold excluded by contract.`,
  );
}
