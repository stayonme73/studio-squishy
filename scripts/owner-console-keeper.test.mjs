import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { ensureOwnerDesk, OWNER_DESK_SERVICE } from "./owner-console-keeper.mjs";

const desk = path.resolve("scripts/owner-console-desk.mjs");
const tracked = new Set();

function track(pid) {
  if (pid) tracked.add(pid);
}

function stop(pid) {
  if (!pid) return;
  try {
    process.kill(pid);
  } catch {
    /* already gone */
  }
}

test.after(() => {
  for (const pid of tracked) stop(pid);
});

function workspace(name) {
  return mkdtempSync(path.join(tmpdir(), `owner-desk-${name}-`));
}

function options(dir, port, extra = {}) {
  return {
    port,
    scriptPath: desk,
    pidPath: path.join(dir, "pid"),
    logPath: path.join(dir, "keeper.jsonl"),
    statePath: path.join(dir, "state.json"),
    maxRecoveries: 10,
    ...extra,
  };
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

async function health(port) {
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  return { status: response.status, body: await response.json() };
}

function launch(port, env) {
  const child = spawn(process.execPath, [desk], {
    env: { ...process.env, OWNER_DESK_PORT: String(port), ...env },
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  track(child.pid);
  return child.pid;
}

async function waitFor(check) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if (await check()) return;
    } catch {
      /* not up yet */
    }
    sleep(150);
  }
  throw new Error("timed out waiting for the test listener");
}

test("healthy console stays up across repeated checks", async () => {
  const dir = workspace("healthy");
  const port = 4611;
  const first = ensureOwnerDesk(options(dir, port));
  track(first.pid);
  assert.equal(first.action, "started");
  const seen = await health(port);
  assert.equal(seen.body.service, OWNER_DESK_SERVICE);
  assert.equal(seen.body.pid, first.pid);
  for (let pass = 0; pass < 3; pass += 1) {
    const again = ensureOwnerDesk(options(dir, port));
    assert.equal(again.action, "kept");
    assert.equal(again.pid, first.pid);
  }
});

test("stopped console is detected and restarted three times", async () => {
  const dir = workspace("stopped");
  const port = 4613;
  let previous = null;
  for (let pass = 0; pass < 3; pass += 1) {
    stop(previous);
    if (previous) {
      for (let attempt = 0; attempt < 20 && alive(previous); attempt += 1) sleep(100);
    }
    const result = ensureOwnerDesk(options(dir, port));
    track(result.pid);
    assert.equal(result.action, "started");
    assert.equal(result.reason, "stopped");
    const seen = await health(port);
    assert.equal(seen.status, 200);
    assert.equal(seen.body.service, OWNER_DESK_SERVICE);
    assert.equal(seen.body.pid, result.pid);
    assert.notEqual(result.pid, previous);
    previous = result.pid;
  }
});

test("a live owned process with a closed port is restarted", async () => {
  const dir = workspace("closed");
  for (let pass = 0; pass < 3; pass += 1) {
    const port = 4620 + pass;
    const held = launch(port, { OWNER_DESK_NO_LISTEN: "1" });
    const choice = options(dir, port);
    writeFileSync(choice.pidPath, `${held}\n`);
    const result = ensureOwnerDesk(choice);
    track(result.pid);
    assert.equal(result.action, "recovered");
    assert.equal(result.reason, "live_pid_port_closed");
    assert.equal(alive(held), false);
    const seen = await health(port);
    assert.equal(seen.body.service, OWNER_DESK_SERVICE);
    assert.equal(seen.body.pid, result.pid);
  }
});

test("a stale owned listener is detected and replaced", async () => {
  for (let pass = 0; pass < 3; pass += 1) {
    const port = 4630 + pass;
    const dir = workspace(`stale-${pass}`);
    const stale = launch(port, { OWNER_DESK_SERVICE_NAME: "not-the-console" });
    await waitFor(async () => (await health(port)).body.service === "not-the-console");
    const result = ensureOwnerDesk(options(dir, port));
    track(result.pid);
    assert.equal(result.action, "recovered");
    assert.equal(result.reason, "stale_or_unidentified_listener");
    assert.equal(alive(stale), false);
    const seen = await health(port);
    assert.equal(seen.body.service, OWNER_DESK_SERVICE);
    assert.notEqual(seen.body.pid, stale);
  }
});

