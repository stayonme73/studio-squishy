/**
 * Priority 3 Discovery — plate v2, chips, business-offer cleanup screenshots.
 * Run: node scripts/capture-priority-3-discovery.mjs
 * Requires dev server at localhost:3000
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/priority-3-discovery");
const DISCOVERY_KEY = "studio-squishy:business-discovery-answers";
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const BUSINESS_DELIM = "\n---\n";

const FULL_DISCOVERY = {
  "your-business": `Tagia Bakery${BUSINESS_DELIM}Fresh pastries and coffee daily`,
  "your-situation": "Starting fresh",
  "your-challenge": "I am not sure what to say about my business",
  "your-current-tools": "Social media accounts, Website",
  "your-focus": "Refresh my brand look",
  "success-looks-like": "A stronger, more polished brand presence",
  "whats-slowing-you-down": "My branding looks inconsistent",
};

function buildProjectSummaryCampaign() {
  const now = new Date().toISOString();
  return {
    campaignId: "priority-3-project-summary",
    campaignName: "Tagia Bakery Campaign",
    campaignStatus: "DISCOVERY_COMPLETE",
    campaignDescription: "Discovery complete.",
    packageId: "momentum",
    packageLabel: "Momentum Plan",
    discoveryAnswers: FULL_DISCOVERY,
    discoverySubmittedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

async function seedDiscovery(page, discoveryAnswers, campaign = null) {
  await page.goto(BASE);
  await page.evaluate(
    ({ discoveryKey, campaignKey, discoveryValue, campaignValue }) => {
      if (discoveryValue) {
        localStorage.setItem(discoveryKey, JSON.stringify(discoveryValue));
      }
      if (campaignValue) {
        localStorage.setItem(campaignKey, JSON.stringify(campaignValue));
        window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
      }
    },
    {
      discoveryKey: DISCOVERY_KEY,
      campaignKey: CAMPAIGN_KEY,
      discoveryValue: discoveryAnswers,
      campaignValue: campaign,
    },
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // 1 — Desktop Discovery board with v2 plate labels visible
  await seedDiscovery(page, {});
  await page.goto(`${BASE}/business-discovery-studio`);
  await page.waitForSelector(".business-discovery-studio", { timeout: 25000 });
  await page.waitForSelector(".bds-plate-canvas img", { timeout: 25000 });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUT_DIR, "01-discovery-board-desktop.png"),
    fullPage: false,
  });
  console.log("Captured 01-discovery-board-desktop.png");

  // 2 — Sheet open with selected chip highlight
  await seedDiscovery(page, {});
  await page.goto(`${BASE}/business-discovery-studio`);
  await page.waitForSelector(".bds-tile-hit", { timeout: 25000 });
  const situationHit = page.locator('.bds-tile-hit[data-tile-id="your-situation"]');
  await situationHit.click();
  await page.waitForSelector('.bds-sheet[data-tile-id="your-situation"]', { timeout: 10000 });
  const chip = page.locator(".bds-sheet__chip", { hasText: "Starting fresh" });
  await chip.click();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(OUT_DIR, "02-selected-chip-highlight.png"),
    fullPage: false,
  });
  console.log("Captured 02-selected-chip-highlight.png");

  // 3 — Clean business offer in Project Summary heard section
  const campaign = buildProjectSummaryCampaign();
  await seedDiscovery(page, FULL_DISCOVERY, campaign);
  await page.goto(`${BASE}/project-summary`);
  await page.waitForSelector(".project-summary-page", { timeout: 25000 });
  await page.locator(".ps-heard__expand").click();
  await page.waitForSelector(".ps-heard__list", { timeout: 10000 });
  await page.waitForTimeout(400);
  await page.locator(".ps-heard__details").screenshot({
    path: path.join(OUT_DIR, "03-business-offer-heard-clean.png"),
  });
  console.log("Captured 03-business-offer-heard-clean.png");

  // 4 — Desktop: selected chip persists after pointer leaves (no hover wash)
  await seedDiscovery(page, {});
  await page.goto(`${BASE}/business-discovery-studio`);
  await page.waitForSelector(".bds-tile-hit", { timeout: 25000 });
  await page.locator('.bds-tile-hit[data-tile-id="your-situation"]').click();
  await page.waitForSelector('.bds-sheet[data-tile-id="your-situation"]', { timeout: 10000 });
  const desktopChip = page.locator(".bds-sheet__chip", { hasText: "Starting fresh" });
  await desktopChip.click();
  await page.waitForFunction(
    () =>
      document.querySelector(".bds-sheet__chip--selected") !== null,
    null,
    { timeout: 5000 },
  );
  await page.mouse.move(8, 8);
  await page.waitForTimeout(150);
  await page.screenshot({
    path: path.join(OUT_DIR, "04-desktop-selected-no-hover.png"),
    fullPage: false,
  });
  console.log("Captured 04-desktop-selected-no-hover.png");

  // 5 — Mobile tap: selected chip filled immediately (iPhone 13 width)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const mobilePage = await mobileContext.newPage();
  await seedDiscovery(mobilePage, {});
  await mobilePage.goto(`${BASE}/business-discovery-studio`);
  await mobilePage.waitForSelector(".bds-tile-hit", { timeout: 25000 });
  await mobilePage.locator('.bds-tile-hit[data-tile-id="your-situation"]').click({ force: true });
  await mobilePage.waitForSelector('.bds-sheet-layer--expanded .bds-sheet[data-tile-id="your-situation"]', {
    timeout: 10000,
  });
  await mobilePage.waitForTimeout(520);
  const mobileChip = mobilePage.locator(
    '.bds-sheet-layer--expanded .bds-sheet__chip[role="radio"]',
    { hasText: "Starting fresh" },
  );
  await mobileChip.evaluate((element) => {
    element.click();
  });
  await mobilePage.waitForSelector('.bds-sheet__chip--selected', { timeout: 5000 });
  await mobilePage.evaluate(() => {
    const paper = document.querySelector(".bds-sheet-layer--expanded .bds-sheet__paper");
    const body = document.querySelector(".bds-sheet-layer--expanded .bds-sheet__body");
    if (paper instanceof HTMLElement) {
      paper.style.overflow = "visible";
      paper.style.minHeight = "min(70vh, 28rem)";
    }
    if (body instanceof HTMLElement) {
      body.style.overflow = "visible";
      body.style.minHeight = "8rem";
    }
  });
  await mobilePage.waitForTimeout(100);
  await mobilePage.locator(".bds-sheet-layer--expanded .bds-sheet__chip-grid").screenshot({
    path: path.join(OUT_DIR, "05-mobile-selected-tap.png"),
  });
  console.log("Captured 05-mobile-selected-tap.png");
  await mobileContext.close();

  await browser.close();
  console.log(`\nPriority 3 Discovery screenshots saved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
