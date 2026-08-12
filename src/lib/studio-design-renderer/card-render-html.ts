/**
 * HTML/CSS renderer for one business-card side (bounded layers).
 * Additive — does not modify flyer renderFlyerHtml.
 */

import { readFileSync } from "fs";
import path from "path";

import type {
  BusinessCardDesignSpec,
  BusinessCardSideSpec,
} from "./card-types";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function mimeFor(rel: string): string {
  if (rel.endsWith(".svg")) return "image/svg+xml";
  if (rel.endsWith(".png")) return "image/png";
  if (rel.endsWith(".jpg") || rel.endsWith(".jpeg")) return "image/jpeg";
  if (rel.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function dataUri(repoRoot: string, rel: string): string {
  const abs = path.join(repoRoot, rel);
  const buf = readFileSync(abs);
  return `data:${mimeFor(rel)};base64,${buf.toString("base64")}`;
}

function renderSideInner(
  repoRoot: string,
  spec: BusinessCardDesignSpec,
  side: BusinessCardSideSpec,
): string {
  const materialUri = new Map<string, string>();
  for (const m of spec.materials) {
    materialUri.set(m.materialId, dataUri(repoRoot, m.relativePath));
  }

  const parts: string[] = [];
  for (const layer of side.layers) {
    if (layer.type === "shape") {
      const radius =
        layer.borderRadiusPx != null
          ? `border-radius:${layer.borderRadiusPx}px;`
          : "";
      parts.push(
        `<div class="layer shape" data-id="${esc(layer.id)}" data-role="${esc(layer.role)}" style="left:${layer.x}px;top:${layer.y}px;width:${layer.width}px;height:${layer.height}px;background:${esc(layer.fill)};${radius}"></div>`,
      );
      continue;
    }
    if (layer.type === "image") {
      const uri = materialUri.get(layer.materialId);
      if (!uri) {
        throw new Error(`BROKEN_ASSET_REFERENCE:${layer.materialId}`);
      }
      const objectFit = layer.fit === "cover" ? "cover" : "contain";
      parts.push(
        `<div class="layer image" data-id="${esc(layer.id)}" data-role="${esc(layer.role)}" style="left:${layer.x}px;top:${layer.y}px;width:${layer.width}px;height:${layer.height}px"><img src="${uri}" alt="" style="width:100%;height:100%;object-fit:${objectFit}" /></div>`,
      );
      continue;
    }
    const tracking =
      layer.letterSpacingPx != null
        ? `letter-spacing:${layer.letterSpacingPx}px;`
        : "";
    parts.push(
      `<div class="layer text" data-id="${esc(layer.id)}" data-role="${esc(layer.role)}" style="left:${layer.x}px;top:${layer.y}px;width:${layer.width}px;font-size:${layer.fontSizePx}px;font-weight:${layer.fontWeight};line-height:${layer.lineHeight};color:${esc(layer.color)};text-align:${layer.align};${tracking}">${esc(layer.content)}</div>`,
    );
  }
  return parts.join("\n");
}

export function renderBusinessCardSideHtml(
  repoRoot: string,
  spec: BusinessCardDesignSpec,
  side: BusinessCardSideSpec,
): string {
  const inner = renderSideInner(repoRoot, spec, side);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Business card ${esc(side.side)} ${esc(spec.skuId)}</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: ${spec.canvas.widthPx}px;
    height: ${spec.canvas.heightPx}px;
    overflow: hidden;
    background: ${esc(side.background.color)};
  }
  .canvas {
    position: relative;
    width: ${spec.canvas.widthPx}px;
    height: ${spec.canvas.heightPx}px;
    overflow: hidden;
    background: ${esc(side.background.color)};
    font-family: "Source Serif 4", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  }
  .layer { position: absolute; box-sizing: border-box; }
  .layer.text {
    white-space: pre-wrap;
    overflow: hidden;
  }
  .layer.image img { display: block; }
</style>
</head>
<body>
<main class="canvas" data-sku="${esc(spec.skuId)}" data-side="${esc(side.side)}" data-spec="${esc(spec.specVersion)}">
${inner}
</main>
</body>
</html>
`;
}

/** Two-page print HTML — front then back — for flattened “print-ready” PDF. */
export function renderBusinessCardPrintHtml(
  repoRoot: string,
  spec: BusinessCardDesignSpec,
): string {
  const w = spec.canvas.widthPx;
  const h = spec.canvas.heightPx;
  const frontInner = renderSideInner(repoRoot, spec, spec.front);
  const backInner = renderSideInner(repoRoot, spec, spec.back);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Business card print ${esc(spec.skuId)}</title>
<style>
  @page { size: ${w}px ${h}px; margin: 0; }
  html, body { margin: 0; padding: 0; }
  .page {
    position: relative;
    width: ${w}px;
    height: ${h}px;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    font-family: "Source Serif 4", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  }
  .page.front { background: ${esc(spec.front.background.color)}; }
  .page.back { background: ${esc(spec.back.background.color)}; page-break-after: auto; break-after: auto; }
  .layer { position: absolute; box-sizing: border-box; }
  .layer.text { white-space: pre-wrap; overflow: hidden; }
  .layer.image img { display: block; }
</style>
</head>
<body>
<section class="page front canvas" data-side="front">${frontInner}</section>
<section class="page back canvas" data-side="back">${backInner}</section>
</body>
</html>
`;
}

export function declaredTextFromCardSide(side: BusinessCardSideSpec): string {
  return side.layers
    .filter((l) => l.type === "text")
    .map((l) => l.content)
    .join(" ");
}
