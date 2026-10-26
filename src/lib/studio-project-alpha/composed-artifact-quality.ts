/**
 * Creative-quality gates that read the rendered artifact, not the declared spec.
 *
 * A full-canvas generated hero *claims* the whole canvas, so every spec-level
 * occupancy check reports the format as fully used even when a third of the
 * pixels came back empty. Customer-One V19 passed every declared check with a
 * dead black void across the bottom 35% of the flyer.
 *
 * Two lessons are built into this module:
 *
 * 1. **Coverage is measured, never declared.** A first version of this gate asked
 *    the spec which rectangles were "doing a job" and excluded them from the dead
 *    canvas measure. An independent reviewer broke it in one move: add a
 *    fully transparent rectangle over the void and the artifact passed. Coverage
 *    is now the difference between the composed pixels and the generated pixels —
 *    what the renderer actually painted. An invisible layer paints nothing, so it
 *    hides nothing.
 * 2. **Dark is not the same as dead, and noise is not the same as material.**
 *    Per-pixel contrast let a near-black noise field read as worked material,
 *    while a deliberate charcoal gradient read as a void. Structure is now
 *    measured on a blurred copy, at the scale a person sees, and a region whose
 *    luminance genuinely ramps is a graded field rather than a hole.
 *
 * Both measures are deterministic: the same PNG measures the same way every
 * time, so a REJECT here is not a model's opinion and cannot be argued out of.
 */

import { existsSync } from "node:fs";
import path from "path";

import sharp from "sharp";

import type { FlyerDesignSpec } from "@/lib/studio-design-renderer/types";

import type { CompositionCheckResult, CompositionFinding } from "./composition-checks";

/** Analysis cell. 32px on the 1024x1536 plate is a 32x48 grid. */
const CELL_PX = 32;

/**
 * Blur radius applied before structure is measured. Pixel-level grain is not
 * design material — it is film noise — and measuring adjacent-pixel deltas let a
 * near-black noise field claim to be a worked image. At this radius a silhouette,
 * an edge of light, or an object boundary survives; grain does not.
 */
const STRUCTURE_BLUR_SIGMA = 3;

/**
 * How far a cell's luminance must move between the generated image and the
 * composed artifact before the renderer counts as having painted there. Well
 * below the change any real plate, rail, rule, or line of type makes, and well
 * above PNG round-tripping and resampling.
 */
const MIN_COVER_LUMINANCE_DELTA = 4;

/**
 * Inertness thresholds, calibrated against every composed hybrid artifact in the
 * repo (`scripts/creative-quality-gate-calibration.mts`). A cell is inert only
 * when it is simultaneously dark and structureless at viewing scale.
 */
const MAX_INERT_CELL_LUMINANCE = 26;
const MAX_INERT_CELL_STDEV = 7;
const MAX_INERT_CELL_EDGE_ENERGY = 2.2;

/**
 * A dark region that genuinely ramps is a graded field — a deliberate choice, and
 * one the Studio should be able to sell. A region whose cell luminances span less
 * than this is flat: not lit, not shaped, not going anywhere.
 *
 * Measured (`scripts/creative-quality-gate-blur-probe.mts`): a synthetic charcoal
 * ramp spans 34 levels; per-pixel grain over black spans 0.5; Customer-One V19's
 * void spans 9.5 while V18's dark-but-worked lower half spans 15.1.
 *
 * KNOWN LIMIT — thin margin. This single number is what separates reject from pass
 * on the large-region rule, and the gap between the two real artifacts is 5.6
 * levels on a corpus of seven. It is not a wide safety margin and a near-miss dark
 * field will land on either side of it somewhat arbitrarily. The gate that carries
 * V19's actual defect (an empty band below the lockup) is separated on two
 * independent measurements and is the stronger of the two. Widen this corpus before
 * treating this constant as settled.
 */
const MIN_GRADED_REGION_LUMINANCE_SPAN = 12;

/**
 * Luminance at which a cell is carrying something a person can see on the page.
 * Not a design opinion — 30 of 255 is roughly where a dark region stops reading as
 * black paper under normal viewing.
 */
