/**
 * Slice 3d-b UI proof screenshots — requires dev server on localhost:3000
 * Usage: node scripts/capture-slice3d-b-screenshots.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "scripts", "screenshots", "slice3d-b");
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");

const STAFF_QA_ID = "staff-qa-verify-3d";
const STAFF_PRODUCER_ID = "staff-producer-verify-3d";

const OWNER = { email: "tagia@local.dev", password: "dev-only" };
const QA = { email: "qa-verify-3d@local.dev", password: "dev-only" };
const PRODUCER = { email: "producer-verify-3d@local.dev", password: "dev-only" };
const CLIENT = { email: "client@local.dev", password: "dev-only" };

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
    json = { _raw: text.slice(0, 500) };
  }
  return { status: res.status, json };
}

async function login(credentials) {
  jar.clear();
  const res = await fetchApi("/api/auth/login", { method: "POST", json: credentials });
  if (res.status !== 200) throw new Error(`Login failed for ${credentials.email}: ${res.status}`);
}

function buildCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 3d-b Exceptions UI",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Slice 3d-b UI proof",
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
        workingOn: "UI proof",
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

async function ensureUsers(campaignId) {
  let users = JSON.parse(await readFile(USERS_PATH, "utf8"));
  const upsert = (id, email, displayName, roles) => {
    const existing = users.find((user) => user.id === id);
    if (existing) Object.assign(existing, { email, displayName, roles });
    else users.push({ id, email, password: "dev-only", displayName, roles });
  };
  upsert(STAFF_QA_ID, QA.email, "QA Verify 3d", ["staff"]);
  upsert(STAFF_PRODUCER_ID, PRODUCER.email, "Producer Verify 3d", ["staff"]);
  const client = users.find((user) => user.email === CLIENT.email);
  if (client) Object.assign(client, { currentCampaignId: campaignId, roles: ["client"] });
  else {
    users.push({
      id: "client-verify",
      email: CLIENT.email,
      password: CLIENT.password,
      displayName: "Client Verify",
      roles: ["client"],
      currentCampaignId: campaignId,
    });
  }
  await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

async function assignStaff(campaignId) {
  await writeFile(
    ASSIGNMENTS_PATH,
    JSON.stringify(
      {
        staffByUserId: {
          [STAFF_QA_ID]: [campaignId],
          [STAFF_PRODUCER_ID]: [campaignId],
        },
        staffCapabilities: {
          [STAFF_QA_ID]: ["qa"],
          [STAFF_PRODUCER_ID]: ["producer_dispatcher"],
        },
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function seedCopyReadyForQa(campaignId) {
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
    }
  }
  envelope.exceptionRecords = envelope.exceptionRecords ?? [];
  envelope.exceptionEvents = envelope.exceptionEvents ?? [];
  envelope.version = 5;
  await writeFile(tasksPath, JSON.stringify(envelope, null, 2), "utf8");
}

async function bootstrapCampaign(campaignId) {
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await mkdir(TASKS_DIR, { recursive: true });
  await ensureUsers(campaignId);
  jar.clear();
  await login(OWNER);
  await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildCampaign(campaignId) },
  });
  await assignStaff(campaignId);
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await seedCopyReadyForQa(campaignId);
}

async function browserLogin(page, credentials) {
  await page.goto(`${BASE}/file-room`, { waitUntil: "domcontentloaded" });
  await page.evaluate(async (creds) => {
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
    });
  }, credentials);
  await page.goto(`${BASE}/file-room`, { waitUntil: "domcontentloaded" });
}

async function shot(page, name, selector) {
  const file = path.join(OUT_DIR, `${name}.png`);
  if (selector) {
    const el = page.locator(selector).first();
    await el.scrollIntoViewIfNeeded();
    await el.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: true });
  }
  console.log(`saved ${file}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const campaignId = randomUUID();
  console.log(`campaignId=${campaignId}`);

  await bootstrapCampaign(campaignId);

  jar.clear();
  await login(QA);
  await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "qa_block",
      taskId: "sm-001:copy",
      from: "ready_for_qa",
      claimVersion: null,
      category: "compliance_concern",
      notes: "Unverified claim in headline",
    },
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // 1. Open exceptions with Owner-held labeling (owner view)
  await browserLogin(page, OWNER);
  await page.goto(`${BASE}/file-room/${campaignId}`);
  await page.waitForSelector("#file-room-exceptions");
  await shot(page, "01-open-exceptions-owner-held", "#file-room-exceptions");

  // 5. Task-row badge links to Exceptions section
  await shot(page, "05-task-row-exception-badge", ".fr-tasks-row__exception-badge");

  // 2. Producer raises routine_internal
  await browserLogin(page, PRODUCER);
  await page.goto(`${BASE}/file-room/${campaignId}`);
  await page.getByRole("button", { name: "Raise exception" }).click();
  await page.locator(".fr-exception-panel__select").first().selectOption("routine_internal");
  await page.getByPlaceholder("Short summary of the blocker").fill("Asset export mismatch");
  await page.getByPlaceholder("What happened and what is blocked (optional)").fill("Wrong dimensions in export");
  await shot(page, "02-producer-raise-routine-internal", ".fr-exception-panel");

  await page.locator(".fr-exception-panel").getByRole("button", { name: "Raise exception" }).click();
  await page.waitForTimeout(1000);

  // 3. QA cannot raise client_request (hidden in UI)
  await browserLogin(page, QA);
  await page.goto(`${BASE}/file-room/${campaignId}`);
  await page.getByRole("button", { name: "Raise exception" }).click();
  await shot(page, "03-qa-no-client-request-kind", ".fr-exception-panel");

  // 4. Owner assigns exception to campaign staff
  await browserLogin(page, OWNER);
  await page.goto(`${BASE}/file-room/${campaignId}`);
  const routineRow = page.locator(".fr-exception-row", { hasText: "Routine internal" }).first();
  await routineRow.getByRole("button", { name: "Assign" }).click();
  await page.locator(".fr-exception-panel__select").first().selectOption(STAFF_QA_ID);
  await page.getByPlaceholder("Context for the assignee (optional)").fill("Please verify export dimensions");
  await shot(page, "04-owner-assign-exception", ".fr-exception-row__panel");

  await page.locator(".fr-exception-panel").getByRole("button", { name: "Assign" }).click();
  await page.waitForTimeout(1000);

  // 6. Resolve flow — producer resolves routine (blocker note visible)
  await browserLogin(page, PRODUCER);
  await page.goto(`${BASE}/file-room/${campaignId}`);
  const routineResolve = page.locator(".fr-exception-row", { hasText: "Routine internal" }).first();
  await routineResolve.getByRole("button", { name: "Resolve" }).click();
  await shot(page, "06-resolve-flow-disclaimer", ".fr-exception-panel");
  await page.locator(".fr-exception-panel").getByRole("button", { name: "Resolve" }).click();
  await page.waitForTimeout(1000);

  // 7. Resolved filter/history
  await page.getByRole("tab", { name: /Resolved/ }).click();
  await page.waitForTimeout(300);
  await shot(page, "07-resolved-filter-history", "#file-room-exceptions");

  // 8. Client file-room route — forbidden (no Exceptions section)
  await browserLogin(page, CLIENT);
  await page.goto(`${BASE}/file-room/${campaignId}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const exceptionSection = page.locator("#file-room-exceptions");
  if (await exceptionSection.count()) {
    throw new Error("Client must not see Exceptions section on file-room");
  }
  const fileRoomTarget = (await page.locator(".fr-detail-grid").count())
    ? ".fr-detail-grid"
    : (await page.locator(".fr-state").count())
      ? ".fr-state"
      : "body";
  await shot(page, "08-client-file-room-forbidden", fileRoomTarget);

  // 8b. Client Studio Board — normal customer route, no exception UI
  await page.goto(`${BASE}/studio-board?record=open`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const exceptionUiSelectors = [
    "#file-room-exceptions",
    ".fr-exceptions",
    ".fr-tasks-row__exception-badge",
    ".fr-exception-row",
  ];
  for (const selector of exceptionUiSelectors) {
    if (await page.locator(selector).count()) {
      throw new Error(`Studio Board must not show exception UI: found ${selector}`);
    }
  }
  if (await page.getByRole("button", { name: "Raise exception" }).count()) {
    throw new Error("Studio Board must not show Raise exception control");
  }
  const studioBoardTarget = (await page.locator(".sb-campaign").count())
    ? ".sb-campaign"
    : (await page.locator("main").count())
      ? "main"
      : "body";
  await shot(page, "08b-client-studio-board-no-exceptions", studioBoardTarget);

  await browser.close();
  console.log(`\nScreenshots in ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
