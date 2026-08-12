/**
 * Validate ServiceSheetDesignSpec against truth + materials on disk.
 */

import { existsSync } from "fs";
import path from "path";

import {
  SERVICE_SHEET_CANVAS,
  SERVICE_SHEET_DESIGN_SPEC_VERSION,
  SERVICE_SHEET_MIN_FONT_PX,
  type ServiceSheetDesignSpec,
  type ServiceSheetProjectTruth,
} from "./service-sheet-types";

export type ServiceSheetValidateResult =
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_DESIGN_SPEC" | "BROKEN_ASSET_REFERENCE";
      message: string;
    };

export function validateServiceSheetDesignSpec(
  repoRoot: string,
  spec: ServiceSheetDesignSpec,
  truth: ServiceSheetProjectTruth,
): ServiceSheetValidateResult {
  if (spec.specVersion !== SERVICE_SHEET_DESIGN_SPEC_VERSION) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `Unexpected specVersion ${spec.specVersion}`,
    };
  }
  if (spec.skuId !== truth.skuId || spec.skuId !== "v2-rtu-service-sheet") {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "skuId mismatch",
    };
  }
  if (
    spec.canvas.widthPx !== SERVICE_SHEET_CANVAS.widthPx ||
    spec.canvas.heightPx !== SERVICE_SHEET_CANVAS.heightPx
  ) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "canvas must be CERT portrait 1024×1536",
    };
  }
  if (spec.layoutMode !== "single_column") {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "layoutMode must be single_column for service-sheet proof",
    };
  }

  for (const m of spec.materials) {
    if (!existsSync(path.join(repoRoot, m.relativePath))) {
      return {
        ok: false,
        code: "BROKEN_ASSET_REFERENCE",
        message: `Missing material file ${m.relativePath}`,
      };
    }
  }

  for (const layer of spec.layers) {
    if (layer.type !== "text") continue;
    const min =
      layer.minFontPx ??
      (layer.role === "service_name"
        ? SERVICE_SHEET_MIN_FONT_PX.serviceName
        : layer.role === "service_description"
          ? SERVICE_SHEET_MIN_FONT_PX.serviceDescription
          : layer.role === "service_price"
            ? SERVICE_SHEET_MIN_FONT_PX.servicePrice
            : undefined);
    if (min != null && layer.fontSizePx < min) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Font below floor for ${layer.id}`,
      };
    }
  }

  return { ok: true };
}
