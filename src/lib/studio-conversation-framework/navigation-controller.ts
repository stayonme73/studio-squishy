/**
 * Navigation Controller — Conversation → Payment → Intake → Studio Board.
 * Stays inside the Conversation Room. No page maze.
 * Lobby exit/return: see lobby-session.ts (external room contract).
 */

import {
  CONVERSATION_SPINE,
  type ConversationSpinePhase,
} from "@/config/studio-conversation-framework-v1";
import {
  returnToLobby,
  type LobbySessionStorage,
  type ReturnToLobbyResult,
} from "@/lib/studio-conversation-framework/lobby-session";
import type { ConversationRoomState } from "@/lib/studio-conversation-framework/types";
import { setJourneyPhase } from "@/lib/studio-conversation-framework/state-manager";

/** External Lobby exit — preserves session; does not cancel or complete. */
export function navigateReturnToLobby(
  state: ConversationRoomState,
  storage?: LobbySessionStorage | null,
): ReturnToLobbyResult {
  return returnToLobby(state, storage);
}

export function isSpinePhase(
  phase: ConversationRoomState["journeyPhase"],
): phase is ConversationSpinePhase {
  return (CONVERSATION_SPINE as readonly string[]).includes(phase);
}

export function spineIndex(
  phase: ConversationRoomState["journeyPhase"],
): number {
  if (!isSpinePhase(phase)) return -1;
  return CONVERSATION_SPINE.indexOf(phase);
}

/** Advance one step along the customer spine. No-op at the end. */
export function navigateSpineForward(
  state: ConversationRoomState,
): ConversationRoomState {
  const index = spineIndex(state.journeyPhase);
  if (index < 0 || index >= CONVERSATION_SPINE.length - 1) return state;
  return setJourneyPhase(state, CONVERSATION_SPINE[index + 1]);
}

/** Move one step back along the spine. No-op at the start. */
export function navigateSpineBack(
  state: ConversationRoomState,
): ConversationRoomState {
  const index = spineIndex(state.journeyPhase);
  if (index <= 0) return state;
  return setJourneyPhase(state, CONVERSATION_SPINE[index - 1]);
}

export function navigateToSpinePhase(
  state: ConversationRoomState,
  phase: ConversationSpinePhase,
): ConversationRoomState {
  return setJourneyPhase(state, phase);
}
