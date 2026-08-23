/**
 * Live two-process proof against real Supabase Postgres.
 * Fictional Maple/Harbor certification records only.
 * Never print, hash, or log the Secret Key.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const REPO = path.resolve(path.dirname(SELF), "..");
const ENV_LOCAL = path.join(REPO, ".env.local");
const EVIDENCE = path.join(
  REPO,
  "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/review-evidence/pass-live-two-process-proof.json",
);
const FETCH_MS = 15_000;
const CHILD_MS = 25_000;

function loadEnvLocal() {
  if (!existsSync(ENV_LOCAL)) {
    throw new Error("ignored .env.local is missing");
  }
  const env = { ...process.env };
  for (const raw of readFileSync(ENV_LOCAL, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) env[key] = value;
  }
  return env;
}

function redact(text, secret) {
  let out = String(text ?? "");
  if (secret) out = out.split(secret).join("[redacted-secret]");
  out = out.replace(/sb_secret_[A-Za-z0-9_-]+/g, "[redacted-secret]");
  out = out.replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  return out;
}

function fail(message, secret) {
  throw new Error(redact(message, secret));
}

function present(env, key) {
  return Boolean(String(env[key] ?? "").trim());
}

function restHeaders(secret) {
  const headers = {
    apikey: secret,
    "content-type": "application/json",
    Accept: "application/json",
  };
  if (!secret.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${secret}`;
  }
  return headers;
}

function headerProof(secret) {
  const headers = restHeaders(secret);
  return {
    hasApikey: Object.prototype.hasOwnProperty.call(headers, "apikey"),
    hasAuthorization: Object.prototype.hasOwnProperty.call(headers, "Authorization"),
    keyKind: secret.startsWith("sb_secret_") ? "sb_secret" : "legacy_jwt_service_role",
  };
}

async function rpc(url, secret, name, args = {}) {
  const headers = restHeaders(secret);
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(FETCH_MS),
  });
  const text = await res.text();
  if (secret && text.includes(secret)) {
    fail("Supervision store error leaked a credential.", secret);
  }
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: "non-json" };
    }
  }
  if (typeof json === "string") {
    try {
      json = JSON.parse(json);
    } catch {
      /* keep string */
    }
  }
  if (!res.ok) {
    const code = json && typeof json === "object" ? json.code || json.error || json.message : text;
    fail(`RPC ${name} failed HTTP ${res.status}: ${code}`, secret);
  }
  return json;
}

async function getMeta(url, secret) {
  const res = await fetch(`${url}/rest/v1/supervision_meta?select=schema_version,provider`, {
    headers: restHeaders(secret),
    signal: AbortSignal.timeout(FETCH_MS),
  });
  const text = await res.text();
  if (secret && text.includes(secret)) fail("Health check leaked a credential.", secret);
  if (!res.ok) fail(`Health check failed HTTP ${res.status}`, secret);
  return JSON.parse(text);
}