const VISIBLE_CELL_LUMINANCE = 30;

/**
 * The band below the lockup is rescued by carrying real material: a silhouette
 * against a dark ground is not a hole. Below this share of visible cells there is
 * nothing down there to see. Measured: V16 0.125 and V18 0.037 both carry light
 * below the lockup; V19 carries 0.000.
 */
const MIN_VISIBLE_CELL_SHARE_BELOW_LOCKUP = 0.01;

/**
 * Ninetieth-percentile luminance below which the band under the lockup is not
 * merely dark but empty. Measured below the lockup: V19 4.3, V18 19.1, V16 37.9.
 */
const MAX_EMPTY_BELOW_LOCKUP_P90_LUMINANCE = 12;

/**
 * Rejection thresholds, stated as standards rather than fitted to one artifact:
 * no single contiguous region without subject, text, or light may exceed a quarter
 * of the artifact, and the area below the lockup may not be empty.
 *
 * Size alone does not reject. Every Customer-One artifact is a dark interior, and
 * on that corpus 65–77% of cells read dark-and-smooth whether the artifact is
 * sellable or not — so a region must be large **and** flat **and** carry nothing
 * visible. The figures behind the flatness and visibility constants are recorded
 * on those constants.
 */
const MAX_LARGEST_INERT_REGION_SHARE = 0.25;
const MAX_INERT_SHARE_BELOW_LOCKUP = 0.9;
/** Below this the area under the lockup is a margin, not a region worth grading. */
const MIN_GRADED_BELOW_LOCKUP_SHARE = 0.12;

/**
 * Obstruction thresholds.
 *
 * The first version measured only edge energy and missed the defect it was built
 * for: on Customer-One V19 the plate cuts through the desk and monitor, but the
 * wall behind them carries more *texture* than the subject does, so the plate
 * scored 1.24x average detail and passed. In a dark photograph the subject is
 * where the light is, so light is measured too — the share of the image's
 * above-median luminance that the plate covers.
 */
const MAX_DETAIL_CONCENTRATION_UNDER_PLATE = 2;
const MAX_LIGHT_CONCENTRATION_UNDER_PLATE = 1.6;
const MAX_TOP_DECILE_DETAIL_COVERED_SHARE = 0.5;

type CellGrid = {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  /** Cell mean luminance, from the unblurred image. */
  luminance: Float64Array;
  /** Within-cell variation, measured at viewing scale. */
  stdev: Float64Array;
  /** Neighbour-pixel gradient, measured at viewing scale. */
  edge: Float64Array;
};

type LoadedGrid = {
  grid: CellGrid;
  widthPx: number;
  heightPx: number;
  meanLuminance: number;
};

function luminanceBuffer(
  data: Buffer,
  channels: number,
  pixels: number,
): { luma: Float64Array; sum: number } {
  const luma = new Float64Array(pixels);
  let sum = 0;
  for (let index = 0; index < pixels; index += 1) {
    const base = index * channels;
    const value =
      0.2126 * (data[base] ?? 0) +
      0.7152 * (data[base + 1] ?? 0) +
      0.0722 * (data[base + 2] ?? 0);
    luma[index] = value;
    sum += value;
  }
  return { luma, sum };
}

/**
 * Grid an image. Cell means come from the image as rendered; structure comes from
 * a blurred copy, so grain cannot masquerade as content.
 *
 * `resizeTo` scales the source before measuring, which is how the generated layer
 * is compared cell-for-cell against the composed artifact.
 */
