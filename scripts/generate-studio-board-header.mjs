#!/usr/bin/env node
/**
 * Studio BOARD header — production banner (2220×255, LOCKED).
 * Reverted to v19 composition (bridge + waterfront visible, calm left zone).
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const MASTER = join(ROOT, "public/studio-board/studio-board-header-scene-v4-master.png");
const FINAL_OUT = join(ROOT, "public/studio-board/studio-board-header-scene-v4.png");

const FINAL_W = 2220;
const FINAL_H = 255;
const BG = { r: 252, g: 245, b: 235 };
const CALM_LEFT = Math.round(FINAL_W * 0.24);
const CONTENT_CROP = { left: 292, top: 0, width: 726, height: 298 };

async function main() {
  mkdirSync(dirname(FINAL_OUT), { recursive: true });

  const artW = FINAL_W - CALM_LEFT;
  const art = await sharp(MASTER)
    .extract(CONTENT_CROP)
    .resize(artW, FINAL_H, { fit: "fill" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: FINAL_W,
      height: FINAL_H,
      channels: 3,
      background: BG,
    },
  })
    .composite([{ input: art, left: CALM_LEFT, top: 0 }])
    .flatten({ background: BG })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(FINAL_OUT);

  const finalMeta = await sharp(FINAL_OUT).metadata();
  console.log(`Crop: ${CONTENT_CROP.width}×${CONTENT_CROP.height}`);
  console.log(`Art: ${artW}×${FINAL_H} at left=${CALM_LEFT}`);
  console.log(`Output: ${finalMeta.width}×${finalMeta.height}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
