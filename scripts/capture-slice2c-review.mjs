/**
 * Slice 2c — visual review screenshots (client intake, team review, blocking count)
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 *
 * Usage: node scripts/capture-slice2c-review.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp");
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const CLIENT_LOGIN = { email: "client@local.dev", password: "dev-only" };

const OUT = {
  clientIntake: path.join(OUT_DIR, "slice2c-review-client-intake.png"),
  fileRoomAfterReview: path.join(OUT_DIR, "slice2c-review-file-room-after-review.png"),
  blockingCount: path.join(OUT_DIR, "slice2c-review-blocking-count.png"),
};

/** @param {string} campaignId */
function buildMultiServiceCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 2c Materials Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Slice 2c visual review",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: ["bf-001", "bf-002", "sm-001"],
      includedServiceIds: ["bf-001", "bf-002", "sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 150000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 150000,
      lineItems: [
        {
          skuId: "bf-001",
          serviceName: "Brand Identity Refresh",
          billingType: "one_time",
          exactPriceCents: 50000,
          priceDisplay: "$500",
          deliverables: ["Brand guide"],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: ["Existing logo files"],
          executionResponsibility: "studio",
        },
        {
          skuId: "bf-002",
          serviceName: "Marketing Video Project",
          billingType: "one_time",
          exactPriceCents: 50000,
          priceDisplay: "$500",
          deliverables: ["Video"],
          exclusions: [],
          timingWindowLabel: "3 weeks",
          revisionRule: "1 round",
          clientResponsibilities: ["Logo assets"],
          executionResponsibility: "studio",
        },
        {
          skuId: "sm-001",
          serviceName: "Social Media Launch Set",
          billingType: "monthly",
          exactPriceCents: 0,
          priceDisplay: "$0/mo",
          deliverables: ["Posts"],
          exclusions: [],
          timingWindowLabel: "Monthly",
          revisionRule: "1 round",
          clientResponsibilities: ["Brand logo and social access"],
          executionResponsibility: "shared",
        },
      ],
      approvedAt: now,
    },
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      // Partial form — proves Studio Board crash guard (undefined optional fields).
      form: {
        workingOn: "Slice 2c visual review campaign",
        primaryApproverName: "Client Verify",
        primaryApproverEmail: "client@local.dev",
      },
      files: [],
      submittedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

