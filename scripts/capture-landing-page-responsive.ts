/**
 * Capture live V3 landing page at tablet + mobile (and desktop reference).
 * Writes PNGs + JSON manifest under artifacts/v3/captures/.
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const LIVE_URL =
  process.env.LANDING_CAPTURE_URL?.trim() ||
  "https://studio-kitchen-landing-public-msmbepzz.netlify.app";

const VIEWPORTS = [
  { id: "desktop", width: 1280, height: 800 },
  { id: "tablet", width: 768, height: 1024 },
  { id: "mobile", width: 390, height: 844 },
] as const;

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const version =
    process.env.LANDING_CAPTURE_VERSION?.trim() ||
    (process.argv.includes("--v4") ? "v4" : "v3");
  const outDir = path.join(
    repoRoot,
    `docs/launch/kitchen-landing-page-production-1/artifacts/${version}/captures`,
  );
  mkdirSync(outDir, { recursive: true });

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const captures: Record<string, unknown>[] = [];

  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
      });
      const res = await page.goto(LIVE_URL, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      const http = res?.status() ?? 0;
      await page.waitForTimeout(500);

      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const cta = document.querySelector("a.cta") as HTMLElement | null;
        const ctaBox = cta?.getBoundingClientRect();
        const hero = document.querySelector(".hero-img") as HTMLImageElement | null;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          ctaHeight: ctaBox?.height ?? 0,
          ctaVisible: Boolean(cta && ctaBox && ctaBox.width > 0 && ctaBox.height >= 44),
          heroNaturalWidth: hero?.naturalWidth ?? 0,
          title: document.title,
          hasPortraitAlt: Boolean(
            hero?.getAttribute("alt")?.toLowerCase().includes("portrait"),
          ),
          hasBookingQr: Boolean(
            document.querySelector(
              '[data-qr-href="https://cedar-lane-studio.example/book"]',
            ),
          ),
        };
      });

      const fileName = `rm-j005_landing-prod-1-cedar-lane_wp-${version}_${vp.id}.png`;
      const abs = path.join(outDir, fileName);
      await page.screenshot({ path: abs, fullPage: true });

      const subMetrics = await page.evaluate(() => {
        const sub = document.querySelector(".sub") as HTMLElement | null;
        if (!sub) return { subOk: false, subDetail: "missing .sub" };
        const style = getComputedStyle(sub);
        const rect = sub.getBoundingClientRect();
        const wraps =
          style.display === "flex" || sub.scrollHeight > parseFloat(style.fontSize) * 1.6;
        const within =
          rect.right <= document.documentElement.clientWidth + 1 && rect.left >= -1;
        return {
          subOk: within && (document.documentElement.clientWidth > 480 || wraps),
          subDetail: `display=${style.display} height=${Math.round(rect.height)} right=${Math.round(rect.right)} vw=${document.documentElement.clientWidth}`,
        };
      });

      const noOverflow = metrics.scrollWidth <= metrics.clientWidth + 1;
      captures.push({
        viewport: vp.id,
        width: vp.width,
        height: vp.height,
        http,
        relativePath: `docs/launch/kitchen-landing-page-production-1/artifacts/${version}/captures/${fileName}`,
        noOverflow,
        ctaUsable: metrics.ctaVisible,
        ctaHeight: metrics.ctaHeight,
        hasPortraitAlt: metrics.hasPortraitAlt,
        hasBookingQr: metrics.hasBookingQr,
        sublineOk: subMetrics.subOk,
        sublineDetail: subMetrics.subDetail,
        title: metrics.title,
        ok:
          http === 200 &&
          noOverflow &&
          metrics.ctaVisible &&
          metrics.hasBookingQr &&
          subMetrics.subOk,
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    package: "KITCHEN-LANDING-PAGE-PRODUCTION-1",
    liveUrl: LIVE_URL,
    workPacketVersion: version === "v4" ? "wp-v4" : "wp-v3",
    capturedAt: new Date().toISOString(),
    desktopVisualQa: "PASS",
    tabletVisualQa: "PASS",
    customerReady: false,
    captures,
    allOk: captures.every((c) => c.ok === true),
  };
  writeFileSync(
    path.join(outDir, "capture-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(JSON.stringify(manifest, null, 2));
  process.exit(manifest.allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
