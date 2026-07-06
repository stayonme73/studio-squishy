import type { CustomerInteractionKind, DecisionContext } from "@/decision-core";
import { classifyIncomingCustomerEvent, evaluateDecision } from "@/decision-core";
import type { OutgoingCommunicationFacts } from "@/decision-core/evaluators/outgoing-communication";

import { appendCoordinatorAuditEntry, createCoordinatorSession } from "./audit";
import { resolveClientConfidenceMessage } from "./briefings/confidence";
import { CLIENT_EVENT_DOMAIN, COORDINATOR_SYSTEM_USER } from "./config";
import { executeEffects } from "./execute-effects";
import { detectCoordinatorObservations, recordIncomingInteraction } from "./issue-detection";
import type {
  ClientCoordinatorEvent,
  CoordinateClientEventResult,
  CoordinatorExecutionState,
  CoordinatorSession,
  EffectExecutionContext,
} from "./types";

function buildCustomerInteractionContext(
  event: ClientCoordinatorEvent,
  state: CoordinatorExecutionState,
): DecisionContext {
  return {
    domain: "customer_interaction",
    campaignId: event.campaignId,
    jobId: event.jobId,
    actor: "client",
    trigger: { type: "incoming_customer_event", eventType: event.type as never },
    occurredAt: event.occurredAt,
    facts: {
      revisionRoundsUsed: state.campaign.revisionRoundsUsed ?? 0,
      revisionRoundsIncluded: state.campaign.revisionRoundsIncluded ?? 1,
      ...event.facts,
    },
  };
}

function buildCommunicationContext(
  event: ClientCoordinatorEvent,
  state: CoordinatorExecutionState,
): DecisionContext {
  const facts = event.facts as unknown as OutgoingCommunicationFacts;
  return {
    domain: "communication",
    campaignId: event.campaignId,
    actor: "system",
    trigger: {
      type: "communication_sync",
      nowMs: facts.nowMs ?? new Date(event.occurredAt).getTime(),
    },
    occurredAt: event.occurredAt,
    facts: {
      envelope: state.envelope,
      campaign: state.campaign,
      clientId: facts.clientId,
      jobs: state.jobs,
      materials: state.materials,
      nowMs: facts.nowMs ?? new Date(event.occurredAt).getTime(),
      ...event.facts,
    },
  };
}

function buildDecisionContext(
  event: ClientCoordinatorEvent,
  state: CoordinatorExecutionState,
): DecisionContext {
  const domain = CLIENT_EVENT_DOMAIN[event.type];
  if (domain === "communication") {
    return buildCommunicationContext(event, state);
  }
  return buildCustomerInteractionContext(event, state);
}

function mergeCommunicationPayload(
  state: CoordinatorExecutionState,
  outcomePayload: Record<string, unknown> | undefined,
): CoordinatorExecutionState {
  if (!outcomePayload?.envelope) return state;
  const envelope = outcomePayload.envelope as CoordinatorExecutionState["envelope"];
  const jobs = (outcomePayload.jobs as CoordinatorExecutionState["jobs"] | undefined) ?? state.jobs;
  return { ...state, envelope, jobs };
}

export function coordinateClientEvent(
  event: ClientCoordinatorEvent,
  state: CoordinatorExecutionState,
  session: CoordinatorSession = createCoordinatorSession(),
  execution: Pick<EffectExecutionContext, "user" | "assignments" | "clientId" | "taskId">,
): CoordinateClientEventResult {
  let nextSession = appendCoordinatorAuditEntry(session, {
    campaignId: event.campaignId,
    step: "received",
    occurredAt: event.occurredAt,
    summary: `Client event: ${event.type}`,
  });

  const context = buildDecisionContext(event, state);
  nextSession = appendCoordinatorAuditEntry(nextSession, {
    campaignId: event.campaignId,
    step: "context_built",
    occurredAt: event.occurredAt,
    summary: `Decision domain: ${context.domain}`,
    context,
  });

  const outcome = evaluateDecision(context);
  nextSession = appendCoordinatorAuditEntry(nextSession, {
    campaignId: event.campaignId,
    step: "decision_evaluated",
    occurredAt: event.occurredAt,
    summary: `Determination: ${outcome.determination}`,
    context,
    outcome,
  });

  let nextState = mergeCommunicationPayload(state, outcome.payload);

  const interactionKind =
    (outcome.payload?.interactionKind as CustomerInteractionKind | undefined) ??
    (event.type !== "communication_sync"
      ? classifyIncomingCustomerEvent(event.type as never)
      : undefined);

  if (interactionKind) {
    nextSession = recordIncomingInteraction(nextSession, {
      campaignId: event.campaignId,
      jobId: event.jobId,
      interactionKind,
      occurredAt: event.occurredAt,
    });
  }

  const effectContext: EffectExecutionContext = {
    campaignId: event.campaignId,
    jobId: event.jobId,
    occurredAt: event.occurredAt,
    user: execution.user ?? COORDINATOR_SYSTEM_USER,
    assignments: execution.assignments,
    clientId: execution.clientId,
    interactionKind,
    taskId: execution.taskId,
  };

  const effectResult = executeEffects(outcome.effects, nextState, effectContext);
  nextState = effectResult.state;

  nextSession = appendCoordinatorAuditEntry(nextSession, {
    campaignId: event.campaignId,
    step: "effects_executed",
    occurredAt: event.occurredAt,
    summary: `Executed ${effectResult.executed.length} effect(s)`,
    effects: effectResult.executed,
    outcome,
  });

  const detection = detectCoordinatorObservations(
    nextSession,
    nextState,
    new Date(event.occurredAt).getTime(),
  );
  nextSession = detection.session;
  for (const observation of detection.observations) {
    nextSession = appendCoordinatorAuditEntry(nextSession, {
      campaignId: event.campaignId,
      step: "observation_recorded",
      occurredAt: event.occurredAt,
      summary: observation.summary,
      observationId: observation.id,
    });
  }

  return {
    outcome,
    state: nextState,
    session: nextSession,
    observations: detection.observations,
    summary: {
      message: resolveClientConfidenceMessage({
        determination: outcome.determination,
        humanReviewRequired: outcome.humanReviewRequired,
      }),
      determination: outcome.determination,
      humanReviewRequired: outcome.humanReviewRequired,
    },
  };
}
