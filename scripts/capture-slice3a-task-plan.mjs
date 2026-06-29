/**
 * Slice 3a — Production task plan screenshot
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 *
 * Usage: node scripts/capture-slice3a-task-plan.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const OUT = path.join(OUT_DIR, "slice3a-production-task-plan.png");

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const CLIENT_LOGIN = { email: "client@local.dev", password: "dev-only" };

const FORBIDDEN_LEAKAGE = [
  /\bSpark\b/i,
  /\bMomentum\b/i,
  /\bGrowth\b/i,
  /\bKitchen\b/i,
  /\bPATCH\b/,
  /\bAssign\b/,
];

/** @param {string} campaignId */
function buildSlice3aCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 3a Task Plan Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Slice 3a production task plan review",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: ["bf-001", "sm-001", "em-001"],
      includedServiceIds: ["bf-001", "sm-001", "em-001"],
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
          skuId: "em-001",
          serviceName: "Email Campaign Build",
          billingType: "one_time",
          exactPriceCents: 50000,
          priceDisplay: "$500",
          deliverables: ["Email sequence"],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: ["Offer details and destination link"],
          executionResponsibility: "studio",
        },
      ],
      approvedAt: now,
    },
    // Intentionally omitted — direction gate keeps Social / campaign tasks Not ready.
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: {
        workingOn: "Slice 3a mixed campaign review",
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
async function ensureUsers(campaignId) {
  await mkdir(path.dirname(USERS_PATH), { recursive: true });
  let users = [];
  try {
    users = JSON.parse(await readFile(USERS_PATH, "utf8"));
  } catch {
    users = [];
  }
  const tagia = users.find((user) => user.email === OWNER_LOGIN.email);
  if (tagia) tagia.currentCampaignId = campaignId;
  const client = users.find((user) => user.email === CLIENT_LOGIN.email);
  if (client) {
    client.currentCampaignId = campaignId;
    client.roles = ["client"];
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

/** @param {string} campaignId @param {ReturnType<typeof buildSlice3aCampaign>} record */
async function seedCampaign(campaignId, record) {
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
  const tasksRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  if (tasksRes.status !== 200) {
    throw new Error(`Tasks generation failed: ${tasksRes.status}`);
  }
  return { materials: materialsRes.json, tasks: tasksRes.json };
}

/** @param {import('playwright').Page} page @param {{ email: string; password: string }} credentials */
async function loginPage(page, credentials) {
  const res = await page.request.post(`${BASE}/api/auth/login`, { data: credentials });
  if (!res.ok()) throw new Error(`Playwright login failed for ${credentials.email}: ${res.status()}`);
}

/** @param {object} tasksPayload */
function validateTasksPayload(tasksPayload) {
  const tasks = tasksPayload?.tasks ?? [];
  if (tasks.length < 8) {
    throw new Error(`Expected multiple tasks, got ${tasks.length}`);
  }

  const serviceIds = new Set(tasks.flatMap((task) => task.relatedServiceIds ?? []));
  for (const sku of ["bf-001", "sm-001", "em-001"]) {
    if (!serviceIds.has(sku)) throw new Error(`Missing tasks for ${sku}`);
  }
  if (serviceIds.has("sms-001") || serviceIds.has("bf-002")) {
    throw new Error("Unexpected extra service tasks in plan");
  }
  if (!tasks.some((task) => task.id.startsWith("em-001:"))) {
    throw new Error("Missing email tasks — em-001 not represented");
  }

  const directionNotReady = tasks.filter(
    (task) =>
      task.status === "not_ready" &&
      (task.id.startsWith("sm-001:") || task.id === "campaign:producer-kickoff"),
  );
  if (directionNotReady.length === 0) {
    throw new Error("Expected direction-gated Not ready tasks (Social / producer kickoff)");
  }

  const blockedBrand = tasks.find((task) => task.id === "bf-001:strategy");
  if (!blockedBrand || blockedBrand.status !== "blocked") {
    throw new Error(
      `Expected bf-001:strategy blocked, got ${blockedBrand?.status ?? "missing"}`,
    );
  }
  if (!blockedBrand.blockedReason || !/logo/i.test(blockedBrand.blockedReason)) {
    throw new Error(`Brand strategy missing logo blockedReason: ${blockedBrand.blockedReason}`);
  }

  return {
    tasks,
    blockedBrand,
    directionNotReady,
    summary: tasksPayload.summary,
  };
}

/** @param {string} campaignId */
async function captureScreenshot(campaignId) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 2400 } });
  await loginPage(page, OWNER_LOGIN);
  await page.goto(`${BASE}/file-room/${campaignId}`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Production task plan", { timeout: 20000 });
  await page.waitForSelector(".fr-tasks-row", { timeout: 20000 });

  const section = page.locator(".utility-card", { hasText: "Production task plan" });
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const sectionText = await section.innerText();
  for (const pattern of FORBIDDEN_LEAKAGE) {
    if (pattern.test(sectionText)) {
      await browser.close();
      throw new Error(`Forbidden leakage in task plan section: ${pattern}`);
    }
  }

  const statusBadges = await section.locator(".fr-tasks-row__status").count();
  const phaseMeta = await section.locator(".fr-tasks-row__meta").count();
  if (statusBadges < 5 || phaseMeta < 5) {
    await browser.close();
    throw new Error(`Expected visible status/phase on rows (status=${statusBadges}, meta=${phaseMeta})`);
  }

  const blockedReasonVisible = await section.locator(".fr-tasks-row__block-reason").count();
  if (blockedReasonVisible < 1) {
    await browser.close();
    throw new Error("Expected at least one visible blockedReason line");
  }

  await section.screenshot({ path: OUT });
  await browser.close();
  return { statusBadges, phaseMeta, blockedReasonVisible, sectionText };
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

  const campaignId = process.env.SLICE3A_CAMPAIGN_ID ?? randomUUID();
  const record = buildSlice3aCampaign(campaignId);
  console.log(`Seeding campaign ${campaignId}…`);

  await ensureUsers(campaignId);
  const { materials, tasks } = await seedCampaign(campaignId, record);
  const validation = validateTasksPayload(tasks);

  console.log(`Materials blocking count: ${materials?.blockingRequiredCount ?? "n/a"}`);
  console.log(`Tasks: ${validation.tasks.length} (ready=${validation.summary?.ready}, blocked=${validation.summary?.blocked}, notReady=${validation.summary?.notReady})`);

  console.log("Capturing Production task plan screenshot…");
  const capture = await captureScreenshot(campaignId);

  const report = {
    campaignId,
    capturedAt: new Date().toISOString(),
    screenshot: OUT,
    taskSummary: validation.summary,
    blockedBrand: {
      id: validation.blockedBrand.id,
      title: validation.blockedBrand.title,
      status: validation.blockedBrand.status,
      blockedReason: validation.blockedBrand.blockedReason,
    },
    directionNotReady: validation.directionNotReady.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      phase: task.phase,
    })),
    capture,
    committed: false,
  };
  await writeFile(path.join(OUT_DIR, "capture-slice3a-task-plan-report.json"), JSON.stringify(report, null, 2));

  console.log(`\nScreenshot saved: ${OUT}`);
  console.log(`Campaign ID: ${campaignId}`);
  console.log(`Blocked: ${validation.blockedBrand.title} — ${validation.blockedBrand.blockedReason}`);
  console.log(
    `Not ready (direction): ${validation.directionNotReady.map((task) => task.id).join(", ")}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
