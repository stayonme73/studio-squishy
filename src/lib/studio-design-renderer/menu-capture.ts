/**
 * Playwright capture for menu — strong content-bound overflow detection.
 * Absolute/fixed layers that evade scrollHeight still fail here.
 */

import { mkdirSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";

import { MENU_CANVAS, MENU_MIN_FONT_PX } from "./menu-types";

export type MenuCaptureResult = {
  pngAbsolutePath: string;
  pdfAbsolutePath: string;
  widthPx: number;
  heightPx: number;
  overflowOk: boolean;
  overflowDetail: string;
};

export async function captureMenuExports(input: {
  htmlAbsolutePath: string;
  pngAbsolutePath: string;
  pdfAbsolutePath: string;
  widthPx?: number;
  heightPx?: number;
}): Promise<MenuCaptureResult> {
  const widthPx = input.widthPx ?? MENU_CANVAS.widthPx;
  const heightPx = input.heightPx ?? MENU_CANVAS.heightPx;
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

    const metrics = await page.evaluate(
      (mins) => {
        const root = document.querySelector(".canvas") as HTMLElement | null;
        const doc = document.documentElement;
        const issues: string[] = [];
        if (!root) {
          return {
            scrollWidth: doc.scrollWidth,
            scrollHeight: doc.scrollHeight,
            canvasW: 0,
            canvasH: 0,
            issues: ["missing-canvas"],
          };
        }
        const cr = root.getBoundingClientRect();
        const layers = Array.from(
          document.querySelectorAll(".layer"),
        ) as HTMLElement[];
        for (const el of layers) {
          const id = el.dataset.id ?? "?";
          const r = el.getBoundingClientRect();
          if (r.bottom > cr.bottom + 1.5) issues.push(`off-bottom:${id}`);
          if (r.right > cr.right + 1.5) issues.push(`off-right:${id}`);
          if (r.top < cr.top - 1.5) issues.push(`off-top:${id}`);
          if (r.left < cr.left - 1.5) issues.push(`off-left:${id}`);
          if (el.classList.contains("text")) {
            // Only fixed-height text boxes can clip; auto-height layers grow with content.
            const hasFixedHeight = el.style.height != null && el.style.height !== "";
            if (
              hasFixedHeight &&
              el.scrollHeight > el.clientHeight + 2
            ) {
              issues.push(`clipped-text:${id}`);
            }
            const fs = parseFloat(getComputedStyle(el).fontSize);
            const minAttr = parseFloat(el.dataset.minFont || "0");
            const role = el.dataset.role ?? "";
            const roleMin =
              role === "item_name"
                ? mins.itemName
                : role === "item_description"
                  ? mins.itemDescription
                  : role === "item_price"
                    ? mins.itemPrice
                    : role === "section_title"
                      ? mins.sectionTitle
                      : 0;
            const min = minAttr || roleMin;
            if (min > 0 && fs + 0.05 < min) {
              issues.push(`font-floor:${id}:${fs}<${min}`);
            }
          }
        }
        // Pairwise overlap among item_name layers (approximate collision)
        const names = layers.filter(
          (el) => el.dataset.role === "item_name",
        );
        for (let i = 0; i < names.length; i++) {
          const a = names[i]!.getBoundingClientRect();
          for (let j = i + 1; j < names.length; j++) {
            const b = names[j]!.getBoundingClientRect();
            const overlap =
              a.left < b.right - 2 &&
              a.right > b.left + 2 &&
              a.top < b.bottom - 2 &&
              a.bottom > b.top + 2;
            if (overlap) {
              issues.push(
                `overlap:${names[i]!.dataset.id}/${names[j]!.dataset.id}`,
              );
            }
          }
        }
        return {
          scrollWidth: doc.scrollWidth,
          scrollHeight: doc.scrollHeight,
          canvasW: root.offsetWidth,
          canvasH: root.offsetHeight,
          issues,
        };
      },
      {
        itemName: MENU_MIN_FONT_PX.itemName,
        itemDescription: MENU_MIN_FONT_PX.itemDescription,
        itemPrice: MENU_MIN_FONT_PX.itemPrice,
        sectionTitle: MENU_MIN_FONT_PX.sectionTitle,
      },
    );

    const scrollOk =
      metrics.scrollWidth <= widthPx + 1 &&
      metrics.scrollHeight <= heightPx + 1 &&
      metrics.canvasW === widthPx &&
      metrics.canvasH === heightPx;
    const boundOk = metrics.issues.length === 0;
    const overflowOk = scrollOk && boundOk;
    const overflowDetail = `scroll=${metrics.scrollWidth}x${metrics.scrollHeight} canvas=${metrics.canvasW}x${metrics.canvasH} issues=${metrics.issues.join("|") || "none"}`;

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
      overflowDetail,
    };
  } finally {
    await browser.close();
  }
}
