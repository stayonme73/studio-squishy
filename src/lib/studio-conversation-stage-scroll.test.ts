import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resetConversationStageScroll } from "@/lib/studio-conversation-stage-scroll";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("conversation stage-entry scroll ownership", () => {
  it("resets document and stage panel scroll to the top", () => {
    const source = read("src/lib/studio-conversation-stage-scroll.ts");
    expect(source).toContain("[data-name-question-panel]");
    expect(source).toContain("[data-question-scroll-root]");
    expect(source).toContain("scrollTop = 0");
    expect(source).toContain("window.scrollTo(0, 0)");
    expect(typeof resetConversationStageScroll).toBe("function");
  });

  it("resets scroll on every Conversation stage or step change", () => {
    const runtime = read(
      "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
    );
    expect(runtime).toContain("useLayoutEffect(() => {");
    expect(runtime).toContain("resetConversationStageScroll()");
    expect(runtime).toContain("[ready, stage, step, reviewingVoiceChoice, voiceNarration]");
    const checkout = read(
      "src/components/studio-conversation-room/guide/ConversationCheckoutPanel.tsx",
    );
    expect(checkout).toContain("resetConversationStageScroll()");
  });
});
