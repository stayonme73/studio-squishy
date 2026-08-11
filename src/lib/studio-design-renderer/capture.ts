/**
 * Playwright capture — fixed canvas PNG + PDF. No Owner GUI.
 */

import { mkdirSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";

import { FLYER_CANVAS } from "./types";

export type CaptureResult = {
  pngAbsolutePath: string;
  pdfAbsolutePath: string;
  widthPx: number;
  heightPx: number;
  overflowOk: boolean;
  overflowDetail: string;
};

export async function captureFlyerExports(input: {
  htmlAbsolutePath: string;
  pngAbsolutePath: string;
  pdfAbsolutePath: string;
  widthPx?: number;
  heightPx?: number;
}): Promise<CaptureResult> {
  const widthPx = input.widthPx ?? FLYER_CANVAS.widthPx;
  const heightPx = input.heightPx ?? FLYER_CANVAS.heightPx;
  mkdirSync(path.dirname(input.pngAbsolutePath), { recursive: true });
  mkdirSync(path.dirname(input.pdfAbsolutePath), { recursive: true });

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: widthPx, height: heightPx },
      deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(input.htmlAbsolutePath).href, {
      waitUntil: "load",
    });

    const metrics = await page.evaluate(() => {
      const root = document.querySelector(".canvas") as HTMLElement | null;
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        scrollHeight: doc.scrollHeight,
        canvasW: root?.offsetWidth ?? 0,
        canvasH: root?.offsetHeight ?? 0,
      };
    });

    const overflowOk =
      metrics.scrollWidth <= widthPx + 1 &&
      metrics.scrollHeight <= heightPx + 1 &&
      metrics.canvasW === widthPx &&
      metrics.canvasH === heightPx;

    await page.screenshot({
      path: input.pngAbsolutePath,
      type: "png",
      clip: { x: 0, y: 0, width: widthPx, height: heightPx },
      omitBackground: false,
    });

    await page.pdf({
      path: input.pdfAbsolutePath,
      width: `${widthPx}px`,
      height: `${heightPx}px`,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await page.close();

    return {
      pngAbsolutePath: input.pngAbsolutePath,
      pdfAbsolutePath: input.pdfAbsolutePath,
      widthPx,
      heightPx,
      overflowOk,
      overflowDetail: `scroll=${metrics.scrollWidth}x${metrics.scrollHeight} canvas=${metrics.canvasW}x${metrics.canvasH}`,
    };
  } finally {
    await browser.close();
  }
}
