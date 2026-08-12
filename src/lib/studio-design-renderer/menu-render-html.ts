/**
 * Deterministic HTML/CSS renderer for MenuDesignSpec (v2-rtu-menu only).
 */

import { readFileSync } from "fs";
import path from "path";

import type { MenuDesignSpec } from "./menu-types";

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

export function renderMenuHtml(repoRoot: string, spec: MenuDesignSpec): string {
  const materialUri = new Map<string, string>();
  for (const m of spec.materials) {
    materialUri.set(m.materialId, dataUri(repoRoot, m.relativePath));
  }

  const parts: string[] = [];
  for (const layer of spec.layers) {
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
    const height =
      layer.height != null ? `height:${layer.height}px;` : "";
    const minFont = layer.minFontPx != null ? String(layer.minFontPx) : "";
    const itemAttr = layer.itemId ? ` data-item-id="${esc(layer.itemId)}"` : "";
    const sectionAttr = layer.sectionId
      ? ` data-section-id="${esc(layer.sectionId)}"`
      : "";
    parts.push(
      `<div class="layer text" data-id="${esc(layer.id)}" data-role="${esc(layer.role)}" data-min-font="${esc(minFont)}"${itemAttr}${sectionAttr} style="left:${layer.x}px;top:${layer.y}px;width:${layer.width}px;${height}font-size:${layer.fontSizePx}px;font-weight:${layer.fontWeight};line-height:${layer.lineHeight};color:${esc(layer.color)};text-align:${layer.align};${tracking}">${esc(layer.content)}</div>`,
    );
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Menu ${esc(spec.skuId)}</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: ${spec.canvas.widthPx}px;
    height: ${spec.canvas.heightPx}px;
    overflow: hidden;
    background: ${esc(spec.background.color)};
  }
  .canvas {
    position: relative;
    width: ${spec.canvas.widthPx}px;
    height: ${spec.canvas.heightPx}px;
    overflow: hidden;
    background: ${esc(spec.background.color)};
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
<main class="canvas" data-sku="${esc(spec.skuId)}" data-spec="${esc(spec.specVersion)}" data-typo="${esc(spec.typographyMode)}">
${parts.join("\n")}
</main>
</body>
</html>
`;
}

export function declaredTextFromMenuSpec(spec: MenuDesignSpec): string {
  return spec.layers
    .filter((l) => l.type === "text")
    .map((l) => l.content)
    .join(" ");
}
