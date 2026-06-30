/**
 * Team Offices V1 — screenshot capture for consolidated review packet
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 *
 * Usage: node scripts/capture-team-offices-v1.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp", "team-offices-v1-screenshots");
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const PRODUCTION_DIR = path.join(process.cwd(), "data", "campaign-production");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const VIEWPORT = { width: 1440, height: 900 };

const OUT = {
  strategy: path.join(OUT_DIR, "01-strategy-office.png"),
  copy: path.join(OUT_DIR, "02-copy-office.png"),
  creative: path.join(OUT_DIR, "03-creative-office.png"),
  qa: path.join(OUT_DIR, "04-qa-office.png"),
  producer: path.join(OUT_DIR, "05-producer-office.png"),
};

/** @param {string} campaignId */
function buildCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Team Offices V1 Capture",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Team Offices V1 consolidated screenshot campaign",
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
        workingOn: "Team Offices V1 capture",
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

/** @param {string} campaignId @param {string} now */
async function writeStrategyState(campaignId, now) {
  const strategyVersionId = randomUUID();
  const production = JSON.parse(
    await readFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), "utf8"),
  );
  const tasks = JSON.parse(await readFile(path.join(TASKS_DIR, `${campaignId}.json`), "utf8"));
  const workUnit = production.workUnits[0];
  const strategyBody =
    "Content direction: Focus on summer launch. Tone: warm, confident. Primary CTA: book now.";

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
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
  ];
  production.workUnits = production.workUnits.map((unit) => ({
    ...unit,
    currentStage: "strategy_content_direction",
    currentTaskId: "sm-001:strategy_content_direction",
    stageLineage: unit.stageLineage.map((line) =>
      line.stage === "strategy_content_direction"
        ? { ...line, currentVersionId: strategyVersionId }
        : line,
    ),
    updatedAt: now,
  }));
  production.updatedAt = now;
  production.syncedAt = now;

  for (const task of tasks.tasks ?? []) {
    if (task.id === "sm-001:strategy_content_direction") {
      task.workflowState = "in_progress";
      task.status = "in_progress";
      task.claimedByUserId = "tagia";
      task.claimedByDisplayName = "Owner";
      task.claimedAt = now;
    }
  }
  tasks.updatedAt = now;
  tasks.syncedAt = now;
  tasks.handoffs = [];
  tasks.qaRecords = [];

  await writeFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), JSON.stringify(production, null, 2));
  await writeFile(path.join(TASKS_DIR, `${campaignId}.json`), JSON.stringify(tasks, null, 2));
}

