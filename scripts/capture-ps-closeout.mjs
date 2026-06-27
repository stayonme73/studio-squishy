/**
 * Project Summary closeout verification screenshots.
 * Usage: npm run dev (separate terminal), then node scripts/capture-ps-closeout.mjs
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const STORAGE_KEY = "studio-squishy:business-discovery-answers";
const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "tmp");

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

async function seedAndOpen(viewport) {
  const page = await browser.newPage({ viewport });
  await page.addInitScript(
    ({ key, answers }) => {
      window.localStorage.setItem(key, JSON.stringify(answers));
    },
    { key: STORAGE_KEY, answers: STARTING_FRESH },
  );
  await page.goto(`${BASE}/project-summary`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForSelector("#spr-cost-title", { timeout: 30_000 });
  await page.waitForSelector(".pay-paper-card--summary", { timeout: 30_000 });
  await page.waitForTimeout(600);
  return page;
}

// Desktop — Plan Totals + Secure Checkout
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
  await page.addInitScript(
    ({ key, answers }) => {
      window.localStorage.setItem(key, JSON.stringify(answers));
    },
    { key: STORAGE_KEY, answers: STARTING_FRESH },
  );
  await page.goto(`${BASE}/project-summary`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForSelector("#spr-cost-title", { timeout: 30_000 });
  await page.waitForSelector(".pay-paper-card--summary", { timeout: 30_000 });
  await page.waitForTimeout(600);

  const planTotals = page.locator('section[aria-labelledby="spr-cost-title"]');
  const checkoutSummary = page.locator(".pay-paper-card--summary").first();
  await page.waitForTimeout(400);

  const planBox = await planTotals.boundingBox();
  const checkoutBox = await checkoutSummary.boundingBox();
  if (planBox && checkoutBox) {
    const top = Math.min(planBox.y, checkoutBox.y);
    const bottom = Math.max(planBox.y + planBox.height, checkoutBox.y + checkoutBox.height);
    const left = Math.min(planBox.x, checkoutBox.x);
    const right = Math.max(planBox.x + planBox.width, checkoutBox.x + checkoutBox.width);
    await page.screenshot({
      path: join(OUT_DIR, "ps-closeout-desktop.png"),
      clip: {
        x: left,
        y: top,
        width: right - left,
        height: Math.ceil(bottom - top + 24),
      },
    });
  } else {
    await page.screenshot({ path: join(OUT_DIR, "ps-closeout-desktop.png"), fullPage: false });
  }
  await page.close();
}

// Mobile — actions usable at 375px
{
  const page = await seedAndOpen({ width: 375, height: 812 });
  const planReview = page.locator(".ps-plan-review");
  await planReview.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT_DIR, "ps-closeout-mobile.png"), fullPage: true });
  await page.close();
}

await browser.close();
console.log(`Screenshots saved to ${OUT_DIR}/ps-closeout-*.png`);
