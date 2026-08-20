/**
 * Generate deterministic synthetic proof images (NOT Nia live-cert photos).
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";

export async function writeSyntheticProofAssets(dirAbs: string): Promise<{
  logoRelName: string;
  heroPortraitRelName: string;
  heroLandscapeRelName: string;
  heroAltPortraitRelName: string;
}> {
  mkdirSync(dirAbs, { recursive: true });

  const logoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="40" fill="#F7F3EC"/>
  <circle cx="128" cy="100" r="36" fill="none" stroke="#1F3A4D" stroke-width="8"/>
  <text x="128" y="190" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#1F3A4D">R&amp;R</text>
</svg>`;
  writeFileSync(path.join(dirAbs, "proof-logo.svg"), logoSvg);

  // Soft portrait gradient "photo" — calm wellness stand-in
  await sharp({
    create: {
      width: 1200,
      height: 1600,
      channels: 3,
      background: { r: 180, g: 160, b: 140 },
    },
  })
    .jpeg({ quality: 88 })
    .toFile(path.join(dirAbs, "proof-hero-portrait.jpg"));

  await sharp({
    create: {
      width: 1600,
      height: 1200,
      channels: 3,
      background: { r: 150, g: 170, b: 160 },
    },
  })
    .jpeg({ quality: 88 })
    .toFile(path.join(dirAbs, "proof-hero-landscape.jpg"));

  await sharp({
    create: {
      width: 1100,
      height: 1500,
      channels: 3,
      background: { r: 200, g: 185, b: 170 },
    },
  })
    .jpeg({ quality: 88 })
    .toFile(path.join(dirAbs, "proof-hero-alt-portrait.jpg"));

  return {
    logoRelName: "proof-logo.svg",
    heroPortraitRelName: "proof-hero-portrait.jpg",
    heroLandscapeRelName: "proof-hero-landscape.jpg",
    heroAltPortraitRelName: "proof-hero-alt-portrait.jpg",
  };
}
