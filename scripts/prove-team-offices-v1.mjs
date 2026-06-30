/**
 * Team Offices V1 — full pipeline workflow proof
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 *
 * Usage: node scripts/prove-team-offices-v1.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp", "team-offices-v1-screenshots");
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const PRODUCTION_DIR = path.join(process.cwd(), "data", "campaign-production");
const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");

const STAFF_STRATEGY_ID = "staff-strategy-capture";
const STAFF_COPY_ID = "staff-copy-capture";
const STAFF_CREATIVE_ID = "staff-creative-capture";
const STAFF_QA_ID = "staff-qa-capture";
const STAFF_PRODUCER_ID = "staff-producer-verify-3dc";

const STRATEGY_LOGIN = { email: "strategy-capture@local.dev", password: "dev-only" };
const COPY_LOGIN = { email: "copy-capture@local.dev", password: "dev-only" };
const CREATIVE_LOGIN = { email: "creative-capture@local.dev", password: "dev-only" };
const QA_LOGIN = { email: "qa-capture@local.dev", password: "dev-only" };
const PRODUCER_LOGIN = { email: "producer-verify-3dc@local.dev", password: "dev-only" };
const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };

const STRATEGY_CHECKS = [
  "scope_match",
  "factual_accuracy",
  "direction_match",
  "usability",
  "client_safe_packaging",
  "direction_alignment",
  "brand_fit",
];
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
const CREATIVE_CHECKS = [
  "scope_match",
  "factual_accuracy",
  "direction_match",
  "usability",
  "client_safe_packaging",
  "visual_quality",
  "brand_alignment",
  "specs_met",
];

/** @param {string} campaignId */
function buildCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Team Offices V1 Proof",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Team Offices V1 pipeline proof",
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
        workingOn: "Team Offices V1 proof",
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
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 500) };
  }
  return { status: res.status, json, text };
}

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
  const specs = [
    { id: STAFF_STRATEGY_ID, email: STRATEGY_LOGIN.email, displayName: "Strategy Capture" },
    { id: STAFF_COPY_ID, email: COPY_LOGIN.email, displayName: "Copy Capture" },
    { id: STAFF_CREATIVE_ID, email: CREATIVE_LOGIN.email, displayName: "Creative Capture" },
    { id: STAFF_QA_ID, email: QA_LOGIN.email, displayName: "QA Capture" },
    { id: STAFF_PRODUCER_ID, email: PRODUCER_LOGIN.email, displayName: "Producer Verify" },
  ];
  for (const spec of specs) {
    const existing = users.find((u) => u.id === spec.id);
    if (existing) {
      Object.assign(existing, {
        email: spec.email,
        displayName: spec.displayName,
        roles: ["staff"],
        password: "dev-only",
      });
    } else {
      users.push({
        id: spec.id,
        email: spec.email,
        password: "dev-only",
        displayName: spec.displayName,
        roles: ["staff"],
      });
    }
  }
  await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

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
  for (const [userId, caps] of [
    [STAFF_STRATEGY_ID, ["strategy"]],
    [STAFF_COPY_ID, ["copy"]],
    [STAFF_CREATIVE_ID, ["creative_production"]],
    [STAFF_QA_ID, ["qa"]],
    [STAFF_PRODUCER_ID, ["producer_dispatcher"]],
  ]) {
    assignments.staffByUserId[userId] = [campaignId];
    assignments.staffCapabilities[userId] = caps;
  }
  await writeFile(ASSIGNMENTS_PATH, JSON.stringify(assignments, null, 2), "utf8");
}

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

async function readTasks(campaignId) {
  return JSON.parse(await readFile(path.join(TASKS_DIR, `${campaignId}.json`), "utf8"));
}

async function readProduction(campaignId) {
  return JSON.parse(await readFile(path.join(PRODUCTION_DIR, `${campaignId}.json`), "utf8"));
}

function findTask(envelope, taskId) {
  return envelope.tasks?.find((t) => t.id === taskId);
}

function findVersionForTask(production, taskId) {
  const workUnit = production.workUnits[0];
  if (!workUnit) return null;
  const lineage = workUnit.stageLineage.find((l) => `sm-001:${l.stage}` === taskId || l.stage === taskId.split(":")[1]);
  if (lineage?.currentVersionId) {
    return production.versions.find((v) => v.id === lineage.currentVersionId);
  }
  return production.versions.find((v) => v.taskId === taskId);
}

