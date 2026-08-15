/**
 * RM-J007 HTML builder — reference-guided recreation of one updated promo.
 * Reference informs atmosphere; updated bounded facts are the main content.
 * Honesty: recreation, not pixel-perfect source edit.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

import {
  RM_J007_HONESTY_LINE,
  RM_J007_UPDATE_PLATE,
  type RmJ007UpdateProjectTruth,
} from "./rm-j007-types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function referenceDataUri(
  repoRoot: string,
  truth: RmJ007UpdateProjectTruth,
): { ok: true; uri: string } | { ok: false; message: string } {
  const ref = truth.referenceMaterial;
  if (!ref) {
    return { ok: false, message: "MISSING_REFERENCE: no reference material" };
  }
  const abs = path.join(repoRoot, ref.relativePath);
  if (!existsSync(abs)) {
    return {
      ok: false,
      message: `MISSING_REFERENCE: file missing at ${ref.relativePath}`,
    };
  }
  const buf = readFileSync(abs);
  if (ref.mime === "pdf") {
    return { ok: true, uri: "" };
  }
  const mime = ref.mime === "jpeg" ? "image/jpeg" : "image/png";
  return { ok: true, uri: `data:${mime};base64,${buf.toString("base64")}` };
}

/**
 * Build a recreated promotional item:
 * - reference as atmospheric direction (veiled backdrop)
 * - updated dates / prices / contact / wording as the live content
 * - honesty line — not a pixel-perfect source edit
 */
export function buildRmJ007UpdateHtml(input: {
  repoRoot: string;
  truth: RmJ007UpdateProjectTruth;
}): { ok: true; html: string } | { ok: false; message: string } {
  const { repoRoot, truth } = input;
  const resolved = referenceDataUri(repoRoot, truth);
  if (!resolved.ok) return resolved;

  const w = RM_J007_UPDATE_PLATE.widthPx;
  const h = RM_J007_UPDATE_PLATE.heightPx;
  const changes = truth.boundedChanges;
  const headline =
    changes.wording?.trim() ||
    truth.itemIdentity.replace(/\s*\(existing\)\s*$/i, "").trim() ||
    "Updated promotion";
  const dateLine = changes.dates?.trim() || "";
  const priceLine = changes.prices?.trim() || "";
  const contactLine = changes.contact?.trim() || "";
  const removeLine = changes.remove?.trim() || "";

  const bg =
    resolved.uri.length > 0
      ? `background-image: url("${resolved.uri}"); background-size: cover; background-position: center;`
      : `background: linear-gradient(165deg, #1F3A5F, #2C4A6E);`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(truth.businessName)} — Updated promotion</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: ${w}px; height: ${h}px; overflow: hidden; }
  .canvas {
    width: ${w}px; height: ${h}px;
    position: relative;
    overflow: hidden;
    font-family: Georgia, "Times New Roman", serif;
    color: #F7F4EF;
    background: #142033;
  }
  .ref {
    position: absolute; inset: -24px;
    ${bg}
    filter: blur(18px) saturate(0.9) brightness(0.75);
    transform: scale(1.06);
  }
  .veil {
    position: absolute; inset: 0;
    background: linear-gradient(165deg, rgba(18,28,42,0.78) 0%, rgba(18,28,42,0.86) 50%, rgba(31,58,95,0.9) 100%);
  }
  .content {
    position: absolute; inset: 0;
    padding: 72px 64px 56px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .eyebrow {
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-size: 18px;
    opacity: 0.9;
    font-family: Arial, Helvetica, sans-serif;
  }
  h1 {
    font-size: 56px;
    line-height: 1.12;
    font-weight: 400;
    margin-top: 28px;
    max-width: 920px;
  }
  .meta {
    margin-top: 28px;
    font-size: 28px;
    line-height: 1.35;
    opacity: 0.95;
  }
  .price {
    margin-top: 18px;
    font-size: 52px;
    line-height: 1.1;
  }
  .contact {
    font-size: 22px;
    opacity: 0.92;
    font-family: Arial, Helvetica, sans-serif;
  }
  .remove {
    margin-top: 14px;
    font-size: 18px;
    opacity: 0.8;
    font-family: Arial, Helvetica, sans-serif;
  }
  .honesty {
    margin-top: 18px;
    font-size: 14px;
    line-height: 1.4;
    color: rgba(247,244,239,0.72);
    font-family: Arial, Helvetica, sans-serif;
    max-width: 880px;
  }
</style>
</head>
<body>
  <div class="canvas">
    <div class="ref" aria-hidden="true"></div>
    <div class="veil" aria-hidden="true"></div>
    <div class="content">
      <div>
        <div class="eyebrow">${escapeHtml(truth.businessName)}</div>
        <h1>${escapeHtml(headline)}</h1>
        ${dateLine ? `<p class="meta">${escapeHtml(dateLine)}</p>` : ""}
        ${priceLine ? `<p class="price">${escapeHtml(priceLine)}</p>` : ""}
        ${removeLine ? `<p class="remove">No longer includes: ${escapeHtml(removeLine)}</p>` : ""}
      </div>
      <div>
        ${contactLine ? `<p class="contact">${escapeHtml(contactLine)}</p>` : ""}
        <p class="honesty">${escapeHtml(RM_J007_HONESTY_LINE)}</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

  return { ok: true, html };
}
