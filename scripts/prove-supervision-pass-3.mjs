/**
 * Durable Pass 3 — controlled persistence and restart proof.
 * Fictional work only. No browser. No interactive login.
 *
 * The Node process exits in this file are intentional stops of a dedicated
 * proof server. They are not accidental stalls.
 *
 * Usage: node scripts/prove-supervision-pass-3.mjs
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO = process.cwd();
const HARD_STOP_MS = 240_000;
const ACTION_TIMEOUT_MS = 20_000;
const AUTH_HEADER = "x-studio-operating-secret";
const DEV_PROOF_SECRET = "studio-supervision-dev-proof-only";
const PORT = Number(process.env.PASS3_PROOF_PORT ?? 3000);
const BASE = `http://127.0.0.1:${PORT}`;
const STORE_ROOT = path.join(REPO, "data", "supervision");
const OUT_DIR = path.resolve(
  "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/review-evidence",
);
const NEXT_BIN = path.join(REPO, "node_modules", "next", "dist", "bin", "next");

const maple = {
  customerId: "cust_proof_maple",
  customerLabel: "Maple & Pine Books (fixture)",
  projectId: "proj_proof_maple",
  campaignId: "camp_proof_maple",
};

const harbor = {
  customerId: "cust_proof_harbor",
  customerLabel: "Harbor Lantern Co. (fixture)",
  projectId: "proj_proof_harbor",
  campaignId: "camp_proof_harbor",
};

const stamp = Date.now();
const fileRestartDir = path.join(os.tmpdir(), `studio-supervision-pass-3-files-${stamp}`);

function fail(message) {
  throw new Error(message);
}

function secret() {
  return process.env.STUDIO_OPERATING_SWEEP_SECRET?.trim() || DEV_PROOF_SECRET;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envKeyPresent(name) {
  const files = [path.join(REPO, ".env.local"), path.join(REPO, ".env")];
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
      const eq = line.indexOf("=");
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key === name && value) return true;
    }
  }
  return Boolean(process.env[name]?.trim());
}

function twoProcessFileRestart() {
  mkdirSync(path.join(fileRestartDir, "leases"), { recursive: true });
  const schema = {
    schemaVersion: 1,
    provider: "studio-data-json",
    mechanism: "Studio data/ JSON store with atomic replace and append-only jsonl",
    supabaseRecordStore:
      "not used — Supabase in this repo is private file storage only and is not configured for records",
  };
  const writer = `
    const fs = require('fs');
    const path = require('path');
    const dir = process.env.P3_DIR;
    fs.mkdirSync(path.join(dir, 'leases'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'SCHEMA.json'), process.env.P3_SCHEMA);
    fs.writeFileSync(
      path.join(dir, 'leases', 'lease_process_a.json'),
      JSON.stringify({ leaseId: 'lease_process_a', step: 'intentional_exit' })
    );
    process.stdout.write('process-a-exit-intentional');
  `;
  const written = spawnSync(process.execPath, ["-e", writer], {
    encoding: "utf8",
    env: { ...process.env, P3_DIR: fileRestartDir, P3_SCHEMA: `${JSON.stringify(schema, null, 2)}\n` },
  });
  if (written.status !== 0) {
    fail(`Process A failed: ${written.stderr || written.stdout}`);
  }
  const reader = `
    const fs = require('fs');
    const path = require('path');
    const dir = process.env.P3_DIR;
    const schema = JSON.parse(fs.readFileSync(path.join(dir, 'SCHEMA.json'), 'utf8'));
    const lease = JSON.parse(fs.readFileSync(path.join(dir, 'leases', 'lease_process_a.json'), 'utf8'));
    if (schema.provider !== 'studio-data-json') process.exit(3);
    if (lease.leaseId !== 'lease_process_a') process.exit(4);
    process.stdout.write('process-b-restored-after-intentional-exit');
  `;
  const read = spawnSync(process.execPath, ["-e", reader], {
    encoding: "utf8",
    env: { ...process.env, P3_DIR: fileRestartDir },
  });
  if (read.status !== 0) {
    fail(`Process B failed: ${read.stderr || read.stdout}`);
  }
  return {
    processA: written.stdout.trim(),
    processB: read.stdout.trim(),
    note: "Process A exited intentionally (exit 0). Process B started after A terminated. This was not an accidental stall.",
  };
}

async function request(method, urlPath, body, extraHeaders = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ACTION_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${BASE}${urlPath}`, {
      method,
      headers: {
        "content-type": "application/json",
        [AUTH_HEADER]: secret(),
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    fail(
      `${method} ${urlPath} failed within ${ACTION_TIMEOUT_MS}ms: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  } finally {
    clearTimeout(timer);
  }
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function pidOnPort(port) {
  const result = spawnSync("netstat", ["-ano"], { encoding: "utf8" });
  const needle = `:${port}`;
  const line = (result.stdout ?? "")
    .split(/\r?\n/)
    .find((row) => row.includes(needle) && /LISTENING/i.test(row));
  if (!line) return null;
  const pid = Number(line.trim().split(/\s+/).pop());
  return Number.isFinite(pid) ? pid : null;
}

function stopProcessTree(childOrPid) {
  const pid = typeof childOrPid === "number" ? childOrPid : childOrPid?.pid;
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  if (typeof childOrPid !== "number" && childOrPid.kill) childOrPid.kill("SIGTERM");
}

function startNext() {
  if (!existsSync(NEXT_BIN)) fail("next binary is missing under node_modules.");
  const logPath = path.join(os.tmpdir(), `studio-supervision-pass-3-next-${PORT}.log`);
  writeFileSync(logPath, "");
  const child = spawn(process.execPath, [NEXT_BIN, "dev", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: REPO,
    env: {
      ...process.env,
      STUDIO_SUPERVISION_DISABLE_LIVE_SWEEP: "1",
      STUDIO_SUPERVISION_REQUIRE_DURABLE: "1",
      PORT: String(PORT),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const append = (chunk) => {
    writeFileSync(logPath, chunk, { flag: "a" });
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.on("exit", (code, signal) => {
    append(`\n[exit code=${code} signal=${signal}]\n`);
  });
  child.logPath = logPath;
  return child;
}

async function waitUntilReady(label, child) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child?.exitCode != null) {
      const log = child.logPath && existsSync(child.logPath)
        ? readFileSync(child.logPath, "utf8").slice(-4000)
        : "";
      fail(`${label} exited before becoming ready. Log:\n${log}`);
    }
    try {
      const res = await fetch(`${BASE}/api/operating/supervision/snapshot`, {
        method: "GET",
        headers: { "content-type": "application/json" },
      });
      if ([200, 401, 403, 404, 500].includes(res.status)) {
        if (res.status === 401 || res.status === 200) return;
      }
    } catch {
      // Dedicated proof server is still starting.
    }
    await sleep(500);
  }
  const log = child?.logPath && existsSync(child.logPath)
    ? readFileSync(child.logPath, "utf8").slice(-4000)
    : "";
  fail(`${label} did not become ready on ${BASE} within 90s. Log:\n${log}`);
}

function commandHtml(snapshot, title) {
  const section = (view) => {
    const cards = (view.incidentCards ?? [])
      .map(
        (card) =>
          `<article><p>${card.severity} · ${card.state} · ${view.recordSource}</p><h2>${card.customerLabel}</h2><p>${card.whatHappened}</p><p>${card.whoOrWhatStalled}</p></article>`,
      )
      .join("");
    return `<section><h2>${view.recordSource === "live" ? "Persisted live records" : "Fictional fixtures"}</h2><p>${view.sourceLabel}</p>${cards || "<p>No incident records are in this set.</p>"}</section>`;
  };
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; background: #111; color: #f4f1ea; padding: 24px; }
    section { border: 1px solid #444; padding: 16px; margin: 16px 0; }
  </style>
</head>
<body>
  <p>Incident Command evidence · Durable Pass 3 · no interactive browser login</p>
  <p>Fixture records and persisted live records are shown in separate sets. They are never mixed.</p>
  ${section(snapshot.fixture)}
  ${section(snapshot.live)}
</body>
</html>
`;
}

function incidentHtml(incident, title) {
  const recovery = (incident.recoveryAttempts ?? [])
    .map((attempt) => `<li>${attempt.at} · ${attempt.strategy} · ${attempt.result} · ${attempt.detail}</li>`)
    .join("");
  const history = (incident.history ?? [])
    .map((event) => `<li>${event.at} · ${event.actor} · ${event.type} · ${event.summary}</li>`)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; background: #111; color: #f4f1ea; padding: 24px; }
  </style>
</head>
<body>
  <p>Incident Command evidence · fictional persisted live record · Durable Pass 3</p>
  <h1>${incident.customerLabel ?? ""} · ${incident.incidentId}</h1>
  <dl>
    <dt>Severity / state</dt><dd>${incident.severity} · ${incident.state} · ownerEscalated=${incident.ownerEscalated}</dd>
    <dt>Next check</dt><dd>${incident.nextCheckAt}</dd>
    <dt>Recovery attempts</dt><dd><ul>${recovery || "<li>None recorded in this extract.</li>"}</ul></dd>
    <dt>History</dt><dd><ol>${history || "<li>See JSON evidence for full append-only history.</li>"}</ol></dd>
  </dl>
</body>
</html>
`;
}

async function main() {
  const started = Date.now();
  mkdirSync(OUT_DIR, { recursive: true });

  const proof = {
    ok: false,
    persistenceProvider: "studio-data-json",
    supabaseRecordStore: "not used",
    configuration: {
      studioDataJson: true,
      supabaseUrlConfigured: envKeyPresent("NEXT_PUBLIC_SUPABASE_URL"),
      supabaseServiceRoleConfigured: envKeyPresent("SUPABASE_SERVICE_ROLE_KEY"),
      databaseUrlConfigured: envKeyPresent("DATABASE_URL"),
    },
    twoProcessRestart: twoProcessFileRestart(),
    scenarios: {},
    limits: [],
    nodeStops: [],
  };

  if (proof.configuration.databaseUrlConfigured) {
    fail("DATABASE_URL is present, but Pass 3 selected studio-data-json. Stop and re-evaluate before claiming Postgres.");
  }

  let server = null;
  let leaveServerRunning = false;
  try {
    const alreadyUp = await fetch(`${BASE}/api/operating/supervision/snapshot`, {
      method: "GET",
      headers: { "content-type": "application/json" },
    }).then((res) => res.status === 401 || res.status === 200).catch(() => false);
    if (alreadyUp) {
      const existingPid = pidOnPort(PORT);
      proof.nodeStops.push({
        at: new Date().toISOString(),
        kind: "intentional_next_stop_to_disable_live_sweep",
        pid: existingPid,
        note: "The worktree Next process was stopped on purpose so Pass 3 could restart it with the in-process live sweep disabled. This was not an accidental stall.",
      });
      if (existingPid) stopProcessTree(existingPid);
      await sleep(1_000);
    }
    server = startNext();
    await waitUntilReady("Pass 3 Next process with live sweep disabled", server);

    const unauth = await fetch(`${BASE}/api/operating/supervision/sweep`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    proof.scenarios.authDeniedWithoutSecret = unauth.status === 401;
    if (!proof.scenarios.authDeniedWithoutSecret) {
      fail(`Sweep without secret returned HTTP ${unauth.status}, expected 401.`);
    }

    const finite = await request("POST", "/api/operating/supervision/register", {
      leaseId: `lease_p3_finite_${stamp}`,
      kind: "FINITE_WORK",
      workerId: "scout_p3_finite",
      providerId: "scout",
      ...maple,
      step: "draft_homepage_headline",
      heartbeatIntervalMs: 250,
      graceMs: 50,
    });
    if (finite.status !== 200) fail(`Finite register failed: HTTP ${finite.status}`);
    const persisted = await request("GET", "/api/operating/supervision/snapshot");
    if (
      persisted.status !== 200 ||
      !persisted.json.live?.healthyLeases?.some((lease) => lease.leaseId === finite.json.lease.leaseId)
    ) {
      fail("Live Machine did not persist the registered lease to the durable store.");
    }
    await request(
      "POST",
      "/api/operating/supervision/heartbeat",
      {
        leaseId: finite.json.lease.leaseId,
        reportedStatus: "working",
        customerId: maple.customerId,
        projectId: maple.projectId,
        evidenceSummary: "Draft in progress.",
      },
      { "idempotency-key": `finite-${stamp}` },
    );

    const recover = await request("POST", "/api/operating/supervision/register", {
      leaseId: `lease_p3_recover_${stamp}`,
      kind: "FINITE_WORK",
      workerId: "scout_p3_recover",
      providerId: "scout",
      ...maple,
      step: "proofread_email",
      heartbeatIntervalMs: 250,
      graceMs: 50,
    });
    await request(
      "POST",
      "/api/operating/supervision/heartbeat",
      { leaseId: recover.json.lease.leaseId, reportedStatus: "working" },
      { "idempotency-key": `recover-${stamp}` },
    );

    const failLease = await request("POST", "/api/operating/supervision/register", {
      leaseId: `lease_p3_fail_${stamp}`,
      kind: "FINITE_WORK",
      workerId: "scout_p3_fail",
      providerId: "scout",
      ...harbor,
      step: "upload_final_files",
      heartbeatIntervalMs: 250,
      graceMs: 50,
    });
    await request(
      "POST",
      "/api/operating/supervision/heartbeat",
      { leaseId: failLease.json.lease.leaseId, reportedStatus: "working" },
      { "idempotency-key": `fail-${stamp}` },
    );

    const service = await request("POST", "/api/operating/supervision/register", {
      leaseId: `lease_p3_service_${stamp}`,
      kind: "LONG_RUNNING_SERVICE",
      workerId: "svc_p3_watch",
      providerId: "machine",
      ...maple,
      step: "listen_for_intake_files",
      heartbeatIntervalMs: 250,
      graceMs: 50,
    });
    await request(
      "POST",
      "/api/operating/supervision/heartbeat",
      { leaseId: service.json.lease.leaseId, reportedStatus: "service_awake" },
      { "idempotency-key": `service-${stamp}` },
    );

    const waiting = await request("POST", "/api/operating/supervision/register", {
      leaseId: `lease_p3_waiting_${stamp}`,
      kind: "FINITE_WORK",
      workerId: "scout_p3_wait",
      providerId: "scout",
      ...maple,
      step: "wait_for_owner_notes",
    });
    await request(
      "POST",
      "/api/operating/supervision/heartbeat",
      {
        leaseId: waiting.json.lease.leaseId,
        reportedStatus: "waiting_for_owner",
        waitingReason: "Owner must approve the proof.",
      },
      { "idempotency-key": `wait-${stamp}` },
    );

    await sleep(800);
    const stallSweep = await request("POST", "/api/operating/supervision/sweep", {});
    if (stallSweep.status !== 200) fail(`First sweep failed: HTTP ${stallSweep.status}`);

    await request(
      "POST",
      "/api/operating/supervision/heartbeat",
      {
        leaseId: recover.json.lease.leaseId,
        reportedStatus: "working",
        evidenceSummary: "Worker resumed after Machine requested a heartbeat.",
      },
      { "idempotency-key": `recover-resume-${stamp}` },
    );
    const recoveredSweep = await request("POST", "/api/operating/supervision/sweep", {});
    const routineIncident = recoveredSweep.json.incidents.find(
      (row) => row.leaseId === recover.json.lease.leaseId,
    );
    proof.scenarios.routineIncident =
      routineIncident?.state === "RESOLVED" && routineIncident?.ownerEscalated === false;

    await request(
      "POST",
      "/api/operating/supervision/heartbeat",
      {
        leaseId: waiting.json.lease.leaseId,
        reportedStatus: "waiting_for_owner",
        waitingReason: "Owner must approve the proof.",
      },
      { "idempotency-key": `wait-hold-${stamp}` },
    );

    const remaining = HARD_STOP_MS - (Date.now() - started) - 90_000;
    if (remaining < 32_000) fail("Not enough time left for the recovery-failure window.");
    const waitUntil = Date.now() + 31_000;
    let keepAlive = 0;
    while (Date.now() < waitUntil) {
      await request(
        "POST",
        "/api/operating/supervision/heartbeat",
        { leaseId: recover.json.lease.leaseId, reportedStatus: "working" },
        { "idempotency-key": `recover-wait-${stamp}-${keepAlive}` },
      );
      keepAlive += 1;
      await sleep(200);
    }
    await request(
      "POST",
      "/api/operating/supervision/heartbeat",
      {
        leaseId: waiting.json.lease.leaseId,
        reportedStatus: "waiting_for_owner",
        waitingReason: "Owner must approve the proof.",
      },
      { "idempotency-key": `wait-before-fail-sweep-${stamp}` },
    );
    const failedSweep = await request("POST", "/api/operating/supervision/sweep", {});
    const escalatedIncident = failedSweep.json.incidents.find(
      (row) => row.leaseId === failLease.json.lease.leaseId,
    );
    proof.scenarios.escalatedIncident =
      escalatedIncident?.ownerEscalated === true && escalatedIncident?.state === "ESCALATED";

    await request(
      "POST",
      "/api/operating/supervision/heartbeat",
      { leaseId: service.json.lease.leaseId, reportedStatus: "service_awake" },
      { "idempotency-key": `service-before-stop-${stamp}` },
    );

    const downtime = await request("POST", "/api/operating/supervision/register", {
      leaseId: `lease_p3_downtime_${stamp}`,
      kind: "FINITE_WORK",
      workerId: "scout_p3_downtime",
      providerId: "scout",
      ...maple,
      step: "assemble_set_during_downtime",
      heartbeatIntervalMs: 250,
      graceMs: 50,
    });
    await request(
      "POST",
      "/api/operating/supervision/heartbeat",
      { leaseId: downtime.json.lease.leaseId, reportedStatus: "working" },
      { "idempotency-key": `downtime-before-stop-${stamp}` },
    );

    const watchedLeaseIds = new Set([
      finite.json.lease.leaseId,
      recover.json.lease.leaseId,
      failLease.json.lease.leaseId,
      service.json.lease.leaseId,
      waiting.json.lease.leaseId,
    ]);
    const beforeStop = failedSweep.json.incidents
      .filter((row) => watchedLeaseIds.has(row.leaseId))
      .map((row) => ({
      incidentId: row.incidentId,
      leaseId: row.leaseId,
      historyLength: row.history.length,
      recoveryAttempts: row.recoveryAttempts.length,
      nextCheckAt: row.nextCheckAt,
      state: row.state,
    }));
    const beforeIds = new Set(beforeStop.map((row) => row.incidentId));

    const stopPid = pidOnPort(PORT) ?? server?.pid;
    if (!stopPid) fail("Could not find the Next process to stop intentionally.");
    proof.nodeStops.push({
      at: new Date().toISOString(),
      kind: "intentional_next_stop",
      pid: stopPid,
      note: "The worktree Next process was stopped on purpose so durable files could be proven after restart. This was not an accidental stall.",
    });
    stopProcessTree(stopPid);
    server = null;
    await sleep(2_000);

    server = startNext();
    await waitUntilReady("Restarted Next process", server);
    leaveServerRunning = true;

    const reloaded = await request("POST", "/api/operating/supervision/reload", {});
    proof.scenarios.recordsSurvivedReload =
      reloaded.status === 200 &&
      reloaded.json.recordSource === "live" &&
      beforeIds.size > 0 &&
      beforeStop.every((row) =>
        reloaded.json.incidents.some(
          (incident) =>
            incident.incidentId === row.incidentId &&
            incident.leaseId === row.leaseId &&
            incident.historyLength >= row.historyLength &&
            incident.nextCheckAt === row.nextCheckAt,
        ),
      );

    const waitingLease = reloaded.json.leases.find(
      (lease) => lease.leaseId === waiting.json.lease.leaseId,
    );
    proof.scenarios.waitingForOwnerNotRelabeledWorking =
      waitingLease?.reportedStatus === "waiting_for_owner" &&
      waitingLease?.health === "WAITING";

    const serviceLease = reloaded.json.leases.find(
      (lease) => lease.leaseId === service.json.lease.leaseId,
    );
    proof.scenarios.serviceAwakeOnlyAfterHealthCheck =
      serviceLease?.health !== "SERVICE_AWAKE" && serviceLease?.serviceNeedsHealthCheck === true;

    const afterRestartSweep = await request("POST", "/api/operating/supervision/sweep", {});
    const afterIds = afterRestartSweep.json.incidents.map((row) => row.incidentId);
    const downtimeIncident = afterRestartSweep.json.incidents.find(
      (row) => row.leaseId === downtime.json.lease.leaseId,
    );
    proof.scenarios.downtimeMissedHeartbeatDetected = Boolean(downtimeIncident);
    proof.scenarios.noDuplicateIncidents =
      [...beforeIds].every((id) => afterIds.includes(id)) &&
      afterRestartSweep.json.incidents.filter(
        (row) => row.leaseId === failLease.json.lease.leaseId,
      ).length === 1;

    const secondSweep = await request("POST", "/api/operating/supervision/sweep", {});
    proof.scenarios.secondSweepDoesNotDuplicate =
      secondSweep.json.incidents.filter(
        (row) => row.leaseId === downtime.json.lease.leaseId,
      ).length === 1;

    const isolation = await request(
      "POST",
      "/api/operating/supervision/heartbeat",
      {
        leaseId: finite.json.lease.leaseId,
        reportedStatus: "working",
        customerId: harbor.customerId,
        projectId: maple.projectId,
      },
      { "idempotency-key": `isolate-${stamp}` },
    );
    proof.scenarios.crossCustomerBlocked = isolation.status === 403;

    const snapshot = await request("GET", "/api/operating/supervision/snapshot");
    proof.scenarios.fixtureLiveSeparated =
      snapshot.status === 200 &&
      snapshot.json.mixed === false &&
      snapshot.json.fixture.recordSource === "fixture" &&
      snapshot.json.live.recordSource === "live" &&
      !JSON.stringify(snapshot.json.fixture).includes("assemble_set_during_downtime") &&
      JSON.stringify(snapshot.json.live).includes("assemble_set_during_downtime");

    proof.scenarios.buildABotStillNotConnected =
      snapshot.json.live.providers.some(
        (port) => port.id === "build_a_bot" && port.status === "NOT_CONNECTED",
      ) &&
      snapshot.json.live.providers.every((port) => port.status === "NOT_CONNECTED");

    proof.ok = Object.values(proof.scenarios).every(Boolean);
    proof.elapsedMs = Date.now() - started;
    proof.dataDir = STORE_ROOT;
    proof.limits = [
      "Claude NOT CONNECTED",
      "Build-A-Bot NOT CONNECTED",
      "Make NOT ACTIVE",
      "Resend PARKED",
      "No external scheduler. Durable state now survives an intentional Node stop/start.",
      "No proven out-of-band alert",
    ];

    if (!proof.ok) fail(`Durable Pass 3 live proof failed: ${JSON.stringify(proof.scenarios, null, 2)}`);

    const schema = existsSync(path.join(STORE_ROOT, "SCHEMA.json"))
      ? readFileSync(path.join(STORE_ROOT, "SCHEMA.json"), "utf8")
      : "";
    writeFileSync(path.join(OUT_DIR, "pass-3-proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
    writeFileSync(path.join(OUT_DIR, "pass-3-schema.json"), schema || `${JSON.stringify({ missing: true })}\n`);
    writeFileSync(
      path.join(OUT_DIR, "pass-3-store-inventory.json"),
      `${JSON.stringify(
        {
          schema: existsSync(path.join(STORE_ROOT, "SCHEMA.json")),
          leases: existsSync(path.join(STORE_ROOT, "leases"))
            ? readdirSync(path.join(STORE_ROOT, "leases")).filter((file) => file.endsWith(".json"))
            : [],
          incidents: existsSync(path.join(STORE_ROOT, "incidents"))
            ? readdirSync(path.join(STORE_ROOT, "incidents"))
            : [],
          idempotency: existsSync(path.join(STORE_ROOT, "idempotency"))
            ? readdirSync(path.join(STORE_ROOT, "idempotency")).length
            : 0,
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      path.join(OUT_DIR, "owner-evidence-pass-3-command.html"),
      commandHtml(snapshot.json, "Owner Incident Command · fixture vs live"),
    );
    writeFileSync(
      path.join(OUT_DIR, "owner-evidence-pass-3-escalated.html"),
      incidentHtml(
        afterRestartSweep.json.incidents.find((row) => row.leaseId === failLease.json.lease.leaseId),
        "Owner Incident Command evidence · persisted escalated incident after restart",
      ),
    );
    process.stdout.write(
      `Durable Pass 3 live proof PASS in ${proof.elapsedMs}ms. Evidence written under review-evidence/.\n`,
    );
    if (server) {
      server.stdout?.destroy();
      server.stderr?.destroy();
      server.unref();
    }
  } finally {
    if (server && leaveServerRunning) {
      server.stdout?.destroy();
      server.stderr?.destroy();
      server.unref();
    } else if (server && !leaveServerRunning) {
      proof.nodeStops.push({
        at: new Date().toISOString(),
        kind: "intentional_failed_proof_cleanup_stop",
        note: "The proof server was stopped after a failed run. This was not an accidental stall.",
      });
      stopProcessTree(server);
    }
    try {
      rmSync(fileRestartDir, { recursive: true, force: true });
    } catch {
      // Proof copies already live under review-evidence.
    }
  }
}

const hardStop = setTimeout(() => {
  fail("Durable Pass 3 proof exceeded the 240 second hard stop.");
}, HARD_STOP_MS);

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    clearTimeout(hardStop);
  });
