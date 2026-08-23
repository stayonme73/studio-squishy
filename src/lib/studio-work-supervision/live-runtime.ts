import { rmSync } from "fs";
import os from "os";
import path from "path";

import { studioWorkSupervisionAndIncidentEscalationV1 as cfg } from "@/config/studio-work-supervision-and-incident-escalation-v1";

import { WORKER_REGISTRATION_RULES } from "./contract";
import {
  DEFAULT_SUPERVISION_DATA_DIR,
  createFileSupervisionRepository,
} from "./file-repository";
import { createSupervisionMachine, type SupervisionMachine } from "./machine";
import { createLivePostgresSupervisionRepository } from "./postgres-live-repository";
import { createSupervisionLiveClient } from "./postgres-live-client";
import { createPostgresSupervisionRepository } from "./postgres-adapter";
import { createSupervisionPostgresEngine } from "./postgres-engine";
import { LIVE_SWEEP_INTERVAL_MS } from "./policy";
import {
  isLaunchRuntime,
  requestedSupervisionProvider,
  resolveSupervisionPostgresConfig,
} from "./provider-class";
import {
  DurablePersistenceUnavailableError,
  assertDurableRepository,
  type SupervisionRepository,
} from "./repository";

type LiveSupervisionSlot = {
  machine: SupervisionMachine;
  sweepTimer: ReturnType<typeof setInterval> | null;
  sweepLeaseId: string | null;
  dataDir: string;
};

const SLOT_KEY = "__studioLiveSupervisionRuntime" as const;

function slot(): LiveSupervisionSlot | undefined {
  return (globalThis as Record<string, LiveSupervisionSlot | undefined>)[SLOT_KEY];
}

function setSlot(value: LiveSupervisionSlot | undefined): void {
  (globalThis as Record<string, LiveSupervisionSlot | undefined>)[SLOT_KEY] = value;
}

const MACHINE_CUSTOMER = {
  customerId: "cust_internal_machine",
  customerLabel: "Studio Machine (internal fixture)",
  projectId: "proj_supervision_runtime",
  campaignId: "camp_supervision_runtime",
};

function liveSweepDisabled(): boolean {
  return Boolean(process.env.VITEST) || process.env.STUDIO_SUPERVISION_DISABLE_LIVE_SWEEP === "1";
}

export function resolveSupervisionDataDir(
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env.STUDIO_SUPERVISION_DATA_DIR?.trim()) return env.STUDIO_SUPERVISION_DATA_DIR.trim();
  if (env.VITEST) {
    return path.join(os.tmpdir(), "studio-supervision-vitest", String(process.pid));
  }
  return DEFAULT_SUPERVISION_DATA_DIR;
}

export function createLiveSupervisionRepository(
  env: NodeJS.ProcessEnv = process.env,
): SupervisionRepository {
  const requested = requestedSupervisionProvider(env);
  if (isLaunchRuntime(env) || requested === "supabase-postgres") {
    const resolved = resolveSupervisionPostgresConfig(env);
    if (!resolved.ok) {
      throw new DurablePersistenceUnavailableError(
        `Launch supervision requires Supabase Postgres. Missing ${resolved.missing.join(", ")}. studio-data-json is local-only and is not a launch production store.`,
      );
    }
    if (env.STUDIO_SUPERVISION_ALLOW_INPROCESS_POSTGRES === "1") {
      return createPostgresSupervisionRepository(createSupervisionPostgresEngine());
    }
    throw new DurablePersistenceUnavailableError(
      "Use createLiveSupervisionRepositoryAsync when Supabase credentials are present.",
    );
  }
  if (requested === "memory") {
    throw new DurablePersistenceUnavailableError(
      "The memory repository is unit tests only.",
    );
  }
  return createFileSupervisionRepository(resolveSupervisionDataDir(env));
}

export async function createLiveSupervisionRepositoryAsync(
  env: NodeJS.ProcessEnv = process.env,
): Promise<SupervisionRepository> {
  const requested = requestedSupervisionProvider(env);
  if (isLaunchRuntime(env) || requested === "supabase-postgres") {
    const resolved = resolveSupervisionPostgresConfig(env);
    if (!resolved.ok) {
      throw new DurablePersistenceUnavailableError(
        `Launch supervision requires Supabase Postgres. Missing ${resolved.missing.join(", ")}. studio-data-json is local-only and is not a launch production store.`,
      );
    }
    if (env.STUDIO_SUPERVISION_ALLOW_INPROCESS_POSTGRES === "1") {
      return createPostgresSupervisionRepository(createSupervisionPostgresEngine());
    }
    const client = createSupervisionLiveClient(resolved.config);
    await client.initialize();
    const repository = createLivePostgresSupervisionRepository(client);
    await repository.load();
    return repository;
  }
  return createLiveSupervisionRepository(env);
}

