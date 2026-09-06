import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  STUDIO_PRE_CHECKOUT_DECK_STATUS,
  studioPreCheckoutDeckV1,
} from "@/config/studio-pre-checkout-deck-v1";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("reversible pre-checkout deck", () => {
  it("locks the owner navigation contract without flashy slide-first", () => {
    expect(STUDIO_PRE_CHECKOUT_DECK_STATUS).toBe("APPROVED_NOT_FROZEN");
    expect(studioPreCheckoutDeckV1.cards).toEqual([
      "lets-get-started",
      "voice-choice",
      "conversation-questions",
      "review-together",
      "choose-your-route",
      "step-2",
      "step-3",
    ]);
    expect(studioPreCheckoutDeckV1.checkoutIsDeckBoundary).toBe(true);
    expect(studioPreCheckoutDeckV1.doNotAddFlashySlideFirst).toBe(true);
    expect(studioPreCheckoutDeckV1.shortcuts).toContain("Back to Route");
    expect(studioPreCheckoutDeckV1.shortcuts).toContain("Change route");
    expect(studioPreCheckoutDeckV1.shortcuts).toContain("Edit Services");
  });

  it("wires deck back without clearing answers on reverse", () => {
    const runtime = read(
      "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
    );
    expect(runtime).toContain("function handleDeckBack");
    expect(runtime).toContain("previousGuideStep");
    expect(runtime).toContain("restoreSelection: true");
    expect(runtime).toContain("setReviewingVoiceChoice(true)");
    expect(runtime).toContain("markPreCheckoutDeckResume");
    expect(runtime).toContain("consumePreCheckoutDeckVoiceChoice");
    expect(runtime).toContain("exclusiveBusinessNameBubbles");
    expect(runtime).toContain("resetConversationStageScroll");
    const deck = runtime.slice(
      runtime.indexOf("function handleDeckBack"),
      runtime.indexOf("function handleLooksGoodPlan"),
    );
    expect(deck).not.toContain("startNewGuideCaptureConversation");
    const lobby = read("src/components/entrance/WelcomeHallWelcomeScene.tsx");
    expect(lobby).toContain("consumePreCheckoutDeckResume");
    expect(lobby).toContain("markPreCheckoutDeckVoiceChoice");
  });
});
