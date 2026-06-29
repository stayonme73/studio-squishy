/**
 * Slice 3d-c-a — Owner client-material promotion API
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 * Usage: node scripts/verify-slice3d-c-a.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const STAFF_PRODUCER_ID = "staff-producer-verify-3dc";
const STAFF_QA_ID = "staff-qa-verify-3dc";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const PRODUCER_LOGIN = { email: "producer-verify-3dc@local.dev", password: "dev-only" };
const QA_LOGIN = { email: "qa-verify-3dc@local.dev", password: "dev-only" };
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

function buildCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 3d-c-a Promotion",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Promotion verify",
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
          serviceName: "Brand Foundation",
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
    projectDetailsSubmittedAt: now,
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
  upsert(STAFF_PRODUCER_ID, PRODUCER_LOGIN.email, "Producer 3dc", ["staff"]);
  upsert(STAFF_QA_ID, QA_LOGIN.email, "QA 3dc", ["staff"]);
  const client = users.find((user) => user.email === CLIENT_LOGIN.email);
  if (client) Object.assign(client, { currentCampaignId: campaignId, roles: ["client"] });
  await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

async function assignStaff(campaignId) {
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


const MCF_APPROVE_BODY = {
  category: "factual-confirmation",
  clientFacingLabel: "Brand colors",
  clientFacingPrompt: "Please confirm your brand hex codes",
  whyNeeded: "Needed to finalize copy palette",
  requirementLevel: "required",
  relatedServiceIds: ["sm-001"],
};

async function assignStaffForCampaign(campaignId) {
  await mkdir(path.dirname(ASSIGNMENTS_PATH), { recursive: true });
  let assignments = { staffByUserId: {}, staffCapabilities: {} };
  try {
    assignments = JSON.parse(await readFile(ASSIGNMENTS_PATH, "utf8"));
  } catch {
    /* fresh */
  }
  assignments.staffByUserId[STAFF_PRODUCER_ID] = [
    ...new Set([...(assignments.staffByUserId[STAFF_PRODUCER_ID] ?? []), campaignId]),
  ];
  assignments.staffByUserId[STAFF_QA_ID] = [
    ...new Set([...(assignments.staffByUserId[STAFF_QA_ID] ?? []), campaignId]),
  ];
  assignments.staffCapabilities[STAFF_PRODUCER_ID] = ["producer_dispatcher"];
  assignments.staffCapabilities[STAFF_QA_ID] = ["qa"];
  await writeFile(ASSIGNMENTS_PATH, JSON.stringify(assignments, null, 2), "utf8");
}

