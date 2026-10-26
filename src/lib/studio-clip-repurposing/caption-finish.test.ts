import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

import {
  clipSpeechCaptionFindings,
  finishClipEditCaptions,
  finishClipTimedSpeech,
  segmentClipSpeechCaptions,
  wrapAuthorizedLine,
} from "./caption-finish";
import type { TimedCaption } from "@/lib/studio-short-form-video-editing/types";

const CTA = "Book a River & Reed table tonight";

function lines(texts: readonly string[], start = 0): TimedCaption[] {
  let cursor = start;
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
    text: CTA,
    role: "cta",
  });
  return captions;
}

describe("clip caption finish", () => {
  it("rejects the River and Reed mid-thought lines", () => {
    const findings = clipSpeechCaptionFindings([
      "more impressive. I do not. I",
      "finished does not mean fancy for",
      "money, it should feel finished. And",
    ]);
    expect(findings.some((finding) => finding.startsWith("mid_thought:"))).toBe(true);
    expect(findings.some((finding) => finding.startsWith("dangling_end:"))).toBe(true);
  });

  it("keeps every spoken word and removes the known breaks", () => {
    const sets = [
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
    ];
    for (const set of sets) {
      const original = lines(set);
      const finished = finishClipEditCaptions({ captions: original });
      expect(finished.ok).toBe(true);
      if (!finished.ok) continue;
      const speech = finished.edl.captions.filter((caption) => caption.role !== "cta");
      expect(clipSpeechCaptionFindings(speech.map((caption) => caption.text))).toEqual([]);
      expect(speech.map((caption) => caption.text).join(" ")).toBe(set.join(" "));
      expect(finished.edl.captions.find((caption) => caption.role === "cta")?.text).toBe(CTA);
      expect(speech.some((caption) => caption.text === "more impressive. I do not. I")).toBe(
        false,
      );
      expect(speech.some((caption) => caption.text.endsWith(" for"))).toBe(false);
    }
  });

  it("does not accept a candidate that still breaks a thought", () => {
    const defective = finishClipEditCaptions({
      captions: lines(["more impressive. I do not. I"]),
    });
    expect(defective.ok).toBe(false);
    expect(clipSpeechCaptionFindings(["more impressive. I do not. I"]).length).toBeGreaterThan(0);
    const segmented = segmentClipSpeechCaptions(lines(["more impressive. I do not. I"]))
      .filter((caption) => caption.role !== "cta")
      .map((caption) => caption.text);
    expect(segmented.join(" ")).toBe("more impressive. I do not. I");
    expect(clipSpeechCaptionFindings(segmented).some((finding) => finding.startsWith("orphan_word:"))).toBe(
      true,
    );
  });

  it("wraps the authorized call to action without new words", () => {
    expect(wrapAuthorizedLine(CTA.split(" "))).toEqual([
      "Book a River & Reed",
      "table tonight",
    ]);
  });

  it("routes the Clip factory through the finish and leaves Short-Form chunking alone", () => {
    const root = path.resolve(__dirname, "../../..");
    const factory = readFileSync(
      path.join(root, "src/lib/studio-clip-repurposing/live-factory.ts"),
      "utf8",
    );
    const produce = readFileSync(
      path.join(root, "src/lib/studio-clip-repurposing/live-produce.ts"),
      "utf8",
    );
    const shortForm = readFileSync(
      path.join(root, "src/lib/studio-short-form-video-editing/edl.ts"),
      "utf8",
    );
    expect(factory).toContain("finishClipDecisionList");
    expect(factory).toContain("paintClipCustomerEndCard");
    expect(produce).toContain("finishClipDecisionList");
    expect(produce).toContain("paintClipCustomerEndCard");
    expect(shortForm).not.toContain("finishClipDecisionList");
  });

  it("keeps spoken timing through a pause instead of smearing the next sentence", () => {
    const finished = finishClipTimedSpeech({
      words: [
        { text: "more", start: 6.32, end: 6.64 },
        { text: "impressive.", start: 6.64, end: 7.2 },
        { text: "I", start: 11.765, end: 12.005 },
        { text: "do", start: 12.005, end: 12.245 },
        { text: "not.", start: 12.245, end: 12.805 },
      ],
    });
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    const speech = finished.captions.filter((caption) => caption.role !== "cta");
    expect(speech.map((caption) => caption.text)).toEqual(["more impressive.", "I do not."]);
    expect(speech[0]?.end).toBe(7.2);
    expect(speech[1]?.start).toBe(11.765);
    expect(speech[1]?.end).toBe(12.805);
  });

  it("joins the short connector fragments without changing words", () => {
    const finished = finishClipEditCaptions({
      captions: lines([
        "And finished does not mean fancy for",
        "no reason. Sometimes simple is better.",
        "It took me a lot of",
        "time because I pay attention to",
        "details.",
      ]),
    });
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    const speech = finished.edl.captions
      .filter((caption) => caption.role !== "cta")
      .map((caption) => caption.text);
    expect(speech).toContain("fancy for no reason.");
    expect(speech).toContain("because I pay attention to details.");
    expect(speech).not.toContain("for no reason.");
    expect(speech).not.toContain("to details.");
    expect(clipSpeechCaptionFindings(["for no reason.", "to details."])).toEqual([
      "short_connector_line:for no reason.",
      "short_connector_line:to details.",
    ]);
  });

  it("routes future Clip burns through word timing and the clear caption presentation", () => {
    const root = path.resolve(__dirname, "../../..");
    const factory = readFileSync(path.join(root, "src/lib/studio-clip-repurposing/live-factory.ts"), "utf8");
    const produce = readFileSync(path.join(root, "src/lib/studio-clip-repurposing/live-produce.ts"), "utf8");
    const burn = readFileSync(
      path.join(root, "src/lib/studio-short-form-video-editing/caption-burn.ts"),
      "utf8",
    );
    const door = readFileSync(
      path.join(root, "src/lib/studio-dispatch/short-form-current-door-production.ts"),
      "utf8",
    );
    expect(factory).toContain("finishClipDecisionList(edl, localWords");
    expect(produce).toContain("finishClipDecisionList(edl, localWords");
    expect(factory).toContain("CLIP_CAPTION_PRESENTATION");
    expect(produce).toContain("CLIP_CAPTION_PRESENTATION");
    expect(burn).toContain("input.captionBottomPx ?? 72");
    expect(door).not.toContain("CLIP_CAPTION_PRESENTATION");
  });

});
