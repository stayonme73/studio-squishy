/**
 * HTML renderer for campaign creative assets (Playwright capture input).
 */

import { readFileSync } from "fs";
import path from "path";

import type { CampaignAssetSpec, CampaignCreativeSetSpec } from "./types";
import { assertNoInternalLeakInCampaignText } from "./customer-safe";

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
  const abs = path.isAbsolute(rel) ? rel : path.join(repoRoot, rel);
  const buf = readFileSync(abs);
  return `data:${mimeFor(rel)};base64,${buf.toString("base64")}`;
}

export function declaredTextFromCampaignAsset(asset: CampaignAssetSpec): string {
  return asset.layers
    .filter((l): l is Extract<typeof l, { type: "text" }> => l.type === "text")
    .map((l) => l.content)
    .join(" ");
}

export function renderCampaignAssetHtml(
  repoRoot: string,
  setSpec: CampaignCreativeSetSpec,
  asset: CampaignAssetSpec,
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
      const opacity =
        layer.opacity != null ? `opacity:${layer.opacity};` : "";
      parts.push(
        `<div class="layer shape" data-id="${esc(layer.id)}" data-role="${esc(layer.role)}" style="left:${layer.x}px;top:${layer.y}px;width:${layer.width}px;height:${layer.height}px;background:${esc(layer.fill)};${radius}${opacity}"></div>`,
      );
      continue;
    }
    if (layer.type === "image") {
      const uri = materialUri.get(layer.materialId);
      if (!uri) throw new Error(`BROKEN_ASSET_REFERENCE:${layer.materialId}`);
      const objectFit = layer.fit === "cover" ? "cover" : "contain";
      parts.push(
        `<div class="layer image" data-id="${esc(layer.id)}" data-role="${esc(layer.role)}" style="left:${layer.x}px;top:${layer.y}px;width:${layer.width}px;height:${layer.height}px"><img src="${uri}" alt="" style="width:100%;height:100%;object-fit:${objectFit}" /></div>`,
      );
      continue;
    }
    assertNoInternalLeakInCampaignText(layer.content);
    const tracking =
      layer.letterSpacingPx != null
        ? `letter-spacing:${layer.letterSpacingPx}px;`
        : "";
    parts.push(
      `<div class="layer text" data-id="${esc(layer.id)}" data-role="${esc(layer.role)}" style="left:${layer.x}px;top:${layer.y}px;width:${layer.width}px;font-size:${layer.fontSizePx}px;font-weight:${layer.fontWeight};line-height:${layer.lineHeight};color:${esc(layer.color)};text-align:${layer.align};${tracking}">${esc(layer.content)}</div>`,
    );
  }

  const W = asset.canvas.widthPx;
  const H = asset.canvas.heightPx;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
html,body{margin:0;padding:0;width:${W}px;height:${H}px;overflow:hidden;background:${esc(asset.background.color)};}
.canvas{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${esc(asset.background.color)};font-family:Georgia,'Times New Roman',serif;}
.layer{position:absolute;box-sizing:border-box;}
.layer.text{white-space:pre-wrap;overflow:hidden;}
.layer.image img{display:block;}
</style></head><body><div class="canvas" data-asset="${esc(asset.assetId)}" data-recipe="${esc(asset.recipeId)}">${parts.join("")}</div></body></html>`;
}
