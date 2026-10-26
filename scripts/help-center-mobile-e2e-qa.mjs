/**
 * Help Center mobile inspection — 390px and 360px.
 * Usage: node scripts/help-center-mobile-e2e-qa.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.STUDIO_BASE_URL ?? "http://127.0.0.1:3475";
const OUT_DIR = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1",
  "help-center-mobile-proofs",
);

async function inspectViewport(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(`${BASE}/help-center`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".utility-page--help-center, .hc-qpg", { timeout: 30000 });

  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      vw: innerWidth,
      docW: root.scrollWidth,
      overflow: root.scrollWidth > innerWidth + 1,
      title: document.querySelector("h1")?.textContent?.trim() ?? null,
    };
  });

  const back = page.locator("a.utility-topbar__back, a.utility-topbar__help").first();
  await back.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  const backMetrics = await back.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      w: Math.max(r.width, el.offsetWidth),
      h: Math.max(r.height, el.offsetHeight, Number.parseFloat(style.minHeight) || 0),
      text: el.textContent?.trim(),
      href: el.getAttribute("href"),
    };
  }).catch(() => null);

  const tocLink = page.locator("nav.hc-toc a.hc-toc__link").first();
  await tocLink.scrollIntoViewIfNeeded().catch(() => {});
  const tocBox = await tocLink.boundingBox().catch(() => null);

  await tocLink.click();
  await page.waitForTimeout(400);

  const qpgLink = page.locator("a.hc-qpg-card__link, .hc-qpg-cards a.hc-toc__link").first();
  if (await qpgLink.count()) {
    await qpgLink.scrollIntoViewIfNeeded();
    await qpgLink.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  const faqAnswer = page.locator(".hc-faq__answer").first();
  await faqAnswer.scrollIntoViewIfNeeded().catch(() => {});
  const faqReadable = await faqAnswer.evaluate((el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return (
      rect.width > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      (el.textContent?.trim().length ?? 0) > 20
    );
  }).catch(() => false);

  await page.screenshot({
    path: path.join(OUT_DIR, `help-center-${width}x${height}.png`),
    fullPage: true,
  });

  return {
    width,
    height,
    metrics,
    backTappable: Boolean(backMetrics?.href && backMetrics.w >= 40),
    backLabel: backMetrics?.text ?? null,
    tocTappable: Boolean(tocBox && tocBox.height >= 36 && tocBox.width >= 80),
    faqReadable,
    utilityNavLinks: await page.locator('nav[aria-label="Studio utility navigation"] a').count(),
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const report = { ok: false, base: BASE, viewports: [], error: null };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    report.viewports.push(await inspectViewport(page, 390, 844));
    report.viewports.push(await inspectViewport(page, 360, 780));

    report.ok = report.viewports.every(
      (v) =>
        !v.metrics.overflow &&
        v.backTappable &&
        v.tocTappable &&
        v.faqReadable &&
        v.utilityNavLinks >= 4 &&
        v.metrics.title?.toLowerCase().includes("help"),
    );

    await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
