import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import type { CampaignMaterialItem } from "@/lib/materials/types";
import { isCustomerContentClearedForProduction } from "@/lib/studio-customer-content-intake/production-gate";

import {
  CREATIVE_QA_ASSET_SLOT_IDS,
  CREATIVE_QA_CANVAS_PX,
  CREATIVE_QA_FACTS_SLOT_ID,
  CREATIVE_QA_MAX_ROUNDS,
  CREATIVE_QA_PAPER,
  creativeQaMarginForRound,
} from "./contract";

export type CreativeQaFinishFailureCode =
  | "rights_not_cleared"
  | "adapt_not_permitted"
  | "facts_missing"
  | "correction_missing"
  | "correction_not_in_scope"
  | "video_not_supported"
  | "source_unreadable"
  | "revision_round_exceeded"
  | "quality_failed";

export type CreativeQaSummary = {
  preservedFacts: string;
  requestedCorrection: string;
  revisionRound: number;
  marginPx: number;
  canvasPx: number;
  contentWidth: number;
  contentHeight: number;
  sourceSha256: string;
  outputSha256: string;
  sourceWidth: number;
  sourceHeight: number;
};

export type CreativeQaFinishResult =
  | { ok: true; png: Buffer; summary: CreativeQaSummary }
  | { ok: false; code: CreativeQaFinishFailureCode; message: string };

export function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function readCreativeQaSourceBytes(
  item: CampaignMaterialItem,
): Promise<Buffer | null> {
  const ref = item.storageRef;
  if (!ref || ref.provider !== "google_shared_drive") return null;
  if (ref.referenceKind !== "path_hint") return null;
  const candidate = ref.reference.trim();
  if (!path.isAbsolute(candidate)) return null;
  try {
    return await readFile(candidate);
  } catch {
    return null;
  }
}

function requestsRedesign(request: string): boolean {
  return /\b(?:brand colors?|fonts?|typefaces?|redesign|reconstruct|rebuild|new layout|change the layout)\b/i.test(
    request,
  );
}

function requestsRedrawnWording(request: string): boolean {
  if (/\b(?:rewrite|reword|respell|typo)\b/i.test(request)) return true;
  if (/\bdo not change\b/i.test(request)) return false;
  return /\b(?:change|replace)\s+(?:the\s+)?(?:word|words|price|text|headline|copy|spelling)\b/i.test(
    request,
  );
}

function fail(
  code: CreativeQaFinishFailureCode,
  message: string,
): Extract<CreativeQaFinishResult, { ok: false }> {
  return { ok: false, code, message };
}

export function creativeQaFactsText(items: readonly CampaignMaterialItem[]): string {
  const slot = items.find((item) => item.id === CREATIVE_QA_FACTS_SLOT_ID);
  return slot?.text?.trim() ?? "";
}

export function creativeQaStoredAssets(
  items: readonly CampaignMaterialItem[],
): CampaignMaterialItem[] {
  const stored: CampaignMaterialItem[] = [];
  for (const id of CREATIVE_QA_ASSET_SLOT_IDS) {
    const item = items.find((entry) => entry.id === id);
    if (!item || item.uploadStatus !== "stored" || item.contentKind !== "file-metadata") {
      continue;
    }
    stored.push(item);
  }
  return stored;
}

export function creativeQaAssetBlock(
  item: CampaignMaterialItem,
): Extract<CreativeQaFinishResult, { ok: false }> | null {
  const mime = (item.mimeType ?? "").toLowerCase();
  if (mime.startsWith("video/")) {
    return fail("video_not_supported", "Creative QA & Finish does not accept video.");
  }
  if (!isCustomerContentClearedForProduction(item)) {
    return fail("rights_not_cleared", "The static asset is not cleared for production use.");
  }
  if (item.contentCertification?.rights.cropAdaptPermitted !== true) {
    return fail(
      "adapt_not_permitted",
      "Permission to adapt the supplied creative is required before the file can be placed on a finished canvas.",
    );
  }
  return null;
}

type Rgba = { r: number; g: number; b: number; a: number };

async function decode(bytes: Buffer): Promise<{
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}> {
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  };
}

