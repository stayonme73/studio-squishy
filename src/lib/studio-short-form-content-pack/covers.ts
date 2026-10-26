import { mkdirSync } from "fs";
import path from "path";
import sharp from "sharp";

import { studioShortFormContentPackFactoryV1 as pack } from "@/config/studio-short-form-content-pack-factory-v1";
import { paintExactTextLine } from "@/lib/studio-short-form-video-editing/caption-burn";

export type PackCover = {
  clipId: string;
  relativePath: string;
  title: string;
  supportingLine: string;
};

export function wrapCoverLines(text: string, max = 26): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function paintPackCover(input: {
  clipId: string;
  title: string;
  supportingLine: string;
  setIndex: number;
  setCount: number;
  outputAbsolutePath: string;
  eyebrow?: string;
}): Promise<PackCover | { ok: false; message: string }> {
  mkdirSync(path.dirname(input.outputAbsolutePath), { recursive: true });
  const work = path.dirname(input.outputAbsolutePath);
  const eyebrow = path.join(work, `${input.clipId}-eyebrow.png`);
  const clipLine = path.join(work, `${input.clipId}-clipline.png`);
  const title = input.title.replace(/\s+/g, " ").trim();
  const supporting = input.supportingLine.replace(/\s+/g, " ").trim();
  const titleLines = wrapCoverLines(title, supporting ? 22 : 16);
  const supportLines = supporting ? wrapCoverLines(supporting, 28) : [];
  if (!titleLines.length || titleLines.join(" ") !== title) {
    return { ok: false, message: `Cover title wrap dropped words for ${input.clipId}.` };
  }
  if (supporting && (!supportLines.length || supportLines.join(" ") !== supporting)) {
    return { ok: false, message: `Cover supporting line wrap dropped words for ${input.clipId}.` };
  }
  const eyebrowPaint = await paintExactTextLine({
    text: input.eyebrow ?? "Short-Form Content Pack",
    outputAbsolutePath: eyebrow,
    width: 900,
    height: 80,
    fontSize: 28,
    fill: pack.visual.ctaBackground,
    background: "transparent",
  });
  if (!eyebrowPaint.ok) return eyebrowPaint;
  const clipPaint = await paintExactTextLine({
    text: `Clip ${input.setIndex} of ${input.setCount}`,
    outputAbsolutePath: clipLine,
    width: 900,
    height: 70,
    fontSize: 26,
    fill: pack.visual.ctaBackground,
    background: "transparent",
  });
  if (!clipPaint.ok) return clipPaint;
  const composites: sharp.OverlayOptions[] = [
    {
      input: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?><svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"><rect x="48" y="48" width="984" height="1824" fill="none" stroke="${pack.visual.ctaBackground}" stroke-width="10"/></svg>`,
      ),
      left: 0,
      top: 0,
    },
    { input: eyebrow, left: 90, top: 180 },
    { input: clipLine, left: 90, top: 260 },
  ];
  const titleTop = supportLines.length
    ? 760
    : Math.max(420, Math.round((1920 - titleLines.length * 120) / 2));
  for (const [index, line] of titleLines.entries()) {
    const file = path.join(work, `${input.clipId}-title-${index}.png`);
    const painted = await paintExactTextLine({
      text: line,
      outputAbsolutePath: file,
      width: 900,
      height: 110,
      fontSize: 48,
      fill: "#F7F3EC",
      background: "transparent",
    });
    if (!painted.ok) return painted;
    composites.push({ input: file, left: 90, top: titleTop + index * 120 });
  }
  if (supportLines.length > 0) {
    const supportStep = supportLines.length > 6 ? 72 : 88;
    const supportTop = Math.min(1120, 1860 - supportLines.length * supportStep);
    for (const [index, line] of supportLines.entries()) {
      const file = path.join(work, `${input.clipId}-support-${index}.png`);
      const painted = await paintExactTextLine({
        text: line,
        outputAbsolutePath: file,
        width: 900,
        height: 80,
        fontSize: 28,
        fill: "#E8DCC8",
        background: "transparent",
      });
      if (!painted.ok) return painted;
      composites.push({ input: file, left: 90, top: supportTop + index * supportStep });
    }
  }
  await sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 4,
      background: { r: 46, g: 43, b: 40, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(input.outputAbsolutePath);
  return {
    clipId: input.clipId,
    relativePath: input.outputAbsolutePath,
    title,
    supportingLine: supporting,
  };
}
