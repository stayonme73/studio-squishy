/**
 * Slice 3a — Production task plan verification
 *
 * Prerequisites:
 *   - Dev server on localhost:3000
 *   - SESSION_SECRET in .env.local
 *
 * Usage: node scripts/verify-slice3.mjs
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

/** @type {{ I: Record<string, { pass: boolean; evidence: string[] }>; meta: Record<string, string> }} */
const report = { I: {}, meta: {} };

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
    campaignName: "Slice 3a Task Plan Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Slice 3a verify",
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
    selectedCampaignOption: "Option A — Bold",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: {
        workingOn: "Verify tasks",
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
    JSON.stringify({ staffByUserId: { [STAFF_USER_ID]: [campaignId] } }, null, 2),
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

async function clearCampaign(campaignId) {
  await rm(path.join(CAMPAIGNS_DIR, `${campaignId}.json`), { force: true });
  await rm(path.join(MATERIALS_DIR, `${campaignId}.json`), { force: true });
  await rm(path.join(TASKS_DIR, `${campaignId}.json`), { force: true });
}

async function sectionI() {
  jar.clear();
  const campaignId = randomUUID();
  report.meta.campaignId = campaignId;
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await mkdir(MATERIALS_DIR, { recursive: true });
  await mkdir(TASKS_DIR, { recursive: true });
  await ensureClientUser(campaignId);
  await ensureStaffSeedUser();

  const record = buildTaskPlanCampaign(campaignId);
  await login(OWNER_LOGIN);
  await fetchApi("/api/campaigns/current", { method: "PATCH", json: { record } });
  await assignStaff(campaignId);

  await runStep("I", "owner GET tasks returns generated plan", async (evidence) => {
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
    evidence.push(`GET → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const tasks = res.json?.tasks ?? [];
    evidence.push(`tasks=${tasks.length}`);
    if (tasks.length < 5) throw new Error("Expected multiple generated tasks");
    const skuIds = new Set(tasks.flatMap((task) => task.relatedServiceIds ?? []));
    if (!skuIds.has("bf-001") || !skuIds.has("sm-001") || !skuIds.has("em-001")) {
      throw new Error("Missing expected service tasks");
    }
    if (!res.json?.planFingerprint) throw new Error("Missing planFingerprint");
    evidence.push(`planFingerprint=${res.json.planFingerprint}`);
  });

  await runStep("I", "client GET tasks → 403", async (evidence) => {
    jar.clear();
    await login(CLIENT_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
    evidence.push(`GET → HTTP ${res.status}`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await runStep("I", "unassigned staff GET tasks → 403", async (evidence) => {
    jar.clear();
    await login(STAFF_LOGIN);
    await writeFile(
      ASSIGNMENTS_PATH,
      JSON.stringify({ staffByUserId: { [STAFF_USER_ID]: ["other-campaign"] } }, null, 2),
      "utf8",
    );
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
    evidence.push(`GET → HTTP ${res.status}`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    await assignStaff(campaignId);
  });

  await runStep("I", "assigned staff GET tasks → 200", async (evidence) => {
    jar.clear();
    await login(STAFF_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
    evidence.push(`GET → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  await runStep("I", "idempotent generation preserves task ids", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    const first = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
    const second = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
    const idsA = (first.json?.tasks ?? []).map((task) => task.id).sort();
    const idsB = (second.json?.tasks ?? []).map((task) => task.id).sort();
    evidence.push(`first=${idsA.length} second=${idsB.length}`);
    if (JSON.stringify(idsA) !== JSON.stringify(idsB)) {
      throw new Error("Task ids changed on repeat GET");
    }
    if (first.json?.planFingerprint !== second.json?.planFingerprint) {
      throw new Error("planFingerprint changed on repeat GET");
    }
  });

  await runStep("I", "file-room HTML includes Production task plan section", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    const res = await fetchApi(`/file-room/${campaignId}`);
    evidence.push(`GET → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.text.includes("Production task plan")) {
      throw new Error("Missing Production task plan section");
    }
    if (res.text.includes("PATCH") || res.text.includes("Assign")) {
      throw new Error("File Room should not expose assignment controls in Slice 3a");
    }
  });

  await runStep("I", "tasks JSON file created on disk", async (evidence) => {
    const raw = await readFile(path.join(TASKS_DIR, `${campaignId}.json`), "utf8");
    const envelope = JSON.parse(raw);
    evidence.push(`tasks on disk=${envelope.tasks?.length ?? 0}`);
    if (!envelope.planFingerprint) throw new Error("Missing planFingerprint in store file");
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

  await sectionI();
  const pass = printReport();
  await mkdir(path.join(process.cwd(), "tmp"), { recursive: true });
  await writeFile(
    path.join(process.cwd(), "tmp", "verify-slice3-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
