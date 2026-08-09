/**
 * V4 beat plates — designed text synchronized to narration beats.
 * Studio-controlled stills only; no stock. No baked competing CTA on final plate.
 */
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(
  repoRoot,
  "docs/launch/kitchen-production-cert-video-1/source-assets/v4-beats",
);

const W = 1080;
const H = 1920;

const stills = {
  still01: path.join(
    repoRoot,
    "docs/launch/kitchen-video-operational-1/source-assets/cedar-lane-still-01.png",
  ),
  still02: path.join(
    repoRoot,
    "docs/launch/kitchen-video-operational-1/source-assets/cedar-lane-still-02.png",
  ),
  still03: path.join(
    repoRoot,
    "docs/launch/kitchen-video-operational-1/source-assets/cedar-lane-still-03.png",
  ),
  endcardBg: path.join(
    repoRoot,
    "docs/launch/kitchen-video-operational-1/source-assets/cedar-lane-endcard-bg.png",
  ),
  logo: path.join(
    repoRoot,
    "docs/launch/kitchen-video-operational-1/source-assets/cedar-lane-logo.png",
  ),
};

function esc(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cardSvg({
  eyebrow,
  line1,
  line2,
  line3,
  support,
  accent = "#1F4A44",
  panelY = 1180,
}) {
  const y1 = panelY + (eyebrow ? 100 : 70);
  const y2 = y1 + 78;
  const y3 = y2 + 70;
  return Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="60" y="${panelY}" width="960" height="360" rx="28" fill="#F7F1E8" fill-opacity="0.94"/>
  ${
    eyebrow
      ? `<text x="540" y="${panelY + 52}" text-anchor="middle" font-family="Clear Sans, Arial, sans-serif" font-size="26" letter-spacing="3" fill="#5C6B66">${esc(eyebrow)}</text>`
      : ""
  }
  ${
    line1
      ? `<text x="540" y="${y1}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="54" font-weight="700" fill="${accent}">${esc(line1)}</text>`
      : ""
  }
  ${
    line2
      ? `<text x="540" y="${y2}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="60" font-weight="700" fill="${accent}">${esc(line2)}</text>`
      : ""
  }
  ${
    line3
      ? `<text x="540" y="${line2 ? y3 : y2}" text-anchor="middle" font-family="Clear Sans, Arial, sans-serif" font-size="36" fill="${accent}">${esc(line3)}</text>`
      : ""
  }
  ${
    support
      ? `<rect x="90" y="1725" width="900" height="90" rx="16" fill="#1A1A1A" fill-opacity="0.55"/>
         <text x="540" y="1782" text-anchor="middle" font-family="Clear Sans, Arial, sans-serif" font-size="28" fill="#FFFFFF">${esc(support)}</text>`
      : ""
  }
</svg>
`);
}

async function plateFromStill(stillPath, svg, outName) {
  const outAbs = path.join(outDir, outName);
  const buf = await sharp(stillPath)
    .resize(W, H, { fit: "cover", position: "centre" })
    .composite([{ input: svg, top: 0, left: 0 }])
    .png()
    .toBuffer();
  writeFileSync(outAbs, buf);
  return {
    relativePath: path.relative(repoRoot, outAbs).replaceAll("\\", "/"),
    bytes: buf.length,
  };
}

async function ctaPlate() {
  const outName = "beat-06-cta-base.png";
  const outAbs = path.join(outDir, outName);
  const logoSize = 280;
  const logoBuf = await sharp(stills.logo)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const svg = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <text x="540" y="1280" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="36" fill="#1F4A44">cedar-lane-studio.example/book</text>
  <text x="540" y="1345" text-anchor="middle" font-family="Clear Sans, Arial, sans-serif"
        font-size="32" fill="#1F4A44">(555) 018-4421</text>
</svg>
`);

  const buf = await sharp(stills.endcardBg)
    .resize(W, H, { fit: "cover" })
    .composite([
      { input: logoBuf, top: 620, left: Math.round((W - logoSize) / 2) },
      { input: svg, top: 0, left: 0 },
    ])
    .png()
    .toBuffer();
  writeFileSync(outAbs, buf);
  return {
    relativePath: path.relative(repoRoot, outAbs).replaceAll("\\", "/"),
    bytes: buf.length,
  };
}

for (const p of Object.values(stills)) {
  if (!existsSync(p)) {
    console.error(JSON.stringify({ ok: false, error: "missing_asset", path: p }));
    process.exit(1);
  }
}

mkdirSync(outDir, { recursive: true });

const results = [];

results.push(
  await plateFromStill(
    stills.still03,
    cardSvg({
      eyebrow: "STUDIO",
      line1: "Cedar Lane Studio",
      support: "Welcome to Cedar Lane Studio",
      panelY: 1240,
    }),
    "beat-00-establish.png",
  ),
);

results.push(
  await plateFromStill(
    stills.still02,
    cardSvg({
      eyebrow: "YOUR HOST",
      line1: "Mira Chen",
      line2: "Cedar Lane Studio",
      support: "Hello — this is Mira Chen",
    }),
    "beat-01-identity.png",
  ),
);

results.push(
  await plateFromStill(
    stills.still01,
    cardSvg({
      eyebrow: "OFFER",
      line1: "Portrait Refresh",
      line2: "$99",
      support: "for ninety-nine dollars",
    }),
    "beat-02-offer.png",
  ),
);

results.push(
  await plateFromStill(
    stills.still03,
    cardSvg({
      eyebrow: "DEADLINE",
      line1: "Before May 3rd, 2026",
      support: "before May third, twenty twenty-six",
    }),
    "beat-03-deadline.png",
  ),
);

results.push(
  await plateFromStill(
    stills.still02,
    cardSvg({
      eyebrow: "SESSIONS",
      line1: "Sessions from 10:30 AM",
      support: "Sessions begin at ten thirty",
    }),
    "beat-04-sessions.png",
  ),
);

results.push(
  await plateFromStill(
    stills.endcardBg,
    cardSvg({
      eyebrow: "CONTACT",
      line1: "(555) 018-4421",
      line3: "cedar-lane-studio.example/book",
      support: "Call or visit to book",
      panelY: 1160,
    }),
    "beat-05-contact.png",
  ),
);

results.push(await ctaPlate());

console.log(JSON.stringify({ ok: true, plates: results }, null, 2));
