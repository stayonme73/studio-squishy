import { exceptionKindRequiresOwner } from "@/config/campaign-exceptions";
import { resolveOwnerReviewRequired } from "@/lib/campaign-tasks/exceptions-view";
import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";

import type { DecisionContext, DecisionOutcome } from "../types";

export type EscalationFacts = {
  exception: CampaignExceptionRecord;
};

export function evaluateEscalation(context: DecisionContext): DecisionOutcome {
  const exception = context.facts.exception as CampaignExceptionRecord | undefined;
  if (!exception) {
    return {
      domain: "escalation",
      determination: "no_action",
      matchedRules: [],
      humanReviewRequired: false,
      effects: [],
      warnings: [{ code: "missing_exception", message: "Exception record is required." }],
    };
  }

  const ownerReviewRequired = resolveOwnerReviewRequired(exception);
  const ownerHeld = exceptionKindRequiresOwner(exception.kind);

  const matchedRules = [
    {
      ruleId: `campaign-exceptions:kind:${exception.kind}`,
      matchedValue: exception.status,
      source: "config/campaign-exceptions.ts",
    },
    {
      ruleId: "campaign-tasks/exceptions-view:resolveOwnerReviewRequired",
      matchedValue: String(ownerReviewRequired),
      source: "lib/campaign-tasks/exceptions-view.ts",
    },
  ];

  return {
    domain: "escalation",
    determination: ownerReviewRequired ? "escalate" : "no_action",
    matchedRules,
    humanReviewRequired: ownerReviewRequired,
    effects: ownerReviewRequired
      ? [{ kind: "raise_exception", exceptionKind: exception.kind }]
      : [],
    warnings: [],
    payload: {
      ownerHeld,
      ownerReviewRequired,
      exceptionKind: exception.kind,
      exceptionStatus: exception.status,
    },
  };
}
