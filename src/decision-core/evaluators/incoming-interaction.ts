import { clientRevisionRoundWouldExceed } from "@/lib/job-control/review-room-gates";
import { evaluateClientRefundChannelRequest } from "@/lib/campaign-tasks/refund-request-routing";

import type {
  CustomerInteractionKind,
  DecisionContext,
  DecisionOutcome,
  IncomingCustomerEventType,
} from "../types";

const EVENT_TO_KIND: Record<IncomingCustomerEventType, CustomerInteractionKind> = {
  project_question: "project_question",
  clarification_request: "clarification_request",
  status_inquiry: "status_inquiry",
  missing_file_upload: "missing_file_upload",
  revision_message: "revision_message",
  revision_request: "revision_message",
  delivery_approval: "status_inquiry",
  payment_question: "payment_question",
  scope_request: "scope_request",
  refund_request: "refund_request",
  complaint: "complaint",
  support_request: "general_inquiry",
  general_inquiry: "general_inquiry",
};

const ESCALATION_KINDS = new Set<CustomerInteractionKind>(["scope_request", "complaint"]);

export function classifyIncomingCustomerEvent(
  eventType: IncomingCustomerEventType,
): CustomerInteractionKind {
  return EVENT_TO_KIND[eventType];
}

function refundOutcomeFromChannelRouting(
  context: DecisionContext,
  trigger: { type: "incoming_customer_event"; eventType: IncomingCustomerEventType },
): DecisionOutcome | null {
  const facts = context.facts as Record<string, unknown> | undefined;
  const routing = evaluateClientRefundChannelRequest({
    eventType: trigger.eventType,
    message: typeof facts?.message === "string" ? facts.message : undefined,
    inputMode: facts?.inputMode === "voice" ? "voice" : "text",
    sourceChannel: facts?.sourceChannel,
    facts,
  });

  if (routing.kind === "not_refund") return null;

  const interactionKind: CustomerInteractionKind = "refund_request";
  const matchedRules = [
    {
      ruleId: `decision-core:incoming:refund-channel:${routing.sourceChannel}`,
      matchedValue: routing.kind,
      source: "lib/campaign-tasks/refund-request-routing.ts",
    },
  ];
  const effects: DecisionOutcome["effects"] = [
    { kind: "record_incoming_interaction", interactionKind },
  ];

  if (routing.kind === "reject_voice" || routing.kind === "intake_required") {
    return {
      domain: "customer_interaction",
      determination: "respond",
      humanReviewRequired: false,
      effects,
      matchedRules,
      warnings: [],
      payload: {
        interactionKind,
        squishyMessage: routing.squishyMessage,
        sourceChannel: routing.sourceChannel,
      },
    };
  }

  effects.push({
    kind: "submit_refund_request",
    reason: routing.intake.reason,
    requestedOutcome: routing.intake.requestedOutcome,
    supportingDetails: routing.intake.supportingDetails,
    sourceChannel: routing.intake.sourceChannel,
  });

  return {
    domain: "customer_interaction",
    determination: "escalate",
    humanReviewRequired: true,
    effects,
    matchedRules,
    warnings: [],
    payload: { interactionKind, sourceChannel: routing.sourceChannel },
  };
}

export function evaluateIncomingCustomerInteraction(
  context: DecisionContext,
): DecisionOutcome {
  const trigger = context.trigger;
  if (trigger.type !== "incoming_customer_event") {
    return {
      domain: "customer_interaction",
      determination: "deny",
      matchedRules: [],
      humanReviewRequired: false,
      effects: [],
      warnings: [{ code: "invalid_trigger", message: "Expected incoming_customer_event trigger." }],
    };
  }

  const refundOutcome = refundOutcomeFromChannelRouting(context, trigger);
  if (refundOutcome) return refundOutcome;

  const interactionKind = classifyIncomingCustomerEvent(trigger.eventType);
  const matchedRules = [
    {
      ruleId: `decision-core:incoming:${trigger.eventType}`,
      matchedValue: interactionKind,
      source: "decision-core/evaluators/incoming-interaction.ts",
    },
  ];

  let determination: DecisionOutcome["determination"] = "respond";
  let humanReviewRequired = false;
  const effects: DecisionOutcome["effects"] = [
    { kind: "record_incoming_interaction", interactionKind },
  ];

  if (trigger.eventType === "revision_request" || trigger.eventType === "revision_message") {
    const revisionRoundsUsed = Number(context.facts.revisionRoundsUsed ?? 0);
    const revisionRoundsIncluded = Number(context.facts.revisionRoundsIncluded ?? 0);
    const wouldExceed = clientRevisionRoundWouldExceed(
      revisionRoundsUsed,
      revisionRoundsIncluded,
    );

    matchedRules.push({
      ruleId: "job-control:review-room-gates:clientRevisionRoundWouldExceed",
      matchedValue: String(wouldExceed),
      source: "lib/job-control/review-room-gates.ts",
    });

    if (wouldExceed) {
      determination = "escalate";
      humanReviewRequired = true;
      effects.push({
        kind: "raise_exception",
        exceptionKind: "revision_exhausted",
      });
    } else {
      determination = "allow";
      effects.push({ kind: "append_activity_event", note: "client_revision_request" });
    }
  } else if (ESCALATION_KINDS.has(interactionKind)) {
    determination = "escalate";
    humanReviewRequired = true;
    effects.push({ kind: "raise_exception" });
  } else if (interactionKind === "missing_file_upload") {
    determination = "allow";
    effects.push({ kind: "append_activity_event", note: "client_upload" });
  } else if (trigger.eventType === "delivery_approval") {
    determination = "allow";
    effects.push({ kind: "append_activity_event", note: "client_delivery_approval" });
  }

  return {
    domain: "customer_interaction",
    determination,
    matchedRules,
    humanReviewRequired,
    effects,
    warnings: [],
    payload: { interactionKind },
  };
}
