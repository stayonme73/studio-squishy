/**
 * Capture Project Record drawer with Studio Board visible behind.
 * Requires dev server: npm run dev
 * Run: node scripts/capture-board-behind-record-drawer.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/journey-surface-consolidation");
const OUT_FILE = "08-board-behind-record-drawer.png";
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const DISCOVERY_KEY = "studio-squishy:business-discovery-answers";
const NOW = new Date().toISOString();
const GREEN_IDS = ["bf-001", "sm-001", "ma-001"];

const DISCOVERY_ANSWERS = {
  "your-business": "Tagia Bakery\n---\nFresh pastries and coffee daily",
  "your-focus": "Promote an offer, event, or launch",
  "success-looks-like": "Grow local awareness",
};

const PROJECT_DETAILS_FORM = {
  workingOn: "Summer pastry launch",
  mainOffer: "New seasonal menu",
  importantDates: "July 4 weekend",
  callToAction: "Visit the bakery",
  destinationLink: "https://tagiabakery.example",
  mustIncludeExactly: "",
  brandColorsFonts: "",
  inspirationLinks: "",
  brandDoNotUse: "",
  brandPartsToKeep: "Keep the teal accent",
  brandOutdatedParts: "Old chalkboard logo",
  socialPlatforms: "Instagram, Facebook",
  socialAccountLinks: "@tagiabakery",
  socialPostingWindow: "",
  emailPlatform: "",
  emailSender: "",
  emailSendTiming: "",
  emailListReady: "",
  conceptIntendedUse: "",
  conceptAudience: "",
  conceptRequiredWording: "",
  marketingPieces: "Flyer, window sign, social graphic, email header",
  marketingPieceUsage: "In-store, social, and email",
  marketingFormats: "",
  adScript: "",
  adIntendedUse: "",
  adVoiceStyle: "",
  adPronunciation: "",
  primaryApproverName: "Tagia Owner",
  primaryApproverEmail: "tagia@example.com",
  hasSecondaryApprover: "",
  secondaryApproverName: "",
  secondaryApproverEmail: "",
};

function reviewReadyCampaign() {
  return {
    campaignId: "owner-qa-dev",
    campaignName: "Tagia Bakery Campaign",
    campaignStatus: "READY_FOR_REVIEW",
    campaignDescription: "Concepts ready for review",
    estimatedCompletion: "Review open",
    packageId: "momentum",
    packageLabel: "Custom Studio Plan",
    discoveryAnswers: DISCOVERY_ANSWERS,
    discoverySubmittedAt: NOW,
    approvedStudioPlan: {
      selectedServiceIds: GREEN_IDS,
      includedServiceIds: GREEN_IDS,
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
      ],
      approvedAt: NOW,
    },
    paymentReceivedAt: NOW,
    projectDetailsSubmittedAt: NOW,
    projectDetails: {
      form: PROJECT_DETAILS_FORM,
      files: [],
      submittedAt: NOW,
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: "Campaign concepts ready for your review." }],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const campaign = reviewReadyCampaign();

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(
    ([campaignKey, campaignValue, discoveryKey, discoveryValue]) => {
      localStorage.setItem(campaignKey, JSON.stringify(campaignValue));
      localStorage.setItem(discoveryKey, JSON.stringify(discoveryValue));
    },
    [CAMPAIGN_KEY, campaign, DISCOVERY_KEY, DISCOVERY_ANSWERS],
  );

  await page.goto(`${BASE}/studio-board?record=open`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForSelector(".sb", { timeout: 30_000 });
  await page.waitForSelector(".sb-record-drawer__panel", { timeout: 15_000 });
  await page.waitForSelector(".sb-card--current", { timeout: 15_000 });
  await page.waitForTimeout(800);

  const filePath = path.join(OUT_DIR, OUT_FILE);
  await page.screenshot({ path: filePath, fullPage: false });

  const proof = {
    boardBehindDrawer:
      (await page.locator(".sb-sidebar").isVisible()) &&
      (await page.locator(".sb-card--current").isVisible()) &&
      (await page.locator(".sb-record-drawer__panel").isVisible()),
    hasStudioPlan: (await page.locator(".sb-record-drawer__studio-plan").count()) > 0,
    hasProjectDetails: (await page.locator(".sb-record-drawer__project-details").count()) > 0,
    hasReviewLink: (await page.locator('.sb-record-drawer a[href="/feedback-studio"]').count()) > 0,
  };

  await browser.close();
  console.log(JSON.stringify({ path: filePath, proof }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
