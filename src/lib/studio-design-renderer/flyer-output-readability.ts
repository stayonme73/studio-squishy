/**
 * Body-copy readability at the intended output size.
 *
 * The existing floor is 14px on the canvas, which says nothing about what the
 * customer can read. Customer-One V19 set the line that explains what the Studio
 * sells at 18px on a 1536px-tall poster plate — about 9pt once the sheet is
 * printed — and passed every check. Size on the canvas is not size in the hand.
 *
 * Reference, stated openly: the Catalog promises one agreed size without fixed
 * inches, so this module does not claim a trim size. It grades type as if the
 * plate were output to fill a sheet of the documented reference height. That is a
 * readability reference, not a press specification.
 */

import type { DesignQualityFinding } from "@/lib/studio-kitchen-production/design-quality/types";

import {
  FLYER_FORMAT_SQUARE,
} from "./flyer-content-proportional-composition";
import type { FlyerDesignSpec, FlyerTextLayer, FlyerTextRole } from "./types";

/** 11in and 8in expressed in points, the height each plate is graded against. */
export const FLYER_READABILITY_REFERENCE = {
  posterSheetHeightPt: 792,
  squareSheetHeightPt: 576,
} as const;

/**
 * Smallest type the customer should have to read for copy that carries the
 * substance of the offer. 10pt is the low end of comfortable print body copy.
 */
export const MIN_BODY_COPY_POINT_SIZE = 10;
/** WCAG AA for normal-size text, applied to body copy against the plate behind it. */
export const MIN_BODY_COPY_CONTRAST_RATIO = 4.5;

/**
 * Roles whose job is to be read as prose. Secondary lines (dates, contact,
 * disclaimer) are conventionally set smaller and are not graded here.
 */
const PROSE_ROLES: readonly FlyerTextRole[] = ["body", "descriptor"];

export function referenceSheetHeightPt(canvasHeightPx: number): number {
  return canvasHeightPx === FLYER_FORMAT_SQUARE.heightPx
    ? FLYER_READABILITY_REFERENCE.squareSheetHeightPt
    : FLYER_READABILITY_REFERENCE.posterSheetHeightPt;
}

/** Type size as it lands at the intended output size, in points. */
export function effectiveOutputPointSize(
  fontSizePx: number,
  canvasHeightPx: number,
): number {
  const sheetHeightPt = referenceSheetHeightPt(canvasHeightPx);
  return (fontSizePx * sheetHeightPt) / Math.max(1, canvasHeightPx);
}

function relativeLuminance(hex: string): number {
  const normalized = hex.trim().replace(/^#/, "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : normalized;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value) || full.length !== 6) return 0;
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(
    (channel) => {
      const scaled = channel / 255;
      return scaled <= 0.03928
        ? scaled / 12.92
        : ((scaled + 0.055) / 1.055) ** 2.4;
    },
  );
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const lighter = Math.max(
    relativeLuminance(foregroundHex),
    relativeLuminance(backgroundHex),
  );
  const darker = Math.min(
    relativeLuminance(foregroundHex),
    relativeLuminance(backgroundHex),
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/** The fill the customer actually reads this line against. */
export function backdropFillFor(
  spec: FlyerDesignSpec,
  layer: FlyerTextLayer,
): string {
  const centerX = layer.x + layer.width / 2;
  const centerY = layer.y + layer.fontSizePx / 2;
  const backing = spec.layers
    .filter(
      (candidate): candidate is Extract<FlyerDesignSpec["layers"][number], { type: "shape" }> =>
        candidate.type === "shape",
    )
    .filter(
      (shape) =>
        centerX >= shape.x &&
        centerX <= shape.x + shape.width &&
        centerY >= shape.y &&
        centerY <= shape.y + shape.height,
    );
  return backing.at(-1)?.fill ?? spec.background.color;
}

function fail(id: string, message: string): DesignQualityFinding {
  return { id, severity: "fail", checkKind: "creative_quality", message };
}

/**
 * Grade prose copy at output size. Deterministic: same spec, same verdict.
 */
export function evaluateFlyerOutputReadability(
  spec: FlyerDesignSpec,
): DesignQualityFinding[] {
  const findings: DesignQualityFinding[] = [];
  const canvasHeightPx = spec.canvas.heightPx;
  const prose = spec.layers.filter(
    (layer): layer is FlyerTextLayer =>
      layer.type === "text" &&
      PROSE_ROLES.includes(layer.role) &&
      layer.content.trim().length > 0,
  );
  for (const layer of prose) {
    const points = effectiveOutputPointSize(layer.fontSizePx, canvasHeightPx);
    if (points < MIN_BODY_COPY_POINT_SIZE) {
      findings.push(
        fail(
          "body_copy_below_output_readability",
          `${layer.role} copy is set at ${layer.fontSizePx}px on a ${canvasHeightPx}px plate — about ${points.toFixed(1)}pt at the intended output size, below the ${MIN_BODY_COPY_POINT_SIZE}pt floor. The line carrying the substance of the offer must be readable in the customer's hand.`,
        ),
      );
    }
    const backdrop = backdropFillFor(spec, layer);
    const ratio = contrastRatio(layer.color, backdrop);
    if (ratio < MIN_BODY_COPY_CONTRAST_RATIO) {
      findings.push(
        fail(
          "body_copy_contrast_below_output_floor",
          `${layer.role} copy at ${layer.color} on ${backdrop} has ${ratio.toFixed(2)}:1 contrast, below the ${MIN_BODY_COPY_CONTRAST_RATIO}:1 floor.`,
        ),
      );
    }
  }
  return findings;
}
