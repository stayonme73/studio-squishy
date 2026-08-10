/**
 * Pre-acceptance decision types.
 * POST-PAY Acceptance Review remains a separate production-start gate.
 */

import type { StudioPreAcceptanceOutcome } from "@/config/studio-pre-acceptance-v1";

export type PreAcceptanceCapabilityVerdict =
  | "launchable"
  | "not_launchable"
  | "unmapped";

export type PreAcceptanceTimingVerdict =
  | "NO_KNOWN_TIMING_CONFLICT"
  | "CLARIFICATION_NEEDED"
  | "UNSUPPORTED";

export type PreAcceptanceClarificationVerdict =
  | "sufficient"
  | "material_gap";

export type PreAcceptanceRiskVerdict =
  | "clear"
  | "owner_policy_review"
  | "decline";

export type PreAcceptanceSkuCapabilityResult = {
  skuId: string;
  launchDisposition: string | null;
  verdict: PreAcceptanceCapabilityVerdict;
  reason: string;
};

export type PreAcceptanceDecision = {
  decisionId: string;
  schemaVersion: number;
  packageId: string;
  /** Working-draft revision at evaluation time. */
  draftRevision: number;
  /** Fingerprint of material facts; must match to authorize payment. */
  factFingerprint: string;
  selectedServiceIds: readonly string[];
  routeId: string | null;
  capability: {
    verdict: "pass" | "fail";
    perSku: readonly PreAcceptanceSkuCapabilityResult[];
    weakestDisposition: string | null;
  };
  timing: {
    verdict: PreAcceptanceTimingVerdict;
    requestedDeadline: string;
    deadlineStatus: string;
    reason: string;
    requiredMinBusinessDays: number | null;
    availableBusinessDays: number | null;
    evidenceSource: "catalog_timing_windows" | "none";
  };
  clarification: {
    verdict: PreAcceptanceClarificationVerdict;
    gaps: readonly string[];
    customerPrompt: string | null;
  };
  riskPolicy: {
    verdict: PreAcceptanceRiskVerdict;
    reasons: readonly string[];
  };
  outcome: StudioPreAcceptanceOutcome;
  reasons: readonly string[];
  blockingFacts: readonly string[];
  nonBlockingFacts: readonly string[];
  paymentAllowed: boolean;
  escalationTarget: "none" | "owner_policy" | null;
  customerMessage: string | null;
  voiceLine: string | null;
  evaluatedAt: string;
};

export type PreAcceptanceProjectFacts = {
  draftRevision: number;
  routeId: string | null;
  selectedServiceIds: readonly string[];
  projectNeed: string;
  businessName: string;
  requestedDeadline: string;
  deadlineStatus: string;
  existingMaterialsNote: string;
  /** Optional free-text that may carry risk signals (same as projectNeed typically). */
  riskScanText?: string;
  /**
   * Narrow known material-rights signals before payment.
   * Distinct from post-payment per-material approved-for-use clearance.
   */
  materialRightsSignals?: {
    hasHardRightsBlock?: boolean;
    hasAcceptanceBlockingRightsAmbiguity?: boolean;
    hasOwnerPolicyMaterialHold?: boolean;
    clarificationPrompt?: string;
  };
};
