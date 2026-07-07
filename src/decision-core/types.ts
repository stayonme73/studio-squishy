import type { RecommendationResult } from "@/recommendation/types";

/** Canonical Decision Core module version — Phase 1–2. */
export const DECISION_CORE_VERSION = "1.0.0";

export type DecisionDomain =
  | "discovery"
  | "job_control"
  | "communication"
  | "customer_interaction"
  | "escalation"
  | "refund"
  | "scope"
  | "revision"
  | "production_trigger";

export type DecisionActorRole = "client" | "staff" | "owner" | "system";

export type DecisionDetermination =
  | "allow"
  | "deny"
  | "defer"
  | "escalate"
  | "notify"
  | "respond"
  | "no_action";

export type IncomingCustomerEventType =
  | "project_question"
  | "clarification_request"
  | "status_inquiry"
  | "missing_file_upload"
  | "revision_message"
  | "revision_request"
  | "delivery_approval"
  | "payment_question"
  | "scope_request"
  | "refund_request"
  | "complaint"
  | "support_request"
  | "general_inquiry";

export type CustomerInteractionKind =
  | "project_question"
  | "clarification_request"
  | "status_inquiry"
  | "missing_file_upload"
  | "revision_message"
  | "payment_question"
  | "scope_request"
  | "refund_request"
  | "complaint"
  | "general_inquiry";

export type DecisionTrigger =
  | { type: "discovery_brief_submitted" }
  | { type: "communication_sync"; nowMs?: number }
  | { type: "incoming_customer_event"; eventType: IncomingCustomerEventType }
  | { type: "exception_evaluated" }
  | { type: "refund_eligibility_check"; nowMs?: number }
  | { type: "production_trigger_check" };

export type MatchedRule = {
  ruleId: string;
  matchedValue?: string;
  source: string;
};

export type PlannedEffect =
  | { kind: "campaign_record_patch"; note: string }
  | { kind: "job_record_patch"; note: string }
  | { kind: "enqueue_communication"; communicationId?: string; eventType?: string }
  | { kind: "append_activity_event"; note: string }
  | { kind: "raise_exception"; exceptionKind?: string }
  | { kind: "resolve_exception"; note: string }
  | { kind: "task_workflow_block"; reason?: string }
  | { kind: "record_incoming_interaction"; interactionKind: CustomerInteractionKind }
  | {
      kind: "submit_refund_request";
      reason: string;
      requestedOutcome: string;
      supportingDetails?: string;
      sourceChannel?: string;
    };

export type DecisionWarning = {
  code: string;
  message: string;
};

export type DecisionContext = {
  domain: DecisionDomain;
  campaignId: string;
  jobId?: string;
  actor: DecisionActorRole;
  trigger: DecisionTrigger;
  interactionKind?: CustomerInteractionKind;
  occurredAt: string;
  /** Opaque facts bag — evaluators cast to their expected shapes. */
  facts: Record<string, unknown>;
};

export type DecisionOutcome = {
  domain: DecisionDomain;
  determination: DecisionDetermination;
  matchedRules: MatchedRule[];
  humanReviewRequired: boolean;
  effects: PlannedEffect[];
  warnings: DecisionWarning[];
  /** Present when domain is discovery — passthrough from Recommendation Engine. */
  recommendationResult?: RecommendationResult;
  /** Evaluator-specific payload for parity tests and downstream mutators. */
  payload?: Record<string, unknown>;
};

export type DomainEvaluator = (context: DecisionContext) => DecisionOutcome;