function pixelAt(
  data: Buffer,
  width: number,
  channels: number,
  x: number,
  y: number,
): Rgba {
  const index = (y * width + x) * channels;
  return {
    r: data[index] ?? 0,
    g: data[index + 1] ?? 0,
    b: data[index + 2] ?? 0,
    a: data[index + 3] ?? 0,
  };
}

function isPaper(value: Rgba): boolean {
  return (
    Math.abs(value.r - CREATIVE_QA_PAPER.r) <= 2 &&
    Math.abs(value.g - CREATIVE_QA_PAPER.g) <= 2 &&
    Math.abs(value.b - CREATIVE_QA_PAPER.b) <= 2
  );
}

function centeredOrigins(content: number): number[] {
  const exact = (CREATIVE_QA_CANVAS_PX - content) / 2;
  return [...new Set([Math.floor(exact), Math.round(exact)])];
}

function pixelDelta(
  output: { data: Buffer; width: number; channels: number },
  expected: Buffer,
  originX: number,
  originY: number,
  contentWidth: number,
  contentHeight: number,
): number {
  let maxDelta = 0;
  for (let y = 0; y < contentHeight; y += 1) {
    for (let x = 0; x < contentWidth; x += 1) {
      const got = pixelAt(output.data, output.width, output.channels, originX + x, originY + y);
      const index = (y * contentWidth + x) * 4;
      maxDelta = Math.max(
        maxDelta,
        Math.abs(got.r - (expected[index] ?? 0)),
        Math.abs(got.g - (expected[index + 1] ?? 0)),
        Math.abs(got.b - (expected[index + 2] ?? 0)),
      );
      if (maxDelta > 2) return maxDelta;
    }
  }
  return maxDelta;
}

export async function inspectCreativeQaOutput(input: {
  png: Buffer;
  source: Buffer;
  facts: string;
  summary: CreativeQaSummary;
}): Promise<{ pass: boolean; defects: string[] }> {
  const defects: string[] = [];
  let meta: sharp.Metadata;
  try {
    meta = await sharp(input.png).metadata();
  } catch {
    return { pass: false, defects: ["The finished file does not open."] };
  }
  if (
    meta.format !== "png" ||
    meta.width !== CREATIVE_QA_CANVAS_PX ||
    meta.height !== CREATIVE_QA_CANVAS_PX
  ) {
    defects.push("Output is not a 1080 by 1080 PNG.");
  }
  if (input.summary.preservedFacts !== input.facts) defects.push("Facts were changed.");
  if (input.summary.requestedCorrection.trim().length === 0) {
    defects.push("The correction request was not kept.");
  }
  if (input.summary.outputSha256 !== sha256(input.png)) {
    defects.push("The output checksum does not match the file.");
  }
  if (
    input.summary.canvasPx !== CREATIVE_QA_CANVAS_PX ||
    input.summary.contentWidth < 1 ||
    input.summary.contentHeight < 1
  ) {
    defects.push("Output dimensions were not intentional.");
  }

  const sourceMeta = await sharp(input.source).metadata();
  if (!sourceMeta.width || !sourceMeta.height) {
    defects.push("The source asset has no dimensions.");
    return { pass: false, defects };
  }
  const sourceAspect = sourceMeta.width / sourceMeta.height;
  const contentAspect = input.summary.contentWidth / input.summary.contentHeight;
  if (Math.abs(sourceAspect - contentAspect) / sourceAspect > 0.03) {
    defects.push("The source proportions were not preserved.");
  }

  const output = await decode(input.png);
  const corner = pixelAt(output.data, output.width, output.channels, 0, 0);
  if (!isPaper(corner)) defects.push("The artwork runs to the edge.");

  const inner = CREATIVE_QA_CANVAS_PX - input.summary.marginPx * 2;
  const refit = await sharp(input.source)
    .resize(inner, inner, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    input.summary.contentWidth !== refit.info.width ||
    input.summary.contentHeight !== refit.info.height
  ) {
    defects.push("The fitted artwork size does not match the source.");
  }
  const expected = refit.data;
  const xOrigins = centeredOrigins(input.summary.contentWidth);
  const yOrigins = centeredOrigins(input.summary.contentHeight);
  let bestDelta = Number.POSITIVE_INFINITY;
  let bestX = xOrigins[0] ?? 0;
  let bestY = yOrigins[0] ?? 0;
  for (const originX of xOrigins) {
    for (const originY of yOrigins) {
      const delta = pixelDelta(
        output,
        expected,
        originX,
        originY,
        input.summary.contentWidth,
        input.summary.contentHeight,
      );
      if (delta < bestDelta) {
        bestDelta = delta;
        bestX = originX;
        bestY = originY;
      }
    }
  }
  const inset = input.summary.marginPx - 1;
  if (bestX < inset || bestY < inset) {
    defects.push("The margin is smaller than the requested finish.");
  }
  if (bestX > 0) {
    const outside = pixelAt(output.data, output.width, output.channels, bestX - 1, bestY);
    if (!isPaper(outside)) defects.push("The artwork overflows the margin.");
  }
  if (bestDelta > 2) defects.push("The artwork pixels were changed.");

  return { pass: defects.length === 0, defects };
}

