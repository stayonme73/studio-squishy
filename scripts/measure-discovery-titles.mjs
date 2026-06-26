/**
 * Measure title text bounding boxes on discovery-studio-plate-v1.png
 * Run: node scripts/measure-discovery-titles.mjs
 *
 * Titles sit on the handwritten row (below icon/number, above question copy).
 * Scans upper and lower bands per tile because row-3 titles sit high while
 * rows 1–2 titles sit lower in the hit rect. Skips full-width divider rows.
 */
import sharp from "sharp";

const PLATE = "public/business-discovery-studio/discovery-studio-plate-v1.png";
const BADGE_SIZE = 14;
const BADGE_GAP = 7;

const tileHits = {
  "your-business": { x: 221, y: 163, width: 174, height: 124 },
  "your-situation": { x: 395, y: 152, width: 189, height: 135 },
  "your-challenge": { x: 580, y: 174, width: 199, height: 113 },
  "your-current-tools": { x: 221, y: 297, width: 174, height: 121 },
  "your-focus": { x: 395, y: 297, width: 189, height: 122 },
  "success-looks-like": { x: 580, y: 296, width: 199, height: 123 },
  "whats-slowing-you-down": { x: 221, y: 429, width: 174, height: 112 },
  "anything-else": { x: 395, y: 430, width: 189, height: 111 },
  "submit-project": { x: 580, y: 420, width: 199, height: 121 },
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

function scanRows(hit, yStart, yEnd, isTitlePixel) {
  const xStart = hit.x + 12;
  const statusCutoff = hit.x + Math.round(hit.width * 0.72);
  const scanWidth = statusCutoff - xStart;
  const rows = [];

  for (let y = yStart; y <= yEnd; y++) {
    let minX = Infinity;
    let maxX = -Infinity;
    let count = 0;
    for (let x = xStart; x < statusCutoff; x++) {
      const i = (y * width + x) * channels;
      if (isTitlePixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        count++;
      }
    }
    rows.push({
      y,
      minX,
      maxX,
      count,
      fill: count / scanWidth,
      span: maxX - minX,
    });
  }

  return { rows, xStart, statusCutoff, scanWidth };
}

function measureBand(hit, yStart, yEnd, lightText) {
  const isTitlePixel = lightText ? isLight : isDark;
  const { rows, xStart, statusCutoff, scanWidth } = scanRows(
    hit,
    yStart,
    yEnd,
    isTitlePixel,
  );

  const candidates = rows.filter((row) => {
    if (lightText) {
      return row.count >= 40 && row.fill >= 0.55 && row.span >= 80;
    }
    return (
      row.count >= 10 &&
      row.fill >= 0.1 &&
      row.fill <= 0.38 &&
      row.span >= 38 &&
      row.span <= scanWidth * 0.88
    );
  });

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.maxX - a.maxX || b.span - a.span);
  const seed = candidates[0];

  let maxX = -Infinity;
  let sumY = 0;
  let pixelCount = 0;

  for (const row of rows) {
    if (row.y < seed.y - 6 || row.y > seed.y + 6) continue;
    if (!lightText && row.fill >= 0.42) continue;

    for (let x = xStart; x < statusCutoff; x++) {
      const i = (row.y * width + x) * channels;
      if (isTitlePixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        maxX = Math.max(maxX, x);
        sumY += row.y;
        pixelCount++;
      }
    }
  }

  if (pixelCount === 0) return null;

  const titleCenterY = Math.round(sumY / pixelCount);
  return {
    titleBox: { right: maxX, centerY: titleCenterY, minX: seed.minX },
    badge: {
      x: maxX + BADGE_GAP,
      y: titleCenterY - Math.round(BADGE_SIZE / 2),
      size: BADGE_SIZE,
    },
  };
}

function measureTitle(hit, lightText = false) {
  const yPad = 8;
  const yBottom = hit.y + hit.height - 6;
  const yMid = hit.y + Math.round(hit.height * 0.52);

  const upper = measureBand(hit, hit.y + yPad, yMid, lightText);
  const lower = measureBand(hit, yMid + 1, yBottom, lightText);

  if (!upper) return lower;
  if (!lower) return upper;

  if (Math.abs(upper.titleBox.right - lower.titleBox.right) <= 15) {
    return upper.titleBox.minX <= lower.titleBox.minX ? upper : lower;
  }

  return upper.titleBox.right >= lower.titleBox.right ? upper : lower;
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