async function readLuminanceGrid(
  absolutePath: string,
  resizeTo?: { widthPx: number; heightPx: number },
): Promise<LoadedGrid> {
  const base = sharp(absolutePath).removeAlpha();
  const sized = resizeTo
    ? base.resize(resizeTo.widthPx, resizeTo.heightPx, { fit: "fill" })
    : base;
  const sharpBuffer = await sized
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const blurredBuffer = await sized
    .clone()
    .blur(STRUCTURE_BLUR_SIGMA)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const widthPx = sharpBuffer.info.width;
  const heightPx = sharpBuffer.info.height;
  const pixels = widthPx * heightPx;
  const sharpLuma = luminanceBuffer(sharpBuffer.data, sharpBuffer.info.channels, pixels);
  const blurred = luminanceBuffer(
    blurredBuffer.data,
    blurredBuffer.info.channels,
    pixels,
  );

  const columns = Math.max(1, Math.floor(widthPx / CELL_PX));
  const rows = Math.max(1, Math.floor(heightPx / CELL_PX));
  const cellWidth = Math.floor(widthPx / columns);
  const cellHeight = Math.floor(heightPx / rows);
  const luminance = new Float64Array(columns * rows);
  const stdev = new Float64Array(columns * rows);
  const edge = new Float64Array(columns * rows);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x0 = column * cellWidth;
      const y0 = row * cellHeight;
      const x1 = Math.min(widthPx, x0 + cellWidth);
      const y1 = Math.min(heightPx, y0 + cellHeight);
      let sum = 0;
      let blurSum = 0;
      let blurSquares = 0;
      let samples = 0;
      let gradient = 0;
      let gradientSamples = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const index = y * widthPx + x;
          sum += sharpLuma.luma[index]!;
          const value = blurred.luma[index]!;
          blurSum += value;
          blurSquares += value * value;
          samples += 1;
          if (x + 1 < x1) {
            gradient += Math.abs(blurred.luma[index + 1]! - value);
            gradientSamples += 1;
          }
          if (y + 1 < y1) {
            gradient += Math.abs(blurred.luma[index + widthPx]! - value);
            gradientSamples += 1;
          }
        }
      }
      const index = row * columns + column;
      if (samples === 0) continue;
      luminance[index] = sum / samples;
      const blurMean = blurSum / samples;
      stdev[index] = Math.sqrt(Math.max(0, blurSquares / samples - blurMean * blurMean));
      edge[index] = gradientSamples === 0 ? 0 : gradient / gradientSamples;
    }
  }

  return {
    grid: { columns, rows, cellWidth, cellHeight, luminance, stdev, edge },
    widthPx,
    heightPx,
    meanLuminance: sharpLuma.sum / Math.max(1, pixels),
  };
}

/** Percentile of a numeric sample. */
/**
 * Share of the *unpainted* cells inside a region's bounding box that reach a
 * brightness a person can see. Used to tell a silhouette from a void: both are
 * mostly dark cells, but only one has something lit sitting inside the area they
 * surround. Painted cells are excluded — the type plate is already counted as
 * content, and including it would let a bright plate vouch for an empty image.
 */
function visibleShareWithinExtent(
  grid: CellGrid,
  members: number[],
  columns: number,
  covered: Uint8Array,
): number {
  if (members.length === 0) return 0;
  let minRow = Number.POSITIVE_INFINITY;
  let maxRow = Number.NEGATIVE_INFINITY;
  let minColumn = Number.POSITIVE_INFINITY;
  let maxColumn = Number.NEGATIVE_INFINITY;
  for (const index of members) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    if (row < minRow) minRow = row;
    if (row > maxRow) maxRow = row;
    if (column < minColumn) minColumn = column;
    if (column > maxColumn) maxColumn = column;
  }
  let cells = 0;
  let visible = 0;
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      const index = row * columns + column;
      if (covered[index] === 1) continue;
      cells += 1;
      if (grid.luminance[index]! >= VISIBLE_CELL_LUMINANCE) visible += 1;
    }
  }
  return cells === 0 ? 0 : visible / cells;
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round(fraction * (sorted.length - 1))),
  );
  return sorted[index]!;
}

function generatedLayerPath(
  repoRoot: string,
  spec: FlyerDesignSpec,
): string | null {
  const material = spec.materials.find(
    (candidate) => candidate.materialId === "hybrid-generated-visual",
  );
  if (!material) return null;
  const resolved = path.join(repoRoot, material.relativePath);
  // A spec can name a generated layer that is not on disk — a synthetic fixture,
  // a spec read out of one render directory and graded against another. Report the
  // absence so the caller falls back to declared geometry instead of throwing.
  return existsSync(resolved) ? resolved : null;
}

