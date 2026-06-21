/**
 * Capture Studio Guide + Draft Room review screenshots for chat/docs.
 * Run: node scripts/capture-interaction-review-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("docs/review-captures/interaction-review");

async function snap(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.waitForTimeout(450);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`Captured ${name}.png`);
}

async function captureStudioGuide(page) {
  await page.goto(`${BASE}/studio-guide-prototype`);
  await page.waitForSelector(".sg-proto-art", { timeout: 20000 });
  await snap(page, "01-studio-guide-table");

  for (const pkg of ["SPARK", "MOMENTUM", "GROWTH"]) {
    await page.locator(`button.sg-proto-booklet-hit[aria-label^="${pkg}"]`).click();
    await page.waitForSelector(".sg-proto-proposal", { timeout: 10000 });
    await snap(page, `02-studio-guide-${pkg.toLowerCase()}-proposal`);
    await page.locator(".sg-proto-proposal-close").click();
    await page.waitForSelector(".sg-proto-proposal", { state: "detached", timeout: 10000 });
  }
}

async function captureWelcomeHall(page) {
  await page.goto(`${BASE}/`);
  await page.waitForSelector(".welcome-hall-plate-art", { timeout: 20000 });
  await snap(page, "00-welcome-hall");
}

async function captureDraftRoom(page) {
  await page.goto(`${BASE}/draft-room`);
  await page.waitForSelector(".dri-art", { timeout: 20000 });
  await snap(page, "03-draft-room-intro");
}

async function captureDraftIntake(page) {
  await page.goto(`${BASE}/draft-room?begin=1&package=spark`);
  await page.waitForSelector(".dri-form", { timeout: 20000 });
  await snap(page, "04-draft-room-intake-intro");

  await page.locator(".dri-intake-nav__continue button").click();
  await page.locator(".dri-step-content textarea, .dri-step-content input").first().fill(
    "Summer pastry launch for Tagia Bakery",
  );
  await snap(page, "05-draft-room-intake-step-1");

  for (let i = 0; i < 6; i += 1) {
    await page.locator(".dri-intake-nav__continue button").click();
    await page.waitForTimeout(300);
  }
  await snap(page, "06-draft-room-intake-step-8-vision");

  await page.locator(".dri-intake-nav__continue button").click();
  await page.waitForTimeout(300);
  await page.locator(".dri-intake-nav__continue button").click();
  await page.waitForTimeout(400);
  await snap(page, "07-draft-room-intake-review");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await captureWelcomeHall(page);
  await captureStudioGuide(page);
  await captureDraftRoom(page);
  await captureDraftIntake(page);

  await browser.close();
  console.log(`\nSaved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
