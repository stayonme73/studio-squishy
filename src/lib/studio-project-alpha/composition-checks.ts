/**
 * Deterministic composition checks for image_plus_renderer.
 *
 * The Creative Director is a model, and a model can be talked out of its opinion
 * or can simply have a good day on bad work. These checks cannot: they measure
 * the composed geometry and the generated pixels. Anything they catch is a hard
 * reject regardless of what the vision pass says.
 *
 * Two halves:
 * - geometry, from the composed spec (dock placement, obstruction, dead space)
 * - pixels, from the generated visual (flat field, uniform dead regions)
 */

import path from "path";

import sharp from "sharp";

import { evaluateLayoutFamilyAgreement } from "@/lib/studio-design-intelligence/hybrid-layout-signatures";
import type { DesignLayoutFamilyId } from "@/lib/studio-design-intelligence/types";
import type {
  FlyerDesignSpec,
  FlyerTextLayer,
} from "@/lib/studio-design-renderer/types";
import type { DesignQualityFinding } from "@/lib/studio-kitchen-production/design-quality/types";

import { estimateTextLayerHeight } from "./compose-hybrid";

export type CompositionFinding = {
  code: string;
  message: string;
};

export type CompositionCheckResult = {
  ok: boolean;
  findings: CompositionFinding[];
  /** Measurements kept for the proof record, pass or fail. */
  measured: Record<string, number>;
};

const GENERATED_HERO_LAYER_ID = "generated-hero";
const TYPE_DOCK_LAYER_ID = "offer-panel";

/** A dock taller than this share of the canvas hides the visual it sits on. */
const MAX_DOCK_SHARE_OF_CANVAS = 0.75;
/** Emptiness inside the dock beyond this share of canvas height reads as unfinished. */
const MAX_DEAD_SPACE_SHARE_OF_CANVAS = 0.12;
/** A gap between consecutive lockup lines beyond this share reads as a hole. */
const MAX_INTERNAL_GAP_SHARE_OF_CANVAS = 0.1;
/** Smallest type the customer should be asked to read on a printed flyer. */
const MIN_READABLE_FONT_PX = 14;

type Rect = { x: number; y: number; width: number; height: number };

/** Text layers derive height from type metrics; every other layer declares it. */
function declaredHeight(layer: FlyerDesignSpec["layers"][number]): number {
  if (layer.type === "text") return estimateTextLayerHeight(layer);
  return "height" in layer && typeof layer.height === "number" ? layer.height : 0;
}

function textRect(layer: FlyerTextLayer): Rect {
  return {
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: estimateTextLayerHeight(layer),
  };
}

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/**
 * Grade the composed layout. No provider calls, no model opinion — the same spec
 * always grades the same way.
 */