export type ComposedCanvasVitality = {
  widthPx: number;
  heightPx: number;
  cellPx: number;
  totalCells: number;
  /** Cells where the renderer measurably painted over the generated image. */
  coveredCells: number;
  coveredShare: number;
  inertCells: number;
  /** Inert share of the cells the composition left to the generated image. */
  inertCellShare: number;
  largestInertRegionCells: number;
  /** Largest contiguous inert region as a share of the whole canvas area. */
  largestInertRegionShareOfCanvas: number;
  /** Luminance span across that region — a ramp is a graded field, not a hole. */
  largestInertRegionLuminanceSpan: number;
  /** Share of that region carrying luminance a person can see. */
  largestInertRegionVisibleShare: number;
  /** Ninetieth-percentile luminance below the lockup. */
  belowLockupP90Luminance: number;
  /** Share of the band below the lockup carrying visible luminance. */
  belowLockupVisibleShare: number;
  /** Tallest run of rows that are inert edge to edge, as a share of height. */
  tallestInertBandShareOfHeight: number;
  /** Inert share of the canvas below the lowest painted row. */
  inertShareBelowLockup: number;
  /** How much canvas lies below the lockup at all — a thin margin is not graded. */
  belowLockupShareOfCanvas: number;
  /** Bottom of the painted lockup in canvas pixels, derived from pixels. */
  lockupBottomPx: number;
  meanLuminance: number;
  /** True when coverage had to fall back to declared geometry. */
  coverageFromDeclaredGeometry: boolean;
  /** Calibration aid: distribution of the uncovered cells. */
  uncoveredCellStats: {
    luminanceP10: number;
    luminanceP50: number;
    luminanceP90: number;
    stdevP10: number;
    stdevP50: number;
    edgeP10: number;
    edgeP50: number;
  };
};

/**
 * Grade the composed pixels. Emptiness is measured where the composition left the
 * generated image visible; area the renderer actually painted is doing a job and
 * is never counted as dead.
 */
