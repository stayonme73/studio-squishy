import { buildFoundationFixturePack } from "./fixtures";
import type { SupervisionMachine } from "./machine";
import type { OwnerActionId } from "./types";

let runtime: SupervisionMachine | null = null;

export function getRuntimeSupervisionMachine(): SupervisionMachine {
  if (!runtime) {
    runtime = buildFoundationFixturePack().machine;
  }
  return runtime;
}

export function resetRuntimeSupervisionMachineForTests(): void {
  runtime = null;
}

export function applyRuntimeOwnerAction(
  incidentId: string,
  action: OwnerActionId,
  note: string,
) {
  return getRuntimeSupervisionMachine().applyOwnerAction(incidentId, action, note);
}
