/**
 * Shared guide-answer resolution for tablet Continue and dock Send.
 * Both controls must produce the same authoritative draft update.
 */

import {
  getConversationRoomGuideQuestion,
  isGuideRelativeDeadlineChoice,
  type GuideConversationStep,
} from "@/config/conversation-room-guide-v1";
import { isAcceptableGuideDeadlineInput } from "@/lib/studio-guide-capture";

export type GuideAnswerResolveInput = {
  step: GuideConversationStep;
  typed: string;
  selectedBubbles: readonly string[];
};

export type GuideAnswerResolveResult = {
  answer: string;
  skipped: boolean;
};

/**
 * Resolve the customer’s answer from typed composer + tablet bubbles.
 * Typed text and structured bubble wording that match must yield the same answer.
 */
export function resolveGuideAnswerFromUi(
  input: GuideAnswerResolveInput,
): GuideAnswerResolveResult {
  const question = getConversationRoomGuideQuestion(input.step);
  const typed = input.typed.trim();
  const selectedBubbles = [...input.selectedBubbles];

  if (
    question?.bubbleMode === "multi" &&
    selectedBubbles.length > 0 &&
    !selectedBubbles.includes("Skip for now")
  ) {
    const fromBubbles = selectedBubbles.join(", ");
    const answer = typed ? `${fromBubbles} — ${typed}` : fromBubbles;
    return { answer, skipped: false };
  }
  if (selectedBubbles.includes("Skip for now") && !typed) {
    return { answer: "", skipped: true };
  }
  if (selectedBubbles.includes("No deadline yet") && !typed) {
    return { answer: "", skipped: true };
  }
  if (
    question?.opensDateFieldBubble &&
    selectedBubbles.includes(question.opensDateFieldBubble) &&
    !typed
  ) {
    return { answer: "", skipped: false };
  }
  if (
    question?.step === "ask_deadline" &&
    selectedBubbles.length === 1 &&
    isGuideRelativeDeadlineChoice(selectedBubbles[0])
  ) {
    const bubble = selectedBubbles[0];
    if (!typed || typed === bubble || !isAcceptableGuideDeadlineInput(typed)) {
      return { answer: bubble, skipped: false };
    }
    return { answer: typed, skipped: false };
  }
  if (typed) return { answer: typed, skipped: false };
  if (selectedBubbles.length === 1) {
    const bubble = selectedBubbles[0];
    if (bubble === "Skip for now") return { answer: "", skipped: true };
    return { answer: bubble, skipped: false };
  }
  return { answer: "", skipped: false };
}

/**
 * Gold chips for a stored answer on THIS question only.
 * Empty when the stored field is blank or does not match a bubble.
 */
export function visibleBubblesForStoredAnswer(input: {
  stored: string;
  bubbles: readonly string[];
  bubbleMode: "single" | "multi";
}): string[] {
  const stored = input.stored.trim();
  if (!stored || input.bubbles.length === 0) return [];
  if (input.bubbleMode === "multi") {
    const choicePart = stored.split(" — ")[0]?.trim() ?? "";
    const chosen = new Set(
      choicePart
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
    return input.bubbles.filter((bubble) => chosen.has(bubble));
  }
  return input.bubbles.includes(stored) ? [stored] : [];
}

/**
 * Permanent-dock Send semantics.
 * Guide questions: always submit via the same path as tablet Continue.
 * Free ask: send only when there is typed text (otherwise the control is inactive).
 */
export function resolveComposerSendAction(input: {
  isAnsweringQuestion: boolean;
  typedText: string;
}): "submit_guide_answer" | "send_free_message" | "disabled" {
  if (input.isAnsweringQuestion) return "submit_guide_answer";
  if (input.typedText.trim()) return "send_free_message";
  return "disabled";
}
