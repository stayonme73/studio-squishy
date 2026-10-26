/**
 * Owner Console process keeper.
 * A live process id is not health. Recovery runs only for a process this keeper can prove it owns.
 */
import { execFileSync, spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const OWNER_DESK_SERVICE = "project-alpha-owner-console";
const DESK_SCRIPT = path.join(ROOT, "scripts/owner-console-desk.mjs");
const DEFAULT_PID = path.join(ROOT, "docs/launch/project-alpha-owner-desk.pid");
const DEFAULT_LOG = path.join(ROOT, "docs/launch/project-alpha-owner-desk-keeper.jsonl");
const DEFAULT_STATE = path.join(ROOT, "docs/launch/project-alpha-owner-desk-keeper-state.json");
const RECOVERY_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_MAX_RECOVERIES = 3;
const HEALTH_CHECK_TIMEOUT_MS = 1500;
const HEALTH_WAIT_DEADLINE_MS = 5000;

function readPid(pidPath) {
  if (!existsSync(pidPath)) return null;
  const value = Number.parseInt(readFileSync(pidPath, "utf8").trim(), 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function writePid(pidPath, pid) {
  writeFileSync(pidPath, `${pid}\n`, "utf8");
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function commandLine(pid) {
  try {
    return execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
      ],
      { encoding: "utf8", windowsHide: true },
    ).trim();
  } catch {
    return "";
  }
}

export function isOwnedDeskProcess(pid, scriptPath = DESK_SCRIPT) {
  if (!processAlive(pid)) return false;
  const command = commandLine(pid);
  return command.includes(path.basename(scriptPath));
}

function listeningPids(port) {
  let out = "";
  try {
    out = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8", windowsHide: true });
  } catch {
    return [];
  }
  const found = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;
    const parts = line.trim().split(/\s+/);
    const local = parts[1] ?? "";
    const match = local.match(/:(\d+)$/);
    if (!match || Number(match[1]) !== port) continue;
    const pid = Number(parts.at(-1));
    if (Number.isInteger(pid) && pid > 0) found.add(pid);
  }
  return [...found];
}

function fetchHealth(port) {
  try {
    const out = execFileSync(
      "curl.exe",
      ["-s", "--noproxy", "*", "--max-time", "1", "-w", "\n%{http_code}", `http://127.0.0.1:${port}/health`],
      { encoding: "utf8", windowsHide: true, timeout: HEALTH_CHECK_TIMEOUT_MS },
    );
    const lines = out.trimEnd().split(/\r?\n/);
    const statusCode = Number(lines.pop());
    let body = null;
    try {
      body = JSON.parse(lines.join("\n"));
    } catch {
      body = null;
    }
    return { reachable: statusCode > 0, statusCode, body };
  } catch {
    return { reachable: false, statusCode: 0, body: null };
  }
}

function identified(health) {
  return (
    health.reachable &&
    health.statusCode === 200 &&
    health.body?.ok === true &&
    health.body?.service === OWNER_DESK_SERVICE &&
    Number.isInteger(health.body?.pid) &&
    health.body.pid > 0
  );
}

function readState(statePath) {
  if (!existsSync(statePath)) return { recoveries: [] };
  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8"));
    return { recoveries: Array.isArray(parsed.recoveries) ? parsed.recoveries : [] };
  } catch {
    return { recoveries: [] };
  }
}

function recentRecoveries(state, now) {
  return state.recoveries.filter((at) => now - Date.parse(at) < RECOVERY_WINDOW_MS);
}

