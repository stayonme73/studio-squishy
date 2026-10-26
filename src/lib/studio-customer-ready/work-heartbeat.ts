import { studioWorkStateNotificationV1 as protocol } from "@/config/studio-work-state-notification-v1";
import type { StudioNotifiedWorkState } from "@/config/studio-work-state-notification-v1";
import {
  ownerConsoleAckLabel,
  ownerConsoleAckPhase,
  ownerFrontDoorHowLong,
  ownerFrontDoorMessage,
  ownerFrontDoorShowsAcknowledge,
  ownerFrontDoorSteps,
} from "@/lib/studio-customer-ready/owner-console";
import {
  attentionBadgeLabel,
  workStateLabel,
} from "@/lib/studio-customer-ready/work-state-notification";

export type StudioWorkState = StudioNotifiedWorkState;

export type WorkHeartbeatRecord = {
  workState: StudioWorkState;
  previousState: StudioWorkState | null;
  changedAt: string;
  reason: string;
  packageId: string;
  currentTask: string;
  lastMeaningfulAction: string;
  lastActivityAt: string;
  whatHappensNext: string;
  tagiaMustAct: boolean;
  waitingOn: string | null;
  expectedNextCheckAt: string | null;
  blocker: string | null;
  safeAuthorizedWorkRemains: boolean;
  stalledAt: string | null;
  noProgressSince: string | null;
  attentionState: "GREEN" | "YELLOW" | "RED";
  attentionAcknowledgedAt?: string | null;
  scoutListening?: boolean;
  intentionalStop?: boolean;
  expectedToContinue?: boolean;
  watchdogMonitoring?: boolean;
};

export const WORK_HEARTBEAT_STALE_MS = protocol.staleAfterMs;

export function isWorkHeartbeatFresh(
  record: Pick<WorkHeartbeatRecord, "lastActivityAt">,
  nowMs = Date.now(),
): boolean {
  const at = Date.parse(record.lastActivityAt);
  if (!Number.isFinite(at)) return false;
  return nowMs - at < WORK_HEARTBEAT_STALE_MS;
}

export function shouldAnimateWorkHeartbeat(
  record: WorkHeartbeatRecord,
  nowMs = Date.now(),
): boolean {
  return record.workState === "ACTIVE_WORK" && isWorkHeartbeatFresh(record, nowMs);
}

export function resolveDisplayedWorkState(
  record: WorkHeartbeatRecord,
  nowMs = Date.now(),
): {
  workState: StudioWorkState;
  stalled: boolean;
  stalledAt: string | null;
  label: string;
} {
  const listeningHandoff = Boolean(
    record.scoutListening ||
      record.intentionalStop ||
      record.expectedToContinue === false,
  );
  if (listeningHandoff) {
    const shown = record.workState === "STALLED_HUNG" ? "ACTIVE_WORK" : record.workState;
    return {
      workState: shown,
      stalled: false,
      stalledAt: null,
      label: workStateLabel(shown),
    };
  }
  if (record.watchdogMonitoring === false && record.workState === "ACTIVE_WORK") {
    return {
      workState: record.workState,
      stalled: false,
      stalledAt: record.stalledAt,
      label: workStateLabel(record.workState),
    };
  }
  if (record.workState === "ACTIVE_WORK" && !isWorkHeartbeatFresh(record, nowMs)) {
    const at = Date.parse(record.lastActivityAt);
    const stalledAt = Number.isFinite(at)
      ? new Date(at + WORK_HEARTBEAT_STALE_MS).toISOString()
      : new Date(nowMs).toISOString();
    return {
      workState: "STALLED_HUNG",
      stalled: true,
      stalledAt,
      label: "STALLED / HUNG",
    };
  }

  return {
    workState: record.workState,
    stalled: record.workState === "STALLED_HUNG",
    stalledAt: record.stalledAt,
    label: workStateLabel(record.workState),
  };
}

export function formatWorkHeartbeatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

