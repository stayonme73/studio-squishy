import type { ServiceId } from "@/catalog/types";
import {
  studioDispatchV1,
  type DispatchOutcome,
} from "@/config/studio-dispatch-v1";
import { studioRoutingHandoffV1 } from "@/config/studio-routing-handoff-v1";
import type { JobRoutingDecision } from "@/lib/studio-routing-handoff/types";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import type { ServiceProductionContract } from "@/lib/studio-kitchen-production/types";

import type {
  DispatchProductionRequirements,
  DispatchToolRefSnapshot,
  JobDispatchRecord,
} from "./types";

export function buildDispatchId(jobId: string): string {
  return `dd:${jobId}`;
}

function toolSnapshot(
  tool: ServiceProductionContract["primaryTool"],
): DispatchToolRefSnapshot {
  return {
    toolId: tool.toolId,
    label: tool.label,
    integrationState: tool.integrationState,
    toolReadiness: tool.toolReadiness,
    required: tool.required,
  };
}

export function snapshotProductionRequirements(
  contract: ServiceProductionContract,
): DispatchProductionRequirements {
  return {
    productionFamilyId: contract.productionFamilyId,
    catalogFamilyId: contract.catalogFamilyId,
    producerRole: contract.producerRole,
    supportingRoles: [...contract.supportingRoles],
    requiredCustomerInputs: [...contract.requiredCustomerInputs],
    requiredStudioInputs: [...contract.requiredStudioInputs],
    optionalInputs: [...contract.optionalInputs],
    productionSteps: contract.productionSteps.map((step) => ({
      id: step.id,
      label: step.label,
      taskPhase: step.taskPhase,
      responsibleRole: step.responsibleRole,
    })),
    qaItemIds: contract.qaItems.map((item) => item.id),
    deliverables: [...contract.deliverables],
    formatExportRequirements: [...contract.formatExportRequirements],
    limitations: [...contract.limitations],
    primaryTool: toolSnapshot(contract.primaryTool),
    optionalTools: contract.optionalTools.map(toolSnapshot),
    capabilityReadiness: contract.readiness,
    readinessNotes: contract.readinessNotes,
  };
}

function baseRecord(input: {
  jobId: string;
  campaignId: string;
  skuId: ServiceId;
  routing: JobRoutingDecision | null;
  evaluatedAt: string;
}): Omit<
  JobDispatchRecord,
  | "status"
  | "requirements"
  | "reason"
  | "blocker"
  | "executionIdentityReady"
  | "productionFamilyId"
  | "controlLane"
  | "routingFactFingerprint"
> {
  return {
    dispatchId: buildDispatchId(input.jobId),
    routingDecisionId: input.routing?.decisionId ?? null,
    jobId: input.jobId,
    campaignId: input.campaignId,
    skuId: input.skuId,
    evaluatedAt: input.evaluatedAt,
    ownerActionRequired: false,
  };
}

/**
 * Pure: build durable execution identity from a routing decision + contract.
 * Never invokes tools. Never starts production.
 */
export function evaluateJobDispatch(input: {
  campaignId: string;
  routing: JobRoutingDecision | null;
  jobId: string;
  skuId: ServiceId;
  evaluatedAt?: string;
}): JobDispatchRecord {
  const now = input.evaluatedAt ?? new Date().toISOString();
  const base = baseRecord({
    jobId: input.jobId,
    campaignId: input.campaignId,
    skuId: input.skuId,
    routing: input.routing,
    evaluatedAt: now,
  });

  if (!input.routing) {
    return {
      ...base,
      status: studioDispatchV1.outcomes.waitingForRouting,
      productionFamilyId: null,
      controlLane: null,
      routingFactFingerprint: null,
      requirements: null,
      reason: "No routing decision exists for this job yet.",
      blocker: "routing_missing",
      executionIdentityReady: false,
    };
  }

  const routing = input.routing;

  if (routing.status === studioRoutingHandoffV1.outcomes.waitingForPrerequisite) {
    return {
      ...base,
      status: studioDispatchV1.outcomes.waitingForPrerequisite,
      productionFamilyId: routing.productionFamilyId,
      controlLane: routing.controlLane,
      routingFactFingerprint: routing.factFingerprint,
      requirements: null,
      reason: routing.reason ?? "Upstream routing is waiting on prerequisites.",
      blocker: routing.blocker ?? "routing_waiting_prerequisite",
      executionIdentityReady: false,
    };
  }

  if (routing.status === studioRoutingHandoffV1.outcomes.routingBlocked) {
    return {
      ...base,
      status: studioDispatchV1.outcomes.dispatchBlocked,
      productionFamilyId: routing.productionFamilyId,
      controlLane: routing.controlLane,
      routingFactFingerprint: routing.factFingerprint,
      requirements: null,
      reason: routing.reason ?? "Upstream routing blocked this job.",
      blocker: routing.blocker ?? "routing_blocked",
      executionIdentityReady: false,
    };
  }

  if (routing.status === studioRoutingHandoffV1.outcomes.ownerPolicyReview) {
    return {
      ...base,
      status: studioDispatchV1.outcomes.ownerPolicyReview,
      productionFamilyId: routing.productionFamilyId,
      controlLane: routing.controlLane,
      routingFactFingerprint: routing.factFingerprint,
      requirements: null,
      reason: routing.reason ?? "Upstream routing requires Owner policy review.",
      blocker: routing.blocker ?? "owner_policy_review",
      executionIdentityReady: false,
    };
  }

  if (
    routing.status !== studioRoutingHandoffV1.outcomes.readyForDispatch ||
    !routing.readyForDispatch
  ) {
    return {
      ...base,
      status: studioDispatchV1.outcomes.waitingForRouting,
      productionFamilyId: routing.productionFamilyId,
      controlLane: routing.controlLane,
      routingFactFingerprint: routing.factFingerprint,
      requirements: null,
      reason: "Job is not READY_FOR_DISPATCH.",
      blocker: `routing_status:${routing.status}`,
      executionIdentityReady: false,
    };
  }

  const contractResult = resolveServiceProductionContract(routing.skuId);
  if (contractResult.status !== "resolved") {
    return {
      ...base,
      status: studioDispatchV1.outcomes.dispatchBlocked,
      productionFamilyId: routing.productionFamilyId,
      controlLane: routing.controlLane,
      routingFactFingerprint: routing.factFingerprint,
      requirements: null,
      reason: contractResult.message,
      blocker: contractResult.status,
      executionIdentityReady: false,
    };
  }

  const readiness = contractResult.contract.readiness;
  if (
    readiness !== "contract_ready" &&
    readiness !== "contract_ready_integration_required"
  ) {
    return {
      ...base,
      status: studioDispatchV1.outcomes.dispatchBlocked,
      productionFamilyId: contractResult.contract.productionFamilyId,
      controlLane: routing.controlLane,
      routingFactFingerprint: routing.factFingerprint,
      requirements: snapshotProductionRequirements(contractResult.contract),
      reason: `Capability readiness "${readiness}" cannot form an execution identity.`,
      blocker: `capability_readiness:${readiness}`,
      executionIdentityReady: false,
    };
  }

  const status: DispatchOutcome = studioDispatchV1.outcomes.executionIdentityReady;
  return {
    ...base,
    status,
    productionFamilyId: contractResult.contract.productionFamilyId,
    controlLane: routing.controlLane,
    routingFactFingerprint: routing.factFingerprint,
    requirements: snapshotProductionRequirements(contractResult.contract),
    reason: `Execution identity ready for family ${contractResult.contract.productionFamilyId}.`,
    blocker: null,
    executionIdentityReady: true,
  };
}