async function claimAndDraft(campaignId, credentials, taskId, body) {
  jar.clear();
  await loginApi(credentials);
  const claimRes = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: { action: "claim", taskId, from: "unstarted", claimVersion: null },
  });
  if (claimRes.status !== 200) {
    throw new Error(`Claim ${taskId} failed: ${claimRes.status} ${JSON.stringify(claimRes.json)}`);
  }
  const tasks = await readTasks(campaignId);
  const task = findTask(tasks, taskId);
  const versionRes = await fetchApi(`/api/campaigns/${campaignId}/production`, {
    method: "PATCH",
    json: { action: "create_version", taskId, body },
  });
  if (versionRes.status !== 200) {
    throw new Error(`create_version ${taskId} failed: ${versionRes.status} ${JSON.stringify(versionRes.json)}`);
  }
  const production = await readProduction(campaignId);
  const version = findVersionForTask(production, taskId);
  return { claimVersion: task?.claimedAt, workVersionId: version?.id };
}

async function submitForQa(campaignId, credentials, taskId, claimVersion, workVersionId, summary) {
  jar.clear();
  await loginApi(credentials);
  return fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "submit_for_handoff",
      taskId,
      from: "in_progress",
      claimVersion,
      handoff: {
        completedSummary: summary,
        sourceContext: "Pipeline proof.",
        nextSteps: "QA review.",
        workVersionId,
      },
    },
  });
}

async function qaPass(campaignId, credentials, taskId, workVersionId, checks) {
  jar.clear();
  await loginApi(credentials);
  return fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "qa_pass",
      taskId,
      from: "ready_for_qa",
      claimVersion: null,
      checks,
      workVersionId,
      notes: "QA pass — pipeline proof.",
    },
  });
}

async function qaFail(campaignId, credentials, taskId, workVersionId, notes) {
  jar.clear();
  await loginApi(credentials);
  return fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "qa_fail",
      taskId,
      from: "ready_for_qa",
      claimVersion: null,
      category: "production_correction",
      workVersionId,
      notes,
    },
  });
}

async function qaBlock(campaignId, credentials, taskId, workVersionId, notes) {
  jar.clear();
  await loginApi(credentials);
  return fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "qa_block",
      taskId,
      from: "ready_for_qa",
      claimVersion: null,
      category: "compliance",
      workVersionId,
      notes,
    },
  });
}