export function renderWorkHeartbeatHtml(
  record: WorkHeartbeatRecord,
  nowMs = Date.now(),
  options?: { clientStall?: boolean },
): string {
  const displayed = resolveDisplayedWorkState(record, nowMs);
  const animate = shouldAnimateWorkHeartbeat(record, nowMs);
  const lastActivity = formatWorkHeartbeatClock(record.lastActivityAt);
  const changedAt = formatWorkHeartbeatClock(record.changedAt);
  const stalledClock = displayed.stalledAt
    ? formatWorkHeartbeatClock(displayed.stalledAt)
    : "";
  const previous = record.previousState
    ? workStateLabel(record.previousState)
    : "none";
  const waitingOnOwner = displayed.workState === "WAITING_ON_OWNER";
  const waitingOnSystem = displayed.workState === "WAITING_ON_SYSTEM";
  const stuck = displayed.workState === "STALLED_HUNG";
  const stopped =
    displayed.workState === "STOPPED" || displayed.workState === "IDLE";
  const working = displayed.workState === "ACTIVE_WORK" && animate;
  const attention =
    stuck || waitingOnOwner ? "RED" : record.attentionState;
  const mustAct =
    attention === "RED" &&
    (record.tagiaMustAct || stuck || waitingOnOwner);
  const message = ownerFrontDoorMessage({
    attentionState: attention,
    workState: displayed.workState,
  });
  const steps = ownerFrontDoorSteps({
    attentionState: attention,
    workState: displayed.workState,
    tagiaMustAct: mustAct,
    whatHappensNext: record.whatHappensNext,
  });
  const howLong = ownerFrontDoorHowLong({
    workState: displayed.workState,
    changedAt: record.changedAt,
    nowMs,
  });
  const showAck = ownerFrontDoorShowsAcknowledge({
    attentionState: attention,
    tagiaMustAct: mustAct,
  });
  const ackPhase = ownerConsoleAckPhase({
    attentionState: attention,
    tagiaMustAct: mustAct,
    acknowledged: Boolean(record.attentionAcknowledgedAt),
  });
  const ackLabel = ownerConsoleAckLabel(ackPhase);
  const badge =
    attention === "GREEN"
      ? "GREEN — CONTINUE"
      : attention === "YELLOW"
        ? "YELLOW — WATCH"
        : "RED — OWNER ACTION REQUIRED";
  const clientStall = options?.clientStall !== false;
  const unackedRed = mustAct && !record.attentionAcknowledgedAt;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${attention === "RED" && mustAct ? "RED — OWNER ACTION REQUIRED" : "OWNER DESK — Project Alpha"}</title>
  <style>
    :root {
      color-scheme: dark;
      --desk-text: #ffffff;
      --desk-muted: color-mix(in srgb, #ffffff 78%, transparent);
      --desk-label: #8ff5c6;
      --desk-trim: #c8b59b;
      --desk-veil: color-mix(in srgb, #2a2420 40%, transparent);
      --desk-glass: color-mix(in srgb, #2a2420 28%, transparent);
      --desk-red-wash: color-mix(in srgb, #7a2018 16%, transparent);
      --desk-red-glass: color-mix(in srgb, #7a2018 22%, transparent);
    }
    html, body {
      margin: 0;
      min-height: 100%;
      color: var(--desk-text);
      font-family: "Segoe UI", Inter, Arial, Helvetica, sans-serif;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4vh 5vw;
      background:
        linear-gradient(var(--desk-veil), var(--desk-veil)),
        url("/studio-boys-background.jpg") center / cover no-repeat fixed,
        #2a2420;
    }
    body[data-attention="RED"] {
      background:
        linear-gradient(var(--desk-red-wash), var(--desk-red-wash)),
        linear-gradient(var(--desk-veil), var(--desk-veil)),
        url("/studio-boys-background.jpg") center / cover no-repeat fixed,
        #2a2420;
    }
    main { width: min(760px, 100%); text-align: center; position: relative; }
    .attention-badge {
      display: inline-block;
      letter-spacing: 0.12em;
      font-weight: 700;
      font-size: 0.875rem;
      padding: 0.35rem 0.8rem;
      border-radius: 999px;
      margin-bottom: 0.9rem;
      border: 2px solid var(--desk-trim);
      background: var(--desk-glass);
    }
    .attention-badge[data-attention="GREEN"] { background: color-mix(in srgb, #1f6b3a 35%, transparent); }
    .attention-badge[data-attention="YELLOW"] { background: color-mix(in srgb, #c9a227 32%, transparent); }
    .attention-badge[data-attention="RED"] { background: var(--desk-red-glass); }
    .front-card {
      text-align: left;
      margin: 0 auto 1.6rem;
      max-width: 40rem;
      padding: 1.1rem 1.2rem;
      background: var(--desk-glass);
      border: 2px solid var(--desk-trim);
      border-radius: 0.85rem;
    }
    .front-card[data-attention="RED"] { background: color-mix(in srgb, #3a201c 48%, transparent); text-shadow: 0 1px 3px rgba(32, 38, 45, 0.82); }
    .front-card[data-attention="YELLOW"] { background: color-mix(in srgb, #c9a227 18%, transparent); }
    .front-message {
      margin: 0 0 1.2rem;
      font-size: clamp(1.75rem, 3.6vw, 2.2rem);
      font-weight: 800;
      line-height: 1.12;
      letter-spacing: -0.015em;
    }
    h2 { margin: 0 0 0.5rem; font-size: 1.125rem; color: var(--desk-label); font-weight: 600; }
    .front-action {
      margin: 0 0 0.4rem;
      font-size: 0.92rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--desk-label);
    }
    .front-steps {
      margin: 0 0 1.25rem;
      padding-left: 1.35rem;
      font-size: 1.06rem;
      line-height: 1.4;
    }
    .front-steps li { margin: 0.5rem 0; }
    .front-meta {
      margin: 0.22rem 0 0;
      font-size: 0.875rem;
      color: var(--desk-muted);
      font-weight: 400;
    }
    .front-meta strong {
      color: color-mix(in srgb, var(--desk-label) 70%, #ffffff);
      font-weight: 600;
    }
    .ack-status {
      display: none;
      margin: 1rem 0 0;
      padding: 0.38rem 0.85rem;
      border-radius: 999px;
      border: 2px solid var(--desk-trim);
      background: color-mix(in srgb, #c8b59b 24%, transparent);
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.1em;
    }
    .ack[data-acked="true"] .ack-status { display: inline-block; }
    .records { text-align: left; margin: 0 auto; max-width: 40rem; }
    .records summary { cursor: pointer; font-weight: 700; letter-spacing: 0.06em; padding: 0.6rem 0; color: var(--desk-label); }
    .state { letter-spacing: 0.16em; font-weight: 700; margin-bottom: 1.2rem; }
    h1 { margin: 0 0 1.5rem; font-size: 1.25rem; }
    .pulse {
      width: 2.4rem;
      height: 2.4rem;
      border-radius: 50%;
      margin: 0 auto 1.2rem;
      background: color-mix(in srgb, #3d3d32 50%, transparent);
    }
    .pulse[data-live="true"] {
      background: #7CFF6B;
      animation: beat 0.9s ease-in-out infinite;
    }
    .track {
      display: flex;
      gap: 0.55rem;
      justify-content: center;
      margin: 0 auto 2rem;
      width: min(18rem, 80%);
    }
    .block {
      flex: 1;
      height: 1.15rem;
      background: color-mix(in srgb, #2a2a22 50%, transparent);
      border-radius: 0.2rem;
    }
    main[data-live="true"] .block:nth-child(1) { animation: sweep 1.05s ease-in-out infinite; }
    main[data-live="true"] .block:nth-child(2) { animation: sweep 1.05s ease-in-out 0.18s infinite; }
    main[data-live="true"] .block:nth-child(3) { animation: sweep 1.05s ease-in-out 0.36s infinite; }
    @keyframes beat {
      0%, 100% { transform: scale(0.82); opacity: 0.55; }
      50% { transform: scale(1.12); opacity: 1; }
    }
    @keyframes sweep {
      0%, 100% { background: color-mix(in srgb, #2a2a22 50%, transparent); transform: translateY(0); }
      50% { background: #7CFF6B; transform: translateY(-3px); }
    }
    dl { text-align: left; margin: 0 auto; max-width: 40rem; }
    dt { font-size: 0.875rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--desk-label); margin-top: 1rem; }
    dd { margin: 0.25rem 0 0; font-size: 1rem; }
    .note { margin-top: 2.5rem; color: var(--desk-muted); font-size: 0.875rem; }
    .ack { margin-top: 1.1rem; }
    .ack button {
      font: inherit;
      font-weight: 700;
      padding: 0.75rem 1.2rem;
      border: 2px solid var(--desk-trim);
      border-radius: 0.4rem;
      background: color-mix(in srgb, #fff8e7 88%, transparent);
      color: #20262d;
      cursor: pointer;
    }
    .ack[data-acked="true"] button { display: none; }
  </style>
</head>
<body data-attention="${attention}"${unackedRed ? ` data-alert="true"` : ` data-alert="false"`}>
  <main
    data-work-state="${displayed.workState}"
    data-declared-state="${record.workState}"
    data-live="${animate ? "true" : "false"}"
    data-stalled="${displayed.stalled ? "true" : "false"}"
    data-last-activity="${escapeHtml(record.lastActivityAt)}"
    data-attention="${attention}"
    data-attention-acked="${record.attentionAcknowledgedAt ? "true" : "false"}"
    data-attention-phase="${ackPhase}"
    data-tagia-must-act="${mustAct ? "true" : "false"}"
    data-client-stall="${clientStall ? "true" : "false"}"
    data-ack-endpoint="http://127.0.0.1:4177/ack"
    data-front-door="true"
    data-owner-console="true"
    data-one-page="true"
  >
    <p class="attention-badge" data-attention="${attention}">ATTENTION: ${escapeHtml(badge)}</p>
    <section class="front-card" data-attention="${attention}" data-red-card="${attention === "RED" ? "true" : "false"}">
      <h1 class="front-message">${escapeHtml(message)}</h1>
      ${
        steps.length
          ? `<h2 class="front-action">What you need to do</h2>
      <ol class="front-steps">${steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`
          : ""
      }
      <p class="front-meta"><strong>Current task:</strong> ${escapeHtml(record.currentTask)}</p>
      <p class="front-meta"><strong>How long:</strong> ${escapeHtml(howLong)}</p>
      ${
        showAck
          ? `<div class="ack" id="owner-ack-box" data-acked="${record.attentionAcknowledgedAt ? "true" : "false"}">
        <button type="button" id="owner-ack">Acknowledge</button>
        <p id="ack-done"${record.attentionAcknowledgedAt ? "" : " hidden"} class="ack-status">${escapeHtml(ackLabel === "ACKNOWLEDGED · ACTION STILL REQUIRED" ? ackLabel : "ACKNOWLEDGED · ACTION STILL REQUIRED")}</p>
      </div>`
          : ""
      }
    </section>
    <details class="records">
      <summary>Records</summary>
    <p class="state">${escapeHtml(displayed.label)}</p>
    <div class="pulse" data-live="${animate ? "true" : "false"}" aria-hidden="true"></div>
    <div class="track" aria-hidden="true">
      <span class="block"></span>
      <span class="block"></span>
      <span class="block"></span>
    </div>
    <dl>
      <dt>Is Scout working?</dt>
      <dd>${working ? "Yes — ACTIVE WORK" : `No — ${escapeHtml(displayed.label)}`}</dd>
      <dt>Attention state</dt>
      <dd>${escapeHtml(attentionBadgeLabel(record.attentionState))}</dd>
      <dt>Current work state</dt>
      <dd>${escapeHtml(displayed.label)}</dd>
      <dt>Current package</dt>
      <dd>${escapeHtml(record.packageId)}</dd>
      <dt>Current task</dt>
      <dd>${escapeHtml(record.currentTask)}</dd>
      <dt>What is he doing?</dt>
      <dd>${escapeHtml(record.currentTask)}</dd>
      <dt>How long on this state?</dt>
      <dd>Since ${escapeHtml(changedAt)}</dd>
      <dt>Last meaningful action</dt>
      <dd>${escapeHtml(record.lastMeaningfulAction)}</dd>
      <dt>Timestamp of last meaningful action</dt>
      <dd>${escapeHtml(record.lastActivityAt)} · ${escapeHtml(lastActivity)}</dd>
      <dt>Last completed action</dt>
      <dd>${escapeHtml(record.lastMeaningfulAction)} · ${escapeHtml(lastActivity)}</dd>
      <dt>Why attention is required</dt>
      <dd>${
        record.attentionState === "RED" && record.tagiaMustAct
          ? escapeHtml(record.reason)
          : "No Owner attention required."
      }</dd>
      <dt>Exact Owner action required</dt>
      <dd>${
        record.attentionState === "RED" && record.tagiaMustAct
          ? escapeHtml(record.whatHappensNext)
          : "None. No Owner action required."
      }</dd>
      <dt>Next expected Scout/system action</dt>
      <dd>${escapeHtml(record.whatHappensNext)}</dd>
      <dt>Previous state → new state</dt>
      <dd>${escapeHtml(previous)} → ${escapeHtml(displayed.label)}</dd>
      <dt>Why this state</dt>
      <dd>${escapeHtml(record.reason)}</dd>
      <dt>What happens next</dt>
      <dd>${escapeHtml(record.whatHappensNext)}</dd>
      <dt>Waiting on Tagia?</dt>
      <dd>${yesNo(waitingOnOwner)}${record.tagiaMustAct ? " — Tagia must act" : ""}</dd>
      <dt>Waiting on a system?</dt>
      <dd>${waitingOnSystem ? escapeHtml(record.waitingOn ?? "a system") : "No"}</dd>
      <dt>Is he stuck?</dt>
      <dd>${yesNo(stuck)}</dd>
      <dt>Did work stop?</dt>
      <dd>${yesNo(stopped)}</dd>
      <dt>Safe authorized work remains?</dt>
      <dd>${yesNo(record.safeAuthorizedWorkRemains)}</dd>
      ${
        record.expectedNextCheckAt
          ? `<dt>Next system check</dt><dd>${escapeHtml(formatWorkHeartbeatClock(record.expectedNextCheckAt))}</dd>`
          : ""
      }
      ${
        record.blocker
          ? `<dt>Blocker</dt><dd>${escapeHtml(record.blocker)}</dd>`
          : ""
      }
      ${
        displayed.stalled
          ? `<dt>No progress since</dt><dd>${escapeHtml(stalledClock)} — 10 minutes without a pulse. This is STALLED / HUNG, not ACTIVE.</dd>`
          : ""
      }
    </dl>
    <section class="history" id="owner-history">
      <h2>Activity / history</h2>
    </section>
    <p class="note">
      One Owner page. Not the customer site. Not the Room 3 Owner Console.
      Work state and attention state are independent. Motion runs only while ACTIVE WORK and last activity is under 10 minutes old. YELLOW is a badge, not a replacement screen.
      Acknowledge silences sound; it does not remove the required action.
      Authority: ${escapeHtml(protocol.authorityDoc)}.
    </p>
    </details>
  </main>
  <script>
(function () {
  var main = document.querySelector("main");
  if (!main) return;
  var staleMs = ${WORK_HEARTBEAT_STALE_MS};
  var audioTimer = null;
  var alertStarted = false;
  function conditionKey() {
    return [
      main.getAttribute("data-declared-state") || "",
      main.getAttribute("data-last-activity") || "",
      main.getAttribute("data-alert-id") || ""
    ].join(":");
  }
  function ackStorageKey() {
    return "project-alpha-attention-ack:" + conditionKey();
  }
  function isAcked() {
    if (main.getAttribute("data-attention-acked") === "true") return true;
    try { return Boolean(window.localStorage.getItem(ackStorageKey())); } catch (e) { return false; }
  }
  function beepOnce() {
    if (isAcked() || window.__ownerDeskBeeped) return;
    window.__ownerDeskBeeped = true;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.18;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(function () { osc.stop(); ctx.close(); }, 420);
    } catch (e) {}
  }
  function stopAlert() {
    if (audioTimer) { clearInterval(audioTimer); audioTimer = null; }
    alertStarted = false;
    window.__ownerDeskBeeped = true;
    document.body.setAttribute("data-alert", "false");
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
    if (box) box.setAttribute("data-acked", "true");
    if (done) done.hidden = false;
  }
  function markAcked() {
    try { window.localStorage.setItem(ackStorageKey(), new Date().toISOString()); } catch (e) {}
    showAckedUi();
    persistAck();
  }
  function ensureRedActionBlock() {
    var card = main.querySelector(".front-card");
    if (!card) return;
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
    if (isAcked()) showAckedUi();
    else {
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
        done.hidden = true;
        box.appendChild(btn);
        box.appendChild(done);
        card.appendChild(box);
      }
    }
  }
  function raiseStall() {
    document.body.setAttribute("data-attention", "RED");
    document.title = "RED — OWNER ACTION REQUIRED";
    ensureRedActionBlock();
    if (isAcked()) { showAckedUi(); return; }
    startAlert();
  }
  function apply() {
    if (main.getAttribute("data-client-stall") === "false") return;
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
  var button = document.getElementById("owner-ack");
  if (button) {
    button.addEventListener("click", function (event) {
      if (event && event.preventDefault) event.preventDefault();
      markAcked();
    });
  }
  if (isAcked()) showAckedUi();
  else apply();
  setInterval(apply, 4000);
})();
  </script>
</body>
</html>
`;
}
