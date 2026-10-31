import { describe, expect, it } from "vitest";

import {
  CLIP_CAPTION_PRESENTATION,
  finishClipEditCaptions,
} from "./caption-finish";
import { verifySpeechCaptionsBurnPaintLadder } from "@/lib/studio-short-form-video-editing/caption-burn";
import type { TimedCaption } from "@/lib/studio-short-form-video-editing/types";

const FROZEN_SPEECH_SETS = [
  [
    "They think a bigger menu looks",
    "more impressive. I do not. I",
    "would rather sell 10 things we",
    "can do extremely well than 50",
    "things we can barely manage.",
  ],
  [
    "If a customer is paying real",
    "money, it should feel finished. And",
    "finished does not mean fancy for",
    "no reason. Sometimes simple is better.",
  ],
  [
    "A button in the wrong place",
    "can make the whole page feel",
    "awkward. I was building this site.",
    "It took me a lot of",
    "time because I pay attention to",
    "details.",
  ],
] as const;

function lines(texts: readonly string[]): TimedCaption[] {
  let cursor = 0;
  const captions: TimedCaption[] = texts.map((text, index) => {
    const words = text.split(" ").length;
    const caption: TimedCaption = {
      start: cursor,
      end: cursor + words,
      text,
      role: index === 0 ? "hook" : "speech",
    };
    cursor += words;
    return caption;
  });
  captions.push({
    start: cursor,
    end: cursor + 3,
    text: "The Studio",
    role: "cta",
  });
  return captions;
}

describe("post-finishClipDecisionList caption burn (production-faithful)", () => {
  it("passes the full burn paint ladder for every post-finish speech set", async () => {
    for (const set of FROZEN_SPEECH_SETS) {
      const finished = finishClipEditCaptions({
        ok: true,
        captions: lines(set),
        clips: [{ text: set.join(" ") }],
      });
      expect(finished.ok).toBe(true);
      if (!finished.ok) continue;
      const verified = await verifySpeechCaptionsBurnPaintLadder({
        captions: finished.edl.captions,
        stroke: CLIP_CAPTION_PRESENTATION.stroke,
        bandHeight: CLIP_CAPTION_PRESENTATION.bandHeight,
        background: CLIP_CAPTION_PRESENTATION.background,
      });
      expect(verified.ok, verified.ok ? "" : verified.message).toBe(true);
    }
  });
});
