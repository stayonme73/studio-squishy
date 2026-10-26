/**
 * ChatGPT ↔ Scout ops bridge library.
 * Pulse writes the outbound snapshot. Scout consumes only authorized inbound lines.
 * Does not grant merge/push. Does not become customer job truth.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSharedLaunchControlSummary } from "./studio-shared-launch-control-lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRIDGE_DIR = path.join(ROOT, "docs/launch/owner-bridge");
const SNAPSHOT_JSON = path.join(BRIDGE_DIR, "outbound-snapshot.json");
const SNAPSHOT_MD = path.join(BRIDGE_DIR, "outbound-snapshot.md");
const INBOUND_JSONL = path.join(BRIDGE_DIR, "inbound-decisions.jsonl");
const ACK_JSONL = path.join(BRIDGE_DIR, "acknowledgements.jsonl");
const HEARTBEAT_JSON = path.join(ROOT, "docs/launch/project-alpha-work-heartbeat.json");
const ATTENTION_JSON = path.join(ROOT, "docs/launch/project-alpha-attention-state.json");
const DAILY_BRIDGE = path.join(ROOT, "docs/launch/PROJECT-ALPHA-DAILY-OPERATING-BRIDGE.md");
const CONSUMED_PATH = path.join(BRIDGE_DIR, "consumed-decision-ids.json");
const DEFAULT_ACTIVE_TASK_PATH = path.join(ROOT, ".ops-bridge-active-task.json");
const WORKER_SCRIPT = path.join(ROOT, "scripts/ops-bridge-readonly-worker.mjs");
const ENGINEERING_WORKER_SCRIPT = path.join(ROOT, "scripts/ops-bridge-synthetic-engineering-worker.mjs");
const DEFAULT_WORKER_RESULT_PATH = path.join(os.tmpdir(), "studio-ops-bridge-worker-result.json");
const STALE_LOCK_GRACE_MS = 200;

export const OPS_BRIDGE_STALE_MS = 14_400_000;
export const OPS_BRIDGE_AUTHORIZER = "OWNER_TAGIA";
export const OPS_BRIDGE_ACTIONS = [
  "authorize_package",
  "stop",
  "hold",
  "accept_proof",
  "reject_proof",
  "request_correction",
  "publish_authorization",
  "merge_authorization",
  "push_authorization",
  "acknowledge",
  "report_local_status",
  "run_readonly_task",
  "run_synthetic_engineering_handoff",
];
export const OPS_BRIDGE_READONLY_TASKS = [
  "local_test_readiness",
  "synthetic_machine_quality_status",
];
export const OPS_BRIDGE_ENGINEERING_TASKS = ["synthetic_assignment_receipt"];
export const OPS_BRIDGE_PROTECTED_ACTIONS = [
  "publish_authorization",
  "merge_authorization",
  "push_authorization",
];

const SECRET_PATTERNS = [
  /\bsk_(?:live|test)_[A-Za-z0-9]+\b/g,
  /\brk_(?:live|test)_[A-Za-z0-9]+\b/g,
  /\bwhsec_[A-Za-z0-9]+\b/g,
  /\bBearer\s+[A-Za-z0-9._\-]+\b/gi,
  /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^"'\s]+/gi,
  /\bAIza[0-9A-Za-z\-_]{20,}\b/g,
];

const FORBIDDEN_PATH_HINTS = [".env", "credentials", "secret", "customer-life", "campaign-design-artifacts"];

export function redactSecrets(value) {
  if (value == null) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item));
  if (typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (
        /(?:^|_)(?:api[_-]?key|access_token|secret|password|bearer)$/i.test(key) ||
        /^(?:STRIPE_|RESEND_|OPENAI_|ANTHROPIC_|DEEPGRAM_|SHOTSTACK_|SESSION_SECRET)/i.test(
          key,
        )
      ) {
        out[key] = "[REDACTED]";
        continue;
      }
      out[key] = redactSecrets(nested);
    }
    return out;
  }
  let text = String(value);
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "[REDACTED]");
  }
  return text;
}

function readJson(file, fallback = {}) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function listChangedFiles() {
  try {
    const raw = execFileSync("git", ["status", "--short"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[A-Z?]{1,2}\s+/, "").replace(/^.* -> /, ""))
      .filter((file) => !FORBIDDEN_PATH_HINTS.some((hint) => file.includes(hint)))
      .slice(0, 40);
  } catch {
    return [];
  }
}

/** Launch truth mirrors src/config/studio-canonical-launch-truth-v1.ts. The legacy counts describe the old shelf only. */
function publicCounts() {
  return {
    canonicalLaunchMenu: "four_package_door",
    launchPackageCount: 4,
    publishedPubliclyCount: 0,
    launchAuthority: "docs/launch/studio-canonical-launch-truth-1/STUDIO-CANONICAL-LAUNCH-TRUTH.md",
    publicLaunchNowPublishedCount: 11,
    internalSellNowCount: 11,
    liveDiscoveryShelfJobs: 16,
    shelfHonesty: "PARKED — 11 certified public vs 16 live shelf jobs. Not this package.",
  };
}