export async function measureComposedCanvasVitality(input: {
  repoRoot: string;
  composedAbsolutePath: string;
  generatedAbsolutePath?: string | null;
  spec: FlyerDesignSpec;
}): Promise<ComposedCanvasVitality> {
  const composed = await readLuminanceGrid(input.composedAbsolutePath);
  const { grid, widthPx, heightPx, meanLuminance } = composed;
  const { columns, rows, cellWidth, cellHeight } = grid;

  const generatedPath =
    input.generatedAbsolutePath ?? generatedLayerPath(input.repoRoot, input.spec);
  const generated = generatedPath
    ? await readLuminanceGrid(generatedPath, { widthPx, heightPx })
    : null;

  const covered = new Uint8Array(columns * rows);
  let coveredCells = 0;
  if (generated) {
    // Painted, not declared: the difference between what the image gave us and
    // what the customer receives.
    for (let index = 0; index < columns * rows; index += 1) {
      const delta = Math.abs(grid.luminance[index]! - generated.grid.luminance[index]!);
      if (delta >= MIN_COVER_LUMINANCE_DELTA) {
        covered[index] = 1;
        coveredCells += 1;
      }
    }
  } else {
    // No generated layer to difference against (non-hybrid or a missing file).
    // Fall back to declared geometry, and say so in the result rather than
    // silently reporting a weaker measurement as the same thing.
    //
    // Image layers are excluded deliberately. Coverage means marks the renderer
    // added on top of the field; the hybrid `generated-hero` layer *is* the field
    // and declares the whole canvas. Counting it would report every artifact as
    // fully painted and this gate would pass anything handed to it.
    for (const layer of input.spec.layers) {
      if (layer.type === "image") continue;
      const width = layer.width;
      const height =
        layer.type === "text" ? layer.fontSizePx * layer.lineHeight : layer.height;
      if (width <= 0 || height <= 0) continue;
      const scaleX = widthPx / Math.max(1, input.spec.canvas.widthPx);
      const scaleY = heightPx / Math.max(1, input.spec.canvas.heightPx);
      const x0 = layer.x * scaleX;
      const y0 = layer.y * scaleY;
      const x1 = x0 + width * scaleX;
      const y1 = y0 + height * scaleY;
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const index = row * columns + column;
          if (covered[index] === 1) continue;
          const centerX = column * cellWidth + cellWidth / 2;
          const centerY = row * cellHeight + cellHeight / 2;
          if (centerX < x0 || centerX > x1 || centerY < y0 || centerY > y1) continue;
          covered[index] = 1;
          coveredCells += 1;
        }
      }
    }
  }

  const inert = new Uint8Array(columns * rows);
  const uncoveredLuminance: number[] = [];
  const uncoveredStdev: number[] = [];
  const uncoveredEdge: number[] = [];
  let inertCells = 0;
  for (let index = 0; index < columns * rows; index += 1) {
    if (covered[index] === 1) continue;
    uncoveredLuminance.push(grid.luminance[index]!);
    uncoveredStdev.push(grid.stdev[index]!);
    uncoveredEdge.push(grid.edge[index]!);
    if (
      grid.luminance[index]! <= MAX_INERT_CELL_LUMINANCE &&
      grid.stdev[index]! <= MAX_INERT_CELL_STDEV &&
      grid.edge[index]! <= MAX_INERT_CELL_EDGE_ENERGY
    ) {
      inert[index] = 1;
      inertCells += 1;
    }
  }

  // Largest contiguous inert region, 4-connected flood fill.
  const seen = new Uint8Array(columns * rows);
  let largestInertRegionCells = 0;
  let largestRegionLuminances: number[] = [];
  let largestRegionMembers: number[] = [];
  const stack: number[] = [];
  for (let start = 0; start < columns * rows; start += 1) {
    if (inert[start] !== 1 || seen[start] === 1) continue;
    const members: number[] = [];
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length > 0) {
      const index = stack.pop()!;
      members.push(index);
      const row = Math.floor(index / columns);
      const column = index % columns;
      const neighbours = [
        column > 0 ? index - 1 : -1,
        column < columns - 1 ? index + 1 : -1,
        row > 0 ? index - columns : -1,
        row < rows - 1 ? index + columns : -1,
      ];
      for (const neighbour of neighbours) {
        if (neighbour < 0) continue;
        if (inert[neighbour] !== 1 || seen[neighbour] === 1) continue;
        seen[neighbour] = 1;
        stack.push(neighbour);
      }
    }
    if (members.length > largestInertRegionCells) {
      largestInertRegionCells = members.length;
      largestRegionLuminances = members.map((index) => grid.luminance[index]!);
      largestRegionMembers = members;
    }
  }
  const largestInertRegionLuminanceSpan =
    largestRegionLuminances.length === 0
      ? 0
      : percentile(largestRegionLuminances, 0.9) -
        percentile(largestRegionLuminances, 0.1);
  // Visible light is measured across the region's *extent*, not its member cells:
  // an inert cell is dark by definition, so asking whether the members are bright
  // can only ever answer no. What matters is whether anything a person can see
  // falls inside the area the region occupies — a lit subject with dark cells
  // wrapped around it is a silhouette, not a hole.
  const largestInertRegionVisibleShare = visibleShareWithinExtent(
    grid,
    largestRegionMembers,
    columns,
    covered,
  );

  // Tallest band of rows that are inert across the full width.
  let tallestInertBandRows = 0;
  let runRows = 0;
  for (let row = 0; row < rows; row += 1) {
    let rowIsInert = true;
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (covered[index] === 1 || inert[index] === 1) continue;
      rowIsInert = false;
      break;
    }
    if (rowIsInert) {
      runRows += 1;
      if (runRows > tallestInertBandRows) tallestInertBandRows = runRows;
    } else {
      runRows = 0;
    }
  }

  // Lockup bottom from painted pixels, not from a declared rectangle. An
  // oversized text layer cannot push this down to shrink the area being graded.
  let lastPaintedRow = -1;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (covered[row * columns + column] === 1) {
        lastPaintedRow = row;
        break;
      }
    }
  }
  const lockupBottomPx = lastPaintedRow < 0 ? 0 : (lastPaintedRow + 1) * cellHeight;

  let belowCells = 0;
  let belowInert = 0;
  const belowLuminances: number[] = [];
  for (let row = lastPaintedRow + 1; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (covered[index] === 1) continue;
      belowCells += 1;
      belowLuminances.push(grid.luminance[index]!);
      if (inert[index] === 1) belowInert += 1;
    }
  }
  const belowLockupP90Luminance = percentile(belowLuminances, 0.9);
  const belowLockupVisibleShare =
    belowLuminances.length === 0
      ? 0
      : belowLuminances.filter((value) => value >= VISIBLE_CELL_LUMINANCE).length /
        belowLuminances.length;

  const totalCells = columns * rows;
  const uncoveredCells = Math.max(1, totalCells - coveredCells);
  return {
    widthPx,
    heightPx,
    cellPx: CELL_PX,
    totalCells,
    coveredCells,
    coveredShare: coveredCells / totalCells,
    inertCells,
    inertCellShare: inertCells / uncoveredCells,
    largestInertRegionCells,
    largestInertRegionShareOfCanvas: largestInertRegionCells / totalCells,
    largestInertRegionLuminanceSpan,
    largestInertRegionVisibleShare,
    belowLockupP90Luminance,
    belowLockupVisibleShare,
    tallestInertBandShareOfHeight: tallestInertBandRows / rows,
    inertShareBelowLockup: belowCells === 0 ? 0 : belowInert / belowCells,
    belowLockupShareOfCanvas: belowCells / totalCells,
    lockupBottomPx,
    meanLuminance,
    coverageFromDeclaredGeometry: generated == null,
    uncoveredCellStats: {
      luminanceP10: percentile(uncoveredLuminance, 0.1),
      luminanceP50: percentile(uncoveredLuminance, 0.5),
      luminanceP90: percentile(uncoveredLuminance, 0.9),
      stdevP10: percentile(uncoveredStdev, 0.1),
      stdevP50: percentile(uncoveredStdev, 0.5),
      edgeP10: percentile(uncoveredEdge, 0.1),
      edgeP50: percentile(uncoveredEdge, 0.5),
    },
  };
}