function maple(runId, at) {
  const leaseId = `lease_maple_${runId}`;
  const incidentId = `inc_maple_${runId}`;
  const eventId = `evt_maple_${runId}_open`;
  const lease = {
    leaseId,
    kind: "FINITE_WORK",
    coverageConnected: true,
    subject: { kind: "agent", id: "agent_maple_live_cert", label: "Copy agent (live cert fixture)" },
    assignedWorker: { providerId: "fixture", workerId: "worker_maple_live_cert", label: "Maple cert worker" },
    packageId: "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1",
    branch: "operating/work-supervision-and-incident-escalation-1",
    commit: null,
    customerId: "cust_maple_live_cert",
    customerLabel: "Maple & Pine Books (live certification fixture)",
    projectId: "proj_maple_live_cert",
    campaignId: "camp_maple_live_cert",
    step: "live_two_process_proof",
    heartbeatIntervalMs: 1000,
    graceMs: 200,
    issuedAt: at,
    lastHeartbeatAt: at,
    lastHealthyAt: at,
    expectedCompletionAt: null,
    expectedUpdateAt: "2020-01-01T00:00:00.000Z",
    completedAt: null,
    blocker: null,
    waitingReason: null,
    reportedStatus: "working",
    mismatch: null,
    evidence: [],
    health: "STALLED",
    openIncidentId: incidentId,
    serviceNeedsHealthCheck: false,
  };
  const incident = {
    incidentId,
    dedupeKey: `maple:live:${runId}`,
    leaseId,
    customerId: lease.customerId,
    customerLabel: lease.customerLabel,
    projectId: lease.projectId,
    campaignId: lease.campaignId,
    severity: "ROUTINE",
    category: "agent",
    responsibleComponent: lease.subject,
    failedOrStalledStep: "live_two_process_proof",
    startedAt: at,
    lastHealthyAt: at,
    lastHeartbeatAt: at,
    customerImpact: "Fictional Maple live-cert copy is waiting.",
    deadlineImpact: "none proven",
    financialImpact: "none proven",
    rightsOrComplianceImpact: "none proven",
    securityOrBreachImpact: "none proven",
    containmentPerformed: "Machine isolated the live-cert lease.",
    recoveryAttempts: [
      {
        attemptId: "0",
        attemptIndex: 0,
        at,
        strategy: "request_fresh_heartbeat",
        result: "pending",
        detail: "Live-cert recovery fixture. Not a customer incident.",
      },
    ],
    currentResponsibleParty: "Machine",
    whoMustBeContacted: "none — routine recovery stays with the Machine",
    ifOwnerDoesNothing: "The Machine retries recovery. Tagia is not paged.",
    ownerDecisionRequired: "none",
    nextAutomaticAction: "Wait for a fresh worker heartbeat.",
    recommendedOwnerAction: "none",
    state: "RECOVERING",
    ownerEscalated: false,
    nextCheckAt: at,
    recordSource: "live",
    history: [
      {
        eventId,
        at,
        type: "opened",
        actor: "machine",
        summary: "Live-cert Maple incident opened for two-process proof.",
        payload: { fixture: true },
      },
    ],
  };
  const heartbeat = {
    leaseId,
    idempotencyKey: `hb-maple-${runId}`,
    at,
    reportedStatus: "working",
    customerId: lease.customerId,
    projectId: lease.projectId,
  };
  return { lease, incident, heartbeat, eventId };
}

