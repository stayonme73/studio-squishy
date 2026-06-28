/**
 * Slice 1b — File Room verification (repeatable)
 *
 * Prerequisites:
 *   - Dev server on localhost:3000
 *   - SESSION_SECRET in .env.local
 *
 * Usage: node scripts/verify-slice1b.mjs
 */

import { chromium } from "playwright";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const FIXTURE_IDS = new Set(["owner-qa-dev"]);
const STAFF_USER_ID = "staff-dev";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const STAFF_LOGIN = { email: "staff@local.dev", password: "dev-only" };

/** @typedef {{ pass: boolean; evidence: string[] }} StepResult */
/** @type {{ A: Record<string, StepResult>; B: Record<string, StepResult>; C: Record<string, StepResult>; D: Record<string, StepResult>; meta: Record<string, string> }} */
const report = { A: {}, B: {}, C: {}, D: {}, meta: {} };

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

/**
 * @param {string} urlPath
 * @param {RequestInit & { json?: unknown }} [options]
 */
async function fetchApi(urlPath, options = {}) {
  const headers = new Headers(options.headers ?? {});
  const cookie = jar.header();
  if (cookie) headers.set("Cookie", cookie);

  let body = options.body;
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }

  const res = await fetch(`${BASE}${urlPath}`, {
    ...options,
    headers,
    body,
    redirect: "manual",
  });

  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) {
    for (const c of setCookie) jar.absorb(c);
  } else {
    jar.absorb(res.headers.get("set-cookie"));
  }

  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 500) };
  }

  return { status: res.status, json, text, headers: res.headers };
}

function isFixtureCampaignId(campaignId) {
  if (FIXTURE_IDS.has(campaignId)) return true;
  return campaignId.startsWith("test-");
}

/** @param {string} campaignId */
function buildFullCampaignRecord(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 1b Verification Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Verification run",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    discoveryAnswers: { "your-business": "Verify Co", "your-focus": "Marketing & growth" },
    discoverySubmittedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: ["bf-001"],
      includedServiceIds: ["bf-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 50000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 50000,
      lineItems: [
        {
          skuId: "bf-001",
          serviceName: "Brand Foundation",
          billingType: "one_time",
          exactPriceCents: 50000,
          priceDisplay: "$500",
          deliverables: ["Brand guide PDF"],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: [],
          executionResponsibility: "studio",
        },
      ],
      approvedAt: now,
    },
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: {
        workingOn: "Slice 1b verify",
        mainOffer: "Verification offer",
        primaryApproverName: "Tagia",
        primaryApproverEmail: "tagia@local.dev",
      },
      files: [],
      submittedAt: now,
    },
    selectedCampaignOption: "Option A — Verify",
    createdAt: now,
    updatedAt: now,
  };
}

/** @param {string} section @param {string} label @param {() => Promise<void>} fn */
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

async function clearNonFixtureCampaignFiles() {
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  const files = await readdir(CAMPAIGNS_DIR).catch(() => []);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const id = file.slice(0, -5);
    if (isFixtureCampaignId(id) && process.env.ALLOW_FIXTURE_SYNC !== "1") continue;
    await rm(path.join(CAMPAIGNS_DIR, file), { force: true });
  }
}

async function writeFixtureCampaign() {
  const now = new Date().toISOString();
  const fixtureId = "owner-qa-dev";
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await writeFile(
    path.join(CAMPAIGNS_DIR, `${fixtureId}.json`),
    JSON.stringify(
      {
        campaignId: fixtureId,
        record: {
          ...buildFullCampaignRecord(fixtureId),
          campaignName: "FIXTURE — owner qa dev",
        },
        syncedAt: now,
        syncVersion: 1,
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function assignStaff(campaignId) {
  await mkdir(path.dirname(ASSIGNMENTS_PATH), { recursive: true });
  await writeFile(
    ASSIGNMENTS_PATH,
    JSON.stringify({ staffByUserId: { [STAFF_USER_ID]: [campaignId] } }, null, 2),
    "utf8",
  );
}

/** Dev-only — merge staff seed user into data/studio-users.json if missing. */
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
      email: "staff@local.dev",
      password: "dev-only",
      displayName: "Staff Dev",
      roles: ["staff"],
    });
    await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
  }
}

