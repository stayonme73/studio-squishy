import { describe, expect, it } from "vitest";

import { applyGuideAnswerToDraft } from "@/lib/studio-guide-hard-nav";
import { createEmptyGuideCaptureDraft } from "@/lib/studio-guide-capture";
import {
  resolveComposerSendAction,
  resolveGuideAnswerFromUi,
} from "@/lib/studio-guide-answer-resolve";

describe("studio-guide-answer-resolve — Send / Continue parity", () => {
  it("typed Send is active (submit_guide_answer) during guide questions", () => {
    expect(
      resolveComposerSendAction({
        isAnsweringQuestion: true,
        typedText: "Within 2 weeks",
      }),
    ).toBe("submit_guide_answer");
    expect(
      resolveComposerSendAction({
        isAnsweringQuestion: true,
        typedText: "",
      }),
    ).toBe("submit_guide_answer");
  });

  it("does not present an active free-message Send with empty free-ask text", () => {
    expect(
      resolveComposerSendAction({
        isAnsweringQuestion: false,
        typedText: "",
      }),
    ).toBe("disabled");
    expect(
      resolveComposerSendAction({
        isAnsweringQuestion: false,
        typedText: "  ",
      }),
    ).toBe("disabled");
    expect(
      resolveComposerSendAction({
        isAnsweringQuestion: false,
        typedText: "Can you clarify pricing?",
      }),
    ).toBe("send_free_message");
  });

  it("tablet bubble and typed equivalent produce the same deadline draft", () => {
    const fromBubble = resolveGuideAnswerFromUi({
      step: "ask_deadline",
      typed: "",
      selectedBubbles: ["Within 2 weeks"],
    });
    const fromTyped = resolveGuideAnswerFromUi({
      step: "ask_deadline",
      typed: "Within 2 weeks",
      selectedBubbles: [],
    });
    const fromTypedAfterChip = resolveGuideAnswerFromUi({
      step: "ask_deadline",
      typed: "Within 2 weeks",
      selectedBubbles: ["Within 2 weeks"],
    });

    expect(fromBubble).toEqual({
      answer: "Within 2 weeks",
      skipped: false,
    });
    expect(fromTyped).toEqual(fromBubble);
    expect(fromTypedAfterChip).toEqual(fromBubble);

    const draftBubble = applyGuideAnswerToDraft(
      createEmptyGuideCaptureDraft(),
      "ask_deadline",
      fromBubble.answer,
      fromBubble.skipped,
    );
    const draftTyped = applyGuideAnswerToDraft(
      createEmptyGuideCaptureDraft(),
      "ask_deadline",
      fromTyped.answer,
      fromTyped.skipped,
    );
    expect(draftTyped.requestedDeadline).toBe(draftBubble.requestedDeadline);
    expect(draftTyped.deadlineStatus).toBe(draftBubble.deadlineStatus);
    expect(draftTyped.requestedDeadline).toBe("Within 2 weeks");
    expect(draftTyped.deadlineStatus).toBe("unconfirmed");
  });
});
