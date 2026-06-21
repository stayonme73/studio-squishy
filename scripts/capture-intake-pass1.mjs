/**
 * Intake Form Pass 1 — owner approval screenshots only.
 * Run: node scripts/capture-intake-pass1.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("docs/review-captures");

const visionData = {
  project: "Summer Product Launch",
  business: "Tagia Bakery",
  audienceFit: "local-community",
  audienceNotes: "Families within 10 miles",
  message: "Fresh pastries every morning",
  goalSelections: ["build-awareness"],
  goalNotes: "Drive foot traffic",
  brandPersonalitySelections: ["friendly"],
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

async function screenshot(page, filename) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
  console.log(`  ${filename}`);
}

async function clickIntakeForward(page) {
  const reviewBtn = page.getByRole("button", { name: "Review answers" });
  if (await reviewBtn.isVisible().catch(() => false)) {
    await reviewBtn.click();
    return;
  }
  await page.getByRole("button", { name: "Continue" }).click();
}

async function openIntake(page) {
  await page.goto(`${BASE}/draft-room?begin=1&package=growth`, { waitUntil: "networkidle" });
  await page.waitForSelector(".dri-wizard-panel", { timeout: 25000 });
}

async function gotoIntakeQuestionStep(page, targetStep) {
  await openIntake(page);
  await clickIntakeForward(page);

  for (let step = 1; step < targetStep; step += 1) {
    if (step === 1) {
      await page.locator(".dri-wizard-panel textarea").first().fill(visionData.project);
    }
    if (step === 2) {
      await page.locator(".dri-wizard-panel textarea").first().fill(visionData.business);
    }
    await clickIntakeForward(page);
    await page.waitForTimeout(200);
  }

  if (targetStep === 1) {
    await page.locator(".dri-wizard-panel textarea").first().fill(visionData.project);
  }
  if (targetStep === 2) {
    await page.locator(".dri-wizard-panel textarea").first().fill(visionData.business);
  }

  await page.waitForSelector(".dri-intake-progress__label", { timeout: 10000 });
}

async function gotoIntakeReviewStep(page) {
  await gotoIntakeQuestionStep(page, 10);
  await page.getByRole("button", { name: "Review answers" }).click();
  await page.locator(".dri-pane--active .dri-summary").waitFor({ timeout: 15000 });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  console.log("Intake Pass 1 captures");

  await openIntake(page);
  await screenshot(page, "owner-review-intake-intro.png");

  await gotoIntakeQuestionStep(page, 1);
  await page.waitForFunction(
    () => document.querySelector(".dri-intake-progress__label")?.textContent?.includes("Step 1 of 10"),
    { timeout: 10000 },
  );
  await screenshot(page, "owner-review-intake-step-01-of-10.png");

  await gotoIntakeQuestionStep(page, 2);
  await page.waitForFunction(
    () => document.querySelector(".dri-intake-progress__label")?.textContent?.includes("Step 2 of 10"),
    { timeout: 10000 },
  );
  await screenshot(page, "owner-review-intake-step-02-of-10.png");

  await gotoIntakeQuestionStep(page, 8);
  await page.waitForFunction(
    () => document.querySelector(".dri-intake-progress__label")?.textContent?.includes("Step 8 of 10"),
    { timeout: 10000 },
  );
  await screenshot(page, "owner-review-intake-step-08-vision.png");

  await gotoIntakeReviewStep(page);
  await screenshot(page, "owner-review-intake-review-step.png");

  await browser.close();
  console.log(`\nSaved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
