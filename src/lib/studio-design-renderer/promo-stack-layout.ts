/**
 * Measured vertical stacking for offer-led promotion graphics (square + portrait).
 */

import {
  estimateTextLayerAabb,
  type TextLayerCollisionInput,
} from "./text-layer-collision";
import type { PromoTextLayer } from "./promo-types";

export const PROMO_STACK_GAP_PX = 16;
export const PROMO_SQUARE_CANVAS_HEIGHT_PX = 1024;
export const PROMO_PORTRAIT_CANVAS_HEIGHT_PX = 1536;
export const PROMO_STACK_BOTTOM_MARGIN_PX = 20;

export type PromoStackTextSpec = Omit<PromoTextLayer, "type"> & {
  skipWhenEmpty?: boolean;
  /** Collision estimate cap (default follows body/disclaimer rules in validate). */
  maxLines?: number;
};

export function stackPromoTextLayersFromY(
  startY: number,
  specs: readonly PromoStackTextSpec[],
  canvasHeightPx: number,
): { layers: PromoTextLayer[]; endY: number } | { ok: false; message: string } {
  let cursorY = startY;
  const layers: PromoTextLayer[] = [];

  for (const spec of specs) {
    const content = String(spec.content ?? "").trim();
    if (!content) {
      if (spec.skipWhenEmpty) continue;
      continue;
    }
    const input: TextLayerCollisionInput = {
      id: spec.id,
      x: spec.x,
      y: cursorY,
      width: spec.width,
      fontSizePx: spec.fontSizePx,
      lineHeight: spec.lineHeight ?? 1.2,
      content,
      maxLines: spec.maxLines,
    };
    const box = estimateTextLayerAabb(input);
    if (box.bottom + PROMO_STACK_BOTTOM_MARGIN_PX > canvasHeightPx) {
      return {
        ok: false,
        message: `Layout exceeds the ${canvasHeightPx}px canvas after ${spec.id} (bottom ${Math.round(box.bottom)}px).`,
      };
    }
    layers.push({
      type: "text",
      id: spec.id,
      role: spec.role,
      content,
      x: spec.x,
      y: cursorY,
      width: spec.width,
      fontSizePx: spec.fontSizePx,
      fontWeight: spec.fontWeight,
      lineHeight: spec.lineHeight,
      letterSpacingPx: spec.letterSpacingPx,
      color: spec.color,
      align: spec.align,
    });
    cursorY = box.bottom + PROMO_STACK_GAP_PX;
  }

  return { layers, endY: cursorY };
}

export function textLayerBottomY(
  layer: Pick<
    PromoTextLayer,
    "id" | "x" | "y" | "width" | "fontSizePx" | "lineHeight" | "content"
  >,
  options?: { maxLines?: number },
): number {
  return estimateTextLayerAabb({
    id: layer.id,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    fontSizePx: layer.fontSizePx,
    lineHeight: layer.lineHeight ?? 1.2,
    content: layer.content,
    maxLines: options?.maxLines,
  }).bottom;
}
