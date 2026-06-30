/**
 * Slice 3d-c-b — Owner approval UI API checks
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 * Usage: node scripts/verify-slice3d-c-b.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const STAFF_PRODUCER_ID = "staff-producer-verify-3dc";
const STAFF_QA_ID = "staff-qa-verify-3dc";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const PRODUCER_LOGIN = { email: "producer-verify-3dc@local.dev", password: "dev-only" };

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
    campaignName: "Slice 3d-c-b Approval UI",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Approval UI verify",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 100000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 100000,
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
    selectedCampaignOption: "Option A",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureUsers(campaignId) {
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
  upsert(STAFF_PRODUCER_ID, PRODUCER_LOGIN.email, "Producer 3dc", ["staff"]);
  upsert(STAFF_QA_ID, "qa-verify-3dc@local.dev", "QA 3dc", ["staff"]);
  await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
  await writeFile(
    ASSIGNMENTS_PATH,
    JSON.stringify(
      {
        staffByUserId: {
          [STAFF_PRODUCER_ID]: [campaignId],
          [STAFF_QA_ID]: [campaignId],
        },
        staffCapabilities: {
          [STAFF_PRODUCER_ID]: ["producer_dispatcher"],
          [STAFF_QA_ID]: ["qa"],
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

async function bootstrapCampaign(campaignId) {
  await ensureUsers(campaignId);
  jar.clear();
  await login(OWNER_LOGIN);
  await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildCampaign(campaignId) },
  });
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await fetchApi(`/api/campaigns/${campaignId}/materials`);
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

  const campaignId = `verify-3dc-b-${randomUUID().slice(0, 8)}`;
  meta.campaignId = campaignId;
  let mcfId = "";
  let clientReqId = "";

  await runStep("1. bootstrap campaign", async (evidence) => {
    await mkdir(TASKS_DIR, { recursive: true });
    await bootstrapCampaign(campaignId);
    evidence.push(`campaignId=${campaignId}`);
  });

  await runStep("2. owner hold → waiting_internal without client send", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    const raise = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "raise_exception",
        kind: "missing_client_fact",
        title: "Hold verify MCF",
      },
    });
    if (raise.status !== 200) throw new Error(JSON.stringify(raise.json));
    mcfId = raise.json.exceptionRecords?.find((e) => e.kind === "missing_client_fact")?.id;
    if (!mcfId) throw new Error("No MCF exception");

    const hold = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "assign_exception",
        exceptionId: mcfId,
        notes: "Internal team to verify brand palette sources",
      },
    });
    evidence.push(`hold → HTTP ${hold.status}`);
    if (hold.status !== 200) throw new Error(JSON.stringify(hold.json));
    const exc = hold.json.exceptionRecords?.find((e) => e.id === mcfId);
    if (exc?.status !== "waiting_internal") throw new Error("Expected waiting_internal");
    if (exc?.promotion) throw new Error("Hold must not promote");
  });

  await runStep("3. owner approves from waiting_internal", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    const approve = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "approve_client_request",
        exceptionId: mcfId,
        category: "factual-confirmation",
        clientFacingLabel: "Brand colors",
        clientFacingPrompt: "Please confirm your brand hex codes",
        whyNeeded: "Needed to finalize copy palette",
        requirementLevel: "required",
      },
    });
    evidence.push(`approve from waiting_internal → HTTP ${approve.status}`);
    if (approve.status !== 200) throw new Error(JSON.stringify(approve.json));
    const exc = approve.json.exceptionRecords?.find((e) => e.id === mcfId);
    if (exc?.status !== "waiting_client") throw new Error("Expected waiting_client");
  });

  await runStep("4. decline client_request requires reason and blocks re-approve", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    const raise = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "raise_exception",
        kind: "client_request",
        title: "Decline verify",
        clientRequestDraft: { exactClientOnlyItem: "Brand guidelines PDF" },
      },
    });
    if (raise.status !== 200) throw new Error(JSON.stringify(raise.json));
    clientReqId = raise.json.exceptionRecords?.find(
      (e) => e.kind === "client_request" && e.title === "Decline verify",
    )?.id;

    const noReason = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: { action: "decline_promotion", exceptionId: clientReqId },
    });
    evidence.push(`decline without reason → HTTP ${noReason.status}`);
    if (noReason.status !== 400) throw new Error("Expected 400");

    const declined = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "decline_promotion",
        exceptionId: clientReqId,
        notes: "Studio can source from discovery intake",
      },
    });
    evidence.push(`decline with reason → HTTP ${declined.status}`);
    if (declined.status !== 200) throw new Error(JSON.stringify(declined.json));

    const reApprove = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "approve_client_request",
        exceptionId: clientReqId,
        category: "document-reference",
        clientFacingLabel: "Brand guidelines",
        clientFacingPrompt: "Please send brand guidelines",
        whyNeeded: "Needed for production",
        requirementLevel: "required",
      },
    });
    evidence.push(`re-approve after decline → HTTP ${reApprove.status}`);
    if (reApprove.status !== 403) throw new Error("Expected 403 after decline");
  });

  await runStep("5. producer cannot decline or approve", async (evidence) => {
    jar.clear();
    await login(PRODUCER_LOGIN);
    const raise = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "raise_exception",
        kind: "client_request",
        title: "Producer blocked",
        clientRequestDraft: { exactClientOnlyItem: "Photo" },
      },
    });
    if (raise.status !== 200) throw new Error(JSON.stringify(raise.json));
    const id = raise.json.exceptionRecords?.find(
      (e) => e.kind === "client_request" && e.title === "Producer blocked",
    )?.id;

    const approve = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "approve_client_request",
        exceptionId: id,
        category: "photo-video",
        clientFacingLabel: "Photo",
        clientFacingPrompt: "Please send photo",
        whyNeeded: "Needed",
        requirementLevel: "required",
      },
    });
    evidence.push(`producer approve → HTTP ${approve.status}`);
    if (approve.status !== 403) throw new Error("Expected 403");

    const decline = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: { action: "decline_promotion", exceptionId: id, notes: "No" },
    });
    evidence.push(`producer decline → HTTP ${decline.status}`);
    if (decline.status !== 403) throw new Error("Expected 403");
  });

  const ok = printReport();
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
