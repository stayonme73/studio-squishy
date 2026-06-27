/**
 * Capture Project Summary typography/layout screenshots via Playwright.
 * Usage: node scripts/capture-typography-screenshots.mjs [before|after]
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const phase = process.argv[2] === "after" ? "after" : "before";
const outDir = join(process.cwd(), "tmp", "typography-screenshots", phase);
const baseUrl = "http://localhost:3000/project-summary";

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(baseUrl, { waitUntil: "networkidle" });

  // 1. Service menu row — scroll to Studio Services
  const menuSection = page.locator("#spr-menu-title");
  if (await menuSection.count()) {
    await menuSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const menuRow = page.locator(".spr-menu__item").first();
    if (await menuRow.count()) {
      await menuRow.screenshot({ path: join(outDir, "1-service-menu-row.png") });
    }
  }

  // 2. Checkout acknowledgment — scroll to embedded checkout
  const ack = page.locator(".pay-acknowledgment").first();
  if (await ack.count()) {
    await ack.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await ack.screenshot({ path: join(outDir, "2-checkout-acknowledgment.png") });
  }

  // 3. Service Guide open — click first guide trigger
  const guideTrigger = page
    .locator(".spr-service__guide-btn, .spr-service__title-btn, .spr-menu__guide-btn, .spr-menu__title-btn, .pay-summary-line-guide")
    .first();
  if (await guideTrigger.count()) {
    await guideTrigger.click();
    await page.waitForSelector(".ps-service-guide__panel", { state: "visible" });
    await page.waitForTimeout(500);
    await page.locator(".ps-service-guide__panel").screenshot({
      path: join(outDir, "3-service-guide-panel.png"),
    });
    await page.locator(".ps-service-guide__close").click();
    await page.waitForTimeout(300);
  }

  // 4. Studio Plan Preview — customize column plan review area
  const planReview = page.locator(".ps-plan-review").first();
  if (await planReview.count()) {
    await planReview.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await planReview.screenshot({ path: join(outDir, "4-studio-plan-preview.png") });
  }

  // Full page reference
  await page.screenshot({ path: join(outDir, "0-full-page.png"), fullPage: true });

  await browser.close();
  console.log(`Screenshots saved to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
