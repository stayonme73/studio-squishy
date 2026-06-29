/**
 * Slice 3c — QA API (3c-a) + File Room QA UI (3c-b)
 *
 * Prerequisites:
 *   - Dev server on localhost:3000
 *   - SESSION_SECRET in .env.local
 *
 * Usage: node scripts/verify-slice3c.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const STAFF_QA_ID = "staff-qa-verify";
const STAFF_COPY_ID = "staff-copy-verify";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const QA_LOGIN = { email: "qa-verify@local.dev", password: "dev-only" };
const COPY_LOGIN = { email: "copy-verify@local.dev", password: "dev-only" };
const CLIENT_LOGIN = { email: "client@local.dev", password: "dev-only" };

const UNIVERSAL_CHECKS = [
  "scope_match",
  "factual_accuracy",
  "direction_match",
  "usability",
  "client_safe_packaging",
];
const COPY_CHECKS = [...UNIVERSAL_CHECKS, "copy_accuracy", "brand_voice", "grammar"];
const QA_CHECKS = [...UNIVERSAL_CHECKS, "production_complete", "deliverable_specs", "client_requirements"];
const DELIVERY_CHECKS = [...UNIVERSAL_CHECKS, "package_complete", "fingerprint_match", "no_internal_leaks"];

/** @type {Record<string, { pass: boolean; evidence: string[] }>} */
const report = {};
/** @type {Record<string, string>} */
const meta = {};

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

function buildTaskPlanCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 3c-a QA Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Slice 3c-a verify",
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
        workingOn: "Verify QA PATCH",
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
  await mkdir(path.dirname(USERS_PATH), { recursive: true });
  let users = [];
  try {
    users = JSON.parse(await readFile(USERS_PATH, "utf8"));
  } catch {
    users = [];
  }

  const upsert = (id, email, displayName, roles, extra = {}) => {
    const existing = users.find((user) => user.id === id);
    if (existing) {
      Object.assign(existing, { email, displayName, roles, ...extra });
    } else {
      users.push({
        id,
        email,
        password: "dev-only",
        displayName,
        roles,
        ...extra,
      });
    }
  };

  upsert("client-verify", CLIENT_LOGIN.email, "Client Verify", ["client"], {
    currentCampaignId: campaignId,
  });
  upsert(STAFF_QA_ID, QA_LOGIN.email, "QA Verify", ["staff"]);
  upsert(STAFF_COPY_ID, COPY_LOGIN.email, "Copy Verify", ["staff"]);

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

