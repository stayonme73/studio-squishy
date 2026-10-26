/**
 * One Owner desk listener.
 * Serves the single Owner page and persists Acknowledge so the alarm stays off.
 * Does not open browser tabs. Does not play sound on ack.
 */
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, watch, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyOwnerTrayAction,
  presentOwnerTray,
  seedOwnerConsole001003State,
  seedOwnerConsoleE2eState,
  seedOwnerTrayState,
} from "./owner-decision-tray-engine.mjs";
import {
  persistVideo1Decision,
  VIDEO_1_MATTER_ID,
  VIDEO_1_RETURN_MP4,
} from "./studio-demo-video-1-owner-console.mjs";
import {
  persistSampleSetDecision,
  SAMPLE_SET_MATTER_ID,
  samplePath,
  SAMPLE_SET_IDS,
} from "./studio-homepage-sample-set-owner-console.mjs";
import {
  persistTileCropDecision,
  TILE_CROP_MATTER_ID,
  TILE_CROP_PREVIEW,
  TILE_CROP_CAROUSEL,
} from "./studio-homepage-tile-crop-owner-console.mjs";
import {
  persistTilePreviewSetDecision,
  previewSetAssetPath,
  TILE_PREVIEW_SET_MATTER_ID,
} from "./studio-homepage-tile-preview-set-owner-console.mjs";
import {
  nextWorkStateAfterOwnerDecision,
  ownerDecisionShouldClearWait,
  remainingOwnerFileCount,
} from "./owner-decision-clears-wait.mjs";
import {
  resolveActivityTruth,
  resolveDisplayedWorkState,
  shouldDeclareWatchdogStall,
  shouldPlayWatchdogAudible,
} from "./work-heartbeat-watchdog-rules.mjs";
import { readProductionReceipt } from "./owner-production-receipt.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number.parseInt(process.env.OWNER_DESK_PORT ?? "4177", 10);
const SERVICE_NAME = process.env.OWNER_DESK_SERVICE_NAME || "project-alpha-owner-console";
const HOST = "0.0.0.0";
const COOKIE = "owner-desk-session";
const PIN_PATH = path.join(ROOT, "docs/launch/project-alpha-owner-desk-pin.json");
const CONSOLE_HTML = path.join(ROOT, "docs/launch/PROJECT-ALPHA-OWNER-CONSOLE.html");
const HEARTBEAT_JSON = path.join(ROOT, "docs/launch/project-alpha-work-heartbeat.json");
const ATTENTION_JSON = path.join(ROOT, "docs/launch/project-alpha-attention-state.json");
const BOYS_JPG = path.join(ROOT, "docs/launch/studio-boys-background.jpg");
const PID_PATH = path.join(ROOT, "docs/launch/project-alpha-owner-desk.pid");
const TRAY_JSON = path.join(ROOT, "docs/launch/project-alpha-owner-desk-tray.json");
const OPS_SNAPSHOT_JSON = path.join(ROOT, "docs/launch/owner-bridge/outbound-snapshot.json");
const OPS_SNAPSHOT_MD = path.join(ROOT, "docs/launch/owner-bridge/outbound-snapshot.md");

function readTray() {
  if (!existsSync(TRAY_JSON)) return seedOwnerTrayState();
  try {
    const parsed = JSON.parse(readFileSync(TRAY_JSON, "utf8"));
    if (!parsed || !Array.isArray(parsed.matters) || parsed.matters.length === 0) {
      return seedOwnerTrayState();
    }
    return parsed;
  } catch {
    return seedOwnerTrayState();
  }
}

