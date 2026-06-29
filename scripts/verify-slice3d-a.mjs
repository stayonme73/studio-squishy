/**
 * Slice 3d-a — Exceptions API (no UI, no client-material promotion)
 *
 * Prerequisites:
 *   - Dev server on localhost:3000
 *   - SESSION_SECRET in .env.local
 *
 * Usage: node scripts/verify-slice3d-a.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const STAFF_QA_ID = "staff-qa-verify-3d";
const STAFF_PRODUCER_ID = "staff-producer-verify-3d";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const QA_LOGIN = { email: "qa-verify-3d@local.dev", password: "dev-only" };
const PRODUCER_LOGIN = { email: "producer-verify-3d@local.dev", password: "dev-only" };
const CLIENT_LOGIN = { email: "client@local.dev", password: "dev-only" };

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

function buildCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 3d-a Exceptions Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Slice 3d-a verify",
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
        workingOn: "Verify exceptions PATCH",
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
  const upsert = (id, email, displayName, roles) => {
    const existing = users.find((user) => user.id === id);
    if (existing) Object.assign(existing, { email, displayName, roles });
    else users.push({ id, email, password: "dev-only", displayName, roles });
  };
  upsert(STAFF_QA_ID, QA_LOGIN.email, "QA Verify 3d", ["staff"]);
  upsert(STAFF_PRODUCER_ID, PRODUCER_LOGIN.email, "Producer Verify 3d", ["staff"]);
  const clientExisting = users.find((user) => user.email === CLIENT_LOGIN.email);
  if (clientExisting) {
    Object.assign(clientExisting, {
      email: CLIENT_LOGIN.email,
      displayName: "Client Verify",
      roles: ["client"],
      currentCampaignId: campaignId,
    });
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

async function assignStaff(campaignId) {
  await mkdir(path.dirname(ASSIGNMENTS_PATH), { recursive: true });
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

async function login(credentials) {
  const res = await fetchApi("/api/auth/login", { method: "POST", json: credentials });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status}`);
}


async function bootstrapCampaign(campaignId) {
  jar.clear();
  await login(OWNER_LOGIN);
  await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildCampaign(campaignId) },
  });
  await assignStaff(campaignId);
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
}

async function seedOpenComplianceHold(campaignId, exceptionId) {
  const tasksPath = path.join(TASKS_DIR, `${campaignId}.json`);
  const envelope = JSON.parse(await readFile(tasksPath, "utf8"));
  const now = new Date().toISOString();
  envelope.exceptionRecords = envelope.exceptionRecords ?? [];
  envelope.exceptionEvents = envelope.exceptionEvents ?? [];
  envelope.exceptionRecords.push({
    id: exceptionId,
    campaignId,
    kind: "compliance_hold",
    status: "waiting_owner",
    title: "Pre-seeded compliance hold",
    description: "Open hold before duplicate bridge test",
    createdAt: now,
    updatedAt: now,
    raisedByUserId: STAFF_QA_ID,
    raisedByDisplayName: "QA Verify 3d",
    raisedByRole: "qa",
    taskId: "sm-001:copy",
  });
  envelope.version = 5;
  await writeFile(tasksPath, JSON.stringify(envelope, null, 2), "utf8");
}

function countOpenComplianceHold(records) {
  return (records ?? []).filter(
    (entry) =>
      entry.kind === "compliance_hold" &&
      entry.status !== "resolved" &&
      entry.status !== "cancelled",
  ).length;
}

async function seedCopyReadyForQa(campaignId) {
  const tasksPath = path.join(TASKS_DIR, `${campaignId}.json`);
  const raw = await readFile(tasksPath, "utf8");
  const envelope = JSON.parse(raw);
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
  envelope.version = 5;
  envelope.exceptionRecords = envelope.exceptionRecords ?? [];
  envelope.exceptionEvents = envelope.exceptionEvents ?? [];
  await writeFile(tasksPath, JSON.stringify(envelope, null, 2), "utf8");
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
  await mkdir(TASKS_DIR, { recursive: true });
  await ensureUsers(campaignId);

  jar.clear();
  await login(OWNER_LOGIN);
  await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildCampaign(campaignId) },
  });
  await assignStaff(campaignId);
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await seedCopyReadyForQa(campaignId);

  let complianceExceptionId = null;
  let routineExceptionId = null;
  let clientRequestExceptionId = null;

  await runStep("1. qa_block auto-bridges compliance exception", async (evidence) => {
    jar.clear();
    await login(QA_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "qa_block",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        category: "compliance_concern",
        notes: "Unverified claim",
      },
    });
    evidence.push(`PATCH qa_block → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(JSON.stringify(res.json));
    const records = res.json.exceptionRecords ?? [];
    evidence.push(`exceptionRecords=${records.length}`);
    const match = records.find((entry) => entry.kind === "compliance_hold");
    if (!match) throw new Error("Missing compliance_hold exception");
    complianceExceptionId = match.id;
    evidence.push(`exceptionId=${complianceExceptionId}`);
  });

  await runStep("2. GET tasks includes exceptionRecords (schema v5)", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
    evidence.push(`GET → HTTP ${res.status}, version=${res.json.version}`);
    if (res.status !== 200) throw new Error("GET failed");
    if (res.json.version < 5) throw new Error("Expected schema version 5");
    if (!Array.isArray(res.json.exceptionRecords)) throw new Error("Missing exceptionRecords");
    evidence.push(`open exceptions=${res.json.exceptionRecords.length}`);
  });

  await runStep("3. producer cannot resolve owner-held exception", async (evidence) => {
    jar.clear();
    await login(PRODUCER_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "resolve_exception",
        exceptionId: complianceExceptionId,
      },
    });
    evidence.push(`PATCH resolve → HTTP ${res.status}`);
    if (res.status !== 403) throw new Error("Producer should be forbidden");
  });

  await runStep("4. owner resolves compliance exception", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "resolve_exception",
        exceptionId: complianceExceptionId,
        resolutionNotes: "Claim revised",
      },
    });
    evidence.push(`PATCH resolve → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(JSON.stringify(res.json));
    const resolved = (res.json.exceptionRecords ?? []).find(
      (entry) => entry.id === complianceExceptionId,
    );
    if (resolved?.status !== "resolved") throw new Error("Exception not resolved");
    const copy = (res.json.tasks ?? []).find((task) => task.id === "sm-001:copy");
    evidence.push(`copy workflow=${copy?.workflowState}, blockedReason=${copy?.workflowBlockedReason ?? "none"}`);
    if (copy?.workflowState === "complete") throw new Error("Resolve must not complete task");
  });

  await runStep("5. raise_exception routine_internal", async (evidence) => {
    jar.clear();
    await login(PRODUCER_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "raise_exception",
        kind: "routine_internal",
        title: "Asset export mismatch",
        description: "Wrong dimensions in export",
      },
    });
    evidence.push(`PATCH raise → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(JSON.stringify(res.json));
    routineExceptionId = res.json.exceptionRecords?.find(
      (entry) => entry.kind === "routine_internal",
    )?.id;
    if (!routineExceptionId) throw new Error("Missing routine exception");
    evidence.push(`events=${res.json.exceptionEvents?.length ?? 0}`);
  });

  await runStep("6. assign_exception", async (evidence) => {
    jar.clear();
    await login(PRODUCER_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "assign_exception",
        exceptionId: routineExceptionId,
        assignToUserId: STAFF_QA_ID,
        notes: "Please verify export",
      },
    });
    evidence.push(`PATCH assign → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(JSON.stringify(res.json));
    const assigned = (res.json.exceptionRecords ?? []).find(
      (entry) => entry.id === routineExceptionId,
    );
    if (assigned?.assignedToUserId !== STAFF_QA_ID) throw new Error("Assignee not set");
  });

  await runStep("7. producer resolves routine_internal", async (evidence) => {
    jar.clear();
    await login(PRODUCER_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "resolve_exception",
        exceptionId: routineExceptionId,
      },
    });
    evidence.push(`PATCH resolve → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(JSON.stringify(res.json));
  });

  await runStep("8. approve_client_request deferred (501)", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    const raise = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "raise_exception",
        kind: "client_request",
        title: "Need vector logo",
        clientRequestDraft: { exactClientOnlyItem: "Vector logo file" },
      },
    });
    evidence.push(`owner raise client_request → HTTP ${raise.status}`);
    if (raise.status !== 200) throw new Error(JSON.stringify(raise.json));
    clientRequestExceptionId = raise.json.exceptionRecords?.find(
      (entry) => entry.kind === "client_request",
    )?.id;
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "approve_client_request",
        exceptionId: clientRequestExceptionId,
      },
    });
    evidence.push(`PATCH approve_client_request → HTTP ${res.status}`);
    if (res.status !== 501) throw new Error("Expected 501 deferred");
    if (!res.json.error?.includes("3d-c")) throw new Error("Missing deferred message");
  });

  await runStep("9. qa_fail missing_client_fact auto-bridges exception", async (evidence) => {
    await seedCopyReadyForQa(campaignId);
    jar.clear();
    await login(QA_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "qa_fail",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        category: "missing_client_fact",
        missingFactDescription: "Brand hex codes",
        missingFactReason: "Cannot finalize palette",
      },
    });
    evidence.push(`PATCH qa_fail → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(JSON.stringify(res.json));
    const match = (res.json.exceptionRecords ?? []).find(
      (entry) => entry.kind === "missing_client_fact" && entry.status !== "resolved",
    );
    if (!match) throw new Error("Missing missing_client_fact exception");
  });


  await runStep("10. duplicate bridge qa_block does not duplicate compliance_hold", async (evidence) => {
    const dedupeCampaignId = randomUUID();
    const preseedExceptionId = randomUUID();
    evidence.push(`dedupeCampaignId=${dedupeCampaignId}`);
    evidence.push(`preseedExceptionId=${preseedExceptionId}`);

    await bootstrapCampaign(dedupeCampaignId);
    await seedCopyReadyForQa(dedupeCampaignId);
    await seedOpenComplianceHold(dedupeCampaignId, preseedExceptionId);

    const tasksPath = path.join(TASKS_DIR, `${dedupeCampaignId}.json`);
    const beforeEnvelope = JSON.parse(await readFile(tasksPath, "utf8"));
    const beforeCount = countOpenComplianceHold(beforeEnvelope.exceptionRecords);
    evidence.push(`open compliance_hold before qa_block=${beforeCount}`);
    if (beforeCount !== 1) throw new Error("Expected exactly one pre-seeded open compliance_hold");

    jar.clear();
    await login(QA_LOGIN);
    const res = await fetchApi(`/api/campaigns/${dedupeCampaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "qa_block",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        category: "compliance_concern",
        notes: "Second bridge attempt should dedupe",
      },
    });
    evidence.push(`PATCH qa_block -> HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(JSON.stringify(res.json));

    const afterCount = countOpenComplianceHold(res.json.exceptionRecords);
    evidence.push(`open compliance_hold after qa_block=${afterCount}`);
    evidence.push(`exceptionRecords total=${res.json.exceptionRecords?.length ?? 0}`);
    if (afterCount !== 1) throw new Error("Duplicate bridge created a second open compliance_hold");
  });

  await runStep("11. client routes exclude exception data (403)", async (evidence) => {
    await ensureUsers(campaignId);

    jar.clear();
    await login(CLIENT_LOGIN);
    const getRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
    evidence.push(`client GET -> HTTP ${getRes.status}`);
    if (getRes.status !== 403) {
      const leakedRecords = getRes.json?.exceptionRecords;
      const leakedEvents = getRes.json?.exceptionEvents;
      evidence.push(`exceptionRecords in body=${Array.isArray(leakedRecords) ? leakedRecords.length : "absent"}`);
      evidence.push(`exceptionEvents in body=${Array.isArray(leakedEvents) ? leakedEvents.length : "absent"}`);
      throw new Error(`Expected 403, got ${getRes.status}`);
    }
    if (getRes.json?.exceptionRecords !== undefined) {
      throw new Error("403 response must not include exceptionRecords");
    }
    if (getRes.json?.exceptionEvents !== undefined) {
      throw new Error("403 response must not include exceptionEvents");
    }
    evidence.push("GET body has no exceptionRecords/exceptionEvents");

    const patchRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "raise_exception",
        kind: "routine_internal",
        title: "Client must not raise",
        description: "Forbidden client exception action",
      },
    });
    evidence.push(`client PATCH raise_exception -> HTTP ${patchRes.status}`);
    if (patchRes.status !== 403) throw new Error(`Expected 403, got ${patchRes.status}`);
    if (patchRes.json?.exceptionRecords !== undefined) {
      throw new Error("403 PATCH must not include exceptionRecords");
    }
  });

  const ok = printReport();
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
