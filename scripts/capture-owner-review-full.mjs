/**
 * Owner review screenshot pack — full visual verification set.
 * Run: node scripts/capture-owner-review-full.mjs
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
    campaignId: "owner-review-pack",
    campaignName: "Summer Product Launch",
    campaignStatus: status,
    campaignDescription: "Owner review screenshot pack",
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
    paymentReceivedAt: status !== "DRAFT_RECEIVED" ? now : null,
    targetCompletionDate: null,
    revisionRoundsIncluded: 3,
    revisionRoundsUsed: 0,
    selectedCampaignOption: status === "DELIVERED" ? "Option B (Balanced)" : null,
    deliverablesDelivered: status === "DELIVERED" ? { social: 10, email: 3 } : {},
    studioNotes: [
      { date: "Today", message: "Vision Intake received." },
      { date: "Today", message: "Payment received." },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

async function seedCampaign(page, status = "PAYMENT_RECEIVED") {
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
    },
    { key: CAMPAIGN_KEY, value: buildCampaign(status) },
  );
}

async function screenshot(page, filename, { fullPage = true } = {}) {
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(OUT_DIR, filename),
    fullPage,
  });
  console.log(`  ${filename}`);
}

async function capturePage(page, url, waitSelector, filename) {
  await page.goto(url, { waitUntil: "networkidle" });
  if (waitSelector) {
    await page.waitForSelector(waitSelector, { timeout: 25000 });
  }
  await screenshot(page, filename);
}

async function clickIntakeForward(page) {
  const reviewBtn = page.getByRole("button", { name: "Review answers" });
  if (await reviewBtn.isVisible().catch(() => false)) {
    await reviewBtn.click();
    return;
  }
  const continueBtn = page.getByRole("button", { name: "Continue" });
  await continueBtn.click();
}

async function openIntake(page) {
  await page.goto(`${BASE}/draft-room?begin=1&package=growth`, { waitUntil: "networkidle" });
  await page.waitForSelector(".dri-wizard-panel", { timeout: 25000 });
}

/** Advance from intro (step 0) to target question step (1–10). */
async function gotoIntakeQuestionStep(page, targetStep) {
  await openIntake(page);
  await clickIntakeForward(page);

  for (let step = 1; step < targetStep; step += 1) {
    if (step === 1) {
      await page.locator(".dri-wizard-panel textarea").first().fill(visionData.project);
    }
    await clickIntakeForward(page);
    await page.waitForTimeout(250);
  }

  if (targetStep === 1) {
    await page.locator(".dri-wizard-panel textarea").first().fill(visionData.project);
  }

  await page.waitForSelector(".dri-intake-progress__label", { timeout: 10000 });
}

async function gotoIntakeReviewStep(page) {
  await gotoIntakeQuestionStep(page, 10);
  await page.getByRole("button", { name: "Review answers" }).click();
  await page.locator(".dri-pane--active .dri-summary").waitFor({ timeout: 15000 });
}

async function captureIntakeScreenshots(page) {
  console.log("Draft Room Intake — Pass 1");

  await gotoIntakeQuestionStep(page, 1);
  await page.waitForFunction(
    () => document.querySelector(".dri-intake-progress__label")?.textContent?.includes("Step 1 of 10"),
    { timeout: 10000 },
  );
  await screenshot(page, "owner-review-intake-step-01-of-10.png", { fullPage: false });

  await gotoIntakeQuestionStep(page, 2);
  await page.waitForFunction(
    () => document.querySelector(".dri-intake-progress__label")?.textContent?.includes("Step 2 of 10"),
    { timeout: 10000 },
  );
  await screenshot(page, "owner-review-intake-step-02-of-10.png", { fullPage: false });

  await gotoIntakeQuestionStep(page, 5);
  await page.waitForFunction(
    () => document.querySelector(".dri-intake-progress__label")?.textContent?.includes("Step 5 of 10"),
    { timeout: 10000 },
  );
  await screenshot(page, "owner-review-intake-step-05-mid-form.png", { fullPage: false });

  await gotoIntakeQuestionStep(page, 8);
  await page.waitForFunction(
    () => document.querySelector(".dri-intake-progress__label")?.textContent?.includes("Step 8 of 10"),
    { timeout: 10000 },
  );
  await screenshot(page, "owner-review-intake-step-08-vision.png", { fullPage: false });

  await gotoIntakeReviewStep(page);
  await page.locator(".dri-pane--active .dri-intake-progress__label").waitFor({ timeout: 10000 });
  await screenshot(page, "owner-review-intake-review-step.png", { fullPage: false });
}

async function captureTransitionPath(page) {
  console.log("Transition path (black-screen validation)");
  await page.goto(`${BASE}/studio-guide?package=growth`, { waitUntil: "networkidle" });
  await page.waitForSelector(".studio-guide", { timeout: 25000 });
  await screenshot(page, "owner-review-transition-studio-guide.png", { fullPage: false });

  await seedCampaign(page, "PAYMENT_RECEIVED");
  await page.goto(`${BASE}/campaign-details`, { waitUntil: "networkidle" });
  await page.waitForSelector("#cd-vision-title", { timeout: 25000 });
  await screenshot(page, "owner-review-transition-campaign-details.png", { fullPage: false });

  await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle" });
  await page.waitForSelector("#sb-campaign-title", { timeout: 25000 });
  await screenshot(page, "owner-review-transition-studio-board.png", { fullPage: false });

  await page.goto(`${BASE}/help-center`, { waitUntil: "networkidle" });
  await page.waitForSelector("#hc-philosophy-title", { timeout: 25000 });
  await screenshot(page, "owner-review-transition-help-center.png", { fullPage: false });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.goto(BASE);
  await seedCampaign(page, "PAYMENT_RECEIVED");

  await captureIntakeScreenshots(page);

  console.log("Utility pages");
  await capturePage(page, `${BASE}/payment?package=growth`, ".utility-topbar__title", "owner-review-payment.png");
  await capturePage(page, `${BASE}/campaign-details`, "#cd-vision-title", "owner-review-campaign-details.png");
  await capturePage(page, `${BASE}/help-center`, "#hc-philosophy-title", "owner-review-help-center.png");
  await capturePage(page, `${BASE}/studio-board`, "#sb-current-campaign-title", "owner-review-studio-board.png");

  await seedCampaign(page, "READY_FOR_REVIEW");
  await capturePage(page, `${BASE}/review-room`, '[aria-label="Review Room"]', "owner-review-review-room.png");

  await seedCampaign(page, "DELIVERED");
  await capturePage(page, `${BASE}/deliverables`, '[aria-label="Final Delivery"]', "owner-review-final-delivery.png");

  await captureTransitionPath(page);

  await browser.close();
  console.log(`\nOwner review pack saved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
