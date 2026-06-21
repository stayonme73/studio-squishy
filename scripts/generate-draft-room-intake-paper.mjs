#!/usr/bin/env node
/**
 * Draft Room intake paper — knock out black bg for transparent PNG.
 * Source: gold pin + drafting pencil on black (Option 1).
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SOURCE = join(
  ROOT,
  "public/draft-room/draft-room-intake-paper-source.png",
);
const OUT = join(ROOT, "public/draft-room/draft-room-intake-paper.png");

/** Pixels at or below this luminance become fully transparent. */
const BLACK_CUTOFF = 42;
/** Feather dark edge pixels into partial alpha. */
const BLACK_FEATHER = 72;

async function main() {
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = (r + g + b) / 3;

    if (lum <= BLACK_CUTOFF) {
      data[i + 3] = 0;
    } else if (lum <= BLACK_FEATHER) {
      const t = (lum - BLACK_CUTOFF) / (BLACK_FEATHER - BLACK_CUTOFF);
      data[i + 3] = Math.round(Math.min(255, data[i + 3] * t));
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  const out = await sharp(OUT).metadata();
  console.log(`Source: ${info.width}×${info.height}`);
  console.log(`Output: ${out.width}×${out.height} (alpha: ${out.hasAlpha})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