function ensureMachineSweepLease(state: LiveSupervisionSlot): string | Promise<string> {
  if (state.sweepLeaseId && state.machine.getLease(state.sweepLeaseId)) {
    return state.sweepLeaseId;
  }
  const existing = state.machine
    .snapshot()
    .leases.find((lease) => lease.leaseId === "lease_machine_sweep");
  if (existing) {
    state.sweepLeaseId = existing.leaseId;
    return existing.leaseId;
  }
  const issued = state.machine.issueLease({
    leaseId: "lease_machine_sweep",
    kind: "LONG_RUNNING_SERVICE",
    ...MACHINE_CUSTOMER,
    subject: {
      kind: "service",
      id: "machine_supervision_sweep",
      label: "Machine supervision sweep",
    },
    assignedWorker: {
      providerId: "machine",
      workerId: "machine_sweep",
      label: "Machine sweep",
    },
    packageId: cfg.packageId,
    branch: cfg.branch,
    commit: null,
    step: "evaluate_leases_on_schedule",
    heartbeatIntervalMs: LIVE_SWEEP_INTERVAL_MS,
    graceMs: LIVE_SWEEP_INTERVAL_MS,
  });
  const assign = (lease: { leaseId: string }) => {
    state.sweepLeaseId = lease.leaseId;
    return lease.leaseId;
  };
  if (issued && typeof (issued as Promise<{ leaseId: string }>).then === "function") {
    return (issued as Promise<{ leaseId: string }>).then(assign);
  }
  return assign(issued as { leaseId: string });
}

function startLiveSweepScheduler(state: LiveSupervisionSlot): void {
  if (liveSweepDisabled() || state.sweepTimer) return;
  const leaseId = ensureMachineSweepLease(state);
  state.machine.recordHeartbeat({
    leaseId,
    idempotencyKey: `machine-sweep-boot-${Date.now()}`,
    reportedStatus: "service_awake",
    evidenceSummary: "Post-restart service health check.",
  });
  state.sweepTimer = setInterval(() => {
    try {
      state.machine.recordHeartbeat({
        leaseId,
        idempotencyKey: `machine-sweep-${Date.now()}`,
        reportedStatus: "service_awake",
        evidenceSummary: "Detached Machine sweep tick.",
      });
      state.machine.sweep();
    } catch {
      // Fail closed on a tick.
    }
  }, LIVE_SWEEP_INTERVAL_MS);
}

export async function getLiveSupervisionMachine(): Promise<SupervisionMachine> {
  let state = slot();
  if (!state) {
    const dataDir = resolveSupervisionDataDir();
    const repository = await createLiveSupervisionRepositoryAsync();
    assertDurableRepository(repository, {
      ...process.env,
      STUDIO_SUPERVISION_REQUIRE_DURABLE: process.env.VITEST ? "0" : "1",
    });
    state = {
      machine: createSupervisionMachine({
        repository,
        recordSource: "live",
        holderId: "live-node-process",
      }),
      sweepTimer: null,
      sweepLeaseId: null,
      dataDir,
    };
    await Promise.resolve(ensureMachineSweepLease(state));
    await Promise.resolve(repository.flush?.());
    startLiveSweepScheduler(state);
    setSlot(state);
  }
  return state.machine;
}

export async function reloadLiveSupervisionMachineFromDisk(): Promise<SupervisionMachine> {
  const state = slot();
  if (state?.sweepTimer) clearInterval(state.sweepTimer);
  setSlot(undefined);
  return getLiveSupervisionMachine();
}

export function resetLiveSupervisionMachineForTests(): void {
  const state = slot();
  if (state?.sweepTimer) clearInterval(state.sweepTimer);
  if (state?.dataDir && process.env.VITEST) {
    rmSync(state.dataDir, { recursive: true, force: true });
  }
  setSlot(undefined);
}

export function workerRegistrationContract(leaseId: string) {
  return {
    leaseId,
    heartbeatPath: "/api/operating/supervision/heartbeat",
    sweepPath: "/api/operating/supervision/sweep",
    reloadPath: "/api/operating/supervision/reload",
    snapshotPath: "/api/operating/supervision/snapshot",
    authHeader: "x-studio-operating-secret",
    rules: WORKER_REGISTRATION_RULES,
  };
}
