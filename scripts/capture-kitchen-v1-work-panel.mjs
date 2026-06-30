/**
 * Kitchen V1 — File Room production work panel screenshot
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 *
 * Usage: node scripts/capture-kitchen-v1-work-panel.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp", "kitchen-v1-screenshots");
const OUT = path.join(OUT_DIR, "01-sm-001-production-work-panel.png");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };

/** @param {string} campaignId */
function buildKitchenCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Kitchen V1 Work Panel Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Kitchen V1 sm-001 production work panel",
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
          clientResponsibilities: ["Brand logo and photos"],
          executionResponsibility: "shared",
        },
      ],
      approvedAt: now,
    },
    projectDetailsSubmittedAt: now,
    paymentReceivedAt: now,
    selectedCampaignOption: "Option A",
    projectDetails: {
      form: {
        workingOn: "Kitchen V1 screenshot campaign",
        primaryApproverName: "Tagia Verify",
        primaryApproverEmail: "tagia@local.dev",
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
  const text = await res.text();
  let json = null;
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
async function ensureOwnerCampaign(campaignId) {
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

/** @param {string} campaignId @param {ReturnType<typeof buildKitchenCampaign>} record */
async function seedCampaign(campaignId, record) {
  jar.clear();
  await loginApi(OWNER_LOGIN);
  const syncRes = await fetchApi("/api/campaigns/current", { method: "PATCH", json: { record } });
  if (syncRes.status !== 200) {
    throw new Error(`Campaign sync failed: ${syncRes.status} ${JSON.stringify(syncRes.json)}`);
  }
  const productionRes = await fetchApi(`/api/campaigns/${campaignId}/production`);
  if (productionRes.status !== 200) {
    throw new Error(`Production init failed: ${productionRes.status}`);
  }
  const tasksRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  if (tasksRes.status !== 200) {
    throw new Error(`Tasks generation failed: ${tasksRes.status}`);
  }
  return { production: productionRes.json, tasks: tasksRes.json };
}

/** @param {import('playwright').Page} page @param {{ email: string; password: string }} credentials */
async function loginPage(page, credentials) {
  const res = await page.request.post(`${BASE}/api/auth/login`, { data: credentials });
  if (!res.ok()) throw new Error(`Playwright login failed for ${credentials.email}: ${res.status()}`);
}

async function main() {
  const campaignId = `kitchen-v1-${randomUUID().slice(0, 8)}`;
  const record = buildKitchenCampaign(campaignId);
  await mkdir(OUT_DIR, { recursive: true });
  await ensureOwnerCampaign(campaignId);
  await seedCampaign(campaignId, record);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

  try {
    await loginPage(page, OWNER_LOGIN);
    await page.goto(`${BASE}/file-room/${campaignId}`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector("text=Production task plan", { timeout: 30000 });
    await page.waitForSelector(".fr-production-work", { timeout: 30000 });

    const textarea = page.locator(".fr-production-work__textarea").first();
    await textarea.fill(
      "Content direction: Focus on summer launch for the flagship offer. Tone: warm, confident, approachable.",
    );
    await page.getByRole("button", { name: "Save version" }).click();
    await page.waitForSelector(".fr-production-work__code", { timeout: 15000 });

    const workPanel = page.locator(".fr-production-work").first();
    await workPanel.screenshot({ path: OUT });
    await page.screenshot({ path: path.join(OUT_DIR, "02-full-file-room-context.png"), fullPage: true });

    await writeFile(
      path.join(OUT_DIR, "README.txt"),
      [
        `Kitchen V1 screenshot captured for campaign ${campaignId}`,
        OUT,
        path.join(OUT_DIR, "02-full-file-room-context.png"),
      ].join("\n"),
      "utf8",
    );
    console.log(`Screenshot saved: ${OUT}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
