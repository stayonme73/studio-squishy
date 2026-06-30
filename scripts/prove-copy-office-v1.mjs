/**
 * Copy Office V1 — behavioral proof (post-submit, producer denial, QA transitions)
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 *
 * Usage:
 *   node scripts/prove-copy-office-v1.mjs
 *   CAMPAIGN_ID=copy-office-v1-xxx node scripts/prove-copy-office-v1.mjs
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
const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");

const STAFF_COPY_ID = "staff-copy-capture";
const STAFF_PRODUCER_ID = "staff-producer-verify-3dc";
const COPY_LOGIN = { email: "copy-capture@local.dev", password: "dev-only" };
const PRODUCER_LOGIN = { email: "producer-verify-3dc@local.dev", password: "dev-only" };
const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };

const VIEWPORT = { width: 1440, height: 900 };
const COPY_CHECKS = [
  "scope_match",
  "factual_accuracy",
  "direction_match",
  "usability",
  "client_safe_packaging",
  "copy_accuracy",
  "brand_voice",
  "grammar",
];

const OUT = {
  waitingForQa: path.join(OUT_DIR, "04-copy-waiting-for-qa.png"),
  creativeUnlocked: path.join(OUT_DIR, "05-creative-unlocked.png"),
};

/** @param {string} campaignId */
function buildCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Copy Office V1 Proof",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Copy Office V1 proof campaign",
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
        workingOn: "Copy Office V1 proof",
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
  const copyUser = users.find((user) => user.id === STAFF_COPY_ID);
  if (copyUser) {
    Object.assign(copyUser, {
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
async function assignStaff(campaignId) {
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
  assignments.staffByUserId[STAFF_PRODUCER_ID] = [campaignId];
  assignments.staffCapabilities[STAFF_PRODUCER_ID] = ["producer_dispatcher"];
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
  tasks.handoffs = [];
  tasks.qaRecords = [];

  await writeFile(productionPath, JSON.stringify(production, null, 2), "utf8");
  await writeFile(tasksPath, JSON.stringify(tasks, null, 2), "utf8");

  return { copyVersionId, claimedAt: now };
}

/** @param {string} campaignId */
async function approveRequiredMaterials(campaignId) {
  const materialsPath = path.join(MATERIALS_DIR, `${campaignId}.json`);
  let envelope;
  try {
    envelope = JSON.parse(await readFile(materialsPath, "utf8"));
  } catch {
    return;
  }
  const now = new Date().toISOString();
  for (const item of envelope.items ?? []) {
    if (item.requirementLevel === "required" && item.reviewStatus === "missing") {
      item.reviewStatus = "approved_for_use";
      item.confirmedAt = now;
    }
  }
  envelope.updatedAt = now;
  envelope.syncedAt = now;
  await writeFile(materialsPath, JSON.stringify(envelope, null, 2), "utf8");
}

/** @param {string} campaignId */
async function readProduction(campaignId) {
  return JSON.parse(await readFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), "utf8"));
}

/** @param {string} campaignId */
async function readTasks(campaignId) {
  return JSON.parse(await readFile(path.join(TASKS_DIR, `${campaignId}.json`), "utf8"));
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

  const campaignId =
    process.env.CAMPAIGN_ID ?? `copy-office-v1-${randomUUID().slice(0, 8)}`;
  const reset = process.env.CAMPAIGN_ID ? false : true;

  if (reset) {
    await ensureUsers();
    await seedCampaign(campaignId);
    await assignStaff(campaignId);
  } else {
    await ensureUsers();
    await assignStaff(campaignId);
  }

  const workState = await prepareCopyWorkState(campaignId);
  await approveRequiredMaterials(campaignId);
  const copyVersionId = workState.copyVersionId;
  const claimVersion = workState.claimedAt;

  const proofs = {
    campaignId,
    capturedAt: new Date().toISOString(),
    proof1: { pass: false, evidence: {} },
    proof2: { pass: false, evidence: {} },
    proof3: { pass: false, qaPass: { pass: false }, qaFail: { pass: false }, evidence: {} },
  };

  const officeBase = `${BASE}/file-room/${campaignId}/office/copy`;
  const copyTaskUrl = `${officeBase}?task=sm-001:copy`;

  // ——— Proof 1: submit to QA ———
  jar.clear();
  await loginApi(COPY_LOGIN);
  const submitRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "submit_for_handoff",
      taskId: "sm-001:copy",
      from: "in_progress",
      claimVersion,
      handoff: {
        completedSummary: "Copy draft v1 complete.",
        sourceContext: "Strategy direction approved.",
        nextSteps: "QA review copy for brand voice and accuracy.",
        workVersionId: copyVersionId,
      },
    },
  });

  const tasksAfterSubmit = await readTasks(campaignId);
  const copyAfterSubmit = tasksAfterSubmit.tasks.find((t) => t.id === "sm-001:copy");

  proofs.proof1.evidence = {
    submitStatus: submitRes.status,
    workflowState: copyAfterSubmit?.workflowState,
    claimedCleared: !copyAfterSubmit?.claimedByUserId,
    workVersionId: copyVersionId,
    url: copyTaskUrl,
  };
  proofs.proof1.pass =
    submitRes.status === 200 &&
    copyAfterSubmit?.workflowState === "ready_for_qa" &&
    !copyAfterSubmit?.claimedByUserId;

  // Screenshot 04 — waiting for QA
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  try {
    await loginPage(page, COPY_LOGIN);
    await page.goto(copyTaskUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector(".fr-office-grid", { timeout: 30000 });
    await page.waitForSelector("text=Waiting for QA review in File Room.", { timeout: 15000 });
    const submitVisible = await page.locator("text=Submit to QA").isVisible().catch(() => false);
    proofs.proof1.evidence.submitButtonVisible = submitVisible;
    proofs.proof1.evidence.screenshot = OUT.waitingForQa;
    await page.locator(".fr-office-grid").screenshot({ path: OUT.waitingForQa });
    proofs.proof1.pass = proofs.proof1.pass && !submitVisible;
  } finally {
    /* browser stays open for proof 3 screenshot */
  }

  // ——— Proof 2: producer edit denial ———
  jar.clear();
  await loginApi(PRODUCER_LOGIN);
  const versionCountBefore = (await readProduction(campaignId)).versions.length;
  const producerPatchRes = await fetchApi(`/api/campaigns/${campaignId}/production`, {
    method: "PATCH",
    json: {
      action: "create_version",
      taskId: "sm-001:copy",
      body: "Producer should not write copy.",
    },
  });
  const versionCountAfter = (await readProduction(campaignId)).versions.length;

  proofs.proof2.evidence = {
    request: {
      method: "PATCH",
      path: `/api/campaigns/${campaignId}/production`,
      body: { action: "create_version", taskId: "sm-001:copy", body: "Producer should not write copy." },
      user: PRODUCER_LOGIN.email,
    },
    response: { status: producerPatchRes.status, error: producerPatchRes.json?.error },
    versionsBefore: versionCountBefore,
    versionsAfter: versionCountAfter,
  };
  proofs.proof2.pass =
    producerPatchRes.status === 403 && versionCountAfter === versionCountBefore;

  // ——— Proof 3a: QA pass unlocks creative ———
  jar.clear();
  await loginApi(OWNER_LOGIN);
  const qaPassRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "qa_pass",
      taskId: "sm-001:copy",
      from: "ready_for_qa",
      claimVersion: null,
      checks: COPY_CHECKS,
      workVersionId: copyVersionId,
      notes: "Copy approved for creative handoff.",
    },
  });

  const tasksAfterPass = await readTasks(campaignId);
  const creativeAfterPass = tasksAfterPass.tasks.find((t) => t.id === "sm-001:creative");
  const copyAfterPass = tasksAfterPass.tasks.find((t) => t.id === "sm-001:copy");

  proofs.proof3.qaPass = {
    pass:
      qaPassRes.status === 200 &&
      copyAfterPass?.workflowState === "complete" &&
      creativeAfterPass?.status === "ready",
    evidence: {
      qaPassStatus: qaPassRes.status,
      copyWorkflowState: copyAfterPass?.workflowState,
      creativeStatus: creativeAfterPass?.status,
      creativeWorkflowState: creativeAfterPass?.workflowState,
    },
  };

  // Screenshot 05 — default queue empty after QA pass; creative ready in downstream rail
  try {
    await loginPage(page, COPY_LOGIN);
    await page.goto(officeBase, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector("text=No copy tasks in this campaign.", { timeout: 15000 });
    await page.waitForSelector("text=Downstream status", { timeout: 15000 });
    await page.waitForSelector("text=Ready", { timeout: 15000 });
    const completedCopyVisible = await page
      .locator(".fr-office-queue__item")
      .filter({ hasText: /Complete/i })
      .isVisible()
      .catch(() => false);
    proofs.proof3.qaPass.evidence.screenshot = OUT.creativeUnlocked;
    proofs.proof3.qaPass.evidence.url = officeBase;
    proofs.proof3.qaPass.evidence.completedCopyInDefaultQueue = completedCopyVisible;
    proofs.proof3.qaPass.pass =
      proofs.proof3.qaPass.pass && !completedCopyVisible;
    await page.locator(".fr-office-grid").screenshot({ path: OUT.creativeUnlocked });
  } finally {
    await browser.close();
  }

  // ——— Proof 3b: QA fail on separate reset state ———
  const failCampaignId = `${campaignId}-qa-fail`;
  await seedCampaign(failCampaignId);
  await assignStaff(failCampaignId);
  const failWork = await prepareCopyWorkState(failCampaignId);
  await approveRequiredMaterials(failCampaignId);
  const failCopyVersionId = failWork.copyVersionId;

  jar.clear();
  await loginApi(COPY_LOGIN);
  await fetchApi(`/api/campaigns/${failCampaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "submit_for_handoff",
      taskId: "sm-001:copy",
      from: "in_progress",
      claimVersion: failWork.claimedAt,
      handoff: {
        completedSummary: "Copy for QA fail test.",
        sourceContext: "Strategy.",
        nextSteps: "QA.",
        workVersionId: failCopyVersionId,
      },
    },
  });

  jar.clear();
  await loginApi(OWNER_LOGIN);
  const qaFailRes = await fetchApi(`/api/campaigns/${failCampaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "qa_fail",
      taskId: "sm-001:copy",
      from: "ready_for_qa",
      claimVersion: null,
      category: "production_correction",
      workVersionId: failCopyVersionId,
      notes: "Headline needs revision.",
    },
  });

  const tasksAfterFail = await readTasks(failCampaignId);
  const copyAfterFail = tasksAfterFail.tasks.find((t) => t.id === "sm-001:copy");

  jar.clear();
  await loginApi(COPY_LOGIN);
  await fetchApi(`/api/campaigns/${failCampaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "claim",
      taskId: "sm-001:copy",
      from: "needs_revision",
      claimVersion: null,
    },
  });

  const revisionRes = await fetchApi(`/api/campaigns/${failCampaignId}/production`, {
    method: "PATCH",
    json: {
      action: "create_version",
      taskId: "sm-001:copy",
      body: "Revised headline after QA feedback.",
      reason: "qa_revision",
    },
  });

  const productionAfterRevision = await readProduction(failCampaignId);
  const revisionVersion = productionAfterRevision.versions.find(
    (v) => v.taskId === "sm-001:copy" && v.reason === "qa_revision",
  );

  proofs.proof3.qaFail = {
    pass:
      qaFailRes.status === 200 &&
      copyAfterFail?.workflowState === "needs_revision" &&
      revisionRes.status === 200 &&
      Boolean(revisionVersion),
    evidence: {
      qaFailStatus: qaFailRes.status,
      copyWorkflowStateAfterFail: copyAfterFail?.workflowState,
      revisionCreateStatus: revisionRes.status,
      revisionVersionReason: revisionVersion?.reason ?? null,
      revisionVersionId: revisionVersion?.id ?? null,
      failCampaignId,
    },
  };

  proofs.proof3.pass = proofs.proof3.qaPass.pass && proofs.proof3.qaFail.pass;

  const resultsPath = path.join(OUT_DIR, "proof-results.json");
  await writeFile(resultsPath, JSON.stringify(proofs, null, 2), "utf8");

  const readmeLines = [
    "Copy Office V1 — proof packet",
    `Campaign ID: ${campaignId}`,
    `Viewport: ${VIEWPORT.width}x${VIEWPORT.height} (100% zoom, viewport screenshot)`,
    "",
    "URLs:",
    `  Copy Office queue: ${officeBase}`,
    `  Copy task: ${copyTaskUrl}`,
    "",
    "Login:",
    `  Copy staff: ${COPY_LOGIN.email} / dev-only`,
    `  Producer (denial test): ${PRODUCER_LOGIN.email} / dev-only`,
    "",
    "Screenshots:",
    `  04-copy-waiting-for-qa.png — post submit_for_handoff (workflowState ready_for_qa)`,
    `  05-creative-unlocked.png — after qa_pass (default queue empty; creative ready in downstream rail)`,
    "",
    "Proof results:",
    `  Proof 1 (post-submit): ${proofs.proof1.pass ? "PASS" : "FAIL"}`,
    `  Proof 2 (producer denial): ${proofs.proof2.pass ? "PASS" : "FAIL"}`,
    `  Proof 3a (QA pass): ${proofs.proof3.qaPass.pass ? "PASS" : "FAIL"}`,
    `  Proof 3b (QA fail + qa_revision): ${proofs.proof3.qaFail.pass ? "PASS" : "FAIL"}`,
    "",
    `Captured: ${proofs.capturedAt}`,
    `Full evidence: ${resultsPath}`,
  ];

  await writeFile(path.join(OUT_DIR, "README.txt"), readmeLines.join("\n"), "utf8");

  console.log(JSON.stringify(proofs, null, 2));
  console.log(`\nScreenshots:`);
  console.log(`  ${OUT.waitingForQa}`);
  console.log(`  ${OUT.creativeUnlocked}`);
  console.log(`\nResults: ${resultsPath}`);

  const allPass =
    proofs.proof1.pass && proofs.proof2.pass && proofs.proof3.qaPass.pass && proofs.proof3.qaFail.pass;
  if (!allPass) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
