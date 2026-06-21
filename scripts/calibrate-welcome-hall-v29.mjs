/**
 * Draw kiosk hotspot candidates on welcome-hall-scene-v3.2.png for v29 calibration.
 */
import sharp from "sharp";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCENE = join(ROOT, "public/welcome-hall/welcome-hall-scene-v3.2.png");
const OUT = join(ROOT, "public/welcome-hall/_verify-hotspots-v29.png");

const W = 1024;
const H = 683;

/** Full kiosk body + screen + tap button — v29 plate (kiosk right foreground) */
const kioskTapTarget = { x: 768, y: 318, width: 210, height: 340 };

function rectSvg({ x, y, width, height }, color, label) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${color}" stroke-width="3"/>
    <text x="${x + 4}" y="${y - 6}" fill="${color}" font-size="14" font-family="monospace">${label}</text>`;
}

const gridLines = [];
for (let x = 0; x <= W; x += 128) {
  gridLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(255,255,0,0.25)" stroke-width="1"/>`);
}
for (let y = 0; y <= H; y += 128) {
  gridLines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(255,255,0,0.25)" stroke-width="1"/>`);
}

const svg = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${gridLines.join("\n")}
    ${rectSvg(kioskTapTarget, "red", "kioskTapTarget")}
  </svg>`,
);

const base = await sharp(SCENE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const overlay = await sharp(svg).png().raw().toBuffer({ resolveWithObject: true });

const out = Buffer.alloc(base.info.width * base.info.height * 4);
for (let i = 0; i < out.length; i += 4) {
  const oa = overlay.data[i + 3] / 255;
  if (oa > 0) {
    out[i] = overlay.data[i];
    out[i + 1] = overlay.data[i + 1];
    out[i + 2] = overlay.data[i + 2];
    out[i + 3] = Math.max(base.data[i + 3], overlay.data[i + 3]);
  } else {
    out[i] = base.data[i];
    out[i + 1] = base.data[i + 1];
    out[i + 2] = base.data[i + 2];
    out[i + 3] = base.data[i + 3];
  }
}

await sharp(out, { raw: { width: W, height: H, channels: 4 } })
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
