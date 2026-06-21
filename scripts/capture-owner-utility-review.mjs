/**
 * Capture owner review screenshots — utility standards + intake fixes.
 * Run: node scripts/capture-owner-utility-review.mjs
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

function buildCampaign() {
  const now = new Date().toISOString();
  return {
    campaignId: "owner-utility-review",
    campaignName: "Summer Product Launch",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Owner utility standards review",
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
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [
      { date: "Today", message: "Vision Intake received." },
      { date: "Today", message: "Payment received." },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

async function seedCampaign(page) {
  const campaign = buildCampaign();
  await page.goto(BASE);
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
    },
    { key: CAMPAIGN_KEY, value: campaign },
  );
}

async function capture(page, url, waitSelector, filename) {
  await page.goto(url);
  if (waitSelector) {
    await page.waitForSelector(waitSelector, { timeout: 20000 });
  }
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUT_DIR, filename),
    fullPage: true,
  });
  console.log(`Captured ${filename}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await seedCampaign(page);

  await capture(
    page,
    `${BASE}/studio-board`,
    "#sb-campaign-title",
    "studio-board-utility-standards-review.png",
  );

  await capture(
    page,
    `${BASE}/campaign-details`,
    "#cd-vision-title",
    "campaign-details-utility-standards-review.png",
  );

  await capture(
    page,
    `${BASE}/help-center`,
    "#hc-philosophy-title",
    "help-center-utility-standards-review.png",
  );

  await capture(
    page,
    `${BASE}/payment?package=growth`,
    ".utility-topbar__title",
    "payment-utility-standards-review.png",
  );

  await capture(
    page,
    `${BASE}/draft-room?begin=1&package=growth`,
    ".dri-wizard-panel",
    "draft-room-intake-utility-standards-review.png",
  );

  await browser.close();
  console.log(`\nOwner review screenshots saved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
