/**
 * Project Summary wrap-up verification screenshots.
 * Usage: npm run dev (separate terminal), then node scripts/capture-project-summary-wrapup.mjs
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const STORAGE_KEY = "studio-squishy:business-discovery-answers";
const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "tmp", "project-summary-wrapup");

const STARTING_FRESH = {
  "your-business": "Test Co",
  "your-situation": "Starting fresh",
  "your-challenge": "Lack of clarity or direction",
  "your-current-tools": "None yet / starting from scratch",
  "your-focus": "Marketing & growth",
  "success-looks-like": "More leads or customers, Launching something new",
  "whats-slowing-you-down": "Low visibility or reach",
};

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.addInitScript(
  ({ key, answers }) => {
    window.localStorage.setItem(key, JSON.stringify(answers));
  },
  { key: STORAGE_KEY, answers: STARTING_FRESH },
);

// 1. PS top section (header + recommendation)
await page.goto(`${BASE}/project-summary`, { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForSelector("#ps-recommend-title", { timeout: 30_000 });
await page.waitForSelector(".ps-recommend__service-row", { timeout: 30_000 });
await page.waitForTimeout(600);

const headerBand = page.locator(".project-summary-header-band");
const recommendSection = page.locator(".ps-section--hero");
await headerBand.screenshot({ path: join(OUT_DIR, "1-ps-header.png") });
await recommendSection.screenshot({ path: join(OUT_DIR, "1-ps-recommendation.png") });

const headerBox = await headerBand.boundingBox();
const recommendBox = await recommendSection.boundingBox();
if (headerBox && recommendBox) {
  const top = headerBox.y;
  const bottom = recommendBox.y + recommendBox.height;
  await page.screenshot({
    path: join(OUT_DIR, "1-ps-top-section.png"),
    clip: {
      x: 0,
      y: top,
      width: 1440,
      height: Math.ceil(bottom - top),
    },
  });
}

// 2. Included Services + Additional after manually adding one service
const addBtn = page.locator(".spr-menu__btn--add").first();
await addBtn.scrollIntoViewIfNeeded();
await addBtn.click();
await page.waitForSelector("#spr-additional-title", { timeout: 10_000 });
await page.waitForTimeout(400);

const includedSection = page.locator('section[aria-labelledby="spr-included-title"]');
const additionalSection = page.locator('section[aria-labelledby="spr-additional-title"]');
await includedSection.screenshot({ path: join(OUT_DIR, "2-included-services.png") });
await additionalSection.screenshot({ path: join(OUT_DIR, "2-additional-services.png") });
await page.locator(".ps-plan-review").screenshot({
  path: join(OUT_DIR, "2-included-and-additional.png"),
});

// 3. Plan Totals + checkout with card processing disclosure
const planTotals = page.locator('section[aria-labelledby="spr-cost-title"]');
await planTotals.scrollIntoViewIfNeeded();
await planTotals.screenshot({ path: join(OUT_DIR, "3-plan-totals.png") });

const checkoutSummary = page.locator(".pay-paper-card--summary").first();
await checkoutSummary.scrollIntoViewIfNeeded();
await checkoutSummary.screenshot({ path: join(OUT_DIR, "3-checkout-summary-disclosure.png") });

// 4. Service Guide panel
const guideTrigger = page.locator(".spr-menu__btn--details, .spr-service__title-btn").first();
await guideTrigger.scrollIntoViewIfNeeded();
await guideTrigger.click();
await page.waitForSelector(".ps-service-guide__panel", { state: "visible" });
await page.waitForTimeout(500);
await page.locator(".ps-service-guide__panel").screenshot({
  path: join(OUT_DIR, "4-service-guide-panel.png"),
});
await page.locator(".ps-service-guide__close").click();
await page.waitForTimeout(300);

// 5. Discovery recommendation preview
await page.addInitScript(
  ({ key, answers }) => {
    window.localStorage.setItem(key, JSON.stringify(answers));
  },
  { key: STORAGE_KEY, answers: STARTING_FRESH },
);

await page.goto(`${BASE}/business-discovery-studio`, { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForSelector('[data-tile-id="submit-project"]', { timeout: 30_000 });
await page.locator('.bds-tile-hit[data-tile-id="submit-project"]').click();
await page.waitForSelector(".bds-sheet__btn--primary", { timeout: 10_000 });
await page.locator(".bds-sheet__btn--primary").click();
await page.waitForSelector(".bds-summary-panel--preview", { timeout: 12_000 });
await page.waitForTimeout(600);

const discoveryPreview = page.locator(".bds-summary-panel--preview");
await discoveryPreview.screenshot({ path: join(OUT_DIR, "5-discovery-recommendation-preview.png") });

await browser.close();
console.log(`Screenshots saved to ${OUT_DIR}`);
