/**
 * Copy Office V1 — screenshot capture for manual QA review packet
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 *
 * Usage: node scripts/capture-copy-office-v1.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp", "copy-office-v1-screenshots");
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const PRODUCTION_DIR = path.join(process.cwd(), "data", "campaign-production");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");

const STAFF_COPY_ID = "staff-copy-capture";
const COPY_LOGIN = { email: "copy-capture@local.dev", password: "dev-only" };
const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };

const VIEWPORT = { width: 1440, height: 900 };

const OUT = {
  queue: path.join(OUT_DIR, "01-copy-office-queue.png"),
  taskOpen: path.join(OUT_DIR, "02-copy-task-open.png"),
  wrongRole: path.join(OUT_DIR, "03-wrong-role-readonly.png"),
};

/** @param {string} campaignId */
function buildCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Copy Office V1 Capture",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Copy Office V1 screenshot campaign",
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
          deliverables: ["Posts", "Content calendar"],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: ["Brand logo and photos"],
          executionResponsibility: "shared",
        },
      ],
      approvedAt: now,
    },
    selectedCampaignOption: "Option A",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: {
        workingOn: "Copy Office V1 capture",
        mainOffer: "Summer launch",
        primaryApproverName: "Client",
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

async function ensureUsers() {
  let users = [];
  try {
    users = JSON.parse(await readFile(USERS_PATH, "utf8"));
  } catch {
    users = [];
  }
  const existing = users.find((user) => user.id === STAFF_COPY_ID);
  if (existing) {
    Object.assign(existing, {
      email: COPY_LOGIN.email,
      displayName: "Copy Capture",
      roles: ["staff"],
      password: "dev-only",
    });
  } else {
    users.push({
      id: STAFF_COPY_ID,
      email: COPY_LOGIN.email,
      password: "dev-only",
      displayName: "Copy Capture",
      roles: ["staff"],
    });
  }
  await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

/** @param {string} campaignId */
async function assignCopyStaff(campaignId) {
  await mkdir(path.dirname(ASSIGNMENTS_PATH), { recursive: true });
  let assignments = { staffByUserId: {}, staffCapabilities: {} };
  try {
    assignments = JSON.parse(await readFile(ASSIGNMENTS_PATH, "utf8"));
  } catch {
    /* fresh */
  }
  assignments.staffByUserId = assignments.staffByUserId ?? {};
  assignments.staffCapabilities = assignments.staffCapabilities ?? {};
  assignments.staffByUserId[STAFF_COPY_ID] = [campaignId];
  assignments.staffCapabilities[STAFF_COPY_ID] = ["copy"];
  await writeFile(ASSIGNMENTS_PATH, JSON.stringify(assignments, null, 2), "utf8");
}

/** @param {string} campaignId */
async function seedCampaign(campaignId) {
  jar.clear();
  await loginApi(OWNER_LOGIN);
  const syncRes = await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildCampaign(campaignId) },
  });
  if (syncRes.status !== 200) {
    throw new Error(`Campaign sync failed: ${syncRes.status} ${JSON.stringify(syncRes.json)}`);
  }
  await fetchApi(`/api/campaigns/${campaignId}/production`);
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await fetchApi(`/api/campaigns/${campaignId}/materials`);
}

/**
 * Strategy complete + copy claimed with saved version (Submit to QA ready).
 * @param {string} campaignId
 */
