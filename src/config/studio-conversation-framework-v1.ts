/**
 * Studio Conversation Room — Framework V1 (structure only).
 * @see docs/studio-conversation-framework-v1-locked.md
 *
 * No AI. No forms. No business rules. Controllers exist with clear boundaries.
 */

/**
 * Journey phases hosted inside the Conversation Room (states, not pages).
 *
 * NOT journey phases:
 * - Help — overlay (`helpOpen`)
 * - Review — temporary mode (`reviewOpen` + review context)
 * - Lobby — external room (return-to-lobby contract)
 */
export const CONVERSATION_JOURNEY_PHASES = [
  "conversation",
  "payment",
  "intake",
  "studio-board",
  "completed",
  "cancelled",
] as const;

export type ConversationJourneyPhase =
  (typeof CONVERSATION_JOURNEY_PHASES)[number];

/**
 * Continuous conversation steps inside the `conversation` journey phase.
 * Dialogue content arrives in Package 4 — this list is structure only.
 */
export const CONVERSATION_FLOW_STEPS = [
  "greeting",
  "understanding",
  "service-match",
  "deadline-check",
  "project-scope",
  "summary",
  "confirmation",
  "payment",
  "intake",
  "project-created",
] as const;

export type ConversationFlowStep = (typeof CONVERSATION_FLOW_STEPS)[number];

/** Customer spine order — Navigation Controller advances along this path. */
export const CONVERSATION_SPINE = [
  "conversation",
  "payment",
  "intake",
  "studio-board",
] as const satisfies readonly ConversationJourneyPhase[];

export type ConversationSpinePhase = (typeof CONVERSATION_SPINE)[number];

/** Opaque review target kinds — Package 4 fills meaning; Package 3 is the contract. */
export const CONVERSATION_REVIEW_TARGET_KINDS = [
  "answer",
  "section",
  "terms",
  "unknown",
] as const;

export type ConversationReviewTargetKind =
  (typeof CONVERSATION_REVIEW_TARGET_KINDS)[number];

/** What the Presentation Manager may place on the customer display. */
export const PRESENTATION_SURFACE_KINDS = [
  "empty",
  "message",
  "help",
  "discovery",
] as const;

export type PresentationSurfaceKind =
  (typeof PRESENTATION_SURFACE_KINDS)[number];

export const studioConversationFrameworkV1 = {
  package: 3,
  stubGreeting: "Hello.",
  initialJourneyPhase: "conversation" as ConversationJourneyPhase,
  initialFlowStep: "greeting" as ConversationFlowStep,
  initialVoiceIntent: "idle" as const,

  /**
   * Lobby is an external room — never an internal journey phase.
   * Session snapshot key for Conversation ↔ Lobby round-trip (browser session only).
   */
  lobbyRoute: "/studio-lobby",
  sessionStorageKey: "studioConversationSession",

  /**
   * Customer mobile hides private Workspace.
   * `?inspect=1` restores the dual-shell stack for hardware certification only.
   */
  hardwareInspectQuery: "inspect",
  hardwareInspectValue: "1",
} as const;
