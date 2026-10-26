/**
 * Project Alpha owner attention alert.
 * Plays only for OWNER_ACTION_REQUIRED_NOW that is not yet acknowledged
 * and has not already sounded. GREEN and ordinary YELLOW stay silent.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE_PATH = path.join(ROOT, "docs/launch/project-alpha-attention-state.json");
const TEST_PROOF_PATH = path.join(
  ROOT,
  "docs/launch/project-alpha-attention-alert-test.json",
);

function readState() {
  return JSON.parse(readFileSync(STATE_PATH, "utf8"));
}

function writeState(state) {
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function kindOf(record) {
  if (record.kind) return record.kind;
  if (record.state === "RED" && record.tagiaMustInterveneNow) {
    return "OWNER_ACTION_REQUIRED_NOW";
  }
  if (record.state === "YELLOW") return "WATCH";
  if (record.state === "GREEN") return "CONTINUE";
  return "WATCH";
}

function shouldPlay(record) {
  if (kindOf(record) !== "OWNER_ACTION_REQUIRED_NOW") return false;
  if (record.acknowledgedAt) return false;
  if (record.audiblePlayedAt) return false;
  return true;
}

function playWindowsAlert() {
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      [
        "1..3 | ForEach-Object {",
        "[console]::Beep(740,160);",
        "[console]::Beep(988,160);",
        "[console]::Beep(1175,200);",
        "[console]::Beep(1568,260);",
        "[System.Media.SystemSounds]::Hand.Play();",
        "Start-Sleep -Milliseconds 180",
        "};",
        "[System.Media.SystemSounds]::Exclamation.Play();",
        "Start-Sleep -Milliseconds 350;",
        "[System.Media.SystemSounds]::Hand.Play();",
        "Start-Sleep -Milliseconds 500",
      ].join(" "),
    ],
    { stdio: "ignore", windowsHide: true },
  );
}

function openAttentionPage() {
  /* One-page rule: never open a browser tab from the alert script. */
  return;
}

function printBanner(record) {
  const action = record.exactOwnerAction ?? record.nextRecommendedAction;
  process.stdout.write(
    [
      "",
      "█".repeat(72),
      "",
      "   🚨  RED — OWNER ACTION REQUIRED NOW  🚨",
      "",
      `   ${action}`,
      "",
      `   Open: docs/launch/PROJECT-ALPHA-OWNER-CONSOLE.html`,
      "",
      "█".repeat(72),
      "",
      "",
    ].join("\n"),
  );
}

const mode = process.argv.includes("--test")
  ? "test"
  : process.argv.includes("--ack")
    ? "ack"
    : process.argv.includes("--status")
      ? "status"
      : "alert";

if (mode === "status") {
  const record = readState();
  process.stdout.write(
    `${JSON.stringify(
      {
        kind: kindOf(record),
        shouldPlay: shouldPlay(record),
        alertId: record.alertId ?? null,
        acknowledgedAt: record.acknowledgedAt ?? null,
        audiblePlayedAt: record.audiblePlayedAt ?? null,
      },
      null,
      2,
    )}\n`,
  );
  process.exit(0);
}

if (mode === "ack") {
  const record = readState();
  record.acknowledgedAt = new Date().toISOString();
  writeState(record);
  process.stdout.write(`acknowledged ${record.alertId ?? "unspecified"} → same Owner page\n`);
  process.exit(0);
}

if (mode === "test") {
  playWindowsAlert();
  const proof = {
    ok: true,
    testedAt: new Date().toISOString(),
    method: "windows-console-beep-plus-system-exclamation",
    purpose: "Prove the audible Owner alert before relying on it.",
    silentFor: ["GREEN", "WATCH", "OWNER_ACTION_REQUIRED_DEFERRED"],
  };
  writeFileSync(TEST_PROOF_PATH, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  process.stdout.write("OWNER ATTENTION AUDIBLE TEST played.\n");
  process.exit(0);
}

const record = readState();
if (!shouldPlay(record)) {
  process.exit(0);
}

playWindowsAlert();
record.audiblePlayedAt = new Date().toISOString();
writeState(record);
openAttentionPage();
printBanner(record);
process.exit(0);
