/**
 * Playwright capture — fixed canvas PNG + PDF. No Owner GUI.
 */

import { mkdirSync, readFileSync } from "fs";
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
  /**
   * When set, the PDF page is US Letter (or another named page) and the
   * already-captured PNG is fitted to that page without stretching.
   */
  pdfPage?: { width: string; height: string };
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

    if (input.pdfPage) {
      const pngData = readFileSync(input.pngAbsolutePath).toString("base64");
      const letterHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
@page { size: ${input.pdfPage.width} ${input.pdfPage.height}; margin: 0; }
html,body{margin:0;padding:0;width:${input.pdfPage.width};height:${input.pdfPage.height};overflow:hidden;}
img{width:${input.pdfPage.width};height:${input.pdfPage.height};display:block;object-fit:fill;}
</style></head><body><img src="data:image/png;base64,${pngData}" alt=""/></body></html>`;
      const pdfPage = await browser.newPage({
        viewport: { width: 816, height: 1056 },
        deviceScaleFactor: 1,
      });
      try {
        await pdfPage.setContent(letterHtml, { waitUntil: "load" });
        await pdfPage.pdf({
          path: input.pdfAbsolutePath,
          width: input.pdfPage.width,
          height: input.pdfPage.height,
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: "0", right: "0", bottom: "0", left: "0" },
        });
      } finally {
        await pdfPage.close();
      }
    } else {
      await page.pdf({
        path: input.pdfAbsolutePath,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
    }

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