async function bootstrapCampaign(campaignId) {
  await ensureUsers(campaignId);
  await assignStaffForCampaign(campaignId);
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

  const campaignId = `verify-3dc-a-${randomUUID().slice(0, 8)}`;
  let exceptionId = "";
  let mcfExceptionId = "";

  await runStep("1. bootstrap campaign + materials", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    await mkdir(TASKS_DIR, { recursive: true });
    await bootstrapCampaign(campaignId);
    meta.campaignId = campaignId;
    await fetchApi("/api/campaigns/current", {
      method: "PATCH",
      json: { record: buildCampaign(campaignId) },
    });
    const res = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    evidence.push(`GET materials → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(JSON.stringify(res.json));
  });

  await runStep("2. owner approves logo spanning services", async (evidence) => {
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
    exceptionId = raise.json.exceptionRecords?.find((e) => e.kind === "client_request")?.id;
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
      evidence.push(`approve → HTTP ${approve.status}`);
      if (approve.status !== 200) throw new Error(JSON.stringify(approve.json));
      if (approve.json.exceptionRecords?.find((e) => e.id === exceptionId)?.status !== "waiting_client") {
        throw new Error("Expected waiting_client after approve");
      }
      jar.clear();
      await login(CLIENT_LOGIN);
      const materials = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    const consolidated = materials.json.consolidatedRequests ?? [];
    const logo = consolidated.find((r) => r.id === "logo-brand:file-metadata");
    evidence.push(`consolidated logo requests: ${consolidated.length}`);
    if (!logo || logo.underlyingItemIds.length < 2) throw new Error("Expected one consolidated logo request");
  });

  await runStep("3. producer cannot approve", async (evidence) => {
    jar.clear();
    await login(PRODUCER_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "approve_client_request",
        exceptionId,
        category: "logo-brand",
        clientFacingLabel: "Logo file",
        clientFacingPrompt: "Please send your logo file",
        whyNeeded: "Needed",
        requirementLevel: "required",
      },
    });
    evidence.push(`producer approve → HTTP ${res.status}`);
    if (res.status !== 403) throw new Error("Expected 403");
  });

  await runStep("4. client submit does not resolve exception", async (evidence) => {
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
    evidence.push(`client submit → HTTP ${submit.status}`);
    if (submit.status !== 200) throw new Error(JSON.stringify(submit.json));
    jar.clear();
    await login(OWNER_LOGIN);
    const tasks = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
    const exc = tasks.json.exceptionRecords?.find((e) => e.id === exceptionId);
    evidence.push(`exception status after submit: ${exc?.status}`);
    if (exc?.status === "resolved") throw new Error("Submit must not resolve exception");
    if (exc?.status !== "waiting_internal") throw new Error("Expected waiting_internal");
  });

await runStep("5. reject secret wording", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    const raise = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "raise_exception",
        kind: "client_request",
        title: "Need access",
        clientRequestDraft: { exactClientOnlyItem: "Admin access" },
      },
    });
    const nextId = raise.json.exceptionRecords?.find(
      (e) => e.kind === "client_request" && e.id !== exceptionId,
    )?.id;
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "approve_client_request",
        exceptionId: nextId,
        category: "access-instructions",
        clientFacingLabel: "Access",
        clientFacingPrompt: "Share your password here",
        whyNeeded: "Needed for setup",
        requirementLevel: "required",
      },
    });
    evidence.push(`secret approve -> HTTP ${res.status}`);
    if (res.status !== 400) throw new Error("Expected 400 for secret wording");
  });

await runStep("6. missing_client_fact promotion path", async (evidence) => {
    await seedCopyReadyForQa(campaignId);
    jar.clear();
    await login(QA_LOGIN);
    const fail = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
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
    evidence.push(`qa_fail -> HTTP ${fail.status}`);
    if (fail.status !== 200) throw new Error(JSON.stringify(fail.json));
    mcfExceptionId = fail.json.exceptionRecords?.find(
      (e) => e.kind === "missing_client_fact" && e.status !== "resolved",
    )?.id;
    if (!mcfExceptionId) throw new Error("Missing missing_client_fact exception");

    jar.clear();
    await login(OWNER_LOGIN);
    const teamBefore = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    const linkedBefore = (teamBefore.json.materials?.items ?? []).filter(
      (item) => item.sourceExceptionId === mcfExceptionId,
    );
    evidence.push(`ledger items linked before MCF approve: ${linkedBefore.length}`);
    if (linkedBefore.length > 0) throw new Error("Unapproved MCF must not write ledger items");

    jar.clear();
    await login(OWNER_LOGIN);
    const approve = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: { action: "approve_client_request", exceptionId: mcfExceptionId, ...MCF_APPROVE_BODY },
    });
    evidence.push(`owner approve MCF -> HTTP ${approve.status}`);
    if (approve.status !== 200) throw new Error(JSON.stringify(approve.json));
    const promoted = approve.json.exceptionRecords?.find((e) => e.id === mcfExceptionId);
    if (promoted?.status !== "waiting_client") throw new Error("Expected waiting_client");
    if (!promoted?.promotion?.materialItemIds?.length) throw new Error("Missing promotion link");
    if (!promoted?.promotion?.consolidatedRequestId) throw new Error("Missing consolidatedRequestId");

    const teamMaterials = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    const linked = (teamMaterials.json.materials?.items ?? []).filter(
      (item) => item.sourceExceptionId === mcfExceptionId,
    );
    evidence.push(`ledger items linked to exception: ${linked.length}`);
    if (linked.length === 0) throw new Error("Materials ledger not updated");
  });

  await runStep("7. duplicate-promotion dedupe", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    const dup = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: { action: "approve_client_request", exceptionId: mcfExceptionId, ...MCF_APPROVE_BODY },
    });
    evidence.push(`second approve -> HTTP ${dup.status}`);
    if (dup.status !== 403) throw new Error("Expected 403 on duplicate promotion");

    jar.clear();
    await login(CLIENT_LOGIN);
    const materials = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    const consolidated = materials.json.consolidatedRequests ?? [];
    const factRows = consolidated.filter((r) => r.id === "factual-confirmation:confirmation");
    evidence.push(`client factual consolidated rows: ${factRows.length}`);
    if (factRows.length !== 1) throw new Error("Duplicate consolidated client request detected");

    jar.clear();
    await login(OWNER_LOGIN);
    const teamMaterials = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    const linked = (teamMaterials.json.materials?.items ?? []).filter(
      (item) => item.sourceExceptionId === mcfExceptionId,
    );
    evidence.push(`ledger items after duplicate attempt: ${linked.length}`);
    if (linked.length !== 1) throw new Error("Duplicate ledger items detected");
  });

  await runStep("8. QA receives 403 on promotion", async (evidence) => {
    jar.clear();
    await login(OWNER_LOGIN);
    const raise = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "raise_exception",
        kind: "client_request",
        title: "Need photo",
        clientRequestDraft: { exactClientOnlyItem: "Product photo" },
      },
    });
    const pendingId = raise.json.exceptionRecords?.find(
      (e) => e.kind === "client_request" && !e.promotion && e.status !== "resolved",
    )?.id;
    if (!pendingId) throw new Error("Expected pending client_request");

    jar.clear();
    await login(QA_LOGIN);
    const res = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "approve_client_request",
        exceptionId: pendingId,
        category: "photo-video",
        clientFacingLabel: "Product photo",
        clientFacingPrompt: "Upload a product photo",
        whyNeeded: "Needed for launch assets",
        requirementLevel: "required",
        relatedServiceIds: ["sm-001"],
      },
    });
    evidence.push(`QA approve -> HTTP ${res.status}`);
    if (res.status !== 403) throw new Error("Expected 403 for QA promotion");
  });

    await runStep("9. unapproved exception absent from client materials API", async (evidence) => {
    jar.clear();
    await login(CLIENT_LOGIN);
    const beforeMaterials = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    const docBefore = (beforeMaterials.json.consolidatedRequests ?? []).filter(
      (r) => r.id === "document-reference:file-metadata",
    ).length;
    evidence.push(`document-reference consolidated before raise: ${docBefore}`);

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
    const pendingId = raise.json.exceptionRecords?.find(
      (e) =>
        e.kind === "client_request" &&
        !e.promotion &&
        (e.status === "waiting_owner" || e.status === "open"),
    )?.id;
    if (!pendingId) throw new Error("Expected unapproved client_request");

    jar.clear();
    await login(CLIENT_LOGIN);
    const materials = await fetchApi(`/api/campaigns/${campaignId}/materials`);
    if (materials.status !== 200) throw new Error(`Expected 200, got ${materials.status}`);
    if (materials.text.includes("sourceExceptionId")) {
      throw new Error("Client materials payload leaked sourceExceptionId");
    }
    const docAfter = (materials.json.consolidatedRequests ?? []).filter(
      (r) => r.id === "document-reference:file-metadata",
    ).length;
    evidence.push(`document-reference consolidated after unapproved raise: ${docAfter}`);
    if (docAfter > docBefore) {
      throw new Error("Unapproved promotion must not add document-reference consolidated request");
    }
  });

await runStep("10. promotion lifecycle resolve clears blocker", async (evidence) => {
    const lifecycleId = `verify-3dc-e2e-${randomUUID().slice(0, 8)}`;
    meta.lifecycleCampaignId = lifecycleId;
    evidence.push(`lifecycleCampaignId=${lifecycleId}`);

    await bootstrapCampaign(lifecycleId);
    await seedCopyReadyForQa(lifecycleId);

    jar.clear();
    await login(QA_LOGIN);
    const fail = await fetchApi(`/api/campaigns/${lifecycleId}/tasks`, {
      method: "PATCH",
      json: {
        action: "qa_fail",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        category: "missing_client_fact",
        missingFactDescription: "Store hours",
        missingFactReason: "Copy references hours",
      },
    });
    if (fail.status !== 200) throw new Error(JSON.stringify(fail.json));
    const lifecycleExcId = fail.json.exceptionRecords?.find(
      (e) => e.kind === "missing_client_fact" && e.status !== "resolved",
    )?.id;
    const blockedTask = fail.json.tasks?.find((t) => t.id === "sm-001:copy");
    evidence.push(`copy blockedReason before promote: ${blockedTask?.workflowBlockedReason ?? "none"}`);
    if (!blockedTask?.workflowBlockedReason) throw new Error("Expected task blocker from MCF");

    jar.clear();
    await login(OWNER_LOGIN);
    const approve = await fetchApi(`/api/campaigns/${lifecycleId}/tasks`, {
      method: "PATCH",
      json: { action: "approve_client_request", exceptionId: lifecycleExcId, ...MCF_APPROVE_BODY },
    });
    if (approve.status !== 200) throw new Error(JSON.stringify(approve.json));
    const consolidatedId =
      approve.json.exceptionRecords?.find((e) => e.id === lifecycleExcId)?.promotion?.consolidatedRequestId ??
      "factual-confirmation:confirmation";
    const materialItemIds =
      approve.json.exceptionRecords?.find((e) => e.id === lifecycleExcId)?.promotion?.materialItemIds ?? [];

    jar.clear();
    await login(CLIENT_LOGIN);
    const submit = await fetchApi(`/api/campaigns/${lifecycleId}/materials`, {
      method: "PATCH",
      json: {
        action: "client_submit_consolidated",
        consolidatedItemId: consolidatedId,
        payload: { text: "Mon-Fri 9am-5pm" },
      },
    });
    evidence.push(`client submit -> HTTP ${submit.status}`);
    if (submit.status !== 200) throw new Error(JSON.stringify(submit.json));

    jar.clear();
    await login(OWNER_LOGIN);
    const afterSubmit = await fetchApi(`/api/campaigns/${lifecycleId}/tasks`);
    const waiting = afterSubmit.json.exceptionRecords?.find((e) => e.id === lifecycleExcId);
    evidence.push(`exception after submit: ${waiting?.status}`);
    if (waiting?.status !== "waiting_internal") throw new Error("Expected waiting_internal");

    jar.clear();
    await login(PRODUCER_LOGIN);
    for (const itemId of materialItemIds) {
      const review = await fetchApi(`/api/campaigns/${lifecycleId}/materials`, {
        method: "PATCH",
        json: {
          action: "team_review",
          itemId,
          reviewStatus: "approved_for_use",
        },
      });
      evidence.push(`team_review ${itemId} -> HTTP ${review.status}`);
      if (review.status !== 200) throw new Error(JSON.stringify(review.json));
    }

    jar.clear();
    await login(OWNER_LOGIN);
    const resolve = await fetchApi(`/api/campaigns/${lifecycleId}/tasks`, {
      method: "PATCH",
      json: {
        action: "resolve_exception",
        exceptionId: lifecycleExcId,
        resolutionNotes: "Client fact confirmed in materials",
      },
    });
    evidence.push(`resolve_exception -> HTTP ${resolve.status}`);
    if (resolve.status !== 200) throw new Error(JSON.stringify(resolve.json));

    const resolved = resolve.json.exceptionRecords?.find((e) => e.id === lifecycleExcId);
    if (resolved?.status !== "resolved") throw new Error("Expected resolved exception");
    const copyTask = resolve.json.tasks?.find((t) => t.id === "sm-001:copy");
    evidence.push(`copy workflowState after resolve: ${copyTask?.workflowState}`);
    evidence.push(`copy blockedReason after resolve: ${copyTask?.workflowBlockedReason ?? "none"}`);
    if (copyTask?.workflowBlockedReason) throw new Error("Task blocker should be cleared");
    if (copyTask?.workflowState === "complete" || copyTask?.status === "complete") {
      throw new Error("Task must not be marked complete");
    }
  });


  const ok = printReport();
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
