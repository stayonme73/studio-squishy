import { findExceptionById } from "@/lib/campaign-tasks/exceptions";

import { appendCoordinatorAuditEntry, createCoordinatorSession } from "./audit";
import { CONFIDENCE_COPY } from "./briefings/confidence";
import { executeOwnerAction } from "./execute-effects";
import { detectCoordinatorObservations } from "./issue-detection";
import { maybeRecordLearningCandidate } from "./learning-candidates";
import type {
  CoordinateOwnerOutcomeResult,
  CoordinatorExecutionState,
  CoordinatorSession,
  OwnerCoordinatorOutcome,
} from "./types";

export function coordinateOwnerOutcome(
  outcome: OwnerCoordinatorOutcome,
  state: CoordinatorExecutionState,
  session: CoordinatorSession = createCoordinatorSession(),
): CoordinateOwnerOutcomeResult {
  let nextSession = appendCoordinatorAuditEntry(session, {
    campaignId: outcome.campaignId,
    step: "received",
    occurredAt: outcome.occurredAt,
    summary: `Owner outcome: ${outcome.action}`,
  });

  const exception = findExceptionById(state.envelope.exceptionRecords, outcome.exceptionId);
  if (!exception) {
    return {
      state,
      session: appendCoordinatorAuditEntry(nextSession, {
        campaignId: outcome.campaignId,
        step: "owner_action_executed",
        occurredAt: outcome.occurredAt,
        summary: "Owner action failed: exception not found.",
      }),
      summary: {
        message: CONFIDENCE_COPY.ownerActionRecorded,
        action: outcome.action,
        learningCandidateRecorded: false,
      },
      observations: [],
    };
  }

  const actionResult = executeOwnerAction(state, {
    campaignId: outcome.campaignId,
    jobId: undefined,
    occurredAt: outcome.occurredAt,
    user: outcome.user,
    assignments: outcome.assignments,
    action: outcome.action,
    exceptionId: outcome.exceptionId,
    payload: outcome.payload,
  });

  let nextState = actionResult.state;
  nextSession = appendCoordinatorAuditEntry(nextSession, {
    campaignId: outcome.campaignId,
    step: "owner_action_executed",
    occurredAt: outcome.occurredAt,
    summary: `Owner action executed: ${outcome.action}`,
    effects: actionResult.executed,
  });

  const learning = maybeRecordLearningCandidate(nextSession, outcome, exception.kind);
  nextSession = learning.session;
  if (learning.candidate) {
    nextSession = appendCoordinatorAuditEntry(nextSession, {
      campaignId: outcome.campaignId,
      step: "learning_candidate_recorded",
      occurredAt: outcome.occurredAt,
      summary: learning.candidate.situationSummary,
      learningCandidateId: learning.candidate.id,
    });
  }

  const detection = detectCoordinatorObservations(
    nextSession,
    nextState,
    new Date(outcome.occurredAt).getTime(),
  );
  nextSession = detection.session;
  for (const observation of detection.observations) {
    nextSession = appendCoordinatorAuditEntry(nextSession, {
      campaignId: outcome.campaignId,
      step: "observation_recorded",
      occurredAt: outcome.occurredAt,
      summary: observation.summary,
      observationId: observation.id,
    });
  }

  return {
    state: nextState,
    session: nextSession,
    observations: detection.observations,
    summary: {
      message: CONFIDENCE_COPY.ownerActionRecorded,
      action: outcome.action,
      learningCandidateRecorded: Boolean(learning.candidate),
    },
  };
}
