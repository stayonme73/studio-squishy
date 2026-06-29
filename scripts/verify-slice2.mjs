/**
 * Slice 2c — Materials client intake + team review verification
 *
 * Prerequisites:
 *   - Dev server on localhost:3000
 *   - SESSION_SECRET in .env.local
 *
 * Usage: node scripts/verify-slice2.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const STAFF_USER_ID = "staff-dev";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const STAFF_LOGIN = { email: "staff@local.dev", password: "dev-only" };
const CLIENT_LOGIN = { email: "client@local.dev", password: "dev-only" };

/** @type {{ F: Record<string, { pass: boolean; evidence: string[] }>; G: Record<string, { pass: boolean; evidence: string[] }>; H: Record<string, { pass: boolean; evidence: string[] }>; meta: Record<string, string> }} */
const report = { F: {}, G: {}, H: {}, meta: {} };

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
function buildMultiServiceCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 2c Materials Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Slice 2c verify",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: ["bf-001", "bf-002", "sm-001"],
      includedServiceIds: ["bf-001", "bf-002", "sm-001"],
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
          skuId: "bf-002",
          serviceName: "Marketing Video Project",
          billingType: "one_time",
          exactPriceCents: 50000,
          priceDisplay: "$500",
          deliverables: ["Video"],
          exclusions: [],
          timingWindowLabel: "3 weeks",
          revisionRule: "1 round",
          clientResponsibilities: ["Logo assets"],
          executionResponsibility: "studio",
        },
        {
          skuId: "sm-001",
          serviceName: "Social Media Launch Set",
          billingType: "monthly",
          exactPriceCents: 0,
          priceDisplay: "$0/mo",
          deliverables: ["Posts"],
          exclusions: [],
          timingWindowLabel: "Monthly",
          revisionRule: "1 round",
          clientResponsibilities: ["Brand logo and social access"],
          executionResponsibility: "shared",
        },
      ],
      approvedAt: now,
    },
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: { workingOn: "Verify", primaryApproverName: "Client", primaryApproverEmail: "client@local.dev" },
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

async function clearCampaign(campaignId) {
  await rm(path.join(CAMPAIGNS_DIR, `${campaignId}.json`), { force: true });
  await rm(path.join(MATERIALS_DIR, `${campaignId}.json`), { force: true });
}

