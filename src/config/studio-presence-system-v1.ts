/**
 * Studio Presence System — locked coordinated cues.
 * @see docs/studio-presence-system-v1-locked.md
 * @see AGENTS.md → Studio Presence System
 */

import type { StudioCommunicationLightState } from "@/config/studio-conversation-room-v1";

/** Who / what the Activity Bar is expressing right now. */
export const STUDIO_PRESENCE_ACTIVITIES = [
  "idle",
  "studio-speaking",
  "customer-speaking",
  "customer-answering",
  "thinking",
  "waiting",
  "captured",
] as const;

export type StudioPresenceActivity =
  (typeof STUDIO_PRESENCE_ACTIVITIES)[number];

/** Customer-facing Activity Bar labels (runtime software — not light hardware captions). */
export const studioPresenceActivityLabels = {
  idle: null,
  "studio-speaking": "Studio speaking...",
  /** Live mic / Voice listening for spoken answer. */
  "customer-speaking": "Listening...",
  /** Customer's turn — halo carries meaning; avoid forcing label reading. */
  "customer-answering": null,
  thinking: "Working...",
  waiting: "Waiting...",
  captured: "Captured",
} as const satisfies Record<StudioPresenceActivity, string | null>;

export const studioPresenceSystemV1 = {
  version: 1,

  principle:
    "The customer should never have to wonder whether the Studio is listening, speaking, thinking, or waiting. The system should communicate its state continuously through multiple coordinated cues, not a single indicator.",

  /**
   * Presence should communicate real work whenever possible.
   * Decorative delays should never replace genuine system state.
   */
  honestyPrinciple:
    "Presence should communicate real work whenever possible. Decorative delays should never replace genuine system state.",

  /**
   * The halo is the conversational baton — eye contact for the room.
   * Studio floor → Workspace gold; customer floor → Presentation halo.
   */
  batonPrinciple:
    "The halo is the conversational baton. Whose turn it is should be felt in peripheral vision, not read as a mode label.",

  hierarchy: [
    "presentation-conversation",
    "presentation-captured",
    "voice-activity-bar",
    "communication-glow",
  ] as const,

  activityBar: {
    /** Narrow strip under Presentation Display. */
    role: "turn-taking-and-audio-health",
    studioSpeaking: {
      motion: "left-to-right",
      accent: "studio",
      label: studioPresenceActivityLabels["studio-speaking"],
    },
    customerSpeaking: {
      motion: "live-microphone",
      accent: "customer",
      label: studioPresenceActivityLabels["customer-speaking"],
    },
    customerAnswering: {
      motion: "live-microphone",
      accent: "customer",
      label: studioPresenceActivityLabels["customer-answering"],
    },
  },

  /**
   * Scaffold certification only — not live Voice / mic certification.
   * Demo routes: `?presence=speaking|listening|captured|thinking`
   */
  certificationScope: "scaffold" as const,

  glow: {
    studioSpeaking: [
      "brighten-light",
      "presentation-bottom-edge",
      "workspace-reflected-light",
    ] as const,
    customerSpeaking: [
      "shift-glow-customer-side",
      "illuminate-presentation-screen",
    ] as const,
  },

  listeningConfidence: {
    showTranscriptBeforeAdvance: true,
    capturedCheckmark: true,
    voiceMayConfirmBeforeContinue: true,
  },

  /** Map foundation light states → default presence activity. */
  lightToActivity: {
    idle: "idle",
    listening: "customer-speaking",
    speaking: "studio-speaking",
    thinking: "thinking",
    unavailable: "waiting",
  } as const satisfies Record<
    StudioCommunicationLightState,
    StudioPresenceActivity
  >,
} as const;

export function isStudioPresenceActivity(
  value: string,
): value is StudioPresenceActivity {
  return (STUDIO_PRESENCE_ACTIVITIES as readonly string[]).includes(value);
}

export function presenceActivityLabel(
  activity: StudioPresenceActivity,
): string | null {
  return studioPresenceActivityLabels[activity];
}
