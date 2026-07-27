/**
 * Studio Conversation Room Framework — Package 3.
 * @see docs/studio-conversation-framework-v1-locked.md
 */

export {
  createConversationRoomState,
  reduceConversationRoomState,
  setFlowStep,
  setJourneyPhase,
} from "./state-manager";

export {
  isSpinePhase,
  navigateReturnToLobby,
  navigateSpineBack,
  navigateSpineForward,
  navigateToSpinePhase,
  spineIndex,
} from "./navigation-controller";

export {
  bootConversationRoomState,
  clearConversationSession,
  persistConversationSession,
  readConversationSession,
  restoreConversationRoomState,
  restoreSessionFromLobby,
  returnToLobby,
  snapshotConversationSession,
  type LobbySessionStorage,
  type ReturnToLobbyResult,
} from "./lobby-session";

export { resolvePresentationSurface } from "./presentation-manager";
export { runConversationController } from "./conversation-controller";
export {
  resolveVoiceController,
  type VoiceIntent,
} from "./voice-controller";

export {
  presenceFloor,
  presenceGlowBias,
  presentationHaloStrength,
  resolveStudioPresence,
  tabletHaloStrength,
  workspaceHaloStrength,
  type PresenceFloor,
  type PresenceHaloStrength,
  type ResolvePresenceInput,
  type StudioPresenceSnapshot,
} from "./presence";

export type {
  ConversationControllerOutput,
  ConversationReviewState,
  ConversationRoomState,
  ConversationSessionSnapshot,
  ConversationStateAction,
  DiscoveryPresentationPayload,
  PresentationSurface,
  VoiceControllerOutput,
} from "./types";

export { CLOSED_REVIEW_STATE } from "./types";
