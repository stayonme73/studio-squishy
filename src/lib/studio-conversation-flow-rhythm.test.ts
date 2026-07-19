import { describe, expect, it } from "vitest";

import {
  CONVERSATION_FLOW_RHYTHM_STAGES,
  conversationFlowRhythmV1,
  nextConversationFlowRhythmStage,
} from "@/config/studio-conversation-flow-rhythm-v1";

describe("conversation flow rhythm contract", () => {
  it("locks the eight-stage customer rhythm in order", () => {
    expect([...CONVERSATION_FLOW_RHYTHM_STAGES]).toEqual([
      "welcome",
      "discovery",
      "route-recommendation",
      "service-building",
      "project-review",
      "payment",
      "production-intake",
      "studio-board",
    ]);
  });

  it("locks the purposeful question rule", () => {
    expect(conversationFlowRhythmV1.purposefulQuestionRule).toBe(
      "Voice should never ask a question if the answer won't change what happens next.",
    );
    expect(conversationFlowRhythmV1.questionMustInfluence).toEqual([
      "route-selection",
      "service-recommendations",
      "pricing",
      "feasibility",
      "production",
    ]);
  });

  it("advances rhythm stages in order and stops at Studio Board", () => {
    expect(nextConversationFlowRhythmStage("welcome")).toBe("discovery");
    expect(nextConversationFlowRhythmStage("project-review")).toBe("payment");
    expect(nextConversationFlowRhythmStage("studio-board")).toBeNull();
  });

  it("requires payment only after project confirmation stage", () => {
    const paymentIndex = CONVERSATION_FLOW_RHYTHM_STAGES.indexOf("payment");
    const reviewIndex = CONVERSATION_FLOW_RHYTHM_STAGES.indexOf("project-review");
    expect(reviewIndex).toBeLessThan(paymentIndex);
  });
});
