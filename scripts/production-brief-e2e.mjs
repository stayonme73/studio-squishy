/**
 * Production Brief Wiring — E2E for four V2 RTU paths.
 * Run: node scripts/production-brief-e2e.mjs
 * Requires dev server: npm run dev (localhost:3000)
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ROUTE_MAP_E2E_CAMPAIGN_KEY,
  clickChooseThisJob,
  clickTestPayment,
  fillRouteMapIntake,
  intakeTitleMatches,
  loginBrowserContext,
  readRouteMapIntakeTitle,
  submitRouteMapIntake,
  waitForRouteMapIntake,
  waitForStudioBoardRecord,
  isSocialPostsIntake,
} from "./lib/route-map-e2e-shared.mjs";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/production-brief-wiring");
const REPORT_PATH = path.join(OUT_DIR, "e2e-report.md");
const CAMPAIGN_KEY = ROUTE_MAP_E2E_CAMPAIGN_KEY;

const ROAD = {
  i75: "Get My Business Started",
  i20: "Promote Something Now",
  update: "Update What I Already Have",
  random: "I Know What I Need",
};

const PATHS = [
  {
    id: "v2-rtu-flyer",
    label: "Flyer",
    road: ROAD.random,
    jobName: "Make Me a Flyer",
    intakeTitle: "Flyer Intake",
    clientMarker: "Flyer Intake",
    productionMarker: "Purpose",
    includePostPublish: false,
  },
  {
    id: "v2-rtu-social-posts",
    label: "Social Posts + Post/Publish",
    road: ROAD.random,
    jobName: "Make My Social Media Posts",
    intakeTitle: "Social Media Posts Intake",
    clientMarker: "Social Media Posts Intake",
    productionMarker: "Publish platform",
    includePostPublish: true,
  },
  {
    id: "v2-rtu-email-kit",
    label: "Email Kit",
    road: ROAD.i20,
    jobName: "Make My Email Campaign Kit",
    intakeTitle: "Email Campaign Kit Intake",
    clientMarker: "Email Campaign Kit Intake",
    productionMarker: "Client sending responsibilities",
    includePostPublish: false,
  },
  {
    id: "v2-rtu-short-video",
    label: "Short Video",
    road: ROAD.random,
    jobName: "Make Me a Short Video",
    intakeTitle: "Short Video Intake",
    clientMarker: "Short Video Intake",
    productionMarker: "Short video",
    includePostPublish: false,
  },
];

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

async function selectRoad(page, customerLabel) {
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

async function fillRequiredFields(page, pathConfig) {
  if (isSocialPostsIntake(pathConfig)) {
    await fillRouteMapIntake(page, pathConfig);
    return;
  }
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
      await textarea.fill("E2E production brief wiring value");
    } else if (await input.count()) {
      await input.fill("E2E production brief wiring value");
    }
  }
}

async function runPath(page, pathConfig) {
  const result = {
    id: pathConfig.id,
    label: pathConfig.label,
    checkout: false,
    intake: false,
    campaignRecord: false,
    productionBrief: false,
    studioBoard: false,
    error: null,
  };

  try {
    await clearCampaign(page);
    await gotoRouteMap(page);
    await selectRoad(page, pathConfig.road);
    await page.getByRole("button", { name: new RegExp(pathConfig.jobName.slice(0, 20), "i") }).click();
    await page.waitForSelector(".route-map-job-card", { timeout: 15000 });
    await clickChooseThisJob(page);
    await page.waitForSelector(".route-map-checkout-addon, .pay-paper-card", { timeout: 15000 });

    if (pathConfig.includePostPublish) {
      const addonCheckbox = page.locator(".route-map-checkout-addon input[type='checkbox']");
      if (await addonCheckbox.count()) await addonCheckbox.check();
    }

    result.checkout = true;

    await clickTestPayment(page);

    await waitForRouteMapIntake(page);
    const intakeTitle = await readRouteMapIntakeTitle(page);
    result.intake = intakeTitleMatches(pathConfig, intakeTitle);

    await fillRequiredFields(page, pathConfig);
    await submitRouteMapIntake(page, pathConfig);
    await waitForStudioBoardRecord(page);

    const clientSummary = page.locator('[data-testid="route-map-client-summary"]');
    const clientText = await clientSummary.innerText();
    if (isSocialPostsIntake(pathConfig)) {
      result.campaignRecord =
        clientText.toLowerCase().includes("social") && clientText.includes("Instagram");
    } else {
      result.campaignRecord =
        clientText.includes("E2E production brief wiring value") &&
        clientText.toLowerCase().includes(pathConfig.intakeTitle.replace(" Intake", "").toLowerCase());
    }

    const status = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw).campaignStatus : null;
    }, CAMPAIGN_KEY);
    result.studioBoard = status === "BUILDING_CONCEPTS";

    await page.goto(`${BASE}/studio-board?productionBrief=open`);
    await page.waitForTimeout(800);
    const productionBrief = page.locator('[data-testid="route-map-production-brief"]');
    result.productionBrief = (await productionBrief.count()) > 0;
    if (result.productionBrief) {
      const briefText = await productionBrief.innerText();
      if (isSocialPostsIntake(pathConfig)) {
        result.productionBrief =
          briefText.includes("Instagram") &&
          briefText.toLowerCase().includes("social posts") &&
          (briefText.toLowerCase().includes("post / publish") ||
            briefText.toLowerCase().includes("add-on"));
      } else if (
        !briefText.toLowerCase().includes(pathConfig.productionMarker.toLowerCase().split(" ")[0])
      ) {
        result.productionBrief = false;
      }
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await loginBrowserContext(context, BASE);
  const page = await context.newPage();

  const results = [];
  for (const pathConfig of PATHS) {
    console.log(`Running ${pathConfig.label}...`);
    const result = await runPath(page, pathConfig);
    results.push(result);
    const pass =
      result.checkout &&
      result.intake &&
      result.campaignRecord &&
      result.productionBrief &&
      result.studioBoard;
    console.log(`  ${pass ? "PASS" : "FAIL"}`, result);
  }

  await browser.close();

  const lines = [
    "# Production Brief Wiring — E2E Report",
    "",
    `Date: ${new Date().toISOString()}`,
    `Base URL: ${BASE}`,
    "",
    "| Path | Checkout | Intake | Campaign Record | Production Brief | Studio Board | Overall |",
    "|------|----------|--------|-----------------|------------------|--------------|---------|",
  ];

  for (const r of results) {
    const overall =
      r.checkout && r.intake && r.campaignRecord && r.productionBrief && r.studioBoard;
    lines.push(
      `| ${r.label} | ${r.checkout ? "pass" : "fail"} | ${r.intake ? "pass" : "fail"} | ${r.campaignRecord ? "pass" : "fail"} | ${r.productionBrief ? "pass" : "fail"} | ${r.studioBoard ? "pass" : "fail"} | **${overall ? "PASS" : "FAIL"}** |`,
    );
    if (r.error) lines.push(`| | Error: ${r.error} | | | | | |`);
  }

  lines.push("", "## Notes", "- Campaign Record verifies client-facing `[data-testid=route-map-client-summary]`.");
  lines.push("- Production Brief verifies internal `[data-testid=route-map-production-brief]` via `?productionBrief=open` (development only).");
  lines.push("- Studio Board status must be `BUILDING_CONCEPTS` after intake submit.");

  await writeFile(REPORT_PATH, lines.join("\n"), "utf8");
  console.log(`\nReport: ${REPORT_PATH}`);

  const allPass = results.every(
    (r) => r.checkout && r.intake && r.campaignRecord && r.productionBrief && r.studioBoard,
  );
  if (!allPass) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
