#!/usr/bin/env node
/**
 * Draft Room intake plate — install locked baseline (no filters).
 * Use when replacing production art from founder reference only.
 */

import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const BASELINE = join(
  "C:/Users/tagia/.cursor/projects/c-Users-tagia-studio-squishy/assets/c__Users_tagia_AppData_Roaming_Cursor_User_workspaceStorage_79287d08b5bb395733a552b4d04141bf_images_image-577ca078-8de0-430d-a8d6-ec08c5380baf.png",
);
const OUT = join(ROOT, "public/draft-room/draft-room-intake-plate.png");
const W = 1024;
const H = 623;

async function main() {
  if (!existsSync(BASELINE)) {
    throw new Error(`Missing baseline: ${BASELINE}`);
  }

  await sharp(BASELINE).png({ compressionLevel: 6 }).toFile(OUT);

  const meta = await sharp(OUT).metadata();
  if (meta.width !== W || meta.height !== H) {
    throw new Error(`Expected ${W}x${H}, got ${meta.width}x${meta.height}`);
  }

  console.log("installed baseline", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
