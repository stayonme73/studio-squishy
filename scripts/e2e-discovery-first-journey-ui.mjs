/**
 * Discovery-first customer journey — full UI Playwright E2E (no campaign/plan/payment seeding).
 * Requires dev server: npm run dev
 * Run: node scripts/e2e-discovery-first-journey-ui.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/e2e-discovery-first-journey-ui");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

const BUSINESS_DELIM = "\n---\n";
const TARGET_SERVICE_TITLES = [
  "Brand Identity Refresh",
  "Social Media Launch Set",
  "Email Campaign Build",
];
const FORBIDDEN_SCOPE = ["SMS", "Video Script", "Content Calendar", "Promotion Pack"];
const UNWANTED_IN_PLAN = [
  "Promotion Pack",
  "Marketing Copywriting Project",
  "Monthly Social Media Content Support",
];
const BUNDLE_RE = /\b(Spark Plan|Momentum Plan|Growth Plan)\b/i;
const DRAFT_ROOM_RE = /\bDraft Room\b/i;

/** Required discovery tiles — matches Owner QA Green-and-Lean answers. */
const DISCOVERY_TILE_ANSWERS = {
  "your-business": {
    name: "Tagia Bakery",
    offer: "Fresh pastries and coffee daily",
  },
  "your-situation": "Promoting an offer, event, sale, or launch",
  "your-challenge": "I need help promoting something",
  "your-current-tools": ["Social media accounts"],
  "your-focus": "Promote an offer, event, or launch",
  "success-looks-like": ["More consistent social media visibility"],
  "whats-slowing-you-down": ["I am not visible enough online"],
};

const LOGO_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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

async function readCampaignField(page, field) {
  return page.evaluate(
    ([key, pathField]) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw)[pathField] ?? null;
    },
    [CAMPAIGN_KEY, field],
  );
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

