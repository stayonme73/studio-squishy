/**
 * Rights-safe Spruce Line disposable-cert test logo (synthetic — not a real brand).
 * Used by Cert-7+ PREP and isolated preview rasters (same bytes production renderer reads).
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const SPRUCE_LINE_CERT_LOGO_CANONICAL_REL =
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/cert-7-synthetic-logo/spruce-line-studio-test-logo-v1.png";

export const SPRUCE_LINE_CERT_LOGO_PROVENANCE = {
  id: "spruce-line-studio-test-logo-v1",
  kind: "synthetic_disposable_cert_fixture",
  businessIdentity: "Spruce Line Studio (disposable cert scenario only)",
  ownership:
    "Studio-generated test artwork — no real customer mark, no third-party brand assets.",
  dimensionsPx: { width: 512, height: 512 },
  palette: {
    background: "#F7F4EF",
    primary: "#1F3A5F",
    accent: "#3F5A4A",
    trim: "#C4A574",
  },
  labelEmbedded: "SYNTHETIC TEST LOGO",
};

const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${SPRUCE_LINE_CERT_LOGO_PROVENANCE.palette.background}"/>
  <circle cx="256" cy="230" r="168" fill="${SPRUCE_LINE_CERT_LOGO_PROVENANCE.palette.primary}"/>
  <path d="M256 120 L296 200 L256 180 L216 200 Z" fill="${SPRUCE_LINE_CERT_LOGO_PROVENANCE.palette.accent}"/>
  <path d="M256 340 L220 260 L256 280 L292 260 Z" fill="${SPRUCE_LINE_CERT_LOGO_PROVENANCE.palette.accent}" opacity="0.85"/>
  <text x="256" y="248" text-anchor="middle" font-family="Georgia, serif" font-size="88" font-weight="700" fill="${SPRUCE_LINE_CERT_LOGO_PROVENANCE.palette.trim}">SL</text>
  <text x="256" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="600" letter-spacing="2" fill="${SPRUCE_LINE_CERT_LOGO_PROVENANCE.palette.primary}">SPRUCE LINE STUDIO</text>
  <text x="256" y="448" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#5A6570">SYNTHETIC TEST LOGO — DISPOSABLE CERT ONLY</text>
</svg>`;

/** @returns {Promise<{ absolutePath: string, relativePath: string, sha256: string, width: number, height: number }>} */
export async function ensureSpruceLineCertSyntheticLogo(repoRoot = process.cwd()) {
  const relativePath = SPRUCE_LINE_CERT_LOGO_CANONICAL_REL.replace(/\\/g, "/");
  const absolutePath = path.join(repoRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });

  let bytes;
  try {
    bytes = await readFile(absolutePath);
  } catch {
    bytes = null;
  }

  if (!bytes || bytes.length < 500) {
    bytes = await sharp(Buffer.from(SVG)).png({ compressionLevel: 9 }).toBuffer();
    await writeFile(absolutePath, bytes);
  }

  const meta = await sharp(bytes).metadata();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    absolutePath,
    relativePath,
    sha256,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    bytes,
  };
}

export async function spruceLineCertSyntheticLogoBytes(repoRoot = process.cwd()) {
  const info = await ensureSpruceLineCertSyntheticLogo(repoRoot);
  return info.bytes;
}
