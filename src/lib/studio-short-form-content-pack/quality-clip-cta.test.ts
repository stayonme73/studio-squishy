import { mkdtempSync } from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { inspectQualityPng } from "./quality-review";

describe("Quality Clip CTA treatment", () => {
  it("recognizes the painted Clip teal-and-white end card", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "clip-cta-qa-"));
    const line = path.join(dir, "cta-card.png");
    const plate = await sharp({
      create: {
        width: 960,
        height: 160,
        channels: 3,
        background: { r: 31, g: 74, b: 68 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 520,
              height: 36,
              channels: 3,
              background: { r: 255, g: 255, b: 255 },
            },
          })
            .png()
            .toBuffer(),
          left: 220,
          top: 62,
        },
      ])
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: 1080,
        height: 1920,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .composite([{ input: plate, left: 60, top: 880 }])
      .png()
      .toFile(line);
    const inspected = await inspectQualityPng(line);
    expect(inspected.cta.champagne).toBe(false);
    expect(inspected.cta.clipCard).toBe(true);
  });

  it("does not treat a plain talking-head crop as a Clip CTA card", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "clip-cta-blank-"));
    const blank = path.join(dir, "blank.png");
    await sharp({
      create: {
        width: 1080,
        height: 1920,
        channels: 3,
        background: { r: 86, g: 72, b: 64 },
      },
    })
      .png()
      .toFile(blank);
    const inspected = await inspectQualityPng(blank);
    expect(inspected.cta.clipCard).toBe(false);
    expect(inspected.cta.champagne).toBe(false);
  });
});
