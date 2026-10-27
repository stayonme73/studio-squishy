import type { Browser } from "playwright-core";

/**
 * Local desk: full `playwright` + installed browsers.
 * Hosted Vercel: `playwright-core` + `@sparticuz/chromium` (serverless binary).
 */
export async function launchDesignRendererChromium(): Promise<Browser> {
  if (process.env.VERCEL_ENV) {
    const { launchHostedDesignRendererChromium } = await import("./launch-chromium-hosted");
    return launchHostedDesignRendererChromium();
  }
  const { launchLocalDesignRendererChromium } = await import("./launch-chromium-local");
  return launchLocalDesignRendererChromium();
}
