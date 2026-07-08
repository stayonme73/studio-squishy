/**
 * Capture Studio Board 6-tile validation screenshots (1440×900, full page).
 * Run: node scripts/capture-studio-board-six-tile-validation.mjs
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "test-artifacts", "studio-board-six-tile-validation");
const VIEWPORT = { width: 1440, height: 900 };
const WALKTHROUGH = {
  email: "tagia-client-walkthrough@local.dev",
  password: "dev-only",
};

async function loginContext(context) {
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: WALKTHROUGH });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()}`);
}

async function resetClient(context) {
  const res = await context.request.post(`${BASE}/api/dev/reset-client-test-state`);
  if (!res.ok()) throw new Error(`Reset failed: ${res.status()}`);
}

async function fetchCampaignRecord(context, campaignId) {
  const res = await context.request.get(`${BASE}/api/campaigns/${encodeURIComponent(campaignId)}`);
  if (!res.ok()) throw new Error(`Campaign fetch failed (${campaignId}): ${res.status()}`);
  const body = await res.json();
  const record = body.campaign?.record;
  if (!record) throw new Error(`Missing record for ${campaignId}`);
  return record;
}

async function seedCurrentCampaign(context, record) {
  const res = await context.request.patch(`${BASE}/api/campaigns/current`, {
    data: { record },
  });
  if (!res.ok()) throw new Error(`Seed PATCH failed: ${res.status()}`);
}

async function capture(page, filename, assertSelector) {
  await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.setViewportSize(VIEWPORT);
  if (assertSelector) {
    await page.locator(assertSelector).first().waitFor({ timeout: 45000 });
  }
  await page.waitForTimeout(2500);
  await page.locator(".sb-board-grid").first().scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT_DIR, filename),
    fullPage: true,
  });
  console.log(`Saved ${filename}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  await loginContext(context);
  const page = await context.newPage();
  const walkthroughRecord = structuredClone(
    await fetchCampaignRecord(context, "studio-test-batch-1-client-walkthrough"),
  );

  await resetClient(context);
  await capture(page, "01-reset-no-active-project-1440x900.png", "text=No Active Project");

  const paidRecord = await fetchCampaignRecord(context, "validation-paid-awaiting-details");
  await seedCurrentCampaign(context, paidRecord);
  await capture(
    page,
    "02-payment-before-project-details-1440x900.png",
    ".sb-card--materials-needed .sb-materials-board-tile__meta",
  );

  const buildingRecord = {
    ...structuredClone(walkthroughRecord),
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "The Studio is creating your campaign options with care and creativity.",
    estimatedCompletion: "2 days remaining",
    concepts: undefined,
    conceptsGeneratedAt: undefined,
    selectedCampaignOption: undefined,
    updatedAt: new Date().toISOString(),
  };
  await seedCurrentCampaign(context, walkthroughRecord);
  await capture(page, "04-review-ready-1440x900.png", ".sb-next-action__cta");

  await seedCurrentCampaign(context, buildingRecord);
  await capture(page, "03-active-workflow-after-project-details-1440x900.png", ".sb-next-action__status");

  await browser.close();
  console.log(`All screenshots saved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
