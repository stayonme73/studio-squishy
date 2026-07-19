/**
 * Conversation Flow Rhythm — when Voice acts (order), not dialogue copy.
 * @see docs/studio-conversation-flow-rhythm-v1-locked.md
 */

export const CONVERSATION_FLOW_RHYTHM_STAGES = [
  "welcome",
  "discovery",
  "route-recommendation",
  "service-building",
  "project-review",
  "payment",
  "production-intake",
  "studio-board",
] as const;

export type ConversationFlowRhythmStage =
  (typeof CONVERSATION_FLOW_RHYTHM_STAGES)[number];

export const conversationFlowRhythmV1 = {
  version: 1,

  stages: CONVERSATION_FLOW_RHYTHM_STAGES,

  /**
   * Locked: Voice must never ask a question if the answer won't change
   * what happens next (route, services, pricing, feasibility, production).
   */
  purposefulQuestionRule:
    "Voice should never ask a question if the answer won't change what happens next.",

  stagePurposes: {
    welcome:
      "Greet the customer. Explain that the Studio will guide them and do the work on their behalf.",
    discovery:
      "Learn what they are trying to accomplish, deadline and situation, and whether The Studio is the right fit.",
    "route-recommendation":
      "Recommend the best route from what was learned; allow the customer to choose a different route.",
    "service-building":
      "Recommend services; offer Learn More when appropriate; add, remove, or change services as the customer decides.",
    "project-review":
      "Show everything captured; allow changes; confirm included and excluded scope.",
    payment: "Collect payment only after the customer confirms the project.",
    "production-intake":
      "Collect detailed information needed to perform the work.",
    "studio-board":
      "Create the project; preserve conversation history, selected services, and service details.",
  } as const satisfies Record<ConversationFlowRhythmStage, string>,

  /** Answers must influence at least one of these, or the question does not belong. */
  questionMustInfluence: [
    "route-selection",
    "service-recommendations",
    "pricing",
    "feasibility",
    "production",
  ] as const,
} as const;

export function isConversationFlowRhythmStage(
  value: string,
): value is ConversationFlowRhythmStage {
  return (CONVERSATION_FLOW_RHYTHM_STAGES as readonly string[]).includes(value);
}

export function nextConversationFlowRhythmStage(
  stage: ConversationFlowRhythmStage,
): ConversationFlowRhythmStage | null {
  const index = CONVERSATION_FLOW_RHYTHM_STAGES.indexOf(stage);
  if (index < 0 || index >= CONVERSATION_FLOW_RHYTHM_STAGES.length - 1) {
    return null;
  }
  return CONVERSATION_FLOW_RHYTHM_STAGES[index + 1];
}
