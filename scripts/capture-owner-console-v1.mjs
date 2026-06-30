/**
 * Owner Console V1 — consolidated screenshot capture
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 * Usage: node scripts/capture-owner-console-v1.mjs
 */

import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp", "owner-console-v1-screenshots");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const STAFF_STRATEGY_ID = "staff-strategy-capture";
/** Fixed id — reruns overwrite one demo campaign instead of stacking duplicates. */
const CAPTURE_CAMPAIGN_ID = "owner-console-v1-capture";

const DATA_DIRS = [
  path.join(process.cwd(), "data", "campaigns"),
  path.join(process.cwd(), "data", "campaign-tasks"),
  path.join(process.cwd(), "data", "campaign-materials"),
  path.join(process.cwd(), "data", "campaign-production"),
];

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const VIEWPORT_LAPTOP = { width: 1440, height: 900 };
const VIEWPORT_PHONE = { width: 390, height: 844 };

const OUT = {
  studioLaptop: path.join(OUT_DIR, "01-studio-console-laptop.png"),
  studioPhone: path.join(OUT_DIR, "02-studio-console-phone.png"),
  drillDownLaptop: path.join(OUT_DIR, "03-campaign-drill-down-laptop.png"),
  drillDownPhone: path.join(OUT_DIR, "04-campaign-drill-down-phone.png"),
  scanBuckets: path.join(OUT_DIR, "05-scan-buckets-laptop.png"),
  reassignPanel: path.join(OUT_DIR, "06-reassign-panel-laptop.png"),
};

