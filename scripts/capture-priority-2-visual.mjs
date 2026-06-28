/**
 * Priority 2 visual system — utility backdrop screenshots.
 * Run: node scripts/capture-priority-2-visual.mjs
 * Requires dev server at localhost:3000
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/priority-2-visual");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const DISCOVERY_KEY = "studio-squishy:business-discovery-answers";

const BUSINESS_DELIM = "\n---\n";

function buildProjectDetailsCampaign() {
  const now = new Date().toISOString();
  return {
    campaignId: "priority-2-project-details",
    campaignName: "Tagia Bakery Campaign",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Payment received.",
    estimatedCompletion: "Approximately 7 business days",
    packageId: "momentum",
    packageLabel: "Momentum Plan",
    discoveryAnswers: {
      "your-business": `Tagia Bakery${BUSINESS_DELIM}Fresh pastries and coffee daily`,
      "your-goals": "Grow local awareness",
      "your-audience": "Families within 10 miles",
    },
    discoverySubmittedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: ["bf-001", "sm-001"],
      includedServiceIds: ["bf-001", "sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 89000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 89000,
      lineItems: [],
      approvedAt: now,
    },
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function buildProjectSummaryCampaign() {
  const now = new Date().toISOString();
  return {
    campaignId: "priority-2-project-summary",
    campaignName: "Summer Product Launch",
    campaignStatus: "DISCOVERY_COMPLETE",
    campaignDescription: "Discovery complete.",
    packageId: "growth",
    packageLabel: "Growth Plan",
    discoveryAnswers: {
      "your-business": `Tagia Bakery${BUSINESS_DELIM}Fresh pastries daily`,
      "your-goals": "Grow awareness",
    },
    discoverySubmittedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

async function seed(page, campaign, discoveryAnswers) {
  await page.goto(BASE);
  await page.evaluate(
    ({ campaignKey, discoveryKey, campaignValue, discoveryValue }) => {
      if (campaignValue) {
        localStorage.setItem(campaignKey, JSON.stringify(campaignValue));
      }
      if (discoveryValue) {
        localStorage.setItem(discoveryKey, JSON.stringify(discoveryValue));
      }
      window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
    },
    {
      campaignKey: CAMPAIGN_KEY,
      discoveryKey: DISCOVERY_KEY,
      campaignValue: campaign,
      discoveryValue: discoveryAnswers ?? null,
    },
  );
}

const captures = [
  {
    name: "01-project-summary-desktop",
    path: "/project-summary",
    seed: () => ({
      campaign: buildProjectSummaryCampaign(),
      discovery: {
        "your-business": `Tagia Bakery${BUSINESS_DELIM}Fresh pastries daily`,
        "your-goals": "Grow awareness",
        "your-audience": "Local families",
      },
    }),
    wait: (page) =>
      page.waitForSelector(".project-summary-page", { timeout: 25000 }),
  },
  {
    name: "02-project-details-desktop",
    path: "/project-details",
    seed: () => ({ campaign: buildProjectDetailsCampaign(), discovery: null }),
    wait: (page) =>
      page.waitForSelector(".project-details-page", { timeout: 25000 }),
  },
  {
    name: "03-help-center-desktop",
    path: "/help-center",
    seed: () => ({ campaign: null, discovery: null }),
    wait: (page) =>
      page.waitForSelector("#hc-philosophy-title", { timeout: 25000 }),
  },
  {
    name: "04-mural-left-help-center",
    path: "/help-center",
    seed: () => ({ campaign: null, discovery: null }),
    wait: (page) =>
      page.waitForSelector("#hc-philosophy-title", { timeout: 25000 }),
    clip: { x: 0, y: 0, width: 520, height: 900 },
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  for (const capture of captures) {
    const seedData = capture.seed();
    await seed(page, seedData.campaign, seedData.discovery);
    await page.goto(`${BASE}${capture.path}`);
    await capture.wait(page);
    await page.waitForTimeout(600);

    const file = `${capture.name}.png`;
    await page.screenshot({
      path: path.join(OUT_DIR, file),
      fullPage: !capture.clip,
      clip: capture.clip,
    });
    console.log(`Captured ${file}`);
  }

  await browser.close();
  console.log(`\nPriority 2 screenshots saved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