export function buildOutboundSnapshot(now = new Date().toISOString(), extras = {}) {
  const heartbeat = readJson(HEARTBEAT_JSON);
  const attention = readJson(ATTENTION_JSON);
  const consumed = readJson(CONSUMED_PATH, { ids: [] });
  const snapshot = redactSecrets({
    schemaVersion: 1,
    kind: "chatgpt_scout_ops_snapshot",
    writtenAt: now,
    authority: {
      gitIsEngineeringAuthority: true,
      machineIsCustomerJobTruth: true,
      scoutIsFactoryEngineer: true,
      ownerIsFinalForProtectedActions: true,
      noMergeWithoutExplicitAuthorization: true,
      noPushWithoutExplicitAuthorization: true,
    },
    packageId: heartbeat.packageId ?? null,
    workState: heartbeat.workState ?? null,
    currentTask: heartbeat.currentTask ?? null,
    whatHappensNext: heartbeat.whatHappensNext ?? null,
    attentionState: heartbeat.attentionState ?? attention.state ?? null,
    tagiaMustAct: Boolean(heartbeat.tagiaMustAct),
    lastActivityAt: heartbeat.lastActivityAt ?? null,
    filesChanged: listChangedFiles(),
    testsResults: extras.testsResults ?? "See latest package stamp. Pulse does not invent test outcomes.",
    defectsBlockers: extras.defectsBlockers ?? heartbeat.blocker ?? null,
    evidenceStamps: extras.evidenceStamps ?? [
      "docs/launch/studio-operating-business-os-audit-1/STUDIO-OPERATING-BUSINESS-OS-AUDIT.md",
      "docs/launch/studio-operating-launch-shell-audit-1/STUDIO-OPERATING-LAUNCH-SHELL-AUDIT.md",
    ],
    counts: publicCounts(),
    protectedStateReminders: [
      "Do not reopen frozen service factories unless a genuine regression appears.",
      "Do not remint Maya.",
      "Do not rebuild Owner Console.",
      "Do not start website, beta, or marketing from this bridge.",
      "Shelf 16 vs public 11 is parked, not this package.",
      "No merge. No push. Unless a consumed inbound line explicitly authorizes that protected action.",
    ],
    nextDecisionRequired: extras.nextDecisionRequired ?? heartbeat.whatHappensNext ?? null,
    transport: {
      githubConnectorRejected: true,
      githubRejectionReason: "GitHub connector required broader repository write than Owner permits.",
      ownerDeskNotTheChatgptTransport: true,
      localHttpsBridge: "https://127.0.0.1:4178/v1/snapshot",
      localHttpsInbound: "https://127.0.0.1:4178/v1/inbound",
      localHttpsAcknowledgement: "https://127.0.0.1:4178/v1/acknowledgement",
      chatgptDotComCanReachLocalhost: false,
      publicHttpsHosted: true,
      publicHttpsBaseUrl: "https://cool-proposals-assessments-studying.trycloudflare.com",
      publicHttpsFront: "cloudflare_quick_tunnel",
      zeroCourierAchieved: false,
      missingConnection:
        "Public HTTPS ops-bridge is up. Zero-courier is not certified until ChatGPT independently reads the snapshot, writes one authorized inbound line, and reads the acknowledgement through Plugin Creator. GitHub write stays rejected.",
    },
    lastInboundAcknowledgement: extras.lastInboundAcknowledgement ?? null,
    consumedDecisionIds: consumed.ids ?? [],
    sharedLaunchControl: readSharedLaunchControlSummary(),
  });
  return snapshot;
}

export function renderOutboundMarkdown(snapshot) {
  const files = (snapshot.filesChanged ?? []).map((file) => `- \`${file}\``).join("\n") || "- none listed";
  const reminders = (snapshot.protectedStateReminders ?? []).map((line) => `- ${line}`).join("\n");
  return `# ChatGPT ↔ Scout operations snapshot

Written: ${snapshot.writtenAt}

| Field | Value |
|---|---|
| Package | ${snapshot.packageId ?? "—"} |
| Work state | ${snapshot.workState ?? "—"} |
| Task | ${snapshot.currentTask ?? "—"} |
| Attention | ${snapshot.attentionState ?? "—"} |
| Tagia must act | ${snapshot.tagiaMustAct ? "Yes" : "No"} |
| Launch menu | ${snapshot.counts?.launchPackageCount ?? "—"} packages (three-package door) |
| Published publicly | ${snapshot.counts?.publishedPubliclyCount ?? "—"} |
| Zero-courier | ${snapshot.transport?.zeroCourierAchieved ? "Yes" : "No"} |

## Files changed
${files}

## Tests / results
${snapshot.testsResults ?? "—"}

## Defects / blockers
${snapshot.defectsBlockers ?? "None recorded."}

## Evidence / stamps
${(snapshot.evidenceStamps ?? []).map((item) => `- ${item}`).join("\n")}

## Protected-state reminders
${reminders}

## Next decision required
${snapshot.nextDecisionRequired ?? "—"}

## Transport
${snapshot.transport?.missingConnection ?? "—"}
`;
}