async function sectionF() {
  jar.clear();
  const campaignId = randomUUID();
  report.meta.campaignId = campaignId;
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await mkdir(MATERIALS_DIR, { recursive: true });
  await ensureClientUser(campaignId);

  const record = buildMultiServiceCampaign(campaignId);
  await login(OWNER_LOGIN);
  await fetchApi("/api/campaigns/current", { method: "PATCH", json: { record } });

  await runStep("F", "client GET returns consolidated requests not full ledger", async (evidence) => {
    jar.clear();
    await login(CLIENT_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    evidence.push(`GET → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.json?.materials) throw new Error("Client should not receive full materials ledger");
    const consolidated = res.json?.consolidatedRequests ?? [];
    evidence.push(`consolidatedRequests=${consolidated.length}`);
    const logo = consolidated.find((item) => item.id === "logo-brand:file-metadata");
    if (!logo) throw new Error("Missing consolidated logo request");
    if ((logo.underlyingItemIds?.length ?? 0) < 2) {
      throw new Error("Expected multiple underlying logo slots consolidated");
    }
    evidence.push(`logo underlying slots=${logo.underlyingItemIds.length}`);
  });

  await runStep("F", "studio-board has no File Room links", async (evidence) => {
    const res = await fetchApi("/studio-board");
    evidence.push(`GET /studio-board → HTTP ${res.status}`);
    if (res.text.toLowerCase().includes("/file-room")) {
      throw new Error("Studio Board contains File Room link");
    }
  });
}

async function sectionG() {
  const campaignId = report.meta.campaignId;
  if (!campaignId) throw new Error("Missing campaignId");

  await runStep("G", "client consolidated submit succeeds", async (evidence) => {
    jar.clear();
    await login(CLIENT_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/materials`, {
      method: "PATCH",
      json: {
        action: "client_submit_consolidated",
        consolidatedItemId: "logo-brand:file-metadata",
        payload: { fileName: "brand-logo.svg", mimeType: "image/svg+xml" },
      },
    });
    evidence.push(`PATCH → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(JSON.stringify(res.json));
    if ((res.json?.blockingRequiredCount ?? 0) > 0) {
      evidence.push(`remaining blocking=${res.json.blockingRequiredCount}`);
    }
  });

  await runStep("G", "client submit rejects secret-like payload", async (evidence) => {
    jar.clear();
    await login(CLIENT_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/materials`, {
      method: "PATCH",
      json: {
        action: "client_submit_consolidated",
        consolidatedItemId: "url-link:url",
        payload: { url: "https://example.com", note: "password: secret123" },
      },
    });
    evidence.push(`PATCH secret → HTTP ${res.status}`);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await runStep("G", "staff forbidden on client submit", async (evidence) => {
    jar.clear();
    await ensureStaffSeedUser();
    await assignStaff(campaignId);
    await login(STAFF_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/materials`, {
      method: "PATCH",
      json: {
        action: "client_submit_consolidated",
        consolidatedItemId: "logo-brand:file-metadata",
        payload: { fileName: "nope.png" },
      },
    });
    evidence.push(`staff client submit → HTTP ${res.status}`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });
}

async function sectionH() {
  const campaignId = report.meta.campaignId;
  if (!campaignId) throw new Error("Missing campaignId");

  await runStep("H", "owner team review approves submitted logo slots", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    const getRes = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    const items = getRes.json?.materials?.items ?? [];
    const submitted = items.find(
      (item) => item.category === "logo-brand" && item.reviewStatus === "submitted",
    );
    if (!submitted) throw new Error("No submitted logo item to review");
    const res = await fetchApi(`/api/campaigns/${campaignId}/materials`, {
      method: "PATCH",
      json: {
        action: "team_review",
        itemId: submitted.id,
        reviewStatus: "approved_for_use",
      },
    });
    evidence.push(`PATCH team_review → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(JSON.stringify(res.json));
    const updated = res.json?.materials?.items?.find((item) => item.id === submitted.id);
    if (updated?.reviewStatus !== "approved_for_use") {
      throw new Error("Expected approved_for_use status");
    }
  });

  await runStep("H", "file-room detail shows team review controls", async (evidence) => {
    const res = await fetchApi(`/file-room/${campaignId}`);
    evidence.push(`GET file-room detail → HTTP ${res.status}`);
    if (!res.text.includes("Approve for use")) {
      throw new Error("Missing team review controls in File Room");
    }
    if (!res.text.includes("Materials ledger")) {
      throw new Error("Missing materials ledger section");
    }
  });

  await runStep("H", "unassigned staff forbidden on team review", async (evidence) => {
    const otherId = randomUUID();
    await clearCampaign(otherId);
    const otherRecord = buildMultiServiceCampaign(otherId);
    otherRecord.campaignName = "Other campaign";
    jar.clear();
    await login(OWNER_LOGIN);
    await fetchApi("/api/campaigns/current", { method: "PATCH", json: { record: otherRecord } });
    await fetchApi(`/api/campaigns/${otherId}/materials`);

    jar.clear();
    await ensureStaffSeedUser();
    await assignStaff(campaignId);
    await login(STAFF_LOGIN);
    const getRes = await fetchApi(`/api/campaigns/${otherId}/materials`);
    evidence.push(`staff GET other → HTTP ${getRes.status}`);
    if (getRes.status !== 403) throw new Error(`Expected 403, got ${getRes.status}`);
  });
}

function printReport() {
  console.log("\n" + "=".repeat(72));
  console.log("SLICE 2c VERIFICATION REPORT");
  console.log("=".repeat(72));
  console.log(`Base URL: ${BASE}`);
  console.log(`Campaign: ${report.meta.campaignId ?? "n/a"}`);
  console.log("");
  for (const section of ["F", "G", "H"]) {
    console.log(`--- Section ${section} ---`);
    for (const [label, result] of Object.entries(report[section])) {
      console.log(`  [${result.pass ? "PASS" : "FAIL"}] ${label}`);
      for (const line of result.evidence) console.log(`         ${line}`);
    }
    console.log("");
  }
  const allPass = ["F", "G", "H"].every((s) => Object.values(report[s]).every((r) => r.pass));
  console.log(allPass ? "OVERALL: PASS" : "OVERALL: FAIL");
  console.log("=".repeat(72));
  return allPass;
}

async function main() {
  console.log("Slice 2c verification starting…");
  try {
    const probe = await fetch(BASE);
    console.log(`Dev server reachable: HTTP ${probe.status}`);
  } catch (error) {
    console.error(`Dev server not reachable at ${BASE}:`, error);
    process.exit(1);
  }

  await sectionF();
  await sectionG();
  await sectionH();

  const pass = printReport();
  await mkdir(path.join(process.cwd(), "tmp"), { recursive: true });
  await writeFile(
    path.join(process.cwd(), "tmp", "verify-slice2-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
