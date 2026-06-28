/**
 * Journey surface consolidation verification screenshots.
 * Requires dev server: npm run dev
 * Run: node scripts/capture-journey-surface-consolidation.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/journey-surface-consolidation");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const DISCOVERY_KEY = "studio-squishy:business-discovery-answers";
const DRAFT_KEY_PREFIX = "studio-squishy:project-summary-plan-draft:";

const BUSINESS_DELIM = "\n---\n";
const NOW = new Date().toISOString();
const GREEN_IDS = ["bf-001", "sm-001", "ma-001"];

const DISCOVERY_ANSWERS = {
  "your-business": `Tagia Bakery${BUSINESS_DELIM}Fresh pastries and coffee daily`,
  "your-focus": "Promote an offer, event, or launch",
  "success-looks-like": "Grow local awareness",
};

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
    ],
    approvedAt: NOW,
  };
}

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
  brandOutdatedParts: "Old chalkboard logo",
  brandPartsToKeep: "Keep the teal accent",
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

function reviewReadyCampaign(overrides = {}) {
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
    studioNotes: [{ date: "Today", message: "Campaign concepts ready for your review." }],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

async function clearStudioState(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(() => {
    for (const key of [...Object.keys(localStorage)]) {
      if (key.startsWith("studio-squishy:")) localStorage.removeItem(key);
    }
  });
}

async function seedCampaign(page, campaign, { planDraft } = {}) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(
    ([campaignKey, campaignValue, discoveryKey, discoveryValue, draftPrefix, draftValue]) => {
      localStorage.setItem(campaignKey, JSON.stringify(campaignValue));
      localStorage.setItem(discoveryKey, JSON.stringify(discoveryValue));
      if (draftValue) {
        localStorage.setItem(`${draftPrefix}${campaignValue.campaignId}`, JSON.stringify(draftValue));
      }
    },
    [
      CAMPAIGN_KEY,
      campaign,
      DISCOVERY_KEY,
      DISCOVERY_ANSWERS,
      DRAFT_KEY_PREFIX,
      planDraft ?? null,
    ],
  );
}

async function capture(page, filename, { fullPage = true } = {}) {
  const filePath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: filePath, fullPage });
  return filePath;
}

async function waitForCampaignConcepts(page, timeout = 30_000) {
  await page.waitForFunction(
    () => {
      const raw = localStorage.getItem("studio-squishy:current-campaign");
      if (!raw) return false;
      const campaign = JSON.parse(raw);
      return Array.isArray(campaign.concepts) && campaign.concepts.length === 3;
    },
    { timeout },
  );
}

async function waitForReviewRoomReady(page, campaignName = "Tagia Bakery Campaign") {
  await page.waitForURL(/\/feedback-studio/, { timeout: 15_000 });
  await page.waitForSelector(".fs-picker__campaign", { timeout: 30_000 });
  await page.locator(".fs-picker__campaign").filter({ hasText: campaignName }).waitFor({ timeout: 15_000 });
  await page.waitForSelector(".fs-picker__grid", { timeout: 15_000 });
}

async function countPrimaryReviewCtas(page) {
  return page.locator(".utility-btn--primary", { hasText: "Review My Concepts" }).count();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const screenshots = [];

  // 1. Studio Board — single Review My Concepts CTA when READY_FOR_REVIEW
  const campaign = reviewReadyCampaign();
  await seedCampaign(page, campaign);
  await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle" });
  await page.waitForSelector(".sb", { timeout: 30_000 });
  await page.waitForTimeout(800);
  const reviewCtaCount = await countPrimaryReviewCtas(page);
  screenshots.push({
    path: await capture(page, "01-studio-board-single-review-cta.png"),
    caption: "Studio Board with exactly one primary Review My Concepts CTA in Current Campaign",
    proof: { reviewCtaCount },
  });

  // 2. Sidebar — Studio Guide removed
  const sidebarText = await page.locator(".sb-nav").innerText();
  screenshots.push({
    path: await capture(page, "02-sidebar-no-studio-guide.png"),
    caption: "Board sidebar without Studio Guide nav item",
    proof: { hasStudioGuide: sidebarText.includes("Studio Guide") },
  });

  // 3. Legacy Studio Guide redirect — no plan → Discovery
  await clearStudioState(page);
  await page.goto(`${BASE}/studio-guide-prototype`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/business-discovery-studio/, { timeout: 15_000 });
  screenshots.push({
    path: await capture(page, "03-studio-guide-redirect-discovery.png"),
    caption: "Direct /studio-guide-prototype with no plan redirects to Project Discovery",
    proof: { url: page.url() },
  });

  // 4. Legacy Studio Guide redirect — active plan → Project Summary
  await seedCampaign(page, campaign);
  await page.goto(`${BASE}/studio-guide`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/project-summary/, { timeout: 15_000 });
  screenshots.push({
    path: await capture(page, "04-studio-guide-redirect-project-summary.png"),
    caption: "Direct /studio-guide with approved plan redirects to Project Summary",
    proof: { url: page.url() },
  });

  // 5. Feedback Studio — Studio backdrop/canvas
  await seedCampaign(page, campaign);
  await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle" });
  await page.waitForSelector(".studio-utility-scene", { timeout: 30_000 });
  screenshots.push({
    path: await capture(page, "05-feedback-studio-studio-backdrop.png"),
    caption: "Review Room (/feedback-studio) with Studio utility backdrop",
    proof: { hasUtilityScene: await page.locator(".studio-utility-scene").count() },
  });

  // 6. Project Record drawer — side panel over board
  await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle" });
  await page.waitForSelector(".sb", { timeout: 30_000 });
  await page.locator(".sb-nav__item--accent-record").click();
  await page.waitForSelector(".sb-record-drawer__panel", { timeout: 10_000 });
  await page.waitForTimeout(500);
  screenshots.push({
    path: await capture(page, "06-project-record-drawer-canvas.png"),
    caption: "Project Record drawer slides from the side over Studio Board",
    proof: {
      boardVisible: await page.locator(".sb-card--current").isVisible(),
      hasDimBackdrop: await page.locator(".sb-record-drawer__backdrop").count(),
    },
  });

  // 7. Handoff — Board → Project Record → Review Room (review-ready Owner QA seed)
  await seedCampaign(page, campaign);
  await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle" });
  await page.waitForSelector(".sb", { timeout: 30_000 });
  await page.waitForSelector(".sb-current-campaign__name", { timeout: 15_000 });
  await page.locator(".sb-nav__item--accent-record").click();
  await page.waitForSelector(".sb-record-drawer__panel", { timeout: 10_000 });
  await page.locator(".sb-record-drawer__subtitle").filter({ hasText: "Tagia Bakery Campaign" }).waitFor({
    timeout: 15_000,
  });
  await page.locator(".sb-record-drawer__close").click();
  await page.waitForSelector(".sb-record-drawer__panel", { state: "detached", timeout: 10_000 });
  await page.locator(".sb-nav__item--accent-review").click();
  await waitForReviewRoomReady(page);
  await waitForCampaignConcepts(page);
  await page.waitForTimeout(600);
  const reviewUrl = page.url();
  const reviewTitle = await page.locator(".fs-picker__campaign").innerText();
  const conceptCards = await page.locator(".fs-picker__grid > *").count();
  screenshots.push({
    path: await capture(page, "07-board-record-to-review-room.png", { fullPage: false }),
    caption: "Handoff from Board through Project Record nav to Review Room with campaign context",
    proof: { url: reviewUrl, reviewTitle, conceptCards },
  });

  // 8. Board visible behind semi-transparent drawer backdrop (Owner QA review)
  await seedCampaign(page, campaign);
  await page.goto(`${BASE}/studio-board?record=open`, { waitUntil: "networkidle" });
  await page.waitForSelector(".sb", { timeout: 30_000 });
  await page.waitForSelector(".sb-record-drawer__panel", { timeout: 10_000 });
  await page.waitForSelector(".sb-card--current", { timeout: 15_000 });
  await page.waitForTimeout(600);
  screenshots.push({
    path: await capture(page, "08-board-behind-record-drawer.png", { fullPage: false }),
    caption: "Studio Board cards and sidebar remain visible behind Project Record drawer",
    proof: {
      boardBehindDrawer:
        (await page.locator(".sb-sidebar").isVisible()) &&
        (await page.locator(".sb-card--current").isVisible()) &&
        (await page.locator(".sb-record-drawer__panel").isVisible()),
    },
  });

  await browser.close();

  console.log(
    JSON.stringify(
      {
        outputDir: OUT_DIR,
        screenshots,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
