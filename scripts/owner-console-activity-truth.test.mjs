import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  applyScoutExecutionStop,
  applyScoutMessage,
  applyScoutToolFailure,
  applyScoutToolFinish,
  applyScoutToolStart,
  resolveActivityTruth,
  WATCHDOG_STALE_MS,
} from "./work-heartbeat-watchdog-rules.mjs";

const NOW = "2026-10-19T23:30:00.000Z";
const NOW_MS = Date.parse(NOW);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STANCE = path.join(ROOT, "scripts/owner-desk-scout-stance.mjs");

function activeRecord(overrides = {}) {
  return {
    workState: "ACTIVE_WORK",
    packageId: "STUDIO-OPERATING-SINGLE-PAGE-OWNER-WORK-AND-ATTENTION-CONSOLE-1",
    currentTask: "Owner Console consistency certification",
    lastMeaningfulAction: "Fourth heartbeat cycle after recovery",
    lastActivityAt: "2026-10-19T22:39:55.229Z",
    scoutListening: false,
    scoutTrouble: false,
    expectedToContinue: true,
    intentionalStop: false,
    activeExecutionCount: 0,
    ...overrides,
  };
}

test("a chat message does not create WORKING or replace a hold", () => {
  const active = applyScoutMessage(activeRecord(), { prompt: "SCOUT — OWNER CONSOLE ACTIVITY TRUTH REPAIR" });
  expectIdle(active);
  assert.equal(active.pendingAssignment, "SCOUT — OWNER CONSOLE ACTIVITY TRUTH REPAIR");
  assert.equal(active.currentTask, "Owner Console consistency certification");

  const stopped = applyScoutMessage(
    activeRecord({
      workState: "STOPPED",
      intentionalStop: true,
      scoutListening: true,
      expectedToContinue: false,
    }),
    { prompt: "Please start again" },
  );
  assert.equal(stopped.workState, "STOPPED");
  assert.equal(stopped.intentionalStop, true);
  assert.equal(stopped.pendingAssignment, undefined);
  assert.equal(resolveActivityTruth(stopped, NOW_MS), "STOPPED");

  const waiting = applyScoutMessage(
    activeRecord({ workState: "WAITING_ON_OWNER", expectedToContinue: false, tagiaMustAct: true }),
    { prompt: "Please start again" },
  );
  assert.equal(waiting.workState, "WAITING_ON_OWNER");
  assert.equal(resolveActivityTruth(waiting, NOW_MS), "WAITING_ON_OWNER");
});

test("tool execution on an authorized assignment becomes WORKING and drops the old task name", () => {
  const noted = applyScoutMessage(activeRecord(), { prompt: "SCOUT — OWNER CONSOLE ACTIVITY TRUTH REPAIR" });
  const started = applyScoutToolStart(noted, {}, NOW);
  assert.equal(started.activityTruth, "WORKING");
  assert.equal(started.workState, "ACTIVE_WORK");
  assert.equal(started.currentTask, "SCOUT — OWNER CONSOLE ACTIVITY TRUTH REPAIR");
  assert.equal(started.currentTask.includes("consistency certification"), false);
  assert.equal(resolveActivityTruth(started, NOW_MS), "WORKING");
});

test("tool execution does not resume STOPPED or WAITING ON OWNER", () => {
  const stopped = applyScoutToolStart(
    activeRecord({ workState: "STOPPED", intentionalStop: true, expectedToContinue: false }),
    { prompt: "SCOUT — OWNER CONSOLE ACTIVITY TRUTH REPAIR" },
    NOW,
  );
  assert.equal(stopped.workState, "STOPPED");
  assert.equal(stopped.activityTruth, undefined);
  assert.equal(resolveActivityTruth(stopped, NOW_MS), "STOPPED");

  const waiting = applyScoutToolStart(
    activeRecord({ workState: "WAITING_ON_OWNER", expectedToContinue: false }),
    {},
    NOW,
  );
  assert.equal(waiting.workState, "WAITING_ON_OWNER");
  assert.equal(resolveActivityTruth(waiting, NOW_MS), "WAITING_ON_OWNER");
});

