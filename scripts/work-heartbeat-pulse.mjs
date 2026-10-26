/**
 * Project Alpha work-state pulse.
 * Writes one Owner desk. Does not open extra browser tabs.
 * ACTIVE → ACTIVE is visual only. Leaving ACTIVE notifies immediately.
 * --idle is refused unless --no-authorized-work.
 * Does not modify Cursor. Does not touch the customer site.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isScoutListeningHandoff,
  shouldPlayWatchdogAudible,
} from "./work-heartbeat-watchdog-rules.mjs";
import { writeOutboundSnapshot } from "./ops-bridge-lib.mjs";
import { ensureOwnerDesk } from "./owner-console-keeper.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = path.join(ROOT, "docs/launch/project-alpha-work-heartbeat.json");
const HTML_PATH = path.join(ROOT, "docs/launch/PROJECT-ALPHA-WORK-HEARTBEAT.html");
const CONSOLE_PATH = path.join(ROOT, "docs/launch/PROJECT-ALPHA-OWNER-CONSOLE.html");
const LOG_PATH = path.join(ROOT, "docs/launch/project-alpha-work-state-transitions.jsonl");
const ATTENTION_JSON = path.join(ROOT, "docs/launch/project-alpha-attention-state.json");
const ATTENTION_HTML = path.join(ROOT, "docs/launch/PROJECT-ALPHA-OWNER-ATTENTION.html");
const ALERT_SCRIPT = path.join(ROOT, "scripts/owner-attention-alert.mjs");
const WATCHDOG_SCRIPT = path.join(ROOT, "scripts/work-heartbeat-watchdog.mjs");
const WATCHDOG_PID = path.join(ROOT, "docs/launch/project-alpha-work-watchdog.pid");
const DESK_URL = "http://127.0.0.1:4177/";
const STALE_MS = 600_000;
const PACKAGE_ID = "STUDIO-OPERATING-SINGLE-PAGE-OWNER-WORK-AND-ATTENTION-CONSOLE-1";

function parseArgs(argv) {
  const out = {
    idle: argv.includes("--idle"),
    stopped: argv.includes("--stopped"),
    waitingOwner: argv.includes("--waiting-owner"),
    waitingSystem: argv.includes("--waiting-system"),
    stalled: argv.includes("--stalled"),
    sliceDone: argv.includes("--slice-done"),
    listening: argv.includes("--listening"),
    noAuthorizedWork: argv.includes("--no-authorized-work"),
    open: argv.includes("--open"),
    keepRed: argv.includes("--keep-red"),
    ack: argv.includes("--ack"),
    resolve: argv.includes("--resolve"),
    quiet: argv.includes("--quiet"),
    attention: null,
    task: null,
    action: null,
    reason: null,
    next: null,
    waitingOn: null,
    blocker: null,
    packageId: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--task") out.task = argv[i + 1] ?? null;
    if (argv[i] === "--action") out.action = argv[i + 1] ?? null;
    if (argv[i] === "--reason") out.reason = argv[i + 1] ?? null;
    if (argv[i] === "--next") out.next = argv[i + 1] ?? null;
    if (argv[i] === "--waiting-on") out.waitingOn = argv[i + 1] ?? null;
    if (argv[i] === "--blocker") out.blocker = argv[i + 1] ?? null;
    if (argv[i] === "--package") out.packageId = argv[i + 1] ?? null;
    if (argv[i] === "--attention") {
      const raw = String(argv[i + 1] ?? "").toUpperCase();
      out.attention = raw === "GREEN" || raw === "YELLOW" || raw === "RED" ? raw : null;
    }
  }
  return out;
}

function readExisting() {
  if (!existsSync(JSON_PATH)) return {};
  return JSON.parse(readFileSync(JSON_PATH, "utf8"));
}

function workStateOf(flags, previous) {
  if (flags.stalled) return "STALLED_HUNG";
  if (flags.stopped || flags.listening) return "STOPPED";
  if (flags.idle) return "IDLE";
  if (flags.waitingOwner) return "WAITING_ON_OWNER";
  if (flags.waitingSystem) return "WAITING_ON_SYSTEM";
  if ((flags.ack || flags.resolve) && !flags.sliceDone) {
    return previous.workState ?? "ACTIVE_WORK";
  }
  return "ACTIVE_WORK";
}

function labelFor(state) {
  if (state === "ACTIVE_WORK") return "ACTIVE WORK";
  if (state === "WAITING_ON_OWNER") return "WAITING ON OWNER";
  if (state === "WAITING_ON_SYSTEM") return "WAITING ON SYSTEM";
  if (state === "STALLED_HUNG") return "STALLED / HUNG";
  if (state === "STOPPED") return "STOPPED";
  return "IDLE";
}

function resolveAttention(nextState, previous, flags) {
  if (flags.resolve) return flags.attention ?? "GREEN";
  if (flags.attention) return flags.attention;
  if (nextState === "WAITING_ON_OWNER") return "RED";
  if (nextState === "STOPPED" || flags.listening) return "GREEN";
  if (nextState === "STALLED_HUNG" || nextState === "IDLE") {
    return "RED";
  }
  if (nextState === "ACTIVE_WORK") return "GREEN";
  if (nextState === "WAITING_ON_SYSTEM") return "YELLOW";
  return "YELLOW";
}

function notifyKind(previous, next, flags = {}) {
  if (flags.ack || flags.resolve) return "none";
  if (flags.sliceDone) return "slice_complete";
  if (previous === next) return "none";
  if (next === "ACTIVE_WORK") {
    return previous && previous !== "ACTIVE_WORK" ? "visible_resume" : "none";
  }
  if (next === "WAITING_ON_OWNER") return "owner_red_audible";
  if (next === "WAITING_ON_SYSTEM") return "yellow_system";
  if (next === "STALLED_HUNG") return "stalled_audible";
  if (next === "STOPPED") return "stopped_alert";
  return "idle_alert";
}

function clock(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

function readHistory(limit = 24) {
  if (!existsSync(LOG_PATH)) return [];
  const lines = readFileSync(LOG_PATH, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  const rows = [];
  for (const line of lines.slice(-limit)) {
    try {
      rows.push(JSON.parse(line));
    } catch {
      /* skip bad line */
    }
  }
  return rows.reverse();
}

