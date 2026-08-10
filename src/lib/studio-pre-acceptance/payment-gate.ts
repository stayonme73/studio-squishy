import { studioPreAcceptanceV1 } from "@/config/studio-pre-acceptance-v1";

import { evaluatePreAcceptance } from "./evaluate";
import { buildPreAcceptanceFactFingerprint } from "./fingerprint";
import {
  persistPreAcceptanceDecision,
  readPersistedPreAcceptanceDecision,
} from "./persist";
import type {
  PreAcceptanceDecision,
  PreAcceptanceProjectFacts,
} from "./types";

export type PreAcceptancePaymentGateResult =
  | { allowed: true; decision: PreAcceptanceDecision }
  | {
      allowed: false;
      reason:
        | "missing_decision"
        | "stale_decision"
        | "outcome_not_clear"
        | "reevaluated_not_clear";
      decision: PreAcceptanceDecision | null;
      message: string;
    };

/**
 * Fail-closed payment authorization.
 * Re-evaluates when missing/stale so material fact changes cannot keep a CLEAR.
 */
export function assertPreAcceptanceAllowsPayment(
  facts: PreAcceptanceProjectFacts,
): PreAcceptancePaymentGateResult {
  const copy = studioPreAcceptanceV1.customerCopy;
  const currentFp = buildPreAcceptanceFactFingerprint(facts);
  const persisted = readPersistedPreAcceptanceDecision();

  if (!persisted) {
    const fresh = evaluatePreAcceptance(facts);
    persistPreAcceptanceDecision(fresh);
    if (!fresh.paymentAllowed) {
      return {
        allowed: false,
        reason: "missing_decision",
        decision: fresh,
        message: fresh.customerMessage ?? copy.missingDecision,
      };
    }
    return { allowed: true, decision: fresh };
  }

  if (
    persisted.factFingerprint !== currentFp ||
    persisted.draftRevision !== facts.draftRevision
  ) {
    const fresh = evaluatePreAcceptance(facts);
    persistPreAcceptanceDecision(fresh);
    if (!fresh.paymentAllowed) {
      return {
        allowed: false,
        reason: "stale_decision",
        decision: fresh,
        message: fresh.customerMessage ?? copy.staleDecision,
      };
    }
    return { allowed: true, decision: fresh };
  }

  if (
    persisted.outcome !== studioPreAcceptanceV1.outcomes.clearToAccept ||
    !persisted.paymentAllowed
  ) {
    return {
      allowed: false,
      reason: "outcome_not_clear",
      decision: persisted,
      message: persisted.customerMessage ?? copy.missingDecision,
    };
  }

  return { allowed: true, decision: persisted };
}

/** Evaluate + persist — used at Plan → Checkout door. */
export function runPreAcceptanceForCheckout(
  facts: PreAcceptanceProjectFacts,
): PreAcceptanceDecision {
  const decision = evaluatePreAcceptance(facts);
  persistPreAcceptanceDecision(decision);
  return decision;
}

export function isClearToAccept(decision: PreAcceptanceDecision): boolean {
  return (
    decision.outcome === studioPreAcceptanceV1.outcomes.clearToAccept &&
    decision.paymentAllowed === true
  );
}