export type SubjectObstruction = {
  cellPx: number;
  plateAreaShare: number;
  /** Share of the generated image's structure that the plate covers. */
  detailShareUnderPlate: number;
  /** Detail share divided by area share. 1.0 means the plate sits on average material. */
  detailConcentrationRatio: number;
  /** Share of the image's above-median light that the plate covers. */
  lightShareUnderPlate: number;
  /** Light share divided by area share. Above 1.0 the plate is parked on the light. */
  lightConcentrationRatio: number;
  /** Is the single busiest cell of the generated image hidden by the plate? */
  peakDetailCellCovered: boolean;
  /** Share of the busiest tenth of the generated image hidden by the plate. */
  topDecileDetailCoveredShare: number;
};

/**
 * Grade where the type plate landed relative to the generated image's subject.
 *
 * Coverage comes from the composed artifact — what the renderer actually painted —
 * and the subject is read from the generated layer, because the opaque plate hides
 * what it is standing on.
 */
export async function measureSubjectObstruction(input: {
  repoRoot: string;
  composedAbsolutePath: string;
  generatedAbsolutePath?: string | null;
  spec: FlyerDesignSpec;
}): Promise<SubjectObstruction | null> {
  const generatedPath =
    input.generatedAbsolutePath ?? generatedLayerPath(input.repoRoot, input.spec);
  if (!generatedPath) return null;
  const composed = await readLuminanceGrid(input.composedAbsolutePath);
  const generated = await readLuminanceGrid(generatedPath, {
    widthPx: composed.widthPx,
    heightPx: composed.heightPx,
  });
  const cells = generated.grid.columns * generated.grid.rows;

  const medianLuminance = percentile(
    Array.from(generated.grid.luminance),
    0.5,
  );
  let totalDetail = 0;
  let coveredDetail = 0;
  let totalLight = 0;
  let coveredLight = 0;
  let coveredCells = 0;
  let peakIndex = 0;
  const detail: Array<{ value: number; covered: boolean }> = [];
  for (let index = 0; index < cells; index += 1) {
    const isCovered =
      Math.abs(composed.grid.luminance[index]! - generated.grid.luminance[index]!) >=
      MIN_COVER_LUMINANCE_DELTA;
    const structure = generated.grid.edge[index]!;
    // Light the image actually carries, relative to its own darkness. In a dark
    // photograph this is where the subject is.
    const light = Math.max(0, generated.grid.luminance[index]! - medianLuminance);
    totalDetail += structure;
    totalLight += light;
    if (isCovered) {
      coveredDetail += structure;
      coveredLight += light;
      coveredCells += 1;
    }
    if (structure > generated.grid.edge[peakIndex]!) peakIndex = index;
    detail.push({ value: structure, covered: isCovered });
  }

  const plateAreaShare = coveredCells / Math.max(1, cells);
  const detailShareUnderPlate = totalDetail === 0 ? 0 : coveredDetail / totalDetail;
  const lightShareUnderPlate = totalLight === 0 ? 0 : coveredLight / totalLight;
  const decileCount = Math.max(1, Math.round(cells * 0.1));
  const topDecile = [...detail]
    .sort((left, right) => right.value - left.value)
    .slice(0, decileCount);
  const topDecileCovered = topDecile.filter((cell) => cell.covered).length;

  return {
    cellPx: CELL_PX,
    plateAreaShare,
    detailShareUnderPlate,
    detailConcentrationRatio:
      plateAreaShare === 0 ? 0 : detailShareUnderPlate / plateAreaShare,
    lightShareUnderPlate,
    lightConcentrationRatio:
      plateAreaShare === 0 ? 0 : lightShareUnderPlate / plateAreaShare,
    peakDetailCellCovered: detail[peakIndex]?.covered ?? false,
    topDecileDetailCoveredShare: topDecileCovered / decileCount,
  };
}

