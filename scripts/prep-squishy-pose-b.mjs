/**
 * Technical prep only — matte near-white background from Pose B source.
 * Uses edge-connected flood fill so shoe soles / highlights stay intact.
 * @see docs/squishy-character-standards-v1.md
 */
import sharp from "sharp";
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_SOURCE = resolve(
  ROOT,
  "docs/illustration/references/squishy-studio-guide-v2-source.png",
);

function isStrongCharacter(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  if (r > 132 && r > g + 10 && g > 62 && chroma > 20) return true;
  if (g > 92 && g > r + 8 && chroma > 16) return true;
  if (b > 88 && b > r + 8 && chroma > 18) return true;
  if (r > 212 && g > 206 && b > 198 && chroma < 28) return true;
  if (max < 95 && chroma < 38) return true;
  if (b > 55 && b < 150 && b > r + 6 && chroma > 14) return true;
  return false;
}

function matteSceneFromEdges(data, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [];

  function tryPush(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    const i = p * 4;
    if (isStrongCharacter(data[i], data[i + 1], data[i + 2])) return;
    visited[p] = 1;
    queue.push(p);
  }

  for (let x = 0; x < width; x += 1) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (queue.length > 0) {
    const p = queue.pop();
    const x = p % width;
    const y = (p - x) / width;
    const i = p * 4;
    data[i + 3] = 0;

    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
    tryPush(x - 1, y - 1);
    tryPush(x + 1, y - 1);
    tryPush(x - 1, y + 1);
    tryPush(x + 1, y + 1);
  }
}

function opaqueRatio(data) {
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) opaque += 1;
  }
  return opaque / (data.length / 4);
}
const INPUT = process.argv[2] ?? DEFAULT_SOURCE;
const OUTPUT_PUBLIC = resolve(ROOT, "public/squishy/squishy-studio-guide-v2.png");
const OUTPUT_DOCS = resolve(ROOT, "docs/illustration/references/squishy-studio-guide-v2.png");
const OUTPUT_SOURCE_COPY = resolve(ROOT, "docs/illustration/references/squishy-studio-guide-v2-source.png");

function isBackgroundCandidate(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const nearWhite = r >= 246 && g >= 246 && b >= 246;
  const lightFloor = chroma < 18 && max >= 228;
  return nearWhite || lightFloor;
}

function isFloorArtifact(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const avg = (r + g + b) / 3;

  if (r >= 236 && g >= 236 && b >= 228) return true;
  if (chroma >= 50) return false;
  if (chroma < 32 && avg >= 88 && avg <= 225) return true;
  if (chroma < 45 && avg >= 35 && avg < 180 && r >= g - 12 && r >= b - 8) return true;
  return false;
}

function isCharacterPixel(r, g, b, a) {
  if (a === 0 || isFloorArtifact(r, g, b)) return false;
  return isStrongCharacter(r, g, b) || (Math.max(r, g, b) - Math.min(r, g, b) > 28);
}

function findFeetBottomY(data, width, height) {
  let bottom = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = idx(width, x, y);
      if (data[i + 3] === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const chroma = max - Math.min(r, g, b);
      const isGreenShoe = g > 90 && g > r + 4 && chroma > 12;
      const isBlackShoe = max < 72 && chroma < 32;
      const isWhiteSole = r > 205 && g > 200 && b > 195 && chroma < 28;
      if (isGreenShoe || isBlackShoe || isWhiteSole) {
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (bottom > 0) return bottom;
  return findCharacterBottomY(data, width, height);
}

function findCharacterBottomY(data, width, height) {
  let bottom = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = idx(width, x, y);
      if (isCharacterPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        bottom = Math.max(bottom, y);
      }
    }
  }
  return bottom;
}

function removeFloorArtifacts(data, width, height, feetBottomY) {
  const hardCut = Math.min(height, feetBottomY + 1);

  for (let y = hardCut; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      data[idx(width, x, y) + 3] = 0;
    }
  }

  const bandStart = Math.max(0, feetBottomY - Math.floor(height * 0.04));
  for (let y = bandStart; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = idx(width, x, y);
      if (data[i + 3] === 0) continue;
      if (isFloorArtifact(data[i], data[i + 1], data[i + 2])) {
        data[i + 3] = 0;
      }
    }
  }
}

function fillInteriorHoles(data, width, height, maxY) {
  /** Fill tiny transparent holes fully enclosed by opaque pixels (matting speckles). */
  const limitY = Math.min(height - 1, maxY + 2);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let y = 1; y < limitY; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const i = idx(width, x, y);
        if (data[i + 3] > 0) continue;

        let opaqueNeighbors = 0;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;

        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const j = idx(width, x + dx, y + dy);
            if (data[j + 3] > 200) {
              opaqueNeighbors += 1;
              rSum += data[j];
              gSum += data[j + 1];
              bSum += data[j + 2];
            }
          }
        }

        if (opaqueNeighbors >= 7) {
          data[i] = Math.round(rSum / opaqueNeighbors);
          data[i + 1] = Math.round(gSum / opaqueNeighbors);
          data[i + 2] = Math.round(bSum / opaqueNeighbors);
          data[i + 3] = 255;
        }
      }
    }
  }
}

function stripFloorColoredPixels(data, width, height) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = idx(width, x, y);
      if (data[i + 3] === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isFloorArtifact(r, g, b) && !isStrongCharacter(r, g, b)) {
        data[i + 3] = 0;
      }
    }
  }
}

