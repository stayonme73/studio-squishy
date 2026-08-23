import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "fs";
import path from "path";

import { cloneJson } from "./clock";
import { UNCONNECTED_PROVIDER_PORTS } from "./policy";
import {
  AppendOnlyViolationError,
  DurablePersistenceUnavailableError,
  SUPERVISION_STORE_PROVIDER,
  SUPERVISION_STORE_SCHEMA_VERSION,
  type HeartbeatRecord,
  type SupervisionRepository,
  type SupervisionStoreMeta,
  type SweepClaim,
  type SweepEvaluationRecord,
} from "./repository";
import type { IncidentEvent, MachineIncident, ProviderPortStatus, WorkLease } from "./types";

export const DEFAULT_SUPERVISION_DATA_DIR = path.join(
  process.cwd(),
  "data",
  "supervision",
);

function readJson<T>(file: string): T | null {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function readJsonl<T>(file: string): T[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export function createFileSupervisionRepository(
  rootDir = DEFAULT_SUPERVISION_DATA_DIR,
): SupervisionRepository {
  try {
    mkdirSync(path.join(rootDir, "leases"), { recursive: true });
    mkdirSync(path.join(rootDir, "incidents"), { recursive: true });
    mkdirSync(path.join(rootDir, "idempotency"), { recursive: true });
  } catch (error) {
    throw new DurablePersistenceUnavailableError(
      `Cannot create supervision data directory: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  const schemaPath = path.join(rootDir, "SCHEMA.json");
  const metaPath = path.join(rootDir, "meta.json");
  const coveragePath = path.join(rootDir, "coverage.json");
  const heartbeatsPath = path.join(rootDir, "heartbeats.jsonl");
  const evaluationsPath = path.join(rootDir, "sweep-evaluations.jsonl");
  const claimPath = path.join(rootDir, "sweep-claim.json");

  if (!existsSync(schemaPath)) {
    writeFileSync(
      schemaPath,
      `${JSON.stringify(
        {
          schemaVersion: SUPERVISION_STORE_SCHEMA_VERSION,
          provider: SUPERVISION_STORE_PROVIDER,
          mechanism: "Studio data/ JSON store with atomic replace and append-only jsonl",
          supabaseRecordStore: "not used — Supabase in this repo is private file storage only and is not configured for records",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  if (!existsSync(metaPath)) {
    writeFileSync(
      metaPath,
      `${JSON.stringify(
        {
          schemaVersion: SUPERVISION_STORE_SCHEMA_VERSION,
          provider: SUPERVISION_STORE_PROVIDER,
          restoredAt: null,
          lastSweepClaim: null,
        } satisfies SupervisionStoreMeta,
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  if (!existsSync(coveragePath)) {
    writeFileSync(
      coveragePath,
      `${JSON.stringify([...UNCONNECTED_PROVIDER_PORTS], null, 2)}\n`,
      "utf8",
    );
  }

  const persistJson = (file: string, value: unknown) => {
    const payload = `${JSON.stringify(value, null, 2)}\n`;
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(temp, payload, "utf8");
    try {
      renameSync(temp, file);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EPERM" || code === "EEXIST") {
        rmSync(file, { force: true });
        renameSync(temp, file);
        return;
      }
      throw error;
    }
  };

  const repo: SupervisionRepository = {
    kind: "durable-file",
    load() {
      /* File reads are on demand. */
    },
    saveLease(lease) {
      persistJson(path.join(rootDir, "leases", `${lease.leaseId}.json`), lease);
    },
    getLease(leaseId) {
      return readJson<WorkLease>(path.join(rootDir, "leases", `${leaseId}.json`)) ?? undefined;
    },
    listLeases() {
      const dir = path.join(rootDir, "leases");
      return readdirSync(dir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => readJson<WorkLease>(path.join(dir, file)))
        .filter((lease): lease is WorkLease => Boolean(lease));
    },
    saveIncident(incident) {
      const derived = cloneJson(incident);
      const eventFile = path.join(rootDir, "incidents", `${incident.incidentId}.events.jsonl`);
      const storedEvents = readJsonl<IncidentEvent>(eventFile);
      derived.history = storedEvents.length > 0 ? storedEvents : derived.history;
      persistJson(path.join(rootDir, "incidents", `${incident.incidentId}.json`), derived);
    },
    getIncident(incidentId) {
      const derived = readJson<MachineIncident>(
        path.join(rootDir, "incidents", `${incidentId}.json`),
      );
      if (!derived) return undefined;
      const history = readJsonl<IncidentEvent>(
        path.join(rootDir, "incidents", `${incidentId}.events.jsonl`),
      );
      return { ...derived, history: history.length > 0 ? history : derived.history };
    },
    listIncidents() {
      const dir = path.join(rootDir, "incidents");
      return readdirSync(dir)
        .filter((file) => file.endsWith(".json") && !file.endsWith(".events.jsonl"))
        .map((file) => repo.getIncident(file.replace(/\.json$/, "")))
        .filter((incident): incident is MachineIncident => Boolean(incident));
    },
    appendIncidentEvent(incidentId, event) {
      const eventFile = path.join(rootDir, "incidents", `${incidentId}.events.jsonl`);
      appendFileSync(eventFile, `${JSON.stringify(event)}\n`, "utf8");
      const derived = repo.getIncident(incidentId);
      if (derived) {
        persistJson(path.join(rootDir, "incidents", `${incidentId}.json`), derived);
      }
    },
    listIncidentEvents(incidentId) {
      return readJsonl<IncidentEvent>(
        path.join(rootDir, "incidents", `${incidentId}.events.jsonl`),
      );
    },
    replaceIncidentEvents() {
      throw new AppendOnlyViolationError();
    },
    rememberIdempotency(leaseId, idempotencyKey) {
      const safe = `${leaseId}__${idempotencyKey}`.replace(/[^a-zA-Z0-9._-]/g, "_");
      const file = path.join(rootDir, "idempotency", `${safe}.json`);
      if (existsSync(file)) return false;
      try {
        writeFileSync(
          file,
          `${JSON.stringify({ leaseId, idempotencyKey, createdAt: new Date().toISOString() })}\n`,
          { encoding: "utf8", flag: "wx" },
        );
        return true;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EEXIST") return false;
        throw error;
      }
    },
    hasIdempotency(leaseId, idempotencyKey) {
      const safe = `${leaseId}__${idempotencyKey}`.replace(/[^a-zA-Z0-9._-]/g, "_");
      return existsSync(path.join(rootDir, "idempotency", `${safe}.json`));
    },
    appendHeartbeat(record) {
      appendFileSync(heartbeatsPath, `${JSON.stringify(record)}\n`, "utf8");
    },
    listHeartbeats() {
      return readJsonl<HeartbeatRecord>(heartbeatsPath);
    },
    saveCoverage(providers) {
      persistJson(coveragePath, providers);
    },
    getCoverage() {
      return readJson<ProviderPortStatus[]>(coveragePath) ?? cloneJson([...UNCONNECTED_PROVIDER_PORTS]);
    },
    tryClaimSweep(input) {
      const now = Date.parse(input.at);
      const existing = readJson<SweepClaim>(claimPath);
      if (
        existing &&
        Date.parse(existing.expiresAt) > now &&
        existing.holder !== input.holder
      ) {
        return { claimed: false, claim: existing };
      }
      const claim: SweepClaim = {
        claimId: input.claimId,
        claimedAt: input.at,
        holder: input.holder,
        expiresAt: new Date(now + input.ttlMs).toISOString(),
      };
      persistJson(claimPath, claim);
      const meta = repo.getMeta();
      meta.lastSweepClaim = claim;
      persistJson(metaPath, meta);
      return { claimed: true, claim };
    },
    recordSweepEvaluation(record) {
      appendFileSync(evaluationsPath, `${JSON.stringify(record)}\n`, "utf8");
    },
    listSweepEvaluations() {
      return readJsonl<SweepEvaluationRecord>(evaluationsPath);
    },
    getMeta() {
      return (
        readJson<SupervisionStoreMeta>(metaPath) ?? {
          schemaVersion: SUPERVISION_STORE_SCHEMA_VERSION,
          provider: SUPERVISION_STORE_PROVIDER,
          restoredAt: null,
          lastSweepClaim: null,
        }
      );
    },
    markRestored(at) {
      const meta = repo.getMeta();
      meta.restoredAt = at;
      persistJson(metaPath, meta);
    },
  };

  return repo;
}
