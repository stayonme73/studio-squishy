/**
 * Route Map V2 wiring — lane panel screenshots + two-path E2E verification.
 * Run: node scripts/capture-route-map-v2-wiring.mjs
 * Requires dev server at localhost:3000.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/route-map-v2-wiring");
const REPORT_PATH = path.join(OUT_DIR, "e2e-report.md");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

const ROAD_LABELS = {
  i75: "Get My Business Started",
  i20: "Promote Something Now",
  update: "Update What I Already Have",
  random: "I Know What I Need",
};

async function clearCampaign(page) {
  await page.goto(BASE);
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
  }, CAMPAIGN_KEY);
}

async function gotoRouteMap(page) {
  await page.goto(`${BASE}/route-map`);
  await page.waitForSelector(".route-map-page--immersive", { timeout: 30000 });
  await page.waitForTimeout(400);
}

async function selectRoadDesktop(page, customerLabel) {
  const chooseCard = page.locator(".route-map-choose-card", { hasText: customerLabel });
  if (await chooseCard.count()) {
    await chooseCard.first().click();
  } else {
    const hotspot = page.locator(".route-map-board__hotspot", {
      has: page.locator(`[aria-label*="${customerLabel}"]`),
    });
    await hotspot.first().click();
  }
  await page.waitForSelector(".route-map-route-panel", { timeout: 25000 });
  await page.waitForTimeout(350);
}

async function capture(page, filename, fullPage = false) {
  const filePath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: filePath, fullPage });
  console.log(`  ✓ ${filename}`);
  return filePath;
}

async function assertPanelContainsJob(page, jobName) {
  const panel = page.locator(".route-map-route-panel");
  await panel.getByText(jobName, { exact: false }).first().waitFor({ timeout: 10000 });
}

async function assertPanelExcludesJob(page, jobName) {
  const count = await page.locator(".route-map-route-panel").getByText(jobName, { exact: false }).count();
  if (count > 0) throw new Error(`Panel should not include retired job: ${jobName}`);
}

async function captureLanePanels(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await clearCampaign(page);
  await gotoRouteMap(page);
  await capture(page, "00-desktop-map-highway-labels.png");

  await selectRoadDesktop(page, ROAD_LABELS.i75);
  await assertPanelContainsJob(page, "Make Me a Flyer");
  await assertPanelContainsJob(page, "Make Me a Social Profile Setup Kit");
  await assertPanelExcludesJob(page, "Make and Post My Social Media Promotion");
  await assertPanelExcludesJob(page, "Make My Email Campaign Kit");
  await capture(page, "01-desktop-route-panel-i75.png");

  await gotoRouteMap(page);
  await selectRoadDesktop(page, ROAD_LABELS.i20);
  await assertPanelContainsJob(page, "Make My Email Campaign Kit");
  await assertPanelContainsJob(page, "Make My Text Message Campaign Kit");
  await capture(page, "02-desktop-route-panel-i20.png");

  await gotoRouteMap(page);
  await selectRoadDesktop(page, ROAD_LABELS.update);
  await assertPanelContainsJob(page, "Update My Existing Promotion");
  await assertPanelContainsJob(page, "Make Me a Social Profile Update Kit");
  await assertPanelExcludesJob(page, "Make My Email Campaign Kit");
  await capture(page, "03-desktop-route-panel-update-exit.png");

  await gotoRouteMap(page);
  await selectRoadDesktop(page, ROAD_LABELS.random);
  await assertPanelContainsJob(page, "Make My Social Media Posts");
  await assertPanelContainsJob(page, "Make Me a Short Video");
  await assertPanelExcludesJob(page, "Make and Post My Social Media Promotion");
  await capture(page, "04-desktop-random-exit-shelf.png");

  await context.close();
}

async function captureMobileHighwayLabels(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await context.newPage();
  await clearCampaign(page);
  await gotoRouteMap(page);
  await page.waitForSelector(".route-map-mobile-scene .route-map-highway-marker", {
    state: "attached",
    timeout: 15000,
  });
  await page.waitForTimeout(500);
  await capture(page, "00-mobile-map-highway-labels.png", false);
  await context.close();
}

async function openJobCheckout(page, jobName, roadLabel) {
  await gotoRouteMap(page);
  await selectRoadDesktop(page, roadLabel);
  await page.getByRole("button", { name: new RegExp(jobName.slice(0, 24), "i") }).click();
  await page.waitForSelector(".route-map-job-card", { timeout: 15000 });
  await page.getByRole("button", { name: /choose this job/i }).click();
  await page.waitForSelector(".route-map-checkout-addon, .pay-paper-card", { timeout: 15000 });
  await page.waitForTimeout(350);
}

async function captureV2PostPublishAddon(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await clearCampaign(page);
  await openJobCheckout(page, "Make My Social Media Posts", ROAD_LABELS.random);
  const addon = page.locator(".route-map-checkout-addon");
  await addon.waitFor({ timeout: 10000 });
  await capture(page, "07-v2-job-post-publish-addon.png", false);
  await context.close();
}

async function captureV1RmJ002JobFlow(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await clearCampaign(page);
  await gotoRouteMap(page);
  await selectRoadDesktop(page, ROAD_LABELS.i75);
  await page.getByRole("button", { name: /Make Me a Social Profile Setup Kit/i }).click();
  await page.waitForSelector(".route-map-job-card", { timeout: 15000 });
  await page.waitForTimeout(350);
  await capture(page, "08-v1-rm-j002-job-flow.png", false);
  await context.close();
}

async function fillRequiredFields(page) {
  const fields = page.locator(".route-map-intake__field");
  const count = await fields.count();
  for (let i = 0; i < count; i += 1) {
    const field = fields.nth(i);
    const select = field.locator("select");
    const textarea = field.locator("textarea");
    const input = field.locator('input[type="text"]');
    if (await select.count()) {
      await select.selectOption({ index: 1 });
    } else if (await textarea.count()) {
      await textarea.fill("E2E verification answer");
    } else if (await input.count()) {
      await input.fill("E2E verification");
    }
  }
}

async function runCheckoutIntakeBoard(page, jobName, roadLabel) {
  await gotoRouteMap(page);
  await selectRoadDesktop(page, roadLabel);
  await page.getByRole("button", { name: new RegExp(jobName.slice(0, 20), "i") }).click();
  await page.waitForSelector(".route-map-job-card", { timeout: 15000 });
  await page.getByRole("button", { name: /choose this job/i }).click();
  await page.waitForSelector(".pay-paper-card", { timeout: 15000 });

  const terms = page.locator('input[name="terms"]');
  if (await terms.count()) await terms.check();

  const sandbox = page.getByRole("button", { name: /test payment|sandbox/i });
  if (await sandbox.count()) {
    await sandbox.first().click();
  } else {
    throw new Error("Sandbox payment button not found — cannot complete E2E without mock payment");
  }

  await page.waitForSelector(".route-map-intake", { timeout: 20000 });
  await fillRequiredFields(page);
  await page.getByRole("button", { name: /submit intake/i }).click();
  await page.waitForURL(/studio-board/, { timeout: 30000 });
  await page.waitForTimeout(800);

  const statusText = await page.locator("body").innerText();
  const building = /building concepts|concepts in progress/i.test(statusText);
  return building;
}

async function runE2E(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await clearCampaign(page);

  const results = [];

  try {
    const v2Pass = await runCheckoutIntakeBoard(
      page,
      "Make Me a Flyer",
      ROAD_LABELS.random,
    );
    results.push({
      path: "V2",
      job: "v2-rtu-flyer / Make Me a Flyer",
      pass: v2Pass,
      notes: v2Pass
        ? "checkout → intake → Studio Board shows Building Concepts"
        : "Board status did not show Building Concepts after intake",
    });
  } catch (error) {
    results.push({
      path: "V2",
      job: "v2-rtu-flyer / Make Me a Flyer",
      pass: false,
      notes: error instanceof Error ? error.message : String(error),
    });
  }

  await clearCampaign(page);

  try {
    const v1Pass = await runCheckoutIntakeBoard(
      page,
      "Make Me a Social Profile Setup Kit",
      ROAD_LABELS.i75,
    );
    results.push({
      path: "Continuing V1",
      job: "rm-j002 / Make Me a Social Profile Setup Kit…",
      pass: v1Pass,
      notes: v1Pass
        ? "checkout → intake → Studio Board shows Building Concepts"
        : "Board status did not show Building Concepts after intake",
    });
  } catch (error) {
    results.push({
      path: "Continuing V1",
      job: "rm-j002 / Make Me a Social Profile Setup Kit…",
      pass: false,
      notes: error instanceof Error ? error.message : String(error),
    });
  }

  await context.close();
  return results;
}

function formatReport(results) {
  const lines = [
    "# Route Map V2 wiring — E2E report",
    "",
    `Base URL: ${BASE}/route-map`,
    "",
    "| Path | Job | Pass/Fail | Notes |",
    "|------|-----|-----------|-------|",
  ];
  for (const row of results) {
    lines.push(
      `| ${row.path} | ${row.job} | ${row.pass ? "Pass" : "Fail"} | ${row.notes.replace(/\|/g, "\\|")} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  console.log("Capturing Route Map V2 wiring screenshots…");
  await captureLanePanels(browser);
  await captureMobileHighwayLabels(browser);
  await captureV2PostPublishAddon(browser);
  await captureV1RmJ002JobFlow(browser);

  console.log("Running two-path E2E verification…");
  const results = await runE2E(browser);
  const report = formatReport(results);
  await writeFile(REPORT_PATH, report, "utf8");
  console.log(report);

  await browser.close();
  console.log(`Done → ${OUT_DIR}`);

  if (results.some((row) => !row.pass)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
