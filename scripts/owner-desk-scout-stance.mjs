/**
 * Owner desk Scout stance.
 * Records verified tool execution in the existing heartbeat file.
 * A message or a thought does not set WORKING and does not leave a hold.
 * Does not open a browser. Does not play sound. Does not ask for Run.
 */
import { closeSync, existsSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyScoutExecutionStop,
  applyScoutMessage,
  applyScoutProgressPulse,
  applyScoutToolFailure,
  applyScoutToolFinish,
  applyScoutToolStart,
} from "./work-heartbeat-watchdog-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = process.env.SCOUT_STANCE_HEARTBEAT
  ? path.resolve(process.env.SCOUT_STANCE_HEARTBEAT)
  : path.join(ROOT, "docs/launch/project-alpha-work-heartbeat.json");

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function readRecord() {
  if (!existsSync(JSON_PATH)) return { ok: true, record: {} };
  try {
    const parsed = JSON.parse(readFileSync(JSON_PATH, "utf8"));
    if (!parsed || typeof parsed !== "object" || !parsed.workState) {
      return { ok: false, record: {} };
    }
    return { ok: true, record: parsed };
  } catch {
    return { ok: false, record: {} };
  }
}

function readPayload(raw) {
  const text = String(raw || "").trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const message = process.argv.includes("--message") || process.argv.includes("--working");
const progress = process.argv.includes("--progress");
const toolStart = process.argv.includes("--tool-start");
const toolFinish = process.argv.includes("--tool-finish");
const toolFail = process.argv.includes("--tool-fail");
const executionStop = process.argv.includes("--stop") || process.argv.includes("--listening");
const trouble = process.argv.includes("--trouble");
const productionTrouble = process.argv.includes("--production-trouble");
const productionClear = process.argv.includes("--production-clear");
const now = new Date().toISOString();
const rawStdin = await readStdin().catch(() => "");
const payload = readPayload(rawStdin);

function withHeartbeatLock(work) {
  const lockPath = `${JSON_PATH}.lock`;
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

const wrote = withHeartbeatLock(() => {
  const loaded = readRecord();
  if (!loaded.ok) return false;
  const record = loaded.record;

  if (message) {
    Object.assign(record, applyScoutMessage(record, payload));
  } else if (progress) {
    Object.assign(record, applyScoutProgressPulse(record));
  } else if (toolStart) {
    Object.assign(record, applyScoutToolStart(record, payload, now));
  } else if (toolFinish) {
    Object.assign(record, applyScoutToolFinish(record, payload, now));
  } else if (toolFail) {
    Object.assign(record, applyScoutToolFailure(record, payload, now));
  } else if (executionStop) {
    Object.assign(record, applyScoutExecutionStop(record, payload, now));
  } else if (trouble) {
    record.scoutListening = false;
    record.scoutTrouble = true;
    record.expectedToContinue = true;
    record.intentionalStop = false;
    record.workState = "STALLED_HUNG";
    record.activityTruth = "TROUBLE";
    record.stalledAt = record.stalledAt || now;
    record.blocker = record.blocker || "Scout is in trouble";
    record.lastActivityAt = now;
    record.executionEvidenceAt = now;
  }

  if (productionTrouble) record.productionTrouble = true;
  if (productionClear) record.productionTrouble = false;

  writeFileSync(JSON_PATH, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return true;
});
process.stdout.write("{}\n");
void wrote;