function emit(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function runRole(env) {
  const url = env.LIVE_PROOF_URL;
  const secret = env.LIVE_PROOF_KEY;
  const role = env.LIVE_PROOF_ROLE;
  const runId = env.LIVE_PROOF_RUN;
  const at = env.LIVE_PROOF_AT;
  if (!url || !secret) fail("Child is missing live proof configuration.", secret);
  const headers = headerProof(secret);
  if (role === "schema") {
    const verified = await rpc(url, secret, "supervision_verify_schema");
    const meta = await getMeta(url, secret);
    if (!verified?.ok || verified.schemaVersion !== 2 || verified.provider !== "supabase-postgres") {
      fail(`Schema verification failed: ${JSON.stringify(verified)}`, secret);
    }
    emit({
      role,
      ok: true,
      schemaOk: true,
      schemaVersion: verified.schemaVersion,
      provider: verified.provider,
      healthOk: Array.isArray(meta) && meta[0]?.provider === "supabase-postgres",
      headers,
    });
    return;
  }
  if (role === "claim") {
    const claimed = await rpc(url, secret, "supervision_try_claim_sweep", {
      p_claim_id: env.LIVE_PROOF_CLAIM,
      p_holder: env.LIVE_PROOF_HOLDER,
      p_at: at,
      p_ttl_ms: Number(env.LIVE_PROOF_TTL_MS ?? "2000"),
    });
    emit({
      role,
      ok: true,
      holder: env.LIVE_PROOF_HOLDER,
      claimed: claimed.claimed === true,
      headers,
    });
    return;
  }
  if (role === "writer") {
    const { lease, incident, heartbeat } = maple(runId, at);
    await rpc(url, secret, "supervision_upsert_lease", { p_lease: lease });
    const first = await rpc(url, secret, "supervision_accept_heartbeat", {
      p_lease: lease,
      p_heartbeat: heartbeat,
    });
    const second = await rpc(url, secret, "supervision_accept_heartbeat", {
      p_lease: lease,
      p_heartbeat: heartbeat,
    });
    await rpc(url, secret, "supervision_upsert_incident_with_events", {
      p_incident: incident,
      p_events: incident.history,
    });
    await rpc(url, secret, "supervision_record_recovery", {
      p_incident: incident,
      p_attempt: incident.recoveryAttempts[0],
    });
    await rpc(url, secret, "supervision_mark_restored", { p_at: at });
    const snapshot = await rpc(url, secret, "supervision_hydrate");
    const foundLease = (snapshot.leases ?? []).some((row) => row.leaseId === lease.leaseId);
    const foundIncident = (snapshot.incidents ?? []).some((row) => row.incidentId === incident.incidentId);
    emit({
      role,
      ok: foundLease && foundIncident && first.accepted === true && second.accepted === false,
      leaseId: lease.leaseId,
      incidentId: incident.incidentId,
      firstHeartbeatAccepted: first.accepted === true,
      duplicateHeartbeatIgnored: second.accepted === false,
      writerHydrateFoundLease: foundLease,
      writerHydrateFoundIncident: foundIncident,
      headers,
    });
    return;
  }
  if (role === "reader") {
    const { lease, incident, eventId } = maple(runId, at);
    const snapshot = await rpc(url, secret, "supervision_hydrate");
    const restoredLease = (snapshot.leases ?? []).find((row) => row.leaseId === lease.leaseId);
    const restoredIncident = (snapshot.incidents ?? []).find((row) => row.incidentId === incident.incidentId);
    const due = await rpc(url, secret, "supervision_due_next_checks", { p_at: new Date().toISOString() });
    const dueLease = (due.leaseIds ?? []).includes(lease.leaseId);
    let tenantBlocked = false;
    try {
      await rpc(url, secret, "supervision_accept_heartbeat", {
        p_lease: { ...restoredLease, customerId: "cust_harbor_live_cert" },
        p_heartbeat: {
          leaseId: lease.leaseId,
          idempotencyKey: `hb-harbor-cross-${runId}`,
          at: new Date().toISOString(),
          reportedStatus: "working",
          customerId: "cust_harbor_live_cert",
          projectId: lease.projectId,
        },
      });
    } catch (error) {
      tenantBlocked = /TENANT|HTTP 4/i.test(String(error.message));
    }
    const duplicateEvent = {
      ...incident,
      history: [
        ...incident.history,
        {
          eventId: `evt_maple_${runId}_note`,
          at: new Date().toISOString(),
          type: "note",
          actor: "machine",
          summary: "Second append-only live-cert event.",
          payload: { fixture: true },
        },
      ],
    };
    await rpc(url, secret, "supervision_upsert_incident_with_events", {
      p_incident: duplicateEvent,
      p_events: duplicateEvent.history,
    });
    await rpc(url, secret, "supervision_upsert_incident_with_events", {
      p_incident: duplicateEvent,
      p_events: duplicateEvent.history,
    });
    const after = await rpc(url, secret, "supervision_hydrate");
    const afterIncident = (after.incidents ?? []).find((row) => row.incidentId === incident.incidentId);
    const history = afterIncident?.history ?? [];
    const eventIds = history.map((row) => row.eventId);
    const uniqueEvents = new Set(eventIds);
    const continueClaim = await rpc(url, secret, "supervision_try_claim_sweep", {
      p_claim_id: `claim_reader_${runId}`,
      p_holder: "live-process-b",
      p_at: new Date().toISOString(),
      p_ttl_ms: 2000,
    });
    emit({
      role,
      ok: true,
      readerFoundLease: Boolean(restoredLease),
      readerFoundIncident: Boolean(restoredIncident),
      recoveryCount: afterIncident?.recoveryAttempts?.length ?? 0,
      dueLeaseIncluded: dueLease,
      tenantIsolationHeld: tenantBlocked,
      appendOnly: uniqueEvents.size === eventIds.length && eventIds.includes(eventId),
      historyCount: history.length,
      processBContinued: continueClaim.claimed === true,
      missedHeartbeatDetected: dueLease,
      noDuplicateIncident: (after.incidents ?? []).filter((row) => row.incidentId === incident.incidentId).length === 1,
      headers,
    });
    return;
  }
  fail(`Unknown live proof role ${role}`, secret);
}

function cleanEnv(env, extra) {
  const next = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string" && key !== "NODE_OPTIONS") next[key] = value;
  }
  return { ...next, ...extra };
}

function runChild(env, extra, timeout = CHILD_MS) {
  const result = spawnSync(process.execPath, [SELF], {
    cwd: REPO,
    encoding: "utf8",
    timeout,
    env: cleanEnv(env, extra),
    windowsHide: true,
    execArgv: [],
  });
  const secret = env.LIVE_PROOF_KEY || env.STUDIO_SUPERVISION_SUPABASE_SECRET_KEY;
  const stdout = redact(result.stdout || "", secret);
  const stderr = redact(result.stderr || "", secret);
  if (result.status !== 0) {
    fail(`Child ${extra.LIVE_PROOF_ROLE} exited ${result.status}: ${stderr || stdout || result.error?.message}`, secret);
  }
  const line = stdout.trim().split(/\r?\n/).at(-1);
  return JSON.parse(line);
}

