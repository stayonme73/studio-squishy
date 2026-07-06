import { getDecisionEvaluator } from "./registry";
import { registerDefaultDecisionEvaluators } from "./evaluators";
import { traceDecisionOutcome } from "./trace";
import type { DecisionContext, DecisionOutcome } from "./types";

export function evaluateDecision(context: DecisionContext): DecisionOutcome {
  registerDefaultDecisionEvaluators();

  const evaluator = getDecisionEvaluator(context.domain);
  if (!evaluator) {
    const outcome: DecisionOutcome = {
      domain: context.domain,
      determination: "deny",
      matchedRules: [],
      humanReviewRequired: false,
      effects: [],
      warnings: [
        {
          code: "unregistered_domain",
          message: `No evaluator registered for domain: ${context.domain}`,
        },
      ],
    };
    traceDecisionOutcome(context, outcome);
    return outcome;
  }

  const outcome = evaluator(context);
  traceDecisionOutcome(context, outcome);
  return outcome;
}
