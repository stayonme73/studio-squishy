/**
 * Measured vertical stacking for offer-led social posts (1024×1024).
 */

import {
  estimateTextLayerAabb,
  type TextLayerCollisionInput,
} from "./text-layer-collision";
import type { SocialPostTextLayer } from "./social-posts-types";

export const SOCIAL_POST_CANVAS_HEIGHT_PX = 1024;
export const SOCIAL_POST_STACK_GAP_PX = 20;
export const SOCIAL_POST_BOTTOM_MARGIN_PX = 24;

/** Vertical stack assigns `y`; callers supply layout fields only. */
export type StackTextSpec = Omit<SocialPostTextLayer, "type" | "y"> & {
  y?: SocialPostTextLayer["y"];
  skipWhenEmpty?: boolean;
};

export function stackTextLayersFromY(
  startY: number,
  specs: readonly StackTextSpec[],
  canvasHeightPx = SOCIAL_POST_CANVAS_HEIGHT_PX,
): { layers: SocialPostTextLayer[]; endY: number } | { ok: false; message: string } {
  let cursorY = startY;
  const layers: SocialPostTextLayer[] = [];

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
    };
    const box = estimateTextLayerAabb(input);
    if (box.bottom + SOCIAL_POST_BOTTOM_MARGIN_PX > canvasHeightPx) {
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
    cursorY = box.bottom + SOCIAL_POST_STACK_GAP_PX;
  }

  return { layers, endY: cursorY };
}