async function assertNoBundleWording(page, stepName) {
  const body = (await page.locator("body").textContent()) ?? "";
  if (BUNDLE_RE.test(body)) {
    throw new Error(`${stepName}: bundle tier wording in page body`);
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

async function openDiscoveryTile(page, tileId) {
  const hit = page.locator(`.bds-tile-hit[data-tile-id="${tileId}"]`);
  await hit.waitFor({ state: "visible", timeout: 15_000 });
  await hit.scrollIntoViewIfNeeded();
  await hit.click();
  await page.waitForSelector(`.bds-sheet[data-tile-id="${tileId}"]`, { timeout: 10_000 });
  await page.waitForTimeout(650);
}

async function fillDiscoveryBusinessTile(page) {
  const sheet = page.locator('.bds-sheet[data-tile-id="your-business"]');
  const nameInput = sheet.locator("input.bds-sheet__input").first();
  const offerInput = sheet.locator("input.bds-sheet__input").nth(1);
  await nameInput.click();
  await nameInput.fill(DISCOVERY_TILE_ANSWERS["your-business"].name);
  await offerInput.click();
  await offerInput.fill(DISCOVERY_TILE_ANSWERS["your-business"].offer);
  await page.waitForTimeout(200);
}

async function clickDiscoveryChip(page, tileId, label) {
  const sheet = page.locator(`.bds-sheet[data-tile-id="${tileId}"]`);
  const chips = sheet.locator(".bds-sheet__chip");
  const count = await chips.count();
  let clicked = false;
  for (let index = 0; index < count; index += 1) {
    const chip = chips.nth(index);
    const text = ((await chip.textContent()) ?? "").trim();
    if (text !== label) continue;
    await chip.scrollIntoViewIfNeeded();
    await chip.click();
    clicked = true;
    break;
  }
  if (!clicked) {
    throw new Error(`Discovery chip not found on ${tileId}: "${label}"`);
  }
  await page.waitForTimeout(250);
}

async function submitDiscoveryTile(page, tileId) {
  const sheet = page.locator(`.bds-sheet[data-tile-id="${tileId}"]`);
  const done = sheet.getByRole("button", { name: "Done" });
  try {
    await page.waitForFunction(
      (tid) => {
        const button = document.querySelector(
          `.bds-sheet[data-tile-id="${tid}"] button.bds-sheet__btn--primary`,
        );
        return button instanceof HTMLButtonElement && !button.disabled;
      },
      tileId,
      { timeout: 15_000 },
    );
  } catch (error) {
    const disabled = await done.isDisabled();
    throw new Error(`Done still disabled for tile "${tileId}" (disabled=${disabled})`);
  }
  await done.click();
  await page.waitForSelector(`.bds-sheet[data-tile-id="${tileId}"]`, {
    state: "detached",
    timeout: 15_000,
  });
  await page.waitForTimeout(350);
}

async function fillDiscoveryTiles(page) {
  await page.goto(`${BASE}/business-discovery-studio`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await page.waitForSelector(".bds-scene", { timeout: 30_000 });

  // Your Business — name + offer text fields
  await openDiscoveryTile(page, "your-business");
  await fillDiscoveryBusinessTile(page);
  await submitDiscoveryTile(page, "your-business");

  // Single-select tiles
  for (const tileId of ["your-situation", "your-challenge", "your-focus"]) {
    await openDiscoveryTile(page, tileId);
    await clickDiscoveryChip(page, tileId, DISCOVERY_TILE_ANSWERS[tileId]);
    await submitDiscoveryTile(page, tileId);
  }

  // Multiselect tiles
  for (const tileId of ["your-current-tools", "success-looks-like", "whats-slowing-you-down"]) {
    await openDiscoveryTile(page, tileId);
    for (const label of DISCOVERY_TILE_ANSWERS[tileId]) {
      await clickDiscoveryChip(page, tileId, label);
    }
    await submitDiscoveryTile(page, tileId);
  }

  // Submit discovery
  await openDiscoveryTile(page, "submit-project");
  const submitSheet = page.locator('.bds-sheet[data-tile-id="submit-project"]');
  await submitSheet.getByRole("button", { name: "Submit" }).click();
}

async function waitForDiscoverySplitPreview(page) {
  await page.waitForSelector(".bds-scene--split", { timeout: 30_000 });
  await page.waitForSelector('[data-panel-phase="reviewing"]', { timeout: 10_000 });
  await page.waitForSelector('[data-panel-phase="summary"]', { timeout: 15_000 });
  await page.waitForSelector(".bds-summary-panel__continue", { timeout: 10_000 });
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
    // Step 1 — Clear state + start Discovery UI
    await clearStudioState(page);
    record("1. Clear browser state", true, "no studio-squishy keys");

    // Step 2 — Fill all required discovery tiles + submit
    await fillDiscoveryTiles(page);
    await waitForDiscoverySplitPreview(page);
    campaignId = await readCampaignId(page);
    if (!campaignId) throw new Error("No campaign created after discovery submit");
    const packageIdAfterDiscovery = await readCampaignField(page, "packageId");
    if (packageIdAfterDiscovery === "spark" || packageIdAfterDiscovery === "momentum") {
      throw new Error(`Discovery assigned bundle tier: ${packageIdAfterDiscovery}`);
    }
    await assertNoBundleWording(page, "Discovery split preview");
    shot = await screenshot(page, "02-discovery-split-preview.png");
    record("2. Discovery tiles + split preview", true, `campaignId=${campaignId}`, shot);

    // Step 3 — Continue to Project Summary
    await page.locator(".bds-summary-panel__continue").click();
    await page.waitForURL(/\/project-summary/, { timeout: 30_000 });
    await page.waitForSelector(".project-summary-page", { timeout: 30_000 });
    await assertJourneyCopy(page, ".project-summary-page", "Project Summary");
    const summaryId = await readCampaignId(page);
    if (summaryId !== campaignId) throw new Error("Campaign id changed on Project Summary");
    shot = await screenshot(page, "03-project-summary.png");
    record("3. Project Summary", true, "same campaign id", shot);

    // Step 4 — Customize plan to bf/sm/em only
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
    shot = await screenshot(page, "04-project-summary-plan.png");
    record("4. Plan customization", true, TARGET_SERVICE_TITLES.join(", "), shot);

    // Step 5 — Acknowledgment + sandbox payment
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
    if (paidCampaign.packageLabel !== "Custom Studio Plan") {
      throw new Error(`expected Custom Studio Plan label, got ${paidCampaign.packageLabel}`);
    }
    shot = await screenshot(page, "05-after-payment-project-details.png");
    record("5. Sandbox payment", true, "PAYMENT_RECEIVED · custom-studio-plan", shot);

    // Step 6 — Project Details wizard
    await page.waitForSelector(".pd-workspace", { timeout: 20_000 });
    await fillProjectDetails(page);
    await page.waitForURL(/\/studio-board/, { timeout: 30_000 });
    const afterDetailsId = await readCampaignId(page);
    if (afterDetailsId !== campaignId) throw new Error("Campaign id changed after Project Details");
    shot = await screenshot(page, "06-studio-board-after-details.png");
    record("6. Project Details submit", true, "BUILDING_CONCEPTS", shot);

    // Step 7 — Studio Board
    await page.waitForSelector(".sb", { timeout: 30_000 });
    await assertJourneyCopy(page, ".sb-card--current", "Studio Board");
    await page.waitForFunction(
      () => {
        const raw = localStorage.getItem("studio-squishy:current-campaign");
        if (!raw) return false;
        const campaign = JSON.parse(raw);
        return (
          campaign.campaignStatus === "READY_FOR_REVIEW" ||
          campaign.campaignStatus === "BUILDING_CONCEPTS"
        );
      },
      { timeout: 20_000 },
    );
    shot = await screenshot(page, "07-studio-board.png");
    record(
      "7. Studio Board",
      true,
      (await readCampaignServices(page)).join(", ") || "concepts pending",
      shot,
    );

    // Step 8 — Project Record drawer over board
    await page.goto(`${BASE}/studio-board?record=open`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForSelector(".sb-record-drawer__panel", { timeout: 15_000 });
    await page.waitForSelector(".sb-card--current", { timeout: 15_000 });
    const drawerVisible = await page.locator(".sb-record-drawer__panel").isVisible();
    const boardVisible = await page.locator(".sb-card--current").isVisible();
    if (!drawerVisible || !boardVisible) throw new Error("Record drawer or board not visible");
    await assertJourneyCopy(page, ".sb-record-drawer__panel", "Project Record");
    shot = await screenshot(page, "08-record-drawer-over-board.png");
    record("8. Project Record drawer", true, "board visible behind drawer", shot);

    // Step 9 — Feedback Studio
    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForSelector(".fs-picker__grid", { timeout: 30_000 });
    await assertJourneyCopy(page, ".fs-page", "Feedback Studio");
    const pickerText = (await page.locator(".fs-picker").textContent()) ?? "";
    for (const forbidden of FORBIDDEN_SCOPE) {
      if (pickerText.includes(forbidden)) {
        throw new Error(`Feedback Studio scope includes forbidden "${forbidden}"`);
      }
    }
    shot = await screenshot(page, "09-feedback-studio-picker.png");
    record("9. Feedback Studio", true, "three directions", shot);

    // Step 10 — Select direction → Final Delivery
    await page.goto(`${BASE}/feedback-studio?concept=B`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
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
    if (
      !deliveryText.includes("Brand") &&
      !deliveryText.includes("Social") &&
      !deliveryText.includes("Email")
    ) {
      throw new Error("Final Delivery missing Brand/Social/Email sections");
    }
    const finalId = await readCampaignId(page);
    if (finalId !== campaignId) throw new Error("Campaign id changed at Final Delivery");
    const serviceIds = await readCampaignServices(page);
    if (
      !serviceIds.includes("bf-001") ||
      !serviceIds.includes("sm-001") ||
      !serviceIds.includes("em-001")
    ) {
      throw new Error(`Expected bf/sm/em in approved plan, got ${serviceIds.join(", ")}`);
    }
    await assertNoBundleWording(page, "Final Delivery");
    shot = await screenshot(page, "10-final-delivery.png");
    record("10. Final Delivery", true, "DELIVERED · Brand/Social/Email only", shot);
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