export function checkHybridComposition(
  spec: FlyerDesignSpec,
): CompositionCheckResult {
  const findings: CompositionFinding[] = [];
  const W = spec.canvas.widthPx;
  const H = spec.canvas.heightPx;
  const canvas: Rect = { x: 0, y: 0, width: W, height: H };

  const textLayers = spec.layers.filter(
    (layer): layer is FlyerTextLayer => layer.type === "text",
  );
  const hero = spec.layers.find((layer) => layer.id === GENERATED_HERO_LAYER_ID);
  const dock = spec.layers.find((layer) => layer.id === TYPE_DOCK_LAYER_ID);

  if (!hero) {
    findings.push({
      code: "generated_layer_missing",
      message:
        "Composed spec carries no generated visual layer — this is not an image_plus_renderer artifact.",
    });
  } else if (
    hero.x > 0 ||
    hero.y > 0 ||
    hero.width < W ||
    declaredHeight(hero) < H
  ) {
    findings.push({
      code: "generated_layer_does_not_fill_canvas",
      message: `Generated visual covers ${hero.width}x${declaredHeight(hero)} at (${hero.x},${hero.y}) instead of the full ${W}x${H} canvas, leaving bare plate showing.`,
    });
  }

  const rects = textLayers.map((layer) => ({ layer, rect: textRect(layer) }));

  for (const { layer, rect } of rects) {
    if (!contains(canvas, rect)) {
      findings.push({
        code: "text_outside_canvas",
        message: `Text layer ${layer.id} (${layer.role}) extends outside the canvas — customer facts would be clipped.`,
      });
    }
    if (layer.fontSizePx < MIN_READABLE_FONT_PX) {
      findings.push({
        code: "text_below_readable_size",
        message: `Text layer ${layer.id} (${layer.role}) is set at ${layer.fontSizePx}px, below the ${MIN_READABLE_FONT_PX}px readable floor.`,
      });
    }
  }

  // Dock placement: every line of the lockup must actually sit on the dock, or
  // the type is floating on raw photography and readability is luck.
  let dockShare = 0;
  if (!dock) {
    if (rects.length > 0) {
      findings.push({
        code: "type_dock_missing",
        message:
          "Composed spec has renderer-owned text but no type dock behind it — text would sit directly on generated pixels.",
      });
    }
  } else {
    const dockRect: Rect = {
      x: dock.x,
      y: dock.y,
      width: dock.width,
      height: declaredHeight(dock),
    };
    dockShare = dockRect.height / H;
    const unbacked = rects.filter(({ rect }) => !contains(dockRect, rect));
    if (unbacked.length > 0) {
      findings.push({
        code: "type_dock_does_not_back_text",
        message: `Type dock does not cover ${unbacked.length} text layer(s): ${unbacked
          .map(({ layer }) => `${layer.id}(${layer.role})`)
          .join(", ")}.`,
      });
    }
    if (dockShare > MAX_DOCK_SHARE_OF_CANVAS) {
      findings.push({
        code: "type_dock_swallows_canvas",
        message: `Type dock covers ${(dockShare * 100).toFixed(0)}% of the canvas — the generated visual is mostly hidden, which is words on a background.`,
      });
    }
    if (!contains(canvas, dockRect)) {
      findings.push({
        code: "type_dock_outside_canvas",
        message: "Type dock extends past the canvas edge.",
      });
    }

    // Dead space: unused dock area below the last line.
    const lockupBottom = rects.reduce(
      (bottom, { rect }) => Math.max(bottom, rect.y + rect.height),
      dockRect.y,
    );
    const trailing = dockRect.y + dockRect.height - lockupBottom;
    if (trailing / H > MAX_DEAD_SPACE_SHARE_OF_CANVAS) {
      findings.push({
        code: "dead_space_in_type_dock",
        message: `${trailing}px of empty dock below the last line (${((trailing / H) * 100).toFixed(0)}% of canvas height) reads as unfinished.`,
      });
    }
  }

  // Obstruction: anything painted after a text layer that overlaps it.
  const firstTextIndex = spec.layers.findIndex((layer) => layer.type === "text");
  if (firstTextIndex >= 0) {
    spec.layers.forEach((layer, index) => {
      if (index <= firstTextIndex) return;
      if (layer.type === "text") return;
      const rect: Rect = {
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: declaredHeight(layer),
      };
      if (rect.width <= 0 || rect.height <= 0) return;
      const hit = rects.filter(({ rect: textArea }) => overlaps(rect, textArea));
      if (hit.length > 0) {
        findings.push({
          code: "text_obstructed_by_layer",
          message: `Layer ${layer.id} paints over ${hit
            .map(({ layer: textLayer }) => `${textLayer.id}(${textLayer.role})`)
            .join(", ")}.`,
        });
      }
    });
  }

  // Text colliding with text.
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const left = rects[i]!;
      const right = rects[j]!;
      if (overlaps(left.rect, right.rect)) {
        findings.push({
          code: "text_overlaps_text",
          message: `Text layers ${left.layer.id}(${left.layer.role}) and ${right.layer.id}(${right.layer.role}) overlap.`,
        });
      }
    }
  }

  // Holes inside the lockup.
  const ordered = [...rects].sort((a, b) => a.rect.y - b.rect.y);
  let largestGap = 0;
  for (let i = 1; i < ordered.length; i += 1) {
    const previous = ordered[i - 1]!.rect;
    const next = ordered[i]!.rect;
    const gap = next.y - (previous.y + previous.height);
    if (gap > largestGap) largestGap = gap;
  }
  if (largestGap / H > MAX_INTERNAL_GAP_SHARE_OF_CANVAS) {
    findings.push({
      code: "dead_gap_between_text",
      message: `${largestGap}px hole between lockup lines (${((largestGap / H) * 100).toFixed(0)}% of canvas height).`,
    });
  }

  return {
    ok: findings.length === 0,
    findings,
    measured: {
      textLayers: rects.length,
      dockShareOfCanvas: Math.round(dockShare * 1000) / 1000,
      largestInternalGapPx: largestGap,
    },
  };
}

/**
 * Does the composed artifact actually show the layout family the route chose?
 *
 * V18 (`type_led_premium`) and V19 (`editorial_split`) were the same composition
 * to within a pixel. The reasoner was picking a label. This check makes the label
 * a claim the artwork has to honour.
 */