class CookieJar {
  #cookies = new Map();
  clear() {
    this.#cookies.clear();
  }
  absorb(setCookieHeader) {
    if (!setCookieHeader) return;
    for (const part of setCookieHeader.split(/,(?=\s*[^;]+=[^;]+)/)) {
      const [pair] = part.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (!value) this.#cookies.delete(name);
      else this.#cookies.set(name, value);
    }
  }
  header() {
    return [...this.#cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

const jar = new CookieJar();

async function fetchApi(urlPath, options = {}) {
  const headers = new Headers(options.headers ?? {});
  const cookie = jar.header();
  if (cookie) headers.set("Cookie", cookie);
  let body = options.body;
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }
  const res = await fetch(`${BASE}${urlPath}`, { ...options, headers, body, redirect: "manual" });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) for (const c of setCookie) jar.absorb(c);
  else jar.absorb(res.headers.get("set-cookie"));
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

async function loginApi(credentials) {
  jar.clear();
  const res = await fetchApi("/api/auth/login", { method: "POST", json: credentials });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status}`);
}

async function loginBrowserContext(context, credentials) {
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: credentials });
  if (!res.ok()) throw new Error(`Playwright login failed: ${res.status()}`);
}

function buildCampaign(campaignId, campaignName) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName,
    businessName: `${campaignName} LLC`,
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Owner Console V1 screenshot seed",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 50000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 50000,
      lineItems: [
        {
          skuId: "sm-001",
          serviceName: "Social Media Launch Set",
          billingType: "one_time",
          exactPriceCents: 50000,
          priceDisplay: "$500",
          deliverables: ["Posts"],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: ["Brand assets"],
          executionResponsibility: "shared",
        },
      ],
      approvedAt: now,
    },
    selectedCampaignOption: "Option A",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: { workingOn: "V1 capture", mainOffer: "Launch", primaryApproverName: "Client", primaryApproverEmail: "c@local.dev" },
      files: [],
      submittedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

async function assignStaff(campaignId) {
  let assignments = { staffByUserId: {}, staffCapabilities: {} };
  try {
    assignments = JSON.parse(await readFile(ASSIGNMENTS_PATH, "utf8"));
  } catch {
    /* fresh */
  }
  assignments.staffByUserId = assignments.staffByUserId ?? {};
  assignments.staffCapabilities = assignments.staffCapabilities ?? {};
  assignments.staffByUserId[STAFF_STRATEGY_ID] = [campaignId];
  assignments.staffCapabilities[STAFF_STRATEGY_ID] = ["strategy"];
  await writeFile(ASSIGNMENTS_PATH, JSON.stringify(assignments, null, 2));
}

/** Remove stale owner-console-v1-* demo files so studio queue stays clean. */
async function cleanupStaleCaptureCampaigns(keepCampaignId) {
  for (const dir of DATA_DIRS) {
    let files = [];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.startsWith("owner-console-v1-") || !file.endsWith(".json")) continue;
      const campaignId = file.slice(0, -".json".length);
      if (campaignId === keepCampaignId) continue;
      await unlink(path.join(dir, file));
    }
  }
}

async function seed(campaignId) {
  await cleanupStaleCaptureCampaigns(campaignId);
  await loginApi(OWNER_LOGIN);
  await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildCampaign(campaignId, "Owner Console V1 Capture") },
  });
  await assignStaff(campaignId);
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "missing_client_fact",
      title: "OC-V1 Capture: Brand hex codes",
      taskId: "sm-001:copy",
      clientRequestDraft: {
        exactClientOnlyItem: "Brand hex codes",
        whyBlocksWork: "Blocks launch creative.",
      },
    },
  });
  await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "compliance_hold",
      title: "OC-V1 Capture: Claim review",
      taskId: "sm-001:copy",
    },
  });
}

async function captureFrPage(page, filePath) {
  const root = page.locator(".fr-page");
  await root.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(400);
  await root.screenshot({ path: filePath });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const campaignId = CAPTURE_CAMPAIGN_ID;
  await seed(campaignId);

  const tasks = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  const exceptionId =
    tasks.json?.exceptionRecords?.find((e) => e.title.includes("Brand hex"))?.id ?? "";

  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge",
  });

  try {
    // Studio-wide laptop + phone
    for (const [key, viewport, outPath] of [
      ["laptop", VIEWPORT_LAPTOP, OUT.studioLaptop],
      ["phone", VIEWPORT_PHONE, OUT.studioPhone],
    ]) {
      const ctx = await browser.newContext({ viewport });
      await loginBrowserContext(ctx, OWNER_LOGIN);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForSelector(".fr-owner-console-header__title", { timeout: 30000 });
      await captureFrPage(page, outPath);
      await ctx.close();
    }

    // Drill-down laptop + phone
    const drillUrl = `${BASE}/file-room/${campaignId}/owner-console?item=${encodeURIComponent(exceptionId)}`;
    for (const [viewport, outPath] of [
      [VIEWPORT_LAPTOP, OUT.drillDownLaptop],
      [VIEWPORT_PHONE, OUT.drillDownPhone],
    ]) {
      const ctx = await browser.newContext({ viewport });
      await loginBrowserContext(ctx, OWNER_LOGIN);
      const page = await ctx.newPage();
      await page.goto(drillUrl, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForSelector("text=Linked context", { timeout: 30000 });
      await captureFrPage(page, outPath);
      await ctx.close();
    }

    // Scan buckets (expand first non-empty)
    const scanCtx = await browser.newContext({ viewport: VIEWPORT_LAPTOP });
    await loginBrowserContext(scanCtx, OWNER_LOGIN);
    const scanPage = await scanCtx.newPage();
    await scanPage.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle", timeout: 60000 });
    await scanPage.waitForSelector("text=Scan", { timeout: 30000 });
    const bucket = scanPage.locator(".fr-owner-console-scan__bucket").first();
    await bucket.locator("summary").click();
    await scanPage.waitForTimeout(300);
    await captureFrPage(scanPage, OUT.scanBuckets);
    await scanCtx.close();

    // Reassign panel on drill-down — select claim review (linked copy task)
    const reassignCtx = await browser.newContext({ viewport: VIEWPORT_LAPTOP });
    await loginBrowserContext(reassignCtx, OWNER_LOGIN);
    const reassignPage = await reassignCtx.newPage();
    const claimReviewId =
      tasks.json?.exceptionRecords?.find((e) => e.title.includes("Claim review"))?.id ?? exceptionId;
    const reassignUrl = `${BASE}/file-room/${campaignId}/owner-console?item=${encodeURIComponent(claimReviewId)}`;
    await reassignPage.goto(reassignUrl, { waitUntil: "networkidle", timeout: 60000 });
    await reassignPage.waitForSelector(".fr-owner-console-actions", { timeout: 30000 });
    const reassignBtn = reassignPage.locator("button", { hasText: "Reassign linked task" });
    if (await reassignBtn.count()) {
      await reassignBtn.first().click();
      await reassignPage.waitForSelector(".fr-tasks-handoff__context", { timeout: 15000 });
      const panel = reassignPage.locator(".fr-owner-console-grid__detail");
      await panel.screenshot({ path: OUT.reassignPanel });
    }
    await reassignCtx.close();

    const readme = [
      "Owner Console V1 screenshots",
      "",
      `Campaign: ${campaignId}`,
      `Exception: ${exceptionId}`,
      "",
      ...Object.entries(OUT).map(([k, p]) => `${k}: ${p}`),
      "",
      `Captured: ${new Date().toISOString()}`,
    ].join("\n");
    await writeFile(path.join(OUT_DIR, "README.txt"), readme, "utf8");

    for (const p of Object.values(OUT)) console.log(p);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
