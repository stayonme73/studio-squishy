/**
 * State Manager — journey + flow state only. No AI. No catalog rules.
 * Help and Review are temporary modes (not journey phases).
 * Lobby is an external room (see lobby-session).
 */

import { studioConversationDriverV1 } from "@/config/studio-conversation-driver-v1";
import {
  studioConversationFrameworkV1,
  type ConversationFlowStep,
  type ConversationJourneyPhase,
} from "@/config/studio-conversation-framework-v1";
import type {
  ConversationRoomState,
  ConversationStateAction,
} from "@/lib/studio-conversation-framework/types";
import { CLOSED_REVIEW_STATE } from "@/lib/studio-conversation-framework/types";

export function createConversationRoomState(
  overrides: Partial<ConversationRoomState> = {},
): ConversationRoomState {
  const { review: reviewOverride, ...rest } = overrides;
  return {
    journeyPhase: studioConversationFrameworkV1.initialJourneyPhase,
    flowStep: studioConversationFrameworkV1.initialFlowStep,
    conversationDriver: studioConversationDriverV1.defaultDriver,
    helpOpen: false,
    ...rest,
    review: {
      ...CLOSED_REVIEW_STATE,
      ...(reviewOverride ?? {}),
    },
  };
}

export function reduceConversationRoomState(
  state: ConversationRoomState,
  action: ConversationStateAction,
): ConversationRoomState {
  switch (action.type) {
    case "set-journey":
      return { ...state, journeyPhase: action.phase };
    case "set-flow-step":
      return { ...state, flowStep: action.step };
    case "set-conversation-driver":
      return { ...state, conversationDriver: action.driver };
    case "open-help":
      /* Overlay only — preserve journey phase, flow step, and review context. */
      return { ...state, helpOpen: true };
    case "close-help":
      return { ...state, helpOpen: false };
    case "open-review":
      /*
       * Temporary mode — preserve journey phase and flow step.
       * Future voice / click / tap will supply targetId. No review UI in Package 3.
       */
      return {
        ...state,
        review: {
          open: true,
          targetId:
            action.targetId !== undefined
              ? action.targetId
              : state.review.targetId,
          targetKind:
            action.targetKind !== undefined
              ? action.targetKind
              : (state.review.targetKind ?? "unknown"),
        },
      };
    case "close-review":
      return {
        ...state,
        review: { ...CLOSED_REVIEW_STATE },
      };
    case "request-back":
      if (state.helpOpen) {
        return { ...state, helpOpen: false };
      }
      if (state.review.open) {
        return { ...state, review: { ...CLOSED_REVIEW_STATE } };
      }
      return state;
    case "return-to-lobby":
      /*
       * External Lobby exit — do not cancel or complete.
       * Close temporary modes; underlying phase/step stay for the snapshot.
       */
      return {
        ...state,
        helpOpen: false,
        review: { ...CLOSED_REVIEW_STATE },
      };
    case "mark-completed":
      return {
        ...state,
        journeyPhase: "completed",
        helpOpen: false,
        review: { ...CLOSED_REVIEW_STATE },
      };
    case "mark-cancelled":
      return {
        ...state,
        journeyPhase: "cancelled",
        helpOpen: false,
        review: { ...CLOSED_REVIEW_STATE },
      };
    default:
      return state;
  }
}

export function setJourneyPhase(
  state: ConversationRoomState,
  phase: ConversationJourneyPhase,
): ConversationRoomState {
  return reduceConversationRoomState(state, { type: "set-journey", phase });
}

export function setFlowStep(
  state: ConversationRoomState,
  step: ConversationFlowStep,
): ConversationRoomState {
  return reduceConversationRoomState(state, { type: "set-flow-step", step });
}
