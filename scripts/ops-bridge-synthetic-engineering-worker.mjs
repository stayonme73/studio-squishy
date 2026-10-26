/**
 * One allowlisted synthetic engineering assignment.
 * The bridge starts this process. The assignment title is recorded and checked.
 * It is not a shell command, a prompt, or a Cursor session.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESULT_PATH = path.join(os.tmpdir(), "studio-ops-bridge-worker-result.json");
const SCRATCH_PATH = path.join(os.tmpdir(), "studio-ops-bridge-synthetic-receipt.json");
const ALLOWED_TASKS = new Set(["synthetic_assignment_receipt"]);

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

const taskId = arg("--task");
const decisionId = arg("--decision");
const assignmentTitle = arg("--title");
const outPath = arg("--out");

if (!ALLOWED_TASKS.has(taskId)) process.exit(2);
if (!decisionId || decisionId.length > 200 || /[\0\r\n/\\]/.test(decisionId)) process.exit(2);
if (!assignmentTitle || assignmentTitle.length > 120 || /[\0\r\n]/.test(assignmentTitle)) process.exit(2);
if (!resultPathAllowed(outPath)) process.exit(2);
recordOwnedWorker(decisionId);

holdForTest();

const dirtyBefore = countDirtyFiles();
const receipt = {
  assignmentTitle,
  decisionId,
  taskId,
  writtenBy: "ops-bridge-synthetic-engineering-worker",
};
const encoded = `${JSON.stringify(receipt)}\n`;
const expectedHash = createHash("sha256").update(encoded).digest("hex");
let scratchRemoved = false;
let hashMatches = false;
try {
  writeFileSync(SCRATCH_PATH, encoded, "utf8");
  const readBack = readFileSync(SCRATCH_PATH);
  hashMatches = createHash("sha256").update(readBack).digest("hex") === expectedHash;
} finally {
  if (existsSync(SCRATCH_PATH)) unlinkSync(SCRATCH_PATH);
  scratchRemoved = !existsSync(SCRATCH_PATH);
}
const dirtyAfter = countDirtyFiles();
const filesChangedByTask = dirtyBefore !== dirtyAfter;
const checks = [
  { name: "receipt-hash", pass: hashMatches },
  { name: "scratch-removed", pass: scratchRemoved },
  { name: "repository-unchanged", pass: !filesChangedByTask },
  { name: "title-not-executed", pass: true },
];
const evidence = {
  ok: checks.every((check) => check.pass),
  kind: taskId,
  source: "ops-bridge-synthetic-engineering-worker",
  workerScript: "scripts/ops-bridge-synthetic-engineering-worker.mjs",
  executor: "local-node-worker",
  workerPid: process.pid,
  decisionId,
  assignmentTitle,
  completedAt: new Date().toISOString(),
  cursorAgentExecuted: false,
  interactiveSessionRequired: false,
  runsWithoutInteractiveCursorSession: true,
  continuesAfterResponse: false,
  scheduledContinuation: false,
  shellFromAssignment: false,
  repositoryWrites: false,
  filesChangedByTask,
  receiptSha256: expectedHash,
  checks,
  qualityReview: "worker-self-check",
  independentQuality: false,
};
if (!evidence.ok) process.exit(3);
writeFileSync(path.resolve(outPath), `${JSON.stringify(evidence)}\n`, "utf8");
process.exit(0);
