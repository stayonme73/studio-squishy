/**
 * Calibration probe — what actually separates a void from a dark photograph?
 *
 * The first cell-level "inert" test did not discriminate on this corpus: every
 * Customer-One artifact is a moody dark interior, so roughly 65–77% of cells read
 * dark-and-smooth whether the artifact is sellable or not. Blur sweep (0.8–3.0)
 * moved median edge energy from 0.9 to 0.13 while inert share barely moved, which
 * means the edge threshold was never doing the work.
 *
 * So this probe asks the question the owner actually asked: below the type, does
 * the artifact carry any light at all? It prints luminance distributions for the
 * band below the painted lockup and for the darkest contiguous region, for every
 * stored composed hybrid artifact, plus two synthetic controls that must land on
 * opposite sides (per-pixel grain over black = dead, charcoal ramp = graded).
 *
 * Read-only. No provider calls.
 *
 *   npx tsx scripts/creative-quality-gate-blur-probe.mts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";

import sharp from "sharp";

import type { FlyerDesignSpec } from "../src/lib/studio-design-renderer/types";

const repoRoot = process.cwd();
const CELL_PX = 32;
const PROBE_DIR = path.join(repoRoot, "data/qa/creative-quality-calibration/blur-probe");
const COVER_DELTA = 4;

function luma(data: Buffer, channels: number, pixels: number): Float64Array {
  const out = new Float64Array(pixels);
  for (let index = 0; index < pixels; index += 1) {
    const base = index * channels;
    out[index] =
      0.2126 * (data[base] ?? 0) +
      0.7152 * (data[base + 1] ?? 0) +
      0.0722 * (data[base + 2] ?? 0);
  }
  return out;
}

type Grid = { columns: number; rows: number; cellHeight: number; luminance: Float64Array };

async function grid(absolutePath: string, resize?: { w: number; h: number }): Promise<Grid & { widthPx: number; heightPx: number }> {
  const base = sharp(absolutePath).removeAlpha();
  const sized = resize ? base.resize(resize.w, resize.h, { fit: "fill" }) : base;
  const buf = await sized.raw().toBuffer({ resolveWithObject: true });
  const width = buf.info.width;
  const height = buf.info.height;
  const values = luma(buf.data, buf.info.channels, width * height);
  const columns = Math.max(1, Math.floor(width / CELL_PX));
  const rows = Math.max(1, Math.floor(height / CELL_PX));
  const cellWidth = Math.floor(width / columns);
  const cellHeight = Math.floor(height / rows);
  const luminance = new Float64Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let sum = 0;
      let samples = 0;
      for (let y = row * cellHeight; y < Math.min(height, (row + 1) * cellHeight); y += 1) {
        for (let x = column * cellWidth; x < Math.min(width, (column + 1) * cellWidth); x += 1) {
          sum += values[y * width + x]!;
          samples += 1;
        }
      }
      luminance[row * columns + column] = samples === 0 ? 0 : sum / samples;
    }
  }
  return { columns, rows, cellHeight, luminance, widthPx: width, heightPx: height };
}

function pct(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(fraction * (sorted.length - 1))))]!;
}

function describe(label: string, values: number[]): void {
  if (values.length === 0) {
    console.log(`    ${label.padEnd(26)} (empty)`);
    return;
  }
  const visible = values.filter((value) => value >= 30).length / values.length;
  console.log(
    `    ${label.padEnd(26)} cells ${String(values.length).padStart(4)}  p50 ${pct(values, 0.5).toFixed(1).padStart(6)}  p90 ${pct(values, 0.9).toFixed(1).padStart(6)}  max ${pct(values, 1).toFixed(1).padStart(6)}  share>=30 ${visible.toFixed(3)}`,
  );
}

async function probeComposed(label: string, composedAbs: string, generatedAbs: string | null): Promise<void> {
  const composed = await grid(composedAbs);
  const generated = generatedAbs
    ? await grid(generatedAbs, { w: composed.widthPx, h: composed.heightPx })
    : null;
  const covered = new Uint8Array(composed.columns * composed.rows);
  if (generated) {
    for (let index = 0; index < covered.length; index += 1) {
      if (Math.abs(composed.luminance[index]! - generated.luminance[index]!) >= COVER_DELTA) {
        covered[index] = 1;
      }
    }
  }
  let lastPainted = -1;
  for (let row = 0; row < composed.rows; row += 1) {
    for (let column = 0; column < composed.columns; column += 1) {
      if (covered[row * composed.columns + column] === 1) lastPainted = row;
    }
  }
  const below: number[] = [];
  for (let row = lastPainted + 1; row < composed.rows; row += 1) {
    for (let column = 0; column < composed.columns; column += 1) {
      const index = row * composed.columns + column;
      if (covered[index] === 1) continue;
      below.push(composed.luminance[index]!);
    }
  }
  const uncovered: number[] = [];
  for (let index = 0; index < covered.length; index += 1) {
    if (covered[index] === 0) uncovered.push(composed.luminance[index]!);
  }
  const paintedShare = covered.reduce((sum, value) => sum + value, 0) / covered.length;
  console.log(
    `\n  ${label}  painted ${paintedShare.toFixed(3)}  lockup bottom row ${lastPainted + 1}/${composed.rows}`,
  );
  describe("whole uncovered field", uncovered);
  describe("below the lockup", below);
}

async function writeNoise(): Promise<string> {
  const width = 512;
  const height = 768;
  const pixels = Buffer.alloc(width * height * 3);
  let seed = 20260914;
  for (let index = 0; index < width * height; index += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const value = 8 + (seed % 22);
    pixels[index * 3] = value;
    pixels[index * 3 + 1] = value;
    pixels[index * 3 + 2] = value;
  }
  const out = path.join(PROBE_DIR, "noise.png");
  writeFileSync(out, await sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer());
  return out;
}

async function writeRamp(): Promise<string> {
  const width = 512;
  const height = 768;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    const value = Math.round(4 + 44 * (y / height));
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
    }
  }
  const out = path.join(PROBE_DIR, "ramp.png");
  writeFileSync(out, await sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer());
  return out;
}

function storedHybrids(): Array<{ label: string; composed: string; generated: string | null }> {
  const found: Array<{ label: string; composed: string; generated: string | null }> = [];
  const rootAbs = path.join(repoRoot, "data/campaign-design-artifacts");
  if (!existsSync(rootAbs)) return found;
  for (const campaign of readdirSync(rootAbs)) {
    const campaignAbs = path.join(rootAbs, campaign);
    if (!statSync(campaignAbs).isDirectory()) continue;
    for (const design of readdirSync(campaignAbs)) {
      const rendersAbs = path.join(campaignAbs, design, "renders");
      if (!existsSync(rendersAbs)) continue;
      for (const version of readdirSync(rendersAbs)) {
        const specAbs = path.join(rendersAbs, version, "design-spec.json");
        const pngAbs = path.join(rendersAbs, version, "flyer.png");
        if (!existsSync(specAbs) || !existsSync(pngAbs)) continue;
        const spec = JSON.parse(readFileSync(specAbs, "utf8")) as FlyerDesignSpec;
        if (!spec.layers.some((layer) => layer.id === "generated-hero")) continue;
        const material = spec.materials.find(
          (candidate) => candidate.materialId === "hybrid-generated-visual",
        );
        found.push({
          label: version,
          composed: pngAbs,
          generated: material ? path.join(repoRoot, material.relativePath) : null,
        });
      }
    }
  }
  return found;
}

async function main(): Promise<void> {
  mkdirSync(PROBE_DIR, { recursive: true });
  console.log("synthetic controls (no renderer layer; whole field is the image)");
  await probeComposed("near-black per-pixel grain", await writeNoise(), null);
  await probeComposed("charcoal ramp", await writeRamp(), null);
  console.log("\nstored composed hybrid artifacts");
  console.log(
    "NOTE: the generated layer is overwritten per run, so only the newest version's",
  );
  console.log("      painted-share and below-lockup figures are trustworthy.");
  for (const item of storedHybrids()) {
    await probeComposed(item.label, item.composed, item.generated);
  }
}

void main();
