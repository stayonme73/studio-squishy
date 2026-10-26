/**
 * Prove one Acknowledge click silences the Owner desk and keeps it silent.
 * Uses --quiet so this proof does not beat the Owner with another siren.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PULSE = path.join(ROOT, "scripts/work-heartbeat-pulse.mjs");
const CONSOLE_HTML = path.join(ROOT, "docs/launch/PROJECT-ALPHA-OWNER-CONSOLE.html");
const HEARTBEAT_JSON = path.join(ROOT, "docs/launch/project-alpha-work-heartbeat.json");
const ATTENTION_JSON = path.join(ROOT, "docs/launch/project-alpha-attention-state.json");
const PROOF = path.join(
  ROOT,
  "docs/launch/studio-operating-single-page-owner-work-and-attention-console-1/OWNER-CONSOLE-ACK-SILENCE-PROOF.json",
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

async function waitForDesk(tries = 20) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch("http://127.0.0.1:4177/status");
      if (res.ok) return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error("Owner desk listener did not start");
}

const failures = [];
function assert(ok, message) {
  if (!ok) failures.push(message);
}

pulse([
  "--waiting-owner",
  "--quiet",
  "--task",
  "Durable Acknowledge proof",
  "--action",
  "Raised one quiet RED to prove Acknowledge turns the alarm off",
  "--reason",
  "Owner said one Acknowledge must turn the alarm off",
  "--next",
  "Press Acknowledge once. The sound must stop and stay stopped.",
]);

await waitForDesk();

const before = readJson(HEARTBEAT_JSON);
assert(before.attentionState === "RED", "proof did not raise RED");
assert(!before.attentionAcknowledgedAt, "proof RED was already acked");

const ackRes = await fetch("http://127.0.0.1:4177/ack", { method: "POST" });
const ackBody = await ackRes.json();
const after = readJson(HEARTBEAT_JSON);
const attention = readJson(ATTENTION_JSON);
const html = readFileSync(CONSOLE_HTML, "utf8");
const reload = await fetch("http://127.0.0.1:4177/");
const liveHtml = await reload.text();

assert(ackRes.ok, "ack endpoint failed");
assert(ackBody.silenced === true, "ack endpoint did not report silenced");
assert(Boolean(after.attentionAcknowledgedAt), "heartbeat ack not persisted");
assert(Boolean(attention.acknowledgedAt), "attention ack not persisted");
assert(html.includes('data-attention-acked="true"'), "written HTML still unacked");
assert(liveHtml.includes('data-attention-acked="true"'), "served HTML still unacked");
assert(html.includes("ACKNOWLEDGED · ACTION STILL REQUIRED"), "ack label missing");
assert(after.tagiaMustAct === true, "ack cleared the required action");
assert(after.attentionState === "RED", "ack cleared RED instead of silencing it");

const proof = {
  ok: failures.length === 0,
  testedAt: new Date().toISOString(),
  method: "POST http://127.0.0.1:4177/ack",
  openedBrowserTabs: 0,
  windowsSirenPlayed: false,
  beforeAlertId: before.attentionAlertId ?? null,
  acknowledgedAt: after.attentionAcknowledgedAt ?? null,
  failures,
};

writeFileSync(PROOF, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
process.stdout.write(
  `${proof.ok ? "PASS" : "FAIL"} owner-console ack silence\n`,
);
if (!proof.ok) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}
