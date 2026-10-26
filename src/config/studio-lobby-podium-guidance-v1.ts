/**
 * Studio Lobby — podium hesitation guidance (V1).
 * @see docs/studio-guidance-doctrine-v1-locked.md
 *
 * Quiet only if the customer starts immediately. Otherwise show clear direction
 * quickly. Voice plays with the chrome label, then at most once every 30s while
 * they still have not started.
 *
 * Step 3B: greeting reduced so Voice does not claim it can answer everything
 * from start to finish.
 */

import { studioVoiceLaunchBlockerHardeningV1 } from "@/config/studio-voice-launch-blocker-hardening-v1";

export const studioLobbyPodiumGuidanceV1 = {
  /** Lightweight first-visit flag (localStorage). */
  storageKey: "studioLobbyVisited",

  /**
   * Bump when guidance behavior changes so Chrome tabs with a stale
   * studioLobbyVisited flag re-arm.
   */
  guidanceEpochKey: "studioLobbyGuidanceEpoch",
  guidanceEpoch: "9",

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
    body: studioVoiceLaunchBlockerHardeningV1.lobbyHesitationBody,
  },

  /**
   * Lobby greeting — honest Step 3B revision (Tagia 2026-09-26).
   * Spoken with the label (and on cooldown while still waiting).
   */
  spokenLine: studioVoiceLaunchBlockerHardeningV1.lobbySpokenLine,
} as const;
