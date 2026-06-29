/**
 * Slice 3b-b-b — Production task controls screenshots
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 *
 * Usage: node scripts/capture-slice3b-task-controls.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp");
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const STAFF_USER_ID = "staff-dev";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const STAFF_LOGIN = { email: "staff@local.dev", password: "dev-only" };

const OUT = {
  readyClaim: path.join(OUT_DIR, "slice3b-task-ready-claim.png"),
  claimedControls: path.join(OUT_DIR, "slice3b-task-claimed-controls.png"),
  reassign: path.join(OUT_DIR, "slice3b-task-reassign.png"),
  handoffCleared: path.join(OUT_DIR, "slice3b-task-handoff-cleared.png"),
  conflict409: path.join(OUT_DIR, "slice3b-task-409-conflict.png"),
};

/** @param {string} campaignId */
function buildCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 3b Task Controls Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Slice 3b-b-b capture",
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
    selectedCampaignOption: "Option A — Bold",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: {
        workingOn: "Capture task controls",
        mainOffer: "Summer special",
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
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 500) };
  }
  return { status: res.status, json, text };
}

async function ensureStaffSeedUser() {
  await mkdir(path.dirname(USERS_PATH), { recursive: true });
  let users = [];
  try {
    users = JSON.parse(await readFile(USERS_PATH, "utf8"));
  } catch {
    users = [];
  }
  if (!users.some((user) => user.id === STAFF_USER_ID)) {
    users.push({
      id: STAFF_USER_ID,
      email: STAFF_LOGIN.email,
      password: STAFF_LOGIN.password,
      displayName: "Staff Dev",
      roles: ["staff"],
    });
    await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
  }
}

async function assignStaff(campaignId) {
  await mkdir(path.dirname(ASSIGNMENTS_PATH), { recursive: true });
  await writeFile(
    ASSIGNMENTS_PATH,
    JSON.stringify(
      {
        staffByUserId: { [STAFF_USER_ID]: [campaignId] },
        staffCapabilities: {
          [STAFF_USER_ID]: ["copy", "creative_production", "producer_dispatcher"],
        },
      },
      null,
      2,
    ),
    "utf8",
  );
}

/** @param {string} campaignId */
async function unlockCopyTask(campaignId) {
  const tasksPath = path.join(TASKS_DIR, `${campaignId}.json`);
  const raw = await readFile(tasksPath, "utf8");
  const envelope = JSON.parse(raw);
  for (const task of envelope.tasks ?? []) {
    if (task.id === "sm-001:strategy_content_direction") {
      task.workflowState = "complete";
      task.status = "complete";
    }
    if (task.id === "sm-001:copy") {
      task.workflowState = "unstarted";
      task.status = "ready";
      delete task.claimedByUserId;
      delete task.claimedByDisplayName;
      delete task.claimedAt;
    }
  }
  await writeFile(tasksPath, JSON.stringify(envelope, null, 2), "utf8");
}

/** @param {{ email: string; password: string }} credentials */
async function loginPage(page, credentials) {
  const res = await page.request.post(`${BASE}/api/auth/login`, { data: credentials });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await mkdir(TASKS_DIR, { recursive: true });

  const campaignId = process.env.SLICE3B_CAMPAIGN_ID ?? randomUUID();
  const record = buildCampaign(campaignId);

  jar.clear();
  await fetchApi("/api/auth/login", { method: "POST", json: OWNER_LOGIN });
  await fetchApi("/api/campaigns/current", { method: "PATCH", json: { record } });
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await ensureStaffSeedUser();
  await assignStaff(campaignId);
  await unlockCopyTask(campaignId);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
  await loginPage(page, STAFF_LOGIN);

  const section = () => page.locator(".utility-card", { hasText: "Production task plan" });
  const copyRow = () => section().locator(".fr-tasks-row", { hasText: "Copy" }).first();

  await page.goto(`${BASE}/file-room/${campaignId}`, { waitUntil: "networkidle" });
  await section().waitFor({ timeout: 20000 });
  await copyRow().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await copyRow().screenshot({ path: OUT.readyClaim });

  await copyRow().getByRole("button", { name: "Claim" }).click();
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: "networkidle" });
  await copyRow().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await copyRow().screenshot({ path: OUT.claimedControls });

  await copyRow().getByRole("button", { name: "Reassign" }).click();
  await page.waitForTimeout(400);
  await copyRow().screenshot({ path: OUT.reassign });

  await copyRow().getByRole("button", { name: "Cancel" }).click();
  await copyRow().getByRole("button", { name: "Submit handoff" }).click();
  await copyRow().locator("textarea").nth(0).fill("Draft complete.");
  await copyRow().locator("textarea").nth(1).fill("Approved direction.");
  await copyRow().locator("textarea").nth(2).fill("QA review.");
  await copyRow().getByRole("button", { name: "Confirm submit" }).click();
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: "networkidle" });
  await copyRow().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await copyRow().screenshot({ path: OUT.handoffCleared });

  await unlockCopyTask(campaignId);
  await page.reload({ waitUntil: "networkidle" });
  await copyRow().getByRole("button", { name: "Claim" }).click();
  await page.waitForTimeout(600);

  const tasksPath = path.join(TASKS_DIR, `${campaignId}.json`);
  const envelope = JSON.parse(await readFile(tasksPath, "utf8"));
  for (const task of envelope.tasks ?? []) {
    if (task.id === "sm-001:copy") task.claimedAt = "1999-01-01T00:00:00.000Z";
  }
  await writeFile(tasksPath, JSON.stringify(envelope, null, 2), "utf8");

  await copyRow().getByRole("button", { name: "Release claim" }).click();
  await copyRow().locator("textarea").nth(0).fill("Releasing stale claim.");
  await copyRow().locator("textarea").nth(1).fill("Prior context.");
  await copyRow().locator("textarea").nth(2).fill("Next steps.");
  await copyRow().getByRole("button", { name: "Confirm release" }).click();
  await page.waitForTimeout(600);
  await copyRow().scrollIntoViewIfNeeded();
  await copyRow().screenshot({ path: OUT.conflict409 });

  await browser.close();

  const report = {
    campaignId,
    capturedAt: new Date().toISOString(),
    screenshots: OUT,
    committed: false,
  };
  await writeFile(
    path.join(OUT_DIR, "capture-slice3b-task-controls-report.json"),
    JSON.stringify(report, null, 2),
  );

  console.log("Screenshots saved:");
  for (const [key, filePath] of Object.entries(OUT)) {
    console.log(`  ${key}: ${filePath}`);
  }
  console.log(`Campaign ID: ${campaignId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
