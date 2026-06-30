/**
 * Seed + capture Slice 3d-c-c client Studio Board screenshots
 * Usage: node scripts/capture-slice3d-c-c-screenshots.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp", "slice3d-c-c-screenshots");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");

const OWNER = { email: "tagia@local.dev", password: "dev-only" };
const CLIENT = { email: "client@local.dev", password: "dev-only" };

class CookieJar {
  /** @type {Map<string, string>} */
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
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function loginApi(credentials) {
  jar.clear();
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    redirect: "manual",
  });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status}`);
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) for (const c of setCookie) jar.absorb(c);
  else jar.absorb(res.headers.get("set-cookie"));
  const cookies = [];
  for (const [name, value] of jar.header().split("; ").map((pair) => pair.split("="))) {
    if (name && value) cookies.push({ name, value, url: BASE });
  }
  return cookies;
}

function buildCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 3d-c-c Screenshot Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Screenshot seed",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001", "bf-001"],
      includedServiceIds: ["sm-001", "bf-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 100000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 100000,
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
          clientResponsibilities: ["Brand logo and photos"],
          executionResponsibility: "shared",
        },
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
          clientResponsibilities: ["Existing logo files if available"],
          executionResponsibility: "studio",
        },
      ],
      approvedAt: now,
    },
    selectedCampaignOption: "Option A",
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureClientCampaign(campaignId) {
  let users = [];
  try {
    users = JSON.parse(await readFile(USERS_PATH, "utf8"));
  } catch {
    users = [];
  }
  const client = users.find((user) => user.email === CLIENT.email);
  if (client) Object.assign(client, { currentCampaignId: campaignId, roles: ["client"] });
  await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
  await writeFile(
    ASSIGNMENTS_PATH,
    JSON.stringify({ staffByUserId: {}, staffCapabilities: {} }, null, 2),
    "utf8",
  );
}

async function seedLocalCampaign(page, record) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([key, payload]) => {
      localStorage.setItem(key, JSON.stringify(payload));
    },
    ["studio-squishy:current-campaign", record],
  );
}

async function fetchCampaignRecord(campaignId) {
  jar.clear();
  await loginApi(CLIENT);
  const res = await fetchApi(`/api/campaigns/${campaignId}`);
  if (res.status !== 200 || !res.json?.campaign?.record) {
    throw new Error(`Could not load campaign record: ${res.status}`);
  }
  return res.json.campaign.record;
}

async function seedCampaign(campaignId) {
  await ensureClientCampaign(campaignId);
  await loginApi(OWNER);
  await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildCampaign(campaignId) },
  });
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await fetchApi(`/api/campaigns/${campaignId}/materials`);

  const raise = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "client_request",
      title: "Need logo",
      clientRequestDraft: { exactClientOnlyItem: "Vector logo" },
    },
  });
  const exceptionId = raise.json.exceptionRecords?.find((e) => e.kind === "client_request")?.id;
  await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "approve_client_request",
      exceptionId,
      category: "logo-brand",
      clientFacingLabel: "Logo file",
      clientFacingPrompt: "Please send your logo file",
      whyNeeded: "Needed for Social Media Launch Set and Brand Foundation",
      requirementLevel: "required",
      relatedServiceIds: ["sm-001", "bf-001"],
    },
  });

  await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "client_request",
      title: "Unapproved document",
      clientRequestDraft: { exactClientOnlyItem: "Brand guidelines PDF" },
    },
  });
}

async function submitLogo(campaignId) {
  jar.clear();
  await loginApi(CLIENT);
  await fetchApi(`/api/campaigns/${campaignId}/materials`, {
    method: "PATCH",
    json: {
      action: "client_submit_consolidated",
      consolidatedItemId: "logo-brand:file-metadata",
      payload: { fileName: "brand-logo.svg", mimeType: "image/svg+xml" },
    },
  });
}

async function loginUi(context, credentials) {
  const cookies = await loginApi(credentials);
  await context.addCookies(cookies);
}

async function captureBoard(page, fileName) {
  await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle" });
  await page.waitForSelector(".sb-card--materials", { timeout: 20000 });
  const panel = page.locator(".sb-card--materials");
  await panel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const filePath = path.join(OUT_DIR, fileName);
  await panel.screenshot({ path: filePath });
  console.log(`saved ${filePath}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const campaignId = `verify-3dc-c-ui-${randomUUID().slice(0, 8)}`;
  console.log(`Seeding ${campaignId}`);
  await seedCampaign(campaignId);
  const campaignRecord = await fetchCampaignRecord(campaignId);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  await loginUi(context, CLIENT);
  const page = await context.newPage();
  await seedLocalCampaign(page, campaignRecord);

  await captureBoard(page, "01-approved-request-on-studio-board.png");
  await browser.close();

  await submitLogo(campaignId);
  const refreshedRecord = await fetchCampaignRecord(campaignId);

  const browser2 = await chromium.launch({ headless: true });
  const context2 = await browser2.newContext({ viewport: { width: 1440, height: 1400 } });
  await loginUi(context2, CLIENT);
  const page2 = await context2.newPage();
  await seedLocalCampaign(page2, refreshedRecord);
  await page2.goto(`${BASE}/studio-board`, { waitUntil: "networkidle" });
  await page2.waitForSelector("text=Received — under review", { timeout: 20000 });
  await captureBoard(page2, "02-after-submit-received-under-review.png");

  jar.clear();
  await loginApi(OWNER);
  await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "client_request",
      title: "Screenshot unapproved doc",
      clientRequestDraft: { exactClientOnlyItem: "Internal-only brand PDF" },
    },
  });
  const afterUnapprovedRecord = await fetchCampaignRecord(campaignId);
  const browser3 = await chromium.launch({ headless: true });
  const context3 = await browser3.newContext({ viewport: { width: 1440, height: 1400 } });
  await loginUi(context3, CLIENT);
  const page3 = await context3.newPage();
  await seedLocalCampaign(page3, afterUnapprovedRecord);
  await page3.goto(`${BASE}/studio-board`, { waitUntil: "networkidle" });
  await page3.waitForSelector(".sb-card--materials", { timeout: 20000 });
  const panel3 = page3.locator(".sb-card--materials");
  await panel3.scrollIntoViewIfNeeded();
  const unapprovedText = await panel3.innerText();
  if (unapprovedText.includes("Internal-only brand PDF")) {
    throw new Error("Unapproved exception leaked into client Studio Board UI");
  }
  await panel3.screenshot({ path: path.join(OUT_DIR, "03-unapproved-exception-invisible.png") });
  console.log(`saved ${path.join(OUT_DIR, "03-unapproved-exception-invisible.png")}`);
  await browser3.close();

  const bodyText = await page2.locator(".sb-card--materials").innerText();
  const forbidden = ["File Room", "exception", "waiting_internal", "sourceExceptionId", "bf-001", "sm-001"];
  for (const term of forbidden) {
    if (bodyText.toLowerCase().includes(term.toLowerCase())) {
      throw new Error(`Internal leak in UI: ${term}`);
    }
  }
  await page2.screenshot({ path: path.join(OUT_DIR, "04-no-internal-leaks-in-ui.png"), fullPage: false });
  console.log(`saved ${path.join(OUT_DIR, "04-no-internal-leaks-in-ui.png")}`);

  await browser2.close();
  console.log(`campaignId=${campaignId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
