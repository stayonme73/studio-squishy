/**
 * Capture Studio Board reset + active campaign screenshots (desktop 100% zoom).
 * Run: node scripts/capture-studio-board-reset-screenshots.mjs
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "test-artifacts", "studio-board-empty-reset-v1");
const VIEWPORT = { width: 1440, height: 900 };
const WALKTHROUGH = {
  email: "tagia-client-walkthrough@local.dev",
  password: "dev-only",
  campaignId: "studio-test-batch-1-client-walkthrough",
};

async function loginContext(context) {
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: WALKTHROUGH });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()}`);
}

async function seedCurrentCampaign(context) {
  const campaignRes = await context.request.get(
    `${BASE}/api/campaigns/${encodeURIComponent(WALKTHROUGH.campaignId)}`,
  );
  const body = await campaignRes.json();
  const record = body.campaign?.record;
  if (!record) throw new Error("Fixture campaign missing for active screenshot.");
  const patchRes = await context.request.patch(`${BASE}/api/campaigns/current`, {
    data: { record },
  });
  if (!patchRes.ok()) throw new Error(`Seed PATCH failed: ${patchRes.status()}`);
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

  await context.request.post(`${BASE}/api/dev/reset-client-test-state`);
  await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: path.join(OUT_DIR, "desktop-1440-reset-no-active-project.png"),
    fullPage: false,
  });

  await seedCurrentCampaign(context);
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto(`${BASE}/studio-board?campaignId=${encodeURIComponent(WALKTHROUGH.campaignId)}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(3500);
  await page.screenshot({
    path: path.join(OUT_DIR, "desktop-1440-active-campaign.png"),
    fullPage: false,
  });

  await browser.close();
  console.log(`Saved reset screenshot: ${path.join(OUT_DIR, "desktop-1440-reset-no-active-project.png")}`);
  console.log(`Saved active screenshot: ${path.join(OUT_DIR, "desktop-1440-active-campaign.png")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
