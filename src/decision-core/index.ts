/**
 * Decision Core — orchestration layer (Phase 1–2).
 *
 * Motto: orchestrate existing systems, not replace them.
 * Docs: docs/studio-decision-core-foundation-v1-locked.md
 *
 * Import from `@/decision-core` only; evaluators wrap existing modules.
 */

export {
  DECISION_CORE_VERSION,
  type CustomerInteractionKind,
  type DecisionActorRole,
  type DecisionContext,
  type DecisionDetermination,
  type DecisionDomain,
  type DecisionOutcome,
  type DecisionTrigger,
  type DecisionWarning,
  type DomainEvaluator,
  type IncomingCustomerEventType,
  type MatchedRule,
  type PlannedEffect,
} from "./types";

export {
  clearDecisionEvaluatorRegistry,
  getDecisionEvaluator,
  listRegisteredDecisionDomains,
  registerDecisionEvaluator,
} from "./registry";

export { evaluateDecision } from "./orchestrator";

export { traceDecisionOutcome } from "./trace";

export {
  classifyIncomingCustomerEvent,
  evaluateDiscovery,
  evaluateEscalation,
  evaluateIncomingCustomerInteraction,
  evaluateOutgoingCommunicationEvents,
  evaluateProductionTrigger,
  evaluateRefundEligibility,
  registerDefaultDecisionEvaluators,
  resetDefaultDecisionEvaluatorRegistration,
} from "./evaluators";

export type { OutgoingCommunicationFacts } from "./evaluators/outgoing-communication";
export type { EscalationFacts } from "./evaluators/escalation";
export type { RefundEligibilityFacts } from "./evaluators/refund-eligibility";
export type { ProductionTriggerFacts } from "./evaluators/production-trigger";
