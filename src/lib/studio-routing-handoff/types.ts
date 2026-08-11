import type { ServiceId } from "@/catalog/types";
import type {
  RoutingHandoffStatus,
  RoutingOutcome,
} from "@/config/studio-routing-handoff-v1";
import type { CampaignRecord } from "@/config/studio-board";
import type { ProductionTaskFamilyId } from "@/lib/campaign-tasks/types";
import type { ProductionControlLane } from "@/lib/job-control/types";
import type { ProductionCapabilityReadiness } from "@/lib/studio-kitchen-production/types";

/**
 * One durable routing decision per purchased job/SKU.
 * Capability-level only — no vendor/tool selection.
 */
export type JobRoutingDecision = {
  decisionId: string;
  jobId: string;
  campaignId: string;
  skuId: ServiceId;
  status: RoutingOutcome;
  /** Certified method family from production contract — not a vendor. */
  productionFamilyId: ProductionTaskFamilyId | null;
  controlLane: ProductionControlLane;
  capabilityReadiness: ProductionCapabilityReadiness | null;
  factFingerprint: string;
  evaluatedAt: string;
  reason: string | null;
  blocker: string | null;
  /** True only when status is READY_FOR_DISPATCH. */
  readyForDispatch: boolean;
  /** Always false for routine routing. */
  ownerActionRequired: false;
};

export type RoutingHandoffRecord = {
  schemaVersion: 1;
  status: RoutingHandoffStatus;
  evaluatedAt: string;
  lastAttemptAt: string;
  activationCheckoutSessionId: string;
  decisions: readonly JobRoutingDecision[];
  ownerActionRequired: false;
  lastError?: string | null;
};

export type RoutingHandoffResult =
  | {
      ok: true;
      campaign: CampaignRecord;
      handoff: RoutingHandoffRecord;
      alreadyEvaluated: boolean;
    }
  | {
      ok: false;
      campaign: CampaignRecord;
      handoff: RoutingHandoffRecord | null;
      error:
        | "payment_not_confirmed"
        | "activation_incomplete"
        | "routing_failed";
      message: string;
    };
