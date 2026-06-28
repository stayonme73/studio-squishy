/**
 * Deliverables Truth Pass — verification screenshots.
 * Requires dev server: npm run dev
 * Run: node scripts/capture-deliverables-truth-pass.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve(__dirname, "../tmp/deliverables-truth-pass");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const DISCOVERY_KEY = "studio-squishy:business-discovery-answers";

const BUSINESS_DELIM = "\n---\n";

const DISCOVERY = {
  "your-business": `Tagia Bakery${BUSINESS_DELIM}Fresh pastries and coffee daily`,
  "your-situation": "Promoting an offer, event, sale, or launch",
  "your-challenge": "I need help promoting something",
  "your-current-tools": "Social media accounts",
  "your-focus": "Promote an offer, event, or launch",
  "success-looks-like": "A successful launch, event, sale, or promotion",
  "whats-slowing-you-down": "I am not visible enough online",
};

/** Minimal frozen snapshots — mirrors buildServiceScopeSnapshot output for screenshot seeds. */
const LINE_ITEMS = {
  "bf-001": {
    skuId: "bf-001",
    serviceName: "Brand Identity Refresh",
    billingType: "one_time",
    exactPriceCents: 49500,
    priceDisplay: "$495",
    deliverables: ["Brand Direction Sheet", "Logo refinement guidance", "Color & typography direction"],
    exclusions: [],
    timingWindowLabel: "2 weeks",
    revisionRule: "1 round",
    clientResponsibilities: ["Provide logo files"],
    executionResponsibility: "studio",
  },
  "sm-001": {
    skuId: "sm-001",
    serviceName: "Social Media Launch Set",
    billingType: "one_time",
    exactPriceCents: 39500,
    priceDisplay: "$395",
    deliverables: ["Up to six static social posts"],
    exclusions: [],
    timingWindowLabel: "2 weeks",
    revisionRule: "1 round",
    clientResponsibilities: ["Approve posts"],
    executionResponsibility: "studio",
  },
  "em-001": {
    skuId: "em-001",
    serviceName: "Email Campaign Build",
    billingType: "one_time",
    exactPriceCents: 39500,
    priceDisplay: "$395",
    deliverables: ["Three-email campaign sequence"],
    exclusions: [],
    timingWindowLabel: "2 weeks",
    revisionRule: "1 round",
    clientResponsibilities: ["Approve copy"],
    executionResponsibility: "studio",
  },
  "ma-001": {
    skuId: "ma-001",
    serviceName: "Promotion Pack",
    billingType: "one_time",
    exactPriceCents: 49500,
    priceDisplay: "$495",
    deliverables: ["Four branded marketing assets"],
    exclusions: [],
    timingWindowLabel: "2 weeks",
    revisionRule: "1 round",
    clientResponsibilities: ["Approve assets"],
    executionResponsibility: "studio",
  },
};

function buildApprovedPlan(serviceIds) {
  const lineItems = serviceIds.map((id) => LINE_ITEMS[id]).filter(Boolean);
  const oneTimeTotalCents = lineItems.reduce((sum, line) => sum + line.exactPriceCents, 0);
  const now = new Date().toISOString();
  return {
    selectedServiceIds: [...serviceIds],
    includedServiceIds: [...serviceIds],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents,
    monthlyTotalCents: 0,
    amountDueTodayCents: oneTimeTotalCents,
    lineItems,
    approvedAt: now,
  };
}

function buildReviewReadyCampaign(serviceIds, campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Deliverables Truth Pass Campaign",
    campaignStatus: "READY_FOR_REVIEW",
    campaignDescription: "Campaign concepts ready for your review.",
    estimatedCompletion: "Approximately 5 business days",
    packageId: "spark",
    packageLabel: "Spark Plan",
    discoveryAnswers: DISCOVERY,
    discoverySubmittedAt: now,
    approvedStudioPlan: buildApprovedPlan(serviceIds),
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: "Campaign concepts ready for your review." }],
    createdAt: now,
    updatedAt: now,
  };
}

