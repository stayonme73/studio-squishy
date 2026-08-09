/**
 * Machine-generate V3 endcard plate WITHOUT baked "Book a visit" CTA.
 * Logo + URL only; Shotstack overlays the single CTA with readable contrast.
 */
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outRel =
  "docs/launch/kitchen-production-cert-video-1/source-assets/scene-04-endcard-v3-no-baked-cta.png";
const outAbs = path.join(repoRoot, outRel);
const bg = path.join(
  repoRoot,
  "docs/launch/kitchen-video-operational-1/source-assets/cedar-lane-endcard-bg.png",
);
const logo = path.join(
  repoRoot,
  "docs/launch/kitchen-video-operational-1/source-assets/cedar-lane-logo.png",
);

if (!existsSync(bg) || !existsSync(logo)) {
  console.error(JSON.stringify({ ok: false, error: "missing_source_assets" }));
  process.exit(1);
}

mkdirSync(path.dirname(outAbs), { recursive: true });

const width = 1080;
const height = 1920;
const logoSize = 280;

const logoBuf = await sharp(logo)
  .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const svgUrl = Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="540" y="1280" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="42" fill="#1F4A44">cedarlane.studio</text>
</svg>
`);

const composed = await sharp(bg)
  .resize(width, height, { fit: "cover" })
  .composite([
    { input: logoBuf, top: 620, left: Math.round((width - logoSize) / 2) },
    { input: svgUrl, top: 0, left: 0 },
  ])
  .png()
  .toBuffer();

writeFileSync(outAbs, composed);
console.log(
  JSON.stringify(
    {
      ok: true,
      relativePath: outRel,
      bytes: composed.length,
      note: "No baked CTA text — Shotstack places single CTA overlay",
    },
    null,
    2,
  ),
);
