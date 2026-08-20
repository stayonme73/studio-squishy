/**
 * Pairwise AABB overlap among text layers — fail closed for customer art.
 * Borrows the menu-capture collision idea; uses estimated text boxes from
 * font metrics (no Playwright required at validate time).
 */

export type TextLayerCollisionInput = {
  id: string;
  x: number;
  y: number;
  width: number;
  fontSizePx: number;
  lineHeight: number;
  content: string;
  maxLines?: number;
  /** Explicit height when known (overrides estimate). */
  height?: number;
};

export type TextLayerAabb = {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type TextLayerCollision = {
  aId: string;
  bId: string;
  overlapPx: number;
};

export type TextLayerCollisionResult =
  | { ok: true }
  | {
      ok: false;
      code: "COLLISION" | "OVERLAP";
      message: string;
      collisions: readonly TextLayerCollision[];
    };

const DEFAULT_PAD_PX = 2;
const AVG_CHAR_WIDTH_FACTOR = 0.55;

export function estimateTextLayerLineCount(
  layer: Pick<
    TextLayerCollisionInput,
    "content" | "width" | "fontSizePx" | "maxLines"
  >,
): number {
  const content = String(layer.content ?? "").trim();
  if (!content) return 1;
  const avgChar = Math.max(4, layer.fontSizePx * AVG_CHAR_WIDTH_FACTOR);
  const charsPerLine = Math.max(1, Math.floor(layer.width / avgChar));
  const softWraps = content.split(/\n/).reduce((sum, part) => {
    const len = part.length || 1;
    return sum + Math.max(1, Math.ceil(len / charsPerLine));
  }, 0);
  const capped = layer.maxLines != null ? Math.min(softWraps, layer.maxLines) : softWraps;
  return Math.max(1, capped);
}

export function estimateTextLayerAabb(
  layer: TextLayerCollisionInput,
): TextLayerAabb {
  const lines = estimateTextLayerLineCount(layer);
  const height =
    layer.height ??
    layer.fontSizePx * layer.lineHeight * lines;
  return {
    id: layer.id,
    left: layer.x,
    top: layer.y,
    right: layer.x + layer.width,
    bottom: layer.y + height,
  };
}

function aabbOverlap(
  a: TextLayerAabb,
  b: TextLayerAabb,
  padPx: number,
): number {
  const overlapW =
    Math.min(a.right, b.right) - Math.max(a.left, b.left) - padPx;
  const overlapH =
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) - padPx;
  if (overlapW <= 0 || overlapH <= 0) return 0;
  return overlapW * overlapH;
}

/**
 * Pairwise AABB check among text layers.
 * Returns COLLISION / OVERLAP fail-closed when any pair overlaps.
 */
export function evaluateTextLayerCollisions(
  layers: readonly TextLayerCollisionInput[],
  options?: { padPx?: number },
): TextLayerCollisionResult {
  const padPx = options?.padPx ?? DEFAULT_PAD_PX;
  const boxes = layers
    .filter((l) => String(l.content ?? "").trim().length > 0)
    .map(estimateTextLayerAabb);
  const collisions: TextLayerCollision[] = [];

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      const area = aabbOverlap(a, b, padPx);
      if (area > 0) {
        collisions.push({ aId: a.id, bId: b.id, overlapPx: Math.round(area) });
      }
    }
  }

  if (collisions.length === 0) {
    return { ok: true };
  }

  const detail = collisions
    .map((c) => `${c.aId}/${c.bId}(${c.overlapPx}px)`)
    .join("; ");
  return {
    ok: false,
    code: "COLLISION",
    message: `OVERLAP: text layers collide — ${detail}`,
    collisions,
  };
}

export function assertNoTextLayerCollisions(
  layers: readonly TextLayerCollisionInput[],
  options?: { padPx?: number },
): void {
  const result = evaluateTextLayerCollisions(layers, options);
  if (!result.ok) {
    throw new Error(`${result.code}: ${result.message}`);
  }
}

/** Map common design-renderer text layers into collision inputs. */
export function textLayersForCollisionCheck(
  layers: readonly {
    type: string;
    id: string;
    role?: string;
    x: number;
    y: number;
    width: number;
    fontSizePx?: number;
    lineHeight?: number;
    content?: string;
    maxLines?: number;
    height?: number;
  }[],
): TextLayerCollisionInput[] {
  return layers
    .filter((l) => l.type === "text")
    .map((l) => {
      const role = l.role ?? "";
      // Body / disclaimer may wrap; other roles are intended single-line stacks.
      const defaultMax =
        role === "body" || role === "disclaimer" || role === "headline"
          ? 4
          : 1;
      return {
        id: l.id,
        x: l.x,
        y: l.y,
        width: l.width,
        fontSizePx: l.fontSizePx ?? 16,
        lineHeight: l.lineHeight ?? 1.2,
        content: l.content ?? "",
        maxLines: l.maxLines ?? defaultMax,
        height: l.height,
      };
    });
}
