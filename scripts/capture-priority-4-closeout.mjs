/**
 * Priority 4 closeout — live plan sync verification screenshots.
 * Run: node scripts/capture-priority-4-closeout.mjs
 * Requires dev server at localhost:3000
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/priority-4-closeout");
const DISCOVERY_KEY = "studio-squishy:business-discovery-answers";
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const DRAFT_KEY_PREFIX = "studio-squishy:project-summary-plan-draft:";
const CAMPAIGN_ID = "owner-qa-dev";
const BUSINESS_DELIM = "\n---\n";

const OWNER_QA_DISCOVERY = {
  "your-business": `Tagia Bakery${BUSINESS_DELIM}Fresh pastries and coffee daily`,
  "your-situation": "Starting fresh",
  "your-challenge": "I am not sure what to say about my business",
  "your-current-tools": "Email list or email platform, Social media accounts",
  "your-focus": "Create social media content",
  "success-looks-like":
    "Spending less time creating and posting marketing, More consistent social media visibility",
  "whats-slowing-you-down":
    "I do not have time to create or post content, I am not visible enough online",
};

const GREEN_SERVICE_IDS = ["bf-001", "sm-001", "ma-001"];
const BRAND_IDENTITY_TITLE = "Brand Identity Refresh";
const MONTHLY_CONSIDER_TITLE = "Monthly Social Media Content Support";
const EXPECTED_AMOUNT_DUE = "$1,385";
const EXPECTED_MONTHLY = "$349";

function buildCampaign() {
  const now = new Date().toISOString();
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "Tagia Bakery Campaign",
    campaignStatus: "DISCOVERY_COMPLETE",
    campaignDescription: "Discovery complete.",
    packageId: "spark",
    packageLabel: "Spark Plan",
    discoveryAnswers: OWNER_QA_DISCOVERY,
    discoverySubmittedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [...GREEN_SERVICE_IDS],
      includedServiceIds: [...GREEN_SERVICE_IDS],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 138500,
      monthlyTotalCents: 0,
      amountDueTodayCents: 138500,
      lineItems: [],
      approvedAt: now,
    },
    paymentReceivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function seedProjectSummary(page, { clearDraft = true } = {}) {
  const campaign = buildCampaign();
  await page.goto(BASE);
  await page.evaluate(
    ({ discoveryKey, campaignKey, draftKeyPrefix, campaignId, discoveryValue, campaignValue, clearDraftValue }) => {
      localStorage.setItem(discoveryKey, JSON.stringify(discoveryValue));
      localStorage.setItem(campaignKey, JSON.stringify(campaignValue));
      if (clearDraftValue) {
        localStorage.removeItem(`${draftKeyPrefix}${campaignId}`);
      }
      window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
    },
    {
      discoveryKey: DISCOVERY_KEY,
      campaignKey: CAMPAIGN_KEY,
      draftKeyPrefix: DRAFT_KEY_PREFIX,
      campaignId: CAMPAIGN_ID,
      discoveryValue: OWNER_QA_DISCOVERY,
      campaignValue: campaign,
      clearDraftValue: clearDraft,
    },
  );
}

async function waitForProjectSummary(page) {
  await page.goto(`${BASE}/project-summary`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForSelector(".project-summary-page", { timeout: 30_000 });
  await page.waitForSelector("#ps-recommend-title", { timeout: 30_000 });
  await page.waitForSelector("#spr-included-title", { timeout: 30_000 });
  await page.waitForTimeout(800);
}

async function unionClipScreenshot(page, locators, filename, padding = 20) {
  const boxes = [];
  for (const locator of locators) {
    const target = typeof locator === "string" ? page.locator(locator).first() : locator.first();
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (box) boxes.push(box);
  }

  const filePath = path.join(OUT_DIR, filename);
  if (boxes.length === 0) {
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  }

  const top = Math.max(0, Math.min(...boxes.map((b) => b.y)) - padding);
  const left = Math.max(0, Math.min(...boxes.map((b) => b.x)) - padding);
  const bottom = Math.max(...boxes.map((b) => b.y + b.height)) + padding;
  const right = Math.max(...boxes.map((b) => b.x + b.width)) + padding;

  await page.screenshot({
    path: filePath,
    clip: {
      x: left,
      y: top,
      width: Math.ceil(right - left),
      height: Math.ceil(bottom - top),
    },
  });
  return filePath;
}

async function removeBrandIdentityFromIncluded(page) {
  await page.locator("#spr-included-title").scrollIntoViewIfNeeded();
  const brandRow = page
    .locator("#spr-included-title")
    .locator("..")
    .locator(".spr-services__list .spr-service")
    .filter({ has: page.locator(".spr-service__title", { hasText: BRAND_IDENTITY_TITLE }) })
    .first();
  await brandRow.waitFor({ state: "visible", timeout: 10_000 });
  await brandRow.locator("button", { hasText: "Remove" }).click();
  await page.waitForTimeout(1200);
}

async function verifyBrandIdentityRemoved(page) {
  const heroRecommend = page.locator("#ps-recommend-title").locator("..").locator(".ps-recommend__service-list").first();
  const brandHeroRow = heroRecommend.locator(".ps-recommend__service-row", { hasText: BRAND_IDENTITY_TITLE });
  await brandHeroRow.waitFor({ state: "visible", timeout: 10_000 });

  const checkmark = brandHeroRow.locator('[aria-hidden="true"]', { hasText: "✅" });
  if ((await checkmark.count()) > 0) {
    throw new Error(`Our Recommendation still shows checkmark for "${BRAND_IDENTITY_TITLE}" after remove`);
  }

  const addButton = brandHeroRow.locator(".ps-consider__add");
  if ((await addButton.count()) === 0) {
    throw new Error(`Our Recommendation missing Add to Plan for removed "${BRAND_IDENTITY_TITLE}"`);
  }

  const includedTitles = page
    .locator("#spr-included-title")
    .locator("..")
    .locator(".spr-services__list .spr-service__title");
  const brandIncludedRow = includedTitles.filter({ hasText: BRAND_IDENTITY_TITLE });
  if ((await brandIncludedRow.count()) > 0) {
    throw new Error(`"${BRAND_IDENTITY_TITLE}" still in Included Services after remove`);
  }

  const checkoutText = await page.locator(".pay-paper-card--summary").first().textContent();
  if (checkoutText?.includes(BRAND_IDENTITY_TITLE)) {
    throw new Error(`Checkout still lists "${BRAND_IDENTITY_TITLE}" after remove`);
  }

  const includedCount = await page.locator(".spr-services__list .spr-service").count();
  if (includedCount !== 2) {
    throw new Error(`Expected 2 included services after remove, got ${includedCount}`);
  }

  console.log("  ✓ Brand Identity removed — hero unselected, absent from Included Services + Checkout");
}

async function addMonthlyConsiderNext(page) {
  const monthlyRow = page
    .locator(".ps-recommend__service-row--consider", { hasText: MONTHLY_CONSIDER_TITLE })
    .first();
  await monthlyRow.scrollIntoViewIfNeeded();
  await monthlyRow.waitFor({ state: "visible", timeout: 15_000 });
  await monthlyRow.locator(".ps-consider__add").click();
  await page.waitForTimeout(700);
}

async function verifyMonthlyAdded(page) {
  const heroMonthly = page.locator(".ps-recommend__service-list--consider .ps-recommend__service-row--consider", {
    hasText: MONTHLY_CONSIDER_TITLE,
  });
  if ((await heroMonthly.count()) > 0) {
    throw new Error(`Consider Next hero still shows "${MONTHLY_CONSIDER_TITLE}" after Add to Plan`);
  }

  const includedSection = page.locator("#spr-included-title").locator("..");
  const monthlyRows = includedSection.locator(".spr-services__list .spr-service__title", {
    hasText: MONTHLY_CONSIDER_TITLE,
  });
  if ((await monthlyRows.count()) !== 1) {
    throw new Error(`Expected exactly one Included Services row for "${MONTHLY_CONSIDER_TITLE}"`);
  }

  const checkoutSummary = page.locator(".pay-paper-card--summary").first();
  const checkoutText = await checkoutSummary.textContent();
  if (!checkoutText?.includes(MONTHLY_CONSIDER_TITLE)) {
    throw new Error(`"${MONTHLY_CONSIDER_TITLE}" not found in embedded checkout plan list`);
  }

  const planTotals = page.locator('section[aria-labelledby="spr-cost-title"]');
  const planText = await planTotals.textContent();
  if (!planText?.includes(EXPECTED_MONTHLY)) {
    throw new Error(`Plan totals missing monthly subtotal ${EXPECTED_MONTHLY}`);
  }
  if (!planText?.includes(EXPECTED_AMOUNT_DUE)) {
    throw new Error(`Plan totals missing Amount Due Today ${EXPECTED_AMOUNT_DUE}`);
  }
  if (!checkoutText?.includes(EXPECTED_MONTHLY) || !checkoutText?.includes(EXPECTED_AMOUNT_DUE)) {
    throw new Error("Checkout totals do not match plan totals after monthly add");
  }

  console.log(`  ✓ Monthly in Included Services + Checkout; Consider Next cleared; totals synced`);
}

async function verifyIncludedServicesMonthlyForScreenshot(page) {
  const customizeHeading = page.locator("#ps-changes-title");
  await customizeHeading.waitFor({ state: "visible", timeout: 10_000 });
  const headingText = await customizeHeading.textContent();
  if (!headingText?.includes("Customize Your Studio Plan")) {
    throw new Error('Missing "Customize Your Studio Plan" heading');
  }

  const includedSection = page.locator("#spr-included-title").locator("..");
  const includedHeading = page.locator("#spr-included-title");
  const includedHeadingText = await includedHeading.textContent();
  if (!includedHeadingText?.includes("Included Services")) {
    throw new Error('Missing "Included Services" heading');
  }

  const monthlyRows = includedSection.locator(".spr-services__list .spr-service__title", {
    hasText: MONTHLY_CONSIDER_TITLE,
  });
  const monthlyCount = await monthlyRows.count();
  if (monthlyCount !== 1) {
    throw new Error(
      `Expected exactly one "${MONTHLY_CONSIDER_TITLE}" in Included Services, got ${monthlyCount}`,
    );
  }

  console.log(`  ✓ Customize panel shows "${MONTHLY_CONSIDER_TITLE}" once under Included Services`);
}

async function captureIncludedServicesMonthlyAdd(page) {
  await page.evaluate(() => {
    document.getElementById("ps-changes-title")?.scrollIntoView({ block: "start", inline: "nearest" });
  });
  await page.waitForTimeout(400);
  await verifyIncludedServicesMonthlyForScreenshot(page);

  const filePath = path.join(OUT_DIR, "03-included-services-monthly-add.png");
  const customizeSection = page.locator('section[aria-labelledby="ps-changes-title"]');
  await customizeSection.scrollIntoViewIfNeeded();
  await customizeSection.screenshot({ path: filePath });
  return filePath;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 2200 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Scenario 1 — Remove Brand Identity Refresh
  console.log("Scenario 1: Remove recommended service");
  await seedProjectSummary(page, { clearDraft: true });
  await waitForProjectSummary(page);
  await removeBrandIdentityFromIncluded(page);
  await verifyBrandIdentityRemoved(page);
  const screenshot1 = await unionClipScreenshot(
    page,
    ["#ps-recommend-title", "#spr-included-title", ".pay-paper-card--summary"],
    "01-removed-recommended-service.png",
    16,
  );
  console.log(`  Saved ${screenshot1}`);

  // Scenario 2 — Add monthly Consider Next
  console.log("Scenario 2: Add monthly Consider Next service");
  await seedProjectSummary(page, { clearDraft: true });
  await waitForProjectSummary(page);
  await page.waitForSelector(".ps-recommend__service-list--consider", { timeout: 30_000 });
  await addMonthlyConsiderNext(page);
  await verifyMonthlyAdded(page);
  const screenshot2 = await unionClipScreenshot(
    page,
    ["#ps-recommend-title", "#spr-included-title", ".pay-paper-card--summary"],
    "02-added-monthly-consider-next.png",
    16,
  );
  console.log(`  Saved ${screenshot2}`);

  // Scenario 3 — Customize panel: Included Services shows monthly add (not hero/checkout only)
  console.log("Scenario 3: Included Services monthly add proof");
  await verifyMonthlyAdded(page);
  const screenshot3 = await captureIncludedServicesMonthlyAdd(page);
  console.log(`  Saved ${screenshot3}`);

  await browser.close();
  console.log(`\nPriority 4 closeout screenshots saved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