function dailyBridgeLiveBlock(snapshot) {
  const changed = new Date(snapshot.writtenAt).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `# WORK STATE: ${String(snapshot.workState ?? "UNKNOWN").replaceAll("_", " ")}
**Changed at:** ${changed} ET  
**Source:** Pulse / ops-bridge snapshot. Do not hand-edit this live block.

Owner attention: **${snapshot.attentionState ?? "—"}.** ${snapshot.currentTask ?? ""}

**Live desk:** \`http://127.0.0.1:4177/\`  
**Ops snapshot:** \`docs/launch/owner-bridge/outbound-snapshot.json\`

**Doing now:** ${snapshot.currentTask ?? "—"}

**Next:** ${snapshot.nextDecisionRequired ?? "—"}

---

| Field | Value |
|-------|--------|
| Updated | ${changed} ET |
| Package | \`${snapshot.packageId ?? "—"}\` |
| Work state | **${String(snapshot.workState ?? "UNKNOWN").replaceAll("_", " ") }** |
| Attention | **${snapshot.attentionState ?? "—"}** |
| Tagia must intervene now | **${snapshot.tagiaMustAct ? "Yes" : "No"}** |
| Launch menu / Published | **${snapshot.counts?.launchPackageCount ?? "—"} / ${snapshot.counts?.publishedPubliclyCount ?? "—"}** |
| Zero-courier ChatGPT ↔ Scout | **${snapshot.transport?.zeroCourierAchieved ? "Yes" : "No"}** |
| Model | Cursor Grok 4.6 |
`;
}

export function writeDailyBridgeLiveBlock(snapshot) {
  if (!existsSync(DAILY_BRIDGE)) return;
  try {
    const existing = readFileSync(DAILY_BRIDGE, "utf8");
    const begin = "<!-- OPS-BRIDGE-LIVE:BEGIN -->";
    const end = "<!-- OPS-BRIDGE-LIVE:END -->";
    const block = `${begin}\n${dailyBridgeLiveBlock(snapshot)}\n${end}`;
    if (existing.includes(begin) && existing.includes(end)) {
      const next = existing.replace(
        new RegExp(`${begin}[\\s\\S]*?${end}`),
        block.replace(/\$/g, "$$$$"),
      );
      writeFileSync(DAILY_BRIDGE, next, "utf8");
      return;
    }
    writeFileSync(
      DAILY_BRIDGE,
      `${block}\n\n${existing.replace(/^# PROJECT ALPHA — DAILY OPERATING BRIDGE\s*\n+/, "# PROJECT ALPHA — DAILY OPERATING BRIDGE\n\n")}`,
      "utf8",
    );
  } catch {
    // A locked daily-bridge file must not hide an acknowledgement.
  }
}

function withSnapshotLock(work) {
  const lockPath = path.join(os.tmpdir(), "studio-ops-bridge-snapshot.lock");
  const started = Date.now();
  let fd = null;
  while (fd === null) {
    try {
      fd = openSync(lockPath, "wx");
    } catch {
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > 5000) unlinkSync(lockPath);
      } catch {
        /* another writer owns the lock */
      }
      if (Date.now() - started > 2000) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
  try {
    return work();
  } finally {
    if (fd !== null) {
      closeSync(fd);
      try { unlinkSync(lockPath); } catch { /* already released */ }
    }
  }
}

