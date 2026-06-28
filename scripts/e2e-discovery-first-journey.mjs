/**
 * Discovery-first customer journey — Playwright E2E.
 * Requires dev server: npm run dev
 * Run: node scripts/e2e-discovery-first-journey.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/e2e-discovery-first-journey");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const DISCOVERY_KEY = "studio-squishy:business-discovery-answers";
const DRAFT_KEY_PREFIX = "studio-squishy:project-summary-plan-draft:";

const BUSINESS_DELIM = "\n---\n";
const TARGET_SERVICE_TITLES = [
  "Brand Identity Refresh",
  "Social Media Launch Set",
  "Email Campaign Build",
];
const FORBIDDEN_SCOPE = ["SMS", "Video Script", "Content Calendar", "Promotion Pack"];
const UNWANTED_IN_PLAN = ["Promotion Pack", "Marketing Copywriting Project", "Monthly Social Media Content Support"];
const BUNDLE_RE = /\b(Spark Plan|Momentum Plan|Growth Plan)\b/i;
const DRAFT_ROOM_RE = /\bDraft Room\b/i;

const DISCOVERY_ANSWERS = {
  "your-business": `Tagia Bakery${BUSINESS_DELIM}Fresh pastries and coffee daily`,
  "your-situation": "Promoting an offer, event, sale, or launch",
  "your-challenge": "I need help promoting something",
  "your-current-tools": "Social media accounts",
  "your-focus": "Promote an offer, event, or launch",
  "success-looks-like": "A successful launch, event, sale, or promotion",
  "whats-slowing-you-down": "I am not visible enough online",
};

const LOGO_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** Discovery-complete campaign — no momentum bundle assignment. */
function buildDiscoveryCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Tagia Bakery Campaign",
    campaignStatus: "DISCOVERY_COMPLETE",
    campaignDescription: "Discovery complete.",
    estimatedCompletion: "Review your Project Summary next.",
    packageId: "custom-studio-plan",
    packageLabel: "",
    discoveryAnswers: DISCOVERY_ANSWERS,
    discoverySubmittedAt: now,
    paymentReceivedAt: null,
    targetCompletionDate: null,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: "Discovery complete." }],
    createdAt: now,
    updatedAt: now,
  };
}

const steps = [];

