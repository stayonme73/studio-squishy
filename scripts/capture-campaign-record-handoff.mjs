/**
 * Campaign Record handoff verification screenshots.
 * Requires dev server: npm run dev
 * Run: node scripts/capture-campaign-record-handoff.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/campaign-record-handoff");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const DISCOVERY_KEY = "studio-squishy:business-discovery-answers";
const DRAFT_KEY = "studio-squishy:last-draft";

const BUSINESS_DELIM = "\n---\n";
const NOW = new Date().toISOString();

const GREEN_IDS = ["bf-001", "sm-001", "ma-001"];

function buildApprovedPlan() {
  return {
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
    approvedAt: NOW,
  };
}

const DISCOVERY_ANSWERS = {
  "your-business": `Tagia Bakery${BUSINESS_DELIM}Fresh pastries and coffee daily`,
  "your-focus": "Promote an offer, event, or launch",
  "success-looks-like": "Grow local awareness",
};

const PROJECT_DETAILS_FORM = {
  workingOn: "Summer launch",
  mainOffer: "Seasonal pastries",
  importantDates: "July 4",
  callToAction: "Visit us",
  destinationLink: "https://tagiabakery.example.com",
  mustIncludeExactly: "",
  brandColorsFonts: "Teal and cream",
  inspirationLinks: "",
  brandDoNotUse: "",
  brandOutdatedParts: "",
  brandPartsToKeep: "Keep the teal accent",
  socialPlatforms: "Instagram",
  socialAccountLinks: "@tagiabakery",
  socialPostingWindow: "",
  emailPlatform: "",
  emailSender: "",
  emailSendTiming: "",
  emailListReady: "",
  conceptIntendedUse: "",
  conceptAudience: "Local families",
  conceptRequiredWording: "",
  marketingPieces: "Flyer, social, email, poster",
  marketingPieceUsage: "In-store and online",
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

function baseCampaign(overrides = {}) {
  return {
    campaignId: "handoff-verification",
    campaignName: "Tagia Bakery Campaign",
    campaignStatus: "READY_FOR_REVIEW",
    campaignDescription: "Concepts ready for review",
    estimatedCompletion: "Review open",
    packageId: "momentum",
    packageLabel: "Momentum Plan",
    discoveryAnswers: DISCOVERY_ANSWERS,
    discoverySubmittedAt: NOW,
    approvedStudioPlan: buildApprovedPlan(),
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
    studioNotes: [
      { date: "Today", message: "Payment received." },
      { date: "Today", message: "Project Details received." },
      { date: "Today", message: "Campaign concepts ready for your review." },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const STALE_DRAFT = {
  idea: "STALE draft idea — should not appear",
  audience: "STALE draft audience",
  action: "STALE draft action",
  deadline: "STALE deadline",
  packageId: "momentum",
  packageLabel: "Momentum Plan",
  submittedAt: NOW,
  project: "Stale Draft Project",
  business: "Stale Draft Business",
};

async function seed(page, campaign, { includeStaleDraft = false } = {}) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(
    ([campaignKey, campaignValue, discoveryKey, discoveryValue, draftKey, draftValue, includeDraft]) => {
      localStorage.setItem(campaignKey, JSON.stringify(campaignValue));
      localStorage.setItem(discoveryKey, JSON.stringify(discoveryValue));
      if (includeDraft) {
        localStorage.setItem(draftKey, JSON.stringify(draftValue));
      } else {
        localStorage.removeItem(draftKey);
      }
    },
    [CAMPAIGN_KEY, campaign, DISCOVERY_KEY, DISCOVERY_ANSWERS, DRAFT_KEY, STALE_DRAFT, includeStaleDraft],
  );
}

async function capture(page, filename) {
  const filePath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const campaign = baseCampaign();
  await seed(page, campaign, { includeStaleDraft: true });

  // 1. Discovery-first campaign reaches /feedback-studio with concepts visible
  await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle" });
  await page.waitForSelector(".fs-picker, .fs-page", { timeout: 30_000 });
  const shot1 = await capture(page, "01-feedback-studio-concepts.png");

  // 2. Review content from Campaign Record (not last-draft)
  const pageText = await page.locator("body").innerText();
  const proof2 = {
    hasSummerLaunch: pageText.includes("Summer launch"),
    lacksStaleDraft: !pageText.includes("STALE draft idea"),
  };
  const shot2 = await capture(page, "02-review-from-campaign-record.png");

  // 3. Project Details + Studio Board same campaign/services
  await page.goto(`${BASE}/project-details`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const shot3a = await capture(page, "03a-project-details.png");

  await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle" });
  await page.waitForSelector(".sb", { timeout: 30_000 });
  await page.waitForTimeout(1000);
  const shot3b = await capture(page, "03b-studio-board.png");

  // 4. Approved custom plan — no Momentum/Spark/Growth fallback in board display
  const boardText = await page.locator(".sb").innerText();
  const proof4 = {
    showsCustomPlan: boardText.includes("Custom Studio Plan"),
    lacksMomentumFallback: !boardText.match(/Momentum Plan|Spark Plan|Growth Plan/),
  };
  const shot4 = await capture(page, "04-custom-plan-no-bundle-fallback.png");

  // 5. Direct /review-room redirects to /feedback-studio
  await page.goto(`${BASE}/review-room`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/feedback-studio/, { timeout: 15_000 });
  const shot5 = await capture(page, "05-review-room-redirect.png");

  await browser.close();

  console.log(JSON.stringify({
    outputDir: OUT_DIR,
    screenshots: [shot1, shot2, shot3a, shot3b, shot4, shot5],
    proof: { proof2, proof4, reviewRoomUrl: "/feedback-studio" },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