function removeAlphaFringe(data, width, height) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = idx(width, x, y);
      const a = data[i + 3];
      if (a > 0 && a < 48) {
        data[i + 3] = 0;
      }
    }
  }
}

function matteWeakExterior(data, width, height) {
  const total = width * height;
  const remove = new Uint8Array(total);
  const queue = [];

  for (let p = 0; p < total; p += 1) {
    if (data[p * 4 + 3] === 0) queue.push(p);
  }

  while (queue.length > 0) {
    const p = queue.pop();
    const x = p % width;
    const y = (p - x) / width;
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const np = ny * width + nx;
      if (remove[np] || data[np * 4 + 3] === 0) continue;
      const r = data[np * 4];
      const g = data[np * 4 + 1];
      const b = data[np * 4 + 2];
      if (isStrongCharacter(r, g, b)) continue;
      remove[np] = 1;
      queue.push(np);
    }
  }

  for (let p = 0; p < total; p += 1) {
    if (remove[p]) data[p * 4 + 3] = 0;
  }
}

function matteFromEdges(data, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [];

  function tryPush(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    const i = p * 4;
    if (!isBackgroundCandidate(data[i], data[i + 1], data[i + 2])) return;
    visited[p] = 1;
    queue.push(p);
  }

  for (let x = 0; x < width; x += 1) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (queue.length > 0) {
    const p = queue.pop();
    const x = p % width;
    const y = (p - x) / width;
    const i = p * 4;
    data[i + 3] = 0;

    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
  }
}

function keepMainCharacterComponents(data, width, height) {
  const total = width * height;
  const labels = new Int32Array(total);
  const sizes = [];
  let nextLabel = 1;

  for (let p = 0; p < total; p += 1) {
    if (data[p * 4 + 3] === 0 || labels[p] !== 0) continue;

    const label = nextLabel;
    nextLabel += 1;
    let size = 0;
    const stack = [p];
    labels[p] = label;

    while (stack.length > 0) {
      const current = stack.pop();
      size += 1;
      const x = current % width;
      const y = (current - x) / width;

      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const np = ny * width + nx;
        if (data[np * 4 + 3] === 0 || labels[np] !== 0) continue;
        labels[np] = label;
        stack.push(np);
      }
    }

    sizes[label] = size;
  }

  const largest = sizes.reduce((best, size, label) => (size > best.size ? { label, size } : best), {
    label: 0,
    size: 0,
  }).size;

  const minKeep = largest * 0.04;

  for (let p = 0; p < total; p += 1) {
    const label = labels[p];
    if (label === 0) continue;
    if (sizes[label] < minKeep) {
      data[p * 4 + 3] = 0;
    }
  }
}

function removeFloorShadow(data, width, height) {
  const feetBottomY = findFeetBottomY(data, width, height);
  removeFloorArtifacts(data, width, height, feetBottomY);

  const floorBandStart = Math.max(0, feetBottomY - Math.floor(height * 0.08));
  for (let y = floorBandStart; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = idx(width, x, y);
      if (data[i + 3] === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const avg = (r + g + b) / 3;
      if (chroma < 40 && avg >= 45 && avg <= 210 && r >= g - 20) {
        data[i + 3] = 0;
      }
    }
  }

  return feetBottomY;
}

function idx(width, x, y) {
  return (y * width + x) * 4;
}

function cropEmptyBottomRows(data, width, height) {
  let cropBottom = 0;
  for (let y = height - 1; y >= Math.floor(height * 0.5); y -= 1) {
    let transparent = 0;
    for (let x = 0; x < width; x += 1) {
      if (data[idx(width, x, y) + 3] === 0) transparent += 1;
    }
    if (transparent / width > 0.94) {
      cropBottom = height - y;
    } else {
      break;
    }
  }
  if (cropBottom <= 0) return { data, height };
  const croppedHeight = height - cropBottom;
  return {
    data: Buffer.from(data.slice(0, croppedHeight * width * 4)),
    height: croppedHeight,
  };
}

if (!existsSync(INPUT)) {
  console.error(`Pose B source not found: ${INPUT}`);
  process.exit(1);
}

if (INPUT !== OUTPUT_SOURCE_COPY && existsSync(INPUT)) {
  copyFileSync(INPUT, OUTPUT_SOURCE_COPY);
}

const { data, info } = await sharp(INPUT).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width } = info;
let { height } = info;
const pixels = Buffer.from(data);

matteFromEdges(pixels, width, height);
if (opaqueRatio(pixels) > 0.45) {
  matteSceneFromEdges(pixels, width, height);
  keepMainCharacterComponents(pixels, width, height);
}
const feetBottomY = removeFloorShadow(pixels, width, height);
stripFloorColoredPixels(pixels, width, height);
matteWeakExterior(pixels, width, height);
keepMainCharacterComponents(pixels, width, height);
fillInteriorHoles(pixels, width, height, feetBottomY);
removeAlphaFringe(pixels, width, height);

const cropped = cropEmptyBottomRows(pixels, width, height);
height = cropped.height;

const png = await sharp(cropped.data, {
  raw: { width, height, channels: 4 },
})
  .trim({ threshold: 8 })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer();

writeFileSync(OUTPUT_PUBLIC, png);
writeFileSync(OUTPUT_DOCS, png);

const meta = await sharp(png).metadata();
console.log(`Prepared Pose B: ${meta.width}x${meta.height} -> ${OUTPUT_PUBLIC}`);
