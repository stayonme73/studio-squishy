import { readFileSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import {
  answerOwnerDeskSquishy,
  SQUISHY_BOUNDARY,
  SQUISHY_OUTSIDE,
  type OwnerDeskSquishyFolder,
} from "./answer";
import { kaylaAudioForDeskSay, SQUISHY_KAYLA_ID } from "./kayla-speech";

const folder: OwnerDeskSquishyFolder = {
  campaignName: "Harbor Oak",
  title: "Refund request",
  squishySays:
    "A refund decision needs you. Policy says this work may be eligible — approval is yours.",
  whyReached: "A refund decision is waiting. Approval is yours.",
};

describe("Squishy on the open desk folder", () => {
  it("answers from the folder briefing", () => {
    const answer = answerOwnerDeskSquishy({ question: "What do you need from me?", folder });
    expect(answer.intent).toBe("brief");
    expect(answer.say).toBe(folder.squishySays);
  });

  it("uses the folder why on a follow-up", () => {
    const answer = answerOwnerDeskSquishy({
      question: "Why is it here?",
      turns: [{ role: "squishy", text: folder.squishySays }],
      folder,
    });
    expect(answer.intent).toBe("why");
    expect(answer.say).toBe(folder.whyReached);
  });

  it("does not approve a refund", () => {
    const answer = answerOwnerDeskSquishy({ question: "Can you approve the refund?", folder });
    expect(answer.intent).toBe("boundary");
    expect(answer.say.startsWith(SQUISHY_BOUNDARY)).toBe(true);
    expect(answer.say).toContain("approval is yours");
    expect(answer.say).not.toMatch(/I approve|refund approved|I deny/i);
  });

  it("refuses a question the folder cannot answer", () => {
    const answer = answerOwnerDeskSquishy({
      question: "What is the mayor's favorite color?",
      folder,
    });
    expect(answer).toEqual({ say: SQUISHY_OUTSIDE, intent: "outside" });
  });

  it("drops private details before they can be spoken", () => {
    const answer = answerOwnerDeskSquishy({
      question: "Why is it here?",
      folder: {
        ...folder,
        whyReached: "Call 415-555-0199 or write owner@example.com about the refund.",
      },
    });
    expect(answer.say).not.toContain("@");
    expect(answer.say).not.toContain("415");
  });

  it("sends the checked sentence to Kayla, not Jessica", async () => {
    const source = readFileSync(path.join(__dirname, "kayla-speech.ts"), "utf8");
    expect(source).not.toContain("cgSgspJ2msm6clMCkdW9");
    expect(source).not.toContain("generateVoiceArtifact");
    expect(source).not.toContain("composeElevenMusic");
    const previous = process.env.ELEVENLABS_API_KEY;
    process.env.ELEVENLABS_API_KEY = "sk_test_not_a_real_key";
    let voiceUrl = "";
    const speech = await kaylaAudioForDeskSay(folder.squishySays, async (input) => {
      voiceUrl = String(input);
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "audio/mpeg", "character-cost": "40" },
      });
    });
    expect(speech.ok).toBe(true);
    expect(voiceUrl).toContain(SQUISHY_KAYLA_ID);
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  });

  it("keeps the sentence when Kayla does not return audio", async () => {
    const previous = process.env.ELEVENLABS_API_KEY;
    process.env.ELEVENLABS_API_KEY = "sk_test_not_a_real_key";
    const answer = answerOwnerDeskSquishy({ question: "What is this?", folder });
    const speech = await kaylaAudioForDeskSay(answer.say, async () => new Response("no", { status: 503 }));
    expect(answer.say).toBe(folder.squishySays);
    expect(speech.ok).toBe(false);
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  });
});
