/**
 * Scenario 3 production gate.
 * Facts and photo rights stay on the frozen brief. Production starts only after
 * Tagia stamps production authorization (separate from the brief hash).
 */

import { studioRoom4cScenario3MossAndThreadV1 as brief } from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";

import { evaluateScenario3Acceptance } from "./acceptance";
import { scenario3ProductionAuthorizedByOwner } from "./production-authorization";

export function scenario3ProductionMayStart(): boolean {
  return evaluateScenario3Acceptance().productionMayStart;
}

export function assertScenario3ProductionBlockedUntilAuthorized(): void {
  if (scenario3ProductionMayStart()) return;
  throw new Error(
    "SCENARIO_3_PRODUCTION_BLOCKED: Moss & Thread production cannot start until the customer-fact source gate, photo-rights gate, and owner production authorization all pass.",
  );
}

export function assertScenario3ProductionAuthorized(): void {
  if (!scenario3ProductionAuthorizedByOwner()) {
    throw new Error(
      "SCENARIO_3_PRODUCTION_NOT_AUTHORIZED: Tagia must stamp Scenario 3 production authorization.",
    );
  }
  if (!scenario3ProductionMayStart()) {
    throw new Error(
      "SCENARIO_3_PRODUCTION_GATES_FAILED: Fact, photo-rights, or acceptance gates failed after authorization.",
    );
  }
}

export function assertScenario3FactsStamped(): void {
  if (brief.factApprovalStatus !== "OWNER_APPROVED_FOR_CERTIFICATION") {
    throw new Error(
      "SCENARIO_3_FACTS_NOT_AUTHORIZED: Tagia must stamp OWNER_APPROVED_FOR_CERTIFICATION.",
    );
  }
}