async function prepareCopyWorkState(campaignId) {
  const tasksPath = path.join(TASKS_DIR, `${campaignId}.json`);
  const productionPath = path.join(PRODUCTION_DIR, `${campaignId}.json`);
  const now = new Date().toISOString();
  const strategyVersionId = randomUUID();
  const copyVersionId = randomUUID();

  const production = JSON.parse(await readFile(productionPath, "utf8"));
  const tasks = JSON.parse(await readFile(tasksPath, "utf8"));
  const workUnit = production.workUnits[0];
  if (!workUnit) throw new Error("No work unit in production envelope");

  const strategyBody =
    "Content direction: Focus on summer launch for the flagship offer. Tone: warm, confident, approachable. Primary CTA: book now.";
  const copyBody =
    "Headline: Your summer starts here.\n\nBody: Launch week is almost here — warm, confident copy aligned to strategy direction. Draft v1 ready for QA.";

  production.versions = [
    {
      id: strategyVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:strategy_content_direction",
      stage: "strategy_content_direction",
      reason: "initial",
      contentKind: "plain_text",
      body: strategyBody,
      createdAt: now,
      createdByUserId: STAFF_COPY_ID,
      createdByDisplayName: "Copy Capture",
    },
    {
      id: copyVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:copy",
      stage: "copy",
      reason: "initial",
      contentKind: "plain_text",
      body: copyBody,
      createdAt: now,
      createdByUserId: STAFF_COPY_ID,
      createdByDisplayName: "Copy Capture",
    },
  ];

  production.workUnits = production.workUnits.map((unit) => ({
    ...unit,
    currentStage: "copy",
    currentTaskId: "sm-001:copy",
    stageLineage: unit.stageLineage.map((line) => {
      if (line.stage === "strategy_content_direction") {
        return { ...line, currentVersionId: strategyVersionId };
      }
      if (line.stage === "copy") {
        return { ...line, currentVersionId: copyVersionId };
      }
      return line;
    }),
    updatedAt: now,
  }));
  production.updatedAt = now;
  production.syncedAt = now;

  for (const task of tasks.tasks ?? []) {
    if (task.id === "sm-001:strategy_content_direction") {
      task.workflowState = "complete";
      task.status = "complete";
      delete task.claimedByUserId;
      delete task.claimedAt;
    }
    if (task.id === "sm-001:copy") {
      task.workflowState = "in_progress";
      task.status = "in_progress";
      task.claimedByUserId = STAFF_COPY_ID;
      task.claimedByDisplayName = "Copy Capture";
      task.claimedAt = now;
    }
  }
  tasks.updatedAt = now;
  tasks.syncedAt = now;

  await writeFile(productionPath, JSON.stringify(production, null, 2), "utf8");
  await writeFile(tasksPath, JSON.stringify(tasks, null, 2), "utf8");
}

/** @param {import('playwright').Page} page @param {{ email: string; password: string }} credentials */
async function loginPage(page, credentials) {
  const res = await page.request.post(`${BASE}/api/auth/login`, { data: credentials });
  if (!res.ok()) throw new Error(`Playwright login failed: ${res.status()}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await mkdir(TASKS_DIR, { recursive: true });
  await mkdir(PRODUCTION_DIR, { recursive: true });

  const campaignId = `copy-office-v1-${randomUUID().slice(0, 8)}`;
  await ensureUsers();
  await seedCampaign(campaignId);
  await assignCopyStaff(campaignId);
  await prepareCopyWorkState(campaignId);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });

  try {
    await loginPage(page, COPY_LOGIN);

    const officeBase = `${BASE}/file-room/${campaignId}/office/copy`;

    // 01 — queue view (default selected copy task)
    await page.goto(officeBase, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector(".fr-office-grid", { timeout: 30000 });
    await page.waitForSelector("text=Copy queue", { timeout: 15000 });
    await page.locator(".fr-office-grid").screenshot({ path: OUT.queue });

    // 02 — copy task open with strategy context + draft + Submit to QA
    await page.goto(`${officeBase}?task=sm-001:copy`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector(".fr-production-work", { timeout: 30000 });
    await page.waitForSelector("text=Submit to QA", { timeout: 15000 });
    await page.waitForSelector("text=Strategy context", { timeout: 15000 });
    await page.locator(".fr-office-grid").screenshot({ path: OUT.taskOpen });

    // 03 — wrong-role deep link (strategy task in copy office)
    await page.goto(
      `${officeBase}?task=${encodeURIComponent("sm-001:strategy_content_direction")}`,
      { waitUntil: "networkidle", timeout: 60000 },
    );
    await page.waitForSelector("text=Read-only — this work belongs to another production role.", {
      timeout: 15000,
    });
    await page.locator(".fr-office-grid").screenshot({ path: OUT.wrongRole });

    await writeFile(
      path.join(OUT_DIR, "README.txt"),
      [
        `Copy Office V1 screenshots`,
        `Campaign ID: ${campaignId}`,
        `Viewport: ${VIEWPORT.width}x${VIEWPORT.height} (100% zoom, viewport screenshot — not full-page)`,
        ``,
        `URLs:`,
        `  Queue: ${officeBase}`,
        `  Copy task: ${officeBase}?task=sm-001:copy`,
        `  Wrong role: ${officeBase}?task=sm-001:strategy_content_direction`,
        ``,
        `Login: ${COPY_LOGIN.email} / dev-only`,
        ``,
        `Screenshots:`,
        `  ${OUT.queue}`,
        `  ${OUT.taskOpen}`,
        `  ${OUT.wrongRole}`,
        `Captured: ${new Date().toISOString()}`,
      ].join("\n"),
      "utf8",
    );

    console.log(`Campaign ID: ${campaignId}`);
    for (const [key, filePath] of Object.entries(OUT)) {
      console.log(`  ${key}: ${filePath}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
