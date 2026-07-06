/**
 * Studio Coordinator — Squishy's operating layer (Phase 1).
 *
 * Orchestrates Decision Core + existing mutators. No UI, no artwork.
 * Docs: docs/studio-coordinator-v1-planned.md
 *
 * Import from `@/studio-coordinator` only.
 */

export { STUDIO_COORDINATOR_VERSION } from "./types";

export type {
  ClientCoordinatorEvent,
  ClientCoordinatorEventType,
  CoordinateClientEventResult,
  CoordinateOwnerOutcomeResult,
  CoordinatorAuditEntry,
  CoordinatorClientSummary,
  CoordinatorExecutionState,
  CoordinatorObservation,
  CoordinatorObservationKind,
  CoordinatorOwnerSummary,
  CoordinatorSession,
  LearningCandidate,
  OwnerCoordinatorAction,
  OwnerCoordinatorOutcome,
} from "./types";

export {
  COORDINATOR_SYSTEM_USER,
  CLIENT_EVENT_DOMAIN,
  INTERACTION_EXCEPTION_MAPPINGS,
} from "./config";

export { createCoordinatorSession, appendCoordinatorAuditEntry, traceCoordinatorAudit } from "./audit";

export { CONFIDENCE_COPY, resolveClientConfidenceMessage, resolveOwnerConfidenceMessage } from "./briefings/confidence";

export {
  resolveCoordinatorTraceForCard,
  resolveOwnerDeskBriefing,
  resolveOwnerDeskBriefingByItemId,
  resolveOwnerDeskGreeting,
  resolveOwnerDeskGreetingParts,
  resolveOwnerDeskSummary,
  resolveOwnerDeskJobPostDecisionBriefing,
  resolveOwnerComplianceHoldPostDecisionBriefing,
  resolveOwnerPostDecisionBriefing,
} from "./briefings/owner-desk";
export type {
  OwnerComplianceHoldAction,
  OwnerDeskBriefing,
  OwnerDeskBriefingFacts,
  OwnerDeskBreakdownLine,
  OwnerDeskGreetingParts,
  OwnerDeskJobAction,
  OwnerDeskSummary,
  OwnerPostDecisionBriefing,
  OwnerPostDecisionDestination,
} from "./briefings/owner-desk";

export { executeEffects, executeOwnerAction } from "./execute-effects";
export type { ExecuteEffectsResult } from "./execute-effects";

export { coordinateClientEvent } from "./receive-client-event";
export { coordinateOwnerOutcome } from "./receive-owner-outcome";

export { detectCoordinatorObservations, recordIncomingInteraction } from "./issue-detection";

export {
  appendLearningCandidate,
  isNoteworthyOwnerOutcome,
  maybeRecordLearningCandidate,
} from "./learning-candidates";

export {
  formatSelfTestReport,
  runStudioCoordinatorSelfTest,
} from "./studio-coordinator-self-test";
export type { SelfTestReport, SelfTestStepResult } from "./studio-coordinator-self-test";
