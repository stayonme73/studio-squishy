import { describe, expect, it } from "vitest";

import {
  attributionActorForDriver,
  isPresentationInteractive,
  isTabletInteractive,
  studioConversationDriverV1,
} from "@/config/studio-conversation-driver-v1";

describe("studio conversation driver", () => {
  it("locks single-driver principle and Studio Voice as default", () => {
    expect(studioConversationDriverV1.principle).toContain(
      "Only one participant",
    );
    expect(studioConversationDriverV1.defaultDriver).toBe("studio-voice");
  });

  it("keeps Presentation passive when Studio Voice drives", () => {
    expect(isPresentationInteractive("studio-voice")).toBe(false);
    expect(isTabletInteractive("studio-voice")).toBe(true);
    expect(attributionActorForDriver("studio-voice")).toBe("voice");
  });

  it("makes Presentation interactive when Customer drives", () => {
    expect(isPresentationInteractive("customer")).toBe(true);
    expect(isTabletInteractive("customer")).toBe(false);
    expect(attributionActorForDriver("customer")).toBe("customer");
  });

  it("uses clear take / resume copy and Voice-mode assist controls", () => {
    expect(studioConversationDriverV1.labels.takeControl).toBe("Answer Myself");
    expect(studioConversationDriverV1.labels.resumeVoice).toBe("Resume Voice");
    expect(studioConversationDriverV1.voiceModeAssistControls).toEqual([
      "pause",
      "repeat",
      "slow-down",
      "go-back",
      "take-over",
      "ask-question",
    ]);
  });
});
