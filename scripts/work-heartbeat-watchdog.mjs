/**
 * Project Alpha work-state watchdog.
 * If ACTIVE WORK has no pulse for 10 minutes, declare STALLED / HUNG
 * and fire the same audible + attention alert Tagia gets for Owner wait.
 * Does not touch the customer site.
 */
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shouldDeclareWatchdogStall } from "./work-heartbeat-watchdog-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = path.join(ROOT, "docs/launch/project-alpha-work-heartbeat.json");
const STANCE = path.join(ROOT, "scripts/owner-desk-scout-stance.mjs");
const TICK_MS = 15_000;

function readRecord() {
  if (!existsSync(JSON_PATH)) return null;
  try {
    return JSON.parse(readFileSync(JSON_PATH, "utf8"));
  } catch {
    return null;
  }
}

function declareStall() {
  execFileSync(process.execPath, [STANCE, "--trouble"], {
    stdio: "ignore",
    windowsHide: true,
  });
}

let pendingConfirm = false;

function tick() {
  const record = readRecord();
  if (!shouldDeclareWatchdogStall(record)) {
    pendingConfirm = false;
    return;
  }
  if (!pendingConfirm) {
    pendingConfirm = true;
    return;
  }
  pendingConfirm = false;
  declareStall();
}

process.stdout.write(`work-heartbeat watchdog listening @ ${new Date().toISOString()}\n`);
tick();
setInterval(tick, TICK_MS);
