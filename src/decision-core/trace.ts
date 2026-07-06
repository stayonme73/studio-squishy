import type { DecisionContext, DecisionOutcome } from "./types";

/** Dev-only trace — does not affect production behavior. */
export function traceDecisionOutcome(
  context: DecisionContext,
  outcome: DecisionOutcome,
): void {
  if (process.env.NODE_ENV === "production") return;

  const ruleIds = outcome.matchedRules.map((rule) => rule.ruleId);
  console.debug("[decision-core]", {
    domain: context.domain,
    campaignId: context.campaignId,
    jobId: context.jobId,
    actor: context.actor,
    trigger: context.trigger,
    determination: outcome.determination,
    humanReviewRequired: outcome.humanReviewRequired,
    matchedRuleIds: ruleIds,
    effectKinds: outcome.effects.map((effect) => effect.kind),
    warningCount: outcome.warnings.length,
  });
}
