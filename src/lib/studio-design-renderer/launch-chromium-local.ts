import type { Browser } from "playwright-core";

/** Local desk — full Playwright with installed browser binaries. */
export async function launchLocalDesignRendererChromium(): Promise<Browser> {
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true });
}