function buildDeliveredCampaign(serviceIds, campaignId) {
  const campaign = buildReviewReadyCampaign(serviceIds, campaignId);
  return {
    ...campaign,
    campaignStatus: "DELIVERED",
    campaignDescription: "Your campaign has been delivered.",
    selectedCampaignOption: "Option B (Balanced)",
    revisionRoundsUsed: 1,
  };
}

async function seed(page, campaign) {
  await page.goto(BASE);
  await page.evaluate(
    ([campaignKey, payload, discoveryKey, discovery]) => {
      localStorage.setItem(campaignKey, JSON.stringify(payload));
      localStorage.setItem(discoveryKey, JSON.stringify(discovery));
    },
    [CAMPAIGN_KEY, campaign, DISCOVERY_KEY, DISCOVERY],
  );
}

async function screenshot(page, filename, selector) {
  await page.waitForTimeout(500);
  const filePath = path.join(OUT_DIR, filename);
  if (selector) {
    await page.waitForSelector(selector, { timeout: 20000 });
    await page.locator(selector).first().screenshot({ path: filePath });
  } else {
    await page.screenshot({ path: filePath, fullPage: true });
  }
  console.log(filePath);
  return filePath;
}

async function captureReviewRoom(page, serviceIds, filename) {
  const campaign = buildReviewReadyCampaign(serviceIds, `truth-pass-${filename}`);
  await seed(page, campaign);
  await page.goto(`${BASE}/review-room?concept=A`, { waitUntil: "networkidle" });
  await page.waitForSelector(".fs-preview", { timeout: 20000 });
  return screenshot(page, filename, ".fs-preview");
}

async function captureFinalDelivery(page, serviceIds, filename) {
  const campaign = buildDeliveredCampaign(serviceIds, `truth-pass-delivery-${filename}`);
  await seed(page, campaign);
  await page.goto(`${BASE}/deliverables`, { waitUntil: "networkidle" });
  await page.waitForSelector(".fd-deliverables__grid", { timeout: 20000 });
  return screenshot(page, filename, ".fd-deliverables__grid");
}

async function captureBoard(page, serviceIds, filename) {
  const campaign = buildDeliveredCampaign(serviceIds, `truth-pass-board-${filename}`);
  await seed(page, campaign);
  await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle" });
  await page.waitForSelector(".sb-deliverables-progress", { timeout: 20000 });
  return screenshot(page, filename, ".sb-deliverables-progress");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  console.log("Capturing deliverables truth pass screenshots...\n");

  await captureReviewRoom(page, ["bf-001", "sm-001"], "01-review-brand-social-bf001-sm001.png");
  await captureFinalDelivery(page, ["bf-001", "sm-001"], "01-final-brand-social-bf001-sm001.png");

  await captureReviewRoom(page, ["em-001"], "02-review-email-only-em001.png");
  await captureFinalDelivery(page, ["em-001"], "02-final-email-only-em001.png");

  await captureReviewRoom(
    page,
    ["bf-001", "sm-001", "em-001", "ma-001"],
    "03-review-mixed-four-families.png",
  );
  await captureFinalDelivery(
    page,
    ["bf-001", "sm-001", "em-001", "ma-001"],
    "03-final-mixed-four-families.png",
  );

  await captureReviewRoom(page, ["bf-001", "sm-001"], "04-review-room-bf001-sm001.png");
  await captureFinalDelivery(page, ["bf-001", "sm-001"], "04-final-delivery-bf001-sm001.png");
  await captureBoard(page, ["bf-001", "sm-001"], "04-board-bf001-sm001.png");

  await page.goto(BASE);
  await page.evaluate(([campaignKey, discoveryKey]) => {
    localStorage.removeItem(campaignKey);
    localStorage.removeItem(discoveryKey);
  }, [CAMPAIGN_KEY, DISCOVERY_KEY]);
  await page.goto(`${BASE}/deliverables?preview=delivered`, { waitUntil: "networkidle" });
  await page.waitForSelector(".fd-empty", { timeout: 20000 });
  await screenshot(page, "05-no-campaign-preview-safe.png", ".utility-page");

  await browser.close();
  console.log(`\nSaved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
