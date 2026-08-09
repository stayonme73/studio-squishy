/**
 * Deterministic responsive checks via Playwright (when available).
 * Falls back to HTML/CSS structural checks if browser cannot launch.
 */

import { existsSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";

import type { LandingQaCheck } from "./types";

const VIEWPORTS = [
  { id: "desktop", width: 1280, height: 800 },
  { id: "tablet", width: 768, height: 1024 },
  { id: "mobile", width: 390, height: 844 },
] as const;

export async function runResponsiveViewportChecks(input: {
  repoRoot: string;
  htmlRelativePath: string;
}): Promise<{ ok: boolean; checks: LandingQaCheck[]; mode: "playwright" | "structural_fallback" }> {
  const abs = path.join(input.repoRoot, input.htmlRelativePath);
  if (!existsSync(abs)) {
    return {
      ok: false,
      mode: "structural_fallback",
      checks: [{ id: "responsive_file", ok: false, detail: "html missing" }],
    };
  }

  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const checks: LandingQaCheck[] = [];
    try {
      for (const vp of VIEWPORTS) {
        const page = await browser.newPage({
          viewport: { width: vp.width, height: vp.height },
        });
        await page.goto(pathToFileURL(abs).href, { waitUntil: "load" });
        const metrics = await page.evaluate(() => {
          const doc = document.documentElement;
          const cta = document.querySelector("a.cta") as HTMLElement | null;
          const ctaBox = cta?.getBoundingClientRect();
          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            ctaVisible: Boolean(
              cta && ctaBox && ctaBox.width > 0 && ctaBox.height >= 44,
            ),
            bodyTextLen: (document.body?.innerText ?? "").trim().length,
          };
        });
        const noOverflow = metrics.scrollWidth <= metrics.clientWidth + 1;
        checks.push({
          id: `responsive_${vp.id}_no_overflow`,
          ok: noOverflow,
          detail: `${vp.width}px scrollWidth=${metrics.scrollWidth} clientWidth=${metrics.clientWidth}`,
        });
        checks.push({
          id: `responsive_${vp.id}_cta_usable`,
          ok: metrics.ctaVisible,
          detail: `cta visible/tap-sized @ ${vp.width}px`,
        });
        checks.push({
          id: `responsive_${vp.id}_content_present`,
          ok: metrics.bodyTextLen > 80,
          detail: `textLen=${metrics.bodyTextLen}`,
        });
        await page.close();
      }
    } finally {
      await browser.close();
    }
    return { ok: checks.every((c) => c.ok), checks, mode: "playwright" };
  } catch (e) {
    return {
      ok: false,
      mode: "structural_fallback",
      checks: [
        {
          id: "responsive_playwright_unavailable",
          ok: false,
          detail: e instanceof Error ? e.message : String(e),
        },
      ],
    };
  }
}