export function writeOutboundSnapshot(extras = {}, now = new Date().toISOString()) {
  return withSnapshotLock(() => {
    mkdirSync(BRIDGE_DIR, { recursive: true });
    const snapshot = buildOutboundSnapshot(now, extras);
    writeFileSync(SNAPSHOT_JSON, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    writeFileSync(SNAPSHOT_MD, `${renderOutboundMarkdown(snapshot)}\n`, "utf8");
    writeDailyBridgeLiveBlock(snapshot);
    if (!existsSync(INBOUND_JSONL)) writeFileSync(INBOUND_JSONL, "", "utf8");
    if (!existsSync(ACK_JSONL)) writeFileSync(ACK_JSONL, "", "utf8");
    return snapshot;
  });
}

function isIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function validateInboundDecision(decision, nowMs = Date.now(), expectedPackageId = null) {
  if (!decision || typeof decision !== "object") {
    return { ok: false, reason: "unsigned_or_unapproved", detail: "Decision is missing." };
  }
  if (decision.authorized !== true || decision.authorizer !== OPS_BRIDGE_AUTHORIZER) {
    return { ok: false, reason: "unsigned_or_unapproved", detail: "Owner authorization is required." };
  }
  if (typeof decision.decisionId !== "string" || !decision.decisionId.trim()) {
    return { ok: false, reason: "unsigned_or_unapproved", detail: "decisionId is required." };
  }
  if (!isIsoDate(decision.at)) {
    return { ok: false, reason: "unsigned_or_unapproved", detail: "timestamp is required." };
  }
  if (!OPS_BRIDGE_ACTIONS.includes(decision.action)) {
    return { ok: false, reason: "scope_expansion", detail: `Unknown action: ${decision.action}` };
  }
  if (typeof decision.packageId !== "string" || !decision.packageId.trim()) {
    return { ok: false, reason: "scope_expansion", detail: "packageId is required." };
  }
  if (typeof decision.permittedAction !== "string" || !decision.permittedAction.trim()) {
    return { ok: false, reason: "scope_expansion", detail: "permittedAction is required." };
  }
  if (
    decision.action === "run_readonly_task" &&
    !OPS_BRIDGE_READONLY_TASKS.includes(decision.taskId)
  ) {
    return {
      ok: false,
      reason: "scope_expansion",
      detail: `Unknown task: ${decision.taskId ?? "missing"}`,
    };
  }
  if (decision.action === "run_synthetic_engineering_handoff") {
    if (decision.command != null || decision.shell != null || decision.prompt != null) {
      return {
        ok: false,
        reason: "scope_expansion",
        detail: "Permission boundary: a prompt or command is not an assignment.",
      };
    }
    if (!OPS_BRIDGE_ENGINEERING_TASKS.includes(decision.taskId)) {
      return {
        ok: false,
        reason: "scope_expansion",
        detail: `Unknown task: ${decision.taskId ?? "missing"}`,
      };
    }
    const title = typeof decision.assignmentTitle === "string" ? decision.assignmentTitle.trim() : "";
    if (
      !title ||
      title.length > 120 ||
      /[\0\r\n\\/]/.test(title) ||
      /[;&|`$<>]/.test(title) ||
      title.startsWith("-")
    ) {
      return {
        ok: false,
        reason: "scope_expansion",
        detail: "assignmentTitle must be one plain line of at most 120 characters.",
      };
    }
  }
  if (
    expectedPackageId &&
    decision.packageId !== expectedPackageId &&
    decision.action !== "authorize_package"
  ) {
    return {
      ok: false,
      reason: "scope_expansion",
      detail: `Decision package ${decision.packageId} is outside ${expectedPackageId}.`,
    };
  }
  const writtenAt = Date.parse(decision.at);
  if (nowMs - writtenAt > OPS_BRIDGE_STALE_MS) {
    return { ok: false, reason: "stale_decision", detail: "Decision is older than 4 hours." };
  }
  if (decision.expiresAt && Date.parse(decision.expiresAt) < nowMs) {
    return { ok: false, reason: "stale_decision", detail: "Decision expired." };
  }
  const protectedAction = OPS_BRIDGE_PROTECTED_ACTIONS.includes(decision.action);
  if (decision.action === "merge_authorization" && decision.mergeAuthorized !== true) {
    return { ok: false, reason: "merge_push_not_authorized", detail: "Merge requires mergeAuthorized: true." };
  }
  if (decision.action === "push_authorization" && decision.pushAuthorized !== true) {
    return { ok: false, reason: "merge_push_not_authorized", detail: "Push requires pushAuthorized: true." };
  }
  if (protectedAction && decision.protectedAction !== true) {
    return {
      ok: false,
      reason: "merge_push_not_authorized",
      detail: "Protected actions require protectedAction: true.",
    };
  }
  return { ok: true, protectedAction };
}

export function payloadContainsSecrets(value) {
  const text = JSON.stringify(value ?? "");
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) return true;
  }
  return false;
}

export function performSnapshot() {
  if (!existsSync(SNAPSHOT_JSON)) {
    return { status: 404, payload: { ok: false, error: "snapshot_not_written" } };
  }
  const snapshot = redactSecrets(JSON.parse(readFileSync(SNAPSHOT_JSON, "utf8")));
  if (payloadContainsSecrets(snapshot)) {
    return { status: 500, payload: { ok: false, error: "payload_withheld" } };
  }
  return { status: 200, payload: snapshot };
}

export function performAcknowledgement(decisionId = null) {
  return {
    status: 200,
    payload: { ok: true, acknowledgement: readLastAcknowledgement(decisionId) },
  };
}

export function performInbound(decision, expectedPackageId = null) {
  const result = consumeInboundDecision(decision, { expectedPackageId });
  return {
    status: result.ok ? 200 : 400,
    payload: {
      ok: result.ok,
      reason: result.reason ?? null,
      detail: result.detail ?? null,
      acknowledgement: result.acknowledgement ?? null,
    },
  };
}

export function readLastAcknowledgement(decisionId = null) {
  if (!existsSync(ACK_JSONL)) return null;
  const parsed = [];
  for (const line of readFileSync(ACK_JSONL, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      parsed.push(redactSecrets(JSON.parse(line)));
    } catch {
      /* skip a broken audit line */
    }
  }
  if (!parsed.length) return null;
  if (!decisionId) return parsed[parsed.length - 1];
  return parsed.findLast((item) => item.decisionId === decisionId) ?? null;
}

function readLocalWorkStatus(nowMs) {
  const heartbeat = readJson(HEARTBEAT_JSON, {});
  let branch = null;
  let dirtyFileCount = null;
  try {
    branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    const porcelain = execFileSync("git", ["status", "--porcelain"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    dirtyFileCount = porcelain.split(/\r?\n/).filter(Boolean).length;
  } catch {
    branch = null;
    dirtyFileCount = null;
  }
  return {
    ok: true,
    kind: "local_work_status",
    readAt: new Date(nowMs).toISOString(),
    workState: heartbeat.workState ?? null,
    currentTask: heartbeat.currentTask ?? null,
    packageId: heartbeat.packageId ?? null,
    lastActivityAt: heartbeat.lastActivityAt ?? null,
    branch,
    dirtyFileCount,
  };
}

function envPath(name, fallback) {
  const override = process.env[name];
  if (typeof override === "string" && override.trim()) return path.resolve(override.trim());
  return fallback;
}

export function opsBridgeActiveTaskPath() {
  return envPath("OPS_BRIDGE_ACTIVE_TASK", DEFAULT_ACTIVE_TASK_PATH);
}

function workerResultPath() {
  return envPath("OPS_BRIDGE_WORKER_RESULT", DEFAULT_WORKER_RESULT_PATH);
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function holderAlive(lock) {
  if (!lock || typeof lock !== "object") return false;
  return processIsAlive(lock.pid) || processIsAlive(lock.workerPid);
}

function readActiveTask() {
  const lock = readJson(opsBridgeActiveTaskPath(), null);
  return lock?.decisionId ? lock : null;
}

function waitForLockGrace() {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, STALE_LOCK_GRACE_MS);
}

function moveLockAside(target) {
  const grave = path.join(os.tmpdir(), `studio-ops-bridge-lock-${randomBytes(8).toString("hex")}.stale`);
  renameSync(target, grave);
  return grave;
}

function restoreLock(grave, target) {
  try {
    renameSync(grave, target);
    return true;
  } catch {
    return false;
  }
}

function createExclusiveLock(record) {
  const target = opsBridgeActiveTaskPath();
  let fd;
  try {
    fd = openSync(target, "wx");
  } catch (error) {
    if (error && error.code === "EEXIST") return false;
    throw error;
  }
  try {
    writeFileSync(fd, `${JSON.stringify(record)}\n`);
  } catch (error) {
    closeSync(fd);
    try { unlinkSync(target); } catch { /* the exclusive file is left for recovery */ }
    throw error;
  }
  closeSync(fd);
  return true;
}

function releaseOwnLock(token) {
  if (!token) return;
  const target = opsBridgeActiveTaskPath();
  const lock = readActiveTask();
  if (!lock || lock.token !== token) return;
  let grave;
  try {
    grave = moveLockAside(target);
  } catch {
    return;
  }
  const removed = readJson(grave, null);
  if (!removed || removed.token !== token) {
    restoreLock(grave, target);
    return;
  }
  try { unlinkSync(grave); } catch { /* already gone */ }
}

function discardWorkerResult() {
  const resultPath = workerResultPath();
  if (existsSync(resultPath)) unlinkSync(resultPath);
}

function workerEnv() {
  const env = {};
  for (const key of [
    "PATH",
    "Path",
    "PATHEXT",
    "SYSTEMROOT",
    "SystemRoot",
    "WINDIR",
    "COMSPEC",
    "HOME",
    "USERPROFILE",
    "HOMEDRIVE",
    "HOMEPATH",
    "APPDATA",
    "LOCALAPPDATA",
    "PROGRAMFILES",
    "PROGRAMFILES(X86)",
    "TEMP",
    "TMP",
    "OPS_BRIDGE_ACTIVE_TASK",
    "OPS_BRIDGE_WORKER_RESULT",
    "OPS_BRIDGE_WORKER_HOLD_MS",
  ]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

function workerLaunch(script, args, token) {
  const resultPath = workerResultPath();
  discardWorkerResult();
  const launchArgs = [script, ...args, "--out", resultPath];
  if (token) launchArgs.push("--lock-token", token);
  return spawnSync(process.execPath, launchArgs, {
    cwd: ROOT,
    env: workerEnv(),
    timeout: 20_000,
    windowsHide: true,
    encoding: "utf8",
  });
}

function runReadonlyWorker(decision, token) {
  const resultPath = workerResultPath();
  const run = workerLaunch(
    WORKER_SCRIPT,
    ["--task", decision.taskId, "--decision", decision.decisionId],
    token,
  );
  if (run.error || run.status !== 0 || !existsSync(resultPath)) {
    discardWorkerResult();
    return { ok: false, detail: "Local worker did not complete the inspection." };
  }
  const evidence = readJson(resultPath, null);
  discardWorkerResult();
  const leaked =
    evidence &&
    (/@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(JSON.stringify(evidence)) ||
      /\bsk_(?:live|test)_/.test(JSON.stringify(evidence)));
  const syntheticSafe =
    decision.taskId !== "synthetic_machine_quality_status" ||
    (evidence?.syntheticCampaignId === "messy-customer-social-promo-recovery" &&
      evidence?.scoutClaim == null &&
      evidence?.completionClaim == null &&
      evidence?.customerCommunicationsSent === 0 &&
      evidence?.handoffChangedJobs === false);
  const accepted =
    evidence &&
    !leaked &&
    syntheticSafe &&
    evidence.source === "ops-bridge-readonly-worker" &&
    evidence.kind === decision.taskId &&
    OPS_BRIDGE_READONLY_TASKS.includes(evidence.kind) &&
    evidence.decisionId === decision.decisionId &&
    typeof evidence.workerPid === "number" &&
    evidence.workerPid !== process.pid &&
    evidence.ok === true &&
    evidence.filesChangedByTask === false;
  if (!accepted) {
    return {
      ok: false,
      detail: evidence?.filesChangedByTask
        ? "Read-only task changed the worktree. Result not accepted."
        : "Local worker evidence was not accepted.",
    };
  }
  return {
    ok: true,
    evidence: {
      ...evidence,
      workerExitCode: run.status,
    },
  };
}

function runEngineeringWorker(decision, token) {
  const resultPath = workerResultPath();
  const run = workerLaunch(
    ENGINEERING_WORKER_SCRIPT,
    [
      "--task",
      decision.taskId,
      "--decision",
      decision.decisionId,
      "--title",
      decision.assignmentTitle.trim(),
    ],
    token,
  );
  if (run.error || run.status !== 0 || !existsSync(resultPath)) {
    discardWorkerResult();
    return { ok: false, detail: "Synthetic engineering worker did not complete." };
  }
  const evidence = readJson(resultPath, null);
  discardWorkerResult();
  const checks = Array.isArray(evidence?.checks) ? evidence.checks : [];
  const accepted =
    evidence &&
    evidence.source === "ops-bridge-synthetic-engineering-worker" &&
    evidence.kind === decision.taskId &&
    evidence.executor === "local-node-worker" &&
    evidence.decisionId === decision.decisionId &&
    evidence.assignmentTitle === decision.assignmentTitle.trim() &&
    evidence.cursorAgentExecuted === false &&
    evidence.continuesAfterResponse === false &&
    evidence.scheduledContinuation === false &&
    evidence.shellFromAssignment === false &&
    evidence.repositoryWrites === false &&
    evidence.filesChangedByTask === false &&
    evidence.independentQuality === false &&
    checks.length >= 3 &&
    checks.every((check) => check && check.pass === true) &&
    typeof evidence.workerPid === "number" &&
    evidence.workerPid !== process.pid &&
    evidence.ok === true;
  if (!accepted) {
    return { ok: false, detail: "Synthetic engineering evidence was not accepted." };
  }
  return { ok: true, evidence: { ...evidence, workerExitCode: run.status } };
}

function taskAcknowledgement(decision, nowMs, fields) {
  return {
    at: new Date(nowMs).toISOString(),
    decisionId: decision.decisionId ?? null,
    action: decision.action ?? "run_readonly_task",
    packageId: decision.packageId ?? null,
    taskId: decision.taskId ?? null,
    assignmentTitle: typeof decision.assignmentTitle === "string" ? decision.assignmentTitle.trim() : null,
    ...fields,
  };
}

function storeAcknowledgement(acknowledgement, options, consumeId) {
  mkdirSync(BRIDGE_DIR, { recursive: true });
  appendFileSync(ACK_JSONL, `${JSON.stringify(acknowledgement)}\n`, "utf8");
  if (consumeId) {
    const consumed = readJson(CONSUMED_PATH, { ids: [] });
    const ids = new Set(consumed.ids ?? []);
    ids.add(consumeId);
    writeFileSync(CONSUMED_PATH, `${JSON.stringify({ ids: [...ids] }, null, 2)}\n`, "utf8");
  }
  try {
    writeOutboundSnapshot({
      lastInboundAcknowledgement: acknowledgement,
      testsResults: options.testsResults,
      defectsBlockers: options.defectsBlockers,
      nextDecisionRequired: options.nextDecisionRequired,
    });
  } catch {
    // The acknowledgement file is the completion record. A locked daily-bridge
    // snapshot must not fail the task or hide its evidence.
  }
}

function recordInterruptedTask(lock, nowMs) {
  const prior = readLastAcknowledgement(lock.decisionId);
  if (prior?.state === "completed" && prior.ok === true) return;
  discardWorkerResult();
  storeAcknowledgement(
    taskAcknowledgement(lock, nowMs, {
      ok: false,
      state: "failed",
      reason: "failed",
      detail: "Task interrupted before completion. The same decisionId may be sent again.",
      scoutActed: false,
    }),
    {},
  );
}

function resolveActiveLock(nowMs) {
  const target = opsBridgeActiveTaskPath();
  let waited = false;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (!existsSync(target)) return null;
    const lock = readActiveTask();
    if (!lock) {
      let age = 0;
      try {
        age = Date.now() - statSync(target).mtimeMs;
      } catch {
        age = 0;
      }
      if (age < STALE_LOCK_GRACE_MS) {
        return { decisionId: "lock-unreadable", pid: process.pid, state: "running" };
      }
      try {
        unlinkSync(moveLockAside(target));
      } catch {
        return { decisionId: "lock-unreadable", pid: process.pid, state: "running" };
      }
      return null;
    }
    if (holderAlive(lock)) return lock;
    if (!waited && lock.workerPid == null) {
      waited = true;
      waitForLockGrace();
      continue;
    }
    let grave;
    try {
      grave = moveLockAside(target);
    } catch {
      continue;
    }
    const removed = readJson(grave, null);
    if (removed && holderAlive(removed)) {
      restoreLock(grave, target);
      return readActiveTask() ?? removed;
    }
    try { unlinkSync(grave); } catch { /* already gone */ }
    if (removed?.decisionId) recordInterruptedTask(removed, nowMs);
    return null;
  }
  return readActiveTask() ?? { decisionId: "lock-contended", pid: process.pid, state: "running" };
}

function runningAcknowledgement(decision, nowMs, prior) {
  return prior?.state === "running" || prior?.state === "accepted"
    ? prior
    : taskAcknowledgement(decision, nowMs, {
      ok: true,
      state: "running",
      reason: "accepted",
      detail: decision.permittedAction,
      scoutActed: false,
    });
}

function blockedAcknowledgement(decision, nowMs, options) {
  const blocked = taskAcknowledgement(decision, nowMs, {
    ok: false,
    state: "blocked",
    reason: "blocked",
    detail: "Another bridge task is already running.",
    scoutActed: false,
  });
  storeAcknowledgement(blocked, options);
  return { ok: false, reason: "blocked", acknowledgement: blocked };
}

function consumeReadonlyTask(decision, nowMs, options) {
  return consumeTrackedTask(decision, nowMs, options, runReadonlyWorker);
}

function consumeTrackedTask(decision, nowMs, options, runWorker) {
  const completed = readLastAcknowledgement(decision.decisionId);
  if (completed?.state === "completed" && completed.ok === true) {
    const leftover = readActiveTask();
    if (leftover && leftover.decisionId === decision.decisionId && !holderAlive(leftover)) {
      resolveActiveLock(nowMs);
    }
    return { ok: true, reason: "accepted", acknowledgement: completed, idempotent: true };
  }

  const token = randomBytes(16).toString("hex");
  const record = {
    decisionId: decision.decisionId,
    taskId: decision.taskId,
    packageId: decision.packageId,
    action: decision.action,
    assignmentTitle: typeof decision.assignmentTitle === "string" ? decision.assignmentTitle.trim() : null,
    executor: decision.action === "run_synthetic_engineering_handoff" ? "local-node-worker" : "readonly-worker",
    pid: process.pid,
    workerPid: null,
    token,
    state: "running",
    startedAt: new Date(nowMs).toISOString(),
  };

  let acquired = false;
  for (let attempt = 0; attempt < 2 && !acquired; attempt += 1) {
    const live = resolveActiveLock(nowMs);
    const prior = readLastAcknowledgement(decision.decisionId);
    if (prior?.state === "completed" && prior.ok === true) {
      return { ok: true, reason: "accepted", acknowledgement: prior, idempotent: true };
    }
    if (live && live.decisionId === decision.decisionId) {
      return {
        ok: true,
        reason: "accepted",
        acknowledgement: runningAcknowledgement(decision, nowMs, prior),
        idempotent: true,
      };
    }
    if (live) return blockedAcknowledgement(decision, nowMs, options);
    acquired = createExclusiveLock(record);
  }
  if (!acquired) return blockedAcknowledgement(decision, nowMs, options);

  const accepted = taskAcknowledgement(decision, nowMs, {
    ok: true,
    state: "accepted",
    reason: "accepted",
    detail: decision.permittedAction,
    scoutActed: false,
  });
  storeAcknowledgement(accepted, options);
  const running = taskAcknowledgement(decision, nowMs, {
    ok: true,
    state: "running",
    reason: "accepted",
    detail: decision.permittedAction,
    scoutActed: false,
  });
  storeAcknowledgement(running, options);

  let finished;
  try {
    const worker = runWorker(decision, token);
    finished = worker.ok
      ? taskAcknowledgement(decision, nowMs, {
        ok: true,
        state: "completed",
        reason: "accepted",
        detail: decision.permittedAction,
        scoutActed: true,
        evidence: worker.evidence,
      })
      : taskAcknowledgement(decision, nowMs, {
        ok: false,
        state: "failed",
        reason: "failed",
        detail: worker.detail,
        scoutActed: false,
      });
  } catch {
    discardWorkerResult();
    finished = taskAcknowledgement(decision, nowMs, {
      ok: false,
      state: "failed",
      reason: "failed",
      detail: "Local worker did not complete the inspection.",
      scoutActed: false,
    });
  }
  storeAcknowledgement(finished, options, finished.state === "completed" ? decision.decisionId : null);
  releaseOwnLock(token);
  return {
    ok: finished.ok,
    reason: finished.reason,
    acknowledgement: finished,
  };
}

function persistInboundDecision(decision) {
  mkdirSync(BRIDGE_DIR, { recursive: true });
  appendFileSync(INBOUND_JSONL, `${JSON.stringify(redactSecrets(decision))}\n`, "utf8");
}

export function consumeInboundDecision(decision, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  const expectedPackageId = options.expectedPackageId ?? null;
  if (decision && typeof decision === "object") persistInboundDecision(decision);
  const validation = validateInboundDecision(decision, nowMs, expectedPackageId);
  const consumed = readJson(CONSUMED_PATH, { ids: [] });
  const ids = new Set(consumed.ids ?? []);
  if (validation.ok && decision.action === "run_readonly_task") {
    return consumeReadonlyTask(decision, nowMs, options);
  }
  if (validation.ok && decision.action === "run_synthetic_engineering_handoff") {
    return consumeTrackedTask(decision, nowMs, options, runEngineeringWorker);
  }
  if (validation.ok && ids.has(decision.decisionId)) {
    return { ok: false, reason: "stale_decision", detail: "Decision was already consumed." };
  }
  const statusReport =
    validation.ok && decision.action === "report_local_status" && options.act !== false
      ? readLocalWorkStatus(nowMs)
      : null;
  const scoutActed =
    decision?.action === "report_local_status"
      ? Boolean(statusReport?.ok)
      : Boolean(validation.ok && options.act !== false);
  const acknowledgement = {
    at: new Date(nowMs).toISOString(),
    decisionId: decision?.decisionId ?? null,
    action: decision?.action ?? null,
    packageId: decision?.packageId ?? null,
    ok: validation.ok,
    reason: validation.ok ? "accepted" : validation.reason,
    detail: validation.ok ? decision.permittedAction : validation.detail,
    scoutActed,
    ...(statusReport ? { evidence: statusReport } : {}),
  };
  mkdirSync(BRIDGE_DIR, { recursive: true });
  appendFileSync(ACK_JSONL, `${JSON.stringify(acknowledgement)}\n`, "utf8");
  if (validation.ok) {
    ids.add(decision.decisionId);
    writeFileSync(CONSUMED_PATH, `${JSON.stringify({ ids: [...ids] }, null, 2)}\n`, "utf8");
  }
  writeOutboundSnapshot({
    lastInboundAcknowledgement: acknowledgement,
    testsResults: options.testsResults,
    defectsBlockers: options.defectsBlockers,
    nextDecisionRequired: options.nextDecisionRequired,
  });
  return { ...validation, acknowledgement };
}

export const OPS_BRIDGE_PATHS = {
  ROOT,
  BRIDGE_DIR,
  SNAPSHOT_JSON,
  SNAPSHOT_MD,
  INBOUND_JSONL,
  ACK_JSONL,
  DAILY_BRIDGE,
};
