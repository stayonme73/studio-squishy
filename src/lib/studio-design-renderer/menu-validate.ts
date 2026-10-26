/**
 * Fail-closed validation for MenuDesignSpec.
 */

import { existsSync } from "fs";
import path from "path";

import { countMenuItems } from "./menu-contracts";
import type { MenuDesignSpec, MenuProjectTruth, MenuTextLayer } from "./menu-types";
import {
  DESIGN_RENDERER_MENU_SKU,
  MENU_CANVAS,
  MENU_DESIGN_SPEC_VERSION,
  MENU_MAX_ITEMS_TOTAL,
  MENU_MAX_SECTIONS,
  MENU_MIN_FONT_PX,
} from "./menu-types";

export type MenuSpecValidationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "INVALID_DESIGN_SPEC"
        | "MISSING_REQUIRED_MATERIAL"
        | "BROKEN_ASSET_REFERENCE";
      message: string;
    };

function isHexColor(v: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(v);
}

export function validateMenuDesignSpec(
  repoRoot: string,
  spec: MenuDesignSpec,
  truth: MenuProjectTruth,
): MenuSpecValidationResult {
  if (
    spec.specVersion !== MENU_DESIGN_SPEC_VERSION &&
    spec.specVersion !== "menu-design-spec-1.0.0"
  ) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `Unexpected specVersion ${spec.specVersion}`,
    };
  }
  if (spec.layoutMode !== "single_column" && spec.layoutMode !== "two_column") {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "layoutMode must be single_column or two_column",
    };
  }
  if (spec.skuId !== DESIGN_RENDERER_MENU_SKU || truth.skuId !== DESIGN_RENDERER_MENU_SKU) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "skuId must be v2-rtu-menu",
    };
  }
  if (
    spec.canvas.widthPx !== MENU_CANVAS.widthPx ||
    spec.canvas.heightPx !== MENU_CANVAS.heightPx
  ) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `Canvas must be ${MENU_CANVAS.widthPx}x${MENU_CANVAS.heightPx}`,
    };
  }
  if (!isHexColor(spec.background.color)) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "background.color must be #RRGGBB",
    };
  }
  if (truth.sections.length > MENU_MAX_SECTIONS) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `sections exceed ${MENU_MAX_SECTIONS}`,
    };
  }
  if (countMenuItems(truth.sections) > MENU_MAX_ITEMS_TOTAL) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `items exceed ${MENU_MAX_ITEMS_TOTAL} total`,
    };
  }

  const materialById = new Map(spec.materials.map((m) => [m.materialId, m]));
  for (const m of spec.materials) {
    const abs = path.join(repoRoot, m.relativePath);
    if (!existsSync(abs)) {
      return {
        ok: false,
        code: "BROKEN_ASSET_REFERENCE",
        message: `Missing material file ${m.relativePath}`,
      };
    }
  }

  const sectionTitles = new Set(
    spec.layers
      .filter((l): l is MenuTextLayer => l.type === "text" && l.role === "section_title")
      .map((l) => l.sectionId)
      .filter(Boolean),
  );
  for (const sec of truth.sections) {
    if (!sectionTitles.has(sec.sectionId)) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Missing rendered section ${sec.sectionId}`,
      };
    }
  }

  const nameIds = new Set(
    spec.layers
      .filter((l): l is MenuTextLayer => l.type === "text" && l.role === "item_name")
      .map((l) => l.itemId)
      .filter(Boolean),
  );
  const priceIds = new Set(
    spec.layers
      .filter((l): l is MenuTextLayer => l.type === "text" && l.role === "item_price")
      .map((l) => l.itemId)
      .filter(Boolean),
  );

  for (const sec of truth.sections) {
    for (const it of sec.items) {
      if (!nameIds.has(it.itemId) || !priceIds.has(it.itemId)) {
        return {
          ok: false,
          code: "INVALID_DESIGN_SPEC",
          message: `Missing rendered name/price for ${it.itemId}`,
        };
      }
    }
  }

  if (nameIds.size !== countMenuItems(truth.sections)) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Rendered item name count mismatch (duplicate or omit)",
    };
  }

  for (const layer of spec.layers) {
    if (layer.type === "image" && !materialById.has(layer.materialId)) {
      return {
        ok: false,
        code: "BROKEN_ASSET_REFERENCE",
        message: `Unknown material ${layer.materialId}`,
      };
    }
    if (layer.type === "text") {
      const min =
        layer.minFontPx ??
        (layer.role === "item_name"
          ? MENU_MIN_FONT_PX.itemName
          : layer.role === "item_description"
            ? MENU_MIN_FONT_PX.itemDescription
            : layer.role === "item_price"
              ? MENU_MIN_FONT_PX.itemPrice
              : layer.role === "section_title"
                ? MENU_MIN_FONT_PX.sectionTitle
                : undefined);
      if (min != null && layer.fontSizePx + 0.01 < min) {
        return {
          ok: false,
          code: "INVALID_DESIGN_SPEC",
          message: `Font below minimum for ${layer.id}: ${layer.fontSizePx} < ${min}`,
        };
      }
    }
    const bottom =
      layer.type === "text"
        ? layer.y +
          (layer.height ??
            layer.fontSizePx * layer.lineHeight * (layer.maxLines ?? 2))
        : layer.y + layer.height;
    const right = layer.x + layer.width;
    if (
      layer.x < -0.5 ||
      layer.y < -0.5 ||
      right > MENU_CANVAS.widthPx + 1 ||
      bottom > MENU_CANVAS.heightPx + 1
    ) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Layer ${layer.id} exceeds canvas bounds`,
      };
    }
  }

  if (spec.contentBottomPx > MENU_CANVAS.heightPx) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "contentBottomPx exceeds canvas",
    };
  }

  return { ok: true };
}
