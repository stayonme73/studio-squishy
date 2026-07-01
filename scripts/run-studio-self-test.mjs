/**
 * Studio Self-Test V1 — automated checks + results file update.
 *
 * Prerequisites (for API rows): dev server on localhost:3000, SESSION_SECRET in .env.local
 * Store checks work offline after seed.
 *
 * Usage:
 *   node scripts/run-studio-self-test.mjs
 *   node scripts/run-studio-self-test.mjs --init-only
 *   node scripts/run-studio-self-test.mjs --skip-api
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import {
  BASE,
  PATHS,
  STUDIO_SELF_TEST_CAMPAIGN_ID,
  CookieJar,
  fetchApi,
  login,
} from "./lib/studio-self-test-shared.mjs";

/** Matrix row IDs — keep in sync with src/config/studio-self-test-matrix.ts */
const MATRIX_ROW_IDS = [
  "identity-campaign-record",
  "identity-task-plan",
  "identity-materials-ledger",
  "identity-production-store",
  "svc-family-social_media",
  "svc-family-brand_identity",
  "svc-family-email_marketing",
  "svc-family-marketing_copywriting",
  "svc-family-marketing_assets",
  "svc-family-ai_voice_over",
  "svc-family-brand_messaging",
  "svc-family-campaign",
  "svc-family-sms_marketing",
  "svc-family-content_writing",
  "svc-family-marketing_video",
  "svc-family-landing_page_content",
  "svc-family-marketing_optimization",
  "journey-discovery-complete",
  "journey-project-summary",
  "journey-payment-received",
  "journey-project-details",
  "journey-studio-board",
  "journey-review-room",
  "journey-final-delivery",
  "pipeline-normal-flow",
  "pipeline-strategy-complete",
  "pipeline-copy-ready-qa",
  "pipeline-qa-fail-revision",
  "materials-missing-required",
  "materials-client-request-approved",
  "exc-compliance-hold",
  "exc-direction-disagreement",
  "exc-scope-change",
  "exc-deadline-risk",
  "exc-missing-client-fact",
  "exc-client-request-pending",
  "owner-console-aggregate",
  "owner-console-remote-resolve",
  "delivery-deliverables-route",
  "delivery-archive-closeout",
];

/** @type {Record<string, "script" | "store" | "api" | "manual">} */
const VERIFICATION_BY_ID = {
  "identity-campaign-record": "store",
  "identity-task-plan": "store",
  "identity-materials-ledger": "store",
  "identity-production-store": "store",
  "svc-family-social_media": "script",
  "svc-family-brand_identity": "manual",
  "svc-family-email_marketing": "manual",
  "svc-family-marketing_copywriting": "manual",
  "svc-family-marketing_assets": "manual",
  "svc-family-ai_voice_over": "manual",
  "svc-family-brand_messaging": "manual",
  "svc-family-campaign": "manual",
  "svc-family-sms_marketing": "manual",
  "svc-family-content_writing": "manual",
  "svc-family-marketing_video": "manual",
  "svc-family-landing_page_content": "manual",
  "svc-family-marketing_optimization": "manual",
  "journey-discovery-complete": "store",
  "journey-project-summary": "store",
  "journey-payment-received": "store",
  "journey-project-details": "store",
  "journey-studio-board": "store",
  "journey-review-room": "manual",
  "journey-final-delivery": "manual",
  "pipeline-normal-flow": "manual",
  "pipeline-strategy-complete": "store",
  "pipeline-copy-ready-qa": "store",
  "pipeline-qa-fail-revision": "manual",
  "materials-missing-required": "store",
  "materials-client-request-approved": "store",
  "exc-compliance-hold": "store",
  "exc-direction-disagreement": "store",
  "exc-scope-change": "store",
  "exc-deadline-risk": "store",
  "exc-missing-client-fact": "store",
  "exc-client-request-pending": "store",
  "owner-console-aggregate": "api",
  "owner-console-remote-resolve": "api",
  "delivery-deliverables-route": "manual",
  "delivery-archive-closeout": "manual",
};

const INIT_ONLY = process.argv.includes("--init-only");
const SKIP_API = process.argv.includes("--skip-api");

/** @typedef {{ status: "pass"|"fail"|"pending"|"not_run"; lastRunAt?: string; evidence?: string[]; error?: string }} RowResult */