class CookieJar {
  /** @type {Map<string, string>} */
  #cookies = new Map();
  clear() {
    this.#cookies.clear();
  }
  /** @param {string | null | undefined} setCookieHeader */
  absorb(setCookieHeader) {
    if (!setCookieHeader) return;
    const parts = setCookieHeader.split(/,(?=\s*[^;]+=[^;]+)/);
    for (const part of parts) {
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
    if (this.#cookies.size === 0) return "";
    return [...this.#cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

const jar = new CookieJar();

/** @param {string} urlPath @param {RequestInit & { json?: unknown }} [options] */
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
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 500) };
  }
  return { status: res.status, json, text };
}

/** @param {{ email: string; password: string }} credentials */
async function loginApi(credentials) {
  const res = await fetchApi("/api/auth/login", { method: "POST", json: credentials });
  if (res.status !== 200) throw new Error(`Login failed for ${credentials.email}: ${res.status}`);
}

/** @param {string} campaignId */
async function ensureClientUser(campaignId) {
  await mkdir(path.dirname(USERS_PATH), { recursive: true });
  let users = [];
  try {
    users = JSON.parse(await readFile(USERS_PATH, "utf8"));
  } catch {
    users = [];
  }
  const existing = users.find((user) => user.email === CLIENT_LOGIN.email);
  if (existing) {
    existing.currentCampaignId = campaignId;
    existing.roles = ["client"];
  } else {
    users.push({
      id: "client-verify",
      email: CLIENT_LOGIN.email,
      password: CLIENT_LOGIN.password,
      displayName: "Client Verify",
      roles: ["client"],
      currentCampaignId: campaignId,
    });
  }
  await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

/** @param {string} campaignId */
async function ensureOwnerCampaign(campaignId) {
  await mkdir(path.dirname(USERS_PATH), { recursive: true });
  let users = [];
  try {
    users = JSON.parse(await readFile(USERS_PATH, "utf8"));
  } catch {
    users = [];
  }
  const tagia = users.find((user) => user.email === OWNER_LOGIN.email);
  if (tagia) tagia.currentCampaignId = campaignId;
  await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

/** @param {string} campaignId */
async function seedCampaign(campaignId) {
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await mkdir(MATERIALS_DIR, { recursive: true });
  const record = buildMultiServiceCampaign(campaignId);
  jar.clear();
  await loginApi(OWNER_LOGIN);
  const syncRes = await fetchApi("/api/campaigns/current", { method: "PATCH", json: { record } });
  if (syncRes.status !== 200) {
    throw new Error(`Campaign sync failed: ${syncRes.status} ${JSON.stringify(syncRes.json)}`);
  }
  const materialsRes = await fetchApi(`/api/campaigns/${campaignId}/materials`);
  if (materialsRes.status !== 200) {
    throw new Error(`Materials init failed: ${materialsRes.status}`);
  }
  return { record, materials: materialsRes.json };
}

/** @param {import('playwright').Page} page @param {{ email: string; password: string }} credentials */
async function loginPage(page, credentials) {
  const res = await page.request.post(`${BASE}/api/auth/login`, { data: credentials });
  if (!res.ok()) throw new Error(`Playwright login failed for ${credentials.email}: ${res.status()}`);
}

/** @param {import('playwright').Page} page @param {ReturnType<typeof buildMultiServiceCampaign>} record */
async function seedLocalCampaign(page, record) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([key, payload]) => {
      localStorage.setItem(key, JSON.stringify(payload));
    },
    [CAMPAIGN_KEY, record],
  );
}

/** @param {string} campaignId */
async function captureClientIntake(campaignId, record) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
  await loginPage(page, CLIENT_LOGIN);
  await seedLocalCampaign(page, record);
  await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle" });
  await page.waitForSelector(".sb-materials-intake", { timeout: 20000 });
  await page.waitForSelector("text=Materials we still need", { timeout: 15000 });
  await page.waitForSelector(".sb-materials-intake__item", { timeout: 15000 });
  await page.waitForTimeout(600);

  const logoRows = await page.locator(".sb-materials-intake__prompt", { hasText: "Please send your logo file" }).count();
  if (logoRows !== 1) {
    await browser.close();
    throw new Error(`Expected exactly 1 consolidated logo row, found ${logoRows}`);
  }

  const panel = page.locator(".sb-card--materials");
  await panel.scrollIntoViewIfNeeded();
  await panel.screenshot({ path: OUT.clientIntake });
  await browser.close();
}

/** @param {string} campaignId */
async function submitClientMaterials(campaignId) {
  jar.clear();
  await loginApi(CLIENT_LOGIN);
  const logoRes = await fetchApi(`/api/campaigns/${campaignId}/materials`, {
    method: "PATCH",
    json: {
      action: "client_submit_consolidated",
      consolidatedItemId: "logo-brand:file-metadata",
      payload: { fileName: "brand-logo.svg", mimeType: "image/svg+xml" },
    },
  });
  if (logoRes.status !== 200) throw new Error(`Logo submit failed: ${JSON.stringify(logoRes.json)}`);
}

