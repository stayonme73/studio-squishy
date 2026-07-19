/**
 * Prepare Welcome Hall v31 — resize generated plate to 1920×1080 and calibrate kiosk.
 */
import sharp from "sharp";
import { copyFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(
  ROOT,
  "../.cursor/projects/c-Users-tagia-studio-squishy/assets/welcome-hall-scene-v3.2-16x9.png",
);
const ALT_SRC = join(
  "C:/Users/tagia/.cursor/projects/c-Users-tagia-studio-squishy/assets/welcome-hall-scene-v3.2-16x9.png",
);
const SCENE = join(ROOT, "public/welcome-hall/welcome-hall-scene-v3.2.png");
const OUT = join(ROOT, "public/welcome-hall/_verify-hotspots-v31.png");

const W = 1920;
const H = 1080;

/** v30 coords scaled 1024→1920, 683→1080 then adjusted for regen layout */
const kioskTapTarget = { x: 1440, y: 502, width: 394, height: 537 };

function rectSvg({ x, y, width, height }, color, label) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${color}" stroke-width="4"/>
    <text x="${x + 6}" y="${y - 8}" fill="${color}" font-size="18" font-family="monospace">${label}</text>`;
}

const input = SRC;
const meta = await sharp(ALT_SRC).metadata();
console.log("source", meta.width, "x", meta.height);

await sharp(ALT_SRC)
  .resize(W, H, { fit: "fill" })
  .png()
  .toFile(SCENE);

console.log("wrote", SCENE, W, "x", H);

const gridLines = [];
for (let x = 0; x <= W; x += 192) {
  gridLines.push(
    `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(255,255,0,0.25)" stroke-width="1"/>`,
  );
}
for (let y = 0; y <= H; y += 108) {
  gridLines.push(
    `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(255,255,0,0.25)" stroke-width="1"/>`,
  );
}

const svg = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${gridLines.join("\n")}
    ${rectSvg(kioskTapTarget, "red", "kioskTapTarget")}
  </svg>`,
);

await sharp(SCENE)
  .composite([{ input: svg, top: 0, left: 0 }])
  .png()
  .toFile(OUT);

console.log("kioskTapTarget", kioskTapTarget);
console.log("percent", {
  left: ((kioskTapTarget.x / W) * 100).toFixed(1) + "%",
  top: ((kioskTapTarget.y / H) * 100).toFixed(1) + "%",
  width: ((kioskTapTarget.width / W) * 100).toFixed(1) + "%",
  height: ((kioskTapTarget.height / H) * 100).toFixed(1) + "%",
});
console.log("wrote", OUT);
