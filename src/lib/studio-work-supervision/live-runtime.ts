import { studioWorkSupervisionAndIncidentEscalationV1 as cfg } from "@/config/studio-work-supervision-and-incident-escalation-v1";

import { WORKER_REGISTRATION_RULES } from "./contract";
import { createSupervisionMachine, type SupervisionMachine } from "./machine";
import { LIVE_SWEEP_INTERVAL_MS } from "./policy";

type LiveSupervisionSlot = {
  machine: SupervisionMachine;
  sweepTimer: ReturnType<typeof setInterval> | null;
  sweepLeaseId: string | null;
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

function ensureMachineSweepLease(state: LiveSupervisionSlot): string {
  if (state.sweepLeaseId && state.machine.getLease(state.sweepLeaseId)) {
    return state.sweepLeaseId;
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
      // Fail closed on a tick. Do not throw out of the interval.
    }
  }, LIVE_SWEEP_INTERVAL_MS);
}

export function getLiveSupervisionMachine(): SupervisionMachine {
  let state = slot();
  if (!state) {
    state = {
      machine: createSupervisionMachine(),
      sweepTimer: null,
      sweepLeaseId: null,
    };
    ensureMachineSweepLease(state);
    startLiveSweepScheduler(state);
    setSlot(state);
  }
  return state.machine;
}

export function resetLiveSupervisionMachineForTests(): void {
  const state = slot();
  if (state?.sweepTimer) clearInterval(state.sweepTimer);
  setSlot(undefined);
}

export function workerRegistrationContract(leaseId: string) {
  return {
    leaseId,
    heartbeatPath: "/api/operating/supervision/heartbeat",
    sweepPath: "/api/operating/supervision/sweep",
    authHeader: "x-studio-operating-secret",
    rules: WORKER_REGISTRATION_RULES,
  };
}
