/**
 * Deterministic HTML renderer for one square social post (canvas-sized).
 * Same approach as the flyer/promo lanes — fixed canvas, absolute layers, no clipping.
 */

import { readFileSync } from "fs";
import path from "path";

import type { SocialPostAssetSpec, SocialPostsSetSpec } from "./social-posts-types";

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
  return "application/octet-stream";
}

function dataUri(repoRoot: string, rel: string): string {
  const abs = path.join(repoRoot, rel);
  const buf = readFileSync(abs);
  return `data:${mimeFor(rel)};base64,${buf.toString("base64")}`;
}

export function declaredTextFromSocialPostAsset(
  asset: SocialPostAssetSpec,
): string {
  return asset.layers
    .filter((l): l is Extract<typeof l, { type: "text" }> => l.type === "text")
    .map((l) => l.content)
    .join(" ");
}

export function renderSocialPostAssetHtml(
  repoRoot: string,
  setSpec: SocialPostsSetSpec,
  asset: SocialPostAssetSpec,
): string {
  const materialUri = new Map<string, string>();
  for (const m of setSpec.materials) {
    materialUri.set(m.materialId, dataUri(repoRoot, m.relativePath));
  }

  const parts: string[] = [];
  for (const layer of asset.layers) {
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Social post ${esc(asset.assetId)}</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: ${asset.canvas.widthPx}px;
    height: ${asset.canvas.heightPx}px;
    overflow: hidden;
    background: ${esc(asset.background.color)};
  }
  .canvas {
    position: relative;
    width: ${asset.canvas.widthPx}px;
    height: ${asset.canvas.heightPx}px;
    overflow: hidden;
    background: ${esc(asset.background.color)};
    font-family: "Source Serif 4", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  }
  .layer { position: absolute; box-sizing: border-box; }
  .layer.text { white-space: pre-wrap; overflow: hidden; }
  .layer.image img { display: block; }
</style>
</head>
<body>
  <div class="canvas" data-asset-id="${esc(asset.assetId)}" data-order-index="${asset.orderIndex}" data-role-angle="${esc(asset.roleAngle)}" data-purpose="${esc(asset.authorizedPurpose)}" data-plate="${esc(asset.plateId)}">
    ${parts.join("\n    ")}
  </div>
</body>
</html>
`;
}