function record(step, ok, detail = "", screenshot = null) {
  steps.push({ step, ok, detail, screenshot });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${step}${detail ? ` — ${detail}` : ""}`);
  if (screenshot) console.log(`      screenshot: ${screenshot}`);
}

async function readCampaignId(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw).campaignId ?? null;
  }, CAMPAIGN_KEY);
}

async function readCampaignServices(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const campaign = JSON.parse(raw);
    return campaign.approvedStudioPlan?.selectedServiceIds ?? [];
  }, CAMPAIGN_KEY);
}

async function assertJourneyCopy(page, selector, stepName) {
  const text = (await page.locator(selector).first().textContent()) ?? "";
  if (BUNDLE_RE.test(text)) {
    throw new Error(`${stepName}: bundle tier wording in ${selector}`);
  }
  if (DRAFT_ROOM_RE.test(text)) {
    throw new Error(`${stepName}: Draft Room wording in ${selector}`);
  }
}

async function screenshot(page, name) {
  const filePath = path.join(OUT_DIR, name);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function clearStudioState(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(() => {
    for (const key of [...Object.keys(localStorage)]) {
      if (key.startsWith("studio-squishy:")) localStorage.removeItem(key);
    }
  });
}

async function seedDiscoveryCampaign(page, campaignId) {
  const campaign = buildDiscoveryCampaign(campaignId);
  await page.evaluate(
    ([campaignKey, campaignValue, discoveryKey, discoveryValue]) => {
      localStorage.setItem(campaignKey, JSON.stringify(campaignValue));
      localStorage.setItem(discoveryKey, JSON.stringify(discoveryValue));
      window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
    },
    [CAMPAIGN_KEY, campaign, DISCOVERY_KEY, DISCOVERY_ANSWERS],
  );
  return campaign;
}

async function serviceInIncludedList(page, title) {
  return (
    (await page
      .locator("#spr-included-title")
      .locator("..")
      .locator(".spr-service__title", { hasText: title })
      .count()) > 0
  );
}

async function serviceInCheckoutSummary(page, title) {
  return (
    (await page.locator(".pay-summary-includes-list").locator("li", { hasText: title }).count()) > 0
  );
}

async function removeServiceIfPresent(page, title) {
  const row = page
    .locator(".spr-service")
    .filter({ has: page.locator(".spr-service__title", { hasText: title }) });
  const remove = row.getByRole("button", { name: "Remove" });
  if ((await remove.count()) > 0) {
    await remove.first().click();
    await page.waitForTimeout(700);
  }
}

async function addServiceFromCatalog(page, title) {
  if ((await serviceInIncludedList(page, title)) || (await serviceInCheckoutSummary(page, title))) {
    return;
  }

  const menuSection = page.locator("#spr-menu-title").locator("..");
  const row = menuSection
    .locator(".spr-menu__item")
    .filter({ has: page.locator(".spr-menu__title", { hasText: title }) })
    .first();
  const add = row.getByRole("button", { name: "+ Add to plan" });
  if ((await add.count()) === 0) {
    throw new Error(`No catalog add button for "${title}"`);
  }
  await add.scrollIntoViewIfNeeded();
  await add.click();
  await page.waitForTimeout(800);
}

async function ensureTargetPlan(page) {
  await page.waitForSelector("#spr-included-title", { timeout: 30_000 });
  await page.waitForTimeout(800);

  for (const title of UNWANTED_IN_PLAN) {
    await removeServiceIfPresent(page, title);
  }

  for (const title of TARGET_SERVICE_TITLES) {
    await addServiceFromCatalog(page, title);
  }
}

async function fillProjectDetails(page) {
  await page.locator("#workingOn").fill("Summer pastry launch");
  await page.locator("#mainOffer").fill("New seasonal menu");
  await page.locator("#importantDates").fill("July 4 weekend");
  await page.locator("#callToAction").fill("Visit the bakery");
  await page.locator("#destinationLink").fill("https://tagiabakery.example");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForSelector("#brandOutdatedParts", { timeout: 15_000 });
  await page.locator("#brandOutdatedParts").fill("Old chalkboard logo");
  await page.locator("#brandPartsToKeep").fill("Keep the teal accent");
  await page
    .getByRole("button", { name: "Logo" })
    .locator("..")
    .locator("input[type=file]")
    .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: LOGO_PNG });
  await page.waitForSelector(".pd-upload__item", { timeout: 10_000 });
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForSelector("#socialPlatforms", { timeout: 15_000 });
  await page.locator("#socialPlatforms").fill("Instagram, Facebook");
  await page.locator("#socialAccountLinks").fill("@tagiabakery");
  await page.locator("#emailPlatform").fill("Mailchimp");
  await page.locator("#emailSender").fill("hello@tagiabakery.example");
  await page.locator("#emailSendTiming").fill("Tuesday mornings");
  await page.locator("#emailListReady").selectOption("yes");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForSelector("#primaryApproverName", { timeout: 15_000 });
  await page.locator("#primaryApproverName").fill("Tagia Owner");
  await page.locator("#primaryApproverEmail").fill("tagia@example.com");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForSelector(".pd-review", { timeout: 15_000 });
  await page.getByRole("button", { name: "Submit Project Details" }).click();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  let campaignId = null;
  let shot = null;

  try {
    // Step 1 — Discovery-complete seed (no momentum bundle)
    await clearStudioState(page);
    campaignId = crypto.randomUUID();
    await seedDiscoveryCampaign(page, campaignId);
    const seededId = await readCampaignId(page);
    if (seededId !== campaignId) throw new Error("Campaign id mismatch after seed");
    record("1. Discovery seed", true, `campaignId=${campaignId}`);

    // Step 2 — Project Summary + plan customization
    await page.goto(`${BASE}/project-summary`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForSelector(".project-summary-page", { timeout: 30_000 });
    await page.waitForSelector("#ps-recommend-title", { timeout: 30_000 });
    await assertJourneyCopy(page, ".project-summary-page", "Project Summary");
    await ensureTargetPlan(page);
    const includedTitles = await page
      .locator("#spr-included-title")
      .locator("..")
      .locator(".spr-service__title")
      .allTextContents();
    const checkoutTitles = await page.locator(".pay-summary-includes-list li").allTextContents();
    const planTitles = [...includedTitles, ...checkoutTitles];
    for (const title of TARGET_SERVICE_TITLES) {
      if (!planTitles.some((text) => text.includes(title))) {
        throw new Error(`Missing "${title}" in plan (included + checkout)`);
      }
    }
    shot = await screenshot(page, "02-project-summary-plan.png");
    record("2. Project Summary plan", true, TARGET_SERVICE_TITLES.join(", "), shot);

    // Step 3 — Acknowledgment + sandbox payment
    await page.locator('input[name="terms"]').check();
    await page.locator(".pay-sandbox__btn").click();
    await page.waitForURL(/\/project-details/, { timeout: 30_000 });
    const afterPayId = await readCampaignId(page);
    if (afterPayId !== campaignId) throw new Error("Campaign id changed after payment");
    const paidRaw = await page.evaluate((key) => localStorage.getItem(key), CAMPAIGN_KEY);
    const paidCampaign = JSON.parse(paidRaw);
    if (!paidCampaign.paymentReceivedAt) throw new Error("paymentReceivedAt not set");
    if (paidCampaign.packageId === "momentum" || paidCampaign.packageId === "spark") {
      throw new Error(`payment assigned bundle tier: ${paidCampaign.packageId}`);
    }
    shot = await screenshot(page, "03-after-payment-project-details.png");
    record("3. Sandbox payment", true, "PAYMENT_RECEIVED", shot);

    // Step 4 — Project Details submit
    await page.waitForSelector(".pd-workspace", { timeout: 20_000 });
    await fillProjectDetails(page);
    await page.waitForURL(/\/studio-board/, { timeout: 30_000 });
    const afterDetailsId = await readCampaignId(page);
    if (afterDetailsId !== campaignId) throw new Error("Campaign id changed after Project Details");
    shot = await screenshot(page, "04-studio-board-after-details.png");
    record("4. Project Details submit", true, "BUILDING_CONCEPTS", shot);

    // Step 5 — Studio Board
    await page.waitForSelector(".sb", { timeout: 30_000 });
    await assertJourneyCopy(page, ".sb-card--current", "Studio Board");
    await page.waitForFunction(
      () => {
        const raw = localStorage.getItem("studio-squishy:current-campaign");
        if (!raw) return false;
        const campaign = JSON.parse(raw);
        return campaign.campaignStatus === "READY_FOR_REVIEW" || campaign.campaignStatus === "BUILDING_CONCEPTS";
      },
      { timeout: 20_000 },
    );
    shot = await screenshot(page, "05-studio-board.png");
    record("5. Studio Board", true, await readCampaignServices(page).then((ids) => ids.join(", ") || "concepts pending"), shot);

    // Step 6 — Project Record drawer over board
    await page.goto(`${BASE}/studio-board?record=open`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForSelector(".sb-record-drawer__panel", { timeout: 15_000 });
    await page.waitForSelector(".sb-card--current", { timeout: 15_000 });
    const drawerVisible = await page.locator(".sb-record-drawer__panel").isVisible();
    const boardVisible = await page.locator(".sb-card--current").isVisible();
    if (!drawerVisible || !boardVisible) throw new Error("Record drawer or board not visible");
    await assertJourneyCopy(page, ".sb-record-drawer__panel", "Project Record");
    shot = await screenshot(page, "06-record-drawer-over-board.png");
    record("6. Project Record drawer", true, "board visible behind drawer", shot);

    // Step 7 — Feedback Studio
    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForSelector(".fs-picker__grid", { timeout: 30_000 });
    await assertJourneyCopy(page, ".fs-page", "Feedback Studio");
    const pickerText = (await page.locator(".fs-picker").textContent()) ?? "";
    for (const forbidden of FORBIDDEN_SCOPE) {
      if (pickerText.includes(forbidden)) {
        throw new Error(`Feedback Studio scope includes forbidden "${forbidden}"`);
      }
    }
    shot = await screenshot(page, "07-feedback-studio-picker.png");
    record("7. Feedback Studio", true, "three directions", shot);

    // Step 8 — Select direction → Final Delivery
    await page.goto(`${BASE}/feedback-studio?concept=B`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForSelector(".fs-review--workspace", { timeout: 20_000 });
    await page.getByRole("button", { name: "Choose this direction" }).click();
    await page.waitForURL(/\/deliverables/, { timeout: 20_000 });
    await page.waitForSelector(".fd-deliverables__grid", { timeout: 20_000 });
    const deliveryText = (await page.locator(".fd-deliverables__grid").textContent()) ?? "";
    for (const forbidden of FORBIDDEN_SCOPE) {
      if (deliveryText.includes(forbidden)) {
        throw new Error(`Final Delivery includes forbidden "${forbidden}"`);
      }
    }
    if (!deliveryText.includes("Brand") && !deliveryText.includes("Social") && !deliveryText.includes("Email")) {
      throw new Error("Final Delivery missing Brand/Social/Email sections");
    }
    const finalId = await readCampaignId(page);
    if (finalId !== campaignId) throw new Error("Campaign id changed at Final Delivery");
    const serviceIds = await readCampaignServices(page);
    if (!serviceIds.includes("bf-001") || !serviceIds.includes("sm-001") || !serviceIds.includes("em-001")) {
      throw new Error(`Expected bf/sm/em in approved plan, got ${serviceIds.join(", ")}`);
    }
    shot = await screenshot(page, "08-final-delivery.png");
    record("8. Final Delivery", true, "DELIVERED · Brand/Social/Email only", shot);
  } catch (error) {
    record("ABORT", false, error instanceof Error ? error.message : String(error), shot);
    throw error;
  } finally {
    const report = {
      ranAt: new Date().toISOString(),
      baseUrl: BASE,
      campaignId,
      steps,
      passed: steps.filter((s) => s.ok).length,
      failed: steps.filter((s) => !s.ok).length,
    };
    await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }

  console.log(`\nReport: ${path.join(OUT_DIR, "report.json")}`);
  console.log(`Screenshots: ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
