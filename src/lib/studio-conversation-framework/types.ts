import type { ConversationDriver } from "@/config/studio-conversation-driver-v1";
import type {
  ConversationFlowStep,
  ConversationJourneyPhase,
  ConversationReviewTargetKind,
  PresentationSurfaceKind,
} from "@/config/studio-conversation-framework-v1";
import type { StudioCommunicationLightState } from "@/config/studio-conversation-room-v1";
import type { StudioPresenceSnapshot } from "@/lib/studio-conversation-framework/presence";

/**
 * Presentation Manager discovery payload shape (Package 3 contract).
 * Owned here so the framework does not import the archive-candidate discovery
 * presentation subsystem. Unwired discovery builders may still produce a
 * structurally compatible object (compatibility re-export from that lib).
 */
export type DiscoveryPresentationPayload = {
  stageLabel: string;
  currentTitle: string;
  currentQuestion: string;
  currentSummary: string | null;
  captured: ReadonlyArray<{
    stepId: string;
    title: string;
    summary: string;
  }>;
  progressLabel: string;
  discoveryComplete: boolean;
};

/** Temporary Review mode context — not a journey phase. */
export type ConversationReviewState = {
  open: boolean;
  /** Item, answer, or section being reviewed (opaque id for Package 4). */
  targetId: string | null;
  targetKind: ConversationReviewTargetKind | null;
};

export type ConversationRoomState = {
  journeyPhase: ConversationJourneyPhase;
  flowStep: ConversationFlowStep;
  /**
   * Who actively drives the conversation UI — not a journey phase.
   * @see docs/studio-conversation-driver-v1-locked.md
   */
  conversationDriver: ConversationDriver;
  /** Independent Help Center overlay — not a journey phase. */
  helpOpen: boolean;
  /** Independent Review mode — not a journey phase. */
  review: ConversationReviewState;
};

/** Lightweight session snapshot for Lobby round-trip (no account/backend). */
export type ConversationSessionSnapshot = {
  journeyPhase: ConversationJourneyPhase;
  flowStep: ConversationFlowStep;
  conversationDriver?: ConversationDriver;
};

export type PresentationSurface = {
  kind: PresentationSurfaceKind;
  /** Runtime copy — never baked into hardware. */
  message?: string;
  /** Customer-facing Discovery capture (Migration 1). */
  discovery?: DiscoveryPresentationPayload;
};

export type ConversationControllerOutput = {
  /** Stub channel exists. Package 4 replaces with real dialogue. */
  text: string;
};

export type VoiceControllerOutput = {
  lightState: StudioCommunicationLightState;
  /** Coordinated Activity Bar + glow — not light-only. */
  presence: StudioPresenceSnapshot;
};

export type ConversationStateAction =
  | { type: "set-journey"; phase: ConversationJourneyPhase }
  | { type: "set-flow-step"; step: ConversationFlowStep }
  | { type: "set-conversation-driver"; driver: ConversationDriver }
  | { type: "open-help" }
  | { type: "close-help" }
  | {
      type: "open-review";
      targetId?: string | null;
      targetKind?: ConversationReviewTargetKind | null;
    }
  | { type: "close-review" }
  | { type: "request-back" }
  | { type: "return-to-lobby" }
  | { type: "mark-completed" }
  | { type: "mark-cancelled" };

export const CLOSED_REVIEW_STATE: ConversationReviewState = {
  open: false,
  targetId: null,
  targetKind: null,
};
