import { readFileSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import {
  estimateStudioVoiceConversationCost,
  jessicaAudioForCheckedSay,
  STUDIO_VOICE_JESSICA_ID,
  STUDIO_VOICE_JESSICA_MODEL,
} from "./jessica-speech";

describe("Jessica speech", () => {
  it("stays separate from kitchen music, kitchen voice artifacts, and Kayla", () => {
    const source = readFileSync(path.join(__dirname, "jessica-speech.ts"), "utf8");
    expect(source).not.toContain("composeElevenMusic");
    expect(source).not.toContain("generateVoiceArtifact");
    expect(source).not.toContain("aTxZrSrp47xsP6Ot4Kgd");
    expect(source).toContain(STUDIO_VOICE_JESSICA_ID);
  });

  it("does not call ElevenLabs when the reply fails the fact checker", async () => {
    let called = 0;
    const result = await jessicaAudioForCheckedSay(
      "I guarantee this will be delivered tomorrow for $1.",
      async () => {
        called += 1;
        return new Response(null, { status: 500 });
      },
    );
    expect(result.ok).toBe(false);
    expect(called).toBe(0);
  });

  it("sends a checked reply to Jessica on the multilingual model", async () => {
    const previous = process.env.ELEVENLABS_API_KEY;
    process.env.ELEVENLABS_API_KEY = "sk_test_not_a_real_key";
    let url = "";
    let model = "";
    const result = await jessicaAudioForCheckedSay(
      "That is outside what I can answer from The Studio. I do not know that, and I will not guess.",
      async (input, init) => {
        url = String(input);
        const body = JSON.parse(String(init?.body));
        model = body.model_id;
        expect(body.text).toBe(
          "That is outside what I can answer from The Studio. I do not know that, and I will not guess.",
        );
        return new Response(new Uint8Array([73, 68, 51]), {
          status: 200,
          headers: { "content-type": "audio/mpeg", "character-cost": "70" },
        });
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(url).toContain(STUDIO_VOICE_JESSICA_ID);
    expect(model).toBe(STUDIO_VOICE_JESSICA_MODEL);
    expect(result.characterCost).toBe(70);
    expect(result.audio.byteLength).toBe(3);
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  });

  it("speaks a checked price in words after the checker passes", async () => {
    const previous = process.env.ELEVENLABS_API_KEY;
    process.env.ELEVENLABS_API_KEY = "sk_test_not_a_real_key";
    let spoken = "";
    const result = await jessicaAudioForCheckedSay(
      "Social & Promo Graphics is $199. With the 20% Studio Thank-You, you pay $159.20.",
      async (_input, init) => {
        spoken = JSON.parse(String(init?.body)).text;
        return new Response(new Uint8Array([1]), {
          status: 200,
          headers: { "content-type": "audio/mpeg", "character-cost": "40" },
        });
      },
    );
    expect(result.ok).toBe(true);
    expect(spoken).toContain("one hundred ninety-nine dollars");
    expect(spoken).toContain("one hundred fifty-nine dollars and twenty cents");
    expect(spoken).not.toContain("$");
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  });

  it("estimates a short conversation as a small share of the monthly allowance", () => {
    const estimate = estimateStudioVoiceConversationCost({
      replies: 8,
      creditsPerReply: 80,
    });
    expect(estimate.credits).toBe(640);
    expect(estimate.shareOfMonthlyAllowance).toBeCloseTo(640 / 40_000);
  });
});