test("overlapping tools do not go LISTENING early, and stop does not invent WORKING", () => {
  let record = applyScoutToolStart(activeRecord(), { assignment: "Activity truth repair" }, NOW);
  record = applyScoutToolStart(record, {}, NOW);
  assert.equal(record.activeExecutionCount, 2);
  record = applyScoutToolFinish(record, {}, NOW);
  assert.equal(record.activeExecutionCount, 1);
  assert.equal(resolveActivityTruth(record, NOW_MS), "WORKING");
  const earlyStop = applyScoutExecutionStop(record, { status: "completed" }, NOW);
  assert.equal(earlyStop.activityTruth, "WORKING");
  assert.equal(resolveActivityTruth(earlyStop, NOW_MS), "WORKING");

  record = applyScoutToolFinish(record, {}, NOW);
  assert.equal(record.activeExecutionCount, 0);
  assert.equal(record.activityTruth, "WORKING");
  const done = applyScoutExecutionStop(record, { status: "completed" }, NOW);
  assert.equal(done.activityTruth, "LISTENING");
  assert.equal(done.currentTask, "");
  assert.equal(done.lastCompletedAssignment, "Activity truth repair");
  assert.equal(done.workState, "ACTIVE_WORK");
  assert.equal(done.intentionalStop, false);
  assert.equal(resolveActivityTruth(done, NOW_MS), "LISTENING");
});

test("a failed tool is not completion and is not Scout-in-trouble", () => {
  const started = applyScoutToolStart(activeRecord(), { assignment: "Activity truth repair" }, NOW);
  const failed = applyScoutToolFailure(started, { error: "port closed" }, NOW);
  assert.equal(failed.activityTruth, "FAILED");
  assert.equal(failed.executionFailure, "port closed");
  assert.equal(failed.scoutTrouble, false);
  assert.equal(failed.activeExecutionCount, 0);
  assert.equal(resolveActivityTruth(failed, NOW_MS), "FAILED");
});

test("an interrupted stop is not LISTENING", () => {
  const started = applyScoutToolStart(activeRecord(), { assignment: "Activity truth repair" }, NOW);
  const finished = applyScoutToolFinish(started, {}, NOW);
  const interrupted = applyScoutExecutionStop(finished, { status: "aborted" }, NOW);
  assert.equal(interrupted.activityTruth, "INTERRUPTED");
  assert.equal(interrupted.scoutTrouble, false);
  assert.equal(resolveActivityTruth(interrupted, NOW_MS), "INTERRUPTED");
});

test("missing or stale execution evidence is UNKNOWN and the old task is not current", () => {
  const bare = activeRecord();
  assert.equal(resolveActivityTruth(bare, NOW_MS), "UNKNOWN");
  const stale = applyScoutToolStart(activeRecord(), { assignment: "Activity truth repair" }, "2026-10-19T22:00:00.000Z");
  assert.equal(resolveActivityTruth(stale, Date.parse("2026-10-19T22:00:00.000Z") + WATCHDOG_STALE_MS), "UNKNOWN");
});

test("the stance script writes the same truth to a heartbeat file", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "scout-stance-"));
  const heartbeat = path.join(dir, "heartbeat.json");
  writeFileSync(heartbeat, `${JSON.stringify(activeRecord(), null, 2)}\n`, "utf8");
  const env = { ...process.env, SCOUT_STANCE_HEARTBEAT: heartbeat };
  function run(flag, payload) {
    const result = spawnSync(process.execPath, [STANCE, flag], {
      input: JSON.stringify(payload || {}),
      encoding: "utf8",
      env,
    });
    assert.equal(result.status, 0, result.stderr);
  }
  run("--message", { prompt: "Just saying hello" });
  let saved = JSON.parse(readFileSync(heartbeat, "utf8"));
  assert.equal(saved.activityTruth, undefined);
  assert.equal(saved.workState, "ACTIVE_WORK");
  run("--tool-start", {});
  saved = JSON.parse(readFileSync(heartbeat, "utf8"));
  assert.equal(saved.activityTruth, "WORKING");
  assert.equal(saved.currentTask, "Just saying hello");
  assert.equal(saved.currentTask.includes("consistency certification"), false);
  run("--tool-finish", {});
  run("--stop", { status: "completed" });
  saved = JSON.parse(readFileSync(heartbeat, "utf8"));
  assert.equal(saved.activityTruth, "LISTENING");
  assert.equal(saved.currentTask, "");
  assert.equal(saved.workState, "ACTIVE_WORK");
  rmSync(dir, { recursive: true, force: true });
});

function expectIdle(record) {
  assert.equal(record.workState, "ACTIVE_WORK");
  assert.notEqual(record.activityTruth, "WORKING");
}