/** @param {string} campaignId @param {string} now */
async function writeCopyState(campaignId, now) {
  const strategyVersionId = randomUUID();
  const copyVersionId = randomUUID();
  const production = JSON.parse(
    await readFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), "utf8"),
  );
  const tasks = JSON.parse(await readFile(path.join(TASKS_DIR, `${campaignId}.json`), "utf8"));
  const workUnit = production.workUnits[0];

  production.versions = [
    {
      id: strategyVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:strategy_content_direction",
      stage: "strategy_content_direction",
      reason: "initial",
      contentKind: "plain_text",
      body: "Strategy direction approved.",
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
    {
      id: copyVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:copy",
      stage: "copy",
      reason: "initial",
      contentKind: "plain_text",
      body: "Headline: Your summer starts here.\n\nBody: Launch week copy draft v1.",
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
  ];
  production.workUnits = production.workUnits.map((unit) => ({
    ...unit,
    currentStage: "copy",
    currentTaskId: "sm-001:copy",
    stageLineage: unit.stageLineage.map((line) => {
      if (line.stage === "strategy_content_direction") return { ...line, currentVersionId: strategyVersionId };
      if (line.stage === "copy") return { ...line, currentVersionId: copyVersionId };
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
      task.claimedByUserId = "tagia";
      task.claimedByDisplayName = "Owner";
      task.claimedAt = now;
    }
  }
  tasks.updatedAt = now;
  tasks.syncedAt = now;

  await writeFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), JSON.stringify(production, null, 2));
  await writeFile(path.join(TASKS_DIR, `${campaignId}.json`), JSON.stringify(tasks, null, 2));
}

/** @param {string} campaignId @param {string} now */
async function writeBlockedCreativeState(campaignId, now) {
  const strategyVersionId = randomUUID();
  const copyVersionId = randomUUID();
  const creativeVersionId = randomUUID();
  const production = JSON.parse(
    await readFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), "utf8"),
  );
  const tasks = JSON.parse(await readFile(path.join(TASKS_DIR, `${campaignId}.json`), "utf8"));
  const workUnit = production.workUnits[0];

  production.versions = [
    {
      id: strategyVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:strategy_content_direction",
      stage: "strategy_content_direction",
      reason: "initial",
      contentKind: "plain_text",
      body: "Strategy direction approved.",
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
    {
      id: copyVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:copy",
      stage: "copy",
      reason: "initial",
      contentKind: "plain_text",
      body: "Copy approved for creative handoff.",
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
    {
      id: creativeVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:creative",
      stage: "creative",
      reason: "initial",
      contentKind: "plain_text",
      body: "Creative bundle draft — blocked pending compliance review.",
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
  ];
  production.workUnits = production.workUnits.map((unit) => ({
    ...unit,
    currentStage: "creative",
    currentTaskId: "sm-001:creative",
    stageLineage: unit.stageLineage.map((line) => {
      if (line.stage === "strategy_content_direction") return { ...line, currentVersionId: strategyVersionId };
      if (line.stage === "copy") return { ...line, currentVersionId: copyVersionId };
      if (line.stage === "creative") return { ...line, currentVersionId: creativeVersionId };
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
    }
    if (task.id === "sm-001:copy") {
      task.workflowState = "complete";
      task.status = "complete";
      delete task.claimedByUserId;
    }
    if (task.id === "sm-001:creative") {
      task.workflowState = "blocked";
      task.status = "blocked";
      task.workflowBlockedReason = "compliance_hold";
      task.blockedReason = "compliance_hold";
      task.claimedByUserId = "tagia";
      task.claimedByDisplayName = "Owner";
      task.claimedAt = now;
    }
  }
  tasks.updatedAt = now;
  tasks.syncedAt = now;

  await writeFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), JSON.stringify(production, null, 2));
  await writeFile(path.join(TASKS_DIR, `${campaignId}.json`), JSON.stringify(tasks, null, 2));
}

/** @param {string} campaignId @param {string} now */
async function writeCreativeState(campaignId, now) {
  const strategyVersionId = randomUUID();
  const copyVersionId = randomUUID();
  const creativeVersionId = randomUUID();
  const production = JSON.parse(
    await readFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), "utf8"),
  );
  const tasks = JSON.parse(await readFile(path.join(TASKS_DIR, `${campaignId}.json`), "utf8"));
  const workUnit = production.workUnits[0];

  production.versions = [
    {
      id: strategyVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:strategy_content_direction",
      stage: "strategy_content_direction",
      reason: "initial",
      contentKind: "plain_text",
      body: "Strategy direction approved.",
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
    {
      id: copyVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:copy",
      stage: "copy",
      reason: "initial",
      contentKind: "plain_text",
      body: "Copy approved for creative handoff.",
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
    {
      id: creativeVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:creative",
      stage: "creative",
      reason: "initial",
      contentKind: "plain_text",
      body: "Creative bundle draft — visual concepts and asset list.",
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
  ];
  production.workUnits = production.workUnits.map((unit) => ({
    ...unit,
    currentStage: "creative",
    currentTaskId: "sm-001:creative",
    stageLineage: unit.stageLineage.map((line) => {
      if (line.stage === "strategy_content_direction") return { ...line, currentVersionId: strategyVersionId };
      if (line.stage === "copy") return { ...line, currentVersionId: copyVersionId };
      if (line.stage === "creative") return { ...line, currentVersionId: creativeVersionId };
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
    }
    if (task.id === "sm-001:copy") {
      task.workflowState = "complete";
      task.status = "complete";
      delete task.claimedByUserId;
    }
    if (task.id === "sm-001:creative") {
      task.workflowState = "in_progress";
      task.status = "in_progress";
      task.claimedByUserId = "tagia";
      task.claimedByDisplayName = "Owner";
      task.claimedAt = now;
    }
  }
  tasks.updatedAt = now;
  tasks.syncedAt = now;

  await writeFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), JSON.stringify(production, null, 2));
  await writeFile(path.join(TASKS_DIR, `${campaignId}.json`), JSON.stringify(tasks, null, 2));
}

/** @param {string} campaignId @param {string} now @param {string} copyVersionId */
async function writeQaState(campaignId, now, copyVersionId) {
  const strategyVersionId = randomUUID();
  const production = JSON.parse(
    await readFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), "utf8"),
  );
  const tasks = JSON.parse(await readFile(path.join(TASKS_DIR, `${campaignId}.json`), "utf8"));
  const workUnit = production.workUnits[0];

  production.versions = [
    {
      id: strategyVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:strategy_content_direction",
      stage: "strategy_content_direction",
      reason: "initial",
      contentKind: "plain_text",
      body: "Strategy direction approved.",
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
    {
      id: copyVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:copy",
      stage: "copy",
      reason: "initial",
      contentKind: "plain_text",
      body: "Copy submitted for QA review.",
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
  ];
  production.workUnits = production.workUnits.map((unit) => ({
    ...unit,
    currentStage: "copy",
    currentTaskId: "sm-001:copy",
    stageLineage: unit.stageLineage.map((line) => {
      if (line.stage === "strategy_content_direction") return { ...line, currentVersionId: strategyVersionId };
      if (line.stage === "copy") return { ...line, currentVersionId: copyVersionId };
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
    }
    if (task.id === "sm-001:copy") {
      task.workflowState = "ready_for_qa";
      task.status = "ready_for_qa";
      delete task.claimedByUserId;
      delete task.claimedAt;
    }
    if (task.id === "sm-001:creative") {
      task.workflowState = "unstarted";
      task.status = "not_ready";
    }
  }
  tasks.handoffs = [
    {
      id: randomUUID(),
      taskId: "sm-001:copy",
      fromRole: "copy",
      toRole: "qa",
      action: "submit_for_handoff",
      completedSummary: "Copy draft v1 complete.",
      sourceContext: "Strategy direction approved.",
      nextSteps: "QA review copy.",
      workVersionId: copyVersionId,
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
  ];
  tasks.updatedAt = now;
  tasks.syncedAt = now;

  await writeFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), JSON.stringify(production, null, 2));
  await writeFile(path.join(TASKS_DIR, `${campaignId}.json`), JSON.stringify(tasks, null, 2));
}

/** @param {string} campaignId @param {string} now */
async function writeProducerDispatchState(campaignId, now) {
  const strategyVersionId = randomUUID();
  const copyVersionId = randomUUID();
  const creativeVersionId = randomUUID();
  const production = JSON.parse(
    await readFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), "utf8"),
  );
  const tasks = JSON.parse(await readFile(path.join(TASKS_DIR, `${campaignId}.json`), "utf8"));
  const workUnit = production.workUnits[0];

  production.versions = [
    {
      id: strategyVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:strategy_content_direction",
      stage: "strategy_content_direction",
      reason: "initial",
      contentKind: "plain_text",
      body: "Strategy complete.",
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
    {
      id: copyVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:copy",
      stage: "copy",
      reason: "initial",
      contentKind: "plain_text",
      body: "Copy awaiting QA.",
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
    {
      id: creativeVersionId,
      workUnitId: workUnit.id,
      taskId: "sm-001:creative",
      stage: "creative",
      reason: "initial",
      contentKind: "plain_text",
      body: "Creative needs revision.",
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
  ];
  production.workUnits = production.workUnits.map((unit) => ({
    ...unit,
    currentStage: "creative",
    currentTaskId: "sm-001:creative",
    stageLineage: unit.stageLineage.map((line) => {
      if (line.stage === "strategy_content_direction") return { ...line, currentVersionId: strategyVersionId };
      if (line.stage === "copy") return { ...line, currentVersionId: copyVersionId };
      if (line.stage === "creative") return { ...line, currentVersionId: creativeVersionId };
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
    }
    if (task.id === "sm-001:copy") {
      task.workflowState = "ready_for_qa";
      task.status = "ready_for_qa";
      delete task.claimedByUserId;
    }
    if (task.id === "sm-001:creative") {
      task.workflowState = "needs_revision";
      task.status = "needs_revision";
      delete task.claimedByUserId;
    }
  }
  tasks.handoffs = [
    {
      id: randomUUID(),
      taskId: "sm-001:copy",
      fromRole: "copy",
      toRole: "qa",
      action: "submit_for_handoff",
      completedSummary: "Copy submitted for QA.",
      sourceContext: "Strategy approved.",
      nextSteps: "QA review.",
      workVersionId: copyVersionId,
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
    {
      id: randomUUID(),
      taskId: "sm-001:creative",
      fromRole: "creative_production",
      toRole: "qa",
      action: "submit_for_handoff",
      completedSummary: "Creative bundle submitted.",
      sourceContext: "Copy approved.",
      nextSteps: "QA failed — needs revision.",
      workVersionId: creativeVersionId,
      createdAt: now,
      createdByUserId: "tagia",
      createdByDisplayName: "Owner",
    },
  ];
  tasks.updatedAt = now;
  tasks.syncedAt = now;

  await writeFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), JSON.stringify(production, null, 2));
  await writeFile(path.join(TASKS_DIR, `${campaignId}.json`), JSON.stringify(tasks, null, 2));
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

  const campaignId = `team-offices-v1-${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const copyVersionIdForQa = randomUUID();

  await seedCampaign(campaignId);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });

  try {
    await loginPage(page, OWNER_LOGIN);

    // 01 — Strategy Office
    await writeStrategyState(campaignId, now);
    await page.goto(`${BASE}/file-room/${campaignId}/office/strategy?task=sm-001:strategy_content_direction`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForSelector(".fr-office-grid", { timeout: 30000 });
    await page.waitForSelector("text=Strategy queue", { timeout: 15000 });
    await page.waitForSelector("text=Submit to QA", { timeout: 15000 });
    await page.waitForSelector("button:has-text('Reassign')", { state: "hidden", timeout: 5000 }).catch(() => {});
    const strategyReassign = await page.locator("button:has-text('Reassign')").count();
    if (strategyReassign > 0) {
      throw new Error("Strategy office should not show Reassign");
    }
    await page.locator(".fr-office-grid").screenshot({ path: OUT.strategy });

    // 02 — Copy Office
    await writeCopyState(campaignId, now);
    await page.goto(`${BASE}/file-room/${campaignId}/office/copy?task=sm-001:copy`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForSelector("text=Copy queue", { timeout: 15000 });
    await page.waitForSelector("text=Strategy context", { timeout: 15000 });
    const copyReassign = await page.locator("button:has-text('Reassign')").count();
    if (copyReassign > 0) {
      throw new Error("Copy office should not show Reassign");
    }
    await page.locator(".fr-office-grid").screenshot({ path: OUT.copy });

    // 03 — Creative Office (blocked — no editable controls)
    await writeBlockedCreativeState(campaignId, now);
    await page.goto(`${BASE}/file-room/${campaignId}/office/creative_production?task=sm-001:creative`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForSelector("text=Creative queue", { timeout: 15000 });
    await page.waitForSelector(".fr-tasks-row__block-reason, .fr-tasks-row__block-guidance", {
      timeout: 15000,
    });
    const saveVersion = await page.locator("button:has-text('Save version')").count();
    const submitQa = await page.locator("button:has-text('Submit to QA')").count();
    if (saveVersion > 0 || submitQa > 0) {
      throw new Error("Blocked creative task should not show Save version or Submit to QA");
    }
    await page.locator(".fr-office-grid").screenshot({ path: OUT.creative });

    // 04 — QA Office
    await writeQaState(campaignId, now, copyVersionIdForQa);
    await page.goto(`${BASE}/file-room/${campaignId}/office/qa?task=sm-001:copy`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForSelector("text=QA queue", { timeout: 15000 });
    await page.waitForSelector("text=QA review", { timeout: 15000 });
    await page.locator("button:has-text('QA review')").click();
    await page.waitForSelector("text=Pass QA", { timeout: 15000 });
    await page.locator(".fr-office-grid").screenshot({ path: OUT.qa });

    // 05 — Producer Office
    await writeProducerDispatchState(campaignId, now);
    await page.goto(`${BASE}/file-room/${campaignId}/office/producer_dispatcher?task=sm-001:creative`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForSelector("text=Dispatch board", { timeout: 15000 });
    await page.waitForSelector("text=Needs revision", { timeout: 15000 });
    await page.waitForSelector("button:has-text('Reassign')", { timeout: 15000 });
    await page.locator(".fr-office-grid").screenshot({ path: OUT.producer });

    const readme = [
      "Team Offices V1 screenshots",
      `Campaign ID: ${campaignId}`,
      `Viewport: ${VIEWPORT.width}x${VIEWPORT.height} (100% zoom, viewport screenshot — not full-page)`,
      "",
      "Login: tagia@local.dev / dev-only (owner — all offices)",
      "",
      "URLs:",
      `  Strategy:  ${BASE}/file-room/${campaignId}/office/strategy?task=sm-001:strategy_content_direction`,
      `  Copy:      ${BASE}/file-room/${campaignId}/office/copy?task=sm-001:copy`,
      `  Creative:  ${BASE}/file-room/${campaignId}/office/creative_production?task=sm-001:creative`,
      `  QA:        ${BASE}/file-room/${campaignId}/office/qa?task=sm-001:copy`,
      `  Producer:  ${BASE}/file-room/${campaignId}/office/producer_dispatcher?task=sm-001:copy`,
      "",
      "Screenshots:",
      `  ${OUT.strategy}`,
      `  ${OUT.copy}`,
      `  ${OUT.creative}`,
      `  ${OUT.qa}`,
      `  ${OUT.producer}`,
      `Captured: ${new Date().toISOString()}`,
    ].join("\n");

    await writeFile(path.join(OUT_DIR, "README.txt"), readme, "utf8");

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