async function login(credentials) {
  const res = await fetchApi("/api/auth/login", { method: "POST", json: credentials });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status}`);
  return res.json?.user;
}

async function sectionA() {
  jar.clear();

  await runStep("A", "file-room returns 401 with no session", async (evidence) => {
    const res = await fetchApi("/file-room");
    evidence.push(`GET /file-room → HTTP ${res.status}`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await runStep("A", "file-room detail returns 401 with no session", async (evidence) => {
    const res = await fetchApi("/file-room/some-id");
    evidence.push(`GET /file-room/some-id → HTTP ${res.status}`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });
}

async function sectionB() {
  jar.clear();
  await clearNonFixtureCampaignFiles();

  const campaignId = randomUUID();
  const otherCampaignId = randomUUID();
  const record = buildFullCampaignRecord(campaignId);
  const otherRecord = buildFullCampaignRecord(otherCampaignId);
  otherRecord.campaignName = "Slice 1b Other Campaign";
  report.meta.testCampaignId = campaignId;
  report.meta.otherCampaignId = otherCampaignId;

  await writeFixtureCampaign();
  await assignStaff(campaignId);

  await runStep("B", "owner login and sync verification campaign", async (evidence) => {
    const user = await login(OWNER_LOGIN);
    evidence.push(`Owner roles: ${(user?.roles ?? []).join(", ")}`);
    const res = await fetchApi("/api/campaigns/current", { method: "PATCH", json: { record } });
    evidence.push(`PATCH sync → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(`Sync failed: ${JSON.stringify(res.json)}`);

    const res2 = await fetchApi("/api/campaigns/current", {
      method: "PATCH",
      json: { record: otherRecord },
    });
    evidence.push(`PATCH second campaign → HTTP ${res2.status}`);
  });

  await runStep("B", "owner list shows verification campaign, hides fixture", async (evidence) => {
    const res = await fetchApi("/file-room");
    evidence.push(`GET /file-room → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.text.includes("Slice 1b Verification Campaign")) {
      throw new Error("Missing verification campaign on list");
    }
    if (res.text.includes("FIXTURE — owner qa dev")) {
      throw new Error("Fixture campaign visible on owner list");
    }
    evidence.push("List includes verification campaign; fixture hidden");
  });

  await runStep("B", "owner detail shows frozen plan and approved direction", async (evidence) => {
    const res = await fetchApi(`/file-room/${campaignId}`);
    evidence.push(`GET detail → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.text.includes("Brand guide PDF")) throw new Error("Missing frozen plan deliverable");
    if (!res.text.includes("Option A — Verify")) throw new Error("Missing approved direction");
    if (!res.text.includes("data/campaigns/")) throw new Error("Missing sync source indicator");
    evidence.push("Detail includes frozen plan, direction, sync badge");
  });
}

