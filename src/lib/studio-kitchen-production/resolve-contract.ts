import { getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import { campaignTasksConfig } from "@/config/campaign-tasks";
import {
  requiredChecksForPhase,
  UNIVERSAL_QA_CHECKS,
} from "@/lib/campaign-tasks/qa-checklists";
import { resolveProductionFamilyId } from "@/lib/campaign-tasks/families";
import type { ProductionRole, TaskPhase } from "@/lib/campaign-tasks/types";

import { isActiveCustomerFacingSku } from "./active-set";
import { FAMILY_PRODUCTION_BASELINES } from "./family-baselines";
import { getSkuOverride } from "./sku-overrides";
import type {
  ContractLookupResult,
  EscalationContract,
  KitchenProductionContractSummary,
  ProductionCapabilityReadiness,
  ProductionQaItem,
  ServiceProductionContract,
} from "./types";

const QA_LABELS: Record<string, string> = {
  ...campaignTasksConfig.qaChecklistLabels,
  scope_match: "Matches purchased service scope",
  factual_accuracy: "Facts, links, dates, and names are accurate",
  direction_match: "Matches approved direction / customer instructions",
  usability: "Usable by the customer as delivered",
  client_safe_packaging: "Client-safe packaging with no internal leaks",
};

export const PRODUCTION_READINESS_LABELS: Record<
  ProductionCapabilityReadiness,
  string
> = {
  // Labels are contract-status only — never "customer ready" / "launch ready".
  contract_ready: "CONTRACT READY",
  contract_ready_integration_required: "CONTRACT READY — INTEGRATION REQUIRED",
  partial: "PARTIAL",
  unsupported: "UNSUPPORTED",
  contradictory: "CONTRADICTORY",
};

const DEFAULT_ESCALATION: EscalationContract = {
  producerHandles: [
    "Routine design or copy correction",
    "Ordinary revision within allowance",
    "Missing required input follow-up (request materials)",
    "Standard production redo after QA production_correction",
  ],
  qaHandles: [
    "QA failure for production quality / specs",
    "QA correction verification",
    "Packaging / leak checks",
  ],
  managerOrSystemHandles: [
    "Job spine status transitions already authorized by job-control",
    "Template communication effects (not owner decisions)",
    "Materials blocker tracking",
  ],
  decisionCoreHandles: [
    "Production trigger / policy window evaluation",
    "Outgoing communication effects already classified as non-owner decisions",
  ],
  ownerHandles: [
    "Revision allowance exhausted",
    "Scope change / deadline exception",
    "Compliance hold / direction disagreement",
    "Refund / complaint judgment",
    "Owner Desk waiting_owner interactions",
    "before_review / before_delivery gates already required by job-control",
  ],
  contractLookupCreatesOwnerWork: false,
};

function labelForCheck(id: string): string {
  return QA_LABELS[id] ?? id.replace(/_/g, " ");
}

function catalogQaItems(
  service: NonNullable<ReturnType<typeof getServiceById>>,
): ProductionQaItem[] {
  const checklist = service.qaChecklist;
  if (!checklist) return [];
  return checklist.items.map((id) => ({
    id,
    label: labelForCheck(id),
    reason: `Catalog QA template ${checklist.templateKey}`,
    source: "catalog_qa_checklist" as const,
  }));
}

function phaseQaItems(phases: readonly (TaskPhase | null)[]): ProductionQaItem[] {
  const ids = new Set<string>();
  for (const phase of phases) {
    if (!phase) continue;
    for (const id of requiredChecksForPhase(phase)) ids.add(id);
  }
  for (const id of UNIVERSAL_QA_CHECKS) ids.add(id);
  return [...ids].map((id) => ({
    id,
    label: labelForCheck(id),
    reason: "Existing campaign-tasks phase QA checklist",
    source: "universal_phase_qa" as const,
  }));
}

function mergeQaItems(
  ...groups: readonly (readonly ProductionQaItem[])[]
): readonly ProductionQaItem[] {
  const seen = new Set<string>();
  const out: ProductionQaItem[] = [];
  for (const group of groups) {
    for (const item of group) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

function buildContract(skuId: ServiceId): ServiceProductionContract | null {
  const service = getServiceById(skuId);
  if (!service) return null;
  const override = getSkuOverride(skuId);
  if (!override) return null;

  const productionFamilyId = resolveProductionFamilyId(service.familyId);
  const baseline = FAMILY_PRODUCTION_BASELINES[productionFamilyId];
  const producerRole = override.producerRole ?? baseline.defaultProducerRole;
  const supportingRoles =
    override.supportingRoles ?? baseline.defaultSupportingRoles;
  const primaryTool = override.primaryTool ?? baseline.defaultPrimaryTool;
  const optionalTools = override.optionalTools ?? baseline.defaultOptionalTools;

  const customerInputs =
    service.clientResponsibilities.length > 0
      ? service.clientResponsibilities
      : (service.minimumCustomerRequirements ?? []);

  const qaItems = mergeQaItems(
    catalogQaItems(service),
    phaseQaItems(baseline.defaultSteps.map((step) => step.taskPhase)),
    override.extraQaItems ?? [],
  );

  const limitations = [
    ...service.exclusions,
    ...(override.extraLimitations ?? []),
    `Primary tool integration state: ${primaryTool.integrationState} (${primaryTool.toolReadiness}).`,
  ];

  return {
    skuId,
    serviceName: service.name,
    productionFamilyId,
    catalogFamilyId: service.familyId,
    producerRole,
    supportingRoles,
    primaryTool,
    optionalTools,
    requiredCustomerInputs: [...customerInputs],
    requiredStudioInputs: [
      ...(override.requiredStudioInputs ?? baseline.defaultStudioInputs),
    ],
    optionalInputs: [...(override.optionalInputs ?? [])],
    productionSteps: baseline.defaultSteps,
    qaItems,
    deliverables: [...service.deliverables],
    formatExportRequirements: [...override.formatExportRequirements],
    limitations,
    revision: {
      revisionRuleAuthority: "catalog_revision_rule",
      revisionRuleText: service.revisionRule,
      receivesRevisionRole: producerRole,
      recheckQaNote:
        "Re-run service QA items plus universal packaging checks after revision production.",
      exhaustedEscalation: "owner_desk_revision_limit",
      withinAllowanceOwnerRequired: false,
    },
    escalation: DEFAULT_ESCALATION,
    customerReviewHandoff:
      override.customerReviewHandoff ?? baseline.defaultCustomerReviewHandoff,
    finalDeliveryCriteria: [
      ...(override.finalDeliveryCriteria ?? baseline.defaultFinalDeliveryCriteria),
    ],
    readiness: override.readiness,
    readinessNotes: override.readinessNotes,
    specialNotes: [...(override.specialNotes ?? [])],
  };
}

/**
 * Resolve production contract for a SKU. Pure — creates no production records,
 * owner work, or tool integrations.
 */
export function resolveServiceProductionContract(
  skuId: string,
): ContractLookupResult {
  const service = getServiceById(skuId);
  if (!service) {
    return {
      status: "unknown_sku",
      skuId,
      message: "Unknown SKU — no catalog entry. No production contract invented.",
    };
  }

  if (!isActiveCustomerFacingSku(skuId)) {
    return {
      status: "not_active_customer_facing",
      skuId,
      launchStatus: service.launchStatus ?? service.serviceStatus ?? null,
      message:
        "SKU is not in the locked active customer-facing production-capability set. It must not masquerade as launch-ready production.",
    };
  }

  const contract = buildContract(skuId as ServiceId);
  if (!contract) {
    return {
      status: "not_active_customer_facing",
      skuId,
      launchStatus: service.launchStatus ?? null,
      message:
        "Active-set SKU is missing a production override — contract incomplete (PARTIAL data error).",
    };
  }

  return { status: "resolved", contract };
}

export function requireResolvedProductionContract(
  skuId: string,
): ServiceProductionContract {
  const result = resolveServiceProductionContract(skuId);
  if (result.status !== "resolved") {
    throw new Error(`Expected resolved contract for ${skuId}: ${result.status}`);
  }
  return result.contract;
}

export function summarizeProductionContract(
  contract: ServiceProductionContract,
): KitchenProductionContractSummary {
  return {
    skuId: contract.skuId,
    producerRole: contract.producerRole,
    producerRoleLabel: campaignTasksConfig.productionRoleLabels[contract.producerRole],
    primaryToolLabel: contract.primaryTool.label,
    toolReadiness: contract.primaryTool.toolReadiness,
    readiness: contract.readiness,
    readinessLabel: PRODUCTION_READINESS_LABELS[contract.readiness],
    requiredInputCount: contract.requiredCustomerInputs.length,
    qaItemCount: contract.qaItems.length,
    deliverableCount: contract.deliverables.length,
    readinessNotes: contract.readinessNotes,
  };
}

export function summarizeProductionContractForSku(
  skuId: string,
): KitchenProductionContractSummary | null {
  const result = resolveServiceProductionContract(skuId);
  if (result.status !== "resolved") return null;
  return summarizeProductionContract(result.contract);
}

/** Explicit proof helper: contract resolution never implies owner escalation. */
export function contractResolutionCreatesOwnerWork(
  _result: ContractLookupResult,
): false {
  return false;
}

export function producerRoleForSku(skuId: string): ProductionRole | null {
  const result = resolveServiceProductionContract(skuId);
  return result.status === "resolved" ? result.contract.producerRole : null;
}
