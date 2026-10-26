import type { ProductionAttemptKind } from "@/config/studio-production-team-workforce-v1";

/**
 * Standing policy:
 * Customer changes direction = customer revision.
 * Studio fails to execute existing direction/spec/quality = Studio correction.
 * Internal Production/QA retry = neither.
 */
export function classifyProductionAttempt(input: {
  customerChangedDirection: boolean;
  studioFailedExistingDirection: boolean;
  internalProductionQaRetry: boolean;
}): ProductionAttemptKind {
  if (input.customerChangedDirection) return "customer_revision";
  if (input.studioFailedExistingDirection) return "studio_correction";
  if (input.internalProductionQaRetry) return "internal_retry";
  return "internal_retry";
}

export function attemptKindFromLoopOrigin(
  origin: "initial_production" | "studio_quality_correction" | "technical_recovery" | undefined,
): ProductionAttemptKind {
  if (origin === "studio_quality_correction") return "studio_correction";
  return "internal_retry";
}