async function sectionC() {
  jar.clear();
  const campaignId = report.meta.testCampaignId;
  const otherCampaignId = report.meta.otherCampaignId;
  if (!campaignId) throw new Error("Missing test campaignId from section B");

  await assignStaff(campaignId);
  await ensureStaffSeedUser();

  await runStep("C", "staff login (dev-only seed user)", async (evidence) => {
    const user = await login(STAFF_LOGIN);
    evidence.push(`Staff roles: ${(user?.roles ?? []).join(", ")}`);
    if (!user?.roles?.includes("staff")) throw new Error("Expected staff role");
    if (user.roles.includes("owner")) throw new Error("Staff seed must not include owner");
  });

  await runStep("C", "staff list shows only assigned campaign", async (evidence) => {
    const res = await fetchApi("/file-room");
    evidence.push(`GET /file-room → HTTP ${res.status}`);
    if (!res.text.includes("Slice 1b Verification Campaign")) {
      throw new Error("Assigned campaign missing from staff list");
    }
    if (res.text.includes("Slice 1b Other Campaign")) {
      throw new Error("Unassigned campaign visible to staff");
    }
    evidence.push("Staff list limited to assigned campaign");
  });

  await runStep("C", "staff forbidden on unassigned campaign detail", async (evidence) => {
    const res = await fetchApi(`/file-room/${otherCampaignId}`);
    evidence.push(`GET unassigned detail → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(`Expected 200 page with forbidden state, got ${res.status}`);
    if (!res.text.includes("Access restricted")) {
      throw new Error("Expected forbidden state for unassigned campaign");
    }
  });

  await runStep("C", "staff can open assigned campaign detail", async (evidence) => {
    const res = await fetchApi(`/file-room/${campaignId}`);
    evidence.push(`GET assigned detail → HTTP ${res.status}`);
    if (!res.text.includes("Slice 1b Verification Campaign")) {
      throw new Error("Assigned campaign detail not rendered");
    }
  });
}

async function sectionD() {
  jar.clear();

  await runStep("D", "wrong campaign id shows not found for owner", async (evidence) => {
    await login(OWNER_LOGIN);
    const res = await fetchApi(`/file-room/${randomUUID()}`);
    evidence.push(`GET missing id → HTTP ${res.status}`);
    if (!res.text.includes("Campaign not found")) {
      throw new Error("Expected not-found state");
    }
  });

  await runStep("D", "fixture id blocked on detail route", async (evidence) => {
    const res = await fetchApi("/file-room/owner-qa-dev");
    evidence.push(`GET fixture detail → HTTP ${res.status}`);
    if (!res.text.includes("Access restricted")) {
      throw new Error("Expected forbidden for fixture detail");
    }
  });

  await runStep("D", "customer routes have no File Room nav links", async (evidence) => {
    for (const route of ["/studio-board", "/project-summary"]) {
      const res = await fetchApi(route);
      evidence.push(`GET ${route} → HTTP ${res.status}`);
      const lower = res.text.toLowerCase();
      if (lower.includes("/file-room")) throw new Error(`${route} contains /file-room link`);
      evidence.push(`${route}: no File Room links`);
    }
  });

  await runStep("D", "logout returns file-room to 401", async (evidence) => {
    await fetchApi("/api/auth/logout", { method: "POST" });
    const res = await fetchApi("/file-room");
    evidence.push(`GET /file-room after logout → HTTP ${res.status}`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });
}

function printReport() {
  console.log("\n" + "=".repeat(72));
  console.log("SLICE 1b VERIFICATION REPORT");
  console.log("=".repeat(72));
  console.log(`Base URL: ${BASE}`);
  console.log(`Test campaignId: ${report.meta.testCampaignId ?? "n/a"}`);
  console.log("");

  for (const section of ["A", "B", "C", "D"]) {
    console.log(`--- Section ${section} ---`);
    for (const [label, result] of Object.entries(report[section])) {
      const icon = result.pass ? "PASS" : "FAIL";
      console.log(`  [${icon}] ${label}`);
      for (const line of result.evidence) console.log(`         ${line}`);
    }
    console.log("");
  }

  const allPass = ["A", "B", "C", "D"].every((s) =>
    Object.values(report[s]).every((r) => r.pass),
  );
  console.log(allPass ? "OVERALL: PASS" : "OVERALL: FAIL");
  console.log("=".repeat(72));
  return allPass;
}

async function main() {
  console.log("Slice 1b verification starting…");
  try {
    const probe = await fetch(BASE);
    console.log(`Dev server reachable: HTTP ${probe.status}`);
  } catch (error) {
    console.error(`Dev server not reachable at ${BASE}:`, error);
    process.exit(1);
  }

  await sectionA();
  await sectionB();
  await sectionC();
  await sectionD();

  const pass = printReport();
  await mkdir(path.join(process.cwd(), "tmp"), { recursive: true });
  await writeFile(
    path.join(process.cwd(), "tmp", "verify-slice1b-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log("Report JSON: tmp/verify-slice1b-report.json");
  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
