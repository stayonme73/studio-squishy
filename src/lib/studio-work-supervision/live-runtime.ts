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
import { LIVE_SWEEP_INTERVAL_MS } from "./policy";
import { assertDurableRepository } from "./repository";

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

function ensureMachineSweepLease(state: LiveSupervisionSlot): string {
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
  const lease = state.machine.issueLease({
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
  state.sweepLeaseId = lease.leaseId;
  return lease.leaseId;
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

export function getLiveSupervisionMachine(): SupervisionMachine {
  let state = slot();
  if (!state) {
    const dataDir = resolveSupervisionDataDir();
    const repository = createFileSupervisionRepository(dataDir);
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
    ensureMachineSweepLease(state);
    startLiveSweepScheduler(state);
    setSlot(state);
  }
  return state.machine;
}

export function reloadLiveSupervisionMachineFromDisk(): SupervisionMachine {
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
