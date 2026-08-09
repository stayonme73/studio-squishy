import type { ServiceId } from "@/catalog/types";
import type { ProductionRole, ProductionTaskFamilyId, TaskPhase } from "@/lib/campaign-tasks/types";

/**
 * Overall production-capability readiness for an active customer-facing SKU.
 * A catalog promise alone never implies CONTRACT READY.
 *
 * CONTRACT READY ≠ CUSTOMER READY ≠ LAUNCH READY.
 * CONTRACT READY only means a defined contract exists that is sufficient to begin
 * real production-quality testing — not that the service may be sold/fulfilled as certified.
 */
export type ProductionCapabilityReadiness =
  | "contract_ready"
  | "contract_ready_integration_required"
  | "partial"
  | "unsupported"
  | "contradictory";

/** Tool-path honesty — naming a tool is not proof of live integration. */
export type ProductionToolReadiness =
  | "contract_ready"
  | "tool_integration_required"
  | "manual_operational_path_exists"
  | "unsupported"
  | "authority_tool_unclear";

export type ProductionToolId =
  | "canva"
  | "capcut"
  | "shotstack"
  | "text_model"
  | "ai_voice_tool"
  | "studio_landing_page_structure"
  | "manual_platform_admin"
  | "none_specified";

export type ProductionToolIntegrationState =
  | "not_integrated"
  | "manual_operational"
  | "partial_adapter"
  | "integrated";

export type ProductionToolRef = {
  toolId: ProductionToolId;
  label: string;
  required: boolean;
  integrationState: ProductionToolIntegrationState;
  toolReadiness: ProductionToolReadiness;
  note: string;
};

export type ProductionStepContract = {
  id: string;
  label: string;
  /** Maps to existing task-phase architecture when applicable. */
  taskPhase: TaskPhase | null;
  responsibleRole: ProductionRole;
  summary: string;
};

export type ProductionQaItem = {
  id: string;
  label: string;
  /** Why this check exists — traces to promise, limit, delivery, or technical need. */
  reason: string;
  source:
    | "catalog_qa_checklist"
    | "universal_phase_qa"
    | "service_contract"
    | "deliverable_format"
    | "catalog_exclusion";
};

export type RevisionContractRef = {
  /** Catalog / frozen plan revision rule text — not a new policy. */
  revisionRuleAuthority: "catalog_revision_rule";
  revisionRuleText: string;
  receivesRevisionRole: ProductionRole;
  recheckQaNote: string;
  exhaustedEscalation:
    | "owner_desk_revision_limit"
    | "producer_within_allowance_only";
  withinAllowanceOwnerRequired: false;
};

export type EscalationHandler =
  | "producer"
  | "qa"
  | "manager_system"
  | "decision_core"
  | "owner";

export type EscalationContract = {
  producerHandles: readonly string[];
  qaHandles: readonly string[];
  managerOrSystemHandles: readonly string[];
  decisionCoreHandles: readonly string[];
  ownerHandles: readonly string[];
  /** Explicit: resolving/looking up a contract never creates owner work. */
  contractLookupCreatesOwnerWork: false;
};

export type ServiceProductionContract = {
  skuId: ServiceId;
  serviceName: string;
  productionFamilyId: ProductionTaskFamilyId;
  catalogFamilyId: string;
  producerRole: ProductionRole;
  supportingRoles: readonly ProductionRole[];
  primaryTool: ProductionToolRef;
  optionalTools: readonly ProductionToolRef[];
  requiredCustomerInputs: readonly string[];
  requiredStudioInputs: readonly string[];
  optionalInputs: readonly string[];
  productionSteps: readonly ProductionStepContract[];
  qaItems: readonly ProductionQaItem[];
  /** Catalog deliverables — not expanded beyond authorized promise. */
  deliverables: readonly string[];
  formatExportRequirements: readonly string[];
  /** Catalog exclusions plus contract honesty notes. */
  limitations: readonly string[];
  revision: RevisionContractRef;
  escalation: EscalationContract;
  customerReviewHandoff: string;
  finalDeliveryCriteria: readonly string[];
  readiness: ProductionCapabilityReadiness;
  readinessNotes: string;
  specialNotes: readonly string[];
};

/** Compact projection for Kitchen / work packets — no writes. */
export type KitchenProductionContractSummary = {
  skuId: ServiceId;
  producerRole: ProductionRole;
  producerRoleLabel: string;
  primaryToolLabel: string;
  toolReadiness: ProductionToolReadiness;
  readiness: ProductionCapabilityReadiness;
  readinessLabel: string;
  requiredInputCount: number;
  qaItemCount: number;
  deliverableCount: number;
  readinessNotes: string;
};

export type ProductionCapabilityMatrixRow = {
  skuId: ServiceId;
  serviceName: string;
  producerRole: ProductionRole;
  primaryToolLabel: string;
  requiredInputsSummary: string;
  productionMethodSummary: string;
  qaSummary: string;
  customerReceivesSummary: string;
  limitationsSummary: string;
  readiness: ProductionCapabilityReadiness;
  readinessLabel: string;
  /**
   * True when the contract is defined enough for internal production-quality testing.
   * Never means customer-ready or launch-ready certification.
   */
  canProceedToProductionQualityTesting: boolean;
};

export type ContractLookupResult =
  | { status: "resolved"; contract: ServiceProductionContract }
  | {
      status: "unknown_sku";
      skuId: string;
      message: string;
    }
  | {
      status: "not_active_customer_facing";
      skuId: string;
      launchStatus: string | null;
      message: string;
    };
