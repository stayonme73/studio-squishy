/**
 * Deterministic Visual Prep — sharp-based metadata, crop, derivatives.
 * No Adobe. No generative expansion.
 */

import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";

import type { AssetAssessment, CampaignFormatId, PreparedVisualAsset, RectPx } from "./contracts";
import { CAMPAIGN_FORMAT_CANVASES } from "./formats";

function sha256Bytes(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function assessImageAsset(input: {
  assetId: string;
  absolutePath: string;
  minPrintEdgePx?: number;
}): Promise<AssetAssessment> {
  const buf = readFileSync(input.absolutePath);
  const contentSha256 = sha256Bytes(buf);
  const meta = await sharp(buf).metadata();
  const widthPx = meta.width ?? 0;
  const heightPx = meta.height ?? 0;
  const failReasons: string[] = [];

  if (widthPx < 1 || heightPx < 1) failReasons.push("unreadable_dimensions");
  if (!meta.format) failReasons.push("unknown_format");
  if (buf.length < 64) failReasons.push("file_too_small");

  const minEdge = input.minPrintEdgePx ?? 800;
  const tooSmallForPrint = Math.min(widthPx, heightPx) < minEdge;
  if (tooSmallForPrint) failReasons.push("below_min_edge");

  const orientation =
    widthPx === heightPx
      ? "square"
      : widthPx > heightPx
        ? "landscape"
        : "portrait";

  const focal: RectPx = {
    x: Math.floor(widthPx * 0.25),
    y: Math.floor(heightPx * 0.2),
    width: Math.floor(widthPx * 0.5),
    height: Math.floor(heightPx * 0.55),
  };

  return {
    assetId: input.assetId,
    contentSha256,
    mimeType:
      meta.format === "jpeg"
        ? "image/jpeg"
        : meta.format === "png"
          ? "image/png"
          : meta.format === "webp"
            ? "image/webp"
            : "application/octet-stream",
    widthPx,
    heightPx,
    orientation,
    technical: {
      usable: failReasons.length === 0,
      failReasons,
      tooSmallForPrint,
    },
    subject: {
      focalRegion: focal,
      safeCropRegion: {
        x: Math.floor(widthPx * 0.1),
        y: Math.floor(heightPx * 0.1),
        width: Math.floor(widthPx * 0.8),
        height: Math.floor(heightPx * 0.8),
      },
      protectedBounds: [focal],
    },
  };
}

/** Cover-crop around focal center into target aspect. */
export function computeCoverCrop(input: {
  sourceW: number;
  sourceH: number;
  targetW: number;
  targetH: number;
  focal?: RectPx;
}): RectPx {
  const targetAspect = input.targetW / input.targetH;
  const sourceAspect = input.sourceW / input.sourceH;
  let cropW: number;
  let cropH: number;
  if (sourceAspect > targetAspect) {
    cropH = input.sourceH;
    cropW = Math.round(cropH * targetAspect);
  } else {
    cropW = input.sourceW;
    cropH = Math.round(cropW / targetAspect);
  }
  const fx =
    input.focal != null
      ? input.focal.x + input.focal.width / 2
      : input.sourceW / 2;
  const fy =
    input.focal != null
      ? input.focal.y + input.focal.height / 2
      : input.sourceH / 2;
  let x = Math.round(fx - cropW / 2);
  let y = Math.round(fy - cropH / 2);
  x = Math.max(0, Math.min(x, input.sourceW - cropW));
  y = Math.max(0, Math.min(y, input.sourceH - cropH));
  return { x, y, width: cropW, height: cropH };
}

export async function prepareVisualAsset(input: {
  sourceAbsolutePath: string;
  assessment: AssetAssessment;
  formatId: CampaignFormatId;
  outAbsolutePath: string;
  contrastBoost?: number;
  targetCanvas?: { widthPx: number; heightPx: number };
  /** Gate X: customer crop/adapt denial must hard-stop this pipeline. */
  cropAdaptPermitted?: boolean;
}): Promise<PreparedVisualAsset> {
  if (!input.assessment.technical.usable) {
    throw new Error(
      `UNUSABLE_ASSET:${input.assessment.assetId}:${input.assessment.technical.failReasons.join(",")}`,
    );
  }
  if (input.cropAdaptPermitted === false) {
    throw new Error("NO_CROP_ADAPT: this customer file may not be cropped or adapted.");
  }
  const canvas =
    input.targetCanvas ?? CAMPAIGN_FORMAT_CANVASES[input.formatId];
  const crop = computeCoverCrop({
    sourceW: input.assessment.widthPx,
    sourceH: input.assessment.heightPx,
    targetW: canvas.widthPx,
    targetH: canvas.heightPx,
    focal: input.assessment.subject?.focalRegion,
  });

  mkdirSync(path.dirname(input.outAbsolutePath), { recursive: true });

  let pipeline = sharp(input.sourceAbsolutePath).extract({
    left: crop.x,
    top: crop.y,
    width: crop.width,
    height: crop.height,
  });

  pipeline = pipeline.resize(canvas.widthPx, canvas.heightPx, {
    fit: "fill",
  });

  if (input.contrastBoost != null && input.contrastBoost !== 1) {
    pipeline = pipeline.modulate({
      brightness: 1,
      saturation: 1,
    });
    // mild linear contrast via linear(a,b)
    pipeline = pipeline.linear(input.contrastBoost, -(128 * (input.contrastBoost - 1)));
  }

  const outBuf = await pipeline.jpeg({ quality: 90 }).toBuffer();
  writeFileSync(input.outAbsolutePath, outBuf);
  const contentSha256 = sha256Bytes(outBuf);
  const preparedId = `${input.assessment.assetId}__${input.formatId}__${contentSha256.slice(0, 12)}`;

  return {
    preparedId,
    sourceAssetId: input.assessment.assetId,
    forFormat: input.formatId,
    relativePath: input.outAbsolutePath, // caller rewrites to repo-relative
    contentSha256,
    cropApplied: crop,
    focalUsed: input.assessment.subject?.focalRegion,
  };
}