/**
 * The composed-artifact creative gate. Runs after render and before any billable
 * vision call, so an artifact this rejects costs no vision money.
 */
export async function checkComposedArtifactCreativeQuality(input: {
  repoRoot: string;
  composedAbsolutePath: string;
  generatedAbsolutePath?: string | null;
  spec: FlyerDesignSpec;
}): Promise<CompositionCheckResult> {
  const findings: CompositionFinding[] = [];
  const vitality = await measureComposedCanvasVitality(input);

  // Large and flat. Size alone cannot reject: on this dark-interior corpus the
  // sellable V18 and the unsellable V19 sit within five points of each other on
  // region size (0.591 vs 0.639), and luminance span is what actually separates
  // them (15.1 vs 9.5). Visible share inside the region's extent was measured as
  // a third condition and discarded — it does not separate the two (0.224 vs
  // 0.170) and requiring it would let V19 through. It stays in telemetry as
  // evidence, not as a gate. See the margin note on MIN_GRADED_REGION_LUMINANCE_SPAN.
  if (
    vitality.largestInertRegionShareOfCanvas > MAX_LARGEST_INERT_REGION_SHARE &&
    vitality.largestInertRegionLuminanceSpan < MIN_GRADED_REGION_LUMINANCE_SPAN
  ) {
    findings.push({
      code: "composed_dead_canvas_region",
      message: `${(vitality.largestInertRegionShareOfCanvas * 100).toFixed(0)}% of the artifact is one continuous region with no subject, no text, and no light — above the ${(MAX_LARGEST_INERT_REGION_SHARE * 100).toFixed(0)}% ceiling — and it does not grade: ${vitality.largestInertRegionLuminanceSpan.toFixed(1)} levels of luminance span across the whole region, under the ${MIN_GRADED_REGION_LUMINANCE_SPAN} a worked dark field carries. That is dead canvas, not negative space.`,
    });
  }

  if (
    vitality.belowLockupShareOfCanvas >= MIN_GRADED_BELOW_LOCKUP_SHARE &&
    vitality.inertShareBelowLockup >= MAX_INERT_SHARE_BELOW_LOCKUP &&
    vitality.belowLockupVisibleShare < MIN_VISIBLE_CELL_SHARE_BELOW_LOCKUP &&
    vitality.belowLockupP90Luminance < MAX_EMPTY_BELOW_LOCKUP_P90_LUMINANCE
  ) {
    findings.push({
      code: "composed_unfinished_below_lockup",
      message: `${(vitality.belowLockupShareOfCanvas * 100).toFixed(0)}% of the artifact sits below the last painted line and carries nothing: ${(vitality.belowLockupVisibleShare * 100).toFixed(1)}% of it reaches a visible brightness and its ninetieth percentile is ${vitality.belowLockupP90Luminance.toFixed(1)} of 255. The piece stops before the page does.`,
    });
  }

  const obstruction = await measureSubjectObstruction(input);
  if (obstruction) {
    if (
      obstruction.detailConcentrationRatio > MAX_DETAIL_CONCENTRATION_UNDER_PLATE ||
      obstruction.lightConcentrationRatio > MAX_LIGHT_CONCENTRATION_UNDER_PLATE ||
      obstruction.topDecileDetailCoveredShare > MAX_TOP_DECILE_DETAIL_COVERED_SHARE
    ) {
      findings.push({
        code: "subject_obscured_by_type_plate",
        message: `The type plate covers ${(obstruction.plateAreaShare * 100).toFixed(0)}% of the canvas but hides ${(obstruction.detailShareUnderPlate * 100).toFixed(0)}% of the generated image's structure (${obstruction.detailConcentrationRatio.toFixed(2)}x its share) and ${(obstruction.lightShareUnderPlate * 100).toFixed(0)}% of its light (${obstruction.lightConcentrationRatio.toFixed(2)}x its share) — the visual anchor is behind the words.`,
      });
    }
  }

  return {
    ok: findings.length === 0,
    findings,
    measured: {
      coveredShare: Math.round(vitality.coveredShare * 1000) / 1000,
      coverageFromDeclaredGeometry: vitality.coverageFromDeclaredGeometry ? 1 : 0,
      largestInertRegionShareOfCanvas:
        Math.round(vitality.largestInertRegionShareOfCanvas * 1000) / 1000,
      largestInertRegionLuminanceSpan:
        Math.round(vitality.largestInertRegionLuminanceSpan * 10) / 10,
      inertShareBelowLockup: Math.round(vitality.inertShareBelowLockup * 1000) / 1000,
      belowLockupShareOfCanvas:
        Math.round(vitality.belowLockupShareOfCanvas * 1000) / 1000,
      tallestInertBandShareOfHeight:
        Math.round(vitality.tallestInertBandShareOfHeight * 1000) / 1000,
      inertCellShareOfUncovered: Math.round(vitality.inertCellShare * 1000) / 1000,
      canvasMeanLuminance: Math.round(vitality.meanLuminance * 10) / 10,
      plateAreaShare: obstruction
        ? Math.round(obstruction.plateAreaShare * 1000) / 1000
        : 0,
      detailShareUnderPlate: obstruction
        ? Math.round(obstruction.detailShareUnderPlate * 1000) / 1000
        : 0,
      detailConcentrationUnderPlate: obstruction
        ? Math.round(obstruction.detailConcentrationRatio * 100) / 100
        : 0,
      lightShareUnderPlate: obstruction
        ? Math.round(obstruction.lightShareUnderPlate * 1000) / 1000
        : 0,
      lightConcentrationUnderPlate: obstruction
        ? Math.round(obstruction.lightConcentrationRatio * 100) / 100
        : 0,
      topDecileDetailCoveredShare: obstruction
        ? Math.round(obstruction.topDecileDetailCoveredShare * 1000) / 1000
        : 0,
    },
  };
}