export async function finishCreativeQaAsset(input: {
  source: Buffer;
  facts: string;
  correctionRequest: string;
  revisionRound: number;
}): Promise<CreativeQaFinishResult> {
  const facts = input.facts.trim();
  const correctionRequest = input.correctionRequest.trim();
  if (!facts) return fail("facts_missing", "Facts to confirm are missing.");
  if (!correctionRequest) {
    return fail("correction_missing", "The correction request is missing.");
  }
  if (requestsRedrawnWording(correctionRequest) || requestsRedesign(correctionRequest)) {
    return fail(
      "correction_not_in_scope",
      "Creative QA & Finish keeps the supplied artwork. It does not redraw wording, colors, fonts, or layout.",
    );
  }
  if (!Number.isInteger(input.revisionRound) || input.revisionRound < 1) {
    return fail("revision_round_exceeded", "Creative QA & Finish includes 3 revision rounds.");
  }
  if (input.revisionRound > CREATIVE_QA_MAX_ROUNDS) {
    return fail("revision_round_exceeded", "Creative QA & Finish includes 3 revision rounds.");
  }
  const marginPx = creativeQaMarginForRound(input.revisionRound, correctionRequest);
  if (marginPx == null) {
    return fail("revision_round_exceeded", "Creative QA & Finish includes 3 revision rounds.");
  }

  let sourceMeta: sharp.Metadata;
  try {
    sourceMeta = await sharp(input.source).metadata();
  } catch {
    return fail("source_unreadable", "The static asset could not be opened.");
  }
  if (!sourceMeta.width || !sourceMeta.height) {
    return fail("source_unreadable", "The static asset has no dimensions.");
  }

  const inner = CREATIVE_QA_CANVAS_PX - marginPx * 2;
  const contained = await sharp(input.source)
    .resize(inner, inner, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const containedMeta = await sharp(contained).metadata();
  if (!containedMeta.width || !containedMeta.height) {
    return fail("source_unreadable", "The fitted artwork has no dimensions.");
  }
  const png = await sharp({
    create: {
      width: CREATIVE_QA_CANVAS_PX,
      height: CREATIVE_QA_CANVAS_PX,
      channels: 4,
      background: CREATIVE_QA_PAPER,
    },
  })
    .composite([{ input: contained, gravity: "centre" }])
    .png()
    .toBuffer();

  const summary: CreativeQaSummary = {
    preservedFacts: facts,
    requestedCorrection: correctionRequest,
    revisionRound: input.revisionRound,
    marginPx,
    canvasPx: CREATIVE_QA_CANVAS_PX,
    contentWidth: containedMeta.width,
    contentHeight: containedMeta.height,
    sourceSha256: sha256(input.source),
    outputSha256: sha256(png),
    sourceWidth: sourceMeta.width,
    sourceHeight: sourceMeta.height,
  };
  const inspection = await inspectCreativeQaOutput({
    png,
    source: input.source,
    facts,
    summary,
  });
  if (!inspection.pass) {
    return fail("quality_failed", inspection.defects.join(" "));
  }
  return { ok: true, png, summary };
}

/** A full-bleed crop. Quality must reject it. This is not a deliverable. */
export async function coverCroppedSquare(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .resize(CREATIVE_QA_CANVAS_PX, CREATIVE_QA_CANVAS_PX, { fit: "cover" })
    .png()
    .toBuffer();
}
