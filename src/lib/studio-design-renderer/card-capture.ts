/**
 * Playwright capture for business-card front PNG, back PNG, and two-page PDF.
 * Additive — does not modify captureFlyerExports.
 */

import { mkdirSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";

import { BUSINESS_CARD_CANVAS } from "./card-types";

export type CardSideCapture = {
  pngAbsolutePath: string;
  widthPx: number;
  heightPx: number;
  overflowOk: boolean;
  overflowDetail: string;
};

export type CardCaptureResult = {
  front: CardSideCapture;
  back: CardSideCapture;
  pdfAbsolutePath: string;
};

async function captureSidePng(input: {
  htmlAbsolutePath: string;
  pngAbsolutePath: string;
  widthPx: number;
  heightPx: number;
}): Promise<CardSideCapture> {
  mkdirSync(path.dirname(input.pngAbsolutePath), { recursive: true });
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: input.widthPx, height: input.heightPx },
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
      metrics.scrollWidth <= input.widthPx + 1 &&
      metrics.scrollHeight <= input.heightPx + 1 &&
      metrics.canvasW === input.widthPx &&
      metrics.canvasH === input.heightPx;

    await page.screenshot({
      path: input.pngAbsolutePath,
      type: "png",
      clip: { x: 0, y: 0, width: input.widthPx, height: input.heightPx },
      omitBackground: false,
    });

    await page.close();
    return {
      pngAbsolutePath: input.pngAbsolutePath,
      widthPx: input.widthPx,
      heightPx: input.heightPx,
      overflowOk,
      overflowDetail: `scroll=${metrics.scrollWidth}x${metrics.scrollHeight} canvas=${metrics.canvasW}x${metrics.canvasH}`,
    };
  } finally {
    await browser.close();
  }
}

export async function captureBusinessCardExports(input: {
  frontHtmlAbsolutePath: string;
  backHtmlAbsolutePath: string;
  printHtmlAbsolutePath: string;
  frontPngAbsolutePath: string;
  backPngAbsolutePath: string;
  pdfAbsolutePath: string;
  widthPx?: number;
  heightPx?: number;
}): Promise<CardCaptureResult> {
  const widthPx = input.widthPx ?? BUSINESS_CARD_CANVAS.widthPx;
  const heightPx = input.heightPx ?? BUSINESS_CARD_CANVAS.heightPx;
  mkdirSync(path.dirname(input.pdfAbsolutePath), { recursive: true });

  const front = await captureSidePng({
    htmlAbsolutePath: input.frontHtmlAbsolutePath,
    pngAbsolutePath: input.frontPngAbsolutePath,
    widthPx,
    heightPx,
  });
  const back = await captureSidePng({
    htmlAbsolutePath: input.backHtmlAbsolutePath,
    pngAbsolutePath: input.backPngAbsolutePath,
    widthPx,
    heightPx,
  });

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: widthPx, height: heightPx },
      deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(input.printHtmlAbsolutePath).href, {
      waitUntil: "load",
    });
    await page.pdf({
      path: input.pdfAbsolutePath,
      width: `${widthPx}px`,
      height: `${heightPx}px`,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    await page.close();
  } finally {
    await browser.close();
  }

  return {
    front,
    back,
    pdfAbsolutePath: input.pdfAbsolutePath,
  };
}
