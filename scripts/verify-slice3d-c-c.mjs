/**
 * Slice 3d-c-c — Client Studio Board materials rendering
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 * Usage: node scripts/verify-slice3d-c-c.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const STAFF_PRODUCER_ID = "staff-producer-verify-3dc";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
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

function buildCampaign(campaignId, { projectDetailsSubmittedAt = undefined } = {}) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 3d-c-c Client Board",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Client materials verify",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001", "bf-001"],
      includedServiceIds: ["sm-001", "bf-001"],
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
          clientResponsibilities: ["Existing logo files if available"],
          executionResponsibility: "studio",
        },
      ],
      approvedAt: now,
    },
    selectedCampaignOption: "Option A",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt,
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
  const client = users.find((user) => user.email === CLIENT_LOGIN.email);
  if (client) Object.assign(client, { currentCampaignId: campaignId, roles: ["client"] });
  await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
  await writeFile(
    ASSIGNMENTS_PATH,
    JSON.stringify(
      {
        staffByUserId: { [STAFF_PRODUCER_ID]: [campaignId] },
        staffCapabilities: { [STAFF_PRODUCER_ID]: ["producer_dispatcher"] },
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

function assertNoInternalLeaks(payload, text) {
  const forbidden = [
    "sourceExceptionId",
    "underlyingItemIds",
    "relatedServiceIds",
    "exceptionRecords",
    "File Room",
    "waiting_internal",
    "waiting_owner",
    "teamNote",
    "raisedByDisplayName",
  ];
  const blob = `${text} ${JSON.stringify(payload)}`;
  for (const term of forbidden) {
    if (blob.includes(term)) throw new Error(`Client payload leaked internal term: ${term}`);
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

async function bootstrapCampaign(campaignId, options = {}) {
  await ensureUsers(campaignId);
  jar.clear();
  await login(OWNER_LOGIN);
  await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildCampaign(campaignId, options) },
  });
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await fetchApi(`/api/campaigns/${campaignId}/materials`);
}

async function approveLogoRequest(campaignId) {
  jar.clear();
  await login(OWNER_LOGIN);
  const raise = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "client_request",
      title: "Need logo",
      clientRequestDraft: { exactClientOnlyItem: "Vector logo" },
    },
  });
  if (raise.status !== 200) throw new Error(JSON.stringify(raise.json));
  const exceptionId = raise.json.exceptionRecords?.find((e) => e.kind === "client_request")?.id;
  const approve = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "approve_client_request",
      exceptionId,
      category: "logo-brand",
      clientFacingLabel: "Logo file",
      clientFacingPrompt: "Please send your logo file",
      whyNeeded: "Needed for Social Media Launch Set and Brand Foundation",
      requirementLevel: "required",
      relatedServiceIds: ["sm-001", "bf-001"],
    },
  });
  if (approve.status !== 200) throw new Error(JSON.stringify(approve.json));
  return exceptionId;
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

  const campaignId = `verify-3dc-c-${randomUUID().slice(0, 8)}`;
  meta.campaignId = campaignId;

  await runStep("1. bootstrap campaign without project details submit", async (evidence) => {
    await mkdir(TASKS_DIR, { recursive: true });
    await bootstrapCampaign(campaignId, { projectDetailsSubmittedAt: undefined });
    evidence.push(`campaignId=${campaignId}`);
    evidence.push("projectDetailsSubmittedAt unset");
  });

  await runStep("2. approved promotion visible once on client API", async (evidence) => {
    await approveLogoRequest(campaignId);
    jar.clear();
    await login(CLIENT_LOGIN);
    const materials = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    if (materials.status !== 200) throw new Error(JSON.stringify(materials.json));
    assertNoInternalLeaks(materials.json, materials.text);
    const consolidated = materials.json.consolidatedRequests ?? [];
    const logoRows = consolidated.filter((r) => r.id === "logo-brand:file-metadata");
    evidence.push(`logo consolidated rows: ${logoRows.length}`);
    evidence.push(`clientIntakeCount=${materials.json.clientIntakeCount}`);
    if (logoRows.length !== 1) throw new Error("Expected exactly one logo consolidated row");
    if (logoRows[0]?.label !== "Logo file") throw new Error("Expected approved client label");
    if (materials.json.clientIntakeCount < 1) throw new Error("Expected clientIntakeCount >= 1");
  });

  await runStep("3. submitted row stays visible — Received under review", async (evidence) => {
    jar.clear();
    await login(CLIENT_LOGIN);
    const submit = await fetchApi(`/api/campaigns/${campaignId}/materials`, {
      method: "PATCH",
      json: {
        action: "client_submit_consolidated",
        consolidatedItemId: "logo-brand:file-metadata",
        payload: { fileName: "logo.svg", mimeType: "image/svg+xml" },
      },
    });
    evidence.push(`submit → HTTP ${submit.status}`);
    if (submit.status !== 200) throw new Error(JSON.stringify(submit.json));
    assertNoInternalLeaks(submit.json, submit.text);

    const consolidated = submit.json.consolidatedRequests ?? [];
    const logo = consolidated.find((r) => r.id === "logo-brand:file-metadata");
    evidence.push(`consolidated after submit: ${consolidated.length}`);
    evidence.push(`statusLabel=${logo?.statusLabel}`);
    evidence.push(`canSubmit=${logo?.canSubmit}`);
    evidence.push(`blockingRequiredCount=${submit.json.blockingRequiredCount}`);
    evidence.push(`clientIntakeCount=${submit.json.clientIntakeCount}`);

    if (!logo) throw new Error("Submitted row disappeared (trapdoor)");
    if (logo.statusLabel !== "Received — under review") {
      throw new Error(`Expected Received — under review, got ${logo.statusLabel}`);
    }
    if (logo.canSubmit !== false) throw new Error("Submit should be disabled while under review");
    if (submit.json.clientIntakeCount < 1) {
      throw new Error("Panel intake count should stay > 0 after submit");
    }
  });

  await runStep("4. unapproved exception invisible on client view", async (evidence) => {
    jar.clear();
    await login(CLIENT_LOGIN);
    const beforeMaterials = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    const docBefore = (beforeMaterials.json.consolidatedRequests ?? []).filter(
      (r) => r.id === "document-reference:file-metadata",
    ).length;
    evidence.push(`document-reference rows before raise: ${docBefore}`);

    jar.clear();
    await login(OWNER_LOGIN);
    const raise = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "raise_exception",
        kind: "client_request",
        title: "Need document",
        clientRequestDraft: { exactClientOnlyItem: "Brand guidelines PDF" },
      },
    });
    if (raise.status !== 200) throw new Error(JSON.stringify(raise.json));

    jar.clear();
    await login(CLIENT_LOGIN);
    const materials = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    assertNoInternalLeaks(materials.json, materials.text);
    const docAfter = (materials.json.consolidatedRequests ?? []).filter(
      (r) => r.id === "document-reference:file-metadata",
    ).length;
    evidence.push(`document-reference rows after unapproved raise: ${docAfter}`);
    if (docAfter > docBefore) {
      throw new Error("Unapproved exception must not add document-reference consolidated request");
    }
  });

  await runStep("5. same-bucket conflicting promotion stays internal (L3)", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    const raise = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "raise_exception",
        kind: "client_request",
        title: "Need vector logo alt",
        clientRequestDraft: { exactClientOnlyItem: "Vector logo alt" },
      },
    });
    const conflictId = raise.json.exceptionRecords?.find(
      (e) => e.kind === "client_request" && e.title === "Need vector logo alt",
    )?.id;
    const conflictApprove = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "approve_client_request",
        exceptionId: conflictId,
        category: "logo-brand",
        clientFacingLabel: "Vector logo",
        clientFacingPrompt: "Please send a vector logo file",
        whyNeeded: "Needed for print-ready assets",
        requirementLevel: "required",
        relatedServiceIds: ["bf-001"],
      },
    });
    evidence.push(`conflict approve → HTTP ${conflictApprove.status}`);
    if (conflictApprove.status !== 200) throw new Error(JSON.stringify(conflictApprove.json));

    jar.clear();
    await login(CLIENT_LOGIN);
    const clientMaterials = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    assertNoInternalLeaks(clientMaterials.json, clientMaterials.text);
    const logoRows = (clientMaterials.json.consolidatedRequests ?? []).filter(
      (r) => r.id === "logo-brand:file-metadata",
    );
    evidence.push(`client logo rows after conflict: ${logoRows.length}`);
    evidence.push(`client label=${logoRows[0]?.label}`);
    if (logoRows.length !== 1) throw new Error("Expected single consolidated logo row");
    if (logoRows[0]?.label !== "Logo file") throw new Error("First approved label must win");
    if (clientMaterials.text.includes("Vector logo")) {
      throw new Error("Conflicting label leaked to client API");
    }

    jar.clear();
    await login(OWNER_LOGIN);
    const teamMaterials = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    const conflictItems = (teamMaterials.json.materials?.items ?? []).filter(
      (item) => item.sourceExceptionId === conflictId,
    );
    evidence.push(`team ledger items for conflict promotion: ${conflictItems.length}`);
    if (conflictItems.length === 0) throw new Error("Conflict promotion should exist on team ledger");
  });

  const ok = printReport();
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
