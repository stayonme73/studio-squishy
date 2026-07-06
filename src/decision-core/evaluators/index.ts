import { registerDecisionEvaluator } from "../registry";
import { evaluateDiscovery } from "./discovery";
import { evaluateEscalation } from "./escalation";
import { evaluateIncomingCustomerInteraction, classifyIncomingCustomerEvent } from "./incoming-interaction";
import { evaluateOutgoingCommunicationEvents } from "./outgoing-communication";
import { evaluateProductionTrigger } from "./production-trigger";
import { evaluateRefundEligibility } from "./refund-eligibility";

let registered = false;

/** Register Phase 1–2 evaluators — orchestrates existing modules only. */
export function registerDefaultDecisionEvaluators(): void {
  if (registered) return;

  registerDecisionEvaluator("discovery", evaluateDiscovery);
  registerDecisionEvaluator("communication", evaluateOutgoingCommunicationEvents);
  registerDecisionEvaluator("customer_interaction", evaluateIncomingCustomerInteraction);
  registerDecisionEvaluator("escalation", evaluateEscalation);
  registerDecisionEvaluator("refund", evaluateRefundEligibility);
  registerDecisionEvaluator("production_trigger", evaluateProductionTrigger);

  registered = true;
}

export function resetDefaultDecisionEvaluatorRegistration(): void {
  registered = false;
}

export {
  classifyIncomingCustomerEvent,
  evaluateDiscovery,
  evaluateEscalation,
  evaluateIncomingCustomerInteraction,
  evaluateOutgoingCommunicationEvents,
  evaluateProductionTrigger,
  evaluateRefundEligibility,
};