function writeTray(state) {
  writeFileSync(TRAY_JSON, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function pulseAfterOwnerDecision(heartbeat, nextState) {
  const args = [
    path.join(ROOT, "scripts/work-heartbeat-pulse.mjs"),
    "--package",
    String(heartbeat.packageId || "STUDIO-HOMEPAGE-WHAT-WE-CREATE-SAMPLE-SET-1"),
    "--task",
    nextState === "WAITING_ON_SYSTEM"
      ? "In production after Owner decision"
      : "Owner decision recorded",
    "--action",
    "Machine cleared WAITING ON OWNER after a valid Owner send.",
  ];
  if (nextState === "WAITING_ON_SYSTEM") args.push("--waiting-system");
  // Pulse through Node directly. A detached npm spawn without a shell
  // throws EINVAL on Windows and left Refresh painting the stale RED wait.
  execFileSync(process.execPath, args, {
    cwd: ROOT,
    stdio: "ignore",
    windowsHide: true,
  });
}

function inferDecisionAction(matter) {
  const status = String(matter?.status || "").toLowerCase();
  if (status.includes("sent back")) return "send_back";
  if (status.includes("approved")) return "approve";
  if (status.includes("rejected")) return "reject";
  return "send";
}

function latestDecidedMatter(state) {
  return (state?.matters ?? [])
    .filter(
      (matter) =>
        matter.tray === "SENT_IN_PROGRESS" || matter.tray === "COMPLETED_FILED",
    )
    .sort(
      (a, b) =>
        Date.parse(b.stateChangedAt || 0) - Date.parse(a.stateChangedAt || 0),
    )[0] ?? null;
}

function clearStaleWaitingOnOwner(state, action, matter) {
  const heartbeat = readJson(HEARTBEAT_JSON);
  if (
    !ownerDecisionShouldClearWait({
      action,
      remainingOwnerFileCount: remainingOwnerFileCount(state),
      workState: heartbeat.workState,
    })
  ) {
    return false;
  }
  const nextState = nextWorkStateAfterOwnerDecision({
    action,
    assignedRecipient: matter?.assignedRecipient,
    nextActor: matter?.assignedRecipient,
  });
  try {
    pulseAfterOwnerDecision(heartbeat, nextState);
    return true;
  } catch {
    return false;
  }
}

function reconcileStaleOwnerWait() {
  const state = readTray();
  const matter = latestDecidedMatter(state);
  if (!matter) return false;
  return clearStaleWaitingOnOwner(state, inferDecisionAction(matter), matter);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

function lanAddresses() {
  const found = [];
  const nets = networkInterfaces();
  for (const rows of Object.values(nets)) {
    for (const row of rows || []) {
      if (row.family !== "IPv4" || row.internal) continue;
      found.push(row.address);
    }
  }
  return found;
}

function loadOwnerPin() {
  if (process.env.OWNER_DESK_PIN) return String(process.env.OWNER_DESK_PIN);
  if (existsSync(PIN_PATH)) {
    const saved = readJson(PIN_PATH);
    if (saved.pin) return String(saved.pin);
  }
  const pin = String(100000 + Math.floor(Math.random() * 900000));
  writeFileSync(
    PIN_PATH,
    `${JSON.stringify({ pin, createdAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
  return pin;
}

const OWNER_PIN = loadOwnerPin();
const ownerSessions = new Set();

function cookieValue(req, name) {
  const raw = String(req.headers.cookie ?? "");
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

function isLoopback(req) {
  const ip = String(req.socket.remoteAddress ?? "");
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

function isOwner(req) {
  if (isLoopback(req)) return true;
  const token = cookieValue(req, COOKIE);
  return Boolean(token && ownerSessions.has(token));
}

function pinMatches(given) {
  const a = Buffer.from(String(given ?? ""), "utf8");
  const b = Buffer.from(OWNER_PIN, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sendGate(res) {
  cors(res);
  res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Owner desk</title>
  <style>
    html, body { margin: 0; min-height: 100%; color: #fff; font-family: "Segoe UI", Inter, Arial, Helvetica, sans-serif; }
    body { display: flex; align-items: center; justify-content: center; padding: 8vh 6vw;
      background: linear-gradient(color-mix(in srgb, #2a2420 40%, transparent), color-mix(in srgb, #2a2420 40%, transparent)), url("/studio-boys-background.jpg") center / cover no-repeat fixed, #2a2420; }
    form { width: min(22rem, 100%); padding: 1.1rem 1.2rem; background: color-mix(in srgb, #2a2420 28%, transparent); border: 2px solid #c8b59b; border-radius: 0.85rem; }
    p { margin: 0 0 0.8rem; font-size: 1.125rem; }
    strong { color: #8ff5c6; }
    input, button { font: inherit; width: 100%; box-sizing: border-box; margin: 0.35rem 0 0; padding: 0.7rem 0.8rem; border-radius: 0.4rem; }
    input { border: 1px solid #c8b59b; background: color-mix(in srgb, #2a2420 40%, transparent); color: #fff; }
    button { border: 2px solid #c8b59b; background: color-mix(in srgb, #fff8e7 88%, transparent); color: #20262d; font-weight: 700; }
    .err { color: #ff5a4a; min-height: 1.4rem; }
  </style>
</head>
<body>
  <form id="gate">
    <p><strong>Owner desk</strong></p>
    <p>Not the customer site. Enter your Owner PIN.</p>
    <input name="pin" type="password" inputmode="numeric" autocomplete="one-time-code" required />
    <button type="submit">Open desk</button>
    <p class="err" id="err"></p>
  </form>
  <script>
  document.getElementById("gate").addEventListener("submit", function (event) {
    event.preventDefault();
    var pin = event.target.pin.value;
    fetch("/gate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: pin }) })
      .then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
      .then(function (out) {
        if (!out.res.ok || !out.data.ok) throw new Error("PIN did not match.");
        window.location.replace("/");
      })
      .catch(function () { document.getElementById("err").textContent = "PIN did not match."; });
  });
  </script>
</body>
</html>`);
}

function requireOwner(req, res, url) {
  if (isOwner(req)) return true;
  if (url.pathname === "/studio-boys-background.jpg" || url.pathname === "/gate") return true;
  const wantsHtml =
    req.method === "GET" &&
    (url.pathname === "/" ||
      url.pathname === "/PROJECT-ALPHA-OWNER-CONSOLE.html" ||
      url.pathname === "/PROJECT-ALPHA-WORK-HEARTBEAT.html");
  if (wantsHtml) {
    sendGate(res);
    return false;
  }
  sendJson(res, 401, { ok: false, error: "Owner only" });
  return false;
}

function readJson(file) {
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function persistAck() {
  const now = new Date().toISOString();
  const heartbeat = readJson(HEARTBEAT_JSON);
  heartbeat.attentionAcknowledgedAt = now;
  writeFileSync(HEARTBEAT_JSON, `${JSON.stringify(heartbeat, null, 2)}\n`, "utf8");
  const attention = readJson(ATTENTION_JSON);
  attention.acknowledgedAt = now;
  writeFileSync(ATTENTION_JSON, `${JSON.stringify(attention, null, 2)}\n`, "utf8");
  for (const file of [CONSOLE_HTML, path.join(ROOT, "docs/launch/PROJECT-ALPHA-WORK-HEARTBEAT.html")]) {
    if (!existsSync(file)) continue;
    let html = readFileSync(file, "utf8");
    html = html.replace(/data-attention-acked="false"/g, 'data-attention-acked="true"');
    html = html.replace(/id="owner-ack-box" data-acked="false"/g, 'id="owner-ack-box" data-acked="true"');
    html = html.replace(/data-attention-phase="alert_unacked"/g, 'data-attention-phase="acknowledged_action_required"');
    html = html.replace(/id="ack-done" hidden/g, 'id="ack-done"');
    html = html.replace(/<meta http-equiv="refresh" content="15" \/>\s*/g, "");
    writeFileSync(file, html, "utf8");
  }
}

function sendJson(res, status, body) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(body)}\n`);
}

function statusPayload() {
  const heartbeat = readJson(HEARTBEAT_JSON);
  const attention = readJson(ATTENTION_JSON);
  const lastActivityAt = heartbeat.lastActivityAt ?? heartbeat.changedAt ?? null;
  const recorded = heartbeat.workState ?? null;
  const workState = resolveDisplayedWorkState(heartbeat) ?? recorded;
  const activityTruth = resolveActivityTruth(heartbeat);
  const currentTask = activityTruth === "WORKING" ? heartbeat.executionAssignment || "" : "";
  const since = heartbeat.stalledAt || lastActivityAt || heartbeat.changedAt || null;
  let howLong = "since first notified";
  if (since) {
    const minutes = Math.floor((Date.now() - Date.parse(since)) / 60000);
    if (Number.isFinite(minutes)) {
      if (minutes < 1) howLong = "just now";
      else if (minutes < 60) howLong = `${minutes} min since first notified`;
      else howLong = `${Math.floor(minutes / 60)} hr since first notified`;
    }
  }
  const tray = presentOwnerTray(readTray());
  const activeOwnerFileCount = tray.trays
    .filter((entry) => entry.id === "ACTION_REQUIRED" || entry.id === "WAITING_ON_MY_DECISION")
    .reduce((count, entry) => count + entry.count, 0);
  return {
    ok: true,
    workState,
    recordedWorkState: recorded,
    lastActivityAt,
    attentionState: heartbeat.attentionState ?? attention.state ?? null,
    acknowledgedAt: heartbeat.attentionAcknowledgedAt ?? attention.acknowledgedAt ?? null,
    tagiaMustAct: Boolean(heartbeat.tagiaMustAct) || activeOwnerFileCount > 0,
    scoutListening: activityTruth === "LISTENING",
    scoutTrouble: activityTruth === "TROUBLE",
    productionTrouble: Boolean(heartbeat.productionTrouble),
    activityTruth,
    activeExecutionCount: Number(heartbeat.activeExecutionCount) || 0,
    executionEvidenceAt: heartbeat.executionEvidenceAt ?? null,
    executionFailure: heartbeat.executionFailure ?? null,
    currentTask,
    lastMeaningfulAction: heartbeat.lastMeaningfulAction ?? "",
    howLong,
    activeOwnerFileCount,
    ownerActionOnDesk: activeOwnerFileCount > 0,
    trayRevision: `${activeOwnerFileCount}:${tray.trays.map((entry) => entry.count).join(",")}:${tray.openMatterId ?? ""}`,
    expectedToContinue: heartbeat.expectedToContinue === true,
    intentionalStop: Boolean(heartbeat.intentionalStop),
    monitoringOn: heartbeat.watchdogMonitoring !== false,
    alarmMuted: Boolean(heartbeat.alarmMuted),
    wouldDeclareStall: shouldDeclareWatchdogStall(heartbeat),
    audibleWouldFire: shouldPlayWatchdogAudible(heartbeat),
    refreshMutates: false,
    production: readProductionReceipt(),
  };
}

function writeWatchdogControl(patch) {
  const heartbeat = readJson(HEARTBEAT_JSON);
  if (patch.watchdogMonitoring !== undefined) {
    heartbeat.watchdogMonitoring = Boolean(patch.watchdogMonitoring);
  }
  if (patch.alarmMuted !== undefined) {
    heartbeat.alarmMuted = Boolean(patch.alarmMuted);
  }
  writeFileSync(HEARTBEAT_JSON, `${JSON.stringify(heartbeat, null, 2)}\n`, "utf8");
  return heartbeat;
}

const liveClients = new Set();
function pushLive() {
  const payload = `data: ${JSON.stringify(statusPayload())}\n\n`;
  for (const client of liveClients) {
    try {
      client.write(payload);
    } catch {
      liveClients.delete(client);
    }
  }
}
function watchLive(file) {
  if (!existsSync(file)) return;
  watch(file, () => {
    try {
      pushLive();
    } catch {
      /* ignore */
    }
  });
}
watchLive(HEARTBEAT_JSON);
watchLive(TRAY_JSON);
let lastLive = "";
setInterval(() => {
  try {
    const next = JSON.stringify(statusPayload());
    if (next !== lastLive) {
      lastLive = next;
      pushLive();
    }
  } catch {
    /* ignore */
  }
}, 400);

function sendHtml(res) {
  cors(res);
  const html = existsSync(CONSOLE_HTML)
    ? readFileSync(CONSOLE_HTML, "utf8")
    : "<!doctype html><title>Owner desk missing</title>";
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === "/health" && req.method === "GET") {
    if (!isLoopback(req)) {
      sendJson(res, 404, { ok: false, error: "one Owner page only" });
      return;
    }
    sendJson(res, 200, { ok: true, service: SERVICE_NAME, pid: process.pid });
    return;
  }

  if (url.pathname === "/gate" && req.method === "POST") {
    readJsonBody(req)
      .then((body) => {
        if (!pinMatches(body.pin)) {
          sendJson(res, 401, { ok: false, error: "PIN did not match." });
          return;
        }
        const token = randomBytes(24).toString("hex");
        ownerSessions.add(token);
        cors(res);
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Set-Cookie": `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
        });
        res.end(`${JSON.stringify({ ok: true })}\n`);
      })
      .catch((error) => {
        sendJson(res, 400, { ok: false, error: String(error.message ?? error) });
      });
    return;
  }

  if (!requireOwner(req, res, url)) return;

  if (url.pathname === "/ack" && (req.method === "POST" || req.method === "GET")) {
    persistAck();
    const heartbeat = readJson(HEARTBEAT_JSON);
    const attention = readJson(ATTENTION_JSON);
    sendJson(res, 200, {
      ok: true,
      silenced: true,
      acknowledgedAt: heartbeat.attentionAcknowledgedAt ?? attention.acknowledgedAt ?? new Date().toISOString(),
      alertId: heartbeat.attentionAlertId ?? attention.alertId ?? null,
    });
    return;
  }

  if (url.pathname === "/tray" && req.method === "GET") {
    sendJson(res, 200, { ok: true, ...presentOwnerTray(readTray()) });
    return;
  }

  if (url.pathname === "/tray" && req.method === "POST") {
    readJsonBody(req)
      .then((body) => {
        const next = applyOwnerTrayAction(readTray(), {
          action: body.action,
          matterId: body.matterId,
          question: body.question,
          decision: body.decision,
        });
        writeTray(next);
        if (
          body.matterId === VIDEO_1_MATTER_ID &&
          (body.action === "approve" ||
            body.action === "reject" ||
            body.action === "send_back")
        ) {
          persistVideo1Decision(next, body.action, body.decision);
        }
        if (
          body.matterId === SAMPLE_SET_MATTER_ID &&
          (body.action === "approve" ||
            body.action === "reject" ||
            body.action === "send_back")
        ) {
          persistSampleSetDecision(next, body.action, body.decision);
        }
        if (
          body.matterId === TILE_CROP_MATTER_ID &&
          (body.action === "approve" ||
            body.action === "reject" ||
            body.action === "send_back")
        ) {
          persistTileCropDecision(next, body.action, body.decision);
        }
        if (
          body.matterId === TILE_PREVIEW_SET_MATTER_ID &&
          (body.action === "approve" ||
            body.action === "reject" ||
            body.action === "send_back")
        ) {
          persistTilePreviewSetDecision(next, body.action, body.decision);
        }
        const decided = next.matters.find((matter) => matter.id === body.matterId);
        clearStaleWaitingOnOwner(next, body.action, decided);
        sendJson(res, 200, { ok: true, ...presentOwnerTray(next) });
      })
      .catch((error) => {
        sendJson(res, 400, { ok: false, error: String(error.message ?? error) });
      });
    return;
  }

  if (url.pathname === "/tray/reset" && (req.method === "POST" || req.method === "GET")) {
    const seeded = seedOwnerTrayState();
    writeTray(seeded);
    sendJson(res, 200, { ok: true, reset: true, ...presentOwnerTray(seeded) });
    return;
  }

  if (url.pathname === "/tray/001-003" && (req.method === "POST" || req.method === "GET")) {
    const seeded = seedOwnerConsole001003State();
    writeTray(seeded);
    sendJson(res, 200, { ok: true, test: "001-003", ...presentOwnerTray(seeded) });
    return;
  }

  if (url.pathname === "/tray/e2e" && (req.method === "POST" || req.method === "GET")) {
    const seeded = seedOwnerConsoleE2eState();
    writeTray(seeded);
    const now = new Date().toISOString();
    const heartbeat = readJson(HEARTBEAT_JSON);
    heartbeat.attentionAcknowledgedAt = null;
    heartbeat.attentionState = "RED";
    heartbeat.tagiaMustAct = true;
    heartbeat.attentionAlertId = `e2e-harbor-roast-${now}`;
    writeFileSync(HEARTBEAT_JSON, `${JSON.stringify(heartbeat, null, 2)}\n`, "utf8");
    const attention = readJson(ATTENTION_JSON);
    attention.acknowledgedAt = null;
    attention.state = "RED";
    attention.alertId = heartbeat.attentionAlertId;
    writeFileSync(ATTENTION_JSON, `${JSON.stringify(attention, null, 2)}\n`, "utf8");
    for (const file of [CONSOLE_HTML, path.join(ROOT, "docs/launch/PROJECT-ALPHA-WORK-HEARTBEAT.html")]) {
      if (!existsSync(file)) continue;
      let html = readFileSync(file, "utf8");
      html = html.replace(/data-attention-acked="true"/g, 'data-attention-acked="false"');
      html = html.replace(/id="owner-ack-box" data-acked="true"/g, 'id="owner-ack-box" data-acked="false"');
      html = html.replace(/data-attention-phase="acknowledged_action_required"/g, 'data-attention-phase="alert_unacked"');
      html = html.replace(/data-alert-id="[^"]*"/g, `data-alert-id="${heartbeat.attentionAlertId}"`);
      writeFileSync(file, html, "utf8");
    }
    sendJson(res, 200, {
      ok: true,
      e2e: true,
      alertId: heartbeat.attentionAlertId,
      ...presentOwnerTray(seeded),
    });
    return;
  }

  if (url.pathname === "/ops-bridge/snapshot.json" && req.method === "GET") {
    if (!existsSync(OPS_SNAPSHOT_JSON)) {
      sendJson(res, 404, { ok: false, error: "ops snapshot not written yet" });
      return;
    }
    sendJson(res, 200, JSON.parse(readFileSync(OPS_SNAPSHOT_JSON, "utf8")));
    return;
  }

  if (url.pathname === "/ops-bridge/snapshot.md" && req.method === "GET") {
    cors(res);
    if (!existsSync(OPS_SNAPSHOT_MD)) {
      sendJson(res, 404, { ok: false, error: "ops snapshot markdown not written yet" });
      return;
    }
    res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "no-store" });
    res.end(readFileSync(OPS_SNAPSHOT_MD, "utf8"));
    return;
  }

  if (url.pathname === "/ops-bridge/inbound" && req.method === "POST") {
    readJsonBody(req)
      .then(async (body) => {
        const { consumeInboundDecision } = await import("./ops-bridge-lib.mjs");
        const result = consumeInboundDecision(body);
        sendJson(res, result.ok ? 200 : 400, result);
      })
      .catch((error) => {
        sendJson(res, 400, { ok: false, error: String(error.message ?? error) });
      });
    return;
  }

  if (url.pathname === "/status") {
    sendJson(res, 200, statusPayload());
    return;
  }

  if (url.pathname === "/watchdog/refresh") {
    // Re-read only. The one allowed write is clearing a leftover WAITING ON
    // OWNER after Owner already sent and no action files remain.
    reconcileStaleOwnerWait();
    sendJson(res, 200, statusPayload());
    return;
  }

  if (url.pathname === "/watchdog/monitoring" && req.method === "POST") {
    readJsonBody(req)
      .then((body) => {
        writeWatchdogControl({ watchdogMonitoring: body.on !== false });
        sendJson(res, 200, statusPayload());
      })
      .catch((error) => {
        sendJson(res, 400, { ok: false, error: String(error.message ?? error) });
      });
    return;
  }

  if (url.pathname === "/watchdog/mute" && req.method === "POST") {
    readJsonBody(req)
      .then((body) => {
        writeWatchdogControl({ alarmMuted: Boolean(body.muted) });
        sendJson(res, 200, statusPayload());
      })
      .catch((error) => {
        sendJson(res, 400, { ok: false, error: String(error.message ?? error) });
      });
    return;
  }

  if (url.pathname === "/live") {
    cors(res);
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write("retry: 500\n\n");
    res.write(`data: ${JSON.stringify(statusPayload())}\n\n`);
    liveClients.add(res);
    req.on("close", () => {
      liveClients.delete(res);
    });
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/owner-judgment-asset/what-we-create-tile-preview/")) {
    cors(res);
    const name = url.pathname.split("/").pop();
    const allowed = new Set([
      "carousel-desktop.jpg",
      "carousel-desktop-end.jpg",
      "carousel-mobile.jpg",
      "carousel-mobile-end.jpg",
    ]);
    if (!allowed.has(name)) {
      sendJson(res, 404, { ok: false, error: "Unknown tile-preview proof." });
      return;
    }
    const file = previewSetAssetPath(name);
    if (!existsSync(file)) {
      sendJson(res, 404, { ok: false, error: "Tile-preview proof is not on the Owner desk yet." });
      return;
    }
    res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "no-store" });
    res.end(readFileSync(file));
    return;
  }

  if (req.method === "GET" && url.pathname === "/owner-judgment-asset/long-to-short-tile-preview") {
    cors(res);
    if (!existsSync(TILE_CROP_PREVIEW)) {
      sendJson(res, 404, { ok: false, error: "Tile preview is not on the Owner desk yet." });
      return;
    }
    res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "no-store" });
    res.end(readFileSync(TILE_CROP_PREVIEW));
    return;
  }

  if (req.method === "GET" && url.pathname === "/owner-judgment-asset/long-to-short-tile-carousel") {
    cors(res);
    if (!existsSync(TILE_CROP_CAROUSEL)) {
      sendJson(res, 404, { ok: false, error: "Carousel screenshot is not on the Owner desk yet." });
      return;
    }
    res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "no-store" });
    res.end(readFileSync(TILE_CROP_CAROUSEL));
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/owner-judgment-asset/what-we-create-sample/")) {
    cors(res);
    const id = url.pathname.split("/").pop();
    if (!SAMPLE_SET_IDS.includes(id)) {
      sendJson(res, 404, { ok: false, error: "Unknown sample." });
      return;
    }
    const file = samplePath(id);
    if (!existsSync(file)) {
      sendJson(res, 404, { ok: false, error: "Sample is not on the Owner desk yet." });
      return;
    }
    res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "no-store" });
    res.end(readFileSync(file));
    return;
  }

  if (req.method === "GET" && url.pathname === "/owner-judgment-asset/studio-demo-video-1") {
    cors(res);
    if (!existsSync(VIDEO_1_RETURN_MP4)) {
      sendJson(res, 404, { ok: false, error: "Video 1 is not on the Owner desk yet." });
      return;
    }
    res.writeHead(200, { "Content-Type": "video/mp4", "Cache-Control": "no-store" });
    res.end(readFileSync(VIDEO_1_RETURN_MP4));
    return;
  }

  if (req.method === "GET" && url.pathname === "/studio-boys-background.jpg") {
    cors(res);
    if (!existsSync(BOYS_JPG)) {
      sendJson(res, 404, { ok: false, error: "background missing" });
      return;
    }
    res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "no-store" });
    res.end(readFileSync(BOYS_JPG));
    return;
  }

  if (
    req.method === "GET" &&
    (url.pathname === "/" ||
      url.pathname === "/PROJECT-ALPHA-OWNER-CONSOLE.html" ||
      url.pathname === "/PROJECT-ALPHA-WORK-HEARTBEAT.html")
  ) {
    sendHtml(res);
    return;
  }

  sendJson(res, 404, { ok: false, error: "one Owner page only" });
});

