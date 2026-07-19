import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("GuideSpeechAdapter boundary", () => {
  it("keeps browser STT constructor names inside the adapter only", () => {
    const root = process.cwd();
    const adapter = readFileSync(join(root, "src/lib/studio-guide-speech.ts"), "utf8");
    expect(adapter).toMatch(/SpeechRecognition|webkitSpeechRecognition/);

    const uiFiles = [
      "src/components/studio-guide/GuideConversationPanel.tsx",
      "src/components/studio-guide/GuideMicControl.tsx",
      "src/components/studio-guide/useGuideDictation.ts",
      "src/lib/studio-guide-speech-state.ts",
    ];
    for (const rel of uiFiles) {
      const src = readFileSync(join(root, rel), "utf8");
      expect(src).not.toContain("webkitSpeechRecognition");
      expect(src).not.toMatch(/\bSpeechRecognition\b/);
    }

    const micUi = readFileSync(
      join(root, "src/components/studio-guide/GuideMicControl.tsx"),
      "utf8",
    );
    expect(micUi).toContain("MicIcon");
    expect(micUi).toContain("GuideMicFieldButton");
  });
});
