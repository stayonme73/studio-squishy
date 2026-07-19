/**
 * Lobby round-trip contract — external room handoff.
 * Lightweight browser session only. No account / backend persistence.
 *
 * Lobby is never an internal Conversation Room journey phase.
 * Temporary modes (Help / Review) are closed on exit; only phase + step persist.
 */

import { studioConversationFrameworkV1 } from "@/config/studio-conversation-framework-v1";
import {
  createConversationRoomState,
  reduceConversationRoomState,
} from "@/lib/studio-conversation-framework/state-manager";
import type {
  ConversationRoomState,
  ConversationSessionSnapshot,
} from "@/lib/studio-conversation-framework/types";

export type LobbySessionStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type ReturnToLobbyResult = {
  /** State after return-to-lobby action (not cancelled / not completed). */
  state: ConversationRoomState;
  snapshot: ConversationSessionSnapshot;
  /** External Lobby destination — not a Conversation Room phase. */
  lobbyRoute: string;
};

export function snapshotConversationSession(
  state: ConversationRoomState,
): ConversationSessionSnapshot {
  return {
    journeyPhase: state.journeyPhase,
    flowStep: state.flowStep,
    conversationDriver: state.conversationDriver,
  };
}

export function restoreConversationRoomState(
  snapshot: ConversationSessionSnapshot,
): ConversationRoomState {
  return createConversationRoomState({
    journeyPhase: snapshot.journeyPhase,
    flowStep: snapshot.flowStep,
    conversationDriver: snapshot.conversationDriver,
    helpOpen: false,
  });
}

function getSessionStorage(): LobbySessionStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function persistConversationSession(
  snapshot: ConversationSessionSnapshot,
  storage: LobbySessionStorage | null | undefined = getSessionStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(
      studioConversationFrameworkV1.sessionStorageKey,
      JSON.stringify(snapshot),
    );
  } catch {
    /* fail silent — framework contract still returns snapshot to caller */
  }
}

export function readConversationSession(
  storage: LobbySessionStorage | null | undefined = getSessionStorage(),
): ConversationSessionSnapshot | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(studioConversationFrameworkV1.sessionStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConversationSessionSnapshot>;
    if (!parsed.journeyPhase || !parsed.flowStep) return null;
    return {
      journeyPhase: parsed.journeyPhase,
      flowStep: parsed.flowStep,
      conversationDriver: parsed.conversationDriver,
    };
  } catch {
    return null;
  }
}

export function clearConversationSession(
  storage: LobbySessionStorage | null | undefined = getSessionStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(studioConversationFrameworkV1.sessionStorageKey);
  } catch {
    /* fail silent */
  }
}

/**
 * Prepare exit to Lobby: preserve phase/step, persist session snapshot,
 * do not mark cancelled or completed. Lobby remains an external destination.
 */
export function returnToLobby(
  state: ConversationRoomState,
  storage: LobbySessionStorage | null | undefined = getSessionStorage(),
): ReturnToLobbyResult {
  const nextState = reduceConversationRoomState(state, {
    type: "return-to-lobby",
  });
  const snapshot = snapshotConversationSession(nextState);
  persistConversationSession(snapshot, storage);
  return {
    state: nextState,
    snapshot,
    lobbyRoute: studioConversationFrameworkV1.lobbyRoute,
  };
}

/**
 * Restore Conversation Room session when the customer returns from Lobby.
 * Returns null when no snapshot exists (fresh visit).
 */
export function restoreSessionFromLobby(
  storage: LobbySessionStorage | null | undefined = getSessionStorage(),
): ConversationRoomState | null {
  const snapshot = readConversationSession(storage);
  if (!snapshot) return null;
  return restoreConversationRoomState(snapshot);
}

/** Boot helper: restore session if present, otherwise fresh framework state. */
export function bootConversationRoomState(
  storage: LobbySessionStorage | null | undefined = getSessionStorage(),
  overrides: Partial<ConversationRoomState> = {},
): ConversationRoomState {
  const restored = restoreSessionFromLobby(storage);
  if (restored) {
    return createConversationRoomState({ ...restored, ...overrides });
  }
  return createConversationRoomState(overrides);
}
