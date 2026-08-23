/**
 * Runtime Pass 2 — live controlled proof.
 * Fictional work only. No browser. No interactive login. Hard-stops in 90 seconds.
 *
 * Usage: node scripts/prove-supervision-runtime-pass-2.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const HARD_STOP_MS = 90_000;
const ACTION_TIMEOUT_MS = 15_000;
const AUTH_HEADER = "x-studio-operating-secret";
const DEV_PROOF_SECRET = "studio-supervision-dev-proof-only";
const OUT_DIR = path.resolve(
  "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/review-evidence",
);

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

function fail(message) {
  throw new Error(message);
}

function secret() {
  return process.env.STUDIO_OPERATING_SWEEP_SECRET?.trim() || DEV_PROOF_SECRET;
}

async function post(urlPath, body, extraHeaders = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ACTION_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${BASE}${urlPath}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [AUTH_HEADER]: secret(),
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    fail(
      `POST ${urlPath} stalled or failed within ${ACTION_TIMEOUT_MS}ms: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  } finally {
    clearTimeout(timer);
  }
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function incidentHtml(incident, title) {
  const recovery = (incident.recoveryAttempts ?? [])
    .map(
      (attempt) =>
        `<li>${attempt.at} · ${attempt.strategy} · ${attempt.result} · ${attempt.detail}</li>`,
    )
    .join("");
  const history = (incident.history ?? [])
    .map(
      (event) =>
        `<li>${event.at} · ${event.actor} · ${event.type} · ${event.summary}</li>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; background: #111; color: #f4f1ea; padding: 24px; }
    h1 { font-size: 22px; }
    dt { font-weight: 700; margin-top: 12px; }
    dd { margin-left: 0; }
  </style>
</head>
<body>
  <p>Incident Command evidence · fictional fixture · Runtime Pass 2</p>
  <h1>${incident.customerLabel ?? ""} · ${incident.incidentId}</h1>
  <dl>
    <dt>Severity / state</dt><dd>${incident.severity} · ${incident.state} · ownerEscalated=${incident.ownerEscalated}</dd>
    <dt>Customer and project</dt><dd>${incident.customerLabel} (${incident.customerId}). Project ${incident.projectId}. Campaign ${incident.campaignId}.</dd>
    <dt>Failed or stalled step</dt><dd>${incident.failedOrStalledStep}</dd>
    <dt>Last healthy / last heartbeat</dt><dd>${incident.lastHealthyAt} / ${incident.lastHeartbeatAt}</dd>
    <dt>Owner decision</dt><dd>${incident.ownerDecisionRequired}</dd>
    <dt>If Owner does nothing</dt><dd>${incident.ifOwnerDoesNothing}</dd>
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
  const proof = { ok: false, scenarios: {}, limits: [] };

  const unauth = await post("/api/operating/supervision/register", { kind: "FINITE_WORK" });
  // The helper always sends the secret. Probe without it separately:
  const unauthRes = await fetch(`${BASE}/api/operating/supervision/sweep`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  proof.scenarios.authDeniedWithoutSecret = unauthRes.status === 401;
  if (!proof.scenarios.authDeniedWithoutSecret) {
    fail(`Sweep without secret returned HTTP ${unauthRes.status}, expected 401.`);
  }
  void unauth;

  const finite = await post("/api/operating/supervision/register", {
    leaseId: `lease_proof_finite_${stamp}`,
    kind: "FINITE_WORK",
    workerId: "scout_proof_finite",
    providerId: "scout",
    ...maple,
    step: "draft_homepage_headline",
    branch: "operating/work-supervision-and-incident-escalation-1",
    commit: "0dc769038518a31db91346a6164c58a27a3f2239",
    heartbeatIntervalMs: 250,
    graceMs: 50,
  });
  if (finite.status !== 200) fail(`Finite register failed: HTTP ${finite.status}`);
  const finiteId = finite.json.lease.leaseId;
  const finiteBeat = await post(
    "/api/operating/supervision/heartbeat",
    {
      leaseId: finiteId,
      reportedStatus: "working",
      customerId: maple.customerId,
      projectId: maple.projectId,
      evidenceSummary: "Draft in progress.",
      branch: "operating/work-supervision-and-incident-escalation-1",
      commit: "0dc769038518a31db91346a6164c58a27a3f2239",
    },
    { "idempotency-key": `finite-${stamp}` },
  );
  if (finiteBeat.status !== 200) {
    fail(`Finite heartbeat failed: HTTP ${finiteBeat.status} ${JSON.stringify(finiteBeat.json)}`);
  }
  proof.scenarios.healthyFiniteWork =
    finiteBeat.status === 200 && finiteBeat.json.machineComputedHealth === "ACTIVE";

  const service = await post("/api/operating/supervision/register", {
    leaseId: `lease_proof_service_${stamp}`,
    kind: "LONG_RUNNING_SERVICE",
    workerId: "svc_proof_watch",
    providerId: "machine",
    ...maple,
    step: "listen_for_intake_files",
    heartbeatIntervalMs: 250,
    graceMs: 50,
  });
  const serviceBeat = await post(
    "/api/operating/supervision/heartbeat",
    {
      leaseId: service.json.lease.leaseId,
      reportedStatus: "service_awake",
      evidenceSummary: "Detached service is awake.",
    },
    { "idempotency-key": `service-${stamp}` },
  );
  proof.scenarios.healthyLongRunningService =
    serviceBeat.json.machineComputedHealth === "SERVICE_AWAKE";

  const waiting = await post("/api/operating/supervision/register", {
    leaseId: `lease_proof_waiting_${stamp}`,
    kind: "FINITE_WORK",
    workerId: "scout_proof_wait",
    providerId: "scout",
    ...maple,
    step: "wait_for_owner_notes",
  });
  const waitingBeat = await post(
    "/api/operating/supervision/heartbeat",
    {
      leaseId: waiting.json.lease.leaseId,
      reportedStatus: "waiting_for_owner",
      waitingReason: "Owner must approve the proof.",
    },
    { "idempotency-key": `wait-${stamp}` },
  );
  proof.scenarios.waitingForOwnerNotWorking =
    waitingBeat.json.machineComputedHealth === "WAITING";

  const claude = await post("/api/operating/supervision/register", {
    leaseId: `lease_proof_claude_${stamp}`,
    kind: "LONG_RUNNING_SERVICE",
    workerId: "claude_verifier",
    providerId: "claude",
    coverageConnected: true,
    ...maple,
    step: "verify_incident",
  });
  proof.scenarios.unconnectedProviderCoverageNotConnected =
    claude.json.lease.health === "COVERAGE_NOT_CONNECTED" &&
    claude.json.lease.coverageConnected === false;

  const mismatch = await post("/api/operating/supervision/register", {
    leaseId: `lease_proof_mismatch_${stamp}`,
    kind: "FINITE_WORK",
    workerId: "scout_proof_mismatch",
    providerId: "scout",
    ...maple,
    step: "draft_on_wrong_commit",
    branch: "operating/work-supervision-and-incident-escalation-1",
    commit: "0dc769038518a31db91346a6164c58a27a3f2239",
  });
  await post(
    "/api/operating/supervision/heartbeat",
    {
      leaseId: mismatch.json.lease.leaseId,
      reportedStatus: "working",
      branch: "wrong-branch",
      commit: "deadbeef",
    },
    { "idempotency-key": `mismatch-${stamp}` },
  );

  const recover = await post("/api/operating/supervision/register", {
    leaseId: `lease_proof_recover_${stamp}`,
    kind: "FINITE_WORK",
    workerId: "scout_proof_recover",
    providerId: "scout",
    ...maple,
    step: "proofread_email",
    heartbeatIntervalMs: 250,
    graceMs: 50,
  });
  const failLease = await post("/api/operating/supervision/register", {
    leaseId: `lease_proof_fail_${stamp}`,
    kind: "FINITE_WORK",
    workerId: "scout_proof_fail",
    providerId: "scout",
    ...harbor,
    step: "upload_final_files",
    heartbeatIntervalMs: 250,
    graceMs: 50,
  });
  const dead = await post("/api/operating/supervision/register", {
    leaseId: `lease_proof_dead_${stamp}`,
    kind: "LONG_RUNNING_SERVICE",
    workerId: "svc_proof_dead",
    providerId: "machine",
    ...harbor,
    step: "keep_renderer_awake",
    heartbeatIntervalMs: 250,
    graceMs: 50,
  });

  await sleep(400);
  const stallSweep = await post("/api/operating/supervision/sweep", {});
  const stallHealth = stallSweep.json.sweep.leaseHealth;
  proof.scenarios.stoppedHeartbeatStalled = stallHealth[recover.json.lease.leaseId] === "STALLED";
  proof.scenarios.deadServiceIncident = stallHealth[dead.json.lease.leaseId] === "STALLED";
  proof.scenarios.branchCommitMismatch = stallSweep.json.sweep.mismatches.includes(
    mismatch.json.lease.leaseId,
  );

  await post(
    "/api/operating/supervision/heartbeat",
    {
      leaseId: recover.json.lease.leaseId,
      reportedStatus: "working",
      evidenceSummary: "Worker resumed after Machine requested a heartbeat.",
    },
    { "idempotency-key": `recover-resume-${stamp}` },
  );
  const recoveredSweep = await post("/api/operating/supervision/sweep", {});
  const recoveredIncident = recoveredSweep.json.incidents.find(
    (row) => row.failedOrStalledStep === "proofread_email",
  );
  proof.scenarios.routineRecoveryWithoutOwner =
    recoveredIncident?.state === "RESOLVED" && recoveredIncident?.ownerEscalated === false;

  const dupKey = `dup-${stamp}`;
  await post(
    "/api/operating/supervision/heartbeat",
    {
      leaseId: finiteId,
      reportedStatus: "working",
    },
    { "idempotency-key": dupKey },
  );
  const dup = await post(
    "/api/operating/supervision/heartbeat",
    {
      leaseId: finiteId,
      reportedStatus: "working",
    },
    { "idempotency-key": dupKey },
  );
  await post("/api/operating/supervision/sweep", {});
  const dupSweep = await post("/api/operating/supervision/sweep", {});
  const mapleIncidents = dupSweep.json.incidents.filter(
    (row) => row.customerId === maple.customerId && row.failedOrStalledStep === "draft_homepage_headline",
  );
  proof.scenarios.duplicateHeartbeatsDoNotDuplicateIncidents =
    dup.json.ignored === true && mapleIncidents.length <= 1;

  const remaining = HARD_STOP_MS - (Date.now() - started) - 5_000;
  if (remaining < 32_000) fail("Not enough time left for the recovery-failure window.");
  await sleep(31_000);
  const failedSweep = await post("/api/operating/supervision/sweep", {});
  const failedIncident = failedSweep.json.incidents.find(
    (row) => row.failedOrStalledStep === "upload_final_files",
  );
  proof.scenarios.recoveryFailureCreatesOwnerIncident =
    failedIncident?.ownerEscalated === true &&
    failedIncident?.state === "ESCALATED" &&
    failedIncident?.ownerDecisionRequired &&
    failedIncident.ownerDecisionRequired !== "none";

  proof.scenarios.machineComputesHealth = Object.values(proof.scenarios).every(Boolean);
  proof.ok = proof.scenarios.machineComputesHealth;
  proof.elapsedMs = Date.now() - started;
  proof.failedIncident = failedIncident ?? null;
  proof.limits = [
    "Claude NOT CONNECTED",
    "Build-A-Bot NOT CONNECTED",
    "Make NOT ACTIVE",
    "Resend PARKED",
    "No external scheduler. In-process sweep dies with the Node process.",
    "No proven out-of-band alert",
  ];

  if (!proof.ok) fail(`Live proof failed: ${JSON.stringify(proof.scenarios, null, 2)}`);

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    path.join(OUT_DIR, "runtime-pass-2-proof.json"),
    `${JSON.stringify(proof, null, 2)}\n`,
  );
  await writeFile(
    path.join(OUT_DIR, "sample-machine-computed-incident.json"),
    `${JSON.stringify(failedIncident, null, 2)}\n`,
  );
  await writeFile(
    path.join(OUT_DIR, "owner-evidence-failed-recovery.html"),
    incidentHtml(
      failedIncident,
      "Owner Incident Command evidence · failed routine recovery",
    ),
  );
  process.stdout.write(
    `Runtime Pass 2 live proof PASS in ${proof.elapsedMs}ms. Evidence written under review-evidence/.\n`,
  );
}

const hardStop = setTimeout(() => {
  fail("Runtime Pass 2 proof exceeded the 90 second hard stop.");
}, HARD_STOP_MS);

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    clearTimeout(hardStop);
  });
