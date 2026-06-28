/**
 * Priority 4 — Project Summary + Checkout truthfulness verification screenshots.
 * Run: node scripts/capture-priority-4-verification.mjs
 * Requires dev server at localhost:3000
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/priority-4-verification");
const DISCOVERY_KEY = "studio-squishy:business-discovery-answers";
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const DRAFT_KEY_PREFIX = "studio-squishy:project-summary-plan-draft:";
const CAMPAIGN_ID = "owner-qa-dev";
const BUSINESS_DELIM = "\n---\n";

/** Starting fresh + recurring workload — surfaces monthly Consider Next candidates. */
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

async function seedProjectSummaryCheckout(page, { clearDraft = true } = {}) {
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
  await page.waitForSelector(".ps-recommend__service-list--consider", { timeout: 30_000 });
  await page.waitForSelector("#spr-included-title", { timeout: 30_000 });
  await page.waitForTimeout(800);
}

async function waitForPaymentPage(page) {
  await page.goto(`${BASE}/payment`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForSelector(".payment-page", { timeout: 30_000 });
  await page.waitForSelector(".pay-paper-card--summary", { timeout: 30_000 });
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
    return;
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

  const checkoutSummary = page.locator(".pay-paper-card--summary").first();
  const checkoutText = await checkoutSummary.textContent();
  if (!checkoutText?.includes(MONTHLY_CONSIDER_TITLE)) {
    throw new Error(`"${MONTHLY_CONSIDER_TITLE}" not found in embedded checkout plan list`);
  }
  console.log("  ✓ Monthly removed from Consider Next hero; present in checkout plan list");
}

async function verifyTotals(page) {
  const planTotals = page.locator('section[aria-labelledby="spr-cost-title"]');
  const checkoutSummary = page.locator(".pay-paper-card--summary").first();

  const planText = await planTotals.textContent();
  const checkoutText = await checkoutSummary.textContent();

  if (!planText?.includes(EXPECTED_AMOUNT_DUE)) {
    throw new Error(`Plan totals missing Amount Due Today ${EXPECTED_AMOUNT_DUE}`);
  }
  if (!checkoutText?.includes(EXPECTED_AMOUNT_DUE)) {
    throw new Error(`Checkout summary missing Amount Due Today ${EXPECTED_AMOUNT_DUE}`);
  }
  if (!planText?.includes(EXPECTED_MONTHLY)) {
    throw new Error(`Plan totals missing monthly subtotal ${EXPECTED_MONTHLY}`);
  }
  if (!checkoutText?.includes(EXPECTED_MONTHLY)) {
    throw new Error(`Checkout summary missing monthly subtotal ${EXPECTED_MONTHLY}`);
  }
  console.log(`  ✓ Monthly subtotal ${EXPECTED_MONTHLY}/month; Amount Due Today ${EXPECTED_AMOUNT_DUE}`);
}

async function removeFirstIncludedService(page) {
  await page.locator("#spr-included-title").scrollIntoViewIfNeeded();
  const removeButton = page.locator(".spr-service__btn", { hasText: "Remove" }).first();
  await removeButton.scrollIntoViewIfNeeded();
  await removeButton.click();
  await page.waitForTimeout(700);
}

async function verifyRemoveSync(page) {
  const planTotals = page.locator('section[aria-labelledby="spr-cost-title"]');
  const checkoutSummary = page.locator(".pay-paper-card--summary").first();
  const includedCount = await page.locator(".spr-services__list .spr-service").count();

  const planAmountDue = await planTotals.locator(".spr-cost__total-row--due dd").textContent();
  const checkoutAmountDue = await checkoutSummary.locator(".pay-summary-price").last().textContent();

  if (!planAmountDue || !checkoutAmountDue) {
    throw new Error("Could not read Amount Due Today from plan or checkout");
  }
  if (planAmountDue.trim() !== checkoutAmountDue.trim()) {
    throw new Error(
      `Amount Due Today mismatch after remove: plan=${planAmountDue} checkout=${checkoutAmountDue}`,
    );
  }
  if (includedCount !== 2) {
    throw new Error(`Expected 2 included services after remove, got ${includedCount}`);
  }

  const checkoutText = await checkoutSummary.textContent();
  if (!checkoutText?.includes(MONTHLY_CONSIDER_TITLE)) {
    throw new Error("Checkout plan list lost monthly service after remove");
  }
  console.log(
    `  ✓ Remove synced — ${includedCount} included rows, Amount Due Today ${planAmountDue.trim()}, monthly retained`,
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 2200 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Shared setup: green plan + add monthly Consider Next
  await seedProjectSummaryCheckout(page, { clearDraft: true });
  await waitForProjectSummary(page);
  await addMonthlyConsiderNext(page);
  await verifyMonthlyAdded(page);

  // 1 — Consider Next monthly added: full workspace (hero + customize + checkout)
  console.log("Capturing 01-consider-next-monthly-added.png");
  await unionClipScreenshot(page, [".ps-workspace"], "01-consider-next-monthly-added.png", 12);

  // 2 — Monthly subtotal vs Amount Due Today (plan totals + embedded checkout)
  console.log("Capturing 02-monthly-subtotal-amount-due-unchanged.png");
  await verifyTotals(page);
  await unionClipScreenshot(
    page,
    ['section[aria-labelledby="spr-cost-title"]', ".pay-paper-card--summary"],
    "02-monthly-subtotal-amount-due-unchanged.png",
    16,
  );

  // 3 — Refresh preserves draft
  console.log("Capturing 03-refresh-draft-preserved.png");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".project-summary-page", { timeout: 30_000 });
  await page.waitForTimeout(800);
  await verifyMonthlyAdded(page);
  await verifyTotals(page);
  await unionClipScreenshot(
    page,
    ['section[aria-labelledby="spr-cost-title"]', ".pay-paper-card--summary"],
    "03-refresh-draft-preserved.png",
    16,
  );

  // 4 — Direct /payment reads same draft
  console.log("Capturing 04-direct-payment-sync.png");
  await waitForPaymentPage(page);
  const paymentSummary = page.locator(".pay-paper-card--summary").first();
  const paymentText = await paymentSummary.textContent();
  if (!paymentText?.includes(EXPECTED_AMOUNT_DUE) || !paymentText?.includes(EXPECTED_MONTHLY)) {
    throw new Error("/payment totals do not match Project Summary draft");
  }
  if (!paymentText?.includes(MONTHLY_CONSIDER_TITLE)) {
    throw new Error("/payment plan list missing monthly service from draft");
  }
  console.log("  ✓ /payment matches Project Summary draft");
  await unionClipScreenshot(page, [".pay-paper-card--summary"], "04-direct-payment-sync.png", 16);

  // 5 — Remove syncs customize + embedded checkout + totals
  console.log("Capturing 05-remove-or-swap-all-synced.png");
  await waitForProjectSummary(page);
  await removeFirstIncludedService(page);
  await verifyRemoveSync(page);
  await unionClipScreenshot(
    page,
    ["#spr-included-title", 'section[aria-labelledby="spr-cost-title"]', ".pay-paper-card--summary"],
    "05-remove-or-swap-all-synced.png",
    16,
  );

  await browser.close();
  console.log(`\nPriority 4 verification screenshots saved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
