import type { ServiceId } from "@/catalog/types";
import type {
  DispatchEnvelopeStatus,
  DispatchOutcome,
} from "@/config/studio-dispatch-v1";
import type { CampaignRecord } from "@/config/studio-board";
import type { ProductionRole, ProductionTaskFamilyId } from "@/lib/campaign-tasks/types";
import type { ProductionControlLane } from "@/lib/job-control/types";
import type {
  ProductionCapabilityReadiness,
  ProductionToolId,
  ProductionToolIntegrationState,
  ProductionToolReadiness,
} from "@/lib/studio-kitchen-production/types";

/** Tool reference snapshot — never an invocation receipt. */
export type DispatchToolRefSnapshot = {
  toolId: ProductionToolId;
  label: string;
  integrationState: ProductionToolIntegrationState;
  toolReadiness: ProductionToolReadiness;
  required: boolean;
};

/**
 * Exposed production requirements for one job — evidence for Tool Coordination.
 * Sourced from ServiceProductionContract; no invented rules.
 */
export type DispatchProductionRequirements = {
  productionFamilyId: ProductionTaskFamilyId;
  catalogFamilyId: string;
  producerRole: ProductionRole;
  supportingRoles: readonly ProductionRole[];
  requiredCustomerInputs: readonly string[];
  requiredStudioInputs: readonly string[];
  optionalInputs: readonly string[];
  productionSteps: readonly {
    id: string;
    label: string;
    taskPhase: string | null;
    responsibleRole: ProductionRole;
  }[];
  qaItemIds: readonly string[];
  deliverables: readonly string[];
  formatExportRequirements: readonly string[];
  limitations: readonly string[];
  primaryTool: DispatchToolRefSnapshot;
  optionalTools: readonly DispatchToolRefSnapshot[];
  capabilityReadiness: ProductionCapabilityReadiness;
  readinessNotes: string;
};

/**
 * One durable execution identity per job that routing marked dispatch-eligible
 * (or a truthful non-ready status when upstream blocks).
 */
export type JobDispatchRecord = {
  dispatchId: string;
  routingDecisionId: string | null;
  jobId: string;
  campaignId: string;
  skuId: ServiceId;
  status: DispatchOutcome;
  productionFamilyId: ProductionTaskFamilyId | null;
  controlLane: ProductionControlLane | null;
  routingFactFingerprint: string | null;
  requirements: DispatchProductionRequirements | null;
  evaluatedAt: string;
  reason: string | null;
  blocker: string | null;
  /** True only when status is EXECUTION_IDENTITY_READY. */
  executionIdentityReady: boolean;
  ownerActionRequired: false;
};

export type DispatchExecutionRecord = {
  schemaVersion: 1;
  status: DispatchEnvelopeStatus;
  evaluatedAt: string;
  lastAttemptAt: string;
  activationCheckoutSessionId: string;
  records: readonly JobDispatchRecord[];
  ownerActionRequired: false;
  lastError?: string | null;
};

export type DispatchExecutionResult =
  | {
      ok: true;
      campaign: CampaignRecord;
      dispatch: DispatchExecutionRecord;
      alreadyEvaluated: boolean;
    }
  | {
      ok: false;
      campaign: CampaignRecord;
      dispatch: DispatchExecutionRecord | null;
      error:
        | "payment_not_confirmed"
        | "routing_incomplete"
        | "dispatch_failed";
      message: string;
    };
