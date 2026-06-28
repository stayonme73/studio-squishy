/**
 * Slice 1b — File Room screenshot capture
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET, verification campaign synced.
 * Run verify-slice1b.mjs first or ensure owner login + campaign exist.
 *
 * Usage: node scripts/capture-slice1b.mjs
 */

import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const SEED_PATH = path.join(process.cwd(), "src", "lib", "file-room", "campaign-assignments.seed.json");
const STAFF_USER_ID = "staff-dev";

async function login(page, email, password) {
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email, password },
  });
  if (!res.ok()) throw new Error(`Login failed for ${email}: HTTP ${res.status()}`);
}

/** Ensure staff-dev is assigned to the dev verification campaign before staff screenshots. */
async function ensureStaffAssignment() {
  let assignedCampaignId;
  let ownerOnlyCampaignId;

  try {
    const report = JSON.parse(
      await readFile(path.join(OUT_DIR, "verify-slice1b-report.json"), "utf8"),
    );
    assignedCampaignId = report.meta?.testCampaignId;
    ownerOnlyCampaignId = report.meta?.otherCampaignId;
  } catch {
    // fall back to seed when verify report is unavailable
  }

  if (!assignedCampaignId) {
    const seed = JSON.parse(await readFile(SEED_PATH, "utf8"));
    assignedCampaignId = seed.staffByUserId?.[STAFF_USER_ID]?.[0];
  }
  if (!assignedCampaignId) {
    throw new Error("Missing staff campaign assignment (run verify-slice1b.mjs or update seed)");
  }

  await mkdir(path.dirname(ASSIGNMENTS_PATH), { recursive: true });
  await writeFile(
    ASSIGNMENTS_PATH,
    JSON.stringify({ staffByUserId: { [STAFF_USER_ID]: [assignedCampaignId] } }, null, 2),
    "utf8",
  );
  return { assignedCampaignId, ownerOnlyCampaignId };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  await login(page, "tagia@local.dev", "dev-only");
  await page.goto(`${BASE}/file-room`, { waitUntil: "networkidle" });
  await page.waitForSelector(".fr-header__title", { timeout: 15000 });
  await page.screenshot({ path: path.join(OUT_DIR, "slice1b-owner-list.png"), fullPage: true });

  const campaignLink = page.locator(".fr-list-item").first();
  if (await campaignLink.count()) {
    const href = await campaignLink.getAttribute("href");
    if (href) {
      await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
      await page.waitForSelector(".fr-sync-badge", { timeout: 15000 });
      await page.screenshot({
        path: path.join(OUT_DIR, "slice1b-owner-detail.png"),
        fullPage: true,
      });
    }
  }

  await page.request.post(`${BASE}/api/auth/logout`);

  const { assignedCampaignId, ownerOnlyCampaignId } = await ensureStaffAssignment();

  await login(page, "staff@local.dev", "dev-only");
  await page.goto(`${BASE}/file-room`, { waitUntil: "networkidle" });
  await page.waitForSelector(".fr-header__title", { timeout: 15000 });
  await page.waitForSelector(".fr-list-item", { timeout: 15000 });
  const staffListCount = await page.locator(".fr-list-item").count();
  if (staffListCount !== 1) {
    throw new Error(`Expected exactly 1 staff list item, got ${staffListCount}`);
  }
  await page.screenshot({ path: path.join(OUT_DIR, "slice1b-staff-list.png"), fullPage: true });

  await page.goto(`${BASE}/file-room/${assignedCampaignId}`, { waitUntil: "networkidle" });
  await page.waitForSelector(".fr-sync-badge", { timeout: 15000 });
  await page.screenshot({ path: path.join(OUT_DIR, "slice1b-staff-detail.png"), fullPage: true });

  const forbiddenCampaignId =
    ownerOnlyCampaignId ?? "bc75b98a-c26e-449d-a550-e16b7da3cbab";

  const ownerOnlyRes = await page.request.get(`${BASE}/file-room/${forbiddenCampaignId}`);
  if (!ownerOnlyRes.ok()) {
    throw new Error(
      `Expected 200 forbidden page for owner-only campaign, got ${ownerOnlyRes.status()}`,
    );
  }
  const ownerOnlyHtml = await ownerOnlyRes.text();
  if (!ownerOnlyHtml.includes("Access restricted")) {
    throw new Error("Owner-only campaign did not show Access restricted for staff");
  }
  await page.goto(`${BASE}/file-room/${forbiddenCampaignId}`, {
    waitUntil: "networkidle",
  });
  await page.waitForSelector("text=Access restricted", { timeout: 15000 });
  await page.screenshot({
    path: path.join(OUT_DIR, "slice1b-staff-forbidden.png"),
    fullPage: true,
  });

  await browser.close();
  console.log("Screenshots saved to tmp/slice1b-*.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