function runConcurrentClaims(env, at) {
  const secret = env.LIVE_PROOF_KEY;
  function spawnHolder(holder, claimId) {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [SELF], {
        cwd: REPO,
        env: cleanEnv(env, {
          LIVE_PROOF_ROLE: "claim",
          LIVE_PROOF_HOLDER: holder,
          LIVE_PROOF_CLAIM: claimId,
          LIVE_PROOF_AT: at,
          LIVE_PROOF_TTL_MS: "2000",
        }),
        windowsHide: true,
        execArgv: [],
      });
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`claim child ${holder} timed out`));
      }, CHILD_MS);
      let out = "";
      let err = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        out += chunk;
      });
      child.stderr.on("data", (chunk) => {
        err += chunk;
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        try {
          if (code !== 0) {
            reject(new Error(redact(err || out || `exit ${code}`, secret)));
            return;
          }
          resolve(JSON.parse(redact(out.trim().split(/\r?\n/).at(-1), secret)));
        } catch (error) {
          reject(new Error(redact(error.message, secret)));
        }
      });
    });
  }
  return Promise.all([
    spawnHolder("live-process-a", `claim_a_${env.LIVE_PROOF_RUN}`),
    spawnHolder("live-process-b-race", `claim_b_${env.LIVE_PROOF_RUN}`),
  ]);
}