/** @returns {Promise<import("./lib/studio-self-test-shared.mjs").unknown>} */
async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function buildEmptyResults() {
  /** @type {Record<string, RowResult>} */
  const rows = {};
  for (const id of MATRIX_ROW_IDS) {
    rows[id] = { status: "not_run" };
  }
  return {
    campaignId: STUDIO_SELF_TEST_CAMPAIGN_ID,
    lastSeededAt: new Date().toISOString(),
    rows,
  };
}

async function loadResults() {
  try {
    const file = await readJson(PATHS.results);
    for (const id of MATRIX_ROW_IDS) {
      if (!file.rows[id]) file.rows[id] = { status: "not_run" };
    }
    return file;
  } catch {
    return buildEmptyResults();
  }
}

/** @param {string} id @param {(evidence: string[]) => Promise<void>} fn */
async function runCheck(id, fn) {
  const evidence = [];
  try {
    await fn(evidence);
    return { status: "pass", evidence };
  } catch (error) {
    return {
      status: "fail",
      evidence,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function readCampaignRecord() {
  const envelope = await readJson(path.join(PATHS.campaigns, `${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`));
  return envelope.record;
}

async function readTasksEnvelope() {
  return readJson(path.join(PATHS.tasks, `${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`));
}

async function readMaterialsEnvelope() {
  return readJson(path.join(PATHS.materials, `${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`));
}

async function readProductionEnvelope() {
  return readJson(path.join(PATHS.production, `${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`));
}

/** @type {Record<string, (evidence: string[]) => Promise<void>>} */
const STORE_CHECKS = {
  "identity-campaign-record": async (evidence) => {
    const record = await readCampaignRecord();
    if (record.campaignId !== STUDIO_SELF_TEST_CAMPAIGN_ID) {
      throw new Error(`Expected campaignId ${STUDIO_SELF_TEST_CAMPAIGN_ID}`);
    }
    if (record.campaignStatus !== "BUILDING_CONCEPTS") {
      throw new Error(`Expected BUILDING_CONCEPTS, got ${record.campaignStatus}`);
    }
    if (!record.approvedStudioPlan?.selectedServiceIds?.includes("sm-001")) {
      throw new Error("Missing sm-001 in approved plan");
    }
    evidence.push(`campaignStatus=${record.campaignStatus}`);
    evidence.push(`services=${record.approvedStudioPlan.selectedServiceIds.join(",")}`);
  },
  "identity-task-plan": async (evidence) => {
    const envelope = await readTasksEnvelope();
    const ids = (envelope.tasks ?? []).map((t) => t.id);
    for (const phase of [
      "strategy_content_direction",
      "copy",
      "creative",
      "qa",
      "delivery_prep",
    ]) {
      const taskId = `sm-001:${phase}`;
      if (!ids.includes(taskId)) throw new Error(`Missing task ${taskId}`);
      evidence.push(`found ${taskId}`);
    }
  },
  "identity-materials-ledger": async (evidence) => {
    const envelope = await readMaterialsEnvelope();
    if (!envelope.items?.length) throw new Error("Materials ledger empty");
    evidence.push(`${envelope.items.length} material slots`);
  },
  "identity-production-store": async (evidence) => {
    const envelope = await readProductionEnvelope();
    const unit = (envelope.workUnits ?? []).find((w) => w.serviceId === "sm-001");
    if (!unit) throw new Error("Missing sm-001 production work unit");
    evidence.push(`workUnit=${unit.id} stage=${unit.currentStage}`);
  },
  "journey-discovery-complete": async (evidence) => {
    const record = await readCampaignRecord();
    if (!record.discoverySubmittedAt) throw new Error("discoverySubmittedAt missing");
    if (!record.discoveryAnswers?.["your-business"]) throw new Error("discoveryAnswers missing");
    evidence.push(`discoverySubmittedAt=${record.discoverySubmittedAt}`);
  },
  "journey-project-summary": async (evidence) => {
    const record = await readCampaignRecord();
    if (!record.approvedStudioPlan?.approvedAt) throw new Error("Plan not approved");
    evidence.push(`approvedAt=${record.approvedStudioPlan.approvedAt}`);
  },
  "journey-payment-received": async (evidence) => {
    const record = await readCampaignRecord();
    if (!record.paymentReceivedAt) throw new Error("paymentReceivedAt missing");
    evidence.push(`paymentReceivedAt=${record.paymentReceivedAt}`);
  },
  "journey-project-details": async (evidence) => {
    const record = await readCampaignRecord();
    if (!record.projectDetailsSubmittedAt) throw new Error("projectDetailsSubmittedAt missing");
    if (!record.projectDetails?.form?.workingOn) throw new Error("projectDetails.form missing");
    evidence.push(`submittedAt=${record.projectDetailsSubmittedAt}`);
  },
  "journey-studio-board": async (evidence) => {
    const record = await readCampaignRecord();
    if (record.campaignStatus !== "BUILDING_CONCEPTS") {
      throw new Error(`Expected BUILDING_CONCEPTS, got ${record.campaignStatus}`);
    }
    evidence.push("BUILDING_CONCEPTS confirmed");
  },
  "pipeline-strategy-complete": async (evidence) => {
    const envelope = await readTasksEnvelope();
    const task = (envelope.tasks ?? []).find((t) => t.id === "sm-001:strategy_content_direction");
    if (!task) throw new Error("Strategy task missing");
    if (task.workflowState !== "complete") {
      throw new Error(`Expected complete, got ${task.workflowState}`);
    }
    evidence.push(`workflowState=${task.workflowState}`);
  },
  "pipeline-copy-ready-qa": async (evidence) => {
    const envelope = await readTasksEnvelope();
    const task = (envelope.tasks ?? []).find((t) => t.id === "sm-001:copy");
    if (!task) throw new Error("Copy task missing");
    if (task.workflowState !== "ready_for_qa") {
      throw new Error(`Expected ready_for_qa, got ${task.workflowState}`);
    }
    evidence.push(`workflowState=${task.workflowState}`);
  },
  "materials-missing-required": async (evidence) => {
    const envelope = await readMaterialsEnvelope();
    const missing = (envelope.items ?? []).filter(
      (item) => item.requirementLevel === "required" && item.reviewStatus === "missing",
    );
    if (missing.length === 0) throw new Error("No required missing materials");
    evidence.push(`${missing.length} required missing slot(s)`);
  },
  "materials-client-request-approved": async (evidence) => {
    const envelope = await readTasksEnvelope();
    const exc = (envelope.exceptionRecords ?? []).find(
      (r) => r.kind === "client_request" && r.status === "waiting_owner",
    );
    if (!exc) throw new Error("No client_request waiting_owner exception");
    if (!exc.clientRequestDraft?.exactClientOnlyItem) {
      throw new Error("clientRequestDraft incomplete");
    }
    evidence.push(`exception=${exc.id}`);
  },
  "exc-compliance-hold": async (evidence) => {
    await assertOpenException(evidence, "compliance_hold", "waiting_owner");
  },
  "exc-direction-disagreement": async (evidence) => {
    await assertOpenException(evidence, "direction_disagreement");
  },
  "exc-scope-change": async (evidence) => {
    await assertOpenException(evidence, "scope_change", "waiting_owner");
  },
  "exc-deadline-risk": async (evidence) => {
    await assertOpenException(evidence, "deadline_risk");
  },
  "exc-missing-client-fact": async (evidence) => {
    await assertOpenException(evidence, "missing_client_fact");
  },
  "exc-client-request-pending": async (evidence) => {
    await assertOpenException(evidence, "client_request", "waiting_owner");
  },
};

async function assertOpenException(evidence, kind, status) {
  const envelope = await readTasksEnvelope();
  const match = (envelope.exceptionRecords ?? []).find(
    (r) =>
      r.kind === kind &&
      r.status !== "resolved" &&
      r.status !== "cancelled" &&
      (status ? r.status === status : true),
  );
  if (!match) throw new Error(`No open ${kind} exception${status ? ` (${status})` : ""}`);
  evidence.push(`${match.id} status=${match.status}`);
}

/** @type {Record<string, (evidence: string[]) => Promise<void>>} */
const SCRIPT_CHECKS = {
  "svc-family-social_media": async (evidence) => {
    await STORE_CHECKS["identity-task-plan"](evidence);
    await STORE_CHECKS["pipeline-strategy-complete"](evidence);
    await STORE_CHECKS["pipeline-copy-ready-qa"](evidence);
    await STORE_CHECKS["identity-production-store"](evidence);
    evidence.push("Social media pipeline seeded and verifiable");
  },
};

/** @type {Record<string, (jar: CookieJar, evidence: string[]) => Promise<void>>} */
const API_CHECKS = {
  "owner-console-aggregate": async (jar, evidence) => {
    await login({ email: "tagia@local.dev", password: "dev-only" }, jar);
    const res = await fetchApi("/file-room/owner-console", { jar });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const hit =
      res.text.includes(STUDIO_SELF_TEST_CAMPAIGN_ID) ||
      res.text.includes("Studio Self-Test");
    if (!hit) throw new Error("Self-test campaign not visible on Owner Console page");
    evidence.push("Self-test campaign found on /file-room/owner-console");
  },
  "owner-console-remote-resolve": async (jar, evidence) => {
    await login({ email: "tagia@local.dev", password: "dev-only" }, jar);
    const tasks = await fetchApi(`/api/campaigns/${STUDIO_SELF_TEST_CAMPAIGN_ID}/tasks`, { jar });
    if (tasks.status !== 200) throw new Error(`Tasks GET HTTP ${tasks.status}`);
    if (!tasks.json?.operator) throw new Error("Owner operator context missing from tasks API");
    const exc = (tasks.json.exceptionRecords ?? []).find(
      (r) => r.kind === "compliance_hold" && r.status === "waiting_owner",
    );
    if (!exc) throw new Error("No compliance_hold waiting_owner for remote action");
    const assign = await fetchApi(`/api/campaigns/${STUDIO_SELF_TEST_CAMPAIGN_ID}/tasks`, {
      method: "PATCH",
      json: {
        action: "assign_exception",
        exceptionId: exc.id,
        assignToUserId: "staff-producer-self-test",
        notes: "Self-test runner assigned compliance hold remotely",
      },
      jar,
    });
    if (assign.status !== 200) {
      throw new Error(`Assign HTTP ${assign.status}: ${assign.text?.slice(0, 200)}`);
    }
    evidence.push(`Assigned ${exc.id} to producer via API`);
  },
};

async function isServerAvailable() {
  try {
    const res = await fetch(`${BASE}/api/auth/login`, { method: "GET" });
    return res.status === 405 || res.status === 200 || res.status === 401;
  } catch {
    return false;
  }
}

async function main() {
  if (INIT_ONLY) {
    const empty = await buildEmptyResults();
    await mkdir(path.dirname(PATHS.results), { recursive: true });
    await writeFile(PATHS.results, JSON.stringify(empty, null, 2), "utf8");
    console.log(`Initialized ${PATHS.results} (${MATRIX_ROW_IDS.length} rows)`);
    return;
  }

  const now = new Date().toISOString();
  const results = await loadResults();
  results.lastRunAt = now;

  const serverUp = !SKIP_API && (await isServerAvailable());
  const jar = new CookieJar();

  let passCount = 0;
  let failCount = 0;

  for (const id of MATRIX_ROW_IDS) {
    const method = VERIFICATION_BY_ID[id] ?? "manual";

    if (method === "manual") {
      const existing = results.rows[id];
      if (!existing || existing.status === "not_run") {
        results.rows[id] = { status: "pending", lastRunAt: now };
      }
      console.log(`PENDING  ${id} (manual)`);
      continue;
    }

    if (method === "api" && !serverUp) {
      results.rows[id] = {
        status: "pending",
        lastRunAt: now,
        evidence: ["Dev server not reachable — re-run without --skip-api"],
      };
      console.log(`PENDING  ${id} (api — server down)`);
      continue;
    }

    let outcome;
    if (method === "store" && STORE_CHECKS[id]) {
      outcome = await runCheck(id, STORE_CHECKS[id]);
    } else if (method === "script" && SCRIPT_CHECKS[id]) {
      outcome = await runCheck(id, SCRIPT_CHECKS[id]);
    } else if (method === "api" && API_CHECKS[id]) {
      outcome = await runCheck(id, (evidence) => API_CHECKS[id](jar, evidence));
    } else {
      results.rows[id] = { status: "pending", lastRunAt: now, evidence: ["No automated check yet"] };
      console.log(`PENDING  ${id} (no check)`);
      continue;
    }

    results.rows[id] = { ...outcome, lastRunAt: now };
    const icon = outcome.status === "pass" ? "PASS" : "FAIL";
    if (outcome.status === "pass") passCount += 1;
    else failCount += 1;
    console.log(`${icon}  ${id}`);
    if (outcome.error) console.log(`       ${outcome.error}`);
  }

  await mkdir(path.dirname(PATHS.results), { recursive: true });
  await writeFile(PATHS.results, JSON.stringify(results, null, 2), "utf8");

  console.log(`\nResults: ${passCount} pass, ${failCount} fail`);
  console.log(`Written: ${PATHS.results}`);
  console.log(`Scoreboard: ${BASE}/file-room/studio-self-test`);

  if (failCount > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