test("an unresponsive listener is abandoned within the timeout", async () => {
  for (let pass = 0; pass < 3; pass += 1) {
    const port = 4660 + pass;
    const dir = workspace(`silent-${pass}`);
    const child = spawn(
      process.execPath,
      [
        "-e",
        `require("net").createServer((socket)=>{socket.on("error",()=>{})}).listen(${port},"127.0.0.1")`,
      ],
      { detached: true, stdio: "ignore", windowsHide: true },
    );
    child.unref();
    track(child.pid);
    await waitFor(
      () =>
        new Promise((resolve) => {
          const socket = net.connect(port, "127.0.0.1", () => {
            socket.destroy();
            resolve(true);
          });
          socket.on("error", () => resolve(false));
        }),
    );
    const started = Date.now();
    const result = ensureOwnerDesk(options(dir, port));
    assert.ok(Date.now() - started < 4000, `health check took ${Date.now() - started}ms`);
    assert.equal(result.action, "blocked");
    assert.equal(result.reason, "port_occupied_by_unrelated_process");
    assert.equal(alive(child.pid), true);
  }
});

test("an unrelated listener is left running", async () => {
  const port = 4641;
  const dir = workspace("unrelated");
  const child = spawn(
    process.execPath,
    [
      "-e",
      `require("http").createServer((req,res)=>{res.end(JSON.stringify({ok:true}))}).listen(${port})`,
    ],
    { detached: true, stdio: "ignore", windowsHide: true },
  );
  child.unref();
  track(child.pid);
  await waitFor(async () => (await fetch(`http://127.0.0.1:${port}/health`)).status === 200);
  for (let pass = 0; pass < 3; pass += 1) {
    const result = ensureOwnerDesk(options(dir, port));
    assert.equal(result.action, "blocked");
    assert.equal(result.reason, "port_occupied_by_unrelated_process");
    assert.equal(alive(child.pid), true);
  }
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.deepEqual(await response.json(), { ok: true });
});

test("a failed restart is recorded and then stopped", async () => {
  const dir = workspace("failed");
  const countFile = path.join(dir, "starts.txt");
  const script = path.join(dir, "exit-desk.mjs");
  writeFileSync(countFile, "");
  writeFileSync(
    script,
    `import { appendFileSync } from "node:fs"; appendFileSync(${JSON.stringify(countFile)}, "1"); process.exit(1);\n`,
  );
  const base = options(dir, 4651, { scriptPath: script, maxRecoveries: 3 });
  const attempts = [];
  for (let pass = 0; pass < 4; pass += 1) attempts.push(ensureOwnerDesk(base));
  assert.deepEqual(
    attempts.slice(0, 3).map((result) => result.action),
    ["failed", "failed", "failed"],
  );
  assert.equal(attempts[3].action, "loop_prevented");
  assert.equal(attempts[3].reason, "recovery_limit_reached");
  assert.equal(readFileSync(countFile, "utf8"), "111");
  const log = readFileSync(base.logPath, "utf8");
  assert.match(log, /start_did_not_identify_console/);
  assert.match(log, /recovery_limit_reached/);
});

test("the live local console is identified and not restarted once healthy", async () => {
  const attention = "docs/launch/project-alpha-attention-state.json";
  const html = "docs/launch/PROJECT-ALPHA-OWNER-CONSOLE.html";
  const beforeAttention = createHash("sha256").update(readFileSync(attention)).digest("hex");
  const beforeHtml = createHash("sha256").update(readFileSync(html)).digest("hex");
  const first = ensureOwnerDesk();
  const opened = await fetch("http://127.0.0.1:4177/status").then((response) => response.json());
  const repeats = [];
  for (let pass = 0; pass < 3; pass += 1) repeats.push(ensureOwnerDesk());
  const seen = await health(4177);
  const afterStatus = await fetch("http://127.0.0.1:4177/status").then((response) => response.json());
  const evidence = {
    firstAction: first.action,
    firstReason: first.reason,
    firstPid: first.pid,
    previousPid: first.previousPid,
    repeatActions: repeats.map((result) => result.action),
    repeatPids: repeats.map((result) => result.pid),
    healthStatus: seen.status,
    healthService: seen.body.service,
    healthPid: seen.body.pid,
    statusOk: afterStatus.ok === true,
    workState: afterStatus.workState,
    workStateUnchanged: opened.workState === afterStatus.workState,
    acknowledgementUnchanged: opened.acknowledgedAt === afterStatus.acknowledgedAt,
    attentionUnchanged: createHash("sha256").update(readFileSync(attention)).digest("hex") === beforeAttention,
    pageUnchanged: createHash("sha256").update(readFileSync(html)).digest("hex") === beforeHtml,
  };
  writeFileSync(path.join(tmpdir(), "owner-desk-keeper-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  assert.ok(["kept", "started", "recovered"].includes(first.action));
  assert.equal(seen.body.service, OWNER_DESK_SERVICE);
  assert.equal(seen.body.pid, first.pid);
  assert.deepEqual(evidence.repeatActions, ["kept", "kept", "kept"]);
  assert.deepEqual(evidence.repeatPids, [first.pid, first.pid, first.pid]);
  assert.equal(evidence.acknowledgementUnchanged, true);
  assert.equal(evidence.attentionUnchanged, true);
  assert.equal(evidence.pageUnchanged, true);
  assert.equal(evidence.workStateUnchanged, true);
});

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
