import type { DecisionDomain, DomainEvaluator } from "./types";

const evaluators = new Map<DecisionDomain, DomainEvaluator>();

export function registerDecisionEvaluator(
  domain: DecisionDomain,
  evaluator: DomainEvaluator,
): void {
  evaluators.set(domain, evaluator);
}

export function getDecisionEvaluator(
  domain: DecisionDomain,
): DomainEvaluator | undefined {
  return evaluators.get(domain);
}

export function listRegisteredDecisionDomains(): DecisionDomain[] {
  return [...evaluators.keys()];
}

export function clearDecisionEvaluatorRegistry(): void {
  evaluators.clear();
}