if (!existsSync(TRAY_JSON) || readTray().matters.length === 0) {
  writeTray(seedOwnerTrayState());
}
server.on("error", (error) => {
  process.stderr.write(`owner desk listen failed: ${error.code ?? ""} ${error.message}\n`);
  process.exit(1);
});
if (process.env.OWNER_DESK_NO_LISTEN === "1") {
  setInterval(() => {}, 1 << 30);
} else {
server.listen(PORT, HOST, () => {
  if (PORT === 4177) writeFileSync(PID_PATH, `${process.pid}\n`, "utf8");
  process.stdout.write(`owner desk laptop http://127.0.0.1:${PORT}/\n`);
  for (const ip of lanAddresses()) {
    process.stdout.write(`owner desk home phone  http://${ip}:${PORT}/\n`);
  }
  try {
    const away = execFileSync("tailscale", ["ip", "-4"], {
      encoding: "utf8",
      windowsHide: true,
    })
      .trim()
      .split(/\s+/)[0];
    if (away) process.stdout.write(`owner desk away phone http://${away}:${PORT}/\n`);
  } catch {
    process.stdout.write("owner desk away phone  Tailscale not signed in yet\n");
  }
  process.stdout.write("Owner PIN is in docs/launch/project-alpha-owner-desk-pin.json. Not the customer site.\n");
});
}