async function runStrategyPipeline(campaignId) {
  const strategyDraft = await claimAndDraft(
    campaignId,
    STRATEGY_LOGIN,
    "sm-001:strategy_content_direction",
    "Strategy direction for downstream unlock.",
  );
  await submitForQa(
    campaignId,
    STRATEGY_LOGIN,
    "sm-001:strategy_content_direction",
    strategyDraft.claimVersion,
    strategyDraft.workVersionId,
    "Strategy complete.",
  );
  await qaPass(
    campaignId,
    QA_LOGIN,
    "sm-001:strategy_content_direction",
    strategyDraft.workVersionId,
    STRATEGY_CHECKS,
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await mkdir(TASKS_DIR, { recursive: true });
  await mkdir(PRODUCTION_DIR, { recursive: true });

  const campaignId = `team-offices-v1-proof-${randomUUID().slice(0, 8)}`;
  await ensureUsers();
  await seedCampaign(campaignId);
  await assignStaff(campaignId);
  await approveRequiredMaterials(campaignId);

  const results = {
    campaignId,
    capturedAt: new Date().toISOString(),
    strategyUnlocksCopy: { pass: false, evidence: {} },
    copyUnlocksCreative: { pass: false, evidence: {} },
    creativeMovesToQa: { pass: false, evidence: {} },
    qaBehavior: { pass: false, passSub: {}, failSub: {}, blockSub: {}, evidence: {} },
    producerBehavior: { pass: false, evidence: {} },
    producer403: { pass: false, evidence: {} },
  };

  // ——— 1. Strategy → Copy ———
  const strategyDraft = await claimAndDraft(
    campaignId,
    STRATEGY_LOGIN,
    "sm-001:strategy_content_direction",
    "Strategy direction: summer launch, warm tone, book-now CTA.",
  );
  const strategySubmit = await submitForQa(
    campaignId,
    STRATEGY_LOGIN,
    "sm-001:strategy_content_direction",
    strategyDraft.claimVersion,
    strategyDraft.workVersionId,
    "Strategy direction complete.",
  );
  const strategyQaPass = await qaPass(
    campaignId,
    QA_LOGIN,
    "sm-001:strategy_content_direction",
    strategyDraft.workVersionId,
    STRATEGY_CHECKS,
  );
  const tasksAfterStrategyQa = await readTasks(campaignId);
  const copyAfterStrategy = findTask(tasksAfterStrategyQa, "sm-001:copy");
  const strategyAfterQa = findTask(tasksAfterStrategyQa, "sm-001:strategy_content_direction");
  const productionAfterStrategyQa = await readProduction(campaignId);
  const pinnedStrategy = productionAfterStrategyQa.versions.find(
    (v) => v.id === strategyDraft.workVersionId,
  );

  results.strategyUnlocksCopy.evidence = {
    strategySubmitStatus: strategySubmit.status,
    strategyQaPassStatus: strategyQaPass.status,
    strategyWorkflowState: strategyAfterQa?.workflowState,
    copyStatus: copyAfterStrategy?.status,
    copyWorkflowState: copyAfterStrategy?.workflowState,
    qaPinWorkVersionId: pinnedStrategy?.qaPin?.workVersionId ?? null,
  };
  results.strategyUnlocksCopy.pass =
    strategySubmit.status === 200 &&
    strategyQaPass.status === 200 &&
    strategyAfterQa?.workflowState === "complete" &&
    copyAfterStrategy?.status === "ready";

  // ——— 2. Copy → Creative ———
  const copyDraft = await claimAndDraft(
    campaignId,
    COPY_LOGIN,
    "sm-001:copy",
    "Headline: Your summer starts here. Body: Launch week copy.",
  );
  const copySubmit = await submitForQa(
    campaignId,
    COPY_LOGIN,
    "sm-001:copy",
    copyDraft.claimVersion,
    copyDraft.workVersionId,
    "Copy draft v1 complete.",
  );
  const copyQaPass = await qaPass(
    campaignId,
    QA_LOGIN,
    "sm-001:copy",
    copyDraft.workVersionId,
    COPY_CHECKS,
  );
  const tasksAfterCopyQa = await readTasks(campaignId);
  const creativeAfterCopy = findTask(tasksAfterCopyQa, "sm-001:creative");
  const copyAfterQa = findTask(tasksAfterCopyQa, "sm-001:copy");

  results.copyUnlocksCreative.evidence = {
    copySubmitStatus: copySubmit.status,
    copyQaPassStatus: copyQaPass.status,
    copyWorkflowState: copyAfterQa?.workflowState,
    creativeStatus: creativeAfterCopy?.status,
    creativeWorkflowState: creativeAfterCopy?.workflowState,
    workVersionId: copyDraft.workVersionId,
  };
  results.copyUnlocksCreative.pass =
    copySubmit.status === 200 &&
    copyQaPass.status === 200 &&
    copyAfterQa?.workflowState === "complete" &&
    creativeAfterCopy?.status === "ready";

  // ——— 3. Creative → ready_for_qa ———
  const creativeDraft = await claimAndDraft(
    campaignId,
    CREATIVE_LOGIN,
    "sm-001:creative",
    "Creative bundle: visual concepts and asset list.",
  );
  const creativeSubmit = await submitForQa(
    campaignId,
    CREATIVE_LOGIN,
    "sm-001:creative",
    creativeDraft.claimVersion,
    creativeDraft.workVersionId,
    "Creative bundle complete.",
  );
  const tasksAfterCreativeSubmit = await readTasks(campaignId);
  const creativeAfterSubmit = findTask(tasksAfterCreativeSubmit, "sm-001:creative");
  const handoff = tasksAfterCreativeSubmit.handoffs?.find((h) => h.taskId === "sm-001:creative");

  results.creativeMovesToQa.evidence = {
    creativeSubmitStatus: creativeSubmit.status,
    creativeWorkflowState: creativeAfterSubmit?.workflowState,
    handoffWorkVersionId: handoff?.workVersionId ?? null,
    workVersionId: creativeDraft.workVersionId,
    formalQaTaskExists: Boolean(findTask(tasksAfterCreativeSubmit, "sm-001:qa")),
  };
  results.creativeMovesToQa.pass =
    creativeSubmit.status === 200 &&
    creativeAfterSubmit?.workflowState === "ready_for_qa" &&
    handoff?.workVersionId === creativeDraft.workVersionId;

  // ——— 4. QA pass/fail/block on creative (separate campaigns for fail/block) ———
  const creativeQaPass = await qaPass(
    campaignId,
    QA_LOGIN,
    "sm-001:creative",
    creativeDraft.workVersionId,
    CREATIVE_CHECKS,
  );
  const tasksAfterCreativeQa = await readTasks(campaignId);
  const creativeAfterQaPass = findTask(tasksAfterCreativeQa, "sm-001:creative");
  const productionAfterCreativeQa = await readProduction(campaignId);
  const pinnedCreative = productionAfterCreativeQa.versions.find(
    (v) => v.id === creativeDraft.workVersionId,
  );
  const qaRecords = tasksAfterCreativeQa.qaRecords ?? [];
  const passRecord = qaRecords.find(
    (r) => r.taskId === "sm-001:creative" && r.action === "qa_pass",
  );

  results.qaBehavior.passSub = {
    pass:
      creativeQaPass.status === 200 &&
      creativeAfterQaPass?.workflowState === "complete" &&
      passRecord?.workVersionId === creativeDraft.workVersionId &&
      pinnedCreative?.qaPin?.workVersionId === creativeDraft.workVersionId,
    evidence: {
      status: creativeQaPass.status,
      workflowState: creativeAfterQaPass?.workflowState,
      qaRecordWorkVersionId: passRecord?.workVersionId ?? null,
      qaPinWorkVersionId: pinnedCreative?.qaPin?.workVersionId ?? null,
      qaPinRecordId: pinnedCreative?.qaPin?.qaRecordId ?? null,
    },
  };

  // QA fail on separate campaign
  const failCampaignId = `${campaignId}-qa-fail`;
  await seedCampaign(failCampaignId);
  await assignStaff(failCampaignId);
  await approveRequiredMaterials(failCampaignId);
  await runStrategyPipeline(failCampaignId);
  const failCopy = await claimAndDraft(failCampaignId, COPY_LOGIN, "sm-001:copy", "Copy for fail test.");
  await submitForQa(
    failCampaignId,
    COPY_LOGIN,
    "sm-001:copy",
    failCopy.claimVersion,
    failCopy.workVersionId,
    "Copy for QA fail.",
  );
  const failRes = await qaFail(
    failCampaignId,
    QA_LOGIN,
    "sm-001:copy",
    failCopy.workVersionId,
    "Headline needs revision.",
  );
  const tasksAfterFail = await readTasks(failCampaignId);
  const copyAfterFail = findTask(tasksAfterFail, "sm-001:copy");
  const failRecord = (tasksAfterFail.qaRecords ?? []).find((r) => r.action === "qa_fail");

  results.qaBehavior.failSub = {
    pass:
      failRes.status === 200 &&
      copyAfterFail?.workflowState === "needs_revision" &&
      failRecord?.workVersionId === failCopy.workVersionId,
    evidence: {
      status: failRes.status,
      workflowState: copyAfterFail?.workflowState,
      qaRecordWorkVersionId: failRecord?.workVersionId ?? null,
      failCampaignId,
    },
  };

  // QA block on separate campaign
  const blockCampaignId = `${campaignId}-qa-block`;
  await seedCampaign(blockCampaignId);
  await assignStaff(blockCampaignId);
  await approveRequiredMaterials(blockCampaignId);
  await runStrategyPipeline(blockCampaignId);
  const blockCopy = await claimAndDraft(blockCampaignId, COPY_LOGIN, "sm-001:copy", "Copy for block test.");
  await submitForQa(
    blockCampaignId,
    COPY_LOGIN,
    "sm-001:copy",
    blockCopy.claimVersion,
    blockCopy.workVersionId,
    "Copy for QA block.",
  );
  const blockRes = await qaBlock(
    blockCampaignId,
    QA_LOGIN,
    "sm-001:copy",
    blockCopy.workVersionId,
    "Compliance hold — client approval required.",
  );
  const tasksAfterBlock = await readTasks(blockCampaignId);
  const copyAfterBlock = findTask(tasksAfterBlock, "sm-001:copy");
  const blockRecord = (tasksAfterBlock.qaRecords ?? []).find((r) => r.action === "qa_block");

  results.qaBehavior.blockSub = {
    pass:
      blockRes.status === 200 &&
      copyAfterBlock?.workflowState === "blocked" &&
      blockRecord?.workVersionId === blockCopy.workVersionId,
    evidence: {
      status: blockRes.status,
      workflowState: copyAfterBlock?.workflowState,
      qaRecordWorkVersionId: blockRecord?.workVersionId ?? null,
      blockCampaignId,
    },
  };

  results.qaBehavior.pass =
    results.qaBehavior.passSub.pass &&
    results.qaBehavior.failSub.pass &&
    results.qaBehavior.blockSub.pass;

  // ——— 5. Producer: reassign read-only cross-role + dispatch ———
  const dispatchCampaignId = `${campaignId}-producer`;
  await seedCampaign(dispatchCampaignId);
  await assignStaff(dispatchCampaignId);
  await approveRequiredMaterials(dispatchCampaignId);
  await runStrategyPipeline(dispatchCampaignId);
  const dispatchCopy = await claimAndDraft(
    dispatchCampaignId,
    COPY_LOGIN,
    "sm-001:copy",
    "Copy for producer dispatch test.",
  );

  jar.clear();
  await loginApi(PRODUCER_LOGIN);
  const tasksBeforeReassign = await readTasks(dispatchCampaignId);
  const copyBeforeReassign = findTask(tasksBeforeReassign, "sm-001:copy");
  const reassignRes = await fetchApi(`/api/campaigns/${dispatchCampaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "reassign",
      taskId: "sm-001:copy",
      from: "in_progress",
      claimVersion: copyBeforeReassign?.claimedAt ?? dispatchCopy.claimVersion,
      toUserId: STAFF_COPY_ID,
      toRole: "copy",
      reason: "Producer reassignment — pipeline proof.",
      handoff: {
        completedSummary: "Producer reassigned copy work.",
        sourceContext: "Dispatch board review.",
        nextSteps: "Continue copy draft.",
        workVersionId: dispatchCopy.workVersionId,
      },
    },
  });
  const tasksAfterReassign = await readTasks(dispatchCampaignId);
  const copyAfterReassign = findTask(tasksAfterReassign, "sm-001:copy");
  const reassignHandoff = tasksAfterReassign.handoffs?.find((h) => h.action === "reassign");

  const versionCountBefore = (await readProduction(dispatchCampaignId)).versions.length;
  const producerPatchRes = await fetchApi(`/api/campaigns/${dispatchCampaignId}/production`, {
    method: "PATCH",
    json: {
      action: "create_version",
      taskId: "sm-001:copy",
      body: "Producer should not write copy.",
    },
  });
  const versionCountAfter = (await readProduction(dispatchCampaignId)).versions.length;

  results.producerBehavior.evidence = {
    reassignStatus: reassignRes.status,
    reassignHandoffAction: reassignHandoff?.action ?? null,
    copyStillClaimedBy: copyAfterReassign?.claimedByUserId ?? null,
    producerEditStatus: producerPatchRes.status,
    producerEditError: producerPatchRes.json?.error ?? null,
    versionsBefore: versionCountBefore,
    versionsAfter: versionCountAfter,
    dispatchCampaignId,
  };
  results.producerBehavior.pass =
    reassignRes.status === 200 &&
    reassignHandoff?.action === "reassign" &&
    copyAfterReassign?.claimedByUserId === STAFF_COPY_ID;

  results.producer403.evidence = {
    request: {
      method: "PATCH",
      path: `/api/campaigns/${dispatchCampaignId}/production`,
      body: { action: "create_version", taskId: "sm-001:copy", body: "Producer should not write copy." },
      user: PRODUCER_LOGIN.email,
    },
    response: { status: producerPatchRes.status, error: producerPatchRes.json?.error },
    versionsBefore: versionCountBefore,
    versionsAfter: versionCountAfter,
  };
  results.producer403.pass =
    producerPatchRes.status === 403 && versionCountAfter === versionCountBefore;

  const resultsPath = path.join(OUT_DIR, "proof-results.json");
  await writeFile(resultsPath, JSON.stringify(results, null, 2), "utf8");

  console.log(JSON.stringify(results, null, 2));
  console.log(`\nResults: ${resultsPath}`);

  const allPass = [
    results.strategyUnlocksCopy,
    results.copyUnlocksCreative,
    results.creativeMovesToQa,
    results.qaBehavior,
    results.producerBehavior,
    results.producer403,
  ].every((r) => r.pass);

  if (!allPass) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
