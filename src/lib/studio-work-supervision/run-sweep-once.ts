import { SUPERVISION_SWEEP_PATH } from "./contract";
import { createSupervisionMachine, type SupervisionMachine } from "./machine";
import { createLivePostgresSupervisionRepository } from "./postgres-live-repository";
import { createSupervisionLiveClient } from "./postgres-live-client";
import {
  isLaunchRuntime,
  resolveSupervisionPostgresConfig,
} from "./provider-class";
import {
  DurablePersistenceUnavailableError,
  LaunchPersistenceForbiddenError,
  LiveStoreUnhealthyError,
  SchemaMismatchError,
  assertDurableRepository,
  type SupervisionRepository,
} from "./repository";
import type { SweepResult } from "./types";

export type SanitizedSweepJson = {
  ok: true;
  path: typeof SUPERVISION_SWEEP_PATH;
  machineComputesHealth: true;
  providersRemainUnconnected: Array<{
    id: string;
    status: string;
    healthyDisplayAllowed: boolean;
  }>;
  sweep: SweepResult;
  incidents: Array<Record<string, unknown>>;
};

export function toSanitizedSweepJson(
  machine: SupervisionMachine,
  sweep: SweepResult,
): SanitizedSweepJson {
  const snapshot = machine.snapshot();
  return {
    ok: true,
    path: SUPERVISION_SWEEP_PATH,
    machineComputesHealth: true,
    providersRemainUnconnected: snapshot.providers.map((port) => ({
      id: port.id,
      status: port.status,
      healthyDisplayAllowed: port.healthyDisplayAllowed,
    })),
    sweep,
    incidents: snapshot.incidents.map((incident) => ({
      incidentId: incident.incidentId,
      leaseId: incident.leaseId,
      customerId: incident.customerId,
      customerLabel: incident.customerLabel,
      projectId: incident.projectId,
      campaignId: incident.campaignId,
      severity: incident.severity,
      category: incident.category,
      state: incident.state,
      ownerEscalated: incident.ownerEscalated,
      failedOrStalledStep: incident.failedOrStalledStep,
      customerImpact: incident.customerImpact,
      deadlineImpact: incident.deadlineImpact,
      financialImpact: incident.financialImpact,
      rightsOrComplianceImpact: incident.rightsOrComplianceImpact,
      securityOrBreachImpact: incident.securityOrBreachImpact,
      containmentPerformed: incident.containmentPerformed,
      currentResponsibleParty: incident.currentResponsibleParty,
      whoMustBeContacted: incident.whoMustBeContacted,
      lastHealthyAt: incident.lastHealthyAt,
      lastHeartbeatAt: incident.lastHeartbeatAt,
      recoveryAttempts: incident.recoveryAttempts,
      ownerDecisionRequired: incident.ownerDecisionRequired,
      nextAutomaticAction: incident.nextAutomaticAction,
      ifOwnerDoesNothing: incident.ifOwnerDoesNothing,
      nextCheckAt: incident.nextCheckAt,
      evidence: incident.evidence,
      history: incident.history,
    })),
  };
}

export function isSupervisionStoreFailure(error: unknown): boolean {
  return (
    error instanceof DurablePersistenceUnavailableError ||
    error instanceof LiveStoreUnhealthyError ||
    error instanceof SchemaMismatchError ||
    error instanceof LaunchPersistenceForbiddenError
  );
}

export async function runSupervisionSweepOnce(options?: {
  env?: NodeJS.ProcessEnv;
  repository?: SupervisionRepository;
  fetch?: typeof fetch;
  holderId?: string;
}): Promise<SanitizedSweepJson> {
  const env = options?.env ?? process.env;
  let repository = options?.repository;
  if (!repository) {
    const resolved = resolveSupervisionPostgresConfig(env);
    if (!resolved.ok) {
      throw new DurablePersistenceUnavailableError(
        `Launch supervision requires Supabase Postgres. Missing ${resolved.missing.join(", ")}.`,
      );
    }
    const client = createSupervisionLiveClient(resolved.config, {
      fetch: options?.fetch,
    });
    await client.initialize();
    repository = createLivePostgresSupervisionRepository(client);
    await repository.load();
  }
  if (isLaunchRuntime(env) || env.STUDIO_SUPERVISION_RUNTIME === "launch") {
    assertDurableRepository(repository, {
      ...env,
      STUDIO_SUPERVISION_RUNTIME: "launch",
    });
  }
  const machine = createSupervisionMachine({
    repository,
    recordSource: "live",
    holderId: options?.holderId ?? "wake-runtime",
    requireDurable: true,
  });
  const sweep = await Promise.resolve(machine.sweep());
  await Promise.resolve(repository.flush?.());
  return toSanitizedSweepJson(machine, sweep);
}