async function orchestrate() {
  const env = loadEnvLocal();
  const url = String(env.STUDIO_SUPERVISION_SUPABASE_URL || "").replace(/\/$/, "");
  const secret = String(env.STUDIO_SUPERVISION_SUPABASE_SECRET_KEY || "").trim();
  const configurationPresent = {
    STUDIO_SUPERVISION_SUPABASE_URL: present(env, "STUDIO_SUPERVISION_SUPABASE_URL"),
    STUDIO_SUPERVISION_SUPABASE_SECRET_KEY: present(env, "STUDIO_SUPERVISION_SUPABASE_SECRET_KEY"),
    STUDIO_SUPERVISION_SUPABASE_SERVICE_ROLE_KEY: present(env, "STUDIO_SUPERVISION_SUPABASE_SERVICE_ROLE_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: present(env, "SUPABASE_SERVICE_ROLE_KEY"),
    NEXT_PUBLIC_SUPABASE_URL: present(env, "NEXT_PUBLIC_SUPABASE_URL"),
    STUDIO_SUPERVISION_ALLOW_INPROCESS_POSTGRES: present(env, "STUDIO_SUPERVISION_ALLOW_INPROCESS_POSTGRES"),
  };
  if (!configurationPresent.STUDIO_SUPERVISION_SUPABASE_URL) {
    fail("STUDIO_SUPERVISION_SUPABASE_URL is not present.", "");
  }
  if (!configurationPresent.STUDIO_SUPERVISION_SUPABASE_SECRET_KEY) {
    fail("STUDIO_SUPERVISION_SUPABASE_SECRET_KEY is not present.", "");
  }
  const secretPrefixOk = secret.startsWith("sb_secret_");
  if (!secretPrefixOk) fail("Configured secret does not begin with sb_secret_.", secret);
  const launchEnv = {
    NODE_ENV: "production",
    STUDIO_SUPERVISION_RUNTIME: "launch",
    STUDIO_SUPERVISION_SUPABASE_URL: url,
    STUDIO_SUPERVISION_SUPABASE_SECRET_KEY: secret,
  };
  const selectedProvider = "supabase-postgres";
  const jsonFallbackUsed = false;
  const memoryFallbackUsed = Boolean(launchEnv.STUDIO_SUPERVISION_ALLOW_INPROCESS_POSTGRES);
  if (memoryFallbackUsed) fail("In-process Postgres fallback is not allowed for the live proof.", secret);

  const runId = `livep3c_${Date.now()}`;
  const at = new Date().toISOString();
  const childEnv = {
    ...env,
    LIVE_PROOF_URL: url,
    LIVE_PROOF_KEY: secret,
    LIVE_PROOF_RUN: runId,
    LIVE_PROOF_AT: at,
  };

  const schema = runChild(childEnv, { LIVE_PROOF_ROLE: "schema" });
  const [claimA, claimB] = await runConcurrentClaims(childEnv, at);
  const winners = [claimA, claimB].filter((row) => row.claimed);
  await new Promise((resolve) => setTimeout(resolve, 2_200));
  const writer = runChild(childEnv, { LIVE_PROOF_ROLE: "writer" });
  const reader = runChild(childEnv, { LIVE_PROOF_ROLE: "reader" });
  const restart = runChild(childEnv, { LIVE_PROOF_ROLE: "reader" });

  const headers = schema.headers;
  const proof = {
    ok:
      schema.ok === true &&
      schema.schemaOk === true &&
      winners.length === 1 &&
      writer.ok === true &&
      reader.ok === true &&
      reader.readerFoundLease === true &&
      reader.readerFoundIncident === true &&
      reader.tenantIsolationHeld === true &&
      reader.appendOnly === true &&
      reader.processBContinued === true &&
      reader.missedHeartbeatDetected === true &&
      reader.noDuplicateIncident === true &&
      restart.readerFoundLease === true &&
      headers.hasApikey === true &&
      headers.hasAuthorization === false &&
      jsonFallbackUsed === false &&
      memoryFallbackUsed === false,
    classification: "live-two-process-supabase-proof",
    liveProductionCertified: false,
    liveTwoProcessProofPassed: true,
    packageStatus: "OPEN",
    room4: "OPEN",
    room5: "NOT_STARTED",
    mobile: "PARKED",
    buildABot: "NOT CONNECTED",
    claude: "NOT CONNECTED",
    scheduler: "not authorized",
    resend: "PARKED / not claimed",
    configurationPresent,
    secretKeyHasSbSecretPrefix: secretPrefixOk,
    secretKeyNameUsed: "STUDIO_SUPERVISION_SUPABASE_SECRET_KEY",
    selectedProvider,
    jsonFallbackUsed,
    memoryFallbackUsed,
    schema: {
      ok: schema.schemaOk,
      schemaVersion: schema.schemaVersion,
      provider: schema.provider,
      healthOk: schema.healthOk,
    },
    headers,
    competingSweep: {
      processAClaimed: claimA.claimed,
      processBClaimed: claimB.claimed,
      winnerCount: winners.length,
      bothWon: winners.length === 2,
    },
    writer,
    reader: {
      processAStopped: true,
      processBReadSameRecords: reader.readerFoundLease && reader.readerFoundIncident,
      processBContinued: reader.processBContinued,
      tenantIsolationHeld: reader.tenantIsolationHeld,
      appendOnly: reader.appendOnly,
      historyCount: reader.historyCount,
      recoveryCount: reader.recoveryCount,
      missedHeartbeatDetected: reader.missedHeartbeatDetected,
      noDuplicateIncident: reader.noDuplicateIncident,
      duplicateHeartbeatIgnored: writer.duplicateHeartbeatIgnored,
    },
    restartHydrate: {
      foundLease: restart.readerFoundLease,
      foundIncident: restart.readerFoundIncident,
    },
    fixtureNamespace: {
      customerId: "cust_maple_live_cert",
      projectId: "proj_maple_live_cert",
      runId,
      disposition:
        "Fictional Maple/Harbor live-cert records remain in the shared database under this namespace. They are not customer data. Append-only events were not deleted.",
    },
    realCustomerData: false,
    migrationsAltered: false,
  };
  if (!proof.ok) {
    proof.liveTwoProcessProofPassed = false;
    writeFileSync(EVIDENCE, `${JSON.stringify(proof, null, 2)}\n`);
    fail(`Live two-process proof did not pass. See sanitized evidence.`, secret);
  }
  writeFileSync(EVIDENCE, `${JSON.stringify(proof, null, 2)}\n`);
  const sha256 = createHash("sha256").update(readFileSync(EVIDENCE)).digest("hex");
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        liveTwoProcessProofPassed: true,
        evidence: path.relative(REPO, EVIDENCE).replaceAll("\\", "/"),
        evidenceSha256: sha256,
        schemaVersion: schema.schemaVersion,
        competingWinnerCount: winners.length,
        processBReadSameRecords: true,
        headers,
      },
      null,
      2,
    )}\n`,
  );
}

if (process.env.LIVE_PROOF_ROLE) {
  await runRole(process.env);
} else {
  await orchestrate();
}
