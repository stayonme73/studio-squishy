#!/usr/bin/env node
/**
 * Verify Studio BOARD city header PNG (2220×340).
 * Usage: node scripts/verify-studio-board-header.mjs [path]
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const TARGET_W = 2220;
const TARGET_H = 340;
const defaultPath = join(
  process.cwd(),
  "public/studio-board/studio-board-header-city-v1.png",
);

const filePath = process.argv[2] ?? defaultPath;

function readPngSize(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

let buffer;
try {
  buffer = readFileSync(filePath);
} catch {
  console.error(`Missing file: ${filePath}`);
  process.exit(1);
}

const size = readPngSize(buffer);
if (!size) {
  console.error("Not a valid PNG:", filePath);
  process.exit(1);
}

const { width, height } = size;
const ok = width === TARGET_W && height === TARGET_H;

console.log(`File: ${filePath}`);
console.log(`Size: ${width}×${height}`);
console.log(ok ? "PASS — Studio Board city header" : "FAIL — need 2220×340");
process.exit(ok ? 0 : 1);
