/**
 * Capture The Studio Test Batch 1 screenshots.
 *
 * Requires a running app server at VERIFY_BASE_URL (default http://localhost:3000).
 *
 * Usage:
 *   node scripts/capture-studio-test-batch-1.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

import {
  CAMPAIGN_ID,
  OUT_DIR,
  setupStudioTestBatch1,
} from "./setup-studio-test-batch-1.mjs";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const SOCIAL_JOB_ID = `${CAMPAIGN_ID}:v2-rtu-social-posts`;
const FLYER_JOB_ID = `${CAMPAIGN_ID}:v2-rtu-flyer`;
const SOCIAL_STRATEGY_TASK_ID = "v2-rtu-social-posts:strategy_content_direction";

const screenshots = {
  studioBoardProjectRecord: path.join(OUT_DIR, "01-studio-board-project-record.png"),
  ownerConsoleMultiJob: path.join(OUT_DIR, "02-owner-console-multi-job.png"),
  productionWorkspace: path.join(OUT_DIR, "03-production-workspace-social-posts.png"),
  workPacketTeamOffice: path.join(OUT_DIR, "04-work-packet-team-office.png"),
  materialsRequirements: path.join(OUT_DIR, "05-materials-requirements.png"),
};

async function loginContext(context) {
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: LOGIN });
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  }
}

async function goto(page, urlPath) {
  await page.goto(`${BASE}${urlPath}`, { waitUntil: "networkidle", timeout: 60000 });
}

async function captureFullPage(page, filePath) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: filePath, fullPage: true });
}

async function main() {
  await setupStudioTestBatch1();
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await loginContext(context);
  const page = await context.newPage();

  try {
    await goto(page, "/studio-board?record=open");
    await page.waitForSelector(".sb", { timeout: 30000 });
    await page.waitForSelector("text=The Studio Test Batch 1", { timeout: 30000 });
    await captureFullPage(page, screenshots.studioBoardProjectRecord);

    await goto(page, "/file-room/owner-console");
    await page.waitForSelector(".fr-owner-console-header__title", { timeout: 30000 });
    await page.waitForSelector("text=The Studio Test Batch 1", { timeout: 30000 });
    await page.locator("text=Production lanes").scrollIntoViewIfNeeded();
    await captureFullPage(page, screenshots.ownerConsoleMultiJob);

    await goto(page, `/file-room/${CAMPAIGN_ID}/production/${encodeURIComponent(SOCIAL_JOB_ID)}`);
    await page.waitForSelector(".fr-production-workspace", { timeout: 30000 });
    await page.waitForSelector("text=Make My Social Media Posts", { timeout: 30000 });
    await captureFullPage(page, screenshots.productionWorkspace);

    await goto(
      page,
      `/file-room/${CAMPAIGN_ID}/office/strategy?task=${encodeURIComponent(SOCIAL_STRATEGY_TASK_ID)}`,
    );
    await page.waitForSelector("text=Strategy queue", { timeout: 30000 });
    await page.waitForSelector("text=Work Packet", { timeout: 30000 });
    await captureFullPage(page, screenshots.workPacketTeamOffice);

    await goto(page, `/file-room/${CAMPAIGN_ID}/production/${encodeURIComponent(FLYER_JOB_ID)}`);
    await page.waitForSelector(".fr-production-workspace", { timeout: 30000 });
    await page.waitForSelector("text=Make Me a Flyer", { timeout: 30000 });
    await page.waitForSelector("text=Exact flyer text and details", { timeout: 30000 });
    await captureFullPage(page, screenshots.materialsRequirements);

    await writeFile(
      path.join(OUT_DIR, "screenshots.json"),
      JSON.stringify(
        {
          campaignId: CAMPAIGN_ID,
          capturedAt: new Date().toISOString(),
          screenshots,
        },
        null,
        2,
      ),
      "utf8",
    );

    console.log(`Screenshots saved to ${path.relative(process.cwd(), OUT_DIR)}`);
    for (const [name, filePath] of Object.entries(screenshots)) {
      console.log(`${name}: ${path.relative(process.cwd(), filePath)}`);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