function rememberRecovery(statePath, state, nowIso) {
  const next = { recoveries: [...recentRecoveries(state, Date.parse(nowIso)), nowIso] };
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

function record(logPath, entry) {
  mkdirSync(path.dirname(logPath), { recursive: true });
  appendFileSync(logPath, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, "utf8");
  return entry;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function stopOwned(pid, scriptPath) {
  if (!isOwnedDeskProcess(pid, scriptPath)) return false;
  try {
    process.kill(pid);
  } catch {
    return !processAlive(pid);
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!processAlive(pid)) return true;
    sleep(100);
  }
  return !processAlive(pid);
}

function spawnDesk(scriptPath, port) {
  const env = { ...process.env };
  delete env.OWNER_DESK_NO_LISTEN;
  delete env.OWNER_DESK_SERVICE_NAME;
  env.OWNER_DESK_PORT = String(port);
  const child = spawn(process.execPath, [scriptPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env,
  });
  child.unref();
  return child.pid ?? null;
}

function waitForHealth(port, scriptPath, startedPid) {
  const deadline = Date.now() + HEALTH_WAIT_DEADLINE_MS;
  while (Date.now() < deadline) {
    const health = fetchHealth(port);
    if (identified(health) && isOwnedDeskProcess(health.body.pid, scriptPath)) return health;
    if (health.reachable) return health;
    if (startedPid && !processAlive(startedPid)) return health;
    sleep(150);
  }
  return { reachable: false, statusCode: 0, body: null };
}

export function ensureOwnerDesk(options = {}) {
  const port = options.port ?? 4177;
  const scriptPath = options.scriptPath ?? DESK_SCRIPT;
  const pidPath = options.pidPath ?? DEFAULT_PID;
  const logPath = options.logPath ?? DEFAULT_LOG;
  const statePath = options.statePath ?? DEFAULT_STATE;
  const maxRecoveries = options.maxRecoveries ?? DEFAULT_MAX_RECOVERIES;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const listeners = listeningPids(port);
  const health = fetchHealth(port);
  const recorded = readPid(pidPath);

  if (identified(health)) {
    const claimed = health.body.pid;
    if (listeners.includes(claimed) && isOwnedDeskProcess(claimed, scriptPath)) {
      writePid(pidPath, claimed);
      return { action: "kept", reason: "health_ok", pid: claimed, previousPid: recorded, port };
    }
    return record(logPath, {
      action: "blocked",
      reason: "health_response_not_owned_by_desk_process",
      pid: claimed,
      previousPid: recorded,
      port,
      listenerPids: listeners,
    });
  }

  const unrelated = listeners.filter((pid) => !isOwnedDeskProcess(pid, scriptPath));
  if (unrelated.length > 0) {
    return record(logPath, {
      action: "blocked",
      reason: "port_occupied_by_unrelated_process",
      pid: null,
      previousPid: recorded,
      port,
      listenerPids: listeners,
      healthStatus: health.statusCode,
    });
  }

  const ownedTargets = listeners.length
    ? listeners
    : recorded && processAlive(recorded) && isOwnedDeskProcess(recorded, scriptPath)
      ? [recorded]
      : [];

  if (recorded && processAlive(recorded) && listeners.length === 0 && !isOwnedDeskProcess(recorded, scriptPath)) {
    return record(logPath, {
      action: "blocked",
      reason: "recorded_pid_is_not_the_owner_desk",
      pid: recorded,
      previousPid: recorded,
      port,
      listenerPids: listeners,
    });
  }

  const state = readState(statePath);
  if (recentRecoveries(state, now).length >= maxRecoveries) {
    return record(logPath, {
      action: "loop_prevented",
      reason: "recovery_limit_reached",
      pid: recorded,
      previousPid: recorded,
      port,
      listenerPids: listeners,
      healthStatus: health.statusCode,
    });
  }

  for (const pid of ownedTargets) {
    if (!stopOwned(pid, scriptPath)) {
      return record(logPath, {
        action: "blocked",
        reason: "owned_process_could_not_be_stopped",
        pid,
        previousPid: recorded,
        port,
        listenerPids: listeningPids(port),
      });
    }
  }

  if (listeningPids(port).some((pid) => !isOwnedDeskProcess(pid, scriptPath))) {
    return record(logPath, {
      action: "blocked",
      reason: "port_occupied_after_owned_stop",
      pid: null,
      previousPid: recorded,
      port,
      listenerPids: listeningPids(port),
    });
  }
  if (listeningPids(port).length > 0) {
    return record(logPath, {
      action: "failed",
      reason: "owned_listener_still_bound",
      pid: null,
      previousPid: recorded,
      port,
      listenerPids: listeningPids(port),
    });
  }

  rememberRecovery(statePath, state, nowIso);
  const started = spawnDesk(scriptPath, port);
  if (!started) {
    return record(logPath, {
      action: "failed",
      reason: "spawn_did_not_return_a_pid",
      pid: null,
      previousPid: recorded,
      port,
    });
  }
  writePid(pidPath, started);
  const after = waitForHealth(port, scriptPath, started);
  if (!identified(after) || !isOwnedDeskProcess(after.body.pid, scriptPath)) {
    return record(logPath, {
      action: "failed",
      reason: listeners.length ? "restart_did_not_identify_console" : "start_did_not_identify_console",
      pid: started,
      previousPid: recorded,
      port,
      healthStatus: after.statusCode,
      service: after.body?.service ?? null,
    });
  }
  writePid(pidPath, after.body.pid);
  const action = ownedTargets.length ? "recovered" : "started";
  return record(logPath, {
    action,
    reason: ownedTargets.length
      ? listeners.length
        ? "stale_or_unidentified_listener"
        : "live_pid_port_closed"
      : "stopped",
    pid: after.body.pid,
    previousPid: recorded,
    port,
    healthStatus: after.statusCode,
    service: after.body.service,
  });
}