function historyHtml(rows) {
  if (!rows.length) {
    return `<p class="history-empty">No state transitions recorded yet.</p>`;
  }
  return `<ol class="history-list">${rows
    .map((row) => {
      const from = labelFor(row.previousState ?? "IDLE");
      const to = labelFor(row.nextState ?? "IDLE");
      return `<li data-notify-kind="${escapeHtml(row.notifyKind ?? "none")}">
        <time>${escapeHtml(row.at ?? "")}</time>
        <strong>${escapeHtml(from)} → ${escapeHtml(to)}</strong>
        <span>${escapeHtml(row.currentTask ?? "")}</span>
        <span>${escapeHtml(row.lastMeaningfulAction ?? row.reason ?? "")}</span>
      </li>`;
    })
    .join("")}</ol>`;
}

function renderHtml(record, historyRows) {
  const now = Date.now();
  const last = Date.parse(record.lastActivityAt);
  const fresh = Number.isFinite(last) && now - last < STALE_MS;
  const stalled = record.workState === "ACTIVE_WORK" && !fresh;
  const displayed = stalled ? "STALLED_HUNG" : record.workState;
  const label = stalled ? "STALLED / HUNG" : labelFor(record.workState);
  const live = record.workState === "ACTIVE_WORK" && fresh;
  const stalledAt = stalled
    ? new Date(last + STALE_MS).toISOString()
    : record.stalledAt;
  const previous = record.previousState ? labelFor(record.previousState) : "none";
  const waitingOnOwner = displayed === "WAITING_ON_OWNER";
  const waitingOnSystem = displayed === "WAITING_ON_SYSTEM";
  const stuck = displayed === "STALLED_HUNG";
  const stopped = displayed === "STOPPED" || displayed === "IDLE";
  const working = displayed === "ACTIVE_WORK" && live;
  const acked = Boolean(record.attentionAcknowledgedAt);
  const needsOwner =
    record.attentionState === "RED" && Boolean(record.tagiaMustAct);
  const exactOwnerAction = needsOwner
    ? record.whatHappensNext
    : "None. No Owner action required.";
  const ackPhase = !needsOwner
    ? record.attentionState === "GREEN"
      ? "resolved"
      : "none"
    : acked
      ? "acknowledged_action_required"
      : "alert_unacked";
  const ackLabel =
    ackPhase === "acknowledged_action_required"
      ? "ACKNOWLEDGED · ACTION STILL REQUIRED"
      : ackPhase === "resolved"
        ? "RESOLVED"
        : ackPhase === "alert_unacked"
          ? "ACKNOWLEDGE REQUIRED"
          : "NO OWNER ACTION";
  const attention =
    stuck || waitingOnOwner ? "RED" : record.attentionState;
  const mustActFront =
    attention === "RED" &&
    (Boolean(record.tagiaMustAct) || stuck || waitingOnOwner);
  const frontMessage =
    attention === "YELLOW"
      ? "Watch. Work continues."
      : attention !== "RED"
        ? "No Owner action is required."
        : stuck
          ? "Scout is stuck."
          : waitingOnOwner
            ? "Owner input is needed."
            : displayed === "STOPPED"
              ? "Work stopped on purpose."
              : displayed === "IDLE"
                ? "Work went idle."
                : "Owner action is required.";
  const frontSteps = !mustActFront || attention !== "RED"
    ? []
    : stuck
      ? [
          "Check whether Scout recovered.",
          "If not, ask Scout to explain the stop.",
          "Restart or redirect the task if needed.",
        ]
      : record.whatHappensNext
        ? [record.whatHappensNext]
        : ["Complete the required Owner action."];
  const howLong = stuck
    ? "10+ minutes without meaningful activity"
    : `Since ${clock(record.changedAt)}`;
  const badge =
    attention === "GREEN"
      ? "GREEN — CONTINUE"
      : attention === "YELLOW"
        ? "YELLOW — WATCH"
        : "RED — OWNER ACTION REQUIRED";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${mustActFront && !acked ? "RED — OWNER ACTION REQUIRED" : "OWNER DESK — Project Alpha"}</title>
  <style>
    :root { color-scheme: dark; }
    html, body { margin: 0; min-height: 100%; color: #fff; font-family: "Segoe UI", Inter, Arial, Helvetica, sans-serif; }
    body { padding: 3vh 4vw 6vh; background: linear-gradient(color-mix(in srgb, #2a2420 40%, transparent), color-mix(in srgb, #2a2420 40%, transparent)), url("/studio-boys-background.jpg") center / cover no-repeat fixed, #2a2420; }
    body[data-alert="true"], body[data-attention="RED"] { background: linear-gradient(color-mix(in srgb, #7a2018 16%, transparent), color-mix(in srgb, #7a2018 16%, transparent)), linear-gradient(color-mix(in srgb, #2a2420 40%, transparent), color-mix(in srgb, #2a2420 40%, transparent)), url("/studio-boys-background.jpg") center / cover no-repeat fixed, #2a2420; }
    main { width: min(920px, 100%); margin: 0 auto; }
    .attention-badge { display: inline-block; letter-spacing: 0.12em; font-weight: 700; font-size: 0.85rem; padding: 0.35rem 0.8rem; border-radius: 999px; margin-bottom: 0.9rem; }
    .attention-badge[data-attention="GREEN"] { background: #1f6b3a; }
    .attention-badge[data-attention="YELLOW"] { background: #c9a227; color: #1a1408; }
    .attention-badge[data-attention="RED"] { background: #8b0000; }
    body[data-alert="true"] .attention-badge[data-attention="RED"] { background: #3a1010; }
    .front-card { text-align: left; margin: 0 0 1.6rem; padding: 1.1rem 1.2rem; background: color-mix(in srgb, #2a2420 28%, transparent); border: 2px solid #c8b59b; border-radius: 0.85rem; }
    .front-card[data-attention="RED"] { background: color-mix(in srgb, #7a2018 22%, transparent); }
    .front-card[data-attention="YELLOW"] { background: color-mix(in srgb, #c9a227 18%, transparent); }
    .front-message { margin: 0 0 1.2rem; font-size: clamp(1.75rem, 3.6vw, 2.2rem); font-weight: 800; line-height: 1.12; letter-spacing: -0.015em; }
    .front-action { margin: 0 0 0.4rem; font-size: 0.92rem; font-weight: 700; letter-spacing: 0.06em; color: #8ff5c6; }
    .front-steps { margin: 0 0 1.25rem; padding-left: 1.35rem; font-size: 1.06rem; line-height: 1.4; }
    .front-steps li { margin: 0.5rem 0; }
    .front-meta { margin: 0.22rem 0 0; font-size: 0.875rem; color: color-mix(in srgb, #ffffff 78%, transparent); }
    .front-meta strong { color: color-mix(in srgb, #8ff5c6 70%, #ffffff); font-weight: 600; }
    .ack-status { display: none; margin: 1rem 0 0; padding: 0.38rem 0.85rem; border-radius: 999px; border: 2px solid #c8b59b; background: color-mix(in srgb, #c8b59b 24%, transparent); color: #fff; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; }
    .ack[data-acked="true"] .ack-status { display: inline-block; }
    .records { margin: 0 0 2rem; }
    .records summary { cursor: pointer; font-weight: 700; letter-spacing: 0.06em; padding: 0.6rem 0; }
    .ack-banner { text-align: left; margin: 0 0 1.2rem; padding: 0.75rem 1rem; background: #1f2a1a; border-left: 4px solid #7CFF6B; }
    .state { letter-spacing: 0.16em; font-weight: 700; margin-bottom: 0.8rem; }
    h1 { margin: 0 0 1.2rem; font-size: clamp(2rem, 5vw, 3.2rem); }
    .pulse { width: 2.4rem; height: 2.4rem; border-radius: 50%; margin: 0 0 1rem; background: #3d3d32; }
    .pulse[data-live="true"] { background: #7CFF6B; animation: beat 0.9s ease-in-out infinite; }
    .track { display: flex; gap: 0.55rem; margin: 0 0 1.6rem; width: min(18rem, 80%); }
    .block { flex: 1; height: 1.15rem; background: #2a2a22; border-radius: 0.2rem; }
    main[data-live="true"] .block:nth-child(1) { animation: sweep 1.05s ease-in-out infinite; }
    main[data-live="true"] .block:nth-child(2) { animation: sweep 1.05s ease-in-out 0.18s infinite; }
    main[data-live="true"] .block:nth-child(3) { animation: sweep 1.05s ease-in-out 0.36s infinite; }
    @keyframes beat { 0%, 100% { transform: scale(0.82); opacity: 0.55; } 50% { transform: scale(1.12); opacity: 1; } }
    @keyframes sweep { 0%, 100% { background: #2a2a22; } 50% { background: #7CFF6B; } }
    .action-box { background: #1a1c16; border: 1px solid #3a3a2e; padding: 1rem 1.1rem; margin: 0 0 1.6rem; }
    body[data-alert="true"] .action-box { background: #3a1010; border-color: #fff8e7; }
    .action-box h2 { margin: 0 0 0.6rem; font-size: 1.05rem; letter-spacing: 0.08em; }
    .ack button { font: inherit; font-weight: 700; padding: 0.85rem 1.4rem; border: 0; border-radius: 0.4rem; background: #fff8e7; color: #8b0000; cursor: pointer; }
    .ack[data-acked="true"] button { display: none; }
    dl { text-align: left; margin: 0 0 2rem; }
    dt { font-size: 0.8rem; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.7; margin-top: 1rem; }
    dd { margin: 0.25rem 0 0; font-size: 1.15rem; }
    .history { margin-top: 2rem; }
    .history h2 { margin: 0 0 0.7rem; font-size: 1.05rem; letter-spacing: 0.08em; }
    .history-list { max-height: 18rem; overflow: auto; margin: 0; padding: 0 0 0 1.2rem; background: #1a1c16; }
    .history-list li { padding: 0.7rem 0.8rem 0.7rem 0; border-bottom: 1px solid #2a2a22; }
    .history-list time { display: block; opacity: 0.7; font-size: 0.85rem; }
    .note { margin-top: 2rem; opacity: 0.7; font-size: 0.9rem; }
    body.stalled-alert { background: transparent; }
  </style>
</head>
<body data-alert="${mustActFront && !acked ? "true" : "false"}">
  <main data-owner-console="true" data-one-page="true" data-front-door="true" data-ack-endpoint="http://127.0.0.1:4177/ack" data-work-state="${displayed}" data-declared-state="${record.workState}" data-live="${live ? "true" : "false"}" data-stalled="${stalled || record.workState === "STALLED_HUNG" ? "true" : "false"}" data-last-activity="${escapeHtml(record.lastActivityAt)}" data-attention="${attention}" data-attention-acked="${acked ? "true" : "false"}" data-attention-phase="${ackPhase}" data-alert-id="${escapeHtml(record.attentionAlertId ?? "")}" data-tagia-must-act="${mustActFront ? "true" : "false"}">
    <p class="attention-badge" data-attention="${attention}">ATTENTION: ${badge}</p>
    <section class="front-card" data-attention="${attention}" data-red-card="${attention === "RED" ? "true" : "false"}">
      <h1 class="front-message">${escapeHtml(frontMessage)}</h1>
      ${
        frontSteps.length
          ? `<h2 class="front-action">What you need to do</h2>
      <ol class="front-steps">${frontSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`
          : ""
      }
      <p class="front-meta"><strong>Current task:</strong> ${escapeHtml(record.currentTask)}</p>
      <p class="front-meta"><strong>How long:</strong> ${escapeHtml(howLong)}</p>
      ${
        mustActFront
          ? `<div class="ack" id="owner-ack-box" data-acked="${acked ? "true" : "false"}">
        <button type="button" id="owner-ack">Acknowledge</button>
        <p id="ack-done"${acked ? "" : " hidden"} class="ack-status">ACKNOWLEDGED · ACTION STILL REQUIRED</p>
      </div>`
          : ""
      }
    </section>
    ${ackPhase === "acknowledged_action_required" ? `<p class="ack-banner" id="ack-status">${ackLabel}</p>` : `<p class="ack-banner" id="ack-status" hidden>${ackLabel}</p>`}
    <details class="records">
      <summary>Records</summary>
    <p class="state" id="record-state">${escapeHtml(label)}</p>
    <div class="pulse" data-live="${live ? "true" : "false"}" aria-hidden="true"></div>
    <div class="track" aria-hidden="true"><span class="block"></span><span class="block"></span><span class="block"></span></div>
    <dl>
      <dt>Is Scout working?</dt><dd id="record-working">${working ? "Yes — ACTIVE WORK" : `No — ${escapeHtml(label)}`}</dd>
      <dt>Current work state</dt><dd>${escapeHtml(label)}</dd>
      <dt>Attention state</dt><dd>${record.attentionState === "GREEN" ? "GREEN — CONTINUE" : record.attentionState === "YELLOW" ? "YELLOW — WATCH" : "RED — OWNER ACTION REQUIRED NOW"}</dd>
      <dt>Current package</dt><dd>${escapeHtml(record.packageId)}</dd>
      <dt>Current task</dt><dd>${escapeHtml(record.currentTask)}</dd>
      <dt>What is he doing?</dt><dd>${escapeHtml(record.currentTask)}</dd>
      <dt>How long on this state?</dt><dd>Since ${escapeHtml(clock(record.changedAt))}</dd>
      <dt>Last meaningful action</dt><dd>${escapeHtml(record.lastMeaningfulAction)}</dd>
      <dt>Timestamp of last meaningful action</dt><dd>${escapeHtml(record.lastActivityAt)} · ${escapeHtml(clock(record.lastActivityAt))}</dd>
      <dt>Last completed action</dt><dd>${escapeHtml(record.lastMeaningfulAction)} · ${escapeHtml(clock(record.lastActivityAt))}</dd>
      <dt>Previous state → new state</dt><dd>${escapeHtml(previous)} → ${escapeHtml(label)}</dd>
      <dt>Why this state</dt><dd>${escapeHtml(record.reason)}</dd>
      <dt>What happens next</dt><dd>${escapeHtml(record.whatHappensNext)}</dd>
      <dt>Waiting on Tagia?</dt><dd>${yesNo(waitingOnOwner)}${record.tagiaMustAct ? " — Tagia must act" : ""}</dd>
      <dt>Waiting on a system?</dt><dd>${waitingOnSystem ? escapeHtml(record.waitingOn || "a system") : "No"}</dd>
      <dt>Is he stuck?</dt><dd>${yesNo(stuck)}</dd>
      <dt>Did work stop?</dt><dd>${yesNo(stopped)}</dd>
      <dt>Safe authorized work remains?</dt><dd>${yesNo(record.safeAuthorizedWorkRemains)}</dd>
      ${record.blocker ? `<dt>Blocker</dt><dd>${escapeHtml(record.blocker)}</dd>` : ""}
      ${stalled ? `<dt>No progress since</dt><dd>${escapeHtml(clock(stalledAt))} — 10 minutes without a pulse. This is STALLED / HUNG, not ACTIVE.</dd>` : ""}
    </dl>
    <section class="history" id="owner-history">
      <h2>Activity / history</h2>
      ${historyHtml(historyRows)}
    </section>
    <p class="note">One Owner page. Not the customer site. Not the Room 3 Owner Console. Work state and attention state are independent. Motion runs only while ACTIVE WORK and last activity is under 10 minutes old. YELLOW is a badge, not a replacement screen. Acknowledge silences sound; it does not remove the required action. This page never opens another tab.</p>
    </details>
  </main>
  <script>
(function () {
  window.name = "project-alpha-owner-desk";
  var main = document.querySelector("main");
  if (!main) return;
  var staleMs = ${STALE_MS};
  var audioTimer = null;
  var audioCtx = null;
  var alertStarted = false;
  function ackKey() {
    return "project-alpha-attention-ack:" + [
      main.getAttribute("data-declared-state") || "",
      main.getAttribute("data-last-activity") || "",
      main.getAttribute("data-alert-id") || ""
    ].join(":");
  }
  function isAcked() {
    if (main.getAttribute("data-attention-acked") === "true") return true;
    try { return Boolean(window.localStorage.getItem(ackKey())); } catch (e) { return false; }
  }
  function stopAlert() {
    if (audioTimer) { clearInterval(audioTimer); audioTimer = null; }
    alertStarted = false;
    try { if (audioCtx) { audioCtx.close(); audioCtx = null; } } catch (e) {}
    document.body.setAttribute("data-alert", "false");
  }
  function beepOnce() {
    if (isAcked()) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.18;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      setTimeout(function () {
        try { osc.stop(); audioCtx.close(); } catch (e) {}
        audioCtx = null;
      }, 420);
    } catch (e) {}
  }
  function startAlert() {
    if (isAcked() || alertStarted) return;
    if (main.getAttribute("data-attention") !== "RED") return;
    if (main.getAttribute("data-tagia-must-act") !== "true") return;
    alertStarted = true;
    document.body.setAttribute("data-alert", "true");
    beepOnce();
  }
  function persistAck() {
    var endpoint = main.getAttribute("data-ack-endpoint") || "http://127.0.0.1:4177/ack";
    try {
      fetch(endpoint, { method: "POST", mode: "cors", cache: "no-store" }).catch(function () {
        try { fetch(endpoint, { method: "GET", mode: "cors", cache: "no-store" }); } catch (e) {}
      });
    } catch (e) {}
  }
  function showAckedUi() {
    stopAlert();
    main.setAttribute("data-attention-acked", "true");
    main.setAttribute("data-attention-phase", "acknowledged_action_required");
    var box = document.getElementById("owner-ack-box");
    var done = document.getElementById("ack-done");
    var status = document.getElementById("ack-status");
    if (box) box.setAttribute("data-acked", "true");
    if (done) done.hidden = false;
    if (status) {
      status.hidden = false;
      status.textContent = "ACKNOWLEDGED · ACTION STILL REQUIRED";
    }
  }
  function markAcked() {
    try {
      window.localStorage.setItem(ackKey(), new Date().toISOString());
      window.localStorage.setItem("project-alpha-owner-desk-silenced", new Date().toISOString());
    } catch (e) {}
    showAckedUi();
    persistAck();
  }
  function bindAck(button) {
    if (!button || button.getAttribute("data-bound") === "true") return;
    button.setAttribute("data-bound", "true");
    button.addEventListener("click", function (event) {
      if (event && event.preventDefault) event.preventDefault();
      markAcked();
    });
  }
  function ensureRedActionBlock() {
    var card = main.querySelector(".front-card");
    if (!card) return;
    var message = card.querySelector(".front-message");
    if (message) message.textContent = "Scout is stuck.";
    if (!card.querySelector(".front-steps")) {
      var heading = document.createElement("h2");
      heading.className = "front-action";
      heading.textContent = "What you need to do";
      var list = document.createElement("ol");
      list.className = "front-steps";
      ["Check whether Scout recovered.", "If not, ask Scout to explain the stop.", "Restart or redirect the task if needed."].forEach(function (text) {
        var item = document.createElement("li");
        item.textContent = text;
        list.appendChild(item);
      });
      var firstMeta = card.querySelector(".front-meta");
      if (firstMeta) {
        card.insertBefore(heading, firstMeta);
        card.insertBefore(list, firstMeta);
      } else {
        card.appendChild(heading);
        card.appendChild(list);
      }
    }
    card.querySelectorAll(".front-meta").forEach(function (line) {
      if ((line.textContent || "").indexOf("How long") !== -1) {
        line.innerHTML = "<strong>How long:</strong> 10+ minutes without meaningful activity";
      }
    });
    var acked = isAcked();
    var box = document.getElementById("owner-ack-box");
    if (!box) {
      box = document.createElement("div");
      box.className = "ack";
      box.id = "owner-ack-box";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.id = "owner-ack";
      btn.textContent = "Acknowledge";
      var done = document.createElement("p");
      done.id = "ack-done";
      done.className = "ack-status";
      done.textContent = "ACKNOWLEDGED · ACTION STILL REQUIRED";
      if (!acked) done.hidden = true;
      box.appendChild(btn);
      box.appendChild(done);
      card.appendChild(box);
    }
    box.setAttribute("data-acked", acked ? "true" : "false");
    bindAck(document.getElementById("owner-ack"));
  }
  bindAck(document.getElementById("owner-ack"));
  if (isAcked()) {
    showAckedUi();
  } else {
    startAlert();
  }
  function raiseStall() {
    main.setAttribute("data-work-state", "STALLED_HUNG");
    main.setAttribute("data-stalled", "true");
    main.setAttribute("data-attention", "RED");
    main.setAttribute("data-tagia-must-act", "true");
    document.body.classList.add("stalled-alert");
    document.title = "RED — OWNER ACTION REQUIRED";
    var state = main.querySelector(".state");
    var card = main.querySelector(".front-card");
    var badgeEl = main.querySelector(".attention-badge");
    if (state) state.textContent = "STALLED / HUNG";
    if (card) {
      card.setAttribute("data-attention", "RED");
      card.setAttribute("data-red-card", "true");
    }
    if (badgeEl) {
      badgeEl.setAttribute("data-attention", "RED");
      badgeEl.textContent = "ATTENTION: RED — OWNER ACTION REQUIRED";
    }
    ensureRedActionBlock();
    if (!isAcked()) {
      startAlert();
    }
  }
  function apply() {
    var declared = main.getAttribute("data-declared-state") || "";
    var last = Date.parse(main.getAttribute("data-last-activity") || "");
    var fresh = Number.isFinite(last) && (Date.now() - last) < staleMs;
    var live = declared === "ACTIVE_WORK" && fresh;
    main.setAttribute("data-live", live ? "true" : "false");
    var pulse = main.querySelector(".pulse");
    if (pulse) pulse.setAttribute("data-live", live ? "true" : "false");
    if ((declared === "ACTIVE_WORK" && !fresh) || declared === "STALLED_HUNG") {
      raiseStall();
    }
  }
  function labelForState(state) {
    return state === "ACTIVE_WORK" ? "ACTIVE WORK"
      : state === "WAITING_ON_OWNER" ? "WAITING ON OWNER"
      : state === "WAITING_ON_SYSTEM" ? "WAITING ON SYSTEM"
      : state === "STALLED_HUNG" ? "STALLED / HUNG"
      : state === "STOPPED" ? "STOPPED"
      : "IDLE";
  }
  function applyLive(status) {
    if (!status) return;
    var last = status.lastActivityAt || main.getAttribute("data-last-activity") || "";
    var lastMs = Date.parse(last);
    var fresh = Number.isFinite(lastMs) && (Date.now() - lastMs) < staleMs;
    var declared = status.workState || "";
    if (declared === "ACTIVE_WORK" && !fresh) declared = "STALLED_HUNG";
    main.setAttribute("data-declared-state", declared);
    main.setAttribute("data-work-state", declared);
    if (last) main.setAttribute("data-last-activity", last);
    var working = declared === "ACTIVE_WORK";
    var label = labelForState(declared);
    var stateEl = document.getElementById("record-state") || main.querySelector(".state");
    var workingEl = document.getElementById("record-working");
    if (stateEl) stateEl.textContent = label;
    if (workingEl) workingEl.textContent = working ? "Yes — ACTIVE WORK" : "No — " + label;
  }
  function pull() {
    fetch("http://127.0.0.1:4177/status", { cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (status) {
        applyLive(status);
        apply();
      })
      .catch(function () { apply(); });
  }
  pull();
  setInterval(pull, 1000);
})();
  </script>
</body>
</html>
`;
}

function renderAttentionRedirectHtml(record) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0; url=PROJECT-ALPHA-OWNER-CONSOLE.html" />
  <title>One Owner page — Project Alpha</title>
</head>
<body style="margin:0;min-height:100%;background:#11130f;color:#fff8e7;font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;">
  <main data-attention-state="${record.attentionState}" data-one-page-redirect="PROJECT-ALPHA-OWNER-CONSOLE.html" data-return-to-heartbeat="PROJECT-ALPHA-WORK-HEARTBEAT.html">
    <p>One Owner page. This is not a second alert window.</p>
    <p><a href="PROJECT-ALPHA-OWNER-CONSOLE.html">Open the Owner desk</a></p>
    <p>Compatibility alias: PROJECT-ALPHA-WORK-HEARTBEAT.html</p>
  </main>
  <script>window.location.replace("PROJECT-ALPHA-OWNER-CONSOLE.html");</script>
</body>
</html>
`;
}

function readAttention() {
  if (!existsSync(ATTENTION_JSON)) return {};
  try {
    return JSON.parse(readFileSync(ATTENTION_JSON, "utf8"));
  } catch {
    return {};
  }
}

function writeAttentionState(record, kind = "none", quiet = false) {
  const needsOwner = record.attentionState === "RED" && Boolean(record.tagiaMustAct);
  const unackedOwner = needsOwner && !record.attentionAcknowledgedAt;
  const previousAttention = readAttention();
  const sameAlert = previousAttention.alertId === record.attentionAlertId;
  const attention = {
    state: record.attentionState,
    kind: needsOwner
      ? "OWNER_ACTION_REQUIRED_NOW"
      : record.attentionState === "GREEN"
        ? "CONTINUE"
        : "WATCH",
    label: needsOwner
      ? "OWNER ACTION REQUIRED NOW"
      : record.attentionState === "GREEN"
        ? "CONTINUE"
        : "WATCH",
    updatedAt: record.lastActivityAt,
    packageId: record.packageId,
    alertId: record.attentionAlertId,
    reason: record.reason,
    responder: needsOwner ? "OWNER_TAGIA" : null,
    exactOwnerAction: needsOwner
      ? record.whatHappensNext
      : `Glance the one Owner page. Scout is ${labelFor(record.workState)}.`,
    expectedResult: record.whatHappensNext,
    doNotDo: "Do not remint Maya. Do not start Step 4. Do not merge or push.",
    reportBack: needsOwner
      ? "Do the exact Owner action, then tell Scout."
      : "Nothing unless the page says Tagia must act.",
    customerImpact: "Work-state telemetry only. Customer site unchanged.",
    launchImpact: record.whatHappensNext,
    blockedFrom: record.blocker ?? "None named.",
    nextRecommendedAction: record.whatHappensNext,
    tagiaMustInterveneNow: Boolean(needsOwner),
    acknowledgedAt: record.attentionAcknowledgedAt ?? (needsOwner ? null : new Date().toISOString()),
    audiblePlayedAt: sameAlert ? previousAttention.audiblePlayedAt ?? null : null,
    deferredReason: null,
  };
  writeFileSync(ATTENTION_JSON, `${JSON.stringify(attention, null, 2)}\n`, "utf8");
  writeFileSync(ATTENTION_HTML, renderAttentionRedirectHtml(record), "utf8");
  if (
    !quiet &&
    unackedOwner &&
    !isScoutListeningHandoff(record) &&
    ((kind === "stalled_audible" && shouldPlayWatchdogAudible(record)) ||
      (kind === "owner_red_audible" && !record.alarmMuted)) &&
    existsSync(ALERT_SCRIPT)
  ) {
    execFileSync(process.execPath, [ALERT_SCRIPT], {
      stdio: "inherit",
      windowsHide: true,
    });
  }
}

function ensureDeskServer() {
  try {
    const result = ensureOwnerDesk();
    if (result.action !== "kept") {
      process.stderr.write(`owner desk keeper: ${result.action} ${result.reason}\n`);
    }
  } catch (error) {
    process.stderr.write(
      `owner desk keeper failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
}

function ensureWatchdog() {
  try {
    if (existsSync(WATCHDOG_PID)) {
      const raw = Number.parseInt(readFileSync(WATCHDOG_PID, "utf8").trim(), 10);
      if (Number.isFinite(raw)) {
        try {
          process.kill(raw, 0);
          return;
        } catch {
          /* dead pid */
        }
      }
    }
    const child = spawn(process.execPath, [WATCHDOG_SCRIPT], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    if (child.pid) writeFileSync(WATCHDOG_PID, `${child.pid}\n`, "utf8");
  } catch {
    /* watchdog is best-effort */
  }
}

function playShortStateBeep() {
  try {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "[console]::Beep(740,180); [console]::Beep(880,220); [System.Media.SystemSounds]::Exclamation.Play();",
      ],
      { stdio: "ignore", windowsHide: true },
    );
  } catch {
    /* ignore if the host cannot beep */
  }
}

function openOneOwnerPage() {
  execFileSync("cmd.exe", ["/c", "start", "", DESK_URL], {
    stdio: "ignore",
    windowsHide: true,
  });
}

const flags = parseArgs(process.argv.slice(2));
const previous = readExisting();
if (flags.stalled && isScoutListeningHandoff(previous)) {
  process.stdout.write("STALL refused: Scout is listening / intentional STOP.\n");
  process.exit(0);
}
const now = new Date().toISOString();
const nextState = workStateOf(flags, previous);
const previousState = previous.workState ?? null;
const safeWork = flags.noAuthorizedWork
  ? false
  : previous.safeAuthorizedWorkRemains !== false;

if (nextState === "IDLE" && safeWork && !flags.noAuthorizedWork) {
  process.stderr.write(
    "IDLE refused: safe authorized work remains. Continue the next slice. Use --no-authorized-work only when none remains.\n",
  );
  process.exit(2);
}

const pulseTask = flags.task ?? previous.currentTask ?? "";
const telemetryTask = /heartbeat|watchdog|work-state|alert|status page|status-page|documentation/i.test(
  pulseTask,
);
if (nextState === "ACTIVE_WORK" && telemetryTask && !flags.ack && !flags.resolve) {
  process.stderr.write(
    "ACTIVE refused: heartbeat, watchdog, alerts, status pages, and documentation are not package progress. Pulse the authorized package slice or leave ACTIVE.\n",
  );
  process.exit(2);
}

const stateChanged = previousState !== nextState;
const attentionState = resolveAttention(nextState, previous, flags);
const sameAlert =
  previous.attentionAlertId ===
  `work-state-${nextState}-${stateChanged ? now : previous.changedAt ?? now}`;
const attentionAlertId = `work-state-${nextState}-${stateChanged ? now : previous.changedAt ?? now}`;
const keepAck =
  flags.ack ||
  flags.resolve ||
  (!stateChanged && Boolean(previous.attentionAcknowledgedAt)) ||
  (sameAlert && Boolean(previous.attentionAcknowledgedAt));
const record = {
  workState: flags.resolve && nextState === "WAITING_ON_OWNER" ? "ACTIVE_WORK" : nextState,
  previousState,
  changedAt: stateChanged || flags.resolve ? now : previous.changedAt ?? now,
  reason:
    flags.reason ??
    (flags.resolve
      ? "Owner completed the required action. Returning to live work."
      : flags.ack
        ? previous.reason ?? "Owner acknowledged the required action."
        : stateChanged
          ? `${labelFor(previousState ?? "IDLE")} → ${labelFor(nextState)}`
          : previous.reason ?? "ACTIVE progress pulse"),
  packageId: flags.packageId ?? previous.packageId ?? PACKAGE_ID,
  currentTask: flags.task ?? previous.currentTask ?? "Unspecified task",
  lastMeaningfulAction:
    flags.action ??
    (flags.resolve
      ? "Owner completed the required action"
      : flags.ack
        ? "Owner acknowledged the required action"
        : previous.lastMeaningfulAction ?? "Heartbeat written"),
  lastActivityAt: now,
  whatHappensNext:
    flags.next ??
    previous.whatHappensNext ??
    "Continue the next safe authorized slice.",
  tagiaMustAct: flags.resolve
    ? false
    : nextState === "WAITING_ON_OWNER" || nextState === "STALLED_HUNG",
  waitingOn:
    flags.waitingOn ??
    (nextState === "WAITING_ON_SYSTEM" ? previous.waitingOn ?? "system" : null),
  expectedNextCheckAt:
    nextState === "WAITING_ON_SYSTEM"
      ? new Date(Date.parse(now) + STALE_MS).toISOString()
      : null,
  blocker: flags.blocker ?? (nextState === "STALLED_HUNG" ? previous.blocker ?? "No fresh pulse for 10 minutes" : null),
  safeAuthorizedWorkRemains: safeWork,
  stalledAt: nextState === "STALLED_HUNG" || nextState === "IDLE" || nextState === "STOPPED" ? now : null,
  noProgressSince: nextState === "STALLED_HUNG" ? previous.lastActivityAt ?? now : null,
  attentionState,
  attentionAcknowledgedAt: flags.resolve
    ? now
    : flags.ack
      ? now
      : keepAck
        ? previous.attentionAcknowledgedAt
        : nextState === "WAITING_ON_OWNER" ||
            nextState === "STALLED_HUNG" ||
            nextState === "STOPPED" ||
            nextState === "IDLE"
          ? null
          : previous.attentionAcknowledgedAt ?? now,
  attentionAlertId,
  scoutListening: Boolean(flags.listening),
  expectedToContinue:
    flags.listening || flags.stopped || flags.idle
      ? false
      : nextState === "ACTIVE_WORK" ||
        nextState === "WAITING_ON_SYSTEM" ||
        nextState === "STALLED_HUNG",
  intentionalStop: Boolean(flags.listening || flags.stopped),
  watchdogMonitoring: previous.watchdogMonitoring !== false,
  alarmMuted: Boolean(previous.alarmMuted),
};

if (flags.resolve) {
  record.workState = "ACTIVE_WORK";
  record.tagiaMustAct = false;
  record.attentionState = flags.attention ?? "GREEN";
  record.stalledAt = null;
  record.noProgressSince = null;
  record.blocker = null;
}

writeFileSync(JSON_PATH, `${JSON.stringify(record, null, 2)}\n`, "utf8");

const kind = notifyKind(previousState, record.workState, flags);
const attentionChanged = previous.attentionState !== record.attentionState;
const mustNotify =
  !flags.ack &&
  !flags.resolve &&
  (stateChanged || attentionChanged || kind === "slice_complete" || kind === "visible_resume");
if (stateChanged || kind === "slice_complete" || flags.ack || flags.resolve) {
  appendFileSync(
    LOG_PATH,
    `${JSON.stringify({
      at: now,
      previousState,
      nextState: record.workState,
      notifyKind: flags.ack ? "ack" : flags.resolve ? "resolve" : kind,
      packageId: record.packageId,
      currentTask: record.currentTask,
      reason: record.reason,
      lastMeaningfulAction: record.lastMeaningfulAction,
      whatHappensNext: record.whatHappensNext,
      tagiaMustAct: record.tagiaMustAct,
      attentionState: record.attentionState,
    })}\n`,
    "utf8",
  );
}

const html = renderHtml(record, readHistory());
writeFileSync(HTML_PATH, html, "utf8");
writeFileSync(ATTENTION_HTML, renderAttentionRedirectHtml(record), "utf8");

try {
  writeOutboundSnapshot({
    nextDecisionRequired: record.whatHappensNext ?? null,
    defectsBlockers: record.blocker ?? null,
  });
} catch (error) {
  process.stderr.write(`ops-bridge snapshot write failed: ${error instanceof Error ? error.message : String(error)}\n`);
}

writeAttentionState(record, mustNotify ? kind : "none", flags.quiet);
if (mustNotify && kind === "slice_complete" && !flags.quiet) {
  playShortStateBeep();
}

ensureWatchdog();
ensureDeskServer();

const openTheOneDesk =
  flags.open ||
  (!flags.quiet &&
    mustNotify &&
    (kind === "owner_red_audible" || kind === "stalled_audible"));
if (openTheOneDesk) {
  openOneOwnerPage();
}

process.stdout.write(
  `${record.workState} ${record.currentTask} @ ${record.lastActivityAt} notify=${kind} page=OWNER-CONSOLE open=${openTheOneDesk ? "one" : "none"}\n`,
);
