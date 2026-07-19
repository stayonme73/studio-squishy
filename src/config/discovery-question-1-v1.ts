/**
 * Discovery conversation — live wire (test gate).
 * Interface: Question → Answer → Next Question.
 * @see docs/discovery-question-1-v1.md
 */

export type DiscoveryQuestionStorageKey = "q1" | "q2" | "q3" | "q4";

export type DiscoveryLiveQuestion = {
  id: string;
  storageKey: DiscoveryQuestionStorageKey;
  question: string;
  spokenPrompt: string;
  /** Short spoken ack before the next question — not a form checkpoint. */
  acknowledgment: string;
  /**
   * Fast-path answer chips — tap to answer without typing.
   * Examples / references, not a closed taxonomy.
   */
  exampleChips: readonly string[];
};

/**
 * Live Discovery questions in conversation order.
 * Keep feeding — no dead stop between them.
 */
export const discoveryLiveQuestionsV1 = [
  {
    id: "discovery-q1-accomplish",
    storageKey: "q1",
    question: "What are you trying to accomplish?",
    spokenPrompt: "What are you trying to accomplish?",
    acknowledgment: "Got it.",
    exampleChips: [
      "Get more customers",
      "Launch something new",
      "Refresh my brand",
      "Promote an event",
    ],
  },
  {
    id: "discovery-q2-about-business",
    storageKey: "q2",
    question: "Tell me a little about your business.",
    spokenPrompt: "Tell me a little about your business.",
    acknowledgment: "Got it.",
    exampleChips: [
      "I'm a local shop",
      "I run an online store",
      "I offer a service",
      "I'm just getting started",
    ],
  },
  {
    id: "discovery-q3-deadline",
    storageKey: "q3",
    question: "When do you need this done?",
    spokenPrompt: "When do you need this done?",
    acknowledgment: "Got it.",
    exampleChips: [
      "ASAP",
      "This week",
      "Within a month",
      "No hard deadline",
    ],
  },
  {
    id: "discovery-q4-need-character",
    storageKey: "q4",
    question: "Is this a new project, or an update?",
    spokenPrompt: "Is this a new project, or an update?",
    acknowledgment: "Got it.",
    exampleChips: [
      "Brand new",
      "Updating what I have",
      "Promoting something",
      "Not sure yet",
    ],
  },
] as const satisfies readonly DiscoveryLiveQuestion[];

export const discoveryQuestion1V1 = {
  version: 1,
  /** @deprecated Prefer discoveryLiveQuestionsV1[0] — kept for import stability. */
  id: discoveryLiveQuestionsV1[0].id,
  storageKey: discoveryLiveQuestionsV1[0].storageKey,
  question: discoveryLiveQuestionsV1[0].question,
  spokenPrompt: discoveryLiveQuestionsV1[0].spokenPrompt,
  title: "Discovery",
  progressLabel: "Discovery",

  /**
   * Questions beyond the live list stay off. The live list itself continues
   * as a conversation — no dead checkpoint between live questions.
   */
  unlockRemainingDiscoveryQuestions: false,

  captureMethods: ["voice", "text", "chip"] as const,

  labels: {
    speak: "Tap the mic to speak",
    speakHint: "or pick a chip / type below",
    typeYourAnswer: "Type your answer",
    listening: "Listening...",
    or: "OR",
    examplesHint: "Or tap one of these:",
    discoveryComplete: "That's what I needed for now.",
    captured: "Captured",
    answerCaptured: "Answer captured.",
    processing: "Filing your answer...",
    acknowledging: "Got it.",
    filed: "Filed",
    correct: "Correct this",
    saveAnswer: "Done",
    askAgain: "Ask again",
    stopSpeaking: "Tap to finish",
    discoveryEyebrow: "Discovery",
    /** @deprecated Conversation continues — not a customer checkpoint. */
    demoComplete: "",
    readyToContinue: "",
    startSpeaking: "Speak",
    startListening: "Speak",
    typeInstead: "Type your answer",
    typePlaceholder: "Type your answer",
    resumeVoice: "Resume Voice",
    confirm: "Looks right",
  },

  postCaptureBeats: [
    "listening-ends",
    "captured",
    "processing-real-work",
    "voice-acknowledges",
    "next-question",
  ] as const,

  /** The conversation is the interface — not modes, drivers, or panels. */
  conversationIsTheInterface: true,

  briefAcknowledgment: "Got it.",
} as const;

export type DiscoveryQuestion1Id = (typeof discoveryLiveQuestionsV1)[0]["id"];
export type DiscoveryQuestion1CaptureMethod =
  (typeof discoveryQuestion1V1.captureMethods)[number];

export function getDiscoveryLiveQuestion(
  storageKey: DiscoveryQuestionStorageKey,
): DiscoveryLiveQuestion {
  const found = discoveryLiveQuestionsV1.find((q) => q.storageKey === storageKey);
  if (!found) return discoveryLiveQuestionsV1[0];
  return found;
}

export function getNextDiscoveryLiveQuestion(
  storageKey: DiscoveryQuestionStorageKey,
): DiscoveryLiveQuestion | null {
  const index = discoveryLiveQuestionsV1.findIndex(
    (q) => q.storageKey === storageKey,
  );
  if (index < 0) return null;
  return discoveryLiveQuestionsV1[index + 1] ?? null;
}

export function getFirstIncompleteDiscoveryQuestion(
  answeredKeys: Partial<Record<DiscoveryQuestionStorageKey, boolean>>,
): DiscoveryLiveQuestion {
  for (const question of discoveryLiveQuestionsV1) {
    if (!answeredKeys[question.storageKey]) return question;
  }
  return discoveryLiveQuestionsV1[discoveryLiveQuestionsV1.length - 1];
}
