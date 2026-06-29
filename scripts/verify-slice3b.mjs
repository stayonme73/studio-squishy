/**
 * Slice 3b-b-a — Task PATCH API verification (Section II only)
 *
 * Prerequisites:
 *   - Dev server on localhost:3000
 *   - SESSION_SECRET in .env.local
 *
 * Usage: node scripts/verify-slice3b.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const STAFF_USER_ID = "staff-dev";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const STAFF_LOGIN = { email: "staff@local.dev", password: "dev-only" };
const CLIENT_LOGIN = { email: "client@local.dev", password: "dev-only" };

/** @type {{ II: Record<string, { pass: boolean; evidence: string[] }>; meta: Record<string, string> }} */
const report = { II: {}, meta: {} };

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
  return { status: res.status, json, text, headers: res.headers };
}

/** @param {string} campaignId */
function buildTaskPlanCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 3b Task PATCH Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Slice 3b-b-a verify",
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
        workingOn: "Verify tasks PATCH",
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

async function ensureClientUser(campaignId) {
  await mkdir(path.dirname(USERS_PATH), { recursive: true });
  let users = [];
  try {
    users = JSON.parse(await readFile(USERS_PATH, "utf8"));
  } catch {
    users = [];
  }
  const existing = users.find((user) => user.email === CLIENT_LOGIN.email);
  if (existing) {
    existing.currentCampaignId = campaignId;
    existing.roles = ["client"];
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

async function login(credentials) {
  const res = await fetchApi("/api/auth/login", { method: "POST", json: credentials });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status}`);
  return res.json?.user;
}

/** @param {string} section @param {string} label @param {(evidence: string[]) => Promise<void>} fn */
async function runStep(section, label, fn) {
  const evidence = [];
  try {
    await fn(evidence);
    report[section][label] = { pass: true, evidence };
  } catch (error) {
    report[section][label] = {
      pass: false,
      evidence: [...evidence, error instanceof Error ? error.message : String(error)],
    };
  }
}

function findCopyTask(tasks) {
  return tasks.find((task) => task.id.endsWith(":copy"));
}

const handoff = {
  completedSummary: "Draft complete.",
  sourceContext: "Approved direction.",
  nextSteps: "QA review.",
};

async function unlockCopyTask(campaignId) {
  const tasksPath = path.join(TASKS_DIR, `${campaignId}.json`);
  const raw = await readFile(tasksPath, "utf8");
  const envelope = JSON.parse(raw);
  for (const task of envelope.tasks ?? []) {
    if (task.id === "sm-001:strategy_content_direction") {
      task.workflowState = "complete";
      task.status = "complete";
    }
  }
  envelope.version = 3;
  envelope.handoffs = envelope.handoffs ?? [];
  await writeFile(tasksPath, JSON.stringify(envelope, null, 2), "utf8");
}

async function resetCopyTaskForRelease(campaignId) {
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

async function sectionII(campaignId) {
  jar.clear();
  await login(OWNER_LOGIN);
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await unlockCopyTask(campaignId);

  jar.clear();
  await login(STAFF_LOGIN);

  let copyTaskId = "";
  let claimVersion = null;

  await runStep("II", "staff claims ready copy task", async (evidence) => {
    const getRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
    evidence.push(`GET → HTTP ${getRes.status}`);
    const copyTask = findCopyTask(getRes.json?.tasks ?? []);
    if (!copyTask) throw new Error("Copy task not found");
    copyTaskId = copyTask.id;
    evidence.push(`copyTask=${copyTaskId} workflow=${copyTask.workflowState}`);

    const claimRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "claim",
        taskId: copyTaskId,
        from: copyTask.workflowState ?? "unstarted",
        claimVersion: copyTask.claimedAt ?? null,
      },
    });
    evidence.push(`PATCH claim → HTTP ${claimRes.status}`);
    if (claimRes.status !== 200) throw new Error(JSON.stringify(claimRes.json));
    const claimed = (claimRes.json?.tasks ?? []).find((task) => task.id === copyTaskId);
    if (claimed?.workflowState !== "in_progress") {
      throw new Error(`Expected in_progress, got ${claimed?.workflowState}`);
    }
    claimVersion = claimed?.claimedAt ?? claimed?.claimVersion ?? null;
    evidence.push(`claimVersion=${claimVersion}`);
  });

  await runStep("II", "stale claimVersion → 409", async (evidence) => {
    const staleVersion = "1999-01-01T00:00:00.000Z";
    const conflictRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "release_claim",
        taskId: copyTaskId,
        from: "in_progress",
        claimVersion: staleVersion,
        handoff,
      },
    });
    evidence.push(`PATCH stale → HTTP ${conflictRes.status}`);
    if (conflictRes.status !== 409) throw new Error(`Expected 409, got ${conflictRes.status}`);
    if (!conflictRes.json?.conflict?.claimVersion) {
      throw new Error("Expected conflict payload with claimVersion");
    }
  });

  await runStep("II", "submit_for_handoff without handoff → 400", async (evidence) => {
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "submit_for_handoff",
        taskId: copyTaskId,
        from: "in_progress",
        claimVersion,
      },
    });
    evidence.push(`PATCH → HTTP ${res.status}`);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await runStep("II", "valid handoff → ready_for_qa and clears claim", async (evidence) => {
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "submit_for_handoff",
        taskId: copyTaskId,
        from: "in_progress",
        claimVersion,
        handoff,
      },
    });
    evidence.push(`PATCH → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(JSON.stringify(res.json));
    const task = (res.json?.tasks ?? []).find((entry) => entry.id === copyTaskId);
    if (task?.workflowState !== "ready_for_qa") {
      throw new Error(`Expected ready_for_qa, got ${task?.workflowState}`);
    }
    if (task?.claimedByUserId) throw new Error("Claim should be cleared after handoff");
    const handoffs = res.json?.handoffs ?? [];
    evidence.push(`handoffs=${handoffs.length}`);
    if (handoffs.length < 1) throw new Error("Expected handoff record");
  });

  await runStep("II", "client PATCH → 403", async (evidence) => {
    jar.clear();
    await login(CLIENT_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "claim",
        taskId: copyTaskId,
        from: "unstarted",
        claimVersion: null,
      },
    });
    evidence.push(`PATCH → HTTP ${res.status}`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await runStep("II", "unassigned staff PATCH → 403", async (evidence) => {
    jar.clear();
    await login(STAFF_LOGIN);
    await writeFile(
      ASSIGNMENTS_PATH,
      JSON.stringify({ staffByUserId: { [STAFF_USER_ID]: ["other-campaign"] } }, null, 2),
      "utf8",
    );
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "claim",
        taskId: copyTaskId,
        from: "unstarted",
        claimVersion: null,
      },
    });
    evidence.push(`PATCH → HTTP ${res.status}`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    await assignStaff(campaignId);
  });

  await runStep("II", "release_claim returns task to unstarted", async (evidence) => {
    jar.clear();
    await login(STAFF_LOGIN);
    await resetCopyTaskForRelease(campaignId);
    const getRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
    const copyTask = findCopyTask(getRes.json?.tasks ?? []);
    if (!copyTask) throw new Error("Copy task missing for release test");

    const claimRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "claim",
        taskId: copyTask.id,
        from: copyTask.workflowState ?? "unstarted",
        claimVersion: copyTask.claimedAt ?? null,
      },
    });
    if (claimRes.status !== 200) throw new Error("Re-claim failed for release test");
    const claimed = (claimRes.json?.tasks ?? []).find((task) => task.id === copyTask.id);
    const liveClaimVersion = claimed?.claimedAt ?? claimed?.claimVersion ?? null;

    const releaseRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "release_claim",
        taskId: copyTask.id,
        from: "in_progress",
        claimVersion: liveClaimVersion,
        handoff,
      },
    });
    evidence.push(`PATCH release → HTTP ${releaseRes.status}`);
    if (releaseRes.status !== 200) throw new Error(JSON.stringify(releaseRes.json));
    const released = (releaseRes.json?.tasks ?? []).find((task) => task.id === copyTask.id);
    if (released?.workflowState !== "unstarted") {
      throw new Error(`Expected unstarted after release, got ${released?.workflowState}`);
    }
    evidence.push(`handoffs=${releaseRes.json?.handoffs?.length ?? 0}`);
  });

  await runStep("II", "tasks JSON persists handoffs on disk", async (evidence) => {
    const raw = await readFile(path.join(TASKS_DIR, `${campaignId}.json`), "utf8");
    const envelope = JSON.parse(raw);
    evidence.push(`handoffs on disk=${envelope.handoffs?.length ?? 0}`);
    if (!Array.isArray(envelope.handoffs) || envelope.handoffs.length < 1) {
      throw new Error("Expected handoffs array on disk");
    }
    if (envelope.version < 3) throw new Error(`Expected schema v3, got ${envelope.version}`);
  });
}

function printReport() {
  let pass = true;
  for (const [section, steps] of Object.entries(report)) {
    if (section === "meta") continue;
    console.log(`\n=== Section ${section} ===`);
    for (const [label, result] of Object.entries(steps)) {
      const icon = result.pass ? "PASS" : "FAIL";
      if (!result.pass) pass = false;
      console.log(`${icon}: ${label}`);
      for (const line of result.evidence) console.log(`  - ${line}`);
    }
  }
  console.log("\n=== Meta ===");
  for (const [key, value] of Object.entries(report.meta)) {
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
  report.meta.campaignId = campaignId;
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await mkdir(MATERIALS_DIR, { recursive: true });
  await mkdir(TASKS_DIR, { recursive: true });
  await ensureClientUser(campaignId);
  await ensureStaffSeedUser();

  const record = buildTaskPlanCampaign(campaignId);
  jar.clear();
  await login(OWNER_LOGIN);
  await fetchApi("/api/campaigns/current", { method: "PATCH", json: { record } });
  await assignStaff(campaignId);

  await sectionII(campaignId);

  const pass = printReport();
  await mkdir(path.join(process.cwd(), "tmp"), { recursive: true });
  await writeFile(
    path.join(process.cwd(), "tmp", "verify-slice3b-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
