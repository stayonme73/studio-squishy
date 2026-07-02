/**
 * Capture corrected Studio Board after Route Map intake (rm-j003).
 * Run: VERIFY_BASE_URL=http://localhost:3011 node scripts/capture-route-map-board-after-intake.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/route-map-v1-screenshots");
const OUT_FILE = "e2e-final-studio-board-after-intake.png";
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

async function clearCampaign(page) {
  await page.goto(BASE);
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
  }, CAMPAIGN_KEY);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await clearCampaign(page);
  await page.goto(`${BASE}/route-map`);
  await page.waitForSelector(".route-map-page", { timeout: 30000 });

  await page.locator(".route-map-sidebar__link", { hasText: "I Know What I Need" }).first().click();
  await page.waitForSelector(".route-map-road", { timeout: 30000 });
  await page
    .getByRole("button", { name: /Make and Post My Social Media Promotion/i })
    .click();
  await page.waitForSelector(".route-map-job-card", { timeout: 15000 });
  await page.getByRole("button", { name: /CHOOSE THIS JOB/i }).click();
  await page.waitForSelector(".route-map-checkout, .pay-shell", { timeout: 15000 });

  const terms = page.locator('input[name="terms"]');
  if (await terms.count()) await terms.check();
  const sandbox = page.getByRole("button", { name: /test payment|sandbox/i });
  if (await sandbox.count()) {
    await sandbox.first().click();
  } else {
    await page.locator('input[name="fullName"]').fill("Route Map E2E");
    await page.locator('input[name="email"]').fill("e2e@thestudio.test");
    await page.locator('input[name="cardNumber"]').fill("4242 4242 4242 4242");
    await page.locator('input[name="expDate"]').fill("12 / 30");
    await page.locator('input[name="cvv"]').fill("123");
    await page.locator('input[name="zipCode"]').fill("30303");
    await page.getByRole("button", { name: /complete payment|pay/i }).click();
  }
  await page.waitForSelector(".route-map-intake", { timeout: 25000 });

  const selects = page.locator(".route-map-intake__field select");
  for (let i = 0; i < (await selects.count()); i++) {
    const select = selects.nth(i);
    if ((await select.locator("option").count()) > 1) {
      await select.selectOption({ index: 1 });
    }
  }
  for (const locator of [
    page.locator('.route-map-intake__field input[type="text"]'),
    page.locator(".route-map-intake__field textarea"),
  ]) {
    const count = await locator.count();
    for (let i = 0; i < count; i++) {
      await locator.nth(i).fill("E2E Route Map intake value.");
    }
  }
  await page.getByRole("button", { name: /Submit intake/i }).click();
  await page.waitForURL(/studio-board.*record=open/, { timeout: 25000 });
  await page.waitForTimeout(800);

  const bodyText = await page.locator("body").innerText();
  const status = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw).campaignStatus : null;
  }, CAMPAIGN_KEY);

  const hasBuilding = /Building Concepts/i.test(bodyText);
  const hasReviewCta = /Review My Concepts/i.test(bodyText);
  const hasConceptsReady = /Concepts Ready for Review/i.test(bodyText);

  if (status !== "BUILDING_CONCEPTS") {
    throw new Error(`Expected BUILDING_CONCEPTS, got ${status}`);
  }
  if (!hasBuilding) {
    throw new Error("Studio Board must show Building Concepts");
  }
  if (hasReviewCta || hasConceptsReady) {
    throw new Error("Studio Board must not show review-ready state after intake");
  }

  await page.screenshot({
    path: path.join(OUT_DIR, OUT_FILE),
    fullPage: false,
  });

  console.log(`✓ ${OUT_FILE}`);
  console.log(`  campaignStatus=${status}`);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