export function evaluateHybridLayoutFamilyAgreement(
  spec: FlyerDesignSpec,
): DesignQualityFinding[] {
  const familyId = spec.creativeDirection?.layoutFamilyId as
    | DesignLayoutFamilyId
    | undefined;
  if (!familyId) return [];
  const W = spec.canvas.widthPx;
  const H = spec.canvas.heightPx;
  const dock = spec.layers.find((layer) => layer.id === TYPE_DOCK_LAYER_ID);
  if (!dock || dock.type !== "shape") return [];
  const rail = spec.layers.some(
    (layer) =>
      layer.type === "shape" &&
      layer.id !== TYPE_DOCK_LAYER_ID &&
      layer.height >= H * 0.9 &&
      layer.width <= W * 0.15,
  );
  const textLayers = spec.layers.filter(
    (layer): layer is FlyerTextLayer => layer.type === "text",
  );
  const aligns = new Set(textLayers.map((layer) => layer.align));
  const textAlign =
    aligns.size === 1 ? [...aligns][0]! : ("left" as FlyerTextLayer["align"]);
  const agreement = evaluateLayoutFamilyAgreement({
    canvasWidthPx: W,
    canvasHeightPx: H,
    layoutFamilyId: familyId,
    plate: { x: dock.x, y: dock.y, width: dock.width, height: dock.height },
    textAlign,
    hasFullHeightRail: rail,
    typeSizes: {
      headlinePx: textLayers.find((layer) => layer.role === "headline")?.fontSizePx,
      wordmarkPx: textLayers.find((layer) => layer.role === "wordmark")?.fontSizePx,
    },
  });
  return agreement.findings.map((finding) => ({
    id: finding.code,
    severity: "fail" as const,
    checkKind: "creative_quality" as const,
    message: finding.message,
  }));
}

/** Below this entropy the generated field carries almost no visual information. */
const MIN_GENERATED_FIELD_ENTROPY = 1.5;
/** Below this standard deviation the field is effectively one flat tone. */
const MIN_GENERATED_FIELD_STDEV = 6;
/** A grid cell flatter than this is a uniform patch. */
const MAX_UNIFORM_CELL_STDEV = 3;
/** Share of uniform cells that turns "negative space" into "dead canvas". */
const MAX_UNIFORM_CELL_SHARE = 0.25;
const GRID_COLUMNS = 3;
const GRID_ROWS = 4;

/**
 * Grade the generated pixels themselves. Catches the flat-field and large-dead-
 * region failures without asking a model's opinion.
 */
export async function checkGeneratedFieldPixels(input: {
  repoRoot: string;
  relativePath: string;
}): Promise<CompositionCheckResult> {
  const absolute = path.join(input.repoRoot, input.relativePath);
  const image = sharp(absolute);
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const findings: CompositionFinding[] = [];

  const stats = await image.stats();
  const colorChannels = stats.channels.slice(0, 3);
  const meanStdev =
    colorChannels.reduce((sum, channel) => sum + channel.stdev, 0) /
    Math.max(1, colorChannels.length);
  const entropy = stats.entropy;

  if (entropy < MIN_GENERATED_FIELD_ENTROPY) {
    findings.push({
      code: "generated_field_is_flat",
      message: `Generated visual entropy ${entropy.toFixed(2)} is below ${MIN_GENERATED_FIELD_ENTROPY} — the field carries almost no visual information.`,
    });
  }
  if (meanStdev < MIN_GENERATED_FIELD_STDEV) {
    findings.push({
      code: "generated_field_is_one_tone",
      message: `Generated visual colour deviation ${meanStdev.toFixed(2)} is below ${MIN_GENERATED_FIELD_STDEV} — effectively a single flat tone.`,
    });
  }

  // Region analysis walks the decoded pixels directly. sharp's `stats()` reports
  // on the input image and ignores a queued `extract()`, so per-cell stats taken
  // that way silently describe the whole canvas and every region looks lively.
  let uniformCells = 0;
  const totalCells = GRID_COLUMNS * GRID_ROWS;
  if (width > GRID_COLUMNS && height > GRID_ROWS) {
    const { data, info } = await sharp(absolute)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    const cellWidth = Math.floor(width / GRID_COLUMNS);
    const cellHeight = Math.floor(height / GRID_ROWS);
    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let column = 0; column < GRID_COLUMNS; column += 1) {
        let sum = 0;
        let sumSquares = 0;
        let samples = 0;
        for (let y = row * cellHeight; y < (row + 1) * cellHeight; y += 1) {
          for (let x = column * cellWidth; x < (column + 1) * cellWidth; x += 1) {
            const base = (y * width + x) * channels;
            for (let channel = 0; channel < Math.min(3, channels); channel += 1) {
              const value = data[base + channel] ?? 0;
              sum += value;
              sumSquares += value * value;
              samples += 1;
            }
          }
        }
        if (samples === 0) continue;
        const mean = sum / samples;
        const variance = Math.max(0, sumSquares / samples - mean * mean);
        if (Math.sqrt(variance) < MAX_UNIFORM_CELL_STDEV) uniformCells += 1;
      }
    }
  }
  const uniformShare = uniformCells / totalCells;
  if (uniformShare > MAX_UNIFORM_CELL_SHARE) {
    findings.push({
      code: "generated_field_dead_regions",
      message: `${uniformCells} of ${totalCells} regions of the generated visual are near-uniform (${(uniformShare * 100).toFixed(0)}%) — that is dead canvas, not negative space.`,
    });
  }

  return {
    ok: findings.length === 0,
    findings,
    measured: {
      widthPx: width,
      heightPx: height,
      entropy: Math.round(entropy * 1000) / 1000,
      meanChannelStdev: Math.round(meanStdev * 1000) / 1000,
      uniformCells,
      uniformCellShare: Math.round(uniformShare * 1000) / 1000,
    },
  };
}
