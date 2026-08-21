/**
 * Scenario 3 production gate.
 * Facts may be owner-stamped while production remains blocked until the
 * customer-fact source gate, photo-rights gate, and Tagia verification pass.
 */

import { studioRoom4cScenario3MossAndThreadV1 as brief } from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";

import { evaluateScenario3Acceptance } from "./acceptance";

export function scenario3ProductionMayStart(): boolean {
  return evaluateScenario3Acceptance().productionMayStart;
}

export function assertScenario3ProductionBlockedUntilAuthorized(): void {
  if (scenario3ProductionMayStart()) return;
  throw new Error(
    "SCENARIO_3_PRODUCTION_BLOCKED: Moss & Thread production cannot start until the customer-fact source gate, photo-rights gate, and owner verification all pass.",
  );
}

export function assertScenario3FactsStamped(): void {
  if (brief.factApprovalStatus !== "OWNER_APPROVED_FOR_CERTIFICATION") {
    throw new Error(
      "SCENARIO_3_FACTS_NOT_AUTHORIZED: Tagia must stamp OWNER_APPROVED_FOR_CERTIFICATION.",
    );
  }
}