async function login(credentials) {
  const res = await fetchApi("/api/auth/login", { method: "POST", json: credentials });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status}`);
}

/** @param {string} label @param {(evidence: string[]) => Promise<void>} fn */
async function runStep(label, fn) {
  const evidence = [];
  try {
    await fn(evidence);
    report[label] = { pass: true, evidence };
  } catch (error) {
    report[label] = {
      pass: false,
      evidence: [...evidence, error instanceof Error ? error.message : String(error)],
    };
  }
}

function findTask(tasks, suffix) {
  return tasks.find((task) => task.id.endsWith(suffix));
}

async function seedTasks(campaignId, patch) {
  const tasksPath = path.join(TASKS_DIR, `${campaignId}.json`);
  const raw = await readFile(tasksPath, "utf8");
  const envelope = JSON.parse(raw);
  patch(envelope);
  envelope.version = 4;
  envelope.qaRecords = envelope.qaRecords ?? [];
  await writeFile(tasksPath, JSON.stringify(envelope, null, 2), "utf8");
}

async function unlockSocialPipeline(campaignId) {
  await seedTasks(campaignId, (envelope) => {
    for (const task of envelope.tasks ?? []) {
      if (task.id === "sm-001:strategy_content_direction") {
        task.workflowState = "complete";
        task.status = "complete";
      }
    }
  });
}

async function setCopyReadyForQa(campaignId) {
  await seedTasks(campaignId, (envelope) => {
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
  });
}

async function setFormalQaReady(campaignId) {
  await seedTasks(campaignId, (envelope) => {
    for (const task of envelope.tasks ?? []) {
      if (
        task.id === "sm-001:strategy_content_direction" ||
        task.id === "sm-001:copy" ||
        task.id === "sm-001:creative"
      ) {
        task.workflowState = "complete";
        task.status = "complete";
      }
      if (task.id === "sm-001:qa") {
        task.workflowState = "ready_for_qa";
        task.status = "ready_for_qa";
      }
      if (task.id === "sm-001:delivery_prep") {
        task.workflowState = "ready_for_qa";
        task.status = "ready_for_qa";
      }
    }
  });
}

function printReport() {
  let pass = true;
  for (const [label, result] of Object.entries(report)) {
    const icon = result.pass ? "PASS" : "FAIL";
    if (!result.pass) pass = false;
    console.log(`${icon}: ${label}`);
    for (const line of result.evidence) console.log(`  - ${line}`);
  }
  console.log("\n=== Meta ===");
  for (const [key, value] of Object.entries(meta)) {
    console.log(`${key}: ${value}`);
  }
  return pass;
}

async function main() {
  try {
    const probe = await fetch(`${BASE}/api/auth/login`, { method: "GET" });
    if (!probe.ok && probe.status !== 405) {
      console.error(`Dev server not reachable at ${BASE} (HTTP ${probe.status})`);
      process.exit(1);
    }
  } catch {
    console.error(`Dev server not reachable at ${BASE}`);
    process.exit(1);
  }

  const campaignId = randomUUID();
  meta.campaignId = campaignId;

  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await mkdir(MATERIALS_DIR, { recursive: true });
  await mkdir(TASKS_DIR, { recursive: true });
  await ensureUsers(campaignId);

  jar.clear();
  await login(OWNER_LOGIN);
  await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildTaskPlanCampaign(campaignId) },
  });
  await assignStaff(campaignId);
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await unlockSocialPipeline(campaignId);

  await runStep("1. QA pass completes production + appends record", async (evidence) => {
    await setCopyReadyForQa(campaignId);
    jar.clear();
    await login(QA_LOGIN);
    const passRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "qa_pass",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        checks: COPY_CHECKS,
      },
    });
    evidence.push(`PATCH qa_pass → HTTP ${passRes.status}`);
    if (passRes.status !== 200) throw new Error(JSON.stringify(passRes.json));
    const copy = findTask(passRes.json?.tasks ?? [], ":copy");
    if (copy?.workflowState !== "complete") {
      throw new Error(`Expected complete, got ${copy?.workflowState}`);
    }
    const records = passRes.json?.qaRecords ?? [];
    evidence.push(`qaRecords=${records.length}`);
    if (records.length < 1 || records[records.length - 1].action !== "qa_pass") {
      throw new Error("Expected qa_pass record");
    }
  });

  await runStep("2. Inline qa_fail → needs_revision same task", async (evidence) => {
    await setCopyReadyForQa(campaignId);
    jar.clear();
    await login(QA_LOGIN);
    const failRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "qa_fail",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
        notes: "Revise headline.",
      },
    });
    evidence.push(`PATCH qa_fail → HTTP ${failRes.status}`);
    if (failRes.status !== 200) throw new Error(JSON.stringify(failRes.json));
    const copy = findTask(failRes.json?.tasks ?? [], ":copy");
    if (copy?.workflowState !== "needs_revision") {
      throw new Error(`Expected needs_revision, got ${copy?.workflowState}`);
    }
  });

  await runStep("3. Formal QA fail cascades upstream + resets QA/delivery_prep", async (evidence) => {
    await setFormalQaReady(campaignId);
    jar.clear();
    await login(QA_LOGIN);
    const failRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "qa_fail",
        taskId: "sm-001:qa",
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
      },
    });
    evidence.push(`PATCH formal qa_fail → HTTP ${failRes.status}`);
    if (failRes.status !== 200) throw new Error(JSON.stringify(failRes.json));
    const creative = findTask(failRes.json?.tasks ?? [], ":creative");
    const formalQa = findTask(failRes.json?.tasks ?? [], ":qa");
    const delivery = findTask(failRes.json?.tasks ?? [], ":delivery_prep");
    evidence.push(
      `creative=${creative?.workflowState} qa=${formalQa?.workflowState} delivery=${delivery?.workflowState}`,
    );
    if (creative?.workflowState !== "needs_revision") throw new Error("Creative not reopened");
    if (formalQa?.workflowState !== "unstarted") throw new Error("Formal QA not reset");
    if (delivery?.workflowState !== "unstarted") throw new Error("Delivery prep not reset");
  });

  await runStep("4. missing_client_fact blocks dependent only", async (evidence) => {
    await setCopyReadyForQa(campaignId);
    jar.clear();
    await login(QA_LOGIN);
    const failRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "qa_fail",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        category: "missing_client_fact",
        missingFactDescription: "Brand palette hex codes",
        missingFactReason: "Cannot verify colors without client values.",
      },
    });
    evidence.push(`PATCH → HTTP ${failRes.status}`);
    if (failRes.status !== 200) throw new Error(JSON.stringify(failRes.json));
    const copy = findTask(failRes.json?.tasks ?? [], ":copy");
    const creative = findTask(failRes.json?.tasks ?? [], ":creative");
    if (copy?.workflowState !== "blocked") throw new Error(`Copy not blocked: ${copy?.workflowState}`);
    if (creative && creative.workflowState === "blocked") {
      throw new Error("Unrelated creative task should not be blocked");
    }
  });

  await runStep("5. scope_change → 400 no state change", async (evidence) => {
    await setCopyReadyForQa(campaignId);
    jar.clear();
    await login(QA_LOGIN);
    const before = await readFile(path.join(TASKS_DIR, `${campaignId}.json`), "utf8");
    const failRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "qa_fail",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        category: "scope_change",
      },
    });
    evidence.push(`PATCH → HTTP ${failRes.status}`);
    if (failRes.status !== 400) throw new Error(`Expected 400, got ${failRes.status}`);
    const after = await readFile(path.join(TASKS_DIR, `${campaignId}.json`), "utf8");
    const beforeCopy = JSON.parse(before).tasks.find((task) => task.id === "sm-001:copy");
    const afterCopy = JSON.parse(after).tasks.find((task) => task.id === "sm-001:copy");
    if (beforeCopy.workflowState !== afterCopy.workflowState) {
      throw new Error("Task state changed on rejected scope_change");
    }
  });

  await runStep("6. compliance block prevents qa_pass", async (evidence) => {
    await setCopyReadyForQa(campaignId);
    jar.clear();
    await login(QA_LOGIN);
    const blockRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "qa_block",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        category: "compliance_concern",
      },
    });
    evidence.push(`PATCH qa_block → HTTP ${blockRes.status}`);
    if (blockRes.status !== 200) throw new Error(JSON.stringify(blockRes.json));

    const passRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "qa_pass",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        checks: COPY_CHECKS,
      },
    });
    evidence.push(`PATCH qa_pass after block → HTTP ${passRes.status}`);
    if (passRes.status === 200) throw new Error("qa_pass should fail after compliance block");
  });

  await runStep("7. Delivery prep denied without formal QA pass", async (evidence) => {
    await seedTasks(campaignId, (envelope) => {
      for (const task of envelope.tasks ?? []) {
        if (task.id === "sm-001:strategy_content_direction" || task.id === "sm-001:copy") {
          task.workflowState = "complete";
          task.status = "complete";
        }
        if (task.id === "sm-001:creative") {
          task.workflowState = "complete";
          task.status = "complete";
        }
        if (task.id === "sm-001:qa") {
          task.workflowState = "in_progress";
          task.status = "in_progress";
        }
        if (task.id === "sm-001:delivery_prep") {
          task.workflowState = "ready_for_qa";
          task.status = "ready_for_qa";
        }
      }
    });
    jar.clear();
    await login(QA_LOGIN);
    const passRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "qa_pass",
        taskId: "sm-001:delivery_prep",
        from: "ready_for_qa",
        claimVersion: null,
        checks: DELIVERY_CHECKS,
      },
    });
    evidence.push(`PATCH delivery_prep qa_pass → HTTP ${passRes.status}`);
    if (passRes.status === 200) throw new Error("Delivery prep should be denied without formal QA");
  });

  await runStep("8. Non-QA staff PATCH qa_pass → 403", async (evidence) => {
    await setCopyReadyForQa(campaignId);
    jar.clear();
    await login(COPY_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "qa_pass",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        checks: COPY_CHECKS,
      },
    });
    evidence.push(`PATCH → HTTP ${res.status}`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await runStep("9. Client GET excludes qaRecords and notes", async (evidence) => {
    jar.clear();
    await login(CLIENT_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
    evidence.push(`GET → HTTP ${res.status}`);
    if (res.status === 403) {
      evidence.push("Client forbidden from production tasks (no qaRecords leak)");
      return;
    }
    if (res.status !== 200) throw new Error(`Expected 200 or 403, got ${res.status}`);
    if (res.json?.qaRecords !== undefined) throw new Error("Client response must not include qaRecords");
    if (res.json?.qaSummary !== undefined) throw new Error("Client response must not include qaSummary");
    const serialized = JSON.stringify(res.json);
    if (/"notes"\s*:/.test(serialized)) {
      throw new Error("Client response must not include notes fields");
    }
    evidence.push("No qaRecords/notes in client payload");
  });

  await runStep("10. UI — QA staff sees QA review on ready_for_qa", async (evidence) => {
    await setCopyReadyForQa(campaignId);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const loginRes = await page.request.post(`${BASE}/api/auth/login`, { data: QA_LOGIN });
    if (!loginRes.ok()) throw new Error(`QA login failed: ${loginRes.status()}`);
    await page.goto(`${BASE}/file-room/${campaignId}`, { waitUntil: "networkidle" });
    const copyRow = page
      .locator(".utility-card", { hasText: "Production task plan" })
      .locator(".fr-tasks-row", { hasText: "Social Media Launch Set — Copy" })
      .first();
    await copyRow.waitFor({ timeout: 15000 });
    const qaButton = copyRow.getByRole("button", { name: "QA review" });
    const visible = await qaButton.isVisible();
    evidence.push(`QA review visible=${visible}`);
    if (!visible) throw new Error("QA review button not visible for QA staff");
    await browser.close();
  });

  await runStep("11. UI — non-QA staff cannot see QA actions", async (evidence) => {
    await setCopyReadyForQa(campaignId);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const loginRes = await page.request.post(`${BASE}/api/auth/login`, { data: COPY_LOGIN });
    if (!loginRes.ok()) throw new Error(`Copy login failed: ${loginRes.status()}`);
    await page.goto(`${BASE}/file-room/${campaignId}`, { waitUntil: "networkidle" });
    const copyRow = page
      .locator(".utility-card", { hasText: "Production task plan" })
      .locator(".fr-tasks-row", { hasText: "Social Media Launch Set — Copy" })
      .first();
    await copyRow.waitFor({ timeout: 15000 });
    const qaButton = copyRow.getByRole("button", { name: "QA review" });
    const visible = await qaButton.isVisible().catch(() => false);
    evidence.push(`QA review visible=${visible}`);
    if (visible) throw new Error("Non-QA staff must not see QA review");
    await browser.close();
  });

  await runStep("12. UI — client file-room has no QA controls", async (evidence) => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const loginRes = await page.request.post(`${BASE}/api/auth/login`, { data: CLIENT_LOGIN });
    if (!loginRes.ok()) throw new Error(`Client login failed: ${loginRes.status()}`);
    await page.goto(`${BASE}/file-room/${campaignId}`, { waitUntil: "networkidle" });
    const forbidden = await page.getByText("don't have access", { exact: false }).isVisible().catch(() => false);
    const qaReview = await page
      .getByRole("button", { name: "QA review" })
      .isVisible()
      .catch(() => false);
    const qaHistory = await page.getByText("QA history", { exact: false }).isVisible().catch(() => false);
    evidence.push(`forbidden=${forbidden} qaReview=${qaReview} qaHistory=${qaHistory}`);
    if (qaReview || qaHistory) throw new Error("Client must not see QA UI");
    await browser.close();
  });

  const pass = printReport();
  await mkdir(path.join(process.cwd(), "tmp"), { recursive: true });
  await writeFile(
    path.join(process.cwd(), "tmp", "verify-slice3c-report.json"),
    JSON.stringify({ report, meta }, null, 2),
    "utf8",
  );
  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
