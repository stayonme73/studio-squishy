/**
 * Slice 3c-b — QA panel screenshots
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 *
 * Usage: node scripts/capture-slice3c-qa.mjs
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
const STAFF_QA_ID = "staff-qa-capture";
const STAFF_COPY_ID = "staff-copy-capture";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const QA_LOGIN = { email: "qa-capture@local.dev", password: "dev-only" };

const OUT = {
  readyPanel: path.join(OUT_DIR, "slice3c-qa-ready-panel.png"),
  passResult: path.join(OUT_DIR, "slice3c-qa-pass-result.png"),
  failRevision: path.join(OUT_DIR, "slice3c-qa-fail-revision.png"),
  block: path.join(OUT_DIR, "slice3c-qa-block.png"),
  history: path.join(OUT_DIR, "slice3c-qa-history.png"),
  conflict409: path.join(OUT_DIR, "slice3c-qa-409-conflict.png"),
};

const UNIVERSAL_CHECKS = [
  "scope_match",
  "factual_accuracy",
  "direction_match",
  "usability",
  "client_safe_packaging",
];
const COPY_CHECKS = [...UNIVERSAL_CHECKS, "copy_accuracy", "brand_voice", "grammar"];

/** @param {string} campaignId */
function buildCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 3c-b QA Capture",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Slice 3c-b capture",
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
        workingOn: "Capture QA UI",
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

async function ensureUsers(campaignId) {
  await mkdir(path.dirname(USERS_PATH), { recursive: true });
  let users = [];
  try {
    users = JSON.parse(await readFile(USERS_PATH, "utf8"));
  } catch {
    users = [];
  }
  const upsert = (id, email, displayName, roles) => {
    const existing = users.find((user) => user.id === id);
    if (existing) Object.assign(existing, { email, displayName, roles });
    else users.push({ id, email, password: "dev-only", displayName, roles });
  };
  upsert(STAFF_QA_ID, QA_LOGIN.email, "QA Capture", ["staff"]);
  upsert(STAFF_COPY_ID, "copy-capture@local.dev", "Copy Capture", ["staff"]);
  await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

async function assignStaff(campaignId) {
  await mkdir(path.dirname(ASSIGNMENTS_PATH), { recursive: true });
  await writeFile(
    ASSIGNMENTS_PATH,
    JSON.stringify(
      {
        staffByUserId: {
          [STAFF_QA_ID]: [campaignId],
          [STAFF_COPY_ID]: [campaignId],
        },
        staffCapabilities: {
          [STAFF_QA_ID]: ["qa"],
          [STAFF_COPY_ID]: ["copy"],
        },
      },
      null,
      2,
    ),
    "utf8",
  );
}

/** @param {string} campaignId */
async function setCopyReadyForQa(campaignId) {
  const tasksPath = path.join(TASKS_DIR, `${campaignId}.json`);
  const envelope = JSON.parse(await readFile(tasksPath, "utf8"));
  for (const task of envelope.tasks ?? []) {
    if (task.id === "sm-001:strategy_content_direction") {
      task.workflowState = "complete";
      task.status = "complete";
    }
    if (task.id === "sm-001:copy") {
      task.workflowState = "ready_for_qa";
      task.status = "ready_for_qa";
      delete task.claimedByUserId;
      delete task.claimedByDisplayName;
      delete task.claimedAt;
      delete task.workflowBlockedReason;
      delete task.blockedReason;
    }
  }
  envelope.qaRecords = envelope.qaRecords ?? [];
  await writeFile(tasksPath, JSON.stringify(envelope, null, 2), "utf8");
}

/** @param {{ email: string; password: string }} credentials */
async function loginPage(page, credentials) {
  const res = await page.request.post(`${BASE}/api/auth/login`, { data: credentials });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()}`);
}

async function checkAllCopyChecklist(row) {
  const inputs = row.locator(".fr-qa-panel__checkbox input");
  const count = await inputs.count();
  for (let i = 0; i < count; i++) {
    await inputs.nth(i).check();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await mkdir(TASKS_DIR, { recursive: true });

  const campaignId = process.env.SLICE3C_CAMPAIGN_ID ?? randomUUID();
  jar.clear();
  await fetchApi("/api/auth/login", { method: "POST", json: OWNER_LOGIN });
  await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildCampaign(campaignId) },
  });
  await ensureUsers(campaignId);
  await assignStaff(campaignId);
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await setCopyReadyForQa(campaignId);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
  await loginPage(page, QA_LOGIN);

  const section = () => page.locator(".utility-card", { hasText: "Production task plan" });
  const copyRow = () => section().locator(".fr-tasks-row", { hasText: "Social Media Launch Set — Copy" }).first();

  await page.goto(`${BASE}/file-room/${campaignId}`, { waitUntil: "networkidle" });
  await section().waitFor({ timeout: 20000 });
  await copyRow().scrollIntoViewIfNeeded();

  await copyRow().getByRole("button", { name: "QA review" }).click();
  await page.waitForTimeout(400);
  await copyRow().screenshot({ path: OUT.readyPanel });

  await checkAllCopyChecklist(copyRow());
  await copyRow().getByRole("button", { name: "Pass QA" }).click();
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: "networkidle" });
  await copyRow().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await copyRow().screenshot({ path: OUT.passResult });
  await copyRow().screenshot({ path: OUT.history });

  await setCopyReadyForQa(campaignId);
  await page.reload({ waitUntil: "networkidle" });
  await copyRow().getByRole("button", { name: "QA review" }).click();
  await copyRow().locator(".fr-qa-panel select").selectOption("production_correction");
  await copyRow().locator(".fr-qa-panel textarea").first().fill("Revise headline tone.");
  await copyRow().getByRole("button", { name: "Fail QA" }).click();
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: "networkidle" });
  await copyRow().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await copyRow().screenshot({ path: OUT.failRevision });

  await setCopyReadyForQa(campaignId);
  await page.reload({ waitUntil: "networkidle" });
  await copyRow().getByRole("button", { name: "QA review" }).click();
  await copyRow().locator(".fr-qa-panel select").selectOption("compliance_concern");
  await copyRow().getByRole("button", { name: "Block" }).click();
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: "networkidle" });
  await copyRow().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await copyRow().screenshot({ path: OUT.block });

  await setCopyReadyForQa(campaignId);
  await page.reload({ waitUntil: "networkidle" });
  await copyRow().getByRole("button", { name: "QA review" }).click();
  await page.waitForTimeout(400);

  const tasksPath = path.join(TASKS_DIR, `${campaignId}.json`);
  const staleEnvelope = JSON.parse(await readFile(tasksPath, "utf8"));
  for (const task of staleEnvelope.tasks ?? []) {
    if (task.id === "sm-001:copy") {
      task.workflowState = "complete";
      task.status = "complete";
    }
  }
  await writeFile(tasksPath, JSON.stringify(staleEnvelope, null, 2), "utf8");

  await checkAllCopyChecklist(copyRow());
  await copyRow().getByRole("button", { name: "Pass QA" }).click();
  await copyRow().locator("[role='alert']").waitFor({ timeout: 10000 });
  await page.waitForTimeout(300);
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
    path.join(OUT_DIR, "capture-slice3c-qa-report.json"),
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
