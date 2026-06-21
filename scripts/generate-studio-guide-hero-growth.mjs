#!/usr/bin/env node
/**
 * Studio Guide — Growth hero (2220×280).
 * Crop keeps: tree, GROWTH wall, campaign boards, city window.
 * Source v3 — room tells the story; crops bottom desk clutter.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SOURCE = join(ROOT, "public/studio-guide/hero-growth-master-v3.png");
const OUT = join(ROOT, "public/studio-guide/hero-growth.png");
const FINAL_W = 2220;
const FINAL_H = 280;

/** Pixels from top after width-scale — tree, GROWTH, boards, window. */
const CROP_TOP = 280;

async function main() {
  const meta = await sharp(SOURCE).metadata();
  const scaledH = Math.round(meta.height * (FINAL_W / meta.width));
  const top = CROP_TOP;

  await sharp(SOURCE)
    .resize(FINAL_W, scaledH, { fit: "fill" })
    .extract({ left: 0, top, width: FINAL_W, height: FINAL_H })
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  const out = await sharp(OUT).metadata();
  console.log(`Source: ${meta.width}×${meta.height}`);
  console.log(`Scaled: ${FINAL_W}×${scaledH}, crop top=${top}`);
  console.log(`Output: ${out.width}×${out.height}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
