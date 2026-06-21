/**
 * Capture utility design system consistency screenshots (pre-backdrop).
 * Run: node scripts/capture-utility-design-system.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("docs/review-captures");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

const visionData = {
  project: "Summer Product Launch",
  business: "Tagia Bakery",
  audienceFit: "local",
  audienceNotes: "Families within 10 miles",
  message: "Fresh pastries every morning",
  goalSelections: ["awareness"],
  goalNotes: "Drive foot traffic",
  brandPersonalitySelections: ["warm"],
  brandPersonalityNotes: "",
  brandHasColors: "yes",
  brandColorList: "Cream, teal",
  brandColorSelections: [],
  brandColorNotes: "",
  visionFeel: "Welcoming and bright",
  visionRemember: "The smell of fresh bread",
  visionDesired: "More weekend visits",
  visionSuccess: "20% increase in Saturday sales",
  visionAvoid: "Generic stock photos",
  inspirationLike: "Hand-drawn menu boards",
  inspirationDislike: "Cold corporate ads",
  anythingElse: "Launch before July 4",
};

function buildCampaign(status) {
  const now = new Date().toISOString();
  return {
    campaignId: "utility-ds-review",
    campaignName: "Summer Product Launch",
    campaignStatus: status,
    campaignDescription: "Utility design system review campaign",
    estimatedCompletion: "Approximately 7 business days",
    packageId: "growth",
    packageLabel: "GROWTH",
    intake: {
      idea: visionData.project,
      audience: "Local families",
      action: "Drive foot traffic",
      deadline: "Before July 4",
      submittedAt: now,
    },
    visionData,
    visionSubmittedAt: now,
    paymentReceivedAt: now,
    targetCompletionDate: null,
    revisionRoundsIncluded: 3,
    revisionRoundsUsed: 1,
    deliverablesDelivered: { socialPost: 2, email: 1 },
    studioNotes: [
      { date: "Today", message: "Vision Intake received." },
      { date: "Today", message: "Payment received." },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

async function seedCampaign(page, status) {
  await page.goto(BASE);
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
    },
    { key: CAMPAIGN_KEY, value: buildCampaign(status) },
  );
}

const captures = [
  {
    name: "utility-ds-studio-board",
    path: "/studio-board",
    wait: async (page) => {
      await page.waitForFunction(
        () => document.querySelector("#sb-campaign-title")?.textContent?.includes("Summer"),
        { timeout: 20000 },
      );
    },
    seed: "PAYMENT_RECEIVED",
  },
  {
    name: "utility-ds-campaign-details",
    path: "/campaign-details",
    wait: async (page) => page.waitForSelector("#cd-vision-title", { timeout: 20000 }),
    seed: "PAYMENT_RECEIVED",
  },
  {
    name: "utility-ds-help-center",
    path: "/help-center",
    wait: async (page) => page.waitForSelector("#hc-philosophy-title", { timeout: 20000 }),
    seed: null,
  },
  {
    name: "utility-ds-payment",
    path: "/payment?package=growth",
    wait: async (page) => page.waitForSelector(".utility-title", { timeout: 20000 }),
    seed: null,
  },
  {
    name: "utility-ds-review-room",
    path: "/review-room",
    wait: async (page) => page.waitForSelector(".utility-title", { timeout: 20000 }),
    seed: "READY_FOR_REVIEW",
  },
  {
    name: "utility-ds-deliverables",
    path: "/deliverables",
    wait: async (page) => page.waitForSelector(".utility-title", { timeout: 20000 }),
    seed: "DELIVERED",
  },
  {
    name: "utility-ds-past-campaigns",
    path: "/past-campaigns",
    wait: async (page) => page.waitForSelector(".utility-title", { timeout: 20000 }),
    seed: null,
  },
  {
    name: "utility-ds-account",
    path: "/account",
    wait: async (page) => page.waitForSelector(".utility-title", { timeout: 20000 }),
    seed: null,
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
    if (capture.seed) {
      await seedCampaign(page, capture.seed);
    }

    await page.goto(`${BASE}${capture.path}`);
    await capture.wait(page);
    await page.waitForTimeout(500);

    const file = `${capture.name}.png`;
    await page.screenshot({
      path: path.join(OUT_DIR, file),
      fullPage: true,
    });
    console.log(`Captured ${file}`);
  }

  await browser.close();
  console.log(`\nUtility design system screenshots saved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