/** @param {string} campaignId */
async function captureFileRoomAfterReview(campaignId) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
  await loginPage(page, OWNER_LOGIN);
  await page.goto(`${BASE}/file-room/${campaignId}`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Materials ledger", { timeout: 20000 });
  await page.waitForSelector(".fr-materials-row", { timeout: 20000 });

  const approveButton = page
    .locator(".fr-materials-row")
    .filter({ hasText: "Logo & brand assets" })
    .filter({ hasText: "Brand Identity Refresh" })
    .filter({ has: page.locator("button", { hasText: "Approve for use" }) })
    .locator("button", { hasText: "Approve for use" })
    .first();
  await approveButton.scrollIntoViewIfNeeded();
  await approveButton.click();
  await page.waitForTimeout(800);

  const clarifyRow = page
    .locator(".fr-materials-row", { hasText: "Working on" })
    .filter({ has: page.locator("button", { hasText: "Request clarification" }) })
    .first();
  await clarifyRow.scrollIntoViewIfNeeded();
  await clarifyRow.locator("textarea").fill("Please confirm launch date and primary offer.");
  await clarifyRow.locator("button", { hasText: "Request clarification" }).click();
  await page.waitForTimeout(800);

  const notNeededRow = page
    .locator(".fr-materials-row")
    .filter({ hasText: "Logo & brand assets" })
    .filter({ hasText: "Marketing Video Project" })
    .filter({ has: page.locator("button", { hasText: "Not needed" }) })
    .first();
  await notNeededRow.scrollIntoViewIfNeeded();
  await notNeededRow.locator("button", { hasText: "Not needed" }).click();
  await page.waitForTimeout(800);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("text=Approved for use", { timeout: 15000 });
  await page.waitForSelector("text=Needs clarification", { timeout: 15000 });
  await page.waitForSelector("text=Not needed", { timeout: 15000 });

  const materialsSection = page.locator(".utility-card", { hasText: "Materials ledger" });
  await materialsSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await materialsSection.screenshot({ path: OUT.fileRoomAfterReview });
  await browser.close();
}

/** @param {string} campaignId */
async function captureBlockingCount(campaignId) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
  await loginPage(page, OWNER_LOGIN);
  await page.goto(`${BASE}/file-room/${campaignId}`, { waitUntil: "networkidle" });
  const banner = page.locator(".fr-banner", { hasText: "Required materials outstanding" });
  await banner.waitFor({ timeout: 15000 });

  const bannerText = await banner.innerText();
  const match = bannerText.match(/\((\d+) outstanding\)/);
  if (!match) throw new Error(`Blocking banner missing count: ${bannerText}`);
  const bannerCount = Number(match[1]);

  const blockingRows = await page
    .locator(".fr-materials-row")
    .filter({
      has: page.locator(".fr-materials-row__status", {
        hasText: /^(Missing|Needs clarification|Requested)$/,
      }),
    })
    .count();
  if (bannerCount !== blockingRows) {
    await browser.close();
    throw new Error(
      `Banner count ${bannerCount} does not match visible blocking rows ${blockingRows}`,
    );
  }

  const materialsSection = page.locator(".utility-card", { hasText: "Materials ledger" });
  await materialsSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await materialsSection.screenshot({ path: OUT.blockingCount });
  await browser.close();
  return { bannerCount, blockingRows };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  try {
    const probe = await fetch(BASE);
    console.log(`Server reachable: HTTP ${probe.status} (${BASE})`);
  } catch (error) {
    console.error(`Server not reachable at ${BASE}:`, error);
    process.exit(1);
  }

  const campaignId = process.env.SLICE2C_CAMPAIGN_ID ?? randomUUID();
  console.log(`Seeding campaign ${campaignId}…`);

  await ensureClientUser(campaignId);
  await ensureOwnerCampaign(campaignId);
  const { record, materials } = await seedCampaign(campaignId);

  const consolidated = materials?.materials?.items
    ? null
    : materials?.consolidatedRequests?.length;
  console.log(`Initial blocking count (owner view): ${materials?.blockingRequiredCount ?? "n/a"}`);

  console.log("Capturing client Studio Board intake (missing consolidated)…");
  await captureClientIntake(campaignId, record);

  console.log("Capturing blocking count banner (pre-review)…");
  const countInfo = await captureBlockingCount(campaignId);

  console.log("Submitting client materials for team review…");
  await submitClientMaterials(campaignId);

  console.log("Capturing File Room after team review (UI + refresh)…");
  await captureFileRoomAfterReview(campaignId);

  const report = {
    campaignId,
    capturedAt: new Date().toISOString(),
    screenshots: OUT,
    blockingCount: countInfo,
    initialBlockingRequiredCount: materials?.blockingRequiredCount,
  };
  await writeFile(path.join(OUT_DIR, "capture-slice2c-review-report.json"), JSON.stringify(report, null, 2));

  console.log("\nSlice 2c review captures complete:");
  for (const [key, filePath] of Object.entries(OUT)) {
    console.log(`  ${key}: ${filePath}`);
  }
  console.log(
    `  blocking banner: ${countInfo.bannerCount} outstanding = ${countInfo.blockingRows} blocking rows`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
