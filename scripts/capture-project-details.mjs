/**
 * Project Details flow — desktop + mobile screenshots.
 * Requires dev server: npm run dev
 * Run: node scripts/capture-project-details.mjs
 */
import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/project-details-integration");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const DISCOVERY_KEY = "studio-squishy:business-discovery-answers";

const BUSINESS_DELIM = "\n---\n";

/** Realistic Green custom plan — bf-001 + sm-001 + ma-001 = $1,385 */
function buildCampaign() {
  const now = new Date().toISOString();
  return {
    campaignId: "screenshot-project-details",
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
      selectedServiceIds: ["bf-001", "sm-001", "ma-001"],
      includedServiceIds: ["bf-001", "sm-001", "ma-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 138500,
      monthlyTotalCents: 0,
      amountDueTodayCents: 138500,
      lineItems: [
        {
          skuId: "bf-001",
          serviceName: "Brand Identity Refresh",
          billingType: "one_time",
          exactPriceCents: 49500,
          priceDisplay: "$495",
          deliverables: ["Brand Direction Sheet"],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: ["Provide logo files"],
          executionResponsibility: "studio",
        },
        {
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
        {
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
      ],
      approvedAt: now,
    },
    paymentReceivedAt: now,
    targetCompletionDate: null,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: "Payment received." }],
    createdAt: now,
    updatedAt: now,
  };
}

async function seed(page) {
  await page.goto(BASE);
  await page.evaluate(
    ([campaignKey, campaign, discoveryKey, discovery]) => {
      localStorage.setItem(campaignKey, JSON.stringify(campaign));
      localStorage.setItem(discoveryKey, JSON.stringify(discovery));
    },
    [
      CAMPAIGN_KEY,
      buildCampaign(),
      DISCOVERY_KEY,
      {
        "your-business": `Tagia Bakery${BUSINESS_DELIM}Fresh pastries and coffee daily`,
        "your-goals": "Grow local awareness",
        "your-audience": "Families within 10 miles",
      },
    ],
  );
}

async function screenshot(page, filename) {
  await page.waitForTimeout(400);
  const filePath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  ${filePath}`);
}

async function fillStep1(page) {
  await page.locator("#workingOn").fill("Summer pastry launch");
  await page.locator("#mainOffer").fill("New seasonal menu");
  await page.locator("#importantDates").fill("July 4 weekend");
  await page.locator("#callToAction").fill("Visit the bakery");
  await page.locator("#destinationLink").fill("https://tagiabakery.example");
}

async function fillBrandMaterials(page) {
  await page.locator("#brandOutdatedParts").fill("Old chalkboard logo");
  await page.locator("#brandPartsToKeep").fill("Keep the teal accent");
  await page.getByRole("button", { name: "Logo" }).locator("..").locator("input[type=file]").setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.waitForSelector(".pd-upload__item", { timeout: 10000 });
}

async function fillChannels(page) {
  await page.locator("#socialPlatforms").fill("Instagram, Facebook");
  await page.locator("#socialAccountLinks").fill("@tagiabakery");
}

async function fillServiceSpecific(page) {
  await page.locator("#marketingPieces").fill("Flyer, window sign, social graphic, email header");
  await page.locator("#marketingPieceUsage").fill("In-store, social, and email");
}

async function fillApproval(page) {
  await page.locator("#primaryApproverName").fill("Tagia Owner");
  await page.locator("#primaryApproverEmail").fill("tagia@example.com");
}

async function captureFlow(page, prefix) {
  await seed(page);
  await page.goto(`${BASE}/project-details`, { waitUntil: "networkidle" });
  await page.waitForSelector(".pd-workspace", { timeout: 20000 });
  await screenshot(page, `${prefix}-01-prefill-step1.png`);

  await fillStep1(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector("#brandOutdatedParts", { timeout: 10000 });
  await screenshot(page, `${prefix}-02-brand-materials.png`);

  await fillBrandMaterials(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector("#socialPlatforms", { timeout: 10000 });
  await fillChannels(page);
  await screenshot(page, `${prefix}-03-channels.png`);

  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector("#marketingPieces", { timeout: 10000 });
  await fillServiceSpecific(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector("#primaryApproverName", { timeout: 10000 });

  await fillApproval(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector(".pd-review", { timeout: 10000 });
  await screenshot(page, `${prefix}-04-final-review.png`);

  await page.getByRole("button", { name: "Submit Project Details" }).click();
  await page.waitForURL("**/studio-board", { timeout: 15000 });
  await screenshot(page, `${prefix}-05-studio-board-after-submit.png`);
}

async function captureMobilePrefill(page) {
  await seed(page);
  await page.goto(`${BASE}/project-details`, { waitUntil: "networkidle" });
  await page.waitForSelector(".pd-workspace", { timeout: 20000 });
  await fillStep1(page);
  await screenshot(page, "mobile-01-prefill-step1.png");

  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector("#brandOutdatedParts", { timeout: 10000 });
  await page.locator("#brandOutdatedParts").fill("Old chalkboard logo");
  await page.locator("#brandPartsToKeep").fill("Keep the teal accent from our storefront sign");
  await screenshot(page, "mobile-02-brand-materials.png");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const desktop = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  console.log("Desktop captures");
  await captureFlow(desktop, "desktop");
  await desktop.close();

  const mobile = await browser.newPage({
    ...devices["iPhone 13"],
  });
  console.log("Mobile captures");
  await captureMobilePrefill(mobile);
  await mobile.close();

  await browser.close();
  console.log(`\nSaved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
