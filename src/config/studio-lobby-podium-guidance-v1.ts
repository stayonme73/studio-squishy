/**
 * Studio Lobby — podium hesitation guidance (V1).
 * @see docs/studio-guidance-doctrine-v1-locked.md
 *
 * Quiet only if the customer starts immediately. Otherwise show clear direction
 * quickly. Voice plays with the chrome label, then at most once every 30s while
 * they still have not started.
 *
 * Deferred: final Studio voice personality / certified greeting copy.
 */

export const studioLobbyPodiumGuidanceV1 = {
  /** Lightweight first-visit flag (localStorage). */
  storageKey: "studioLobbyVisited",

  /**
   * Bump when guidance behavior changes so Chrome tabs with a stale
   * studioLobbyVisited flag re-arm.
   */
  guidanceEpochKey: "studioLobbyGuidanceEpoch",
  guidanceEpoch: "8",

  /**
   * Brief beat so a customer who taps the podium immediately stays quiet.
   * Owner direction (2026-07-19): must feel immediate — not a long wait.
   */
  hesitationMs: 1200,

  /** Minimum time between spoken tips while the customer is still waiting. */
  speakCooldownMs: 30_000,

  /**
   * Runtime chrome label — not baked into Lobby artwork.
   * LOCKED greeting (Tagia 2026-07-19) — keep in sync with spokenLine.
   */
  hesitationPrompt: {
    title: "Welcome to The Studio.",
    body: 'I\'m Studio Voice. I\'ll help you choose the right services, answer your questions, and guide you through your project from start to finish. Whenever you\'re ready, select "Let\'s Get Started" on the podium. I\'ll take it from there.',
  },

  /**
   * Lobby greeting — LOCKED (Tagia 2026-07-19).
   * Spoken with the label (and on cooldown while still waiting).
   */
  spokenLine:
    'Welcome to The Studio. I\'m Studio Voice. I\'ll help you choose the right services, answer your questions, and guide you through your project from start to finish. Whenever you\'re ready, select Let\'s Get Started on the podium. I\'ll take it from there.',
} as const;
