/**
 * Local read-only worker for one allowlisted assignment.
 * The bridge starts this process. It does not accept a shell command or a prompt.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESULT_PATH = path.join(os.tmpdir(), "studio-ops-bridge-worker-result.json");
const ALLOWED_TASKS = new Set(["local_test_readiness", "synthetic_machine_quality_status"]);
const SYNTHETIC_CAMPAIGN_ID = "messy-customer-social-promo-recovery";

function arg(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return "";
  return process.argv[index + 1] ?? "";
}

function resultPathAllowed(outPath) {
  const allowed = new Set([path.resolve(RESULT_PATH)]);
  const override = process.env.OPS_BRIDGE_WORKER_RESULT;
  if (typeof override === "string" && override.trim()) allowed.add(path.resolve(override.trim()));
  return allowed.has(path.resolve(outPath));
}

function ownedLockPath() {
  const override = process.env.OPS_BRIDGE_ACTIVE_TASK;
  if (typeof override === "string" && override.trim()) return path.resolve(override.trim());
  return path.resolve(ROOT, ".ops-bridge-active-task.json");
}

function recordOwnedWorker(decisionId) {
  const token = arg("--lock-token");
  if (!token) return;
  let lock;
  try {
    lock = JSON.parse(readFileSync(ownedLockPath(), "utf8"));
  } catch {
    process.exit(2);
  }
  if (!lock || lock.token !== token || lock.decisionId !== decisionId) process.exit(2);
  lock.workerPid = process.pid;
  writeFileSync(ownedLockPath(), `${JSON.stringify(lock)}\n`);
}

function holdForTest() {
  const hold = Number(process.env.OPS_BRIDGE_WORKER_HOLD_MS);
  if (!Number.isInteger(hold) || hold <= 0 || hold > 5000) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, hold);
}

function countDirtyFiles() {
  const porcelain = execFileSync("git", ["status", "--porcelain"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return porcelain.split(/\r?\n/).filter(Boolean).length;
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function inspectLocalTestReadiness(decisionId) {
  const dirtyBefore = countDirtyFiles();
  const heartbeat = readJson(path.join(ROOT, "docs/launch/project-alpha-work-heartbeat.json")) ?? {};
  const pkg = readJson(path.join(ROOT, "package.json")) ?? {};
  const vitestPkgPath = path.join(ROOT, "node_modules/vitest/package.json");
  const vitestPkg = existsSync(vitestPkgPath) ? readJson(vitestPkgPath) : null;
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  const dirtyAfter = countDirtyFiles();
  const filesChangedByTask = dirtyBefore !== dirtyAfter;
  return {
    ok: !filesChangedByTask,
    kind: "local_test_readiness",
    source: "ops-bridge-readonly-worker",
    workerScript: "scripts/ops-bridge-readonly-worker.mjs",
    workerPid: process.pid,
    decisionId,
    readAt: new Date().toISOString(),
    nodeVersion: process.version,
    testScript: typeof pkg.scripts?.test === "string" ? pkg.scripts.test : null,
    vitestInstalled: Boolean(vitestPkg),
    vitestVersion: typeof vitestPkg?.version === "string" ? vitestPkg.version : null,
    branch,
    dirtyFileCount: dirtyAfter,
    filesChangedByTask,
    workState: heartbeat.workState ?? null,
    packageId: heartbeat.packageId ?? null,
  };
}

function fileStamp(file) {
  const stat = statSync(file);
  return `${stat.size}:${stat.mtimeMs}`;
}

function qualityDisposition(action) {
  if (action === "qa_pass") return "PASS";
  if (action === "qa_fail") return "FAIL";
  if (action === "qa_block") return "BLOCKED";
  return null;
}

function inspectSyntheticMachineQuality(decisionId) {
  const dirtyBefore = countDirtyFiles();
  const campaignFile = path.join(ROOT, "data/campaigns", `${SYNTHETIC_CAMPAIGN_ID}.json`);
  const tasksFile = path.join(ROOT, "data/campaign-tasks", `${SYNTHETIC_CAMPAIGN_ID}.json`);
  const before = [campaignFile, tasksFile].map(fileStamp);
  const campaignEnvelope = readJson(campaignFile);
  const tasksEnvelope = readJson(tasksFile);
  const after = [campaignFile, tasksFile].map(fileStamp);
  const campaign = campaignEnvelope?.record ?? null;
  const tasks = tasksEnvelope?.record ?? tasksEnvelope;
  if (!campaign || campaign.campaignId !== SYNTHETIC_CAMPAIGN_ID || tasks?.campaignId !== SYNTHETIC_CAMPAIGN_ID) {
    throw new Error("synthetic_record_missing");
  }

  const findings = [];
  const latestByTask = new Map();
  for (const record of tasks.qaRecords ?? []) {
    if (typeof record?.taskId !== "string" || typeof record.action !== "string") continue;
    const current = latestByTask.get(record.taskId);
    if (!current || String(record.createdAt ?? "") >= String(current.createdAt ?? "")) {
      latestByTask.set(record.taskId, record);
    }
  }
  for (const record of latestByTask.values()) {
    findings.push({
      taskId: record.taskId,
      disposition: qualityDisposition(record.action),
      action: record.action,
      category: typeof record.category === "string" ? record.category : null,
      recordedAt: typeof record.createdAt === "string" ? record.createdAt : null,
      source: "qa_records",
    });
  }
  const rank = { BLOCKED: 3, FAIL: 2, PASS: 1 };
  let quality = null;
  for (const finding of findings) {
    if (!finding.disposition) continue;
    if (!quality || rank[finding.disposition] > rank[quality]) quality = finding.disposition;
  }

  const jobs = (tasks.jobRecords ?? []).map((job) => ({
    jobId: job.jobId,
    skuId: job.skuId,
    spineStatus: job.spineStatus ?? null,
    intakeComplete: job.intakeComplete === true,
    ownerApprovalPending: job.ownerApprovalPending ?? null,
    qualityAuthorization: job.internalQaReviewAuthorization?.status ?? null,
    customerApproval: job.customerApprovedArtifactAuthorization?.status ?? null,
    source: "purchased_job_record",
  }));
  const machineTasks = (tasks.tasks ?? []).map((task) => ({
    taskId: task.id,
    phase: task.phase ?? null,
    workflowState: task.workflowState ?? null,
    source: "campaign_tasks",
  }));
  const ownerJudgmentItems = [];
  const routineProblems = [];
  for (const exception of tasks.exceptionRecords ?? []) {
    if (exception?.status === "waiting_owner") {
      ownerJudgmentItems.push({
        source: "exception_record",
        kind: exception.kind ?? null,
        status: exception.status,
      });
      continue;
    }
    if (exception?.status === "resolved" || exception?.status === "cancelled") continue;
    if (exception?.status) {
      routineProblems.push({
        source: "exception_record",
        kind: exception.kind ?? null,
        status: exception.status,
        remainsWith: "production",
      });
    }
  }
  for (const decision of tasks.ownerDecisionInteractions ?? []) {
    if (decision?.status !== "waiting_owner") continue;
    ownerJudgmentItems.push({
      source: "owner_decision_interaction",
      kind: decision.interactionKind ?? null,
      status: decision.status,
    });
  }
  for (const job of jobs) {
    if (!job.ownerApprovalPending) continue;
    ownerJudgmentItems.push({
      source: "purchased_job_record",
      kind: job.ownerApprovalPending,
      status: "waiting_owner",
    });
  }
  if (tasks.planChangePendingOwnerApproval === true) {
    ownerJudgmentItems.push({
      source: "campaign_tasks",
      kind: "plan_change",
      status: "waiting_owner",
    });
  }

  const dirtyAfter = countDirtyFiles();
  const filesChangedByTask = dirtyBefore !== dirtyAfter || before.some((stamp, index) => stamp !== after[index]);
  return {
    ok: !filesChangedByTask,
    kind: "synthetic_machine_quality_status",
    source: "ops-bridge-readonly-worker",
    workerScript: "scripts/ops-bridge-readonly-worker.mjs",
    workerPid: process.pid,
    decisionId,
    readAt: new Date().toISOString(),
    authority: "machine_campaign_tasks",
    qualityAuthority: "qa_records",
    scoutClaim: null,
    completionClaim: null,
    syntheticCampaignId: SYNTHETIC_CAMPAIGN_ID,
    filesChangedByTask,
    handoffChangedJobs: false,
    customerCommunicationsSent: 0,
    campaignStatus: {
      source: "campaign_record",
      value: typeof campaign.campaignStatus === "string" ? campaign.campaignStatus : null,
    },
    paymentStatus: {
      source: "payment_truth",
      value: typeof campaign.paymentTruth?.status === "string" ? campaign.paymentTruth.status : null,
    },
    jobs,
    machineTasks,
    qualityFindings: findings,
    qualityRecordCount: Array.isArray(tasks.qaRecords) ? tasks.qaRecords.length : 0,
    dispositions: {
      quality,
      fail: findings.some((finding) => finding.disposition === "FAIL"),
      blocked: findings.some((finding) => finding.disposition === "BLOCKED"),
      waitingOnOwner: ownerJudgmentItems.length > 0,
    },
    routineProblems,
    ownerJudgment: {
      required: ownerJudgmentItems.length > 0,
      items: ownerJudgmentItems,
    },
  };
}

const taskId = arg("--task");
const decisionId = arg("--decision");
const outPath = arg("--out");

if (!ALLOWED_TASKS.has(taskId)) process.exit(2);
if (!decisionId || decisionId.length > 200 || /[\0\r\n/\\]/.test(decisionId)) process.exit(2);
if (!resultPathAllowed(outPath)) process.exit(2);
recordOwnedWorker(decisionId);

holdForTest();

try {
  const evidence =
    taskId === "synthetic_machine_quality_status"
      ? inspectSyntheticMachineQuality(decisionId)
      : inspectLocalTestReadiness(decisionId);
  const payload = JSON.stringify(evidence);
  if (/@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(payload) || /\bsk_(?:live|test)_/.test(payload)) {
    process.exit(3);
  }
  writeFileSync(path.resolve(outPath), `${payload}\n`, "utf8");
  process.exit(evidence.ok ? 0 : 3);
} catch {
  process.exit(3);
}
