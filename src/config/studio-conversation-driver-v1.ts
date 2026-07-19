/**
 * Conversation Driver — only one active driver at a time.
 * @see docs/studio-conversation-driver-v1-locked.md
 */

export const CONVERSATION_DRIVERS = ["studio-voice", "customer"] as const;

export type ConversationDriver = (typeof CONVERSATION_DRIVERS)[number];

export const studioConversationDriverV1 = {
  version: 1,

  principle:
    "Only one participant actively drives the conversation at a time.",

  defaultDriver: "studio-voice" as const satisfies ConversationDriver,

  philosophy:
    "The Studio does the work unless the customer chooses to do part of it themselves.",

  labels: {
    currentDriver: "Current Driver",
    studioVoice: "Studio Voice",
    customer: "Customer",
    takeControl: "Answer Myself",
    resumeVoice: "Resume Voice",
  } as const,

  /**
   * While Studio Voice drives, Presentation stays non-interactive for answers.
   * These assist controls remain available (scaffold until live Voice).
   */
  voiceModeAssistControls: [
    "pause",
    "repeat",
    "slow-down",
    "go-back",
    "take-over",
    "ask-question",
  ] as const,

  modes: {
    "studio-voice": {
      presentationInteractive: false,
      tabletInteractive: true,
      tabletRole: "studio-workspace",
      attributionActor: "voice",
      presenceActivity: "studio-speaking",
      customerSees: [
        "question",
        "voice-activity",
        "previous-answers",
        "progress",
        "assist-controls",
        "take-control",
      ],
    },
    customer: {
      presentationInteractive: true,
      tabletInteractive: false,
      tabletRole: "follow-customer",
      attributionActor: "customer",
      presenceActivity: "customer-answering",
      customerSees: [
        "interactive-question",
        "choices",
        "typing",
        "continue",
        "resume-voice",
      ],
    },
  } as const,
} as const;

export type VoiceModeAssistControl =
  (typeof studioConversationDriverV1.voiceModeAssistControls)[number];

export function isConversationDriver(
  value: string,
): value is ConversationDriver {
  return (CONVERSATION_DRIVERS as readonly string[]).includes(value);
}

export function attributionActorForDriver(
  driver: ConversationDriver,
): "voice" | "customer" {
  return studioConversationDriverV1.modes[driver].attributionActor;
}

export function isPresentationInteractive(driver: ConversationDriver): boolean {
  return studioConversationDriverV1.modes[driver].presentationInteractive;
}

export function isTabletInteractive(driver: ConversationDriver): boolean {
  return studioConversationDriverV1.modes[driver].tabletInteractive;
}
