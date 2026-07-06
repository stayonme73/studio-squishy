import { recommendFromDiscovery } from "@/recommendation";
import type { DiscoveryBrief } from "@/recommendation/types";

import type { DecisionContext, DecisionOutcome } from "../types";

export function evaluateDiscovery(context: DecisionContext): DecisionOutcome {
  const brief = context.facts.brief as DiscoveryBrief | undefined;
  if (!brief) {
    return {
      domain: "discovery",
      determination: "deny",
      matchedRules: [],
      humanReviewRequired: false,
      effects: [],
      warnings: [{ code: "missing_brief", message: "Discovery brief is required." }],
    };
  }

  const result = recommendFromDiscovery(brief);

  const matchedRules = result.recommendations.flatMap((entry) =>
    entry.matchedRules.map((rule) => ({
      ruleId: `${rule.serviceId}:${rule.rule.signal}:${rule.rule.value}`,
      matchedValue: rule.matchedValue,
      source: "recommendation/engine.ts",
    })),
  );

  return {
    domain: "discovery",
    determination: result.recommendations.length > 0 ? "respond" : "no_action",
    matchedRules,
    humanReviewRequired: result.requiresApproval,
    effects: [],
    warnings: result.warnings.map((warning) => ({
      code: warning.kind,
      message: warning.message,
    })),
    recommendationResult: result,
    payload: { primaryServiceId: result.primaryServiceId },
  };
}
