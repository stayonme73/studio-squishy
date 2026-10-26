/**
 * One-page Owner desk self-test.
 * Pulses each required state, acks, resolves, and writes proof.
 * Does not open browser tabs. Does not touch the customer site.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PULSE = path.join(ROOT, "scripts/work-heartbeat-pulse.mjs");
const ALERT = path.join(ROOT, "scripts/owner-attention-alert.mjs");
const CONSOLE_HTML = path.join(ROOT, "docs/launch/PROJECT-ALPHA-OWNER-CONSOLE.html");
const HEARTBEAT_HTML = path.join(ROOT, "docs/launch/PROJECT-ALPHA-WORK-HEARTBEAT.html");
const ATTENTION_HTML = path.join(ROOT, "docs/launch/PROJECT-ALPHA-OWNER-ATTENTION.html");
const HEARTBEAT_JSON = path.join(ROOT, "docs/launch/project-alpha-work-heartbeat.json");
const ATTENTION_JSON = path.join(ROOT, "docs/launch/project-alpha-attention-state.json");
const PROOF_PATH = path.join(
  ROOT,
  "docs/launch/studio-operating-single-page-owner-work-and-attention-console-1/OWNER-CONSOLE-SELF-TEST-PROOF.json",
);

function pulse(args) {
  return execFileSync(process.execPath, [PULSE, ...args], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function readHtml() {
  return readFileSync(CONSOLE_HTML, "utf8");
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

const cases = [];
const failures = [];

function recordCase(id, title, checks) {
  const beforeFail = failures.length;
  checks();
  const ok = failures.length === beforeFail;
  cases.push({ id, title, ok });
}

const requiredFields = [
  "Current work state",
  "Current package",
  "Current task",
  "Last meaningful action",
  "Timestamp of last meaningful action",
  "Why attention is required",
  "Exact Owner action required",
  "Next expected Scout/system action",
  "owner-history",
  'data-one-page="true"',
];

pulse([
  "--task",
  "Build single-page Owner desk",
  "--action",
  "Self-test started on the one Owner page",
  "--reason",
  "Authorized console package is in progress",
  "--next",
  "Walk every Owner-flow case on this same page",
  "--package",
  "STUDIO-OPERATING-SINGLE-PAGE-OWNER-WORK-AND-ATTENTION-CONSOLE-1",
  "--attention",
  "GREEN",
]);

recordCase(1, "ACTIVE WORK", () => {
  const record = readJson(HEARTBEAT_JSON);
  const html = readHtml();
  assert(record.workState === "ACTIVE_WORK", "case 1: workState is not ACTIVE_WORK", failures);
  assert(html.includes("ACTIVE WORK"), "case 1: page missing ACTIVE WORK", failures);
  assert(html.includes('data-live="true"'), "case 1: page is not live", failures);
  for (const field of requiredFields) {
    assert(html.includes(field), `case 1: missing ${field}`, failures);
  }
});

pulse([
  "--waiting-owner",
  "--task",
  "Owner desk RED case",
  "--action",
  "Raised WAITING ON OWNER on the one page",
  "--reason",
  "Self-test needs Owner attention",
  "--next",
  "Acknowledge this RED, then keep the required action visible",
]);

recordCase(2, "WAITING ON OWNER", () => {
  const record = readJson(HEARTBEAT_JSON);
  const html = readHtml();
  assert(record.workState === "WAITING_ON_OWNER", "case 2: not WAITING_ON_OWNER", failures);
  assert(record.attentionState === "RED", "case 2: attention is not RED", failures);
  assert(record.tagiaMustAct === true, "case 2: tagiaMustAct is false", failures);
  assert(html.includes("WAITING ON OWNER"), "case 2: page missing WAITING ON OWNER", failures);
});

pulse([
  "--waiting-system",
  "--waiting-on",
  "local HTTPS proof server",
  "--task",
  "Owner desk system-wait case",
  "--action",
  "Moved to WAITING ON SYSTEM without a second tab",
  "--reason",
  "Self-test system wait — no Owner action",
  "--next",
  "Scout continues when the named system answers",
]);

recordCase(3, "WAITING ON SYSTEM", () => {
  const record = readJson(HEARTBEAT_JSON);
  const html = readHtml();
  assert(record.workState === "WAITING_ON_SYSTEM", "case 3: not WAITING_ON_SYSTEM", failures);
  assert(record.attentionState === "YELLOW", "case 3: attention is not YELLOW", failures);
  assert(record.tagiaMustAct === false, "case 3: system wait should not require Owner", failures);
  assert(html.includes("WAITING ON SYSTEM"), "case 3: page missing WAITING ON SYSTEM", failures);
  assert(html.includes("local HTTPS proof server"), "case 3: missing waiting-on name", failures);
});

pulse([
  "--stalled",
  "--task",
  "Owner desk stall case",
  "--action",
  "Declared STALLED / HUNG on the one page",
  "--reason",
  "Self-test: no fresh meaningful activity for 10 minutes",
  "--next",
  "Scout must recover or explain on this same page",
  "--blocker",
  "No ACTIVE pulse for 10 minutes",
]);

recordCase(4, "STALLED / HUNG", () => {
  const record = readJson(HEARTBEAT_JSON);
  const html = readHtml();
  assert(record.workState === "STALLED_HUNG", "case 4: not STALLED_HUNG", failures);
  assert(record.attentionState === "RED", "case 4: stall is not RED", failures);
  assert(html.includes("STALLED / HUNG"), "case 4: page missing STALLED / HUNG", failures);
});

pulse([
  "--waiting-owner",
  "--task",
  "Owner desk RED alert case",
  "--action",
  "Re-raised RED on the one page",
  "--reason",
  "Self-test RED alert",
  "--next",
  "Press Acknowledge on this same page",
]);

recordCase(5, "RED alert", () => {
  const record = readJson(HEARTBEAT_JSON);
  const attention = readJson(ATTENTION_JSON);
  const html = readHtml();
  assert(record.attentionState === "RED", "case 5: not RED", failures);
  assert(attention.tagiaMustInterveneNow === true, "case 5: attention JSON not NOW", failures);
  assert(html.includes("RED — OWNER ACTION REQUIRED"), "case 5: page missing RED badge", failures);
  assert(html.includes(">Acknowledge<") || html.includes("Acknowledge"), "case 5: missing Acknowledge", failures);
  assert(html.includes('data-red-card="true"'), "case 5: missing RED card", failures);
  assert(html.includes('data-attention-phase="alert_unacked"'), "case 5: phase is not alert_unacked", failures);
});

pulse([
  "--ack",
  "--action",
  "Owner acknowledged on the one page",
  "--next",
  "Press Acknowledge on this same page",
]);

recordCase(6, "Acknowledge silences alert", () => {
  const record = readJson(HEARTBEAT_JSON);
  const attention = readJson(ATTENTION_JSON);
  const html = readHtml();
  assert(Boolean(record.attentionAcknowledgedAt), "case 6: heartbeat ack missing", failures);
  assert(Boolean(attention.acknowledgedAt), "case 6: attention ack missing", failures);
  assert(html.includes("ACKNOWLEDGED · ACTION STILL REQUIRED"), "case 6: missing ack label", failures);
  assert(html.includes('data-attention-acked="true"'), "case 6: page not marked acked", failures);
  assert(
    !shouldPlayFromAlertJson(attention),
    "case 6: alert script would still play",
    failures,
  );
});

recordCase(7, "required action remains visible", () => {
  const record = readJson(HEARTBEAT_JSON);
  const html = readHtml();
  assert(record.tagiaMustAct === true, "case 7: ack cleared required action", failures);
  assert(record.attentionState === "RED", "case 7: ack cleared RED", failures);
  assert(html.includes("Press Acknowledge on this same page"), "case 7: exact action vanished", failures);
  assert(html.includes("Exact Owner action required"), "case 7: action label vanished", failures);
});

pulse([
  "--resolve",
  "--task",
  "Owner desk resolve case",
  "--action",
  "Owner completed the required action",
  "--reason",
  "Self-test action completion",
  "--next",
  "Stay on the live Owner desk",
  "--attention",
  "GREEN",
]);

recordCase(8, "action completion clears attention", () => {
  const record = readJson(HEARTBEAT_JSON);
  const html = readHtml();
  assert(record.workState === "ACTIVE_WORK", "case 8: did not return to ACTIVE", failures);
  assert(record.attentionState === "GREEN", "case 8: attention not GREEN", failures);
  assert(record.tagiaMustAct === false, "case 8: still waiting on Owner", failures);
  assert(html.includes("ACTIVE WORK"), "case 8: page not live", failures);
  assert(html.includes("None. No Owner action required."), "case 8: action still required", failures);
});

recordCase(9, "no duplicate tabs", () => {
  const pulseSrc = readFileSync(PULSE, "utf8");
  const alertSrc = readFileSync(ALERT, "utf8");
  const attentionHtml = readFileSync(ATTENTION_HTML, "utf8");
  const heartbeatHtml = readFileSync(HEARTBEAT_HTML, "utf8");
  const consoleHtml = readHtml();
  assert(!pulseSrc.includes("window.open"), "case 9: pulse still window.opens", failures);
  assert(pulseSrc.includes("if (flags.open)"), "case 9: pulse lost --open gate", failures);
  assert(alertSrc.includes("never open a browser tab"), "case 9: alert still opens tabs", failures);
  assert(
    !alertSrc.includes('start", "", heartbeat') && !alertSrc.includes("start\", \"\", heartbeat"),
    "case 9: ack still starts heartbeat",
    failures,
  );
  assert(attentionHtml.includes("PROJECT-ALPHA-OWNER-CONSOLE.html"), "case 9: attention is not a redirect", failures);
  assert(attentionHtml.includes("not a second alert window"), "case 9: attention still a second product", failures);
  assert(consoleHtml.includes('data-one-page="true"'), "case 9: console missing one-page flag", failures);
  assert(heartbeatHtml.includes('data-one-page="true"'), "case 9: heartbeat alias is not the same desk", failures);
  assert(existsSync(CONSOLE_HTML), "case 9: console page missing", failures);
});

recordCase(10, "no repeated alarm after acknowledgement", () => {
  pulse([
    "--waiting-owner",
    "--task",
    "Owner desk replay case",
    "--action",
    "Raised a fresh RED to prove ack holds",
    "--reason",
    "Self-test replay guard",
    "--next",
    "Keep this action visible after ack",
  ]);
  pulse(["--ack"]);
  const first = readJson(HEARTBEAT_JSON);
  pulse([
    "--waiting-owner",
    "--task",
    "Owner desk replay case",
    "--action",
    "Same-state progress must not re-alarm",
    "--reason",
    "Self-test replay guard",
    "--next",
    "Keep this action visible after ack",
  ]);
  const second = readJson(HEARTBEAT_JSON);
  const attention = readJson(ATTENTION_JSON);
  const html = readHtml();
  assert(Boolean(first.attentionAcknowledgedAt), "case 10: first ack missing", failures);
  assert(Boolean(second.attentionAcknowledgedAt), "case 10: same-state pulse wiped ack", failures);
  assert(second.attentionAlertId === first.attentionAlertId, "case 10: alert id changed on same state", failures);
  assert(!shouldPlayFromAlertJson(attention), "case 10: alert would replay", failures);
  assert(html.includes("ACKNOWLEDGED · ACTION STILL REQUIRED"), "case 10: ack label lost", failures);
});

function shouldPlayFromAlertJson(record) {
  if (record.kind !== "OWNER_ACTION_REQUIRED_NOW" && !(record.state === "RED" && record.tagiaMustInterveneNow)) {
    return false;
  }
  if (record.acknowledgedAt) return false;
  if (record.audiblePlayedAt) return false;
  return true;
}

const proof = {
  ok: failures.length === 0,
  testedAt: new Date().toISOString(),
  packageId: "STUDIO-OPERATING-SINGLE-PAGE-OWNER-WORK-AND-ATTENTION-CONSOLE-1",
  page: "docs/launch/PROJECT-ALPHA-OWNER-CONSOLE.html",
  alias: "docs/launch/PROJECT-ALPHA-WORK-HEARTBEAT.html",
  attentionRedirect: "docs/launch/PROJECT-ALPHA-OWNER-ATTENTION.html",
  openedBrowserTabs: 0,
  cases,
  failures,
};

writeFileSync(PROOF_PATH, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
process.stdout.write(
  `${proof.ok ? "PASS" : "FAIL"} owner-console self-test ${cases.filter((row) => row.ok).length}/${cases.length}\n`,
);
if (!proof.ok) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}
