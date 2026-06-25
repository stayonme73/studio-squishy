/**
 * Measure title text bounding boxes on discovery-studio-plate-v1.png
 * Run: node scripts/measure-discovery-titles.mjs
 *
 * Script titles sit in the lower half of each card (below icon/number).
 * Skips full-width divider rows and the right-side "Not completed" status column.
 */
import sharp from "sharp";

const PLATE = "public/business-discovery-studio/discovery-studio-plate-v1.png";
const BADGE_SIZE = 14;
const BADGE_GAP = 4;

const tileHits = {
  "your-business": { x: 244, y: 162, width: 188, height: 98 },
  "your-situation": { x: 418, y: 158, width: 188, height: 98 },
  "your-challenge": { x: 592, y: 164, width: 188, height: 98 },
  "your-current-tools": { x: 244, y: 268, width: 188, height: 98 },
  "your-focus": { x: 418, y: 264, width: 188, height: 98 },
  "success-looks-like": { x: 592, y: 270, width: 188, height: 98 },
  "whats-slowing-you-down": { x: 244, y: 374, width: 188, height: 98 },
  "anything-else": { x: 418, y: 370, width: 188, height: 98 },
  "submit-project": { x: 592, y: 376, width: 188, height: 98 },
};

const tileLabels = {
  "your-business": "Your Business",
  "your-situation": "Your Situation",
  "your-challenge": "Your Challenge",
  "your-current-tools": "Your Current Tools",
  "your-focus": "Your Focus",
  "success-looks-like": "Success Looks Like",
  "whats-slowing-you-down": "What's Slowing You Down?",
  "anything-else": "Anything Else?",
  "submit-project": "Submit Project",
};

const { data, info } = await sharp(PLATE)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

function isDark(r, g, b, a) {
  if (a < 128) return false;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 95;
}

function isLight(r, g, b, a) {
  if (a < 128) return false;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 165 && r > 140 && g > 140 && b > 140;
}

function measureTitle(hit, lightText = false) {
  const isTitlePixel = lightText ? isLight : isDark;
  const yStart = hit.y + Math.round(hit.height * 0.5);
  const yEnd = hit.y + Math.round(hit.height * 0.88);
  const xStart = hit.x + 12;
  const statusCutoff = hit.x + Math.round(hit.width * 0.78);
  const scanWidth = statusCutoff - xStart;

  let bestY = 0;
  let bestCount = 0;
  for (let y = yStart; y <= yEnd; y++) {
    let count = 0;
    for (let x = xStart; x < statusCutoff; x++) {
      const i = (y * width + x) * channels;
      if (isTitlePixel(data[i], data[i + 1], data[i + 2], data[i + 3])) count++;
    }
    if (count / scanWidth > 0.45) continue;
    if (count > bestCount) {
      bestCount = count;
      bestY = y;
    }
  }

  if (bestCount === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let sumY = 0;
  let pixelCount = 0;

  for (let y = bestY - 3; y <= bestY + 3; y++) {
    let rowFill = 0;
    for (let x = xStart; x < statusCutoff; x++) {
      const i = (y * width + x) * channels;
      if (isTitlePixel(data[i], data[i + 1], data[i + 2], data[i + 3])) rowFill++;
    }
    if (rowFill / scanWidth > 0.45) continue;

    for (let x = xStart; x < statusCutoff; x++) {
      const i = (y * width + x) * channels;
      if (isTitlePixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        sumY += y;
        pixelCount++;
      }
    }
  }

  if (pixelCount === 0) return null;

  const titleCenterY = Math.round(sumY / pixelCount);
  const badgeX = maxX + BADGE_GAP;
  const badgeY = titleCenterY - Math.round(BADGE_SIZE / 2);

  return {
    bestY,
    titleBox: { left: minX, right: maxX, centerY: titleCenterY },
    badge: { x: badgeX, y: badgeY, size: BADGE_SIZE },
    darkPixels: pixelCount,
  };
}

console.log(`Plate: ${width}x${height}\n`);
console.log("id | title | titleRight | centerY | badge x,y,size");
console.log("---|-------|------------|---------|----------------");

const results = {};
for (const [id, hit] of Object.entries(tileHits)) {
  const label = tileLabels[id];
  const r = measureTitle(hit, id === "submit-project");
  if (!r) {
    console.warn(`No title pixels for ${label}`);
    continue;
  }
  results[id] = r.badge;
  console.log(
    `${id} | ${label} | ${r.titleBox.right} | ${r.titleBox.centerY} | ${r.badge.x}, ${r.badge.y}, ${r.badge.size}`,
  );
}

console.log("\nJSON for tileDoneBadges:");
console.log(JSON.stringify(results, null, 2));
